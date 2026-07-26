// Бэкенд виртуальной камеры через softcam (https://github.com/tshino/softcam).
//
// softcam — DirectShow-фильтр виртуальной камеры (MIT, © 2020 tshino),
// см. licenses/softcam/. Мы поставляем собранную softcam64.dll в ресурсах,
// грузим её в рантайме (LoadLibrary) и шлём кадры через C-API:
// scCreateCamera / scSendFrame / scDeleteCamera.
//
// Камера "DirectShow Softcam" видна всем DirectShow-приложениям
// (Discord, Zoom, Chrome, OBS) на Windows 7/8/10/11. Перед первым
// использованием DLL надо зарегистрировать (regsvr32, UAC) — см.
// register_softcam_dll().

#![cfg(target_os = "windows")]

use std::ffi::c_void;
use std::path::{Path, PathBuf};

// Сигнатуры из dist/include/softcam/softcam.h (API v1.8.1)
type ScCreateCamera = unsafe extern "C" fn(width: i32, height: i32, framerate: f32) -> *mut c_void;
type ScDeleteCamera = unsafe extern "C" fn(camera: *mut c_void);
type ScSendFrame = unsafe extern "C" fn(camera: *mut c_void, image_bits: *const c_void);
type ScIsConnected = unsafe extern "C" fn(camera: *mut c_void) -> bool;

struct SoftcamApi {
    _lib: libloading::Library,
    create: ScCreateCamera,
    delete: ScDeleteCamera,
    send_frame: ScSendFrame,
    /// Часть softcam FFI-API; используется через SoftcamCamera::is_connected.
    #[allow(dead_code)]
    is_connected: ScIsConnected,
}

pub struct SoftcamCamera {
    api: SoftcamApi,
    handle: *mut c_void,
    width: u32,
    height: u32,
    /// BGR bottom-up кадр для DirectShow
    bgr_buf: Vec<u8>,
}

// Handle используется только из одного потока-владельца состояния vcam,
// softcam сам синхронизирует доступ к shared memory.
unsafe impl Send for SoftcamCamera {}

/// Ищет softcam64.dll в нескольких местах, в порядке приоритета:
///   1. рядом с .exe (portable-режим и то, чего ждёт обычный пользователь)
///   2. <exe>/vcam/ и <exe>/resources/vcam/
///   3. <resource_dir>/resources/vcam/ и <resource_dir>/vcam/ (Tauri bundle)
///
/// Раньше искалось только в resource_dir.join("vcam"), но Tauri сохраняет
/// префикс `resources/`, поэтому DLL не находилась даже когда была на месте.
pub fn softcam_dll_path(resource_dir: &Path) -> PathBuf {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            candidates.push(exe_dir.join("softcam64.dll"));
            candidates.push(exe_dir.join("vcam").join("softcam64.dll"));
            candidates.push(exe_dir.join("resources").join("vcam").join("softcam64.dll"));
        }
    }

    candidates.push(resource_dir.join("resources").join("vcam").join("softcam64.dll"));
    candidates.push(resource_dir.join("vcam").join("softcam64.dll"));

    for c in &candidates {
        if c.exists() {
            return c.clone();
        }
    }

    // Ни один не найден — возвращаем первый ожидаемый путь (рядом с .exe)
    // для внятного текста ошибки.
    candidates
        .into_iter()
        .next()
        .unwrap_or_else(|| resource_dir.join("vcam").join("softcam64.dll"))
}

/// Зарегистрирована ли DLL (есть ли CLSID фильтра softcam в реестре).
pub fn is_softcam_registered() -> bool {
    use windows::core::w;
    use windows::Win32::System::Registry::{
        RegCloseKey, RegOpenKeyExW, HKEY, HKEY_CLASSES_ROOT, KEY_READ,
    };
    // CLSID_DShowSoftcam из src/softcamcore/DShowSoftcam.h
    let mut key = HKEY::default();
    let ok = unsafe {
        RegOpenKeyExW(
            HKEY_CLASSES_ROOT,
            w!("CLSID\\{AEF3B972-5FA5-4647-9571-358EB472BC9E}"),
            0,
            KEY_READ,
            &mut key,
        )
    }
    .is_ok();
    if ok {
        let _ = unsafe { RegCloseKey(key) };
    }
    ok
}

