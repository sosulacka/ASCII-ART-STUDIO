// Мультибэкенд виртуальной камеры.
//
// Порядок выбора на Windows: softcam (DirectShow, настоящая камера)
// -> MJPEG HTTP-фоллбек. На Linux: v4l2loopback -> MJPEG.
// Бэкенд Media Foundation (Win11) появится отдельной DLL — см. vcam-source/.

#[cfg(target_os = "windows")]
pub mod softcam_win;

#[cfg(target_os = "linux")]
pub mod v4l2_linux;

/// Что за бэкенд сейчас активен — для индикации в UI.
#[derive(Clone, Copy, PartialEq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum VcamBackendKind {
    /// Настоящая DirectShow-камера через softcam (Windows)
    Softcam,
    /// MJPEG HTTP-сервер (фоллбек, требует Browser Source в OBS)
    MjpegServer,
    /// v4l2loopback (Linux)
    V4l2Loopback,
}

pub trait VcamBackend: Send {
    fn kind(&self) -> VcamBackendKind;
    /// Отправить готовый RGB24-кадр ASCII-арта.
    fn send_rgb(&mut self, rgb: &[u8], w: u32, h: u32) -> Result<(), String>;
    /// Сменить целевой FPS (не все бэкенды поддерживают).
    fn set_fps(&mut self, _fps: u32) {}
}

#[cfg(target_os = "windows")]
impl VcamBackend for softcam_win::SoftcamCamera {
    fn kind(&self) -> VcamBackendKind {
        VcamBackendKind::Softcam
    }
    fn send_rgb(&mut self, rgb: &[u8], w: u32, h: u32) -> Result<(), String> {
        self.send_rgb(rgb, w, h)
    }
}

#[cfg(target_os = "linux")]
impl VcamBackend for v4l2_linux::V4l2LoopbackCamera {
    fn kind(&self) -> VcamBackendKind {
        VcamBackendKind::V4l2Loopback
    }
    fn send_rgb(&mut self, rgb: &[u8], w: u32, h: u32) -> Result<(), String> {
        self.send_rgb(rgb, w, h)
    }
}

