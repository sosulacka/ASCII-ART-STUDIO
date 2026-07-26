//! Мост к движку скриптов Axium. Сам движок — отдельная динамическая
//! библиотека (axium_vm.dll/.so), грузится в рантайме через libloading.
//! Здесь: низкоуровневые FFI-типы, загрузка DLL, регистрация native-мостов
//! (render_api) и хранение файлов скриптов (store).

mod app_api;
mod console;
mod render_api;
pub mod store;

use std::ffi::{c_char, c_void, CStr, CString};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use once_cell::sync::OnceCell;
use libloading::{Library, Symbol};

/// Загруженная библиотека движка. НЕ OnceCell: неудачная попытка не должна
/// кэшироваться навсегда — пользователь может доустановить/указать файл, и
/// следующий вызов обязан попробовать снова.
static LIB: Mutex<Option<Library>> = Mutex::new(None);

/// resource_dir Tauri-бандла (deb/AppImage кладут ресурсы не рядом с exe) —
/// заполняется один раз из setup() в lib.rs.
static RESOURCE_DIR: OnceCell<PathBuf> = OnceCell::new();

pub fn set_resource_dir(p: PathBuf) {
    let _ = RESOURCE_DIR.set(p);
}

fn lib_filename() -> &'static str {
    #[cfg(target_os = "windows")]
    { "axium_vm.dll" }
    #[cfg(not(target_os = "windows"))]
    { "libaxium_vm.so" }
}

/// Файл, в котором хранится путь к библиотеке, выбранный пользователем
/// вручную (кнопка «Указать файл» во вкладке скриптов).
fn saved_lib_path_file() -> PathBuf {
    let mut p = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    p.push("ascii-art-studio");
    p.push("axium_lib_path.txt");
    p
}

fn saved_lib_path() -> Option<PathBuf> {
    let text = std::fs::read_to_string(saved_lib_path_file()).ok()?;
    let trimmed = text.trim();
    if trimmed.is_empty() { None } else { Some(PathBuf::from(trimmed)) }
}

fn save_lib_path(p: &Path) {
    let file = saved_lib_path_file();
    if let Some(dir) = file.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    let _ = std::fs::write(file, p.to_string_lossy().as_bytes());
}

/// Все места, где библиотека может лежать, в порядке приоритета.
fn candidate_paths() -> Vec<PathBuf> {
    let name = lib_filename();
    let os_dir = if cfg!(target_os = "windows") { "win" } else { "linux" };
    let mut v = Vec::new();

    // 1. Путь, выбранный пользователем вручную.
    if let Some(p) = saved_lib_path() {
        v.push(p);
    }
    // 2. Рядом с исполняемым файлом (кастомный установщик кладёт сюда).
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            v.push(dir.join(name));
            v.push(dir.join("axium").join(name));
        }
    }
    // 3. Ресурсы Tauri-бандла (deb/AppImage: /usr/lib/<app>/axium/...).
    if let Some(res) = RESOURCE_DIR.get() {
        v.push(res.join("axium").join(name));
        v.push(res.join(name));
    }
    // 4. Конфиг-каталог пользователя (~/.config/ascii-art-studio/).
    if let Some(mut cfg) = dirs::config_dir() {
        cfg.push("ascii-art-studio");
        v.push(cfg.join(name));
    }
    // 5. Dev-режим: бинарники в репозитории (assets/Axium/bin/<os>/).
    //    CARGO_MANIFEST_DIR запечён на этапе компиляции — валиден на машине
    //    разработчика, на чужой просто не существует (кандидат пропустится).
    if let Some(manifest) = option_env!("CARGO_MANIFEST_DIR") {
        v.push(
            Path::new(manifest)
                .join("..")
                .join("assets")
                .join("Axium")
                .join("bin")
                .join(os_dir)
                .join(name),
        );
    }
    v
}

/// Проверяет, что библиотека — действительно Axium VM совместимой версии.
fn abi_ok(l: &Library) -> bool {
    unsafe {
        l.get::<unsafe extern "C" fn() -> u32>(b"axium_abi_version\0")
            .map(|f| f() == 1)
            .unwrap_or(false)
    }
}

