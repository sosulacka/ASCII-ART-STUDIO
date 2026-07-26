use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use image::GenericImageView;
use ab_glyph::FontRef;
use tauri::{Manager, Emitter};
use base64::{Engine as _, engine::general_purpose};

mod webcam;
mod vcam;
mod ascii;
mod raster;
mod video;
mod mjpeg;
mod updater;
mod scripting;

// Ядро конверсии живёт в модулях; здесь только tauri-команды и состояние.
// FONT_DATA/PALETTES ре-экспортируются: webcam.rs и vcam зовут их как crate::.
pub use ascii::{FONT_DATA, PALETTES};
use ascii::{
    get_palette, resize_image, rgb_to_ascii_string, ProcessParams, VideoFrames,
};
use video::{extract_frames, get_fps, read_sorted_frames};
use mjpeg::VirtualCamera;

#[cfg(target_os = "linux")]
mod native_camera {
    use std::sync::Arc;
    use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
    use v4l::prelude::*;
    use v4l::io::traits::CaptureStream;
    
    pub struct NativeCamera {
        running: Arc<AtomicBool>,
        pub target_width: Arc<AtomicU32>,
        pub target_height: Arc<AtomicU32>,
    }
    
    impl NativeCamera {
        pub fn new(_device_index: u32) -> Result<Self, String> {
            Ok(Self {
                running: Arc::new(AtomicBool::new(false)),
                target_width: Arc::new(AtomicU32::new(640)),
                target_height: Arc::new(AtomicU32::new(480)),
            })
        }
        
        pub fn set_resolution(&self, width: u32, height: u32) {
            self.target_width.store(width, Ordering::Relaxed);
            self.target_height.store(height, Ordering::Relaxed);
        }
        
        pub fn start_capture<F>(&mut self, mut callback: F) -> Result<(), String> 
        where
            F: FnMut(Vec<u8>, u32, u32) + Send + 'static,
        {
            self.running.store(true, Ordering::Relaxed);
            let running = self.running.clone();
            
            std::thread::spawn(move || {
                if let Err(e) = Self::capture_loop(running.clone(), &mut callback) {
                    eprintln!("Camera capture error: {}", e);
                }
            });
            
            Ok(())
        }
        
        fn capture_loop<F>(running: Arc<AtomicBool>, callback: &mut F) -> Result<(), String>
        where
            F: FnMut(Vec<u8>, u32, u32),
        {
            use v4l::video::Capture;
            use v4l::FourCC;
            
            let dev = Device::new(0)
                .map_err(|e| format!("Failed to open camera: {}", e))?;
            
            let mut fmt = dev.format()
                .map_err(|e| format!("Failed to get format: {}", e))?;
            
            fmt.width = 640;
            fmt.height = 480;
            fmt.fourcc = FourCC::new(b"YUYV");
            
            let fmt = dev.set_format(&fmt)
                .map_err(|e| format!("Failed to set format: {}", e))?;
            
            let mut stream = MmapStream::with_buffers(&dev, v4l::buffer::Type::VideoCapture, 4)
                .map_err(|e| format!("Failed to create stream: {}", e))?;
            
            let width = fmt.width;
            let height = fmt.height;
            
            while running.load(Ordering::Relaxed) {
                match stream.next() {
                    Ok((buffer, _meta)) => {
                        let mut rgba = Vec::with_capacity((width * height * 4) as usize);
                        let bytes_per_line = (width * 2) as usize;
                        
                        for y in 0..height {
                            let line_start = (y as usize) * bytes_per_line;
                            let line_end = line_start + bytes_per_line;
                            
                            if line_end > buffer.len() {
                                break;
                            }
                            
                            let line = &buffer[line_start..line_end];
                            
                            for x in (0..bytes_per_line).step_by(4) {
                                if x + 3 >= line.len() {
                                    break;
                                }
                                
                                let y0 = line[x] as f32;
                                let u  = line[x + 1] as f32 - 128.0;
                                let y1 = line[x + 2] as f32;
                                let v  = line[x + 3] as f32 - 128.0;
                                
                                let r0 = (y0 + 1.402 * v).clamp(0.0, 255.0) as u8;
                                let g0 = (y0 - 0.344136 * u - 0.714136 * v).clamp(0.0, 255.0) as u8;
                                let b0 = (y0 + 1.772 * u).clamp(0.0, 255.0) as u8;
                                
                                rgba.push(r0);
                                rgba.push(g0);
                                rgba.push(b0);
                                rgba.push(255);
                                
                                let r1 = (y1 + 1.402 * v).clamp(0.0, 255.0) as u8;
                                let g1 = (y1 - 0.344136 * u - 0.714136 * v).clamp(0.0, 255.0) as u8;
                                let b1 = (y1 + 1.772 * u).clamp(0.0, 255.0) as u8;
                                
                                rgba.push(r1);
                                rgba.push(g1);
                                rgba.push(b1);
                                rgba.push(255);
                            }
                        }
                        
                        callback(rgba, width, height);
                    }
                    Err(_) => {
                        std::thread::sleep(std::time::Duration::from_millis(100));
                    }
                }
            }
            
            Ok(())
        }
        
