#[path = "build/macos_dev_icon.rs"]
mod macos_dev_icon;

fn main() {
    macos_dev_icon::apply();
    tauri_build::build()
}
