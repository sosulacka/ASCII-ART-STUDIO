// ffmpeg/ffprobe-обёртки: определение fps, извлечение кадров, чтение по порядку.

use std::fs;
use std::path::PathBuf;
use std::process::Command;

pub fn ffmpeg_available() -> bool {
    Command::new("ffmpeg")
        .arg("-version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn get_fps(input_path: &str) -> f64 {
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

pub fn extract_frames(input_path: &str, frames_dir: &PathBuf, max_frames: u32) -> Result<(), String> {
    let pat = frames_dir.join("%06d.png");
    let status = Command::new("ffmpeg")
        .args(["-i", input_path, "-vframes", &max_frames.to_string(), pat.to_str().unwrap()])
        .status()
        .map_err(|e| format!("{{\"key\":\"errFFmpeg\",\"params\":[\"{}\"]}} ", e))?;

    if !status.success() {
        return Err("{\"key\":\"errFFmpegExtract\",\"params\":[]}".to_string());
    }
    Ok(())
}

pub fn read_sorted_frames(dir: &PathBuf) -> Result<Vec<PathBuf>, String> {
    let mut files: Vec<PathBuf> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.extension().map(|x| x == "png").unwrap_or(false))
        .collect();
    files.sort();
    Ok(files)
}