/// Возвращает хранилище библиотеки, предварительно попытавшись загрузить её
/// по всем известным путям, если она ещё не загружена. Неудача НЕ кэшируется.
fn lib() -> &'static Mutex<Option<Library>> {
    let mut guard = match LIB.lock() {
        Ok(g) => g,
        Err(_) => return &LIB,
    };
    if guard.is_none() {
        for path in candidate_paths() {
            if !path.exists() {
                continue;
            }
            if let Ok(l) = unsafe { Library::new(&path) } {
                if abi_ok(&l) {
                    *guard = Some(l);
                    break;
                }
            }
        }
    }
    drop(guard);
    &LIB
}

// ── Значения через границу FFI (зеркало AxValue из ABI движка) ──
pub const AX_NULL: u8 = 0;
pub const AX_INT: u8 = 1;
pub const AX_FLOAT: u8 = 2;
pub const AX_BOOL: u8 = 3;
pub const AX_REF: u8 = 4;

#[repr(C)]
#[derive(Clone, Copy)]
pub struct AxValue {
    pub tag: u8,
    pub i: i64,
    pub f: f64,
}

impl AxValue {
    pub fn null() -> Self {
        AxValue { tag: AX_NULL, i: 0, f: 0.0 }
    }
    /// Часть конструкторов AxValue для будущих натив-функций.
    #[allow(dead_code)]
    pub fn int(v: i64) -> Self {
        AxValue { tag: AX_INT, i: v, f: 0.0 }
    }
    #[allow(dead_code)]
    pub fn bool_(v: bool) -> Self {
        AxValue { tag: AX_BOOL, i: v as i64, f: 0.0 }
    }
    pub fn ref_(r: u32) -> Self {
        AxValue { tag: AX_REF, i: r as i64, f: 0.0 }
    }
    pub fn as_int(&self) -> i64 {
        self.i
    }
    pub fn as_float(&self) -> f64 {
        if self.tag == AX_FLOAT { self.f } else { self.i as f64 }
    }
    pub fn as_bool(&self) -> bool {
        self.i != 0
    }
    pub fn as_ref(&self) -> u32 {
        self.i as u32
    }
}

pub type AxNativeFn = extern "C" fn(*mut c_void, *const AxValue, usize, *mut c_void) -> AxValue;

type FnEngineCreate = unsafe extern "C" fn() -> *mut c_void;
type FnEngineDestroy = unsafe extern "C" fn(*mut c_void);
type FnCompile = unsafe extern "C" fn(*mut c_void, *const c_char) -> bool;
type FnRun = unsafe extern "C" fn(*mut c_void) -> AxValue;
type FnLastError = unsafe extern "C" fn(*mut c_void) -> *const c_char;
type FnRegisterNative = unsafe extern "C" fn(*mut c_void, *const c_char, AxNativeFn, *mut c_void) -> bool;
type FnDiagnosticCount = unsafe extern "C" fn(*mut c_void) -> usize;
type FnDiagnosticGet = unsafe extern "C" fn(*mut c_void, usize, *mut AxDiagnosticRaw) -> bool;
type FnNativeCount = unsafe extern "C" fn(*mut c_void) -> usize;
type FnNativeGet = unsafe extern "C" fn(*mut c_void, usize, *mut *const c_char) -> bool;

/// Зеркало структуры AxDiagnostic из ABI движка — сырой (не-owning) вид
/// одной диагностики компиляции, читаемый прямо через границу FFI.
#[repr(C)]
struct AxDiagnosticRaw {
    severity: u8,
    stage: u8,
    line: u32,
    col: u32,
    end_line: u32,
    end_col: u32,
    message: *const c_char,
    help: *const c_char,
}

impl Default for AxDiagnosticRaw {
    fn default() -> Self {
        AxDiagnosticRaw {
            severity: 0,
            stage: 0,
            line: 0,
            col: 0,
            end_line: 0,
            end_col: 0,
            message: std::ptr::null(),
            help: std::ptr::null(),
        }
    }
}

fn stage_category(stage: u8) -> &'static str {
    match stage {
        0 => "LexError",
        1 => "ParseError",
        2 => "NameError",
        3 => "TypeError",
        4 => "BytecodeError",
        5 => "RuntimeError",
        _ => "Error",
    }
}

