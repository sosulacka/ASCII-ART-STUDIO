use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use image::{GenericImageView, RgbImage, Rgb, DynamicImage};
use imageproc::drawing::draw_text_mut;
use ab_glyph::{FontRef, PxScale};
use tauri::{Manager, Emitter};
use base64::{Engine as _, engine::general_purpose};

const PALETTES: [&str; 5] = [
    " .:-=+*#%@",
    " `.-':_,^=;><+!rc*/z?sLTv)J7(|Fi{C}fI31tlu[neoZ5Yxjya]2ESwqkP6h9d4VpOGbUAKXHm8RD#$Bg0MNWQ%&@",
    " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczxyujcqL0ozmwqpdbkhao*#MW&8%B@$",
    " ░▒▓█",
    " 01",
];

static FONT_DATA: &[u8] = include_bytes!("../assets/DejaVuSansMono.ttf");

#[derive(Serialize, Deserialize)]
pub struct LocalizedError {
    key: String,
    params: Vec<String>,
}

impl LocalizedError {
    fn new(key: &str) -> Self {
        Self {
            key: key.to_string(),
            params: vec![],
        }
    }
    
    fn with_param(key: &str, param: String) -> Self {
        Self {
            key: key.to_string(),
            params: vec![param],
        }
    }
    
    fn with_params(key: &str, params: Vec<String>) -> Self {
        Self {
            key: key.to_string(),
            params,
        }
    }
}

impl std::fmt::Display for LocalizedError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{{\"key\":\"{}\",\"params\":{:?}}}", self.key, self.params)
    }
}

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


#[cfg(target_os = "linux")]
mod virtual_camera_linux {
    use image::RgbImage;
    use std::sync::{Arc, Mutex};
    use axum::{
        Router,
        response::Response,
        http::{header, StatusCode},
        extract::State,
        body::Body,
    };
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::process::{Command, Stdio, Child};
    use std::io::Write;
    
    pub struct VirtualCamera {
        _width: u32,
        _height: u32,
        frame_buffer: Arc<Mutex<Option<Vec<u8>>>>,
        server_running: Arc<AtomicBool>,
        _http_port: u16,
        ffmpeg_process: Arc<Mutex<Option<Child>>>,
        target_fps: Arc<std::sync::atomic::AtomicU32>,
    }
    
    impl VirtualCamera {
        pub fn new(width: u32, height: u32, http_port: u16) -> Result<Self, String> {
            let frame_buffer = Arc::new(Mutex::new(None));
            let server_running = Arc::new(AtomicBool::new(false));
            let target_fps = Arc::new(std::sync::atomic::AtomicU32::new(60));
            
            let mut vcam_device = None;
            if let Ok(entries) = std::fs::read_dir("/sys/devices/virtual/video4linux/") {
                for entry in entries.flatten() {
                    if let Ok(name) = entry.file_name().into_string() {
                        if name.starts_with("video") {
                            vcam_device = Some(format!("/dev/{}", name));
                            break;
                        }
                    }
                }
            }
            
            let ffmpeg_process = Arc::new(Mutex::new(None));
            
            if let Some(dev) = &vcam_device {
                eprintln!("Found v4l2loopback device: {}, starting ffmpeg...", dev);
                match Command::new("ffmpeg")
                    .arg("-y")
                    .arg("-f").arg("image2pipe")
                    .arg("-vcodec").arg("mjpeg")
                    .arg("-i").arg("-")
                    .arg("-f").arg("v4l2")
                    .arg("-pix_fmt").arg("yuyv422")
                    .arg(dev)
                    .stdin(Stdio::piped())
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .spawn() 
                {
                    Ok(mut child) => {
                        *ffmpeg_process.lock().unwrap() = Some(child);
                        eprintln!("Real virtual camera (v4l2loopback) successfully started!");
                    }
                    Err(e) => {
                        eprintln!("Error starting ffmpeg: {}", e);
                    }
                }
            } else {
                eprintln!("v4l2loopback device not found, fallback to HTTP server");
            }
            
            let frame_buffer_clone = frame_buffer.clone();
            let server_running_clone = server_running.clone();
            let target_fps_clone = target_fps.clone();
            
            tauri::async_runtime::spawn(async move {
                start_mjpeg_server(http_port, frame_buffer_clone, server_running_clone, target_fps_clone).await;
            });
            
            server_running.store(true, Ordering::Relaxed);
            
            Ok(Self {
                _width: width,
                _height: height,
                frame_buffer,
                server_running,
                _http_port: http_port,
                ffmpeg_process,
                target_fps,
            })
        }
        
        pub fn send_frame(&mut self, frame: &RgbImage) -> Result<(), String> {
            let mut jpeg_data = Vec::new();
            let mut cursor = std::io::Cursor::new(&mut jpeg_data);
            
            frame.write_to(&mut cursor, image::ImageFormat::Jpeg)
                .map_err(|e| format!("JPEG encoding error: {}", e))?;
            
            self.send_jpeg(&jpeg_data)
        }
        
        pub fn send_jpeg(&mut self, jpeg_data: &[u8]) -> Result<(), String> {
            {
                let mut buffer = self.frame_buffer.lock().map_err(|e| format!("Lock error: {}", e))?;
                *buffer = Some(jpeg_data.to_vec());
            }
            
            if let Ok(mut lock) = self.ffmpeg_process.lock() {
                if let Some(child) = lock.as_mut() {
                    if let Some(stdin) = child.stdin.as_mut() {
                        let _ = stdin.write_all(jpeg_data);
                        let _ = stdin.flush();
                    }
                }
            }
            
            Ok(())
        }
        
