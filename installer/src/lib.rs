// Установщик ASCII Art Studio — путь А (собственное приложение-установщик).
//
// Стратегия: per-user установка в %LOCALAPPDATA%, без прав администратора.
// Так делают VS Code / Discord / Figma. Реестр — HKCU, ярлыки — пользовательские.
// Единственное, что требует админа (регистрация softcam DLL), вынесено в само
// приложение с отдельным UAC-запросом.
//
// UI — брендированный webview (см. dist/index.html), общается с Rust через invoke.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::Cursor;
use std::path::{Path, PathBuf};
use serde::Serialize;
use tauri::{Emitter, Manager};

// Упакованное приложение (zip) вшивается в установщик при сборке.
// build-installer.mjs кладёт payload/app.zip перед `tauri build`.
static PAYLOAD: &[u8] = include_bytes!("../payload/app.zip");

const APP_NAME: &str = "ASCII Art Studio";
const APP_FOLDER: &str = "ASCIIArtStudio";
#[cfg(target_os = "windows")]
const APP_EXE: &str = "asciiartstudio.exe";
#[cfg(not(target_os = "windows"))]
const APP_EXE: &str = "asciiartstudio";
#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
const PUBLISHER: &str = "ASCII Art Studio";
#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
const APP_VERSION: &str = "0.1.0";
// Ключ удаления в «Установка и удаление программ»
#[cfg(target_os = "windows")]
const UNINSTALL_KEY: &str =
    r"Software\Microsoft\Windows\CurrentVersion\Uninstall\ASCIIArtStudio";

/// Директория установки по умолчанию.
/// Windows: %LOCALAPPDATA%\Programs\ASCIIArtStudio (как VS Code/Discord).
/// Linux:   ~/.local/share/ASCIIArtStudio (per-user, без root).
fn default_install_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("Programs")
            .join(APP_FOLDER)
    }
    #[cfg(not(target_os = "windows"))]
    {
        dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join(APP_FOLDER)
    }
}

#[derive(Serialize, Clone)]
struct Progress {
    stage: String,
    percent: u32,
}

#[tauri::command]
fn get_default_dir() -> String {
    default_install_dir().to_string_lossy().to_string()
}

/// Уже установлено? (для режима «обновить/переустановить»)
#[tauri::command]
fn is_installed(dir: String) -> bool {
    Path::new(&dir).join(APP_EXE).exists()
}

#[derive(Serialize)]
struct InstallOptions {
    dir: String,
    desktop_shortcut: bool,
    start_menu: bool,
    launch_after: bool,
}

/// Гарантирует, что softcam64/32.dll лежат в <install>/vcam/.
/// Если файла нет (payload собран без DLL) — качает с репозитория.
/// Сеть-ошибки не фатальны: приложение просто предложит установить драйвер позже.
/// Только Windows: softcam — DirectShow-драйвер, на Linux виртуальная камера
/// работает через v4l2loopback (модуль ядра из репозитория дистрибутива).
#[cfg(target_os = "windows")]
fn ensure_softcam_dll(install_dir: &Path, app: &tauri::AppHandle) {
    // Raw-ссылки на DLL в репозитории (main-ветка).
    const DLL_URLS: &[(&str, &str)] = &[
        (
            "softcam64.dll",
            "https://raw.githubusercontent.com/sosulacka/ASCII-ART-STUDIO/main/src-tauri/resources/vcam/softcam64.dll",
        ),
        (
            "softcam32.dll",
            "https://raw.githubusercontent.com/sosulacka/ASCII-ART-STUDIO/main/src-tauri/resources/vcam/softcam32.dll",
        ),
    ];

    let vcam_dir = install_dir.join("vcam");
    let _ = std::fs::create_dir_all(&vcam_dir);

    for (name, url) in DLL_URLS {
        let dest = vcam_dir.join(name);
        if dest.exists() {
            continue; // уже в payload — качать не нужно
        }
        let _ = app.emit(
            "install-progress",
            Progress { stage: format!("Загрузка {name}"), percent: 85 },
        );
        match download_file(url) {
            Ok(bytes) if !bytes.is_empty() => {
                let _ = std::fs::write(&dest, bytes);
            }
            _ => {
                // Молча продолжаем: без DLL приложение работает, только
                // виртуальная камера предложит установить драйвер вручную.
                eprintln!("Не удалось загрузить {name} с {url}");
            }
        }
    }
}