/// Одна диагностика компиляции скрипта, отдаётся во фронтенд для
/// инлайн-подсветки в CodeMirror (см. задачу C5).
#[derive(serde::Serialize, Debug)]
pub struct ScriptDiagnostic {
    pub severity: String,
    pub stage: String,
    pub line: u32,
    pub col: u32,
    pub end_line: u32,
    pub end_col: u32,
    pub message: String,
    pub help: Option<String>,
}

/// Указатели на heap-функции axium_vm.dll — их зовут native-колбэки
/// (см. render_api.rs), поэтому держим их в статике, доступной изнутри
/// колбэков (обычных extern "C" fn, не замыканий — границу FFI замыкания
/// не пересекают).
#[derive(Clone, Copy)]
pub struct HeapApi {
    pub new_string: unsafe extern "C" fn(*mut c_void, *const c_char) -> u32,
    pub get_string: unsafe extern "C" fn(*mut c_void, u32) -> *mut c_char,
    pub free_string: unsafe extern "C" fn(*mut c_char),
    pub array_len: unsafe extern "C" fn(*mut c_void, u32) -> i64,
    pub array_get: unsafe extern "C" fn(*mut c_void, u32, usize) -> AxValue,
}

/// Кэш heap-указателей. НЕ OnceCell: пока библиотека не загружена, каждая
/// попытка должна пробовать заново (библиотека может появиться позже — после
/// ручного выбора файла пользователем). Успешный результат остаётся навсегда
/// (библиотека после загрузки не выгружается до конца процесса).
static HEAP_API: Mutex<Option<HeapApi>> = Mutex::new(None);

fn load_heap_api() -> Option<HeapApi> {
    let guard = lib().lock().ok()?;
    let dll = guard.as_ref()?;
    unsafe {
        let new_string = *dll.get::<unsafe extern "C" fn(*mut c_void, *const c_char) -> u32>(b"axium_heap_new_string\0").ok()?;
        let get_string = *dll.get::<unsafe extern "C" fn(*mut c_void, u32) -> *mut c_char>(b"axium_heap_get_string\0").ok()?;
        let free_string = *dll.get::<unsafe extern "C" fn(*mut c_char)>(b"axium_free_string\0").ok()?;
        let array_len = *dll.get::<unsafe extern "C" fn(*mut c_void, u32) -> i64>(b"axium_heap_array_len\0").ok()?;
        let array_get = *dll.get::<unsafe extern "C" fn(*mut c_void, u32, usize) -> AxValue>(b"axium_heap_array_get\0").ok()?;
        Some(HeapApi { new_string, get_string, free_string, array_len, array_get })
    }
}

fn heap_api() -> Option<HeapApi> {
    if let Ok(guard) = HEAP_API.lock() {
        if let Some(api) = *guard {
            return Some(api);
        }
    }
    // Не держим лок HEAP_API во время load_heap_api(): тот берёт lib()-лок,
    // а колбэки внутри run() зовут heap_api() при уже взятом lib()-локе —
    // перекрёстный порядок взятия дал бы дедлок.
    let loaded = load_heap_api();
    if let (Some(api), Ok(mut guard)) = (loaded, HEAP_API.lock()) {
        *guard = Some(api);
        return Some(api);
    }
    loaded
}

/// Читает элементы Integer[]/строку из кучи скрипта — используется
/// native-колбэками render_api для распаковки аргументов.
pub fn read_int_array(vm: *mut c_void, obj_ref: u32) -> Vec<i64> {
    let Some(api) = heap_api() else { return Vec::new() };
    let len = unsafe { (api.array_len)(vm, obj_ref) };
    if len <= 0 {
        return Vec::new();
    }
    (0..len as usize)
        .map(|i| unsafe { (api.array_get)(vm, obj_ref, i) }.as_int())
        .collect()
}

pub fn read_string(vm: *mut c_void, obj_ref: u32) -> String {
    let Some(api) = heap_api() else { return String::new() };
    let ptr = unsafe { (api.get_string)(vm, obj_ref) };
    if ptr.is_null() {
        return String::new();
    }
    let s = unsafe { CStr::from_ptr(ptr) }.to_string_lossy().into_owned();
    unsafe { (api.free_string)(ptr) };
    s
}