/// Регистрирует softcam64.dll через regsvr32 с запросом UAC.
/// Вызывать только по явному действию пользователя.
pub fn register_softcam_dll(resource_dir: &Path) -> Result<(), String> {
    let dll = softcam_dll_path(resource_dir);
    if !dll.exists() {
        return Err(format!("softcam64.dll not found at {}", dll.display()));
    }
    // runas => диалог UAC; regsvr32 /s — тихая регистрация
    let status = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            &format!(
                "Start-Process regsvr32 -ArgumentList '/s','\"{}\"' -Verb RunAs -Wait",
                dll.display()
            ),
        ])
        .status()
        .map_err(|e| format!("Failed to launch regsvr32: {e}"))?;

    if !status.success() {
        return Err("{\"key\":\"vcamRegisterDenied\",\"params\":[]}".to_string());
    }
    if !is_softcam_registered() {
        return Err("{\"key\":\"vcamRegisterFailed\",\"params\":[]}".to_string());
    }
    Ok(())
}

impl SoftcamCamera {
    /// width/height будут округлены вниз до кратных 4 (требование softcam).
    pub fn new(resource_dir: &Path, width: u32, height: u32) -> Result<Self, String> {
        let width = width & !3;
        let height = height & !3;
        if width == 0 || height == 0 {
            return Err("Invalid vcam frame size".into());
        }

        let dll_path = softcam_dll_path(resource_dir);
        let api = unsafe {
            let lib = libloading::Library::new(&dll_path)
                .map_err(|e| format!("Failed to load softcam64.dll: {e}"))?;
            let create: libloading::Symbol<ScCreateCamera> = lib
                .get(b"scCreateCamera")
                .map_err(|e| format!("scCreateCamera not found: {e}"))?;
            let delete: libloading::Symbol<ScDeleteCamera> = lib
                .get(b"scDeleteCamera")
                .map_err(|e| format!("scDeleteCamera not found: {e}"))?;
            let send_frame: libloading::Symbol<ScSendFrame> = lib
                .get(b"scSendFrame")
                .map_err(|e| format!("scSendFrame not found: {e}"))?;
            let is_connected: libloading::Symbol<ScIsConnected> = lib
                .get(b"scIsConnected")
                .map_err(|e| format!("scIsConnected not found: {e}"))?;
            SoftcamApi {
                create: *create,
                delete: *delete,
                send_frame: *send_frame,
                is_connected: *is_connected,
                _lib: lib,
            }
        };

        // framerate = 0: кадры уходят сразу, тайминг задаёт наш webcam-цикл
        let handle = unsafe { (api.create)(width as i32, height as i32, 0.0) };
        if handle.is_null() {
            return Err("{\"key\":\"vcamBusy\",\"params\":[]}".to_string());
        }

        Ok(Self {
            api,
            handle,
            width,
            height,
            bgr_buf: vec![0u8; (width * height * 3) as usize],
        })
    }

    pub fn dimensions(&self) -> (u32, u32) {
        (self.width, self.height)
    }

    /// Есть ли приложение, читающее виртуальную камеру. Часть softcam FFI-API;
    /// пока не вызывается из UI, но биндинг сохраняем для индикации статуса.
    #[allow(dead_code)]
    pub fn is_connected(&self) -> bool {
        unsafe { (self.api.is_connected)(self.handle) }
    }

    /// Отправить RGB24-кадр (top-down). Конвертация только RGB->BGR.
    ///
    /// Softcam сам переворачивает кадр по вертикали при выдаче в DirectShow
    /// (FrameBuffer::transferToDIB читает строки снизу вверх), поэтому нам
    /// переворачивать НЕ нужно — иначе двойной флип = перевёрнутое изображение.
    ///
    /// Кадр ЛЮБОГО размера вписывается в зафиксированный формат камеры
    /// (центрирование: чёрные поля/кроп) — см. vcam::fit_rgb_frame. Раньше
    /// кадр меньше целевого давал Err, ошибка молча глоталась, и камера
    /// «зависала» на последнем кадре при уменьшении ширины ASCII на лету.
    pub fn send_rgb(&mut self, rgb: &[u8], w: u32, h: u32) -> Result<(), String> {
        crate::vcam::fit_rgb_frame(rgb, w, h, &mut self.bgr_buf, self.width, self.height, true);
        unsafe { (self.api.send_frame)(self.handle, self.bgr_buf.as_ptr() as *const c_void) };
        Ok(())
    }
}

impl Drop for SoftcamCamera {
    fn drop(&mut self) {
        unsafe { (self.api.delete)(self.handle) };
    }
}