/// Гарантирует наличие axium_vm.dll/.so (движок скриптов Axium) рядом с
/// исполняемым файлом. Как и softcam, качается напрямую из репозитория —
/// в git закоммичен ТОЛЬКО скомпилированный бинарник (см. assets/Axium/bin/),
/// исходники языка закрытые и туда не попадают. Сеть-ошибка не фатальна:
/// приложение просто не покажет вкладку скриптов, пока файла нет.
fn ensure_axium_dll(install_dir: &Path, app: &tauri::AppHandle) {
    #[cfg(target_os = "windows")]
    const AXIUM_URL: (&str, &str) = (
        "axium_vm.dll",
        "https://raw.githubusercontent.com/sosulacka/ASCII-ART-STUDIO/main/assets/Axium/bin/win/axium_vm.dll",
    );
    #[cfg(target_os = "linux")]
    const AXIUM_URL: (&str, &str) = (
        "libaxium_vm.so",
        "https://raw.githubusercontent.com/sosulacka/ASCII-ART-STUDIO/main/assets/Axium/bin/linux/libaxium_vm.so",
    );

    let (name, url) = AXIUM_URL;
    let dest = install_dir.join(name);
    if dest.exists() {
        return; // уже в payload — качать не нужно
    }
    let _ = app.emit(
        "install-progress",
        Progress { stage: format!("Загрузка {name}"), percent: 85 },
    );
    match download_file(url) {
        Ok(bytes) if !bytes.is_empty() => {
            let _ = std::fs::write(&dest, bytes);
        }
        _ => {
            eprintln!("Не удалось загрузить {name} с {url}");
        }
    }
}

fn download_file(url: &str) -> Result<Vec<u8>, String> {
    let resp = ureq::get(url)
        .timeout(std::time::Duration::from_secs(30))
        .call()
        .map_err(|e| e.to_string())?;
    let mut buf = Vec::new();
    use std::io::Read;
    resp.into_reader()
        .read_to_end(&mut buf)
        .map_err(|e| e.to_string())?;
    Ok(buf)
}

/// Основная процедура установки. Прогресс шлём событиями `install-progress`.
#[tauri::command]
async fn run_install(
    app: tauri::AppHandle,
    dir: String,
    desktop_shortcut: bool,
    start_menu: bool,
) -> Result<(), String> {
    let target = PathBuf::from(&dir);

    let emit = |stage: &str, percent: u32| {
        let _ = app.emit("install-progress", Progress { stage: stage.to_string(), percent });
    };

    emit("Подготовка", 2);
    std::fs::create_dir_all(&target)
        .map_err(|e| format!("Не удалось создать папку: {e}"))?;

    // Распаковка zip из вшитого payload
    emit("Распаковка файлов", 8);
    let total_written = extract_payload(&target, |done, total| {
        let pct = 8 + (done as f32 / total.max(1) as f32 * 74.0) as u32;
        emit("Распаковка файлов", pct);
    })
    .map_err(|e| format!("Ошибка распаковки: {e}"))?;

    if total_written == 0 {
        return Err("Payload пуст — сборка установщика повреждена".into());
    }

    let exe_path = target.join(APP_EXE);

    // Гарантируем наличие softcam DLL для виртуальной камеры (Windows).
    // Если её нет в payload — качаем прямо с репозитория (как просил владелец).
    emit("Проверка компонентов", 84);
    #[cfg(target_os = "windows")]
    ensure_softcam_dll(&target, &app);
    ensure_axium_dll(&target, &app);

    #[cfg(target_os = "windows")]
    {
        emit("Создание ярлыков", 86);
        if start_menu {
            let _ = create_shortcut(&exe_path, ShortcutLocation::StartMenu);
        }
        if desktop_shortcut {
            let _ = create_shortcut(&exe_path, ShortcutLocation::Desktop);
        }

        emit("Регистрация в системе", 94);
        register_uninstall(&target, &exe_path)
            .map_err(|e| format!("Ошибка записи в реестр: {e}"))?;
    }

    #[cfg(target_os = "linux")]
    {
        // zip не хранит unix-права — вернуть исполняемость бинарнику.
        emit("Права на запуск", 86);
        make_executable(&exe_path);

        emit("Интеграция с рабочим столом", 94);
        // start_menu на Linux трактуем как «запись в меню приложений»
        // (.desktop в ~/.local/share/applications), desktop_shortcut —
        // копия .desktop на рабочий стол.
        let _ = install_desktop_entry(&target, &exe_path, start_menu, desktop_shortcut);
    }

    emit("Готово", 100);
    Ok(())
}

/// chmod +x (Linux): payload-zip прав не сохраняет.
#[cfg(target_os = "linux")]
fn make_executable(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    if let Ok(meta) = std::fs::metadata(path) {
        let mut perm = meta.permissions();
        perm.set_mode(perm.mode() | 0o755);
        let _ = std::fs::set_permissions(path, perm);
    }
}

