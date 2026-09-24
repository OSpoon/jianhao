use serde_json::{json, Value};
use std::env;

pub(crate) fn apply() {
    if env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") && tauri_build::is_dev() {
        let mut config = match env::var("TAURI_CONFIG") {
            Ok(config) => serde_json::from_str::<Value>(&config)
                .expect("TAURI_CONFIG must contain valid JSON"),
            Err(_) => json!({}),
        };

        let bundle = config
            .as_object_mut()
            .expect("TAURI_CONFIG must be a JSON object")
            .entry("bundle")
            .or_insert_with(|| json!({}));
        if !bundle.is_object() {
            *bundle = json!({});
        }
        bundle["icon"] = json!(["icons/macos-dev.icns", "icons/macos-dev.png"]);

        let config = serde_json::to_string(&config).expect("serialize TAURI_CONFIG");
        env::set_var("TAURI_CONFIG", &config);
        println!("cargo:rustc-env=TAURI_CONFIG={config}");
        println!("cargo:rerun-if-changed=icons/macos-dev.icns");
        println!("cargo:rerun-if-changed=icons/macos-dev.png");
    }
}
