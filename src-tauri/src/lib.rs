use tauri::{
    image::Image,
    menu::{IsMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime, WindowEvent,
};
mod updater;
#[cfg(not(target_os = "macos"))]
use tauri_plugin_notification::NotificationExt;

fn issue_label(issue: &str, locale: &str) -> &'static str {
    let english = locale.starts_with("en");
    match (issue, english) {
        ("tooClose", true) => "Too close",
        ("headDown", true) => "Head down",
        ("headTilt", true) => "Head tilt",
        ("headForward", true) => "Forward head",
        ("slouch", true) => "Slouching",
        ("shrug", true) => "Raised shoulders",
        ("sideLean", true) => "Side lean",
        ("blink", true) => "Blink reminder",
        ("sitting", true) => "Sitting reminder",
        ("lookAway", true) => "Look-away reminder",
        ("tooClose", false) => "距离过近",
        ("headDown", false) => "低头",
        ("headTilt", false) => "歪头",
        ("headForward", false) => "头前伸",
        ("slouch", false) => "驼背",
        ("shrug", false) => "耸肩",
        ("sideLean", false) => "歪坐",
        ("blink", false) => "眨眼提醒",
        ("sitting", false) => "久坐提醒",
        ("lookAway", false) => "远眺提醒",
        (_, true) => "Posture issue",
        (_, false) => "姿态异常",
    }
}

fn status_entries(status: &str) -> Vec<(&str, &str)> {
    let Some((_, payload)) = status.split_once(':') else {
        return Vec::new();
    };
    payload
        .split(',')
        .filter_map(|entry| {
            let (issue, value) = entry.split_once('@')?;
            (!issue.is_empty()).then_some((issue, value))
        })
        .collect()
}

fn issue_icon_bytes(issue: &str) -> &'static [u8] {
    match issue {
        "tooClose" => include_bytes!("../icons/tray/too-close.png"),
        "headDown" => include_bytes!("../icons/tray/head-down.png"),
        "headTilt" => include_bytes!("../icons/tray/head-tilt.png"),
        "headForward" => include_bytes!("../icons/tray/head-forward.png"),
        "slouch" => include_bytes!("../icons/tray/slouch.png"),
        "shrug" => include_bytes!("../icons/tray/shrug.png"),
        "sideLean" => include_bytes!("../icons/tray/side-lean.png"),
        "blink" => include_bytes!("../icons/tray/blink.png"),
        "sitting" => include_bytes!("../icons/tray/sitting.png"),
        "lookAway" => include_bytes!("../icons/tray/look-away.png"),
        _ => include_bytes!("../icons/tray/error.png"),
    }
}

const MENU_BAR_ISSUES: [&str; 7] = [
    "tooClose",
    "headDown",
    "headForward",
    "slouch",
    "sideLean",
    "headTilt",
    "shrug",
];

fn issue_indicator_title(status: &str, issue: &str) -> Option<String> {
    status_entries(status)
        .into_iter()
        .find(|(active_issue, _)| *active_issue == issue)
        .and_then(|(_, value)| {
            if value.is_empty() || value == "—" {
                return None;
            }
            Some(value.to_string())
        })
}

fn issue_indicator_tooltip(status: &str, issue: &str, locale: &str) -> String {
    let label = issue_label(issue, locale);
    let prefix = if locale.starts_with("en") {
        "Jianhao:"
    } else {
        "渐好："
    };
    if let Some(value) = issue_indicator_title(status, issue) {
        return format!("{prefix} {label} · {value}");
    }
    format!("{prefix} {label}")
}

fn update_issue_indicator<R: Runtime>(
    app: &AppHandle<R>,
    issue: &str,
    status: &str,
    locale: &str,
    visible: bool,
) -> tauri::Result<()> {
    let id = format!("issue-tray-{issue}");
    if let Some(tray) = app.tray_by_id(&id) {
        tray.set_visible(visible)?;
        if visible {
            tray.set_tooltip(Some(issue_indicator_tooltip(status, issue, locale)))?;
            tray.set_title(issue_indicator_title(status, issue))?;
        }
        return Ok(());
    }
    if !visible {
        return Ok(());
    }

    TrayIconBuilder::with_id(id)
        .icon(Image::from_bytes(issue_icon_bytes(issue))?)
        .icon_as_template(cfg!(target_os = "macos"))
        .tooltip(issue_indicator_tooltip(status, issue, locale))
        .title(issue_indicator_title(status, issue).unwrap_or_default())
        .build(app)?;
    Ok(())
}