/// Вписывает RGB24-кадр `src` (sw×sh) в целевой буфер `dst` (dw×dh):
/// кадр МАСШТАБИРУЕТСЯ с сохранением пропорций до максимального размера,
/// влезающего в цель (aspect-fit), и центрируется; чёрные поля остаются
/// только там, где пропорции не совпали. Ничего не обрезается.
///
/// Формат виртуальной камеры ЗАФИКСИРОВАН на момент создания — потребители
/// (Discord/OBS/браузер) согласовали его и смену размера не переживают.
/// История: сначала несовпадение размеров давало Err (камера «зависала» на
/// последнем кадре), потом кадр кропился по центру (края жёстко резались
/// при увеличении ширины ASCII). Теперь — честный scale-fit.
///
/// `swap_rb` — попутная конверсия RGB→BGR (DirectShow/softcam ждёт BGR).
pub fn fit_rgb_frame(src: &[u8], sw: u32, sh: u32, dst: &mut [u8], dw: u32, dh: u32, swap_rb: bool) {
    if sw == 0 || sh == 0 || dw == 0 || dh == 0 {
        return;
    }
    let (sw_u, sh_u, dw_u, dh_u) = (sw as usize, sh as usize, dw as usize, dh as usize);
    if src.len() < sw_u * sh_u * 3 || dst.len() < dw_u * dh_u * 3 {
        return;
    }

    // Aspect-fit: масштаб по «узкой» стороне, размер не меньше 1px.
    let scale = f64::min(dw as f64 / sw as f64, dh as f64 / sh as f64);
    let fit_w = ((sw as f64 * scale).round() as u32).clamp(1, dw);
    let fit_h = ((sh as f64 * scale).round() as u32).clamp(1, dh);
    let (fit_w_u, fit_h_u) = (fit_w as usize, fit_h as usize);

    if fit_w_u < dw_u || fit_h_u < dh_u {
        dst.fill(0); // чёрные поля по несовпавшей стороне
    }
    let dx0 = (dw_u - fit_w_u) / 2;
    let dy0 = (dh_u - fit_h_u) / 2;

    // Стратегия по цене на кадр (это горячий путь — 30 fps):
    //   scale == 1  — прямое копирование строк, ноль лишней работы;
    //   апскейл     — nearest-neighbor по LUT прямо в dst: билинейный resize
    //                 здесь стоил миллионы выходных пикселей + аллокацию на
    //                 КАЖДЫЙ кадр и давал жёсткие лаги; nearest на увеличении
    //                 ASCII-глифов визуально не отличим (пиксель-дублирование);
    //   даунскейл   — Triangle (билинейный) из image: выход маленький, это
    //                 дёшево, а nearest на уменьшении ронял бы тонкие глифы.
    if fit_w == sw && fit_h == sh {
        for row in 0..fit_h_u {
            let s = row * sw_u * 3;
            let d = ((dy0 + row) * dw_u + dx0) * 3;
            copy_row(&src[s..s + fit_w_u * 3], &mut dst[d..d + fit_w_u * 3], swap_rb);
        }
    } else if fit_w >= sw {
        // Апскейл: LUT соответствия dst_x -> src_x, без аллокаций буферов.
        // Nearest дублирует строки — сконвертированную строку копируем
        // memcpy'ем вместо повторного прохода по LUT (в k раз меньше работы
        // при k-кратном увеличении; критично для FPS на выходе vcam).
        let x_lut: Vec<usize> = (0..fit_w_u).map(|x| (x * sw_u / fit_w_u).min(sw_u - 1)).collect();
        let mut prev_sy = usize::MAX;
        for row in 0..fit_h_u {
            let sy = (row * sh_u / fit_h_u).min(sh_u - 1);
            let d = ((dy0 + row) * dw_u + dx0) * 3;
            if sy == prev_sy && row > 0 {
                let prev_d = ((dy0 + row - 1) * dw_u + dx0) * 3;
                let (head, tail) = dst.split_at_mut(d);
                tail[..fit_w_u * 3].copy_from_slice(&head[prev_d..prev_d + fit_w_u * 3]);
                continue;
            }
            prev_sy = sy;
            let srow = &src[sy * sw_u * 3..(sy + 1) * sw_u * 3];
            let drow = &mut dst[d..d + fit_w_u * 3];
            // Ветка swap_rb вынесена из пиксельного цикла.
            if swap_rb {
                for (x, &sx) in x_lut.iter().enumerate() {
                    let s = sx * 3;
                    drow[x * 3] = srow[s + 2];
                    drow[x * 3 + 1] = srow[s + 1];
                    drow[x * 3 + 2] = srow[s];
                }
            } else {
                for (x, &sx) in x_lut.iter().enumerate() {
                    let s = sx * 3;
                    drow[x * 3..x * 3 + 3].copy_from_slice(&srow[s..s + 3]);
                }
            }
        }
    } else {
        let view: image::ImageBuffer<image::Rgb<u8>, &[u8]> =
            match image::ImageBuffer::from_raw(sw, sh, &src[..sw_u * sh_u * 3]) {
                Some(v) => v,
                None => return,
            };
        let scaled =
            image::imageops::resize(&view, fit_w, fit_h, image::imageops::FilterType::Triangle);
        let scaled = scaled.as_raw();
        for row in 0..fit_h_u {
            let s = row * fit_w_u * 3;
            let d = ((dy0 + row) * dw_u + dx0) * 3;
            copy_row(&scaled[s..s + fit_w_u * 3], &mut dst[d..d + fit_w_u * 3], swap_rb);
        }
    }
}

/// Копирует строку RGB24, при необходимости меняя R и B местами.
fn copy_row(src: &[u8], dst: &mut [u8], swap_rb: bool) {
    if swap_rb {
        for (d, s) in dst.chunks_exact_mut(3).zip(src.chunks_exact(3)) {
            d[0] = s[2];
            d[1] = s[1];
            d[2] = s[0];
        }
    } else {
        dst.copy_from_slice(src);
    }
}