/// Создаёт .desktop-запись (меню приложений) и, опционально, копию на
/// рабочий стол. Также пишет uninstall.sh для ручного удаления.
#[cfg(target_os = "linux")]
fn install_desktop_entry(
    install_dir: &Path,
    exe: &Path,
    start_menu: bool,
    desktop_shortcut: bool,
) -> Result<(), String> {
    let entry = format!(
        "[Desktop Entry]\n\
         Type=Application\n\
         Name={APP_NAME}\n\
         Comment=ASCII art from images, video and webcam\n\
         Exec=\"{exe}\"\n\
         Icon={icon}\n\
         Terminal=false\n\
         Categories=Graphics;AudioVideo;\n",
        exe = exe.to_string_lossy(),
        icon = install_dir.join("icon.png").to_string_lossy(),
    );

    let apps_dir = dirs::data_dir()
        .ok_or("нет ~/.local/share")?
        .join("applications");
    let desktop_file_name = "ascii-art-studio.desktop";

    if start_menu {
        std::fs::create_dir_all(&apps_dir).map_err(|e| e.to_string())?;
        std::fs::write(apps_dir.join(desktop_file_name), &entry).map_err(|e| e.to_string())?;
    }
    if desktop_shortcut {
        if let Some(desktop) = dirs::desktop_dir() {
            let dest = desktop.join(desktop_file_name);
            if std::fs::write(&dest, &entry).is_ok() {
                make_executable(&dest); // многие DE требуют +x на .desktop
            }
        }
    }

    // Скрипт удаления: файлы + .desktop-записи.
    let uninstall = format!(
        "#!/bin/sh\n\
         rm -f \"{apps}/{name}\"\n\
         rm -f \"$HOME/Desktop/{name}\" \"$(xdg-user-dir DESKTOP 2>/dev/null)/{name}\" 2>/dev/null\n\
         rm -rf \"{dir}\"\n",
        apps = apps_dir.to_string_lossy(),
        name = desktop_file_name,
        dir = install_dir.to_string_lossy(),
    );
    let sh = install_dir.join("uninstall.sh");
    if std::fs::write(&sh, uninstall).is_ok() {
        make_executable(&sh);
    }
    Ok(())
}

#[tauri::command]
fn launch_app(dir: String) -> Result<(), String> {
    let exe = PathBuf::from(&dir).join(APP_EXE);
    std::process::Command::new(&exe)
        .spawn()
        .map_err(|e| format!("Не удалось запустить: {e}"))?;
    Ok(())
}

#[tauri::command]
fn close_installer(app: tauri::AppHandle) {
    app.exit(0);
}

/// Запущен ли установщик в режиме обновления (--update).
#[tauri::command]
fn is_update_mode() -> bool {
    std::env::args().any(|a| a == "--update")
}

/// Режим обновления: ждём закрытия работающего приложения, перезаписываем
/// файлы поверх существующей установки, запускаем новую версию.
/// Путь установки берём из реестра (InstallLocation), иначе — дефолтный.
#[tauri::command]
async fn run_update(app: tauri::AppHandle) -> Result<(), String> {
    let target = installed_dir().unwrap_or_else(default_install_dir);

    let emit = |stage: &str, percent: u32| {
        let _ = app.emit("install-progress", Progress { stage: stage.to_string(), percent });
    };

    // Ждём, пока пользователь закроет старую версию (макс. ~20 сек).
    emit("Ожидание закрытия приложения", 4);
    for _ in 0..40 {
        if !is_process_running(APP_EXE) {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(500));
    }
    // Если всё ещё запущено — принудительно завершаем.
    if is_process_running(APP_EXE) {
        #[cfg(target_os = "windows")]
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/IM", APP_EXE])
            .output();
        #[cfg(not(target_os = "windows"))]
        let _ = std::process::Command::new("pkill")
            .args(["-x", APP_EXE])
            .output();
        std::thread::sleep(std::time::Duration::from_millis(800));
    }

    emit("Обновление файлов", 12);
    std::fs::create_dir_all(&target).map_err(|e| e.to_string())?;
    let written = extract_payload(&target, |done, total| {
        let pct = 12 + (done as f32 / total.max(1) as f32 * 78.0) as u32;
        emit("Обновление файлов", pct);
    })
    .map_err(|e| format!("Ошибка обновления: {e}"))?;

    if written == 0 {
        return Err("Payload пуст — сборка установщика повреждена".into());
    }

    emit("Гарантия компонентов", 92);
    #[cfg(target_os = "windows")]
    ensure_softcam_dll(&target, &app);
    ensure_axium_dll(&target, &app);

    #[cfg(target_os = "linux")]
    make_executable(&target.join(APP_EXE));

    emit("Запуск", 98);
    let exe = target.join(APP_EXE);
    let _ = std::process::Command::new(&exe).spawn();

    emit("Готово", 100);
    std::thread::sleep(std::time::Duration::from_millis(400));
    app.exit(0);
    Ok(())
}