pub fn new_string(vm: *mut c_void, s: &str) -> u32 {
    let Some(api) = heap_api() else { return u32::MAX };
    let c = match CString::new(s) {
        Ok(c) => c,
        Err(_) => return u32::MAX,
    };
    unsafe { (api.new_string)(vm, c.as_ptr()) }
}

#[tauri::command]
pub fn axium_check_dll() -> bool {
    lib().lock().map(|g| g.is_some()).unwrap_or(false)
}

/// Пользователь вручную указал файл axium_vm.dll / libaxium_vm.so.
/// Валидирует (загрузка + проверка ABI), при успехе делает библиотеку
/// активной и запоминает путь на будущие запуски.
#[tauri::command]
pub fn axium_set_lib_path(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(format!("файл не найден: {path}"));
    }
    let l = unsafe { Library::new(&p) }.map_err(|e| format!("не удалось загрузить: {e}"))?;
    if !abi_ok(&l) {
        return Err("это не библиотека Axium VM (или несовместимая версия ABI)".into());
    }
    let mut guard = lib().lock().map_err(|e| e.to_string())?;
    // Уже загруженную библиотеку не подменяем «на лету» (старая держит
    // указатели, которые могли уйти в HeapApi) — просто сохраняем путь;
    // если движка не было, новая становится активной сразу.
    if guard.is_none() {
        *guard = Some(l);
    }
    save_lib_path(&p);
    Ok(())
}

#[tauri::command]
pub fn axium_run_script(source: String, app: tauri::AppHandle) -> Result<String, String> {
    // Контекст app-control мостов: живёт на стеке весь run, его адрес идёт в
    // колбэки как user_data (колбэки зовутся только синхронно внутри run).
    let ctx = app_api::AppApiCtx { app };
    let ctx_ptr = &ctx as *const app_api::AppApiCtx as *mut c_void;
    run_script_impl(source, ctx_ptr)
}

/// Ядро запуска скрипта. `ctx_ptr` — указатель на [`app_api::AppApiCtx`]
/// (или NULL, если app-control мостам контекст не нужен, напр. в тестах).
fn run_script_impl(source: String, ctx_ptr: *mut c_void) -> Result<String, String> {
    // Прогреваем HeapApi ДО захвата lib()-лока ниже: native-колбэки
    // (render_api) достают heap_api() изнутри run(), пока лок уже держится
    // этим же потоком — std::sync::Mutex не реентерабелен, повторный lock()
    // на том же потоке будет ждать сам себя (дедлок).
    heap_api();

    let guard = lib().lock().map_err(|e| e.to_string())?;
    let dll = guard.as_ref().ok_or("axium_vm.dll не найдена")?;

    unsafe {
        let create: Symbol<FnEngineCreate> = dll.get(b"axium_engine_create\0").map_err(|e| e.to_string())?;
        let destroy: Symbol<FnEngineDestroy> = dll.get(b"axium_engine_destroy\0").map_err(|e| e.to_string())?;
        let compile: Symbol<FnCompile> = dll.get(b"axium_compile\0").map_err(|e| e.to_string())?;
        let run: Symbol<FnRun> = dll.get(b"axium_run\0").map_err(|e| e.to_string())?;
        let last_error: Symbol<FnLastError> = dll.get(b"axium_last_error\0").map_err(|e| e.to_string())?;
        let register_native: Symbol<FnRegisterNative> =
            dll.get(b"axium_register_native\0").map_err(|e| e.to_string())?;

        let engine = create();
        if engine.is_null() {
            return Err("axium_engine_create вернул null".into());
        }

        // Регистрируем мосты Render API/конвертации ДО компиляции — движок
        // строит VM лениво при первом run(), после этого natives уже нельзя
        // добавить. console перекрывает встроенные print-функции (перехват
        // вывода в UI-консоль вместо stdout процесса).
        render_api::register_all(*register_native, engine);
        app_api::register_all(*register_native, engine, ctx_ptr);
        console::register_all(*register_native, engine);

        let src = CString::new(source).map_err(|e| e.to_string())?;
        if !compile(engine, src.as_ptr()) {
            let err = last_error(engine);
            let msg = if err.is_null() {
                "ошибка компиляции".into()
            } else {
                CStr::from_ptr(err).to_string_lossy().into_owned()
            };
            destroy(engine);
            return Err(msg);
        }

        console::reset_output();
        let val = run(engine);
        let err_ptr = last_error(engine);
        let captured = console::take_output();
        let result = if !err_ptr.is_null() {
            Err(CStr::from_ptr(err_ptr).to_string_lossy().into_owned())
        } else {
            // Показываем перехваченный вывод скрипта; если его нет —
            // форматированное возвращаемое значение main() (для Void — null).
            Ok(if captured.is_empty() { format_ax_value(val) } else { captured })
        };
        destroy(engine);
        result
    }
}

