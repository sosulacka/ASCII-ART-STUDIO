// Вебкамера + виртуальная камера: захват (WebAPI/native), rAF-цикл рендера
// ASCII в Rust, запись видео, управление виртуальной камерой и softcam-драйвером.
//
// Самый связный кусок логики — камера, refs, цикл и vcam переплетены
// (webcamLoop шлёт кадры и в превью, и в vcam), поэтому живут в одном хуке.
import { useState, useRef, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  requestCameraAccess, stopMediaStream, requestNativeCameraAccess, type CameraCapture,
} from '../mediaDevices';
import { localizeError } from '../errorParser';
import { t, type Lang } from '../i18n';
import { type AppConfig } from '../useConfig';
import { type ToastType } from '../Toast';
import { WEBCAM_PALETTES } from '../constants/palettes';

// Целевой FPS обработки: камера отдаёт максимум 30, гнать цикл на
// 60-144 Гц монитора бессмысленно — только жжёт CPU.
const WEBCAM_TARGET_FPS = 30;
const WEBCAM_FRAME_MS = 1000 / WEBCAM_TARGET_FPS;

interface WebcamDeps {
  lang: Lang;
  s: ReturnType<typeof t>;
  config: AppConfig;
  sidebarMode: 'ascii' | 'text' | 'webcam' | 'scripts';
  // Параметры конверсии (влияют на цикл)
  width: number;
  fontRatio: number;
  paletteIndex: number;
  customPalette: string;
  brightness: number;
  contrast: number;
  gamma: number;
  invert: boolean;
  useColor: boolean;
  // Взаимодействие с остальным приложением
  setStatusMsg: (v: string) => void;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  setFilePath: (v: string | null) => void;
  setIsVideo: (v: boolean) => void;
  setHasResult: (v: boolean) => void;
  setImageOutput: (v: string) => void;
  setVideoFrames: (v: string[]) => void;
  setCurrentFrame: (v: number) => void;
  setSidebarMode: (v: 'ascii' | 'text' | 'webcam') => void;
}

