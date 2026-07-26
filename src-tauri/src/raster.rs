// Растеризация ASCII-арта в картинку (PNG-экспорт, кадры видео).
// Один цикл отрисовки вместо двух копий в save_image_as_raster / save_video.

use ab_glyph::{FontRef, PxScale};
use image::{Rgb, RgbImage};
use imageproc::drawing::draw_text_mut;

use crate::ascii::{
    brightness_to_index, process_pixel, DitherBuffers, ProcessParams, CHAR_H, CHAR_W,
};

pub const FONT_PX: f32 = 10.0;

/// Считает пиксельные размеры выходного изображения по размерам исходника.
pub fn output_dimensions(src_w: u32, src_h: u32, params: &ProcessParams) -> (u32, u32, u32) {
    let ascii_w = params.width;
    let ascii_h = ((src_h as f32 * ascii_w as f32) / (src_w as f32 * params.font_ratio))
        .max(1.0) as u32;
    (ascii_w, ascii_w * CHAR_W, ascii_h * CHAR_H)
}

/// Отрисовывает уменьшенное изображение как ASCII-символы на чёрном холсте.
pub fn render_ascii_canvas(
    rgb_img: &RgbImage,
    params: &ProcessParams,
    palette_chars: &[char],
    font: &FontRef<'_>,
    out_w: u32,
    out_h: u32,
) -> RgbImage {
    let palette_len = palette_chars.len() as i32;
    let scale = PxScale::from(FONT_PX);
    let mut canvas = RgbImage::from_pixel(out_w, out_h, Rgb([0u8, 0, 0]));
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

            let idx = brightness_to_index(gray, x, palette_len, params.dithering, &mut dither);
            let c = palette_chars[idx];

            let color = if params.use_color {
                Rgb([r, g, b])
            } else {
                Rgb([220u8, 220, 220])
            };

            draw_text_mut(
                &mut canvas,
                color,
                (x * CHAR_W) as i32,
                (y * CHAR_H) as i32,
                scale,
                font,
                &c.to_string(),
            );
        }
    }

    canvas
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ascii::{get_palette, ProcessParams, FONT_DATA};

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

    #[test]
    fn output_dimensions_scale_by_char_cell() {
        // Исходник 100x100, ширина 50, ratio 2.0: ascii-сетка 50x25.
        let (ascii_w, out_w, out_h) = output_dimensions(100, 100, &params(50));
        assert_eq!(ascii_w, 50);
        assert_eq!(out_w, 50 * CHAR_W);
        assert_eq!(out_h, 25 * CHAR_H);
    }

    #[test]
    fn output_dimensions_never_zero_height() {
        // Сверхширокий исходник не должен давать нулевую высоту.
        let (_, _, out_h) = output_dimensions(10000, 1, &params(10));
        assert_eq!(out_h, CHAR_H);
    }

    /// Растеризация реально рисует символы: белый вход даёт непустой канвас
    /// (символ последней ступени палитры), чёрный — полностью чёрный канвас
    /// (первый символ палитры — пробел, рисовать нечего).
    #[test]
    fn render_ascii_canvas_draws_glyphs() {
        let font = ab_glyph::FontRef::try_from_slice(FONT_DATA).expect("шрифт из бинарника");
        let p = params(4);
        let chars = get_palette(&p);

        let white = RgbImage::from_pixel(4, 2, Rgb([255, 255, 255]));
        let canvas = render_ascii_canvas(&white, &p, &chars, &font, 4 * CHAR_W, 2 * CHAR_H);
        assert_eq!((canvas.width(), canvas.height()), (4 * CHAR_W, 2 * CHAR_H));
        let lit = canvas.pixels().filter(|px| px[0] > 0 || px[1] > 0 || px[2] > 0).count();
        assert!(lit > 0, "белый вход должен дать видимые глифы");

        let black = RgbImage::from_pixel(4, 2, Rgb([0, 0, 0]));
        let canvas = render_ascii_canvas(&black, &p, &chars, &font, 4 * CHAR_W, 2 * CHAR_H);
        let lit = canvas.pixels().filter(|px| px[0] > 0 || px[1] > 0 || px[2] > 0).count();
        assert_eq!(lit, 0, "чёрный вход (пробел палитры) — пустой канвас");
    }

    /// use_color=true красит глиф цветом пикселя, а не серым 220.
    #[test]
    fn render_ascii_canvas_colors_glyphs() {
        let font = ab_glyph::FontRef::try_from_slice(FONT_DATA).expect("шрифт из бинарника");
        let mut p = params(2);
        p.use_color = true;
        let chars = get_palette(&p);

        let red = RgbImage::from_pixel(2, 1, Rgb([255, 0, 0]));
        let canvas = render_ascii_canvas(&red, &p, &chars, &font, 2 * CHAR_W, CHAR_H);
        let has_red = canvas.pixels().any(|px| px[0] > 100 && px[1] < 50 && px[2] < 50);
        assert!(has_red, "цветной режим должен рисовать красным");
    }
}
