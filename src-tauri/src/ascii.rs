// Ядро ASCII-конверсии: палитры, обработка пикселей, дизеринг,
// преобразование изображения в текст. Никаких tauri-команд — чистые функции.

use image::{DynamicImage, GenericImageView, RgbImage};
use serde::{Deserialize, Serialize};

pub const PALETTES: [&str; 6] = [
    " .:-=+*#%@",
    " `.-':_,^=;><+!rc*/z?sLTv)J7(|Fi{C}fI31tlu[neoZ5Yxjya]2ESwqkP6h9d4VpOGbUAKXHm8RD#$Bg0MNWQ%&@",
    " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczxyujcqL0ozmwqpdbkhao*#MW&8%B@$",
    " ░▒▓█",
    " 01",
    " ⠁⠃⠇⠏⠟⠿⡿⣿",
];

pub static FONT_DATA: &[u8] = include_bytes!("../assets/DejaVuSansMono.ttf");

/// Размер знакоместа при растеризации (px) — един для экспорта и вебкамеры.
pub const CHAR_W: u32 = 6;
pub const CHAR_H: u32 = 11;

#[derive(Serialize, Deserialize, Clone)]
pub struct ProcessParams {
    pub file_path: String,
    pub width: u32,
    pub palette_index: usize,
    pub custom_palette: Option<String>,
    pub brightness: i32,
    pub contrast: i32,
    pub gamma: f32,
    pub font_ratio: f32,
    pub use_color: bool,
    pub invert: bool,
    /// Floyd-Steinberg дизеринг яркости (плавные градиенты на малых палитрах)
    #[serde(default)]
    pub dithering: bool,
}

#[derive(Serialize, Deserialize)]
pub struct VideoFrames {
    pub frames: Vec<String>,
    pub fps: f64,
    pub total_frames: usize,
}

fn clamp_u8(val: f32) -> u8 {
    val.clamp(0.0, 255.0) as u8
}

fn apply_gamma(color: u8, gamma: f32) -> u8 {
    let n = color as f32 / 255.0;
    (n.powf(gamma) * 255.0).clamp(0.0, 255.0) as u8
}

