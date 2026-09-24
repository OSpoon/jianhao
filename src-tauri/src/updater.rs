use std::sync::atomic::{AtomicBool, Ordering};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_updater::{Update, UpdaterExt};

const UPDATE_PROGRESS_EVENT: &str = "update-download-progress";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateProgress {
    phase: &'static str,
    version: String,
    downloaded: u64,
    content_length: Option<u64>,
}

#[derive(Default)]
pub struct UpdateState(AtomicBool);

impl UpdateState {
    fn start(&self) -> bool {
        self.0
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .is_ok()
    }

    fn finish(&self) {
        self.0.store(false, Ordering::Release);
    }
}

pub fn check_for_updates<R: Runtime>(app: &AppHandle<R>) {
    if !app.state::<UpdateState>().start() {
        return;
    }

    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        match app.updater() {
            Ok(updater) => match updater.check().await {
                Ok(Some(update)) => prompt_to_install(app, update),
                Ok(None) => {
                    app.state::<UpdateState>().finish();
                    show_message(
                        &app,
                        "已是最新版本",
                        "当前版本已是最新版本。",
                        MessageDialogKind::Info,
                    );
                }
                Err(error) => show_error(&app, "检查更新失败", error),
            },
            Err(error) => show_error(&app, "无法初始化更新服务", error),
        }
    });
}

fn prompt_to_install<R: Runtime>(app: AppHandle<R>, update: Update) {
    let version = update.version.clone();
    let notes = update
        .body
        .clone()
        .unwrap_or_else(|| "此版本没有提供更新说明。".to_string());
    let app_for_dialog = app.clone();
    let version_for_download = version.clone();

    app.dialog()
        .message(format!(
            "发现新版本 v{version}。\n\n{notes}\n\n是否现在下载更新？下载完成后会再次确认安装和重启。"
        ))
        .title("发现更新")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::OkCancelCustom(
            "下载更新".to_string(),
            "稍后".to_string(),
        ))
        .show(move |confirmed| {
            if !confirmed {
                app_for_dialog.state::<UpdateState>().finish();
                return;
            }

            tauri::async_runtime::spawn(async move {
                emit_progress(
                    &app_for_dialog,
                    "downloading",
                    version_for_download.clone(),
                    0,
                    None,
                );

                let app_for_progress = app_for_dialog.clone();
                let progress_version = version_for_download.clone();
                let mut downloaded = 0_u64;
                let result = update
                    .download(
                        move |chunk_length, content_length| {
                            downloaded += chunk_length as u64;
                            emit_progress(
                                &app_for_progress,
                                "downloading",
                                progress_version.clone(),
                                downloaded,
                                content_length,
                            );
                        },
                        || {},
                    )
                    .await;

                match result {
                    Ok(bytes) => {
                        emit_progress(
                            &app_for_dialog,
                            "ready",
                            version_for_download.clone(),
                            0,
                            None,
                        );
                        prompt_to_restart(app_for_dialog, update, bytes, version_for_download);
                    }
                    Err(error) => {
                        show_error(&app_for_dialog, "下载更新失败", error);
                    }
                }
            });
        });
}

fn prompt_to_restart<R: Runtime>(
    app: AppHandle<R>,
    update: Update,
    bytes: Vec<u8>,
    version: String,
) {
    let app_for_dialog = app.clone();
    app.dialog()
        .message(format!(
            "v{version} 已下载完成。安装更新需要重启渐好，是否现在继续？选择取消后可稍后重新检查更新。"
        ))
        .title("更新已下载")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::OkCancelCustom(
            "安装并重启".to_string(),
            "取消".to_string(),
        ))
        .show(move |confirmed| {
            if !confirmed {
                hide_progress(&app_for_dialog, version);
                app_for_dialog.state::<UpdateState>().finish();
                return;
            }

            emit_progress(&app_for_dialog, "installing", version.clone(), 0, None);
            tauri::async_runtime::spawn(async move {
                match update.install(bytes) {
                    Ok(()) => app_for_dialog.restart(),
                    Err(error) => {
                        show_error(&app_for_dialog, "安装更新失败", error);
                    }
                }
            });
        });
}

fn emit_progress<R: Runtime>(
    app: &AppHandle<R>,
    phase: &'static str,
    version: String,
    downloaded: u64,
    content_length: Option<u64>,
) {
    let _ = app.emit(
        UPDATE_PROGRESS_EVENT,
        UpdateProgress {
            phase,
            version,
            downloaded,
            content_length,
        },
    );
}

fn hide_progress<R: Runtime>(app: &AppHandle<R>, version: String) {
    emit_progress(app, "hidden", version, 0, None);
}

fn show_message<R: Runtime>(
    app: &AppHandle<R>,
    title: &str,
    message: impl Into<String>,
    kind: MessageDialogKind,
) {
    app.dialog()
        .message(message)
        .title(title)
        .kind(kind)
        .buttons(MessageDialogButtons::Ok)
        .show(|_| {});
}

fn show_error<R: Runtime>(app: &AppHandle<R>, title: &str, error: impl std::fmt::Display) {
    hide_progress(app, String::new());
    app.state::<UpdateState>().finish();
    show_message(app, title, error.to_string(), MessageDialogKind::Error);
}
