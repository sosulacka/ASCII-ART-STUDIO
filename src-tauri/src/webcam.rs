// Оптимизированный пайплайн вебкамеры.
//
// Раньше: JS посимвольно строил ASCII + base64-кодировал кадр + IPC + Rust
// декодировал base64 + на КАЖДЫЙ кадр заново парсил шрифт и перерисовывал
// весь glyph-кэш. Теперь: один бинарный IPC-вызов с сырыми RGBA-байтами,
// вся конверсия в Rust через LUT-таблицы, шрифт и глифы кэшируются глобально.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use ab_glyph::{FontRef, PxScale};
use image::{Rgb, RgbImage};
use once_cell::sync::Lazy;
use serde::Deserialize;

pub const CHAR_W: u32 = 6;
pub const CHAR_H: u32 = 11;
const FONT_PX: f32 = 10.0;
const JPEG_QUALITY: u8 = 85;

static FONT: Lazy<FontRef<'static>> =
    Lazy::new(|| FontRef::try_from_slice(crate::FONT_DATA).expect("embedded font is valid"));

/// Alpha-маска глифа CHAR_W x CHAR_H — рисуется один раз на символ за всё
/// время жизни процесса.
struct GlyphMask {
    alpha: [u8; (CHAR_W * CHAR_H) as usize],
}

static GLYPH_CACHE: Lazy<Mutex<HashMap<char, &'static GlyphMask>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

fn glyph_mask(c: char) -> &'static GlyphMask {
    let mut cache = GLYPH_CACHE.lock().unwrap();
    if let Some(mask) = cache.get(&c) {
        return mask;
    }

    let mut glyph_img =
        image::RgbaImage::from_pixel(CHAR_W, CHAR_H, image::Rgba([0, 0, 0, 0]));
    imageproc::drawing::draw_text_mut(
        &mut glyph_img,
        image::Rgba([255, 255, 255, 255]),
        0,
        0,
        PxScale::from(FONT_PX),
        &*FONT,
        &c.to_string(),
    );

    let mut alpha = [0u8; (CHAR_W * CHAR_H) as usize];
    for (i, px) in glyph_img.pixels().enumerate() {
        alpha[i] = px[3];
    }

    // Глифов конечное число (символы палитр) — утечка контролируема,
    // зато раздача масок без копий и без времени жизни.
    let mask: &'static GlyphMask = Box::leak(Box::new(GlyphMask { alpha }));
    cache.insert(c, mask);
    mask
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebcamParams {
    pub palette: String,
    pub brightness: i32,
    pub contrast: i32,
    pub gamma: f32,
    pub invert: bool,
    pub use_color: bool,
}

impl Default for WebcamParams {
    fn default() -> Self {
        Self {
            palette: crate::PALETTES[0].to_string(),
            brightness: 0,
            contrast: 0,
            gamma: 1.0,
            invert: false,
            use_color: false,
        }
    }
}

/// Params + предрассчитанные таблицы. Пересчитывается только при изменении
/// настроек (движение слайдера), а не 30 раз в секунду.
pub struct CompiledParams {
    palette_chars: Vec<char>,
    /// brightness -> contrast -> gamma, свёрнутые в одну таблицу на канал.
    channel_lut: [u8; 256],
    /// gray (0-255) -> индекс символа палитры (с учётом invert).
    char_lut: [u8; 256],
    use_color: bool,
}

impl CompiledParams {
    fn compile(p: &WebcamParams) -> Result<Self, String> {
        let palette_chars: Vec<char> = p.palette.chars().collect();
        if palette_chars.len() < 2 {
            return Err("{\"key\":\"errPaletteMin\",\"params\":[]}".to_string());
        }

        let factor = (259.0 * (p.contrast as f32 + 255.0)) / (255.0 * (259.0 - p.contrast as f32));
        let inv_gamma_255 = 1.0 / 255.0;

        let mut channel_lut = [0u8; 256];
        for (i, slot) in channel_lut.iter_mut().enumerate() {
            let v = i as f32 + p.brightness as f32;
            let v = factor * (v - 128.0) + 128.0;
            let v = v.clamp(0.0, 255.0);
            let v = (v * inv_gamma_255).powf(p.gamma) * 255.0;
            *slot = v.clamp(0.0, 255.0) as u8;
        }

        let max_idx = palette_chars.len() as u32 - 1;
        let mut char_lut = [0u8; 256];
        for (i, slot) in char_lut.iter_mut().enumerate() {
            let gray = if p.invert { 255 - i as u32 } else { i as u32 };
            *slot = ((gray * max_idx) / 255) as u8;
        }

        Ok(Self {
            palette_chars,
            channel_lut,
            char_lut,
            use_color: p.use_color,
        })
    }
}

