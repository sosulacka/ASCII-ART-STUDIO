//! Native-мост "управление приложением": ограниченный мод-набор для скриптов
//! — показать toast, сменить тему. Это НЕ произвольный доступ к ядру: только
//! то, что явно заведено здесь. Колбэки шлют события во фронтенд через
//! AppHandle, переданный как user_data (живёт весь синхронный run скрипта).

use std::ffi::{c_char, c_void, CString};
use tauri::Emitter;

use super::{read_string, AxNativeFn, AxValue, FnRegisterNative};

/// Контекст, адрес которого передаётся в колбэки как user_data. Держит клон
/// AppHandle для отправки событий. Создаётся на стеке в axium_run_script и
/// живёт до конца run — колбэки зовутся только синхронно внутри него.
pub struct AppApiCtx {
    pub app: tauri::AppHandle,
}

/// Регистрирует мосты управления. `ctx` — указатель на [`AppApiCtx`] (или
/// NULL для путей компиляции/списка, где скрипт не исполняется и колбэки не
/// вызываются, но сигнатуры всё равно должны быть известны компилятору).
pub fn register_all(register: FnRegisterNative, engine: *mut c_void, ctx: *mut c_void) {
    register_one(register, engine, "App.toast(String,String)Void", toast, ctx);
    register_one(register, engine, "App.setTheme(String)Boolean", set_theme, ctx);
}

fn register_one(
    register: FnRegisterNative,
    engine: *mut c_void,
    signature: &str,
    callback: AxNativeFn,
    ctx: *mut c_void,
) {
    let Ok(sig) = CString::new(signature) else { return };
    unsafe {
        register(engine, sig.as_ptr() as *const c_char, callback, ctx);
    }
}

fn ctx_ref<'a>(user_data: *mut c_void) -> Option<&'a AppApiCtx> {
    if user_data.is_null() {
        None
    } else {
        Some(unsafe { &*(user_data as *const AppApiCtx) })
    }
}

/// `App.toast(String message, String kind) -> Void`
///
/// `kind` — "success" | "error" | "info" (иное трактуется фронтендом как
/// info). Шлёт событие `script-toast`, App.tsx показывает уведомление.
extern "C" fn toast(vm: *mut c_void, args: *const AxValue, argc: usize, user_data: *mut c_void) -> AxValue {
    if args.is_null() || argc < 2 {
        return AxValue::null();
    }
    let args = unsafe { std::slice::from_raw_parts(args, argc) };
    let message = read_string(vm, args[0].as_ref());
    let kind = read_string(vm, args[1].as_ref());
    if let Some(ctx) = ctx_ref(user_data) {
        let _ = ctx.app.emit("script-toast", serde_json::json!({
            "message": message,
            "kind": kind,
        }));
    }
    AxValue::null()
}

/// `App.setTheme(String themeId) -> Boolean`
///
/// Шлёт событие `script-set-theme`; фронтенд валидирует id по списку тем и
/// применяет/сохраняет его. Возврат `true`, если событие отправлено (сам
/// факт существования темы проверяет фронтенд).
extern "C" fn set_theme(vm: *mut c_void, args: *const AxValue, argc: usize, user_data: *mut c_void) -> AxValue {
    if args.is_null() || argc < 1 {
        return AxValue::bool_(false);
    }
    let args = unsafe { std::slice::from_raw_parts(args, argc) };
    let theme_id = read_string(vm, args[0].as_ref());
    if theme_id.is_empty() {
        return AxValue::bool_(false);
    }
    match ctx_ref(user_data) {
        Some(ctx) => {
            let ok = ctx.app.emit("script-set-theme", theme_id).is_ok();
            AxValue::bool_(ok)
        }
        None => AxValue::bool_(false),
    }
}