        pub fn stop(&mut self) {
            self.running.store(false, Ordering::Relaxed);
        }
    }
}


#[cfg(not(target_os = "linux"))]
mod native_camera {
    pub struct NativeCamera {
        pub target_width: std::sync::Arc<std::sync::atomic::AtomicU32>,
        pub target_height: std::sync::Arc<std::sync::atomic::AtomicU32>,
    }
    
    impl NativeCamera {
        pub fn new(_device_index: u32) -> Result<Self, String> {
            Ok(Self {
                target_width: std::sync::Arc::new(std::sync::atomic::AtomicU32::new(640)),
                target_height: std::sync::Arc::new(std::sync::atomic::AtomicU32::new(480)),
            })
        }
        
        pub fn set_resolution(&self, width: u32, height: u32) {
            self.target_width.store(width, std::sync::atomic::Ordering::Relaxed);
            self.target_height.store(height, std::sync::atomic::Ordering::Relaxed);
        }
        
        pub fn start_capture<F>(&mut self, _callback: F) -> Result<(), String> 
        where
            F: FnMut(Vec<u8>, u32, u32) + Send + 'static,
        {
            Err("Native camera capture not available on this platform".to_string())
        }
        
        pub fn stop(&mut self) {}
    }
}

pub struct NativeCameraState {
    pub camera: Option<native_camera::NativeCamera>,
}

impl NativeCameraState {
    pub fn new() -> Self {
        Self { camera: None }
    }
}


pub struct VirtualCameraState {
    pub camera: Option<VirtualCamera>,
    /// Новый мультибэкенд (softcam / v4l2loopback). Если Some — кадры идут
    /// сюда, MJPEG-сервер (`camera`) не используется.
    pub backend: Option<Box<dyn vcam::VcamBackend>>,
}

fn get_config_path() -> PathBuf {
    let mut path = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."));
    path.push("ascii-art-studio");
    path.push("config.json");
    path
}

#[tauri::command]
async fn process_image(params: ProcessParams) -> Result<String, String> {
    let img = image::open(&params.file_path)
        .map_err(|e| format!("{{\"key\":\"errFileOpen\",\"params\":[\"{}\"]}} ", e))?;

    let palette_chars = get_palette(&params);
    if palette_chars.len() < 2 {
        return Err("{\"key\":\"errPaletteMin\",\"params\":[]}".to_string());
    }

    let rgb_img = resize_image(&img, params.width, params.font_ratio);
    Ok(rgb_to_ascii_string(&rgb_img, &params, &palette_chars))
}

