// Экспорт результата: текст (txt/md/png/gif), изображение (txt/html/png/gif),
// видео (gif/mp4). Управляет модалкой выбора формата.
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { localizeError } from '../errorParser';
import { t, type Lang } from '../i18n';
import { type ToastType } from '../Toast';
import { type AppConfig } from '../useConfig';

interface ExportDeps {
  lang: Lang;
  s: ReturnType<typeof t>;
  config: AppConfig;
  sidebarMode: 'ascii' | 'text' | 'webcam' | 'scripts';
  isVideo: boolean;
  hasResult: boolean;
  isProcessing: boolean;
  textOutput: string;
  imageOutput: string;
  bgColor: string;
  videoFrames: string[];
  videoFps: number;
  buildParams: () => any;
  setIsProcessing: (v: boolean) => void;
  setStatusMsg: (v: string) => void;
  setRenderProgress: (v: { done: number; total: number } | null) => void;
  startPlayback: (frames: string[], fps: number) => void;
  stopPlayback: () => void;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

export function useExport(d: ExportDeps) {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalType, setSaveModalType] = useState<'image' | 'video' | 'text'>('image');

  const handleSaveClick = () => {
    if (!d.hasResult || d.isProcessing) return;
    setSaveModalType(d.isVideo ? 'video' : 'image');
    setShowSaveModal(true);
  };

  const handleFormatChosen = async (fmt: string) => {
    setShowSaveModal(false);
    if (d.sidebarMode === 'text') await doSaveText(fmt);
    else if (d.isVideo) await doSaveVideo(fmt);
    else await doSaveImage(fmt);
  };