pub struct WebcamState {
    pub compiled: Mutex<CompiledParams>,
    /// Кадр для виртуальной камеры ещё рендерится — новые пропускаем,
    /// чтобы не копить очередь и не жечь CPU.
    pub vcam_busy: std::sync::Arc<AtomicBool>,
}

impl Default for WebcamState {
    fn default() -> Self {
        Self {
            compiled: Mutex::new(
                CompiledParams::compile(&WebcamParams::default()).expect("default palette valid"),
            ),
            vcam_busy: std::sync::Arc::new(AtomicBool::new(false)),
        }
    }
}

/// RGBA-кадр -> plain ASCII-текст (для отображения в <pre>).
fn rgba_to_ascii_text(rgba: &[u8], w: u32, h: u32, cp: &CompiledParams) -> String {
    let mut out = String::with_capacity(((w + 1) * h) as usize);
    let lut = &cp.channel_lut;
    let chars = &cp.palette_chars;

    for y in 0..h {
        let row = (y * w * 4) as usize;
        for x in 0..w {
            let i = row + (x * 4) as usize;
            let r = lut[rgba[i] as usize] as u32;
            let g = lut[rgba[i + 1] as usize] as u32;
            let b = lut[rgba[i + 2] as usize] as u32;
            let gray = (r * 299 + g * 587 + b * 114) / 1000;
            out.push(chars[cp.char_lut[gray as usize] as usize]);
        }
        out.push('\n');
    }
    out
}

/// RGBA-кадр -> отрисованное изображение ASCII-арта (для виртуальной камеры).
fn rgba_to_ascii_image(rgba: &[u8], w: u32, h: u32, cp: &CompiledParams) -> RgbImage {
    let out_w = w * CHAR_W;
    let out_h = h * CHAR_H;
    let mut canvas = RgbImage::from_pixel(out_w, out_h, Rgb([0u8, 0, 0]));
    let canvas_stride = (out_w * 3) as usize;
    let buf: &mut [u8] = &mut canvas; // прямой доступ к байтам — без put_pixel

    let lut = &cp.channel_lut;

    for y in 0..h {
        let row = (y * w * 4) as usize;
        for x in 0..w {
            let i = row + (x * 4) as usize;
            let r = lut[rgba[i] as usize] as u32;
            let g = lut[rgba[i + 1] as usize] as u32;
            let b = lut[rgba[i + 2] as usize] as u32;
            let gray = (r * 299 + g * 587 + b * 114) / 1000;
            let c = cp.palette_chars[cp.char_lut[gray as usize] as usize];

            let (tr, tg, tb) = if cp.use_color {
                (r, g, b)
            } else {
                (255, 255, 255) // полная яркость в моно-режиме (было 220 — тускло)
            };

            let mask = glyph_mask(c);
            let base_x = (x * CHAR_W * 3) as usize;
            let base_y = (y * CHAR_H) as usize;

            for gy in 0..CHAR_H as usize {
                let out_row = (base_y + gy) * canvas_stride + base_x;
                let mask_row = gy * CHAR_W as usize;
                for gx in 0..CHAR_W as usize {
                    let a = mask.alpha[mask_row + gx] as u32;
                    if a > 0 {
                        let o = out_row + gx * 3;
                        buf[o] = ((tr * a) / 255) as u8;
                        buf[o + 1] = ((tg * a) / 255) as u8;
                        buf[o + 2] = ((tb * a) / 255) as u8;
                    }
                }
            }
        }
    }

    canvas
}

pub fn encode_jpeg(img: &RgbImage) -> Result<Vec<u8>, String> {
    let mut jpeg = Vec::new();
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg, JPEG_QUALITY);
    encoder
        .encode_image(img)
        .map_err(|e| format!("JPEG encoding error: {e}"))?;
    Ok(jpeg)
}