#[cfg(test)]
mod tests {
    use super::fit_rgb_frame;

    /// Меньший кадр той же пропорции РАСТЯГИВАЕТСЯ на всю цель (не поля).
    #[test]
    fn fit_upscales_smaller_frame_to_full_target() {
        let src = [255u8, 0, 0]; // 1x1 красный
        let mut dst = vec![7u8; 4 * 4 * 3];
        fit_rgb_frame(&src, 1, 1, &mut dst, 4, 4, false);
        // Пропорции 1:1 == 1:1 → весь кадр красный, никаких полей.
        for px in dst.chunks(3) {
            assert_eq!(px, &[255, 0, 0]);
        }
    }

    /// Больший кадр той же пропорции УЖИМАЕТСЯ целиком (не кропится):
    /// угловые пиксели исходника остаются видимыми в углах цели.
    #[test]
    fn fit_downscales_larger_frame_without_cropping() {
        // 4x4: левая половина белая, правая чёрная.
        let mut src = vec![0u8; 4 * 4 * 3];
        for y in 0..4usize {
            for x in 0..2usize {
                let i = (y * 4 + x) * 3;
                src[i] = 255; src[i + 1] = 255; src[i + 2] = 255;
            }
        }
        let mut dst = vec![0u8; 2 * 2 * 3];
        fit_rgb_frame(&src, 4, 4, &mut dst, 2, 2, false);
        // Левый столбец остался светлым, правый тёмным — границы не отрезаны.
        assert!(dst[0] > 128, "левый-верх должен быть светлым: {}", dst[0]);
        assert!(dst[3] < 128, "правый-верх должен быть тёмным: {}", dst[3]);
        assert!(dst[6] > 128, "левый-низ должен быть светлым: {}", dst[6]);
        assert!(dst[9] < 128, "правый-низ должен быть тёмным: {}", dst[9]);
    }

    /// Несовпадение пропорций: широкий кадр 4x2 в квадрат 4x4 —
    /// letterbox: сверху и снизу чёрные полосы, середина заполнена.
    #[test]
    fn fit_letterboxes_on_aspect_mismatch() {
        let src = vec![255u8; 4 * 2 * 3]; // белый 4x2
        let mut dst = vec![7u8; 4 * 4 * 3];
        fit_rgb_frame(&src, 4, 2, &mut dst, 4, 4, false);
        let row = |y: usize| &dst[y * 4 * 3..(y + 1) * 4 * 3];
        assert!(row(0).iter().all(|&b| b == 0), "верхняя полоса чёрная");
        assert!(row(1).iter().all(|&b| b == 255), "середина белая");
        assert!(row(2).iter().all(|&b| b == 255), "середина белая");
        assert!(row(3).iter().all(|&b| b == 0), "нижняя полоса чёрная");
    }

    /// swap_rb меняет местами R и B (для DirectShow BGR).
    #[test]
    fn fit_swaps_red_and_blue() {
        let src = [10u8, 20, 30];
        let mut dst = vec![0u8; 3];
        fit_rgb_frame(&src, 1, 1, &mut dst, 1, 1, true);
        assert_eq!(dst, vec![30, 20, 10]);
    }

    /// Точное совпадение размеров — прямое копирование без resize.
    #[test]
    fn fit_copies_exact_match_verbatim() {
        let src: Vec<u8> = (0..2 * 2 * 3).map(|i| i as u8).collect();
        let mut dst = vec![0u8; 2 * 2 * 3];
        fit_rgb_frame(&src, 2, 2, &mut dst, 2, 2, false);
        assert_eq!(dst, src);
    }

    /// Битые входные размеры не паникуют и не пишут мусор.
    #[test]
    fn fit_ignores_invalid_input() {
        let src = [0u8; 3];
        let mut dst = vec![9u8; 12];
        fit_rgb_frame(&src, 10, 10, &mut dst, 2, 2, false); // src меньше заявленного
        assert!(dst.iter().all(|&b| b == 9), "буфер не должен трогаться");
    }
}