pub fn process_pixel(
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

pub fn get_palette(params: &ProcessParams) -> Vec<char> {
    match &params.custom_palette {
        Some(c) if !c.trim().is_empty() => c.chars().collect(),
        _ => PALETTES[params.palette_index.min(PALETTES.len() - 1)]
            .chars()
            .collect(),
    }
}

pub fn resize_image(img: &DynamicImage, target_width: u32, font_ratio: f32) -> RgbImage {
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

/// Пара буферов ошибки Floyd-Steinberg (с паддингом width+2).
/// Свапается между строками, `next` обнуляется.
pub struct DitherBuffers {
    pub curr: Vec<f32>,
    pub next: Vec<f32>,
}

impl DitherBuffers {
    pub fn new(width: usize) -> Self {
        Self {
            curr: vec![0.0; width + 2],
            next: vec![0.0; width + 2],
        }
    }

    /// Вызывать в начале каждой строки (только при включённом дизеринге).
    pub fn next_row(&mut self) {
        std::mem::swap(&mut self.curr, &mut self.next);
        self.next.iter_mut().for_each(|e| *e = 0.0);
    }
}

/// gray (0-255) -> индекс символа палитры; при дизеринге ошибка квантования
/// растекается на соседей (7/16 вправо, 3/16 влево-вниз, 5/16 вниз, 1/16 вправо-вниз).
pub fn brightness_to_index(
    gray: i32,
    x: u32,
    palette_len: i32,
    dithering: bool,
    buf: &mut DitherBuffers,
) -> usize {
    if dithering {
        let xi = x as usize + 1; // +1 — паддинг, чтобы не проверять края
        let adjusted = (gray as f32 + buf.curr[xi]).clamp(0.0, 255.0);
        let idx = ((adjusted as i32 * (palette_len - 1)) / 255).clamp(0, palette_len - 1);
        let quantized = (idx * 255) / (palette_len - 1);
        let err = adjusted - quantized as f32;
        buf.curr[xi + 1] += err * (7.0 / 16.0);
        buf.next[xi - 1] += err * (3.0 / 16.0);
        buf.next[xi] += err * (5.0 / 16.0);
        buf.next[xi + 1] += err * (1.0 / 16.0);
        idx as usize
    } else {
        ((gray * (palette_len - 1)) / 255).clamp(0, palette_len - 1) as usize
    }
}

pub fn rgb_to_ascii_string(
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
    let mut dither = DitherBuffers::new(rgb_img.width() as usize);

    for y in 0..rgb_img.height() {
        if params.dithering {
            dither.next_row();
        }

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
                brightness_to_index(gray, x, palette_len, params.dithering, &mut dither);
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

#[cfg(test)]
mod tests {
    use super::*;

    fn params(width: u32) -> ProcessParams {
        ProcessParams {
            file_path: String::new(),
            width,
            palette_index: 0,
            custom_palette: None,
            brightness: 0,
            contrast: 0,
            gamma: 1.0,
            font_ratio: 2.0,
            use_color: false,
            invert: false,
            dithering: false,
        }
    }

    // ── process_pixel ──

    /// Нейтральные параметры (0/0/1.0) не должны менять цвет.
    #[test]
    fn process_pixel_identity() {
        for v in [0u8, 1, 127, 128, 254, 255] {
            assert_eq!(process_pixel(v, v, v, 0, 0, 1.0), (v, v, v));
        }
    }

    #[test]
    fn process_pixel_brightness_shifts_and_clamps() {
        let (r, ..) = process_pixel(100, 100, 100, 50, 0, 1.0);
        assert_eq!(r, 150);
        // Переполнение сверху и снизу зажимается, не заворачивается.
        assert_eq!(process_pixel(250, 250, 250, 50, 0, 1.0), (255, 255, 255));
        assert_eq!(process_pixel(5, 5, 5, -50, 0, 1.0), (0, 0, 0));
    }

    /// Контраст растягивает диапазон вокруг середины 128.
    #[test]
    fn process_pixel_contrast_expands_around_midpoint() {
        let (dark, ..) = process_pixel(100, 100, 100, 0, 128, 1.0);
        let (bright, ..) = process_pixel(156, 156, 156, 0, 128, 1.0);
        assert!(dark < 100, "тёмное должно стать темнее: {dark}");
        assert!(bright > 156, "светлое должно стать светлее: {bright}");
        // Середина неподвижна.
        assert_eq!(process_pixel(128, 128, 128, 0, 128, 1.0).0, 128);
    }

    /// Гамма > 1 затемняет середину, крайние точки неподвижны.
    #[test]
    fn process_pixel_gamma() {
        assert_eq!(process_pixel(0, 0, 0, 0, 0, 2.2), (0, 0, 0));
        assert_eq!(process_pixel(255, 255, 255, 0, 0, 2.2), (255, 255, 255));
        let (mid, ..) = process_pixel(128, 128, 128, 0, 0, 2.2);
        assert!(mid < 128, "гамма 2.2 затемняет середину: {mid}");
    }

    // ── get_palette ──

    #[test]
    fn get_palette_selects_by_index_and_clamps() {
        let p = params(80);
        assert_eq!(get_palette(&p), PALETTES[0].chars().collect::<Vec<_>>());
        let mut p = params(80);
        p.palette_index = 999; // за пределами — зажимается на последнюю
        assert_eq!(get_palette(&p), PALETTES[PALETTES.len() - 1].chars().collect::<Vec<_>>());
    }

    #[test]
    fn get_palette_custom_overrides_but_blank_falls_back() {
        let mut p = params(80);
        p.custom_palette = Some(" .#".into());
        assert_eq!(get_palette(&p), vec![' ', '.', '#']);
        // Пустая/пробельная кастомная палитра игнорируется.
        p.custom_palette = Some("   ".into());
        assert_eq!(get_palette(&p), PALETTES[0].chars().collect::<Vec<_>>());
    }

    // ── brightness_to_index ──

    #[test]
    fn brightness_to_index_maps_extremes() {
        let mut buf = DitherBuffers::new(4);
        assert_eq!(brightness_to_index(0, 0, 10, false, &mut buf), 0);
        assert_eq!(brightness_to_index(255, 0, 10, false, &mut buf), 9);
        // Отрицательный gray (не бывает на практике, но контракт — clamp).
        assert_eq!(brightness_to_index(-10, 0, 10, false, &mut buf), 0);
    }

    /// Дизеринг распределяет ошибку квантования по Флойду–Стейнбергу:
    /// 7/16 вправо, 3/16 влево-вниз, 5/16 вниз, 1/16 вправо-вниз.
    #[test]
    fn brightness_to_index_dithering_diffuses_error() {
        let mut buf = DitherBuffers::new(4);
        // gray=100, палитра из 2: idx = 100*1/255 = 0, quantized = 0, err = 100.
        let idx = brightness_to_index(100, 1, 2, true, &mut buf);
        assert_eq!(idx, 0);
        let xi = 2; // x=1 + паддинг
        assert!((buf.curr[xi + 1] - 100.0 * 7.0 / 16.0).abs() < 0.01);
        assert!((buf.next[xi - 1] - 100.0 * 3.0 / 16.0).abs() < 0.01);
        assert!((buf.next[xi] - 100.0 * 5.0 / 16.0).abs() < 0.01);
        assert!((buf.next[xi + 1] - 100.0 * 1.0 / 16.0).abs() < 0.01);
    }

    #[test]
    fn dither_buffers_next_row_swaps_and_clears() {
        let mut buf = DitherBuffers::new(2);
        buf.next[1] = 42.0;
        buf.next_row();
        assert_eq!(buf.curr[1], 42.0, "next должен стать curr");
        assert!(buf.next.iter().all(|&e| e == 0.0), "новый next обнулён");
    }

    // ── resize_image ──

    #[test]
    fn resize_image_respects_font_ratio() {
        let img = DynamicImage::new_rgb8(100, 100);
        // font_ratio=2.0: высота = 100*50/(100*2) = 25.
        let out = resize_image(&img, 50, 2.0);
        assert_eq!((out.width(), out.height()), (50, 25));
        // Вырожденный случай: высота не может быть 0.
        let tiny = DynamicImage::new_rgb8(1000, 1);
        let out = resize_image(&tiny, 10, 2.0);
        assert_eq!(out.height(), 1);
    }

    // ── rgb_to_ascii_string ──

    /// Чёрное → первый символ палитры, белое → последний; размер сетки точный.
    #[test]
    fn rgb_to_ascii_mono_maps_brightness() {
        let mut img = RgbImage::new(2, 1);
        img.put_pixel(0, 0, image::Rgb([0, 0, 0]));
        img.put_pixel(1, 0, image::Rgb([255, 255, 255]));
        let p = params(2);
        let chars = get_palette(&p);
        let out = rgb_to_ascii_string(&img, &p, &chars);
        assert_eq!(out, format!("{}{}\n", chars[0], chars[chars.len() - 1]));
    }

    #[test]
    fn rgb_to_ascii_invert_swaps_extremes() {
        let mut img = RgbImage::new(2, 1);
        img.put_pixel(0, 0, image::Rgb([0, 0, 0]));
        img.put_pixel(1, 0, image::Rgb([255, 255, 255]));
        let mut p = params(2);
        p.invert = true;
        let chars = get_palette(&p);
        let out = rgb_to_ascii_string(&img, &p, &chars);
        assert_eq!(out, format!("{}{}\n", chars[chars.len() - 1], chars[0]));
    }

    /// Цветной режим: HTML-обёртка, span с цветом пикселя, экранирование.
    #[test]
    fn rgb_to_ascii_color_produces_html() {
        let mut img = RgbImage::new(1, 1);
        img.put_pixel(0, 0, image::Rgb([255, 0, 0]));
        let mut p = params(1);
        p.use_color = true;
        let chars = get_palette(&p);
        let out = rgb_to_ascii_string(&img, &p, &chars);
        assert!(out.starts_with("<pre"), "{out}");
        assert!(out.ends_with("</pre>"), "{out}");
        assert!(out.contains("<span style='color:#FF0000'>"), "{out}");
        assert!(out.contains("<br>"), "{out}");
    }

    /// Соседние пиксели одного цвета не плодят лишние span'ы.
    #[test]
    fn rgb_to_ascii_color_merges_same_color_spans() {
        let mut img = RgbImage::new(3, 1);
        for x in 0..3 {
            img.put_pixel(x, 0, image::Rgb([200, 200, 200]));
        }
        let mut p = params(3);
        p.use_color = true;
        let chars = get_palette(&p);
        let out = rgb_to_ascii_string(&img, &p, &chars);
        assert_eq!(out.matches("<span").count(), 1, "{out}");
    }

    /// Спецсимволы палитры экранируются в HTML-режиме.
    #[test]
    fn rgb_to_ascii_color_escapes_html_chars() {
        let mut img = RgbImage::new(1, 1);
        img.put_pixel(0, 0, image::Rgb([255, 255, 255]));
        let mut p = params(1);
        p.use_color = true;
        p.custom_palette = Some("<<".into()); // любой яркости — '<'
        let chars = get_palette(&p);
        let out = rgb_to_ascii_string(&img, &p, &chars);
        assert!(out.contains("&lt;"), "{out}");
        assert!(!out.contains("><<"), "сырой '<' не должен утечь: {out}");
    }

    /// Дизеринг на градиенте даёт БОЛЬШЕ разнообразия символов, чем без него
    /// (бинарная палитра на среднем сером без дизеринга — один символ).
    #[test]
    fn rgb_to_ascii_dithering_adds_variation_on_gray() {
        let mut img = RgbImage::new(16, 4);
        for y in 0..4 {
            for x in 0..16 {
                img.put_pixel(x, y, image::Rgb([100, 100, 100]));
            }
        }
        let mut p = params(16);
        p.palette_index = 4; // " 01" — бинарная
        let chars = get_palette(&p);

        let plain = rgb_to_ascii_string(&img, &p, &chars);
        let plain_unique: std::collections::HashSet<char> =
            plain.chars().filter(|c| *c != '\n').collect();
        assert_eq!(plain_unique.len(), 1, "без дизеринга один символ: {plain_unique:?}");

        p.dithering = true;
        let dithered = rgb_to_ascii_string(&img, &p, &chars);
        let dith_unique: std::collections::HashSet<char> =
            dithered.chars().filter(|c| *c != '\n').collect();
        assert!(dith_unique.len() > 1, "дизеринг должен чередовать символы");
    }
}