  const doSaveText = async (fmt: string) => {
    if (!d.textOutput) return;

    if (fmt === 'png' || fmt === 'gif') {
      const savePath = await save({
        filters: [{ name: `${fmt.toUpperCase()} Image`, extensions: [fmt] }],
        defaultPath: `ascii_text.${fmt}`,
      });
      if (!savePath || typeof savePath !== 'string') return;

      try {
        d.setIsProcessing(true);
        d.setStatusMsg(d.s.savingAs?.replace('{0}', fmt.toUpperCase()) || `Saving as ${fmt.toUpperCase()}...`);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const errorMsg = `${d.s.error}: ${d.s.canvasContextError}`;
          d.setStatusMsg(errorMsg);
          d.showToast(errorMsg, 'error');
          return;
        }

        const cleanText = d.textOutput.replace(/<[^>]*>/g, '');
        const lines = cleanText.split('\n');

        ctx.font = `10px ${d.config.fontFamily}, Consolas, monospace`;
        const charWidth = 6;
        const charHeight = 11;

        let maxWidth = 0;
        for (const line of lines) {
          maxWidth = Math.max(maxWidth, line.length);
        }

        canvas.width = maxWidth * charWidth;
        canvas.height = lines.length * charHeight;

        ctx.fillStyle = d.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = `10px ${d.config.fontFamily}, Consolas, monospace`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'top';

        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], 0, i * charHeight);
        }

        canvas.toBlob(async (blob) => {
          if (!blob) {
            const errorMsg = `${d.s.error}: ${d.s.blobCreateError}`;
            d.setStatusMsg(errorMsg);
            d.showToast(errorMsg, 'error');
            d.setIsProcessing(false);
            return;
          }

          const bytes = new Uint8Array(await blob.arrayBuffer());
          await invoke('save_binary_file', {
            bytes: Array.from(bytes),
            filePath: savePath,
          });
          const successMsg = `${d.s.saved}: ${savePath.split(/[\\/]/).pop() ?? ''}`;
          d.setStatusMsg(successMsg);
          d.showToast(successMsg, 'success');
          d.setIsProcessing(false);
        }, `image/${fmt}`);
      } catch (e) {
        const errorMsg = localizeError(String(e), d.lang);
        d.setStatusMsg(errorMsg);
        d.showToast(errorMsg, 'error');
        d.setIsProcessing(false);
      }
    } else {
      const isMd = fmt === 'md';
      const savePath = await save({
        filters: [isMd
          ? { name: d.s.fileMarkdown || 'Markdown File', extensions: ['md'] }
          : { name: d.s.fileText || 'Text File', extensions: ['txt'] }],
        defaultPath: isMd ? 'ascii_text.md' : 'ascii_text.txt',
      });
      if (!savePath || typeof savePath !== 'string') return;

      try {
        const cleanText = d.textOutput.replace(/<[^>]*>/g, '');
        const content = isMd ? `\`\`\`\n${cleanText}\n\`\`\`` : cleanText;
        await invoke('save_to_file', { content, filePath: savePath });
        const successMsg = `${d.s.saved}: ${savePath.split(/[\\/]/).pop() ?? ''}`;
        d.setStatusMsg(successMsg);
        d.showToast(successMsg, 'success');
      } catch (e) {
        const errorMsg = localizeError(String(e), d.lang);
        d.setStatusMsg(errorMsg);
        d.showToast(errorMsg, 'error');
      }
    }
  };

  const doSaveImage = async (fmt: string) => {
    if (fmt === 'png' || fmt === 'gif') {
      const savePath = await save({
        filters: [{ name: `${fmt.toUpperCase()} Image`, extensions: [fmt] }],
        defaultPath: `ascii_art.${fmt}`,
      });
      if (!savePath || typeof savePath !== 'string') return;

      try {
        d.setIsProcessing(true);
        d.setStatusMsg(d.s.savingAs?.replace('{0}', fmt.toUpperCase()) || `Saving as ${fmt.toUpperCase()}...`);
        const result = await invoke<string>('save_image_as_raster', {
          params: d.buildParams(),
          outputPath: savePath,
        });
        const localizedResult = localizeError(result, d.lang);
        d.setStatusMsg(localizedResult);
        d.showToast(localizedResult, 'success');
      } catch (e) {
        const errorMsg = localizeError(String(e), d.lang);
        d.setStatusMsg(errorMsg);
        d.showToast(errorMsg, 'error');
      } finally {
        d.setIsProcessing(false);
      }
    } else {
      const isHtml = fmt === 'html';
      const savePath = await save({
        filters: [isHtml
          ? { name: d.s.fileHtml || 'HTML File', extensions: ['html'] }
          : { name: d.s.fileText || 'Text File', extensions: ['txt'] }],
        defaultPath: isHtml ? 'ascii_art.html' : 'ascii_art.txt',
      });
      if (!savePath || typeof savePath !== 'string') return;

      try {
        const content = isHtml
          ? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>` +
            `body{background:${d.bgColor};font-family:${d.config.fontFamily},Consolas,monospace;` +
            `font-size:8px;line-height:1.0;white-space:pre;margin:0;padding:10px;}` +
            `</style></head><body>${d.imageOutput}</body></html>`
          : d.imageOutput;
        await invoke('save_to_file', { content, filePath: savePath });
        const successMsg = `${d.s.saved}: ${savePath.split(/[\\/]/).pop() ?? ''}`;
        d.setStatusMsg(successMsg);
        d.showToast(successMsg, 'success');
      } catch (e) {
        const errorMsg = localizeError(String(e), d.lang);
        d.setStatusMsg(errorMsg);
        d.showToast(errorMsg, 'error');
      }
    }
  };

  const doSaveVideo = async (fmt: string) => {
    const savePath = await save({
      filters: [fmt === 'gif'
        ? { name: d.s.fileAnimatedGif || 'Animated GIF', extensions: ['gif'] }
        : { name: d.s.fileMp4Video || 'MP4 Video', extensions: ['mp4'] }],
      defaultPath: fmt === 'gif' ? 'ascii_video.gif' : 'ascii_video.mp4',
    });
    if (!savePath || typeof savePath !== 'string') return;

    d.setIsProcessing(true);
    d.stopPlayback();
    d.setStatusMsg(fmt === 'gif' ? d.s.renderGif : d.s.renderMp4);
    d.setRenderProgress({ done: 0, total: 0 });

    try {
      const result = await invoke<string>('save_video', {
        params: d.buildParams(),
        outputPath: savePath,
        format: fmt,
      });
      const localizedResult = localizeError(result, d.lang);
      d.setStatusMsg(localizedResult);
      d.showToast(localizedResult, 'success');
    } catch (e) {
      const errorMsg = localizeError(String(e), d.lang);
      d.setStatusMsg(errorMsg);
      d.showToast(errorMsg, 'error');
    } finally {
      d.setIsProcessing(false);
      d.setRenderProgress(null);
      if (d.videoFrames.length > 0) d.startPlayback(d.videoFrames, d.videoFps);
    }
  };

  return {
    showSaveModal, setShowSaveModal,
    saveModalType, setSaveModalType,
    handleSaveClick, handleFormatChosen,
  };
}
