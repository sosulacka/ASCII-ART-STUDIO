//! Перехват вывода скрипта. Встроенные print-функции движка пишут в stdout
//! процесса — в UI это не попадает. Здесь регистрируем host-колбэки с теми
//! же сигнатурами (поздняя регистрация в реестре перекрывает встроенную) и
//! копим вывод в буфер, который axium_run_script вернёт во фронтенд-консоль.
//!
//! Буфер — thread_local: скрипт исполняется синхронно на одном потоке (под
//! lib()-локом), колбэки зовутся тут же, поэтому гонок нет и Mutex не нужен.

use std::cell::RefCell;
use std::ffi::{c_char, c_void, CString};

use super::{read_string, AxNativeFn, AxValue, FnRegisterNative};

thread_local! {
    static OUTPUT: RefCell<String> = const { RefCell::new(String::new()) };
}

/// Очищает буфер перед запуском скрипта.
pub fn reset_output() {
    OUTPUT.with(|o| o.borrow_mut().clear());
}

/// Забирает накопленный вывод (и очищает буфер).
pub fn take_output() -> String {
    OUTPUT.with(|o| std::mem::take(&mut *o.borrow_mut()))
}

fn push(s: &str) {
    OUTPUT.with(|o| o.borrow_mut().push_str(s));
}

pub fn register_all(register: FnRegisterNative, engine: *mut c_void) {
    register_one(register, engine, "Sys.print(String)Void", print_str);
    register_one(register, engine, "Sys.println(String)Void", println_str);
    register_one(register, engine, "Sys.printInt(Integer)Void", print_int);
    register_one(register, engine, "Sys.printLong(Long)Void", print_int);
    register_one(register, engine, "Sys.printFloat(Double)Void", print_float);
    register_one(register, engine, "Sys.printBool(Boolean)Void", print_bool);
    register_one(register, engine, "std.io.Console.writeStr(String)Void", print_str);
}

fn register_one(register: FnRegisterNative, engine: *mut c_void, signature: &str, callback: AxNativeFn) {
    let Ok(sig) = CString::new(signature) else { return };
    unsafe {
        register(engine, sig.as_ptr() as *const c_char, callback, std::ptr::null_mut());
    }
}

extern "C" fn print_str(vm: *mut c_void, args: *const AxValue, argc: usize, _ud: *mut c_void) -> AxValue {
    if !args.is_null() && argc >= 1 {
        let args = unsafe { std::slice::from_raw_parts(args, argc) };
        push(&read_string(vm, args[0].as_ref()));
    }
    AxValue::null()
}

extern "C" fn println_str(vm: *mut c_void, args: *const AxValue, argc: usize, _ud: *mut c_void) -> AxValue {
    if !args.is_null() && argc >= 1 {
        let args = unsafe { std::slice::from_raw_parts(args, argc) };
        push(&read_string(vm, args[0].as_ref()));
    }
    push("\n");
    AxValue::null()
}

extern "C" fn print_int(_vm: *mut c_void, args: *const AxValue, argc: usize, _ud: *mut c_void) -> AxValue {
    if !args.is_null() && argc >= 1 {
        let args = unsafe { std::slice::from_raw_parts(args, argc) };
        push(&args[0].as_int().to_string());
    }
    AxValue::null()
}

extern "C" fn print_float(_vm: *mut c_void, args: *const AxValue, argc: usize, _ud: *mut c_void) -> AxValue {
    if !args.is_null() && argc >= 1 {
        let args = unsafe { std::slice::from_raw_parts(args, argc) };
        push(&args[0].as_float().to_string());
    }
    AxValue::null()
}

extern "C" fn print_bool(_vm: *mut c_void, args: *const AxValue, argc: usize, _ud: *mut c_void) -> AxValue {
    if !args.is_null() && argc >= 1 {
        let args = unsafe { std::slice::from_raw_parts(args, argc) };
        push(if args[0].as_bool() { "true" } else { "false" });
    }
    AxValue::null()
}
