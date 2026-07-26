//! Native-мост "конвертация/фильтры": даёт скриптам доступ к РЕАЛЬНОМУ
//! Rust-пайплайну ASCII-конверсии (crate::ascii), а не переизобретению его
//! на AXL. Скрипт объявляет у себя `native`-метод с той же сигнатурой
//! (см. пример в docs/scripts) — резолвится в этот колбэк через
//! axium_register_native, определять класс в std не обязательно.

use std::ffi::{c_char, c_void, CString};
use image::RgbImage;

use crate::ascii::{self, ProcessParams};
use super::{new_string, read_int_array, read_string, AxNativeFn, AxValue, FnRegisterNative};

pub fn register_all(register: FnRegisterNative, engine: *mut c_void) {
    register_one(
        register,
        engine,
        // gamma: Double, не Float — числовые литералы в AXL типизируются как
        // Double (§typeck), а Double->Float это сужение, требующее явного
        // каста. Runtime-значение всё равно f64 в обоих случаях (Value::Float).
        "App.pixelsToAscii(Integer[],Integer,Integer,Integer,String,Integer,Integer,Double,Boolean,Boolean,Boolean)String",
        pixels_to_ascii,
    );
    // ── Категория "батч/экспорт": запись результатов на диск ──
    register_one(
        register,
        engine,
        "App.saveText(String,String)Boolean",
        save_text,
    );
    register_one(
        register,
        engine,
        "App.savePng(Integer[],Integer,Integer,String)Boolean",
        save_png,
    );
}

fn register_one(register: FnRegisterNative, engine: *mut c_void, signature: &str, callback: AxNativeFn) {
    let Ok(sig) = CString::new(signature) else { return };
    unsafe {
        register(engine, sig.as_ptr() as *const c_char, callback, std::ptr::null_mut());
    }
}

/// `App.pixelsToAscii(Integer[] pixels, Integer w, Integer h, Integer paletteIndex,
///  String customPalette, Integer brightness, Integer contrast, Float gamma,
///  Boolean useColor, Boolean invert, Boolean dithering) -> String`
///
/// `pixels` — упакованный 0xRRGGBB на элемент (та же схема, что и
/// `std.gfx.Color.make`), длина ровно `w*h`. Возвращает готовую ASCII-строку
/// (с HTML-разметкой цвета, если `useColor`), как и обычная конвертация из
/// файла — тот же `ascii::rgb_to_ascii_string`.
extern "C" fn pixels_to_ascii(vm: *mut c_void, args: *const AxValue, argc: usize, _user_data: *mut c_void) -> AxValue {
    if args.is_null() || argc < 11 {
        return AxValue::null();
    }
    let args = unsafe { std::slice::from_raw_parts(args, argc) };

    let pixels_ref = args[0].as_ref();
    let w = args[1].as_int().max(0) as u32;
    let h = args[2].as_int().max(0) as u32;
    let palette_index = args[3].as_int().max(0) as usize;
    let custom_palette_ref = args[4].as_ref();
    let brightness = args[5].as_int() as i32;
    let contrast = args[6].as_int() as i32;
    let gamma = args[7].as_float() as f32;
    let use_color = args[8].as_bool();
    let invert = args[9].as_bool();
    let dithering = args[10].as_bool();

    if w == 0 || h == 0 {
        return AxValue::null();
    }

    let raw = read_int_array(vm, pixels_ref);
    if raw.len() < (w as usize) * (h as usize) {
        return AxValue::null();
    }

    let mut buf = vec![0u8; (w * h * 3) as usize];
    for (i, packed) in raw.iter().enumerate().take((w * h) as usize) {
        buf[i * 3] = ((packed >> 16) & 0xFF) as u8;
        buf[i * 3 + 1] = ((packed >> 8) & 0xFF) as u8;
        buf[i * 3 + 2] = (packed & 0xFF) as u8;
    }
    let Some(rgb_img) = RgbImage::from_raw(w, h, buf) else {
        return AxValue::null();
    };

    let custom_palette = if custom_palette_ref != u32::MAX {
        let s = read_string(vm, custom_palette_ref);
        if s.is_empty() { None } else { Some(s) }
    } else {
        None
    };

    let params = ProcessParams {
        file_path: String::new(),
        width: w,
        palette_index,
        custom_palette,
        brightness,
        contrast,
        gamma,
        // Скрипт сам управляет размером буфера — этот параметр внутри
        // rgb_to_ascii_string на уже готовое изображение не влияет.
        font_ratio: 2.0,
        use_color,
        invert,
        dithering,
    };
    let palette_chars = ascii::get_palette(&params);
    if palette_chars.len() < 2 {
        return AxValue::null();
    }

    let text = ascii::rgb_to_ascii_string(&rgb_img, &params, &palette_chars);
    AxValue::ref_(new_string(vm, &text))
}

/// `App.saveText(String content, String path) -> Boolean`
///
/// Пишет строку в файл (UTF-8). Для батч-экспорта из скрипта — сохранить
/// готовый ASCII-текст, лог, отчёт и т.п. `false` при ошибке ввода-вывода.
extern "C" fn save_text(vm: *mut c_void, args: *const AxValue, argc: usize, _user_data: *mut c_void) -> AxValue {
    if args.is_null() || argc < 2 {
        return AxValue::bool_(false);
    }
    let args = unsafe { std::slice::from_raw_parts(args, argc) };
    let content = read_string(vm, args[0].as_ref());
    let path = read_string(vm, args[1].as_ref());
    if path.is_empty() {
        return AxValue::bool_(false);
    }
    AxValue::bool_(std::fs::write(&path, content).is_ok())
}

/// `App.savePng(Integer[] pixels, Integer w, Integer h, String path) -> Boolean`
///
/// `pixels` — упакованный 0xRRGGBB на элемент, длина ровно `w*h`. Кодирует
/// буфер в PNG (формат по расширению пути). `false` при неверных размерах
/// или ошибке записи.
extern "C" fn save_png(vm: *mut c_void, args: *const AxValue, argc: usize, _user_data: *mut c_void) -> AxValue {
    if args.is_null() || argc < 4 {
        return AxValue::bool_(false);
    }
    let args = unsafe { std::slice::from_raw_parts(args, argc) };
    let pixels_ref = args[0].as_ref();
    let w = args[1].as_int().max(0) as u32;
    let h = args[2].as_int().max(0) as u32;
    let path = read_string(vm, args[3].as_ref());

    if w == 0 || h == 0 || path.is_empty() {
        return AxValue::bool_(false);
    }

    let raw = read_int_array(vm, pixels_ref);
    if raw.len() < (w as usize) * (h as usize) {
        return AxValue::bool_(false);
    }

    let mut buf = vec![0u8; (w * h * 3) as usize];
    for (i, packed) in raw.iter().enumerate().take((w * h) as usize) {
        buf[i * 3] = ((packed >> 16) & 0xFF) as u8;
        buf[i * 3 + 1] = ((packed >> 8) & 0xFF) as u8;
        buf[i * 3 + 2] = (packed & 0xFF) as u8;
    }
    let Some(rgb_img) = RgbImage::from_raw(w, h, buf) else {
        return AxValue::bool_(false);
    };
    AxValue::bool_(rgb_img.save(&path).is_ok())
}