        pub fn set_fps(&mut self, fps: u32) {
            self.target_fps.store(fps.max(1).min(120), Ordering::Relaxed);
        }
    }
    
    impl Drop for VirtualCamera {
        fn drop(&mut self) {
            self.server_running.store(false, Ordering::Relaxed);
            if let Ok(mut buffer) = self.frame_buffer.lock() {
                *buffer = None;
            }
            if let Ok(mut lock) = self.ffmpeg_process.lock() {
                if let Some(mut child) = lock.take() {
                    let _ = child.kill();
                    let _ = child.wait();
                }
            }
        }
    }
    
    async fn start_mjpeg_server(
        port: u16,
        frame_buffer: Arc<Mutex<Option<Vec<u8>>>>,
        running: Arc<AtomicBool>,
        target_fps: Arc<std::sync::atomic::AtomicU32>,
    ) {
        let app = Router::new()
            .route("/stream", axum::routing::get(mjpeg_stream))
            .route("/", axum::routing::get(index_page))
            .with_state((frame_buffer, running, target_fps));
        
        match tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port)).await {
            Ok(listener) => {
                eprintln!("✓ Virtual camera HTTP server started on port {}", port);
                let _ = axum::serve(listener, app).await;
            }
            Err(e) => {
                eprintln!("✗ Failed to start virtual camera server: {}", e);
            }
        }
    }
    
    async fn index_page() -> axum::response::Html<String> {
        axum::response::Html(format!(r#"
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>ASCII Art Virtual Camera (Linux)</title>
    <style>
        body {{
            font-family: 'Consolas', 'Courier New', monospace;
            background: #000;
            color: #0f0;
            padding: 20px;
            margin: 0;
        }}
        .container {{
            max-width: 800px;
            margin: 0 auto;
        }}
        h1 {{
            color: #0f0;
            text-shadow: 0 0 10px #0f0;
        }}
        a {{
            color: #0ff;
            text-decoration: none;
        }}
        a:hover {{
            text-decoration: underline;
        }}
        .status {{
            background: #111;
            border: 1px solid #0f0;
            padding: 10px;
            margin: 20px 0;
        }}
        img {{
            max-width: 100%;
            border: 2px solid #0f0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>ASCII ART STUDIO - Virtual Camera (Linux)</h1>
        
        <div class="status">
            <p><strong>Status:</strong> Server Running</p>
            <p><strong>MJPEG Stream:</strong> <a href="/stream">/stream</a></p>
            <p><strong>Platform:</strong> Linux (HTTP-based virtual camera)</p>
        </div>
        
        <h2>How to use:</h2>
        <ul>
            <li><strong>OBS Studio:</strong> Add "Browser Source" with URL: <code>http://localhost:8765/stream</code></li>
            <li><strong>VLC Media Player:</strong> Media → Open Network Stream → <code>http://localhost:8765/stream</code></li>
            <li><strong>Browser:</strong> Open <a href="/stream">http://localhost:8765/stream</a> directly</li>
            <li><strong>FFmpeg:</strong> <code>ffmpeg -i http://localhost:8765/stream output.mp4</code></li>
        </ul>
        
        <h2>Live Preview:</h2>
        <img src="/stream" alt="ASCII Art Stream" />
    </div>
</body>
</html>
        "#))
    }
    
    async fn mjpeg_stream(
        State((frame_buffer, running, target_fps)): State<(Arc<Mutex<Option<Vec<u8>>>>, Arc<AtomicBool>, Arc<std::sync::atomic::AtomicU32>)>,
    ) -> Response {
        use tokio::time::Duration;
        
        let boundary = "ASCIIARTFRAME";
        
        let stream = async_stream::stream! {
            let mut last_frame_time = tokio::time::Instant::now();
            
            while running.load(Ordering::Relaxed) {
                // Динамическое время между кадрами на основе целевого FPS
                let fps = target_fps.load(Ordering::Relaxed).max(1).min(120);
                let frame_duration = Duration::from_secs_f32(1.0 / fps as f32);
                
                let now = tokio::time::Instant::now();
                let elapsed = now.duration_since(last_frame_time);
                
                if elapsed < frame_duration {
                    tokio::time::sleep(frame_duration - elapsed).await;
                }
                
                last_frame_time = tokio::time::Instant::now();
                
                let jpeg = {
                    let buffer = frame_buffer.lock().unwrap();
                    buffer.clone()
                };
                
                if let Some(jpeg_data) = jpeg {
                    let frame_header = format!(
                        "--{}\r\nContent-Type: image/jpeg\r\nContent-Length: {}\r\n\r\n",
                        boundary,
                        jpeg_data.len()
                    );
                    
                    yield Ok::<_, std::convert::Infallible>(frame_header.into_bytes());
                    yield Ok::<_, std::convert::Infallible>(jpeg_data);
                    yield Ok::<_, std::convert::Infallible>(b"\r\n".to_vec());
                } else {
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
            }
        };
        
        Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, format!("multipart/x-mixed-replace; boundary={}", boundary))
            .header(header::CACHE_CONTROL, "no-cache, no-store, must-revalidate")
            .header(header::PRAGMA, "no-cache")
            .header(header::EXPIRES, "0")
            .header("Connection", "keep-alive")
            .body(Body::from_stream(stream))
            .unwrap()
    }
}

#[cfg(target_os = "windows")]
mod virtual_camera_windows {
    use image::RgbImage;
    use std::sync::{Arc, Mutex};
    use tokio::runtime::Runtime;
    use axum::{
        Router,
        response::Response,
        http::{header, StatusCode},
        extract::State,
        body::Body,
    };
    use std::sync::atomic::{AtomicBool, Ordering};
    
    #[allow(dead_code)]
    pub struct VirtualCamera {
        width: u32,
        height: u32,
        frame_buffer: Arc<Mutex<Option<Vec<u8>>>>,
        server_running: Arc<AtomicBool>,
        http_port: u16,
        target_fps: Arc<std::sync::atomic::AtomicU32>,
    }
    
    impl VirtualCamera {
        pub fn new(width: u32, height: u32, http_port: u16) -> Result<Self, String> {
            let frame_buffer = Arc::new(Mutex::new(None));
            let server_running = Arc::new(AtomicBool::new(false));
            let target_fps = Arc::new(std::sync::atomic::AtomicU32::new(60));
            
            let frame_buffer_clone = frame_buffer.clone();
            let server_running_clone = server_running.clone();
            let target_fps_clone = target_fps.clone();
            
            std::thread::spawn(move || {
                let rt = Runtime::new().unwrap();
                rt.block_on(async {
                    start_mjpeg_server(http_port, frame_buffer_clone, server_running_clone, target_fps_clone).await;
                });
            });
            
            server_running.store(true, Ordering::Relaxed);
            
            Ok(Self {
                width,
                height,
                frame_buffer,
                server_running,
                http_port,
                target_fps,
            })
        }
        
        pub fn send_frame(&mut self, frame: &RgbImage) -> Result<(), String> {
            let mut jpeg_data = Vec::new();
            let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg_data, 95);
            encoder.encode_image(frame)
                .map_err(|e| format!("JPEG encoding error: {}", e))?;
            
            self.send_jpeg(&jpeg_data)
        }
        
        pub fn set_fps(&mut self, fps: u32) {
            self.target_fps.store(fps.max(1).min(120), Ordering::Relaxed);
        }
        
        pub fn send_jpeg(&mut self, jpeg_data: &[u8]) -> Result<(), String> {
            let mut buffer = self.frame_buffer.lock().map_err(|e| format!("Lock error: {}", e))?;
            *buffer = Some(jpeg_data.to_vec());
            Ok(())
        }
    }
    
    impl Drop for VirtualCamera {
        fn drop(&mut self) {
            self.server_running.store(false, Ordering::Relaxed);
            if let Ok(mut buffer) = self.frame_buffer.lock() {
                *buffer = None;
            }
        }
    }
    
    async fn start_mjpeg_server(
        port: u16,
        frame_buffer: Arc<Mutex<Option<Vec<u8>>>>,
        running: Arc<AtomicBool>,
        target_fps: Arc<std::sync::atomic::AtomicU32>,
    ) {
        let app = Router::new()
            .route("/stream", axum::routing::get(mjpeg_stream))
            .route("/", axum::routing::get(index_page))
            .with_state((frame_buffer, running, target_fps));
        
        match tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port)).await {
            Ok(listener) => {
                let _ = axum::serve(listener, app).await;
            }
            Err(_) => {}
        }
    }
    
    async fn index_page() -> axum::response::Html<String> {
        axum::response::Html(format!(r#"
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>ASCII Art Virtual Camera</title>
    <style>
        body {{
            font-family: 'Consolas', 'Courier New', monospace;
            background: #000;
            color: #0f0;
            padding: 20px;
            margin: 0;
        }}
        .container {{
            max-width: 800px;
            margin: 0 auto;
        }}
        h1 {{
            color: #0f0;
            text-shadow: 0 0 10px #0f0;
        }}
        a {{
            color: #0ff;
            text-decoration: none;
        }}
        a:hover {{
            text-decoration: underline;
        }}
        .status {{
            background: #111;
            border: 1px solid #0f0;
            padding: 10px;
            margin: 20px 0;
        }}
        img {{
            max-width: 100%;
            border: 2px solid #0f0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>ASCII ART STUDIO - Virtual Camera</h1>
        
        <div class="status">
            <p><strong>Status:</strong> Server Running</p>
            <p><strong>MJPEG Stream:</strong> <a href="/stream">/stream</a></p>
        </div>
        
        <h2>How to use:</h2>
        <ul>
            <li><strong>OBS Studio:</strong> Add "Browser Source" with URL: <code>http://localhost:8765/stream</code></li>
            <li><strong>VLC Media Player:</strong> Media → Open Network Stream → <code>http://localhost:8765/stream</code></li>
            <li><strong>Browser:</strong> Open <a href="/stream">http://localhost:8765/stream</a> directly</li>
        </ul>
        
        <h2>Live Preview:</h2>
        <img src="/stream" alt="ASCII Art Stream" />
    </div>
</body>
</html>
        "#))
    }
    
    async fn mjpeg_stream(
        State((frame_buffer, running, target_fps)): State<(Arc<Mutex<Option<Vec<u8>>>>, Arc<AtomicBool>, Arc<std::sync::atomic::AtomicU32>)>,
    ) -> Response {
        use tokio::time::{interval, Duration};
        
        let boundary = "ASCIIARTFRAME";
        
        let stream = async_stream::stream! {
            let mut last_frame_time = tokio::time::Instant::now();
            
            while running.load(Ordering::Relaxed) {
                // Динамическое время между кадрами на основе целевого FPS
                let fps = target_fps.load(Ordering::Relaxed).max(1).min(120);
                let frame_duration = Duration::from_secs_f32(1.0 / fps as f32);
                
                let now = tokio::time::Instant::now();
                let elapsed = now.duration_since(last_frame_time);
                
                if elapsed < frame_duration {
                    tokio::time::sleep(frame_duration - elapsed).await;
                }
                
                last_frame_time = tokio::time::Instant::now();
                
                let jpeg = {
                    let buffer = frame_buffer.lock().unwrap();
                    buffer.clone()
                };
                
                if let Some(jpeg_data) = jpeg {
                    let frame_header = format!(
                        "--{}\r\nContent-Type: image/jpeg\r\nContent-Length: {}\r\n\r\n",
                        boundary,
                        jpeg_data.len()
                    );
                    
                    yield Ok::<_, std::convert::Infallible>(frame_header.into_bytes());
                    yield Ok::<_, std::convert::Infallible>(jpeg_data);
                    yield Ok::<_, std::convert::Infallible>(b"\r\n".to_vec());
                } else {
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
            }
        };
        
        Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, format!("multipart/x-mixed-replace; boundary={}", boundary))
            .header(header::CACHE_CONTROL, "no-cache, no-store, must-revalidate")
            .header(header::PRAGMA, "no-cache")
            .header(header::EXPIRES, "0")
            .header("Connection", "keep-alive")
            .body(Body::from_stream(stream))
            .unwrap()
    }
}

#[cfg(target_os = "linux")]
use virtual_camera_linux::VirtualCamera;

#[cfg(target_os = "windows")]
use virtual_camera_windows::VirtualCamera;

pub struct VirtualCameraState {
    pub camera: Option<VirtualCamera>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ProcessParams {
    file_path: String,
    width: u32,
    palette_index: usize,
    custom_palette: Option<String>,
    brightness: i32,
    contrast: i32,
    gamma: f32,
    font_ratio: f32,
    use_color: bool,
    invert: bool,
}

#[derive(Serialize, Deserialize)]
pub struct VideoFrames {
    frames: Vec<String>,
    fps: f64,
    total_frames: usize,
}

fn clamp_u8(val: f32) -> u8 {
    val.clamp(0.0, 255.0) as u8
}

fn apply_gamma(color: u8, gamma: f32) -> u8 {
    let n = color as f32 / 255.0;
    (n.powf(gamma) * 255.0).clamp(0.0, 255.0) as u8
}

fn process_pixel(
    r: u8, g: u8, b: u8,
    brightness: i32, contrast: i32, gamma: f32,
) -> (u8, u8, u8) {
    let factor = (259.0 * (contrast as f32 + 255.0))
        / (255.0 * (259.0 - contrast as f32));
    let r2 = clamp_u8(factor * (r as f32 - 128.0) + 128.0 + brightness as f32);
    let g2 = clamp_u8(factor * (g as f32 - 128.0) + 128.0 + brightness as f32);
    let b2 = clamp_u8(factor * (b as f32 - 128.0) + 128.0 + brightness as f32);
    (apply_gamma(r2, gamma), apply_gamma(g2, gamma), apply_gamma(b2, gamma))
}

fn get_palette(params: &ProcessParams) -> Vec<char> {
    match &params.custom_palette {
        Some(c) if !c.trim().is_empty() => c.chars().collect(),
        _ => PALETTES[params.palette_index.min(PALETTES.len() - 1)]
            .chars()
            .collect(),
    }
}

fn resize_image(img: &DynamicImage, target_width: u32, font_ratio: f32) -> RgbImage {
    let (orig_w, orig_h) = img.dimensions();
    let target_height = ((orig_h as f32 * target_width as f32)
        / (orig_w as f32 * font_ratio))
        .max(1.0) as u32;
    img.resize_exact(
        target_width,
        target_height,
        image::imageops::FilterType::CatmullRom,
    )
    .to_rgb8()
}

fn rgb_to_ascii_string(
    rgb_img: &RgbImage,
    params: &ProcessParams,
    palette_chars: &[char],
) -> String {
    let palette_len = palette_chars.len() as i32;
    let capacity = (rgb_img.width() * rgb_img.height() * 60) as usize;
    let mut result = String::with_capacity(capacity);

    if params.use_color {
        result.push_str(
            "<pre style='margin:0;padding:0;line-height:1.0;font-family:monospace;'>",
        );
    }

    let mut current_color = String::new();

    for y in 0..rgb_img.height() {
        for x in 0..rgb_img.width() {
            let pixel = rgb_img.get_pixel(x, y);
            let (r, g, b) = process_pixel(
                pixel[0], pixel[1], pixel[2],
                params.brightness, params.contrast, params.gamma,
            );

            let mut gray =
                (r as f32 * 0.299 + g as f32 * 0.587 + b as f32 * 0.114) as i32;
            if params.invert {
                gray = 255 - gray;
            }

            let char_idx =
                ((gray * (palette_len - 1)) / 255).clamp(0, palette_len - 1) as usize;
            let c = palette_chars[char_idx];

            if params.use_color {
                let hex = format!("#{:02X}{:02X}{:02X}", r, g, b);
                if hex != current_color {
                    if !current_color.is_empty() {
                        result.push_str("</span>");
                    }
                    result.push_str(&format!("<span style='color:{hex}'>"));
                    current_color = hex;
                }
                match c {
                    '<' => result.push_str("&lt;"),
                    '>' => result.push_str("&gt;"),
                    '&' => result.push_str("&amp;"),
                    ' ' => result.push_str("&nbsp;"),
                    _   => result.push(c),
                }
            } else {
                result.push(c);
            }
        }

        if params.use_color && !current_color.is_empty() {
            result.push_str("</span>");
            current_color.clear();
        }
        if params.use_color {
            result.push_str("<br>");
        } else {
            result.push('\n');
        }
    }

    if params.use_color {
        result.push_str("</pre>");
    }

    result
}

fn get_fps(input_path: &str) -> f64 {
    use std::process::Command;
    let out = Command::new("ffprobe")
        .args([
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=r_frame_rate",
            "-of", "default=noprint_wrappers=1:nokey=1",
            input_path,
        ])
        .output();

    let fps_str = match out {
        Ok(o) => String::from_utf8_lossy(&o.stdout).trim().to_string(),
        Err(_) => return 25.0,
    };

    if fps_str.contains('/') {
        let parts: Vec<&str> = fps_str.splitn(2, '/').collect();
        let num: f64 = parts[0].trim().parse().unwrap_or(25.0);
        let den: f64 = parts[1].trim().parse().unwrap_or(1.0);
        if den == 0.0 { 25.0 } else { (num / den).clamp(1.0, 120.0) }
    } else {
        fps_str.parse::<f64>().unwrap_or(25.0).clamp(1.0, 120.0)
    }
}

fn extract_frames(input_path: &str, frames_dir: &PathBuf, max_frames: u32) -> Result<(), String> {
    use std::process::Command;
    let pat = frames_dir.join("%06d.png");
    let status = Command::new("ffmpeg")
        .args([
            "-i", input_path,
            "-vframes", &max_frames.to_string(),
            pat.to_str().unwrap(),
        ])
        .status()
        .map_err(|e| format!("{{\"key\":\"errFFmpeg\",\"params\":[\"{}\"]}} ", e))?;

    if !status.success() {
        return Err("{\"key\":\"errFFmpegExtract\",\"params\":[]}".to_string());
    }
    Ok(())
}

fn read_sorted_frames(dir: &PathBuf) -> Result<Vec<PathBuf>, String> {
    let mut files: Vec<PathBuf> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.extension().map(|x| x == "png").unwrap_or(false))
        .collect();
    files.sort();
    Ok(files)
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
    use std::process::Command;

    Command::new("ffmpeg")
        .arg("-version")
        .output()
        .map_err(|_| {
            "{\"key\":\"errFFmpegNotFound\",\"params\":[]}".to_string()
        })?;

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

    let mut ascii_frames: Vec<String> = Vec::with_capacity(frame_files.len());

    for frame_path in &frame_files {
        let img = image::open(frame_path)
            .map_err(|e| format!("{{\"key\":\"errFrameOpen\",\"params\":[\"{}\"]}} ", e))?;
        let rgb_img = resize_image(&img, params.width, params.font_ratio);
        ascii_frames.push(rgb_to_ascii_string(&rgb_img, &params, &palette_chars));
    }

    let total = ascii_frames.len();
    Ok(VideoFrames { frames: ascii_frames, fps, total_frames: total })
}

#[tauri::command]
async fn save_video(
    params: ProcessParams,
    output_path: String,
    format: String,
) -> Result<String, String> {
    use std::process::Command;

    Command::new("ffmpeg")
        .arg("-version")
        .output()
        .map_err(|_| "{\"key\":\"errFFmpegNotFound\",\"params\":[]}".to_string())?;

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

    let font_px: f32 = 10.0;
    let scale  = PxScale::from(font_px);
    let char_w: u32 = 6;
    let char_h: u32 = 11;

    let palette_chars = get_palette(&params);
    if palette_chars.len() < 2 {
        return Err("{\"key\":\"errPaletteMin\",\"params\":[]}".to_string());
    }
    let palette_len = palette_chars.len() as i32;

    let first_img = image::open(&frame_files[0])
        .map_err(|e| format!("{{\"key\":\"errFirstFrame\",\"params\":[\"{}\"]}} ", e))?;
    let (fw, fh) = first_img.dimensions();
    let ascii_w  = params.width;
    let ascii_h  = ((fh as f32 * ascii_w as f32)
        / (fw as f32 * params.font_ratio)).max(1.0) as u32;
    let out_w = ascii_w * char_w;
    let out_h = ascii_h * char_h;
    let total = frame_files.len();

    for (i, frame_path) in frame_files.iter().enumerate() {
        let img = image::open(frame_path)
            .map_err(|e| format!("{{\"key\":\"errFrameN\",\"params\":[\"{}\",\"{}\"]}} ", i, e))?;
        let rgb_img = resize_image(&img, ascii_w, params.font_ratio);

        let mut canvas = RgbImage::from_pixel(out_w, out_h, Rgb([0u8, 0, 0]));

        for y in 0..rgb_img.height() {
            for x in 0..rgb_img.width() {
                let pixel = rgb_img.get_pixel(x, y);
                let (r, g, b) = process_pixel(
                    pixel[0], pixel[1], pixel[2],
                    params.brightness, params.contrast, params.gamma,
                );

                let mut gray =
                    (r as f32 * 0.299 + g as f32 * 0.587 + b as f32 * 0.114) as i32;
                if params.invert { gray = 255 - gray; }

                let idx = ((gray * (palette_len - 1)) / 255)
                    .clamp(0, palette_len - 1) as usize;
                let c = palette_chars[idx];

                let color = if params.use_color {
                    Rgb([r, g, b])
                } else {
                    Rgb([220u8, 220, 220])
                };

                draw_text_mut(
                    &mut canvas,
                    color,
                    (x * char_w) as i32,
                    (y * char_h) as i32,
                    scale,
                    &font,
                    &c.to_string(),
                );
            }
        }

        let out_path = frames_out.join(format!("{:06}.png", i + 1));
        canvas.save(&out_path)
            .map_err(|e| format!("{{\"key\":\"errSaveFrame\",\"params\":[\"{}\",\"{}\"]}} ", i, e))?;

        if i % 20 == 0 {
            eprintln!("Rendering: {}/{}", i + 1, total);
        }
    }

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
        Self { camera: None }
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

    let font_px: f32 = 10.0;
    let scale  = PxScale::from(font_px);
    let char_w: u32 = 6;
    let char_h: u32 = 11;

    let palette_chars = get_palette(&params);
    if palette_chars.len() < 2 {
        return Err("{\"key\":\"errPaletteMin\",\"params\":[]}".to_string());
    }
    let palette_len = palette_chars.len() as i32;

    let (fw, fh) = img.dimensions();
    let ascii_w  = params.width;
    let ascii_h  = ((fh as f32 * ascii_w as f32)
        / (fw as f32 * params.font_ratio)).max(1.0) as u32;
    let out_w = ascii_w * char_w;
    let out_h = ascii_h * char_h;

    let rgb_img = resize_image(&img, ascii_w, params.font_ratio);
    let mut canvas = RgbImage::from_pixel(out_w, out_h, Rgb([0u8, 0, 0]));

    for y in 0..rgb_img.height() {
        for x in 0..rgb_img.width() {
            let pixel = rgb_img.get_pixel(x, y);
            let (r, g, b) = process_pixel(
                pixel[0], pixel[1], pixel[2],
                params.brightness, params.contrast, params.gamma,
            );

            let mut gray =
                (r as f32 * 0.299 + g as f32 * 0.587 + b as f32 * 0.114) as i32;
            if params.invert { gray = 255 - gray; }

            let idx = ((gray * (palette_len - 1)) / 255)
                .clamp(0, palette_len - 1) as usize;
            let c = palette_chars[idx];

            let color = if params.use_color {
                Rgb([r, g, b])
            } else {
                Rgb([220u8, 220, 220])
            };

            draw_text_mut(
                &mut canvas,
                color,
                (x * char_w) as i32,
                (y * char_h) as i32,
                scale,
                &font,
                &c.to_string(),
            );
        }
    }

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
    state: tauri::State<'_, Arc<Mutex<VirtualCameraState>>>,
) -> Result<String, String> {
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    if guard.camera.is_some() {
        return Ok("Virtual camera already running".to_string());
    }
    
    let camera = VirtualCamera::new(width, height, port)?;
    guard.camera = Some(camera);
    
    #[cfg(target_os = "linux")]
    let msg = format!("Virtual camera started (v4l2loopback) {}x{}", width, height);
    
    #[cfg(target_os = "windows")]
    let msg = format!(
        "Virtual camera started {}x{}\n\nMJPEG Stream: http://localhost:{}/stream\n\nUse in OBS: Browser Source\nUse in VLC: Open Network Stream\nOr open URL in any browser",
        width, height, port
    );
    
    Ok(msg)
}

#[tauri::command]
async fn stop_virtual_camera(
    state: tauri::State<'_, Arc<Mutex<VirtualCameraState>>>,
) -> Result<String, String> {
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    if guard.camera.is_none() {
        return Ok("{\"key\":\"vcamNotRunning\",\"params\":[]}".to_string());
    }
    
    // Clear frame buffer before dropping camera
    if let Some(camera) = guard.camera.as_mut() {
        let _ = camera.send_jpeg(&vec![]); // Clear the buffer
    }
    
    guard.camera = None;
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
async fn send_frame_to_virtual_camera(
    image_data: Vec<u8>,
    width: u32,
    height: u32,
    state: tauri::State<'_, Arc<Mutex<VirtualCameraState>>>,
) -> Result<(), String> {
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    let camera = guard.camera.as_mut()
        .ok_or_else(|| "{\"key\":\"vcamNotStarted\",\"params\":[]}".to_string())?;
    
    let img = RgbImage::from_raw(width, height, image_data)
        .ok_or_else(|| "{\"key\":\"errInvalidImageData\",\"params\":[]}".to_string())?;
    
    camera.send_frame(&img)?;
    Ok(())
}

#[tauri::command]
async fn render_and_send_ascii_frame_b64(
    rgb_b64: String,
    width: u32,
    height: u32,
    palette: String,
    brightness: i32,
    contrast: i32,
    gamma: f32,
    invert: bool,
    use_color: bool,
    state: tauri::State<'_, Arc<Mutex<VirtualCameraState>>>,
) -> Result<(), String> {
    let rgb_data = general_purpose::STANDARD
        .decode(&rgb_b64)
        .map_err(|e| format!("Base64 decode error: {}", e))?;
    
    let rgb_img = RgbImage::from_raw(width, height, rgb_data)
        .ok_or_else(|| "Invalid RGB data".to_string())?;
    
    let palette_chars: Vec<char> = palette.chars().collect();
    if palette_chars.len() < 2 {
        return Err("{\"key\":\"errPaletteMin\",\"params\":[]}".to_string());
    }
    let palette_len = palette_chars.len() as i32;
    
    let font = FontRef::try_from_slice(FONT_DATA)
        .map_err(|e| format!("Font error: {}", e))?;
    
    let font_px: f32 = 10.0;
    let scale = PxScale::from(font_px);
    let char_w: u32 = 6;
    let char_h: u32 = 11;
    
    let out_w = width * char_w;
    let out_h = height * char_h;
    
    let mut canvas = RgbImage::from_pixel(out_w, out_h, Rgb([0u8, 0, 0]));

    use std::collections::HashMap;
    let mut glyph_cache: HashMap<char, image::RgbaImage> = HashMap::new();
    
    for c in &palette_chars {
        if !glyph_cache.contains_key(c) {
            let mut glyph_img = image::RgbaImage::from_pixel(char_w, char_h, image::Rgba([0, 0, 0, 0]));
            imageproc::drawing::draw_text_mut(
                &mut glyph_img,
                image::Rgba([255, 255, 255, 255]),
                0, 0,
                scale,
                &font,
                &c.to_string(),
            );
            glyph_cache.insert(*c, glyph_img);
        }
    }
    
    // Предварительный расчет гаммы
    let mut gamma_lut = [0u8; 256];
    for i in 0..256 {
        gamma_lut[i] = ((i as f32 / 255.0).powf(gamma) * 255.0).clamp(0.0, 255.0) as u8;
    }
    
    for y in 0..height {
        for x in 0..width {
            let pixel = rgb_img.get_pixel(x, y);
            
            let mut r = pixel[0] as f32 + brightness as f32;
            let mut g = pixel[1] as f32 + brightness as f32;
            let mut b = pixel[2] as f32 + brightness as f32;
            
            if contrast != 0 {
                let factor = (259.0 * (contrast as f32 + 255.0)) / (255.0 * (259.0 - contrast as f32));
                r = factor * (r - 128.0) + 128.0;
                g = factor * (g - 128.0) + 128.0;
                b = factor * (b - 128.0) + 128.0;
            }
            
            let r_idx = r.clamp(0.0, 255.0) as usize;
            let g_idx = g.clamp(0.0, 255.0) as usize;
            let b_idx = b.clamp(0.0, 255.0) as usize;
            
            let fr = gamma_lut[r_idx];
            let fg = gamma_lut[g_idx];
            let fb = gamma_lut[b_idx];
            
            let mut gray = (fr as f32 * 0.299 + fg as f32 * 0.587 + fb as f32 * 0.114) as i32;
            if invert {
                gray = 255 - gray;
            }
            
            let idx = ((gray * (palette_len - 1)) / 255).clamp(0, palette_len - 1) as usize;
            let c = palette_chars[idx];
            
            let target_color = if use_color {
                [fr, fg, fb]
            } else {
                [220u8, 220, 220]
            };
            
            if let Some(glyph) = glyph_cache.get(&c) {
                let out_x = x * char_w;
                let out_y = y * char_h;
                
                for gy in 0..char_h {
                    for gx in 0..char_w {
                        let g_pixel = glyph.get_pixel(gx, gy);
                        if g_pixel[3] > 0 { 
                            
                            let alpha = g_pixel[3] as f32 / 255.0;
                            let color_r = (target_color[0] as f32 * alpha) as u8;
                            let color_g = (target_color[1] as f32 * alpha) as u8;
                            let color_b = (target_color[2] as f32 * alpha) as u8;
                            
                            canvas.put_pixel(out_x + gx, out_y + gy, Rgb([color_r, color_g, color_b]));
                        }
                    }
                }
            }
        }
    }
    
    let mut jpeg_data = Vec::new();
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg_data, 95);
    encoder.encode_image(&canvas)
        .map_err(|e| format!("JPEG encoding error: {}", e))?;
    
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    let camera = guard.camera.as_mut()
        .ok_or_else(|| "{\"key\":\"vcamNotStarted\",\"params\":[]}".to_string())?;
    
    camera.send_jpeg(&jpeg_data)?;
    
    Ok(())
}

#[tauri::command]
async fn render_and_send_ascii_frame(
    rgb_data: Vec<u8>,
    width: u32,
    height: u32,
    palette: String,
    brightness: i32,
    contrast: i32,
    gamma: f32,
    invert: bool,
    use_color: bool,
    state: tauri::State<'_, Arc<Mutex<VirtualCameraState>>>,
) -> Result<(), String> {
    let rgb_img = RgbImage::from_raw(width, height, rgb_data)
        .ok_or_else(|| "{\"key\":\"errInvalidRGB\",\"params\":[]}".to_string())?;
    
    let palette_chars: Vec<char> = palette.chars().collect();
    if palette_chars.len() < 2 {
        return Err("{\"key\":\"errPaletteMin\",\"params\":[]}".to_string());
    }
    let palette_len = palette_chars.len() as i32;
    
    let font = FontRef::try_from_slice(FONT_DATA)
        .map_err(|e| format!("{{\"key\":\"errFont\",\"params\":[\"{}\"]}} ", e))?;
    
    let font_px: f32 = 10.0;
    let scale = PxScale::from(font_px);
    let char_w: u32 = 6;
    let char_h: u32 = 11;
    
    let out_w = width * char_w;
    let out_h = height * char_h;
    
    let mut canvas = RgbImage::from_pixel(out_w, out_h, Rgb([0u8, 0, 0]));
    
    use std::collections::HashMap;
    let mut glyph_cache: HashMap<char, image::RgbaImage> = HashMap::new();
    
    for c in &palette_chars {
        if !glyph_cache.contains_key(c) {
            let mut glyph_img = image::RgbaImage::from_pixel(char_w, char_h, image::Rgba([0, 0, 0, 0]));
            imageproc::drawing::draw_text_mut(
                &mut glyph_img,
                image::Rgba([255, 255, 255, 255]),
                0, 0,
                scale,
                &font,
                &c.to_string(),
            );
            glyph_cache.insert(*c, glyph_img);
        }
    }
    
    let mut gamma_lut = [0u8; 256];
    for i in 0..256 {
        gamma_lut[i] = ((i as f32 / 255.0).powf(gamma) * 255.0).clamp(0.0, 255.0) as u8;
    }
    
    for y in 0..height {
        for x in 0..width {
            let pixel = rgb_img.get_pixel(x, y);
            
            let mut r = pixel[0] as f32 + brightness as f32;
            let mut g = pixel[1] as f32 + brightness as f32;
            let mut b = pixel[2] as f32 + brightness as f32;
            
            if contrast != 0 {
                let factor = (259.0 * (contrast as f32 + 255.0)) / (255.0 * (259.0 - contrast as f32));
                r = factor * (r - 128.0) + 128.0;
                g = factor * (g - 128.0) + 128.0;
                b = factor * (b - 128.0) + 128.0;
            }
            
            let r_idx = r.clamp(0.0, 255.0) as usize;
            let g_idx = g.clamp(0.0, 255.0) as usize;
            let b_idx = b.clamp(0.0, 255.0) as usize;
            
            let fr = gamma_lut[r_idx];
            let fg = gamma_lut[g_idx];
            let fb = gamma_lut[b_idx];
            
            let mut gray = (fr as f32 * 0.299 + fg as f32 * 0.587 + fb as f32 * 0.114) as i32;
            if invert {
                gray = 255 - gray;
            }
            
            let idx = ((gray * (palette_len - 1)) / 255).clamp(0, palette_len - 1) as usize;
            let c = palette_chars[idx];
            
            let target_color = if use_color {
                [fr, fg, fb]
            } else {
                [220u8, 220, 220]
            };
            
            if let Some(glyph) = glyph_cache.get(&c) {
                let out_x = x * char_w;
                let out_y = y * char_h;
                
                for gy in 0..char_h {
                    for gx in 0..char_w {
                        let g_pixel = glyph.get_pixel(gx, gy);
                        if g_pixel[3] > 0 {
                            let alpha = g_pixel[3] as f32 / 255.0;
                            let color_r = (target_color[0] as f32 * alpha) as u8;
                            let color_g = (target_color[1] as f32 * alpha) as u8;
                            let color_b = (target_color[2] as f32 * alpha) as u8;
                            
                            canvas.put_pixel(out_x + gx, out_y + gy, Rgb([color_r, color_g, color_b]));
                        }
                    }
                }
            }
        }
    }
    
    let mut jpeg_data = Vec::new();
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg_data, 95);
    encoder.encode_image(&canvas)
        .map_err(|e| format!("JPEG encoding error: {}", e))?;
    
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    let camera = guard.camera.as_mut()
        .ok_or_else(|| "{\"key\":\"vcamNotStarted\",\"params\":[]}".to_string())?;
    
    camera.send_jpeg(&jpeg_data)?;
    
    Ok(())
}

#[tauri::command]
async fn is_virtual_camera_active(
    state: tauri::State<'_, Arc<Mutex<VirtualCameraState>>>,
) -> Result<bool, String> {
    let guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    Ok(guard.camera.is_some())
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
            send_frame_to_virtual_camera,
            render_and_send_ascii_frame,
            render_and_send_ascii_frame_b64,
            is_virtual_camera_active,
            start_native_camera,
            stop_native_camera,
            is_native_camera_available,
            set_native_camera_resolution,
            check_ffmpeg,
            install_ffmpeg,
        ])
        .setup(|app| {
            app.manage(TempFolderState {
                dir: std::sync::Mutex::new(tempfile::tempdir().ok()),
            });
            
            app.manage(Arc::new(Mutex::new(VirtualCameraState::new())));
            app.manage(Arc::new(Mutex::new(NativeCameraState::new())));

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
