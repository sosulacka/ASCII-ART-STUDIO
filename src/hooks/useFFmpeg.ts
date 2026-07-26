// Проверка наличия FFmpeg при запуске и его установка.
// Показывает диалог, если ffmpeg не найден; умеет ставить авто/вручную.
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { t } from '../i18n';
import { type ToastType } from '../Toast';

export function useFFmpeg(
  loaded: boolean,
  splashDone: boolean,
  s: ReturnType<typeof t>,
  showToast: (message: string, type?: ToastType, duration?: number) => void,
) {
  const [showFFmpegDialog, setShowFFmpegDialog] = useState(false);
  const [ffmpegInstalling, setFfmpegInstalling] = useState(false);

  useEffect(() => {
    if (loaded && !splashDone) return;

    const checkFFmpeg = async () => {
      try {
        const hasFFmpeg = await invoke<boolean>('check_ffmpeg');
        if (!hasFFmpeg) setShowFFmpegDialog(true);
      } catch (err) {
        console.error('FFmpeg check error:', err);
      }
    };
    checkFFmpeg();
  }, [loaded, splashDone]);

  const handleFFmpegInstall = async () => {
    setFfmpegInstalling(true);
    try {
      const result = await invoke<string>('install_ffmpeg');
      showToast(result, 'success');
      setShowFFmpegDialog(false);
    } catch (err: any) {
      const errorMsg = s.ffmpegInstallError ? s.ffmpegInstallError.replace('{0}', String(err)) : String(err);
      showToast(errorMsg, 'error');
    } finally {
      setFfmpegInstalling(false);
    }
  };

  const handleFFmpegManual = () => {
    setShowFFmpegDialog(false);
    showToast(`${s.ffmpegDownloadFrom}: https://ffmpeg.org/download.html`, 'info', 8000);
    window.open('https://ffmpeg.org/download.html', '_blank');
  };

  return {
    showFFmpegDialog,
    setShowFFmpegDialog,
    ffmpegInstalling,
    handleFFmpegInstall,
    handleFFmpegManual,
  };
}
