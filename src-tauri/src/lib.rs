// SANTOSTARK U.L.T.R.O.N. CORE // TAURI v2 RUST RUNTIME

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Good evening, {}. All Mark Seven systems online.", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running SantoStark ULTRON application");
}
