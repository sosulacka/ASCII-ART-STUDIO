// Linux-бэкенд: прямая запись кадров в устройство v4l2loopback.
//
// Раньше кадры шли через spawn ffmpeg (JPEG через stdin -> декодирование ->
// v4l2) — лишний процесс и двойное кодирование. Теперь пишем RGB24 прямо
// в /dev/videoN через VIDIOC_S_FMT + write(): нулевые зависимости в рантайме,
// ffmpeg не нужен.
//
// v4l2loopback — модуль ядра (устанавливается пользователем из репозитория
// дистрибутива); мы с ним не линкуемся, только пишем в /dev-устройство.

#![cfg(target_os = "linux")]

use std::fs::{File, OpenOptions};
use std::io::Write;
use std::os::fd::AsRawFd;
use std::path::PathBuf;

const VIDIOC_S_FMT: libc::c_ulong = 0xc0d05605; // _IOWR('V', 5, struct v4l2_format)
const V4L2_BUF_TYPE_VIDEO_OUTPUT: u32 = 2;
const V4L2_PIX_FMT_RGB24: u32 = u32::from_le_bytes(*b"RGB3");
const V4L2_FIELD_NONE: u32 = 1;

#[repr(C)]
struct V4l2PixFormat {
    width: u32,
    height: u32,
    pixelformat: u32,
    field: u32,
    bytesperline: u32,
    sizeimage: u32,
    colorspace: u32,
    priv_: u32,
    flags: u32,
    enc: u32, // union ycbcr_enc/hsv_enc
    quantization: u32,
    xfer_func: u32,
}

#[repr(C)]
struct V4l2Format {
    type_: u32,
    // В ядре union fmt выровнен на 8 (внутри есть указатели — v4l2_window),
    // поэтому между type и union 4 байта паддинга: offsetof(fmt) == 8,
    // sizeof(v4l2_format) == 208. Без этого паддинга все поля смещаются на
    // 4 байта и VIDIOC_S_FMT читает мусор (width на месте height и т.д.).
    _pad: u32,
    // union fmt: pix занимает первые байты; добиваем до размера союза (200 байт)
    pix: V4l2PixFormat,
    reserved: [u8; 200 - std::mem::size_of::<V4l2PixFormat>()],
}

// Контроль ABI на этапе компиляции: размер обязан совпадать с ядром (208),
// иначе ioctl-номер (кодирует размер) и раскладка полей разъедутся молча.
const _: () = assert!(std::mem::size_of::<V4l2Format>() == 208);
const _: () = assert!(std::mem::offset_of!(V4l2Format, pix) == 8);

/// Ищет первое устройство v4l2loopback в /sys/devices/virtual/video4linux.
pub fn find_loopback_device() -> Option<PathBuf> {
    let entries = std::fs::read_dir("/sys/devices/virtual/video4linux").ok()?;
    for entry in entries.flatten() {
        let name = entry.file_name().into_string().ok()?;
        if name.starts_with("video") {
            return Some(PathBuf::from(format!("/dev/{name}")));
        }
    }
    None
}

pub struct V4l2LoopbackCamera {
    device: File,
    width: u32,
    height: u32,
    /// Кадр зафиксированного формата — сюда вписывается входной кадр
    /// любого размера (fit_rgb_frame) перед записью в устройство.
    frame_buf: Vec<u8>,
}

impl V4l2LoopbackCamera {
    /// width/height округляются вниз до кратных 4: потребители конвертируют
    /// RGB24 в I420 (4:2:0, Chromium/WebRTC) — нечётные размеры вешают
    /// захват на стороне Discord/браузера.
    pub fn new(width: u32, height: u32) -> Result<Self, String> {
        let width = width & !3;
        let height = height & !3;
        if width == 0 || height == 0 {
            return Err("Invalid vcam frame size".into());
        }

        let path = find_loopback_device()
            .ok_or_else(|| "{\"key\":\"vcamNoLoopback\",\"params\":[]}".to_string())?;

        let device = OpenOptions::new()
            .write(true)
            .open(&path)
            .map_err(|e| format!("Failed to open {}: {e}", path.display()))?;

        let mut fmt: V4l2Format = unsafe { std::mem::zeroed() };
        fmt.type_ = V4L2_BUF_TYPE_VIDEO_OUTPUT;
        fmt.pix.width = width;
        fmt.pix.height = height;
        fmt.pix.pixelformat = V4L2_PIX_FMT_RGB24;
        fmt.pix.field = V4L2_FIELD_NONE;
        fmt.pix.bytesperline = width * 3;
        fmt.pix.sizeimage = width * height * 3;

        let ret = unsafe { libc::ioctl(device.as_raw_fd(), VIDIOC_S_FMT, &mut fmt) };
        if ret < 0 {
            return Err(format!(
                "VIDIOC_S_FMT failed on {}: {}",
                path.display(),
                std::io::Error::last_os_error()
            ));
        }

        Ok(Self {
            device,
            width,
            height,
            frame_buf: vec![0u8; (width * height * 3) as usize],
        })
    }

    pub fn dimensions(&self) -> (u32, u32) {
        (self.width, self.height)
    }

    /// Кадр любого размера вписывается в зафиксированный формат камеры
    /// (центр + чёрные поля/кроп). Раньше `w != width` возвращал Err,
    /// который молча глотался — камера «зависала» на последнем кадре при
    /// смене ширины ASCII на лету.
    pub fn send_rgb(&mut self, rgb: &[u8], w: u32, h: u32) -> Result<(), String> {
        crate::vcam::fit_rgb_frame(rgb, w, h, &mut self.frame_buf, self.width, self.height, false);
        self.device
            .write_all(&self.frame_buf)
            .map_err(|e| format!("v4l2 write failed: {e}"))
    }
}
