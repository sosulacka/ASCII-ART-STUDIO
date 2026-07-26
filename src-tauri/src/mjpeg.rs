// Единый MJPEG-фоллбек виртуальной камеры (HTTP multipart/x-mixed-replace).
// Раньше были две почти идентичные копии — virtual_camera_linux и
// virtual_camera_windows; отличие только в Linux-специфичной трубе в ffmpeg
// -> v4l2loopback, поэтому она под #[cfg(target_os = "linux")].

use axum::{
    body::Body,
    extract::State,
    http::{header, StatusCode},
    response::Response,
    Router,
};
use image::RgbImage;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};

type SharedFrame = Arc<Mutex<Option<Vec<u8>>>>;
type ServerState = (SharedFrame, Arc<AtomicBool>, Arc<AtomicU32>);

pub struct VirtualCamera {
    frame_buffer: SharedFrame,
    server_running: Arc<AtomicBool>,
    target_fps: Arc<AtomicU32>,
    /// Linux: труба в ffmpeg -> v4l2loopback (на Windows всегда None).
    #[cfg(target_os = "linux")]
    ffmpeg_process: Arc<Mutex<Option<std::process::Child>>>,
}

impl VirtualCamera {
    pub fn new(_width: u32, _height: u32, http_port: u16) -> Result<Self, String> {
        let frame_buffer: SharedFrame = Arc::new(Mutex::new(None));
        let server_running = Arc::new(AtomicBool::new(false));
        let target_fps = Arc::new(AtomicU32::new(60));

        #[cfg(target_os = "linux")]
        let ffmpeg_process = Self::spawn_ffmpeg_pipe();

        let fb = frame_buffer.clone();
        let sr = server_running.clone();
        let fps = target_fps.clone();

        tauri::async_runtime::spawn(async move {
            start_mjpeg_server(http_port, fb, sr, fps).await;
        });

        server_running.store(true, Ordering::Relaxed);

        Ok(Self {
            frame_buffer,
            server_running,
            target_fps,
            #[cfg(target_os = "linux")]
            ffmpeg_process,
        })
    }

    #[cfg(target_os = "linux")]
    fn spawn_ffmpeg_pipe() -> Arc<Mutex<Option<std::process::Child>>> {
        use std::process::{Command, Stdio};

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

        let process = Arc::new(Mutex::new(None));
        if let Some(dev) = &vcam_device {
            eprintln!("Found v4l2loopback device: {}, starting ffmpeg...", dev);
            match Command::new("ffmpeg")
                .args(["-y", "-f", "image2pipe", "-vcodec", "mjpeg", "-i", "-",
                       "-f", "v4l2", "-pix_fmt", "yuyv422", dev])
                .stdin(Stdio::piped())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
            {
                Ok(child) => {
                    *process.lock().unwrap() = Some(child);
                    eprintln!("Real virtual camera (v4l2loopback) started via ffmpeg pipe!");
                }
                Err(e) => eprintln!("Error starting ffmpeg: {}", e),
            }
        } else {
            eprintln!("v4l2loopback device not found, HTTP MJPEG server only");
        }
        process
    }

    pub fn send_frame(&mut self, frame: &RgbImage) -> Result<(), String> {
        let mut jpeg_data = Vec::new();
        let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg_data, 82);
        encoder
            .encode_image(frame)
            .map_err(|e| format!("JPEG encoding error: {}", e))?;
        self.send_jpeg(&jpeg_data)
    }

    pub fn send_jpeg(&mut self, jpeg_data: &[u8]) -> Result<(), String> {
        {
            let mut buffer = self
                .frame_buffer
                .lock()
                .map_err(|e| format!("Lock error: {}", e))?;
            *buffer = Some(jpeg_data.to_vec());
        }

        #[cfg(target_os = "linux")]
        {
            use std::io::Write;
            if let Ok(mut lock) = self.ffmpeg_process.lock() {
                if let Some(child) = lock.as_mut() {
                    if let Some(stdin) = child.stdin.as_mut() {
                        let _ = stdin.write_all(jpeg_data);
                        let _ = stdin.flush();
                    }
                }
            }
        }

        Ok(())
    }

    pub fn set_fps(&mut self, fps: u32) {
        self.target_fps.store(fps.clamp(1, 120), Ordering::Relaxed);
    }
}