/// Компилирует скрипт (без исполнения) и возвращает структурные диагностики
/// — ошибки и предупреждения, каждая со строкой/колонкой. Используется
/// фронтендом для инлайн-линта в CodeMirror (не блокирует запуск — тот же
/// скрипт затем повторно компилируется внутри `axium_run_script`, движки
/// одноразовые и не переиспользуются между вызовами).
#[tauri::command]
pub fn axium_compile_diagnostics(source: String) -> Result<Vec<ScriptDiagnostic>, String> {
    heap_api();

    let guard = lib().lock().map_err(|e| e.to_string())?;
    let dll = guard.as_ref().ok_or("axium_vm.dll не найдена")?;

    unsafe {
        let create: Symbol<FnEngineCreate> = dll.get(b"axium_engine_create\0").map_err(|e| e.to_string())?;
        let destroy: Symbol<FnEngineDestroy> = dll.get(b"axium_engine_destroy\0").map_err(|e| e.to_string())?;
        let compile: Symbol<FnCompile> = dll.get(b"axium_compile\0").map_err(|e| e.to_string())?;
        let register_native: Symbol<FnRegisterNative> =
            dll.get(b"axium_register_native\0").map_err(|e| e.to_string())?;
        let diag_count: Symbol<FnDiagnosticCount> =
            dll.get(b"axium_diagnostic_count\0").map_err(|e| e.to_string())?;
        let diag_get: Symbol<FnDiagnosticGet> =
            dll.get(b"axium_diagnostic_get\0").map_err(|e| e.to_string())?;

        let engine = create();
        if engine.is_null() {
            return Err("axium_engine_create вернул null".into());
        }

        // Регистрируем те же natives, что и настоящий запуск — иначе
        // неизвестные native-объявления дали бы NameError, которых при
        // реальном запуске не будет. Скрипт тут не исполняется, поэтому
        // app-control мостам контекст не нужен (ctx = null).
        render_api::register_all(*register_native, engine);
        app_api::register_all(*register_native, engine, std::ptr::null_mut());

        let src = match CString::new(source) {
            Ok(s) => s,
            Err(e) => {
                destroy(engine);
                return Err(e.to_string());
            }
        };
        compile(engine, src.as_ptr());

        let count = diag_count(engine);
        let mut out = Vec::with_capacity(count);
        for i in 0..count {
            let mut raw = AxDiagnosticRaw::default();
            if !diag_get(engine, i, &mut raw) {
                continue;
            }
            let message = if raw.message.is_null() {
                String::new()
            } else {
                CStr::from_ptr(raw.message).to_string_lossy().into_owned()
            };
            let help = if raw.help.is_null() {
                None
            } else {
                Some(CStr::from_ptr(raw.help).to_string_lossy().into_owned())
            };
            out.push(ScriptDiagnostic {
                severity: if raw.severity == 1 { "warning".into() } else { "error".into() },
                stage: stage_category(raw.stage).into(),
                line: raw.line,
                col: raw.col,
                end_line: raw.end_line,
                end_col: raw.end_col,
                message,
                help,
            });
        }

        destroy(engine);
        Ok(out)
    }
}