export function useWebcam(d: WebcamDeps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [recordingActive, setRecordingActive] = useState(false);
  const [virtualCameraActive, setVirtualCameraActive] = useState(false);
  const [vcamBackend, setVcamBackend] = useState<'softcam' | 'mjpeg' | null>(null);
  const [softcamRegistered, setSoftcamRegistered] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const webcamOutputRef = useRef<HTMLPreElement>(null);
  const textDecoderRef = useRef(new TextDecoder());
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraRef = useRef<CameraCapture | null>(null);
  const frameRequestId = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const processingFrameRef = useRef(false);

  const paramsRef = useRef({
    width: d.width, fontRatio: d.fontRatio, paletteIndex: d.paletteIndex,
    customPalette: d.customPalette, brightness: d.brightness, contrast: d.contrast,
    gamma: d.gamma, invert: d.invert, useColor: d.useColor,
  });
  const virtualCameraActiveRef = useRef(false);
  const lastFrameTimeRef = useRef(performance.now());
  const fpsCounterRef = useRef(0);
  const currentFpsRef = useRef(60);
  const lastLoopTickRef = useRef(0);
  const frameInFlightRef = useRef(false);
  const cameraActiveRef = useRef(false);

  // Проверяем наличие нативного vcam-бэкенда при заходе в режим webcam:
  // Windows — зарегистрирована ли softcam DLL, Linux — загружен ли модуль
  // v4l2loopback. false => в UI появляется кнопка установки драйвера/модуля.
  useEffect(() => {
    if (d.sidebarMode !== 'webcam') return;
    invoke<{ softcam_registered: boolean; loopback_present?: boolean; platform: string }>('get_vcam_backend_info')
      .then(info => {
        if (info.platform === 'windows') {
          setSoftcamRegistered(info.softcam_registered);
        } else if (info.platform === 'linux') {
          setSoftcamRegistered(info.loopback_present ?? null);
        } else {
          setSoftcamRegistered(null);
        }
      })
      .catch(() => setSoftcamRegistered(null));
  }, [d.sidebarMode]);

  const handleRegisterSoftcam = async () => {
    try {
      const result = await invoke<string>('register_softcam');
      d.showToast(localizeError(result, d.lang), 'success');
      setSoftcamRegistered(true);
    } catch (err: any) {
      d.showToast(localizeError(String(err), d.lang), 'error');
    }
  };

  const startVirtualCamera = async () => {
    if (!cameraActive) {
      d.showToast(d.s.enableCameraFirst || 'Please enable camera first!', 'warning');
      return;
    }
    if (!canvasRef.current) {
      d.showToast(d.s.canvasNotReady || 'Canvas not ready. Try again.', 'warning');
      return;
    }
    try {
      const canvas = canvasRef.current;
      const result = await invoke<string>('start_virtual_camera', {
        width: canvas.width,
        height: canvas.height,
        port: d.config.virtualCameraPort,
      });
      setVirtualCameraActive(true);
      setVcamBackend(
        result.includes('vcamStartedSoftcam') || result.includes('vcamStartedV4l2')
          ? 'softcam'
          : 'mjpeg'
      );
      const localizedResult = localizeError(result, d.lang);
      d.setStatusMsg(localizedResult);
      d.showToast(localizedResult, 'success');
    } catch (err: any) {
      const errorMsg = localizeError(String(err), d.lang);
      d.setStatusMsg(errorMsg);
      d.showToast(errorMsg, 'error');
      setVirtualCameraActive(false);
    }
  };

  const stopVirtualCamera = async () => {
    try {
      const result = await invoke<string>('stop_virtual_camera');
      setVirtualCameraActive(false);
      setVcamBackend(null);
      const localizedResult = localizeError(result, d.lang);
      d.setStatusMsg(localizedResult);
      d.showToast(localizedResult, 'info');
    } catch (err: any) {
      const errorMsg = localizeError(String(err), d.lang);
      d.setStatusMsg(errorMsg);
      d.showToast(errorMsg, 'error');
    }
  };

  useEffect(() => {
    paramsRef.current = {
      width: d.width, fontRatio: d.fontRatio, paletteIndex: d.paletteIndex,
      customPalette: d.customPalette, brightness: d.brightness, contrast: d.contrast,
      gamma: d.gamma, invert: d.invert, useColor: d.useColor,
    };
  }, [d.width, d.fontRatio, d.paletteIndex, d.customPalette, d.brightness, d.contrast, d.gamma, d.invert, d.useColor]);

  useEffect(() => {
    virtualCameraActiveRef.current = virtualCameraActive;
  }, [virtualCameraActive]);

  useEffect(() => {
    cameraActiveRef.current = cameraActive;
  }, [cameraActive]);

  // Параметры конверсии уходят в Rust только при их изменении, не с каждым кадром.
  useEffect(() => {
    if (!cameraActive) return;
    const palette = d.customPalette
      || WEBCAM_PALETTES[Math.min(d.paletteIndex, WEBCAM_PALETTES.length - 1)];
    invoke('set_webcam_params', {
      params: { palette, brightness: d.brightness, contrast: d.contrast, gamma: d.gamma, invert: d.invert, useColor: d.useColor },
    }).catch(() => {});
  }, [cameraActive, d.paletteIndex, d.customPalette, d.brightness, d.contrast, d.gamma, d.invert, d.useColor]);

  const webcamLoop = useCallback((timestamp: number) => {
    frameRequestId.current = requestAnimationFrame(webcamLoop);

    // Троттлинг до FPS камеры
    if (timestamp - lastLoopTickRef.current < WEBCAM_FRAME_MS) return;
    lastLoopTickRef.current = timestamp;

    // Предыдущий кадр ещё в обработке — пропускаем, не копим очередь
    if (frameInFlightRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvasCtxRef.current
      ?? (canvasCtxRef.current = canvas.getContext('2d', { willReadFrequently: true }));
    if (!ctx) return;

    // FPS измерение (для виртуальной камеры)
    const now = performance.now();
    fpsCounterRef.current++;
    const elapsed = now - lastFrameTimeRef.current;
    if (elapsed >= 500) {
      const measuredFps = Math.round((fpsCounterRef.current * 1000) / elapsed);
      currentFpsRef.current = measuredFps;
      if (virtualCameraActiveRef.current) {
        invoke('set_virtual_camera_fps', { fps: measuredFps }).catch(() => {});
      }
      fpsCounterRef.current = 0;
      lastFrameTimeRef.current = now;
    }

    const params = paramsRef.current;

    if (videoRef.current && streamRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const targetW = params.width;
      const vAspectRatio = video.videoHeight / video.videoWidth;
      const targetH = Math.max(1, Math.round((targetW * vAspectRatio) / params.fontRatio));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    if (canvas.width === 0 || canvas.height === 0) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Один бинарный IPC-вызов: сырые RGBA-байты туда, ASCII-байты обратно.
    frameInFlightRef.current = true;
    invoke<ArrayBuffer>('process_webcam_frame', imageData.data.buffer, {
      headers: {
        'x-frame-width': String(canvas.width),
        'x-frame-height': String(canvas.height),
      },
    })
      .then(asciiBuf => {
        if (webcamOutputRef.current && cameraActiveRef.current) {
          webcamOutputRef.current.textContent = textDecoderRef.current.decode(asciiBuf);
        }
      })
      .catch(() => {})
      .finally(() => {
        frameInFlightRef.current = false;
      });
  }, []);

  const startCamera = async () => {
    try {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('getUserMedia not available');
        }

        const stream = await requestCameraAccess({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30, max: 30 },
          },
        }, d.lang);

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraActive(true);
        if (frameRequestId.current) {
          cancelAnimationFrame(frameRequestId.current);
        }
        frameRequestId.current = requestAnimationFrame(webcamLoop);
        d.setStatusMsg(d.s.cameraStartedWebAPI || 'Camera started');
        d.showToast(d.s.cameraStartedWebAPI || 'Camera started', 'success');
        return;
      } catch (webApiError: any) {
        const targetHeight = Math.max(1, Math.round((d.width * 0.75) / d.fontRatio));
        const nativeCapture = await requestNativeCameraAccess(d.width, targetHeight, (imageData) => {
          if (processingFrameRef.current) return;
          processingFrameRef.current = true;

          if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              createImageBitmap(imageData).then(bitmap => {
                if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
                  canvas.width = bitmap.width;
                  canvas.height = bitmap.height;
                }
                ctx.drawImage(bitmap, 0, 0);
                bitmap.close();
                processingFrameRef.current = false;
              }).catch(() => {
                processingFrameRef.current = false;
              });
            } else {
              processingFrameRef.current = false;
            }
          } else {
            processingFrameRef.current = false;
          }
        }, d.lang, () => !processingFrameRef.current);

        nativeCameraRef.current = nativeCapture;
        setCameraActive(true);

        await new Promise<void>((resolve) => {
          const checkCanvas = () => {
            if (canvasRef.current && canvasRef.current.width > 0 && canvasRef.current.height > 0) {
              resolve();
            } else {
              setTimeout(checkCanvas, 50);
            }
          };
          checkCanvas();
        });

        if (frameRequestId.current) {
          cancelAnimationFrame(frameRequestId.current);
        }
        frameRequestId.current = requestAnimationFrame(webcamLoop);
        d.setStatusMsg(d.s.cameraStartedNative || 'Camera started');
        d.showToast(d.s.cameraStartedNative || 'Camera started', 'success');
      }
    } catch (err: any) {
      const errorMsg = `${d.s.camErrorGeneric || 'Camera error'}: ${err.message || err}`;
      d.setStatusMsg(errorMsg);
      d.showToast(errorMsg, 'error');
      setCameraActive(false);
    }
  };

  const stopCamera = useCallback(async () => {
    if (frameRequestId.current) {
      cancelAnimationFrame(frameRequestId.current);
      frameRequestId.current = null;
    }

    stopMediaStream(streamRef.current);
    streamRef.current = null;

    if (nativeCameraRef.current) {
      await nativeCameraRef.current.stop();
      nativeCameraRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (virtualCameraActive) {
      await stopVirtualCamera();
    }

    setCameraActive(false);
    if (webcamOutputRef.current) {
      webcamOutputRef.current.textContent = '';
    }
    d.setStatusMsg(d.s.cameraStopped || "Camera stopped.");
  }, [virtualCameraActive]);

  // Очистка при размонтировании.
  useEffect(() => {
    return () => {
      if (frameRequestId.current) cancelAnimationFrame(frameRequestId.current);
      stopMediaStream(streamRef.current);
      if (nativeCameraRef.current) {
        nativeCameraRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Обновление разрешения нативной камеры при смене ширины.
  useEffect(() => {
    if (cameraActive && d.sidebarMode === 'webcam') {
      const targetHeight = Math.max(1, Math.round((d.width * 0.75) / d.fontRatio));
      if (nativeCameraRef.current) {
        invoke('set_native_camera_resolution', { width: d.width, height: targetHeight }).catch(() => {});
      }
    }
  }, [d.width, d.fontRatio]);

  const startRecording = async () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];
    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };
      mediaRecorder.onstop = async () => {
        setRecordingActive(false);
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        d.setStatusMsg(d.s.savingWebcamVideo || 'Saving webcam recording...');
        try {
          const tempFilePath = await invoke<string>('save_webcam_temp_video', { bytes: Array.from(bytes) });
          d.setFilePath(tempFilePath);
          d.setIsVideo(true);
          d.setHasResult(false);
          d.setImageOutput('');
          d.setVideoFrames([]);
          d.setCurrentFrame(0);
          stopCamera();
          d.setSidebarMode('ascii');
          const msg = d.s.recordingComplete || 'Recording complete! Press "Execute" to generate ASCII video.';
          d.setStatusMsg(msg);
          d.showToast(msg, 'success');
        } catch (err) {
          const errorMsg = `${d.s.recordingError || 'Recording error'}: ${err}`;
          d.setStatusMsg(errorMsg);
          d.showToast(errorMsg, 'error');
        }
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecordingActive(true);
      const msg = d.s.recordingStarted || 'Recording webcam...';
      d.setStatusMsg(msg);
      d.showToast(msg, 'info');
    } catch (err) {
      console.error(err);
      const errorMsg = `${d.s.recordingError || 'Recording error'}: ${err}`;
      d.setStatusMsg(errorMsg);
      d.showToast(errorMsg, 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  return {
    // Состояние
    cameraActive, recordingActive, virtualCameraActive, vcamBackend, softcamRegistered,
    // Refs для JSX
    videoRef, canvasRef, webcamOutputRef,
    // Управление
    startCamera, stopCamera, startRecording, stopRecording,
    startVirtualCamera, stopVirtualCamera, handleRegisterSoftcam,
  };
}