#[tauri::command]
pub fn set_webcam_params(
    params: WebcamParams,
    state: tauri::State<'_, WebcamState>,
) -> Result<(), String> {
    let compiled = CompiledParams::compile(&params)?;
    *state.compiled.lock().map_err(|e| e.to_string())? = compiled;
    Ok(())
}

/// Один вызов на кадр: сырые RGBA-байты в body, размеры в заголовках.
/// Возвращает ASCII-текст как raw-байты (ArrayBuffer на стороне JS) —
/// без JSON-сериализации многокилобайтной строки.
#[tauri::command]
pub fn process_webcam_frame(
    request: tauri::ipc::Request<'_>,
    state: tauri::State<'_, WebcamState>,
    vcam: tauri::State<'_, std::sync::Arc<Mutex<crate::VirtualCameraState>>>,
) -> Result<tauri::ipc::Response, String> {
    let tauri::ipc::InvokeBody::Raw(rgba) = request.body() else {
        return Err("expected raw frame body".to_string());
    };

    let header_u32 = |name: &str| -> Result<u32, String> {
        request
            .headers()
            .get(name)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.parse().ok())
            .ok_or_else(|| format!("missing/invalid header {name}"))
    };
    let w = header_u32("x-frame-width")?;
    let h = header_u32("x-frame-height")?;

    if (w * h * 4) as usize != rgba.len() {
        return Err("frame size mismatch".to_string());
    }

    let guard = state.compiled.lock().map_err(|e| e.to_string())?;

    let ascii = rgba_to_ascii_text(rgba, w, h, &guard);

    // Виртуальная камера: рендерим в фоне, кадр пропускаем если предыдущий
    // ещё не готов — UI-поток никогда не ждёт. try_lock, не lock: воркер
    // может держать мьютекс на блокирующей записи в устройство (v4l2/softcam),
    // и ждать его здесь = фризить сам конвейер превью на каждом кадре.
    let vcam_running = vcam
        .try_lock()
        .map(|g| g.camera.is_some() || g.backend.is_some())
        .unwrap_or(false);

    if vcam_running
        && state
            .vcam_busy
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .is_ok()
    {
        let rgba_copy = rgba.clone();
        let cp = CompiledParams {
            palette_chars: guard.palette_chars.clone(),
            channel_lut: guard.channel_lut,
            char_lut: guard.char_lut,
            use_color: guard.use_color,
        };
        let vcam = std::sync::Arc::clone(&vcam);
        let busy = std::sync::Arc::clone(&state.vcam_busy);
        tauri::async_runtime::spawn_blocking(move || {
            // RAII-guard: сбрасывает vcam_busy в false ВСЕГДА — даже если код
            // ниже паникует (например при рассинхроне размеров кадра).
            // Раньше store(false) в конце не вызывался при панике -> флаг
            // застревал в true -> все кадры отбрасывались, пока не
            // перезапустишь vcam. Отсюда «зависание при смене настроек».
            struct BusyGuard(std::sync::Arc<AtomicBool>);
            impl Drop for BusyGuard {
                fn drop(&mut self) {
                    self.0.store(false, Ordering::Release);
                }
            }
            let _guard = BusyGuard(busy);

            let img = rgba_to_ascii_image(&rgba_copy, w, h, &cp);
            let (img_w, img_h) = (img.width(), img.height());

            // JPEG нужен только MJPEG-фоллбеку; кодируем ДО захвата мьютекса
            let needs_jpeg = vcam
                .lock()
                .map(|g| g.backend.is_none() && g.camera.is_some())
                .unwrap_or(false);
            let jpeg = if needs_jpeg { encode_jpeg(&img).ok() } else { None };

            if let Ok(mut guard) = vcam.lock() {
                if let Some(backend) = guard.backend.as_mut() {
                    // Настоящая камера (softcam): RGB напрямую, без JPEG
                    let _ = backend.send_rgb(img.as_raw(), img_w, img_h);
                } else if let (Some(cam), Some(jpeg)) = (guard.camera.as_mut(), jpeg) {
                    let _ = cam.send_jpeg(&jpeg);
                }
            }
        });
    }

    Ok(tauri::ipc::Response::new(ascii.into_bytes()))
}