/// Список всех зарегистрированных native-сигнатур (builtins Axium std +
/// мосты render_api) в формате `"Класс.метод(Args)Ret"` — источник данных
/// для автодополнения (C4) и генерации документации (C8) во фронтенде.
#[tauri::command]
pub fn axium_list_natives() -> Result<Vec<String>, String> {
    let guard = lib().lock().map_err(|e| e.to_string())?;
    let dll = guard.as_ref().ok_or("axium_vm.dll не найдена")?;

    unsafe {
        let create: Symbol<FnEngineCreate> = dll.get(b"axium_engine_create\0").map_err(|e| e.to_string())?;
        let destroy: Symbol<FnEngineDestroy> = dll.get(b"axium_engine_destroy\0").map_err(|e| e.to_string())?;
        let register_native: Symbol<FnRegisterNative> =
            dll.get(b"axium_register_native\0").map_err(|e| e.to_string())?;
        let native_count: Symbol<FnNativeCount> =
            dll.get(b"axium_native_count\0").map_err(|e| e.to_string())?;
        let native_get: Symbol<FnNativeGet> = dll.get(b"axium_native_get\0").map_err(|e| e.to_string())?;

        let engine = create();
        if engine.is_null() {
            return Err("axium_engine_create вернул null".into());
        }

        render_api::register_all(*register_native, engine);
        app_api::register_all(*register_native, engine, std::ptr::null_mut());

        let count = native_count(engine);
        let mut out = Vec::with_capacity(count);
        for i in 0..count {
            let mut ptr: *const c_char = std::ptr::null();
            if !native_get(engine, i, &mut ptr) || ptr.is_null() {
                continue;
            }
            out.push(CStr::from_ptr(ptr).to_string_lossy().into_owned());
        }

        destroy(engine);
        Ok(out)
    }
}

