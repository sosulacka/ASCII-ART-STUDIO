//! Хранилище файлов скриптов (.ax) — папка в конфиге приложения, рядом с
//! config.json (см. `get_config_path` в lib.rs), под-каталог `scripts/`.

use std::fs;
use std::path::PathBuf;

fn scripts_dir() -> PathBuf {
    let mut path = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("ascii-art-studio");
    path.push("scripts");
    path
}

/// Не даёт имени файла выйти за пределы папки скриптов (без `/`, `\`, `..`).
fn safe_name(name: &str) -> Result<String, String> {
    if name.is_empty() || name.contains(['/', '\\']) || name.contains("..") {
        return Err("недопустимое имя скрипта".to_string());
    }
    Ok(if name.ends_with(".ax") { name.to_string() } else { format!("{name}.ax") })
}

#[tauri::command]
pub fn axium_list_scripts() -> Result<Vec<String>, String> {
    let dir = scripts_dir();
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut names: Vec<String> = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.path().extension().and_then(|e| e.to_str()) == Some("ax"))
        .filter_map(|entry| entry.file_name().to_str().map(str::to_string))
        .collect();
    names.sort();
    Ok(names)
}

#[tauri::command]
pub fn axium_load_script(name: String) -> Result<String, String> {
    let path = scripts_dir().join(safe_name(&name)?);
    fs::read_to_string(&path).map_err(|e| format!("не удалось прочитать {}: {e}", path.display()))
}

#[tauri::command]
pub fn axium_save_script(name: String, content: String) -> Result<(), String> {
    let dir = scripts_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(safe_name(&name)?);
    fs::write(&path, content).map_err(|e| format!("не удалось записать {}: {e}", path.display()))
}

#[tauri::command]
pub fn axium_delete_script(name: String) -> Result<(), String> {
    let path = scripts_dir().join(safe_name(&name)?);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── safe_name: защита от выхода за пределы папки скриптов ──

    #[test]
    fn safe_name_appends_extension_once() {
        assert_eq!(safe_name("demo").unwrap(), "demo.ax");
        assert_eq!(safe_name("demo.ax").unwrap(), "demo.ax");
    }

    #[test]
    fn safe_name_rejects_traversal_and_separators() {
        for bad in ["", "../evil", "..", "a/b", "a\\b", "..\\up", "dir/../x"] {
            assert!(safe_name(bad).is_err(), "должно отклоняться: {bad:?}");
        }
    }

    #[test]
    fn safe_name_allows_normal_names() {
        for ok in ["render", "my_script", "batch-01", "тест", "a.b"] {
            assert!(safe_name(ok).is_ok(), "должно приниматься: {ok:?}");
        }
    }

    // ── Раунд-трип save -> list -> load -> delete на реальной ФС ──
    // Используется реальный конфиг-каталог (scripts_dir), поэтому имя
    // уникально-тестовое и файл гарантированно удаляется в конце.

    #[test]
    fn save_list_load_delete_roundtrip() {
        let name = "zz_unit_test_tmp_script".to_string();
        let content = "public class ;Main; ([\n])\n".to_string();

        axium_save_script(name.clone(), content.clone()).expect("сохранение");
        assert!(
            axium_list_scripts().expect("список").contains(&format!("{name}.ax")),
            "сохранённый скрипт должен появиться в списке"
        );
        assert_eq!(axium_load_script(name.clone()).expect("чтение"), content);

        axium_delete_script(name.clone()).expect("удаление");
        assert!(
            !axium_list_scripts().expect("список").contains(&format!("{name}.ax")),
            "после удаления скрипта в списке быть не должно"
        );
        assert!(axium_load_script(name).is_err(), "чтение удалённого — ошибка");
    }

    #[test]
    fn delete_missing_script_is_ok() {
        // Удаление несуществующего — не ошибка (идемпотентность).
        assert!(axium_delete_script("zz_no_such_script_ever".into()).is_ok());
    }
}
