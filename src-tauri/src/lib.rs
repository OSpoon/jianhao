use tauri::{
    image::Image,
    menu::{IsMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, Runtime, WindowEvent,
};
mod updater;

#[cfg(target_os = "macos")]
#[link(name = "AppKit", kind = "framework")]
unsafe extern "C" {
    #[link_name = "NSBeep"]
    fn ns_beep();
}

#[cfg(target_os = "windows")]
#[link(name = "user32")]
unsafe extern "system" {
    #[link_name = "MessageBeep"]
    fn message_beep(sound_type: u32) -> i32;
}

#[cfg(target_os = "windows")]
const MB_OK: u32 = 0x0000;

#[tauri::command]
fn play_system_alert_sound(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    app.run_on_main_thread(|| unsafe { ns_beep() })
        .map_err(|error| error.to_string())?;

    #[cfg(target_os = "windows")]
    {
        let _ = app;
        unsafe {
            message_beep(MB_OK);
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let _ = app;

    Ok(())
}

#[cfg(target_os = "macos")]
fn build_macos_app_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    use tauri::menu::{AboutMetadata, Submenu};

    let package_info = app.package_info();
    let config = app.config();
    let product_name = config
        .product_name
        .clone()
        .unwrap_or_else(|| package_info.name.clone());
    let about_icon = Image::from_bytes(include_bytes!("../icons/macos-dev.png"))?;
    let about_metadata = AboutMetadata {
        name: Some(product_name.clone()),
        version: Some(package_info.version.to_string()),
        copyright: config.bundle.copyright.clone(),
        authors: config
            .bundle
            .publisher
            .clone()
            .map(|publisher| vec![publisher]),
        icon: Some(about_icon),
        ..Default::default()
    };

    let window_menu = Submenu::with_id_and_items(
        app,
        "__tauri_window_menu__",
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, None)?,
        ],
    )?;
    let help_menu = Submenu::with_id_and_items(app, "__tauri_help_menu__", "Help", true, &[])?;
    let app_menu = Submenu::with_items(
        app,
        product_name,
        true,
        &[
            &PredefinedMenuItem::about(app, None, Some(about_metadata))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::services(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, None)?,
            &PredefinedMenuItem::hide_others(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, None)?,
        ],
    )?;
    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[&PredefinedMenuItem::close_window(app, None)?],
    )?;
    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;
    Menu::with_items(
        app,
        &[&app_menu, &file_menu, &edit_menu, &window_menu, &help_menu],
    )
}

fn build_tray_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let check_updates_item =
        MenuItem::with_id(app, "check-updates", "检查更新", true, None::<&str>)?;
    let divider = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出渐好", true, None::<&str>)?;
    let items: [&dyn IsMenuItem<R>; 3] = [&check_updates_item, &divider, &quit_item];
    Menu::with_items(app, &items)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
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
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build());

    #[cfg(target_os = "macos")]
    let builder = builder.menu(build_macos_app_menu);

    builder
        .invoke_handler(tauri::generate_handler![play_system_alert_sound])
        .setup(|app| {
            let menu = build_tray_menu(app.handle())?;
            let tray_icon = if cfg!(target_os = "macos") {
                Image::from_bytes(include_bytes!("../icons/tray/normal.png"))?
            } else {
                app.default_window_icon()
                    .cloned()
                    .expect("default app icon is required")
            };

            TrayIconBuilder::with_id("main-tray")
                .icon(tray_icon)
                .icon_as_template(cfg!(target_os = "macos"))
                .tooltip("渐好")
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "check-updates" => updater::check_for_updates(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                let app_handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if matches!(event, WindowEvent::CloseRequested { .. }) {
                        app_handle.exit(0);
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