fn format_ax_value(v: AxValue) -> String {
    match v.tag {
        AX_INT => v.i.to_string(),
        AX_FLOAT => v.f.to_string(),
        AX_BOOL => if v.i != 0 { "true".into() } else { "false".into() },
        _ => "null".into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Проверяет полный путь: DLL -> register_native(App.pixelsToAscii) ->
    /// компиляция скрипта, объявляющего native-заглушку с той же сигнатурой
    /// -> исполнение -> реальный вызов ascii::rgb_to_ascii_string через мост.
    /// Требует axium_vm.dll рядом с тестовым бинарником (см. build script /
    /// локальную копию в target/debug — не коммитится).
    #[test]
    fn pixels_to_ascii_native_roundtrip() {
        if !axium_check_dll() {
            eprintln!("axium_vm.dll не найдена рядом с тестовым бинарником — пропускаю");
            return;
        }
        let src = r#"
public class ;Sys; ([
    public static native Void println(String s).
])
public class ;App; ([
    public static native String pixelsToAscii(Integer[] pixels, Integer w, Integer h, Integer paletteIndex, String customPalette, Integer brightness, Integer contrast, Double gamma, Boolean useColor, Boolean invert, Boolean dithering).
])
public class ;Main; ([
    public static Void main() ([
        Integer[] px = [16777215, 0, 0, 16777215].
        String result = App.pixelsToAscii(px, 2, 2, 0, ;none;, 0, 0, 1.0, false, false, false).
        Sys.println(result).
    ])
])
"#;
        let result = run_script_impl(src.to_string(), std::ptr::null_mut());
        assert!(result.is_ok(), "скрипт должен скомпилироваться и выполниться: {result:?}");
        // Вывод Sys.println должен быть перехвачен в консоль (а не уйти в
        // stdout процесса и вернуться как "null").
        let out = result.unwrap();
        assert_ne!(out, "null", "вывод println должен перехватываться, а не давать null");
        assert!(out.contains('\n'), "println добавляет перевод строки: {out:?}");
    }

    /// Проверяет, что структурные диагностики реально приходят через FFI с
    /// корректной строкой/колонкой — намеренно ломаем скрипт на 3-й строке.
    #[test]
    fn compile_diagnostics_report_line_col() {
        if !axium_check_dll() {
            eprintln!("axium_vm.dll не найдена рядом с тестовым бинарником — пропускаю");
            return;
        }
        let src = "public class ;Main; ([\n    public static Void main() ([\n        Integer x = ;не число;.\n    ])\n])\n";
        let diags = axium_compile_diagnostics(src.to_string()).expect("вызов не должен падать");
        assert!(!diags.is_empty(), "ожидались диагностики для некорректного скрипта");
        let d = &diags[0];
        assert_eq!(d.severity, "error");
        assert_eq!(d.line, 3, "ошибка типов должна указывать на 3-ю строку: {diags:?}");
        assert!(d.col >= 1);
        assert!(!d.message.is_empty());
    }

    /// Проверяет, что список native-сигнатур реально приходит через FFI и
    /// содержит и builtin std (Sys.println), и render_api-мост
    /// (App.pixelsToAscii) — т.е. register_all действительно отработал.
    #[test]
    fn list_natives_includes_builtins_and_render_api() {
        if !axium_check_dll() {
            eprintln!("axium_vm.dll не найдена рядом с тестовым бинарником — пропускаю");
            return;
        }
        let natives = axium_list_natives().expect("вызов не должен падать");
        assert!(!natives.is_empty());
        assert!(natives.iter().any(|n| n.starts_with("Sys.println(")), "{natives:?}");
        assert!(natives.iter().any(|n| n.starts_with("App.pixelsToAscii(")), "{natives:?}");
    }

    /// Проверяет батч/экспорт-мосты: скрипт пишет текст и PNG на диск через
    /// App.saveText / App.savePng, тест убеждается что файлы реально созданы.
    #[test]
    fn batch_export_writes_files() {
        if !axium_check_dll() {
            eprintln!("axium_vm.dll не найдена рядом с тестовым бинарником — пропускаю");
            return;
        }
        let dir = std::env::temp_dir();
        let txt = dir.join("axium_test_export.txt");
        let png = dir.join("axium_test_export.png");
        let _ = std::fs::remove_file(&txt);
        let _ = std::fs::remove_file(&png);

        // Экранируем разделители пути `\` для строкового литерала AXL (`\\`).
        let txt_s = txt.to_string_lossy().replace('\\', "\\\\");
        let png_s = png.to_string_lossy().replace('\\', "\\\\");

        let src = format!(r#"
public class ;App; ([
    public static native Boolean saveText(String content, String path).
    public static native Boolean savePng(Integer[] pixels, Integer w, Integer h, String path).
])
public class ;Main; ([
    public static Void main() ([
        App.saveText(;привет;, ;{txt_s};).
        Integer[] px = [16777215, 0, 0, 16777215].
        App.savePng(px, 2, 2, ;{png_s};).
    ])
])
"#);
        let result = run_script_impl(src, std::ptr::null_mut());
        assert!(result.is_ok(), "скрипт должен выполниться: {result:?}");
        assert!(txt.exists(), "App.saveText должен был создать файл");
        assert!(png.exists(), "App.savePng должен был создать файл");
        assert_eq!(std::fs::read_to_string(&txt).unwrap(), "привет");
        let _ = std::fs::remove_file(&txt);
        let _ = std::fs::remove_file(&png);
    }

    /// Перехват вывода: println/print пишут в буфер, а не в stdout процесса —
    /// консоль UI получает именно текст, а не "null" от Void-main.
    #[test]
    fn console_output_is_captured() {
        if !axium_check_dll() {
            eprintln!("axium_vm.dll не найдена рядом с тестовым бинарником — пропускаю");
            return;
        }
        let src = r#"
public class ;Sys; ([
    public static native Void print(String s).
    public static native Void println(String s).
])
public class ;Main; ([
    public static Void main() ([
        Sys.print(;ab;).
        Sys.println(;cd;).
    ])
])
"#;
        let out = run_script_impl(src.to_string(), std::ptr::null_mut()).expect("должно выполниться");
        assert_eq!(out, "abcd\n", "вывод должен быть перехвачен дословно, получено: {out:?}");
    }

    /// Пример из Docs-модалки (src/components/DocsModal.tsx, EXAMPLE_SCRIPT)
    /// обязан компилироваться и выполняться — иначе документация врёт.
    /// При изменении примера правьте синхронно оба места.
    #[test]
    fn docs_example_compiles_and_runs() {
        if !axium_check_dll() {
            eprintln!("axium_vm.dll не найдена рядом с тестовым бинарником — пропускаю");
            return;
        }
        let src = r#"public class ;Sys; ([
    public static native Void printInt(Integer n).
    public static native Void println(String s).
])
public class ;Main; ([
    public static Void main() ([
        Integer n = 3.
        while (n > 0) ([
            Sys.printInt(n).
            n = n - 1.
        ])
        Sys.println(;Go!;).
    ])
])"#;
        let out = run_script_impl(src.to_string(), std::ptr::null_mut()).expect("пример из доков должен выполняться");
        assert_eq!(out, "321Go!\n", "получено: {out:?}");
    }
}