impl Drop for VirtualCamera {
    fn drop(&mut self) {
        self.server_running.store(false, Ordering::Relaxed);
        if let Ok(mut buffer) = self.frame_buffer.lock() {
            *buffer = None;
        }
        #[cfg(target_os = "linux")]
        {
            if let Ok(mut lock) = self.ffmpeg_process.lock() {
                if let Some(mut child) = lock.take() {
                    let _ = child.kill();
                    let _ = child.wait();
                }
            }
        }
    }
}

async fn start_mjpeg_server(
    port: u16,
    frame_buffer: SharedFrame,
    running: Arc<AtomicBool>,
    target_fps: Arc<AtomicU32>,
) {
    let app = Router::new()
        .route("/stream", axum::routing::get(mjpeg_stream))
        .route("/", axum::routing::get(index_page))
        .with_state((frame_buffer, running, target_fps));

    // Слушаем только петлевой интерфейс: поток предназначен локальным
    // приложениям (OBS Browser Source, VLC), а на 0.0.0.0 картинка с
    // камеры была бы доступна всей локальной сети.
    match tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port)).await {
        Ok(listener) => {
            eprintln!("✓ Virtual camera HTTP server started on port {}", port);
            let _ = axum::serve(listener, app).await;
        }
        Err(e) => eprintln!("✗ Failed to start virtual camera server: {}", e),
    }
}

async fn index_page() -> axum::response::Html<String> {
    axum::response::Html(
        r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>ASCII Art Virtual Camera</title>
<style>
body { font-family:'Consolas','Courier New',monospace; background:#000; color:#0f0; padding:20px; margin:0; }
.container { max-width:800px; margin:0 auto; }
h1 { color:#0f0; text-shadow:0 0 10px #0f0; }
a { color:#0ff; text-decoration:none; } a:hover { text-decoration:underline; }
.status { background:#111; border:1px solid #0f0; padding:10px; margin:20px 0; }
img { max-width:100%; border:2px solid #0f0; }
</style></head>
<body><div class="container">
<h1>ASCII ART STUDIO - Virtual Camera</h1>
<div class="status">
<p><strong>Status:</strong> Server Running</p>
<p><strong>MJPEG Stream:</strong> <a href="/stream">/stream</a></p>
</div>
<h2>How to use:</h2>
<ul>
<li><strong>OBS Studio:</strong> Browser Source with the /stream URL</li>
<li><strong>VLC:</strong> Open Network Stream with the /stream URL</li>
<li><strong>Browser:</strong> open <a href="/stream">/stream</a> directly</li>
</ul>
<h2>Live Preview:</h2>
<img src="/stream" alt="ASCII Art Stream" />
</div></body></html>"#
            .to_string(),
    )
}

async fn mjpeg_stream(State((frame_buffer, running, target_fps)): State<ServerState>) -> Response {
    use tokio::time::Duration;

    let boundary = "ASCIIARTFRAME";

    let stream = async_stream::stream! {
        let mut last_frame_time = tokio::time::Instant::now();

        while running.load(Ordering::Relaxed) {
            let fps = target_fps.load(Ordering::Relaxed).clamp(1, 120);
            let frame_duration = Duration::from_secs_f32(1.0 / fps as f32);

            let elapsed = tokio::time::Instant::now().duration_since(last_frame_time);
            if elapsed < frame_duration {
                tokio::time::sleep(frame_duration - elapsed).await;
            }
            last_frame_time = tokio::time::Instant::now();

            let jpeg = { frame_buffer.lock().unwrap().clone() };

            if let Some(jpeg_data) = jpeg {
                let frame_header = format!(
                    "--{}\r\nContent-Type: image/jpeg\r\nContent-Length: {}\r\n\r\n",
                    boundary, jpeg_data.len()
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