/// Путь установки из реестра HKCU (InstallLocation), если приложение
/// зарегистрировано.
#[cfg(target_os = "windows")]
fn installed_dir() -> Option<PathBuf> {
    use windows::core::{HSTRING, PWSTR};
    use windows::Win32::System::Registry::{
        RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY, HKEY_CURRENT_USER, KEY_READ, REG_SZ,
        REG_VALUE_TYPE,
    };

    unsafe {
        let mut hkey = HKEY::default();
        if RegOpenKeyExW(
            HKEY_CURRENT_USER,
            &HSTRING::from(UNINSTALL_KEY),
            0,
            KEY_READ,
            &mut hkey,
        )
        .is_err()
        {
            return None;
        }

        let mut buf = [0u16; 512];
        let mut size = (buf.len() * 2) as u32;
        let mut vtype = REG_VALUE_TYPE(0);
        let res = RegQueryValueExW(
            hkey,
            &HSTRING::from("InstallLocation"),
            None,
            Some(&mut vtype),
            Some(buf.as_mut_ptr() as *mut u8),
            Some(&mut size),
        );
        let _ = RegCloseKey(hkey);
        let _ = PWSTR::null();

        if res.is_ok() && vtype == REG_SZ {
            let len = (size as usize / 2).saturating_sub(1);
            let s = String::from_utf16_lossy(&buf[..len]);
            if !s.is_empty() {
                return Some(PathBuf::from(s));
            }
        }
    }
    None
}

#[cfg(not(target_os = "windows"))]
fn installed_dir() -> Option<PathBuf> {
    None
}

/// Запущен ли процесс с данным именем exe (Windows: tasklist).
#[cfg(target_os = "windows")]
fn is_process_running(exe: &str) -> bool {
    let out = std::process::Command::new("tasklist")
        .args(["/FI", &format!("IMAGENAME eq {exe}"), "/NH"])
        .output();
    match out {
        Ok(o) => String::from_utf8_lossy(&o.stdout).contains(exe),
        Err(_) => false,
    }
}

#[cfg(target_os = "linux")]
fn is_process_running(exe: &str) -> bool {
    std::process::Command::new("pgrep")
        .args(["-x", exe])
        .output()
        .map(|o| !o.stdout.is_empty())
        .unwrap_or(false)
}

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
fn is_process_running(_exe: &str) -> bool {
    false
}

/// Распаковывает вшитый zip в target. Возвращает число записанных файлов.
fn extract_payload<F: Fn(usize, usize)>(target: &Path, progress: F) -> std::io::Result<usize> {
    let reader = Cursor::new(PAYLOAD);
    let mut archive = zip::ZipArchive::new(reader)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string()))?;

    let total = archive.len();
    let mut written = 0usize;

    for i in 0..total {
        let mut file = archive
            .by_index(i)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string()))?;

        let out_path = match file.enclosed_name() {
            Some(p) => target.join(p),
            None => continue,
        };

        if file.is_dir() {
            std::fs::create_dir_all(&out_path)?;
        } else {
            if let Some(parent) = out_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            let mut out = std::fs::File::create(&out_path)?;
            std::io::copy(&mut file, &mut out)?;
            written += 1;
        }
        progress(i + 1, total);
    }

    Ok(written)
}

#[cfg(target_os = "windows")]
enum ShortcutLocation {
    Desktop,
    StartMenu,
}