#[tauri::command]
async fn process_video_frames(params: ProcessParams) -> Result<VideoFrames, String> {
    if !video::ffmpeg_available() {
        return Err("{\"key\":\"errFFmpegNotFound\",\"params\":[]}".to_string());
    }

    let input_path = &params.file_path;
    let fps = get_fps(input_path);

    let temp_dir = tempfile::tempdir()
        .map_err(|e| format!("{{\"key\":\"errTempDir\",\"params\":[\"{}\"]}} ", e))?;
    let frames_dir = temp_dir.path().join("frames");
    fs::create_dir_all(&frames_dir).map_err(|e| e.to_string())?;

    extract_frames(input_path, &frames_dir, 300)?;

    let frame_files = read_sorted_frames(&frames_dir)?;
    if frame_files.is_empty() {
        return Err("{\"key\":\"errNoFrames\",\"params\":[]}".to_string());
    }

    let palette_chars = get_palette(&params);
    if palette_chars.len() < 2 {
        return Err("{\"key\":\"errPaletteMin\",\"params\":[]}".to_string());
    }

    // Кадры независимы — конвертируем параллельно на всех ядрах
    use rayon::prelude::*;
    let ascii_frames: Vec<String> = frame_files
        .par_iter()
        .map(|frame_path| {
            let img = image::open(frame_path)
                .map_err(|e| format!("{{\"key\":\"errFrameOpen\",\"params\":[\"{}\"]}} ", e))?;
            let rgb_img = resize_image(&img, params.width, params.font_ratio);
            Ok(rgb_to_ascii_string(&rgb_img, &params, &palette_chars))
        })
        .collect::<Result<Vec<_>, String>>()?;

    let total = ascii_frames.len();
    Ok(VideoFrames { frames: ascii_frames, fps, total_frames: total })
}

#[tauri::command]
async fn save_video(
    params: ProcessParams,
    output_path: String,
    format: String,
    app: tauri::AppHandle,
) -> Result<String, String> {
    use std::process::Command;

    if !video::ffmpeg_available() {
        return Err("{\"key\":\"errFFmpegNotFound\",\"params\":[]}".to_string());
    }

    let input_path = &params.file_path;
    let fps = get_fps(input_path);

    let temp_dir = tempfile::tempdir().map_err(|e| e.to_string())?;
    let frames_in  = temp_dir.path().join("frames_in");
    let frames_out = temp_dir.path().join("frames_out");
    fs::create_dir_all(&frames_in).map_err(|e| e.to_string())?;
    fs::create_dir_all(&frames_out).map_err(|e| e.to_string())?;

    extract_frames(input_path, &frames_in, 300)?;

    let frame_files = read_sorted_frames(&frames_in)?;
    if frame_files.is_empty() {
        return Err("{\"key\":\"errNoFramesProcess\",\"params\":[]}".to_string());
    }

    let font = FontRef::try_from_slice(FONT_DATA)
        .map_err(|e| format!("{{\"key\":\"errFont\",\"params\":[\"{}\"]}} ", e))?;

    let palette_chars = get_palette(&params);
    if palette_chars.len() < 2 {
        return Err("{\"key\":\"errPaletteMin\",\"params\":[]}".to_string());
    }

    let first_img = image::open(&frame_files[0])
        .map_err(|e| format!("{{\"key\":\"errFirstFrame\",\"params\":[\"{}\"]}} ", e))?;
    let (fw, fh) = first_img.dimensions();
    let (ascii_w, out_w, out_h) = raster::output_dimensions(fw, fh, &params);
    let total = frame_files.len();

    // Кадры рендерятся параллельно; счётчик — только для лога прогресса
    use rayon::prelude::*;
    use std::sync::atomic::{AtomicUsize, Ordering as AtomicOrdering};
    let done = AtomicUsize::new(0);

    frame_files.par_iter().enumerate().try_for_each(|(i, frame_path)| -> Result<(), String> {
        let img = image::open(frame_path)
            .map_err(|e| format!("{{\"key\":\"errFrameN\",\"params\":[\"{}\",\"{}\"]}} ", i, e))?;
        let rgb_img = resize_image(&img, ascii_w, params.font_ratio);

        let canvas = raster::render_ascii_canvas(
            &rgb_img, &params, &palette_chars, &font, out_w, out_h,
        );

        let out_path = frames_out.join(format!("{:06}.png", i + 1));
        canvas.save(&out_path)
            .map_err(|e| format!("{{\"key\":\"errSaveFrame\",\"params\":[\"{}\",\"{}\"]}} ", i, e))?;

        let n = done.fetch_add(1, AtomicOrdering::Relaxed) + 1;
        if n % 5 == 0 || n == total {
            // Прогресс в UI (see App.tsx listen('render-progress'))
            let _ = app.emit("render-progress", serde_json::json!({
                "done": n,
                "total": total,
            }));
        }
        Ok(())
    })?;

    let pat_out  = frames_out.join("%06d.png");
    let fps_arg  = format!("{:.3}", fps);

    let encode_ok = if format == "gif" {
        
        let palette_img = temp_dir.path().join("palette.png");
        let s1 = Command::new("ffmpeg")
            .args([
                "-y", "-framerate", &fps_arg,
                "-i", pat_out.to_str().unwrap(),
                "-vf", "palettegen",
                palette_img.to_str().unwrap(),
            ])
            .status()
            .map_err(|e| format!("palettegen: {e}"))?;

        if s1.success() {
            Command::new("ffmpeg")
                .args([
                    "-y", "-framerate", &fps_arg,
                    "-i", pat_out.to_str().unwrap(),
                    "-i", palette_img.to_str().unwrap(),
                    "-filter_complex", "paletteuse",
                    &output_path,
                ])
                .status()
                .map_err(|e| format!("gif encode: {e}"))?
                .success()
        } else {
            false
        }
    } else {
        
        Command::new("ffmpeg")
            .args([
                "-y", "-framerate", &fps_arg,
                "-i", pat_out.to_str().unwrap(),
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "18",
                "-pix_fmt", "yuv420p",
                &output_path,
            ])
            .status()
            .map_err(|e| format!("mp4 encode: {e}"))?
            .success()
    };

    if !encode_ok {
        return Err("{\"key\":\"errFFmpegEncode\",\"params\":[]}".to_string());
    }

    Ok(format!(
        "{{\"key\":\"videoComplete\",\"params\":[\"{}\",\"{:.1}\",\"{}x{}\",\"{}\"]}}",
        total, fps, out_w, out_h, output_path
    ))
}

