// Проверка и установка обновлений.
//
// Приложение при запуске (и раз в 15 минут) читает version.json из репозитория.
// Если версия на сервере ВЫШЕ текущей — предлагает обновиться. Если клиент
// новее сервера (dev-сборка) — молчит. По согласию: качает установщик в temp
// и запускает его с флагом `--update`, установщик сам закрывает приложение,
// обновляет и перезапускает.

use serde::{Deserialize, Serialize};

const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");
const VERSION_URL: &str =
    "https://raw.githubusercontent.com/sosulacka/ASCII-ART-STUDIO/main/version.json";

#[derive(Deserialize)]
struct RemoteVersion {
    version: String,
    #[serde(default)]
    notes: String,
    installer: String,
}

#[derive(Serialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub current: String,
    pub latest: String,
    pub notes: String,
    pub installer_url: String,
}

/// Сравнивает две semver-строки "x.y.z". Возвращает true, если a > b.
fn is_newer(a: &str, b: &str) -> bool {
    let parse = |s: &str| -> Vec<u32> {
        s.trim_start_matches('v')
            .split('.')
            .map(|p| p.chars().take_while(|c| c.is_ascii_digit()).collect::<String>())
            .map(|p| p.parse().unwrap_or(0))
            .collect()
    };
    let va = parse(a);
    let vb = parse(b);
    for i in 0..va.len().max(vb.len()) {
        let x = va.get(i).copied().unwrap_or(0);
        let y = vb.get(i).copied().unwrap_or(0);
        if x != y {
            return x > y;
        }
    }
    false
}

/// Проверяет наличие обновления. Сетевые ошибки не фатальны — возвращаем
/// available=false, чтобы UI просто ничего не показал.
#[tauri::command]
pub async fn check_update() -> Result<UpdateInfo, String> {
    let current = CURRENT_VERSION.to_string();

    let remote = tauri::async_runtime::spawn_blocking(fetch_remote_version)
        .await
        .map_err(|e| e.to_string())?;

    match remote {
        Ok(r) => Ok(UpdateInfo {
            available: is_newer(&r.version, &current),
            current,
            latest: r.version,
            notes: r.notes,
            installer_url: r.installer,
        }),
        Err(_) => Ok(UpdateInfo {
            available: false,
            current: current.clone(),
            latest: current,
            notes: String::new(),
            installer_url: String::new(),
        }),
    }
}

fn fetch_remote_version() -> Result<RemoteVersion, String> {
    let body = ureq::get(VERSION_URL)
        .timeout(std::time::Duration::from_secs(15))
        .call()
        .map_err(|e| e.to_string())?
        .into_string()
        .map_err(|e| e.to_string())?;
    serde_json::from_str(&body).map_err(|e| e.to_string())
}

/// Скачивает установщик в temp и запускает его с `--update`, затем закрывает
/// приложение (установщик сам дождётся выхода процесса и обновит файлы).
#[tauri::command]
pub async fn download_and_run_update(
    app: tauri::AppHandle,
    installer_url: String,
) -> Result<(), String> {
    use tauri::Emitter;

    if installer_url.is_empty() {
        return Err("Нет ссылки на установщик".into());
    }

    let app_emit = app.clone();
    let installer_path = tauri::async_runtime::spawn_blocking(move || {
        let resp = ureq::get(&installer_url)
            .timeout(std::time::Duration::from_secs(120))
            .call()
            .map_err(|e| e.to_string())?;

        let total: u64 = resp
            .header("Content-Length")
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);

        let mut reader = resp.into_reader();
        let tmp = std::env::temp_dir().join("ASCII-Art-Studio-Setup.exe");
        let mut file = std::fs::File::create(&tmp).map_err(|e| e.to_string())?;

        use std::io::{Read, Write};
        let mut buf = [0u8; 65536];
        let mut downloaded: u64 = 0;
        loop {
            let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
            if n == 0 {
                break;
            }
            file.write_all(&buf[..n]).map_err(|e| e.to_string())?;
            downloaded += n as u64;
            if total > 0 {
                let pct = (downloaded * 100 / total) as u32;
                let _ = app_emit.emit("update-progress", pct);
            }
        }
        file.flush().map_err(|e| e.to_string())?;
        Ok::<std::path::PathBuf, String>(tmp)
    })
    .await
    .map_err(|e| e.to_string())??;

    // Запускаем установщик в режиме обновления и выходим.
    std::process::Command::new(&installer_path)
        .arg("--update")
        .spawn()
        .map_err(|e| format!("Не удалось запустить установщик: {e}"))?;

    // Небольшая задержка, чтобы процесс установщика успел стартовать.
    std::thread::sleep(std::time::Duration::from_millis(500));
    app.exit(0);
    Ok(())
}