#[cfg(target_os = "windows")]
fn create_shortcut(exe: &Path, loc: ShortcutLocation) -> Result<(), String> {
    use windows::core::{Interface, HSTRING};
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoUninitialize, IPersistFile, CLSCTX_INPROC_SERVER,
        COINIT_APARTMENTTHREADED,
    };
    use windows::Win32::UI::Shell::{IShellLinkW, ShellLink};

    let link_path = match loc {
        ShortcutLocation::Desktop => dirs::desktop_dir()
            .ok_or("Нет папки рабочего стола")?
            .join(format!("{APP_NAME}.lnk")),
        ShortcutLocation::StartMenu => {
            let programs = dirs::data_dir()
                .ok_or("Нет AppData")?
                .join(r"Microsoft\Windows\Start Menu\Programs");
            std::fs::create_dir_all(&programs).ok();
            programs.join(format!("{APP_NAME}.lnk"))
        }
    };

    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let result = (|| -> Result<(), String> {
            let shell_link: IShellLinkW =
                CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER)
                    .map_err(|e| e.to_string())?;

            shell_link
                .SetPath(&HSTRING::from(exe.to_string_lossy().as_ref()))
                .map_err(|e| e.to_string())?;
            if let Some(work_dir) = exe.parent() {
                shell_link
                    .SetWorkingDirectory(&HSTRING::from(work_dir.to_string_lossy().as_ref()))
                    .map_err(|e| e.to_string())?;
            }
            shell_link
                .SetDescription(&HSTRING::from(APP_NAME))
                .map_err(|e| e.to_string())?;

            let persist: IPersistFile = shell_link.cast().map_err(|e| e.to_string())?;
            persist
                .Save(&HSTRING::from(link_path.to_string_lossy().as_ref()), true)
                .map_err(|e| e.to_string())?;
            Ok(())
        })();
        CoUninitialize();
        result
    }
}

/// Пишет ключ удаления в HKCU (per-user, без прав администратора) и создаёт
/// деинсталлятор-скрипт. Приложение появляется в «Установка и удаление программ».
#[cfg(target_os = "windows")]
fn register_uninstall(install_dir: &Path, exe: &Path) -> Result<(), String> {
    use windows::core::{HSTRING, PCWSTR};
    use windows::Win32::System::Registry::{
        RegCloseKey, RegCreateKeyExW, RegSetValueExW, HKEY, HKEY_CURRENT_USER,
        KEY_WRITE, REG_DWORD, REG_OPTION_NON_VOLATILE, REG_SZ,
    };

    // Скрипт удаления (bat) — удаляет файлы, ярлыки и ключ реестра
    let uninstaller = install_dir.join("uninstall.cmd");
    let script = format!(
        "@echo off\r\n\
         timeout /t 1 /nobreak >nul\r\n\
         reg delete \"HKCU\\{key}\" /f >nul 2>&1\r\n\
         del \"%USERPROFILE%\\Desktop\\{name}.lnk\" >nul 2>&1\r\n\
         del \"%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\{name}.lnk\" >nul 2>&1\r\n\
         rmdir /s /q \"{dir}\" >nul 2>&1\r\n",
        key = UNINSTALL_KEY.replace('\\', "\\\\"),
        name = APP_NAME,
        dir = install_dir.to_string_lossy(),
    );
    std::fs::write(&uninstaller, script).map_err(|e| e.to_string())?;

    let set_sz = |key: HKEY, name: &str, val: &str| -> Result<(), String> {
        let wide: Vec<u16> = val.encode_utf16().chain(std::iter::once(0)).collect();
        let bytes = unsafe {
            std::slice::from_raw_parts(wide.as_ptr() as *const u8, wide.len() * 2)
        };
        unsafe {
            RegSetValueExW(key, &HSTRING::from(name), 0, REG_SZ, Some(bytes))
                .ok()
                .map_err(|e| e.to_string())
        }
    };

    unsafe {
        let mut hkey = HKEY::default();
        RegCreateKeyExW(
            HKEY_CURRENT_USER,
            &HSTRING::from(UNINSTALL_KEY),
            0,
            PCWSTR::null(),
            REG_OPTION_NON_VOLATILE,
            KEY_WRITE,
            None,
            &mut hkey,
            None,
        )
        .ok()
        .map_err(|e| e.to_string())?;

        set_sz(hkey, "DisplayName", APP_NAME)?;
        set_sz(hkey, "DisplayVersion", APP_VERSION)?;
        set_sz(hkey, "Publisher", PUBLISHER)?;
        set_sz(hkey, "DisplayIcon", &exe.to_string_lossy())?;
        set_sz(hkey, "InstallLocation", &install_dir.to_string_lossy())?;
        set_sz(
            hkey,
            "UninstallString",
            &format!("cmd /c \"{}\"", install_dir.join("uninstall.cmd").to_string_lossy()),
        )?;

        // NoModify / NoRepair = 1
        let one: u32 = 1;
        let one_bytes = one.to_ne_bytes();
        let _ = RegSetValueExW(hkey, &HSTRING::from("NoModify"), 0, REG_DWORD, Some(&one_bytes));
        let _ = RegSetValueExW(hkey, &HSTRING::from("NoRepair"), 0, REG_DWORD, Some(&one_bytes));

        let _ = RegCloseKey(hkey);
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_default_dir,
            is_installed,
            run_install,
            launch_app,
            close_installer,
            is_update_mode,
            run_update,
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.show().unwrap();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("installer failed to start");
}