#[tauri::command]
async fn save_to_file(content: String, file_path: String) -> Result<(), String> {
    fs::write(&file_path, content)
        .map_err(|e| format!("{{\"key\":\"errWriteFile\",\"params\":[\"{}\",\"{}\"]}} ", file_path, e))
}

#[tauri::command]
async fn load_config() -> Result<String, String> {
    let path = get_config_path();
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())
    } else {
        Ok("{}".to_string())
    }
}

#[tauri::command]
async fn save_config(content: String) -> Result<(), String> {
    let path = get_config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

pub struct TempFolderState {
    pub dir: std::sync::Mutex<Option<tempfile::TempDir>>,
}

impl VirtualCameraState {
    pub fn new() -> Self {
        Self { camera: None, backend: None }
    }
}

#[tauri::command]
async fn save_font_to_temp(
    name: String,
    content: String,
    state: tauri::State<'_, TempFolderState>,
) -> Result<String, String> {
    let mut guard = state.dir.lock().map_err(|e| e.to_string())?;
    if guard.is_none() {
        *guard = Some(tempfile::tempdir().map_err(|e| e.to_string())?);
    }
    let temp_dir = guard.as_ref().unwrap();
    let file_path = temp_dir.path().join(&name);
    fs::write(&file_path, &content).map_err(|e| e.to_string())?;
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn save_webcam_temp_video(
    bytes: Vec<u8>,
    state: tauri::State<'_, TempFolderState>,
) -> Result<String, String> {
    let mut guard = state.dir.lock().map_err(|e| e.to_string())?;
    if guard.is_none() {
        *guard = Some(tempfile::tempdir().map_err(|e| e.to_string())?);
    }
    let temp_dir = guard.as_ref().unwrap();
    let file_path = temp_dir.path().join("webcam_temp.webm");
    fs::write(&file_path, &bytes).map_err(|e| e.to_string())?;
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn save_image_as_raster(
    params: ProcessParams,
    output_path: String,
) -> Result<String, String> {
    let img = image::open(&params.file_path)
        .map_err(|e| format!("{{\"key\":\"errFileOpen\",\"params\":[\"{}\"]}} ", e))?;

    let font = FontRef::try_from_slice(FONT_DATA)
        .map_err(|e| format!("{{\"key\":\"errFont\",\"params\":[\"{}\"]}} ", e))?;

    let palette_chars = get_palette(&params);
    if palette_chars.len() < 2 {
        return Err("{\"key\":\"errPaletteMin\",\"params\":[]}".to_string());
    }

    let (fw, fh) = img.dimensions();
    let (ascii_w, out_w, out_h) = raster::output_dimensions(fw, fh, &params);

    let rgb_img = resize_image(&img, ascii_w, params.font_ratio);
    let canvas = raster::render_ascii_canvas(
        &rgb_img, &params, &palette_chars, &font, out_w, out_h,
    );

    canvas.save(&output_path)
        .map_err(|e| format!("{{\"key\":\"errSaveImage\",\"params\":[\"{}\"]}} ", e))?;

    Ok(format!("{{\"key\":\"imageSaved\",\"params\":[\"{}\"]}}",output_path))
}

#[tauri::command]
async fn save_binary_file(bytes: Vec<u8>, file_path: String) -> Result<(), String> {
    fs::write(&file_path, bytes)
        .map_err(|e| format!("{{\"key\":\"errWriteFile\",\"params\":[\"{}\",\"{}\"]}} ", file_path, e))
}

#[tauri::command]
async fn start_virtual_camera(
    width: u32,
    height: u32,
    port: u16,
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<Mutex<VirtualCameraState>>>,
) -> Result<String, String> {
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if guard.camera.is_some() || guard.backend.is_some() {
        return Ok("Virtual camera already running".to_string());
    }

    // Пиксельные размеры итогового кадра ASCII-арта
    let out_w = width * webcam::CHAR_W;
    let out_h = height * webcam::CHAR_H;

    // 1) softcam: настоящая DirectShow-камера, видна в Discord/Zoom/OBS
    #[cfg(target_os = "windows")]
    {
        if vcam::softcam_win::is_softcam_registered() {
            if let Ok(resource_dir) = app.path().resource_dir() {
                match vcam::softcam_win::SoftcamCamera::new(&resource_dir, out_w, out_h) {
                    Ok(cam) => {
                        let (cw, ch) = cam.dimensions();
                        guard.backend = Some(Box::new(cam));
                        return Ok(format!(
                            "{{\"key\":\"vcamStartedSoftcam\",\"params\":[\"{}x{}\"]}}",
                            cw, ch
                        ));
                    }
                    Err(e) => {
                        eprintln!("softcam backend failed, falling back to MJPEG: {e}");
                    }
                }
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    let _ = &app;

    // 1b) Linux: прямая запись в v4l2loopback (без ffmpeg)
    #[cfg(target_os = "linux")]
    {
        match vcam::v4l2_linux::V4l2LoopbackCamera::new(out_w, out_h) {
            Ok(cam) => {
                let (cw, ch) = cam.dimensions();
                guard.backend = Some(Box::new(cam));
                return Ok(format!(
                    "{{\"key\":\"vcamStartedV4l2\",\"params\":[\"{}x{}\"]}}",
                    cw, ch
                ));
            }
            Err(e) => {
                eprintln!("v4l2loopback backend unavailable, falling back to MJPEG: {e}");
            }
        }
    }

    // 2) Фоллбек: MJPEG HTTP-сервер. Сообщение честное — это НЕ настоящая
    // виртуальная камера, а поток для Browser Source (раньше на Linux тут
    // писалось "v4l2loopback", вводя в заблуждение при недоступном модуле).
    let camera = VirtualCamera::new(width, height, port)?;
    guard.camera = Some(camera);

    let msg = format!(
        "Virtual camera started {}x{}\n\nMJPEG Stream: http://localhost:{}/stream\n\nUse in OBS: Browser Source\nUse in VLC: Open Network Stream\nOr open URL in any browser",
        width, height, port
    );

    Ok(msg)
}

/// Доступен ли нативный vcam-бэкенд: Windows — зарегистрирована ли softcam
/// DLL, Linux — загружен ли модуль v4l2loopback (есть ли виртуальное
/// video-устройство).
#[tauri::command]
async fn get_vcam_backend_info() -> Result<serde_json::Value, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(serde_json::json!({
            "softcam_registered": vcam::softcam_win::is_softcam_registered(),
            "platform": "windows",
        }))
    }
    #[cfg(target_os = "linux")]
    {
        Ok(serde_json::json!({
            "softcam_registered": false,
            "loopback_present": vcam::v4l2_linux::find_loopback_device().is_some(),
            "platform": "linux",
        }))
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        Ok(serde_json::json!({
            "softcam_registered": false,
            "platform": std::env::consts::OS,
        }))
    }
}

/// Регистрация softcam.dll (диалог UAC). Вызывается кнопкой в UI.
#[tauri::command]
async fn register_softcam(app: tauri::AppHandle) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let resource_dir = app
            .path()
            .resource_dir()
            .map_err(|e| format!("resource dir: {e}"))?;
        vcam::softcam_win::register_softcam_dll(&resource_dir)?;
        Ok("{\"key\":\"vcamRegistered\",\"params\":[]}".to_string())
    }
    #[cfg(target_os = "linux")]
    {
        let _ = app;
        // Загрузка модуля ядра через polkit (GUI-диалог пароля, аналог UAC).
        // exclusive_caps=1 ОБЯЗАТЕЛЕН: без него Chromium-приложения
        // (Discord, браузеры) не показывают v4l2loopback в списке камер.
        let out = std::process::Command::new("pkexec")
            .args([
                "modprobe",
                "v4l2loopback",
                "devices=1",
                "card_label=ASCII Art Camera",
                "exclusive_caps=1",
            ])
            .output()
            .map_err(|e| format!("pkexec: {e} (установите пакет policykit-1 или выполните modprobe вручную)"))?;
        if !out.status.success() {
            let err = String::from_utf8_lossy(&out.stderr);
            return Err(format!(
                "modprobe v4l2loopback: {} (модуль установлен? sudo apt install v4l2loopback-dkms)",
                err.trim()
            ));
        }
        if vcam::v4l2_linux::find_loopback_device().is_none() {
            return Err("модуль загружен, но устройство не появилось — проверьте dmesg".into());
        }
        Ok("{\"key\":\"vcamRegistered\",\"params\":[]}".to_string())
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        let _ = app;
        Err("virtual camera driver is not supported on this platform".to_string())
    }
}

#[tauri::command]
async fn stop_virtual_camera(
    state: tauri::State<'_, Arc<Mutex<VirtualCameraState>>>,
) -> Result<String, String> {
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if guard.camera.is_none() && guard.backend.is_none() {
        return Ok("{\"key\":\"vcamNotRunning\",\"params\":[]}".to_string());
    }

    // Clear frame buffer before dropping camera
    if let Some(camera) = guard.camera.as_mut() {
        let _ = camera.send_jpeg(&vec![]); // Clear the buffer
    }

    guard.camera = None;
    guard.backend = None; // Drop у softcam сам вызывает scDeleteCamera
    Ok("Virtual camera stopped".to_string())
}

#[tauri::command]
async fn set_virtual_camera_fps(
    fps: u32,
    state: tauri::State<'_, Arc<Mutex<VirtualCameraState>>>,
) -> Result<(), String> {
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    let camera = guard.camera.as_mut()
        .ok_or_else(|| "{\"key\":\"vcamNotStarted\",\"params\":[]}".to_string())?;
    
    camera.set_fps(fps);
    Ok(())
}

#[tauri::command]
async fn set_native_camera_resolution(
    width: u32,
    height: u32,
    state: tauri::State<'_, Arc<Mutex<NativeCameraState>>>,
) -> Result<(), String> {
    let guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    if let Some(camera) = &guard.camera {
        camera.set_resolution(width, height);
    }
    Ok(())
}

#[tauri::command]
async fn start_native_camera(
    device_index: u32,
    target_width: u32,
    target_height: u32,
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, Arc<Mutex<NativeCameraState>>>,
) -> Result<String, String> {
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    if guard.camera.is_some() {
        return Err("Camera already started".to_string());
    }
    
    let mut camera = native_camera::NativeCamera::new(device_index)?;
    camera.set_resolution(target_width, target_height);
    
    let tw_arc = camera.target_width.clone();
    let th_arc = camera.target_height.clone();
    
    camera.start_capture(move |frame_data, width, height| {
        use image::ImageBuffer;
        
        let current_tw = tw_arc.load(std::sync::atomic::Ordering::Relaxed);
        let current_th = th_arc.load(std::sync::atomic::Ordering::Relaxed);
        
        let result_data = if width > current_tw || height > current_th {
            if let Some(img) = ImageBuffer::<image::Rgba<u8>, Vec<u8>>::from_raw(width, height, frame_data) {
                let resized = image::imageops::resize(
                    &img,
                    current_tw,
                    current_th,
                    image::imageops::FilterType::Nearest
                );
                Some((resized.into_raw(), current_tw, current_th))
            } else {
                None
            }
        } else {
            Some((frame_data, width, height))
        };
        
        if let Some((data, w, h)) = result_data {
            let b64 = general_purpose::STANDARD.encode(&data);
            
            let _ = app_handle.emit("camera-frame", serde_json::json!({
                "data": b64,
                "width": w,
                "height": h,
                "encoding": "base64"
            }));
        }
    })?;
    
    guard.camera = Some(camera);
    
    Ok(format!("Native camera started on /dev/video{}", device_index))
}

#[tauri::command]
async fn stop_native_camera(
    state: tauri::State<'_, Arc<Mutex<NativeCameraState>>>,
) -> Result<String, String> {
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    if let Some(mut camera) = guard.camera.take() {
        camera.stop();
        Ok("Native camera stopped".to_string())
    } else {
        Err("Camera not running".to_string())
    }
}

#[tauri::command]
async fn is_native_camera_available() -> Result<bool, String> {
    #[cfg(target_os = "linux")]
    {
        Ok(std::path::Path::new("/dev/video0").exists())
    }
    
    #[cfg(not(target_os = "linux"))]
    {
        Ok(false)
    }
}

#[tauri::command]
async fn check_ffmpeg() -> Result<bool, String> {
    use std::process::Command;
    
    let result = Command::new("ffmpeg")
        .arg("-version")
        .output();
    
    match result {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
async fn install_ffmpeg() -> Result<String, String> {
    use std::process::Command;
    
    #[cfg(target_os = "windows")]
    {
        // Проверяем наличие winget
        let winget_check = Command::new("winget")
            .arg("--version")
            .output();
        
        if winget_check.is_ok() {
            // Устанавливаем через winget
            let output = Command::new("winget")
                .args(&["install", "-e", "--id", "Gyan.FFmpeg", "--silent"])
                .output()
                .map_err(|e| format!("Failed to execute winget: {}", e))?;
            
            if output.status.success() {
                return Ok("FFmpeg successfully installed via winget. Please restart the application.".to_string());
            }
        }
        
        // Если winget не работает, проверяем Chocolatey
        let choco_check = Command::new("choco")
            .arg("--version")
            .output();
        
        if choco_check.is_ok() {
            let output = Command::new("choco")
                .args(&["install", "ffmpeg", "-y"])
                .output()
                .map_err(|e| format!("Failed to execute choco: {}", e))?;
            
            if output.status.success() {
                return Ok("FFmpeg successfully installed via Chocolatey. Please restart the application.".to_string());
            }
        }
        
        // Если ничего не сработало
        Err("No package manager found. Please install FFmpeg manually from https://ffmpeg.org/download.html".to_string())
    }
    
    #[cfg(target_os = "linux")]
    {
        // Проверяем apt (Debian/Ubuntu)
        let apt_check = Command::new("apt")
            .arg("--version")
            .output();
        
        if apt_check.is_ok() {
            let output = Command::new("pkexec")
                .args(&["apt", "install", "-y", "ffmpeg"])
                .output()
                .map_err(|e| format!("Failed to execute apt: {}", e))?;
            
            if output.status.success() {
                return Ok("FFmpeg successfully installed via apt.".to_string());
            }
        }
        
        // Проверяем dnf (Fedora/RHEL)
        let dnf_check = Command::new("dnf")
            .arg("--version")
            .output();
        
        if dnf_check.is_ok() {
            let output = Command::new("pkexec")
                .args(&["dnf", "install", "-y", "ffmpeg"])
                .output()
                .map_err(|e| format!("Failed to execute dnf: {}", e))?;
            
            if output.status.success() {
                return Ok("FFmpeg successfully installed via dnf.".to_string());
            }
        }
        
        // Проверяем pacman (Arch)
        let pacman_check = Command::new("pacman")
            .arg("--version")
            .output();
        
        if pacman_check.is_ok() {
            let output = Command::new("pkexec")
                .args(&["pacman", "-S", "--noconfirm", "ffmpeg"])
                .output()
                .map_err(|e| format!("Failed to execute pacman: {}", e))?;
            
            if output.status.success() {
                return Ok("FFmpeg successfully installed via pacman.".to_string());
            }
        }
        
        Err("No supported package manager found (apt/dnf/pacman). Please install FFmpeg manually.".to_string())
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        Err("Automatic FFmpeg installation not supported on this platform.".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            process_image,
            process_video_frames,
            save_video,
            save_to_file,
            load_config,
            save_config,
            save_font_to_temp,
            save_webcam_temp_video,
            save_image_as_raster,
            save_binary_file,
            start_virtual_camera,
            stop_virtual_camera,
            set_virtual_camera_fps,
            start_native_camera,
            stop_native_camera,
            is_native_camera_available,
            set_native_camera_resolution,
            check_ffmpeg,
            install_ffmpeg,
            webcam::set_webcam_params,
            webcam::process_webcam_frame,
            get_vcam_backend_info,
            register_softcam,
            updater::check_update,
            updater::download_and_run_update,
            scripting::axium_check_dll,
            scripting::axium_set_lib_path,
            scripting::axium_run_script,
            scripting::axium_compile_diagnostics,
            scripting::axium_list_natives,
            scripting::store::axium_list_scripts,
            scripting::store::axium_load_script,
            scripting::store::axium_save_script,
            scripting::store::axium_delete_script,
        ])
        .setup(|app| {
            app.manage(TempFolderState {
                dir: std::sync::Mutex::new(tempfile::tempdir().ok()),
            });

            // resource_dir нужен поиску libaxium_vm.so/.dll в Tauri-бандлах
            // (deb/AppImage кладут ресурсы не рядом с исполняемым файлом).
            if let Ok(res) = app.path().resource_dir() {
                scripting::set_resource_dir(res);
            }

            app.manage(Arc::new(Mutex::new(VirtualCameraState::new())));
            app.manage(Arc::new(Mutex::new(NativeCameraState::new())));
            app.manage(webcam::WebcamState::default());

            let window = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "linux")]
            {
                window.with_webview(|webview| {
                    #[cfg(target_os = "linux")]
                    {
                        use webkit2gtk::WebViewExt;
                        use webkit2gtk::SettingsExt;
                        
                        let wv = webview.inner();
                        if let Some(settings) = wv.settings() {
                            settings.set_enable_media_stream(true);
                            settings.set_enable_mediasource(true);
                            settings.set_enable_media(true);
                        }
                    }
                }).ok();
            }

            let window_clone = window.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(400));
                window_clone.show().unwrap();
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