fn build_tray_menu<R: Runtime>(app: &AppHandle<R>, locale: &str) -> tauri::Result<Menu<R>> {
    let (home, toggle, settings, check_updates, quit) = if locale.starts_with("en") {
        (
            "Open Jianhao",
            "Pause / Resume",
            "Settings",
            "Check for Updates",
            "Quit Jianhao",
        )
    } else {
        ("打开首页", "暂停 / 继续", "设置", "检查更新", "退出渐好")
    };
    let home_item = MenuItem::with_id(app, "home", home, true, None::<&str>)?;
    let show_divider = PredefinedMenuItem::separator(app)?;
    let pause_item = MenuItem::with_id(app, "toggle", toggle, true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", settings, true, None::<&str>)?;
    let check_updates_item =
        MenuItem::with_id(app, "check-updates", check_updates, true, None::<&str>)?;
    let quit_divider = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", quit, true, None::<&str>)?;

    let items: [&dyn IsMenuItem<R>; 7] = [
        &home_item,
        &show_divider,
        &pause_item,
        &settings_item,
        &check_updates_item,
        &quit_divider,
        &quit_item,
    ];
    Menu::with_items(app, &items)
}

#[tauri::command]
fn update_status_indicators(
    app: AppHandle,
    status: &str,
    posture_status: &str,
    displayed_issues: Vec<String>,
    locale: &str,
) -> Result<(), String> {
    let selected = displayed_issues
        .iter()
        .filter(|issue| MENU_BAR_ISSUES.contains(&issue.as_str()))
        .take(3)
        .map(String::as_str)
        .collect::<Vec<_>>();
    for issue in MENU_BAR_ISSUES {
        let is_active = issue_indicator_title(status, issue).is_some();
        update_issue_indicator(
            &app,
            issue,
            status,
            locale,
            selected.contains(&issue) && is_active,
        )
        .map_err(|error| error.to_string())?;
    }
    update_posture_status(&app, posture_status, locale).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn set_tray_locale(app: AppHandle, locale: &str) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let menu = build_tray_menu(&app, locale).map_err(|error| error.to_string())?;
        tray.set_menu(Some(menu))
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn update_posture_status<R: Runtime>(
    app: &AppHandle<R>,
    status: &str,
    locale: &str,
) -> tauri::Result<()> {
    let status = if status.trim().is_empty() {
        if locale.starts_with("en") {
            "Ready"
        } else {
            "准备开始"
        }
    } else {
        status.trim()
    };
    let tooltip = if locale.starts_with("en") {
        format!("Jianhao: {status}")
    } else {
        format!("渐好：{status}")
    };
    if let Some(tray) = app.tray_by_id("posture-status-tray") {
        tray.set_title(Some(status.to_string()))?;
        tray.set_tooltip(Some(tooltip))?;
        return Ok(());
    }

    TrayIconBuilder::with_id("posture-status-tray")
        .title(status)
        .tooltip(tooltip)
        .build(app)?;
    Ok(())
}

#[tauri::command]
fn send_system_notification(_app: AppHandle, title: String, body: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        notify_rust::Notification::new()
            .summary(&title)
            .body(&body)
            .show()
            .map(|_| ())
            .map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "macos"))]
    _app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "macos")]
#[tauri::command]
async fn request_notification_permission() -> Result<bool, String> {
    notify_rust::request_auth()
        .await
        .map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(updater::UpdateState::default())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("posture".into()),
                    })
                    .filter(|metadata| {
                        metadata
                            .target()
                            .starts_with(tauri_plugin_log::WEBVIEW_TARGET)
                    }),
                ])
                .max_file_size(2 * 1024 * 1024)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(5))
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            update_status_indicators,
            set_tray_locale,
            send_system_notification,
            #[cfg(target_os = "macos")]
            request_notification_permission
        ])
        .setup(|app| {
            let menu = build_tray_menu(app.handle(), "zh-CN")?;
            let tray_icon = if cfg!(target_os = "macos") {
                Image::from_bytes(include_bytes!("../icons/tray/normal.png"))?
            } else {
                app.default_window_icon()
                    .cloned()
                    .expect("default app icon is required")
            };

            let tray_icon = TrayIconBuilder::with_id("main-tray")
                .icon(tray_icon)
                .icon_as_template(cfg!(target_os = "macos"))
                .tooltip("渐好")
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "home" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                        let _ = app.emit("tray://open-home", ());
                    }
                    "settings" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                        let _ = app.emit("tray://open-settings", ());
                    }
                    "toggle" => {
                        let _ = app.emit("tray://toggle-monitor", ());
                    }
                    "check-updates" => updater::check_for_updates(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                        let _ = tray.app_handle().emit("tray://open-home", ());
                    }
                })
                .build(app)?;
            // Keep the status item explicit. This also makes the behavior reliable when the
            // app is launched as an LSUIElement with its main window initially hidden.
            tray_icon.set_visible(true)?;

            if let Some(window) = app.get_webview_window("main") {
                let close_target = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = close_target.hide();
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::status_entries;

    #[test]
    fn parses_active_posture_values() {
        assert_eq!(
            status_entries("watching:headDown@12°,slouch@0.75×"),
            vec![("headDown", "12°"), ("slouch", "0.75×")],
        );
    }

    #[test]
    fn ignores_statuses_without_valid_issue_values() {
        assert!(status_entries("normal").is_empty());
        assert!(status_entries("watching:headDown,slouch").is_empty());
    }
}
