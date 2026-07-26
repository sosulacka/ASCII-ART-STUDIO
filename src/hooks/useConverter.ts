// Конверсия: сборка параметров (buildParams) и запуск обработки
// изображения/видео в Rust (handleGenerate).
import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { localizeError } from '../errorParser';
import { t, type Lang } from '../i18n';
import { type AppConfig } from '../useConfig';
import { type ToastType } from '../Toast';

interface VideoFramesResult {
  frames: string[];
  fps: number;
  total_frames: number;
}

interface ConverterDeps {
  lang: Lang;
  s: ReturnType<typeof t>;
  config: AppConfig;
  filePath: string | null;
  isVideo: boolean;
  // Параметры конверсии
  width: number;
  paletteIndex: number;
  customPalette: string;
  brightness: number;
  contrast: number;
  gamma: number;
  fontRatio: number;
  useColor: boolean;
  invert: boolean;
  dithering: boolean;
  // Сеттеры результата
  setImageOutput: (v: string) => void;
  setVideoFrames: (v: string[]) => void;
  setVideoFps: (v: number) => void;
  setCurrentFrame: (v: number) => void;
  setHasResult: (v: boolean) => void;
  setIsProcessing: (v: boolean) => void;
  setStatusMsg: (v: string) => void;
  startPlayback: (frames: string[], fps: number) => void;
  stopPlayback: () => void;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

export function useConverter(d: ConverterDeps) {
  const buildParams = useCallback(() => ({
    file_path:      d.filePath!,
    width:          d.width,
    palette_index:  d.paletteIndex,
    custom_palette: d.customPalette || null,
    brightness:     d.brightness,
    contrast:       d.contrast,
    gamma:          d.gamma,
    font_ratio:     d.fontRatio,
    use_color:      d.useColor,
    invert:         d.invert,
    dithering:      d.dithering,
  }), [
    d.filePath, d.width, d.paletteIndex, d.customPalette, d.brightness,
    d.contrast, d.gamma, d.fontRatio, d.useColor, d.invert, d.dithering,
  ]);

  const handleGenerate = async () => {
    if (!d.filePath) return;
    d.setIsProcessing(true);
    d.stopPlayback();
    d.setHasResult(false);

    try {
      if (d.isVideo) {
        d.setStatusMsg(d.s.processing);
        const result = await invoke<VideoFramesResult>('process_video_frames', {
          params: buildParams(),
        });
        d.setVideoFrames(result.frames);
        d.setVideoFps(result.fps);
        d.setCurrentFrame(0);
        d.setHasResult(true);
        d.setStatusMsg(`${result.total_frames} ${d.s.framesAt} ${result.fps.toFixed(1)} FPS`);
        if (d.config.autoPlay) {
          setTimeout(() => d.startPlayback(result.frames, result.fps), 50);
        }
      } else {
        d.setStatusMsg(d.s.processing);
        const result = await invoke<string>('process_image', {
          params: buildParams(),
        });
        d.setImageOutput(result);
        d.setHasResult(true);
        d.setStatusMsg(d.s.done);
        d.showToast(d.s.done, 'success');
      }
    } catch (e) {
      const errorMsg = localizeError(String(e), d.lang);
      d.setStatusMsg(errorMsg);
      d.showToast(errorMsg, 'error');
    } finally {
      d.setIsProcessing(false);
    }
  };

  return { buildParams, handleGenerate };
}
