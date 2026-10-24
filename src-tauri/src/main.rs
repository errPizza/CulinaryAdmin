#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// The panel talks to CulinaryServer straight from the WebView; nothing native is exposed to it.
fn main() {
    tauri::Builder::default().run(tauri::generate_context!()).expect("No se pudo iniciar CulinaryAdmin");
}
