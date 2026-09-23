use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_updater::{Update, UpdaterExt};

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

    app.dialog()
        .message(format!(
            "发现新版本 v{version}。\n\n{notes}\n\n是否现在下载并安装？"
        ))
        .title("发现更新")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::OkCancelCustom(
            "下载并安装".to_string(),
            "稍后".to_string(),
        ))
        .show(move |confirmed| {
            if !confirmed {
                app_for_dialog.state::<UpdateState>().finish();
                return;
            }

            tauri::async_runtime::spawn(async move {
                let result = update.download_and_install(|_, _| {}, || {}).await;
                app_for_dialog.state::<UpdateState>().finish();
                match result {
                    Ok(()) => app_for_dialog.restart(),
                    Err(error) => show_error(&app_for_dialog, "安装更新失败", error),
                }
            });
        });
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
    app.state::<UpdateState>().finish();
    show_message(app, title, error.to_string(), MessageDialogKind::Error);
}
