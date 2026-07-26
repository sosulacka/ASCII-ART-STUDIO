import {
  useState, useRef, useEffect,
  WheelEvent
} from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';
import {
  Image as ImageIcon, Video, Save, Play, Sliders,
  Palette, Type, Monitor, SkipBack, SkipForward,
  Pause, Square, Film, Settings, Zap, Code2, Trash2, FilePlus, BookOpen
} from 'lucide-react';
import './styles/index.css';

import { THEMES, type Theme } from './themes';
import { t, type Lang } from './i18n';
import { useConfig } from './useConfig';
import SplashScreen from './SplashScreen';
import { SettingsPanel } from './SettingsPanel';
import Logo from './Logo';
import { FIGLET_FONTS } from './figletFonts';
import { ToastContainer } from './Toast';
import { TitleBar } from './components/TitleBar';
import { StarField } from './components/StarField';
import { SliderRow, CheckRow, Dropdown, TiltButton, type DropdownOption } from './components/Controls';
import { SaveModal, FFmpegDialog, LangTransition } from './components/Modals';
import { ColorPicker } from './components/ColorPicker';
import { UpdateBanner } from './components/UpdateBanner';
import { applyTheme } from './lib/theme';
import { useToasts } from './hooks/useToasts';
import { useLangTransition } from './hooks/useLangTransition';
import { useFFmpeg } from './hooks/useFFmpeg';
import { usePlayback } from './hooks/usePlayback';
import { useFiglet } from './hooks/useFiglet';
import { useExport } from './hooks/useExport';
import { useConverter } from './hooks/useConverter';
import { useWebcam } from './hooks/useWebcam';
import { useScripts } from './hooks/useScripts';
import { ScriptEditor } from './components/ScriptEditor';
import { DocsModal } from './components/DocsModal';

export default function App() {
  const { config, saveConfig, resetConfig, loaded } = useConfig();
  const [splashDone, setSplashDone] = useState(false);

  const currentTheme = THEMES.find(th => th.id === config.themeId) ?? THEMES[0];
  const currentLang  = config.lang;
  const s            = t(currentLang);

  const { toasts, showToast, removeToast } = useToasts(currentLang);


  useEffect(() => {
    if (loaded) applyTheme(currentTheme, config.fontFamily);
  }, [currentTheme, config.fontFamily, loaded]);

  const langTransition = useLangTransition(currentLang);

  const [showSettings, setShowSettings] = useState(false);
  const {
    showFFmpegDialog, setShowFFmpegDialog,
    ffmpegInstalling, handleFFmpegInstall, handleFFmpegManual,
  } = useFFmpeg(loaded, splashDone, s, showToast);

  const [filePath, setFilePath]   = useState<string | null>(null);
  const [isVideo, setIsVideo]     = useState(false);
  const [hasResult, setHasResult] = useState(false);

  const [width, setWidth]                 = useState(config.defaultWidth);
  const [fontRatio, setFontRatio]         = useState(config.defaultFontRatio);
  const [brightness, setBrightness]       = useState(0);
  const [contrast, setContrast]           = useState(0);
  const [gamma, setGamma]                 = useState(1.0);
  const [paletteIndex, setPaletteIndex]   = useState(config.defaultPalette);
  const [customPalette, setCustomPalette] = useState('');
  const [invert, setInvert]               = useState(false);
  const [dithering, setDithering]         = useState(false);
  const [useColor, setUseColor]           = useState(false);
  const [bgColor, setBgColor]             = useState(config.defaultBg);
  const [zoom, setZoom]                   = useState(config.defaultZoom);

  useEffect(() => {
    if (loaded) {
      setWidth(config.defaultWidth);
      setFontRatio(config.defaultFontRatio);
      setPaletteIndex(config.defaultPalette);
      setBgColor(config.defaultBg);
      setZoom(config.defaultZoom);
    }
  }, [loaded]);

  const [imageOutput, setImageOutput]   = useState('');
  const [videoFrames, setVideoFrames]   = useState<string[]>([]);
  const [videoFps, setVideoFps]         = useState(25);
  const { currentFrame, setCurrentFrame, isPlaying, startPlayback, stopPlayback } = usePlayback();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg]       = useState('');
  const [renderProgress, setRenderProgress] = useState<{ done: number; total: number } | null>(null);

  const [sidebarMode, setSidebarMode] = useState<'ascii' | 'text' | 'webcam' | 'scripts'>('ascii');
  const [showDocs, setShowDocs] = useState(false);
  const scripts = useScripts(s.scriptDefaultGreeting || 'Hello from Axium!');
  const {
    textInput, setTextInput,
    textOutput, setTextOutput,
    selectedFigletFont, setSelectedFigletFont,
    hoveredFont, setHoveredFont,
    hoveredPreview,
    fetchAndLoadFont,
    handleRenderText,
  } = useFiglet(sidebarMode, width, s);

  const {
    cameraActive, recordingActive, virtualCameraActive, vcamBackend, softcamRegistered,
    videoRef, canvasRef, webcamOutputRef,
    startCamera, stopCamera, startRecording, stopRecording,
    startVirtualCamera, stopVirtualCamera, handleRegisterSoftcam,
  } = useWebcam({
    lang: currentLang, s, config, sidebarMode,
    width, fontRatio, paletteIndex, customPalette, brightness, contrast, gamma, invert, useColor,
    setStatusMsg, showToast, setFilePath, setIsVideo, setHasResult,
    setImageOutput, setVideoFrames, setCurrentFrame, setSidebarMode,
  });

  // Прогресс рендера видео приходит из Rust через Emitter.
  useEffect(() => {
    const unlisten = listen<{ done: number; total: number }>('render-progress', e => {
      setRenderProgress(e.payload);
    });
    return () => { unlisten.then(f => f()); };
  }, []);

  // События управления приложением из скриптов Axium (мост app_api).
  // Подписываемся один раз, актуальные config/showToast читаем через refs.
  const configRef = useRef(config);
  configRef.current = config;
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const saveConfigRef = useRef(saveConfig);
  saveConfigRef.current = saveConfig;

  useEffect(() => {
    const unToast = listen<{ message: string; kind: string }>('script-toast', e => {
      const kind = e.payload.kind;
      const type = kind === 'success' || kind === 'error' ? kind : 'info';
      showToastRef.current(e.payload.message, type);
    });
    const unTheme = listen<string>('script-set-theme', e => {
      const themeId = e.payload;
      if (THEMES.some(th => th.id === themeId)) {
        saveConfigRef.current({ ...configRef.current, themeId });
      }
    });
    return () => {
      unToast.then(f => f());
      unTheme.then(f => f());
    };
  }, []);

  const outputRef       = useRef<HTMLDivElement>(null);

  const handleLoad = async (mediaType: 'image' | 'video') => {
    const filters = mediaType === 'image'
      ? [{ name: 'Images', extensions: ['png','jpg','jpeg','webp','bmp'] }]
      : [{ name: 'Video / GIF', extensions: ['mp4','avi','mkv','gif','mov','webm'] }];

    const file = await open({ filters });
    if (file && typeof file === 'string') {
      setFilePath(file);
      setIsVideo(mediaType === 'video');
      setHasResult(false);
      setImageOutput('');
      setVideoFrames([]);
      setCurrentFrame(0);
      stopPlayback();
      setStatusMsg(`${s.loaded}: ${file.split(/[\\/]/).pop() ?? ''}`);
    }
  };

  const { buildParams, handleGenerate } = useConverter({
    lang: currentLang, s, config, filePath, isVideo,
    width, paletteIndex, customPalette, brightness, contrast, gamma, fontRatio, useColor, invert, dithering,
    setImageOutput, setVideoFrames, setVideoFps, setCurrentFrame, setHasResult,
    setIsProcessing, setStatusMsg, startPlayback, stopPlayback, showToast,
  });

  const {
    showSaveModal, setShowSaveModal,
    saveModalType, setSaveModalType,
    handleSaveClick, handleFormatChosen,
  } = useExport({
    lang: currentLang, s, config, sidebarMode, isVideo, hasResult, isProcessing,
    textOutput, imageOutput, bgColor, videoFrames, videoFps, buildParams,
    setIsProcessing, setStatusMsg, setRenderProgress, startPlayback, stopPlayback, showToast,
  });

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    // В режиме скриптов масштаб не применяется — у редактора своя прокрутка.
    if (e.ctrlKey && sidebarMode !== 'scripts') {
      e.preventDefault();
      setZoom(p => Math.max(2, Math.min(64, e.deltaY < 0 ? p + 1 : p - 1)));
    }
  };

  const currentContent  = isVideo ? (videoFrames[currentFrame] ?? '') : imageOutput;
  const isHtmlContent   = useColor && !!currentContent && !currentContent.startsWith('[');

  const paletteOptions: DropdownOption[] = [
    { value: 0, label: s.paletteStandard },
    { value: 1, label: s.paletteUltra },
    { value: 2, label: s.paletteDetailed },
    { value: 3, label: s.paletteBlocks },
    { value: 4, label: s.paletteBinary },
    { value: 5, label: s.paletteBraille },
  ];

  if (!loaded || !splashDone) {
    return (
      <SplashScreen
        theme={currentTheme}
        lang={currentLang}
        onDone={() => setSplashDone(true)}
      />
    );
  }

  return (
    <div className="app-root">
      <TitleBar title={s.appTitle} strings={s} />

      <ToastContainer toasts={toasts} onClose={removeToast} />

      <UpdateBanner lang={currentLang} />

      <div className="app-body">
        <StarField 
          show={config.showStars} 
          count={config.starsCount}
          minSize={config.starsMinSize}
          maxSize={config.starsMaxSize}
          color={config.starsColor}
        />

        <LangTransition
          active={langTransition}
          theme={currentTheme}
          lang={currentLang}
        />

        {showSettings && (
          <SettingsPanel
            config={config}
            lang={currentLang}
            onSave={saveConfig}
            onReset={resetConfig}
            onClose={() => setShowSettings(false)}
            onPaletteChange={(val) => setPaletteIndex(val)}
            showToast={showToast}
          />
        )}

        {showSaveModal && (
          <SaveModal
            type={saveModalType}
            lang={currentLang}
            onClose={() => setShowSaveModal(false)}
            onChoose={handleFormatChosen}
          />
        )}

        {showFFmpegDialog && (
          <FFmpegDialog
            lang={currentLang}
            onClose={() => setShowFFmpegDialog(false)}
            onInstall={handleFFmpegInstall}
            onManual={handleFFmpegManual}
            installing={ffmpegInstalling}
          />
        )}

        {showDocs && (
          <DocsModal
            natives={scripts.natives}
            lang={currentLang}
            onClose={() => setShowDocs(false)}
          />
        )}

        {}
        <aside className="sidebar">
          <div className="sidebar-header">
            <Logo size={15} />
            <span className="sidebar-title">{s.appTitle}</span>
            <button
              className="header-icon-btn"
              onClick={() => setShowSettings(true)}
              title={s.settings}
            >
              <Settings size={14} />
            </button>
          </div>

          <div className="sidebar-body custom-scrollbar">

            {/* Переключатель режимов — сегментированные табы */}
            <div className="mode-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={sidebarMode === 'ascii'}
                onClick={() => { setSidebarMode('ascii'); stopCamera(); }}
                className={`mode-tab ${sidebarMode === 'ascii' ? 'active' : ''}`}
              >
                <ImageIcon size={14} />
                <span>{s.imageMode}</span>
              </button>
              <button
                role="tab"
                aria-selected={sidebarMode === 'text'}
                onClick={() => { setSidebarMode('text'); stopCamera(); }}
                className={`mode-tab ${sidebarMode === 'text' ? 'active' : ''}`}
              >
                <Type size={14} />
                <span>{s.textMode}</span>
              </button>
              <button
                role="tab"
                aria-selected={sidebarMode === 'webcam'}
                onClick={() => {
                  setSidebarMode('webcam');
                  setFilePath(null);
                  setIsVideo(false);
                  setHasResult(false);
                  setImageOutput('');
                  // Оптимальные настройки для webcam
                  setPaletteIndex(config.defaultPalette);
                  setBrightness(20);
                  setContrast(30);
                  setUseColor(false);
                }}
                className={`mode-tab ${sidebarMode === 'webcam' ? 'active' : ''}`}
              >
                <Video size={14} />
                <span>{s.webcamMode}</span>
              </button>
              <button
                role="tab"
                aria-selected={sidebarMode === 'scripts'}
                onClick={() => { setSidebarMode('scripts'); stopCamera(); }}
                className={`mode-tab ${sidebarMode === 'scripts' ? 'active' : ''}`}
              >
                <Code2 size={14} />
                <span>{s.scriptsMode ?? 'Scripts'}</span>
              </button>
            </div>

            {}
            {sidebarMode === 'ascii' && (
              <section className="panel-section">
                <div className="btn-row">
                  <TiltButton
                    onClick={() => handleLoad('image')}
                    className="btn-ghost"
                    style={{ flex: 1 }}
                  >
                    <ImageIcon size={12} /> {s.openImage}
                  </TiltButton>
                  <TiltButton
                    onClick={() => handleLoad('video')}
                    className="btn-ghost"
                    style={{ flex: 1 }}
                  >
                    <Video size={12} /> {s.openVideo}
                  </TiltButton>
                </div>
                {filePath && (
                  <div className="file-badge">
                    <Film size={10} />
                    <span>{filePath.split(/[\\/]/).pop()}</span>
                  </div>
                )}
              </section>
            )}

            {}
            {sidebarMode === 'text' && (
              <>
                <section className="panel-section">
                  <h2 className="section-title">
                    <Type size={11} /> {s.textToAscii}
                  </h2>
                  <input
                    type="text"
                    placeholder={s.enterText}
                    className="text-input"
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    style={{ marginBottom: 8 }}
                  />
                  
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      {s.selectFont}
                    </label>
                    <Dropdown
                      options={FIGLET_FONTS.map((f, idx) => ({ value: idx, label: f.name }))}
                      value={FIGLET_FONTS.findIndex(f => f.name === selectedFigletFont)}
                      onChange={(idx) => {
                        const font = FIGLET_FONTS[idx];
                        if (font) {
                          setSelectedFigletFont(font.name);
                          setHoveredFont(font.name);
                        }
                      }}
                    />
                  </div>

                  <SliderRow
                    label={s.width} value={width}
                    min={20} max={600} onChange={setWidth}
                  />

                  {hoveredPreview && (
                    <div style={{
                      marginTop: 8,
                      padding: 8,
                      background: 'var(--bg-section)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      fontSize: 8,
                      lineHeight: 1,
                      overflow: 'auto',
                      maxHeight: 120,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-primary)',
                    }}>
                      <pre style={{ margin: 0 }}>{hoveredPreview}</pre>
                    </div>
                  )}
                </section>
              </>
            )}

            {}
            {sidebarMode === 'webcam' && (
              <>
                <section className="panel-section">
                  <h2 className="section-title">
                    <Video size={11} /> {s.webcamToAscii}
                  </h2>
                  <div className="btn-row">
                    {!cameraActive ? (
                      <TiltButton
                        onClick={startCamera}
                        className="btn-primary"
                        style={{ flex: 1 }}
                      >
                        <Play size={12} /> {s.startCamera}
                      </TiltButton>
                    ) : (
                      <TiltButton
                        onClick={stopCamera}
                        className="btn-ghost"
                        style={{ flex: 1 }}
                      >
                        <Square size={12} /> {s.stopCamera}
                      </TiltButton>
                    )}
                  </div>

                  {cameraActive && (
                    <>
                      <div className="btn-row" style={{ marginTop: 8 }}>
                        {!recordingActive ? (
                          <TiltButton
                            onClick={startRecording}
                            className="btn-primary"
                            style={{ flex: 1 }}
                          >
                            <Film size={12} /> {s.startRecord}
                          </TiltButton>
                        ) : (
                          <TiltButton
                            onClick={stopRecording}
                            className="btn-ghost"
                            style={{ flex: 1 }}
                          >
                            <Square size={12} /> {s.stopRecord}
                          </TiltButton>
                        )}
                      </div>

                      <div className="btn-row" style={{ marginTop: 8 }}>
                        {!virtualCameraActive ? (
                          <TiltButton
                            onClick={startVirtualCamera}
                            className="btn-primary"
                            style={{ flex: 1 }}
                          >
                            <Monitor size={12} /> {s.startVirtualCam}
                          </TiltButton>
                        ) : (
                          <TiltButton
                            onClick={stopVirtualCamera}
                            className="btn-ghost"
                            style={{ flex: 1 }}
                          >
                            <Monitor size={12} /> {s.stopVirtualCam}
                          </TiltButton>
                        )}
                      </div>

                      {softcamRegistered === false && (
                        <div style={{ marginTop: 8, padding: 8, background: 'var(--bg-section)', border: '1px solid var(--border)', borderRadius: 4 }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4 }}>
                            {s.vcamInstallPrompt}
                          </div>
                          <TiltButton
                            onClick={handleRegisterSoftcam}
                            className="btn-ghost"
                            style={{ width: '100%' }}
                          >
                            <Zap size={12} /> {s.vcamInstallBtn}
                          </TiltButton>
                        </div>
                      )}
                    </>
                  )}

                  {recordingActive && (
                    <div className="file-badge" style={{ marginTop: 8 }}>
                      <Film size={10} />
                      <span>{s.recordingActive}</span>
                    </div>
                  )}

                  {virtualCameraActive && (
                    <div className="file-badge" style={{ marginTop: 8 }}>
                      <Monitor size={10} />
                      <span>{s.virtualCamActive}</span>
                    </div>
                  )}

                  {virtualCameraActive && vcamBackend === 'mjpeg' && canvasRef.current && (
                    <div style={{ marginTop: 8, padding: 8, background: 'var(--bg-section)', border: '1px solid var(--border)', borderRadius: 4 }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>
                        MJPEG Stream URL:
                      </div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input
                          type="text"
                          readOnly
                          value={`http://localhost:${config.virtualCameraPort}/stream`}
                          style={{
                            flex: 1,
                            fontSize: 10,
                            padding: '4px 6px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border)',
                            borderRadius: 2,
                            color: 'var(--accent)',
                            fontFamily: 'monospace',
                          }}
                          onClick={(e) => e.currentTarget.select()}
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`http://localhost:${config.virtualCameraPort}/stream`);
                            const msg = s.urlCopied || 'URL copied!';
                            setStatusMsg(msg);
                            showToast(msg, 'success');
                            setTimeout(() => setStatusMsg(''), 2000);
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: 9,
                            background: 'var(--btn-primary)',
                            color: 'var(--btn-primary-text)',
                            border: 'none',
                            borderRadius: 2,
                            cursor: 'pointer',
                          }}
                          title={s.copyUrl}
                        >
                          {s.copyUrl}
                        </button>
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 6 }}>
                        {s.resolution}: {canvasRef.current.width * 6}x{canvasRef.current.height * 11}px ({canvasRef.current.width}x{canvasRef.current.height} {s.symbolsLabel})
                      </div>
                    </div>
                  )}

                  <SliderRow
                    label={s.width} value={width}
                    min={20} max={200} onChange={setWidth}
                  />
                  <SliderRow
                    label={s.fontRatio} value={fontRatio}
                    min={1.0} max={3.0} step={0.1} decimals={1}
                    onChange={setFontRatio}
                  />
                  <div className="grid-2">
                    <SliderRow
                      label={s.brightness} value={brightness}
                      min={-100} max={100} onChange={setBrightness}
                    />
                    <SliderRow
                      label={s.contrast} value={contrast}
                      min={-100} max={100} onChange={setContrast}
                    />
                  </div>
                  <SliderRow
                    label={s.gamma} value={gamma}
                    min={0.1} max={3.0} step={0.05} decimals={2}
                    onChange={setGamma}
                  />
                  <Dropdown
                    options={paletteOptions}
                    value={paletteIndex}
                    onChange={setPaletteIndex}
                  />
                  {}
                  <CheckRow
                    label={s.invert}
                    checked={invert}
                    onChange={setInvert}
                  />

                  {}
                  <video ref={videoRef} style={{ display: 'none' }} autoPlay playsInline muted />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </section>
              </>
            )}

            {}
            {sidebarMode === 'ascii' && (
              <>
                <section className="panel-section">
                  <h2 className="section-title">
                    <Sliders size={11} /> {s.geometry}
                  </h2>
                  <SliderRow
                    label={s.width} value={width}
                    min={20} max={600} onChange={setWidth}
                  />
                  <SliderRow
                    label={s.fontRatio} value={fontRatio}
                    min={1.0} max={3.0} step={0.1} decimals={1}
                    onChange={setFontRatio}
                  />
                  <div className="grid-2">
                    <SliderRow
                      label={s.brightness} value={brightness}
                      min={-100} max={100} onChange={setBrightness}
                    />
                    <SliderRow
                      label={s.contrast} value={contrast}
                      min={-100} max={100} onChange={setContrast}
                    />
                  </div>
                  <SliderRow
                    label={s.gamma} value={gamma}
                    min={0.1} max={3.0} step={0.05} decimals={2}
                    onChange={setGamma}
                  />
                </section>

                {/* Символы */}
                <section className="panel-section">
                  <h2 className="section-title">
                    <Palette size={11} /> {s.symbols}
                  </h2>
                  <Dropdown
                    options={paletteOptions}
                    value={paletteIndex}
                    onChange={setPaletteIndex}
                  />
                  <input
                    type="text"
                    placeholder="Custom charset..."
                    className="text-input"
                    value={customPalette}
                    onChange={e => setCustomPalette(e.target.value)}
                  />
                  <div className="checks">
                    <CheckRow
                      label={s.colorRender}
                      checked={useColor}
                      onChange={setUseColor}
                    />
                    <CheckRow
                      label={s.invert}
                      checked={invert}
                      onChange={setInvert}
                    />
                    <CheckRow
                      label={s.dithering}
                      checked={dithering}
                      onChange={setDithering}
                    />
                  </div>
                </section>

                {}
                <section className="panel-section">
                  <h2 className="section-title">
                    <Type size={11} /> {s.viewport}
                  </h2>
                  <div className="color-row">
                    <span>{s.bgColor}</span>
                    <ColorPicker value={bgColor} onChange={setBgColor} />
                  </div>
                </section>
              </>
            )}

            {}
            {sidebarMode === 'scripts' && (
              <section className="panel-section">
                <h2 className="section-title">
                  <Code2 size={11} /> {s.scriptsPanelTitle}
                </h2>

                {scripts.dllAvailable === false && (
                  <>
                    <div className="file-badge" style={{ marginBottom: 8 }}>
                      <Zap size={10} />
                      <span>{s.scriptDllMissing}</span>
                    </div>
                    <TiltButton
                      onClick={scripts.pickLibrary}
                      className="btn-ghost"
                      style={{ width: '100%', marginBottom: 8 }}
                    >
                      <FilePlus size={12} /> {s.scriptPickLibBtn}
                    </TiltButton>
                  </>
                )}

                <div className="btn-row">
                  <TiltButton
                    onClick={scripts.newScript}
                    className="btn-ghost"
                    style={{ flex: 1 }}
                  >
                    <FilePlus size={12} /> {s.scriptNewBtn}
                  </TiltButton>
                </div>

                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {scripts.scripts.length === 0 ? (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '4px 2px' }}>
                      {s.scriptNoScripts}
                    </div>
                  ) : (
                    scripts.scripts.map(name => (
                      <div
                        key={name}
                        onClick={() => scripts.openScript(name)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6,
                          padding: '6px 8px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          background: scripts.activeName === name ? 'var(--bg-hover)' : 'var(--bg-section)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <span style={{
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          color: scripts.activeName === name ? 'var(--accent)' : 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {name}
                        </span>
                        <button
                          className="btn-icon"
                          style={{ width: 20, height: 20, flexShrink: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm((s.scriptDeleteConfirm || 'Delete script "{0}"?').replace('{0}', name))) {
                              scripts.deleteScript(name);
                            }
                          }}
                          title="Delete"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {}
            {isVideo && hasResult && videoFrames.length > 0 && (
              <section className="panel-section">
                <h2 className="section-title">
                  <Film size={11} /> {s.player}
                </h2>
                <div className="player-controls">
                  <button className="player-btn"
                    onClick={() => setCurrentFrame(0)}>
                    <SkipBack size={13} />
                  </button>
                  <button
                    className="player-btn player-btn--main"
                    onClick={() => isPlaying
                      ? stopPlayback()
                      : startPlayback(videoFrames, videoFps)}
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button className="player-btn"
                    onClick={() => { stopPlayback(); setCurrentFrame(0); }}>
                    <Square size={13} />
                  </button>
                  <button className="player-btn"
                    onClick={() => setCurrentFrame(videoFrames.length - 1)}>
                    <SkipForward size={13} />
                  </button>
                </div>

                <div className="frame-info">
                  {currentFrame + 1} / {videoFrames.length}
                  &nbsp;·&nbsp;
                  {videoFps.toFixed(1)} FPS
                </div>

                <input
                  type="range"
                  min={0} max={videoFrames.length - 1}
                  value={currentFrame}
                  className="slider-strict"
                  onChange={e => {
                    stopPlayback();
                    setCurrentFrame(Number(e.target.value));
                  }}
                />
              </section>
            )}
          </div>

          {renderProgress && renderProgress.total > 0 && (
            <div className="render-progress">
              <div className="render-progress-track">
                <div
                  className="render-progress-fill"
                  style={{ width: `${(renderProgress.done / renderProgress.total) * 100}%` }}
                />
              </div>
              <span className="render-progress-label">
                {renderProgress.done} / {renderProgress.total}
              </span>
            </div>
          )}

          {statusMsg && <div className="status-bar">{statusMsg}</div>}

          <div className="sidebar-footer">
            {sidebarMode === 'ascii' ? (
              <>
                <TiltButton
                  onClick={handleGenerate}
                  disabled={!filePath || isProcessing}
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  {isProcessing
                    ? <><span className="spinner" /> {s.processing}</>
                    : <><Play size={13} /> {s.execute}</>}
                </TiltButton>

                <button
                  className="btn-icon"
                  onClick={() => {
                    const content = isVideo ? (videoFrames[currentFrame] ?? '') : imageOutput;
                    if (!content) return;
                    navigator.clipboard.writeText(content.replace(/<[^>]*>/g, ''));
                    showToast(s.copied || 'Copied!', 'success');
                  }}
                  disabled={!hasResult || isProcessing}
                  title={s.copyClipboard}
                >
                  <Type size={14} />
                </button>

                <button
                  className="btn-icon"
                  onClick={handleSaveClick}
                  disabled={!hasResult || isProcessing}
                  title={s.save}
                >
                  <Save size={14} />
                </button>
              </>
            ) : sidebarMode === 'text' ? (
              <>
                <TiltButton
                  onClick={() => {
                    if (textOutput) {
                      navigator.clipboard.writeText(textOutput.replace(/<[^>]*>/g, ''));
                      const msg = s.copied || 'Copied!';
                      setStatusMsg(msg);
                      showToast(msg, 'success');
                      setTimeout(() => setStatusMsg(''), 2000);
                    }
                  }}
                  disabled={!textOutput}
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  <Save size={13} /> {s.copyClipboard || 'Copy'}
                </TiltButton>
                <button
                  className="btn-icon"
                  onClick={() => {
                    if (!textOutput) return;
                    setSaveModalType('text');
                    setShowSaveModal(true);
                  }}
                  disabled={!textOutput}
                  title={s.save}
                >
                  <Save size={14} />
                </button>
              </>
            ) : sidebarMode === 'scripts' ? (
              <>
                <TiltButton
                  onClick={scripts.run}
                  disabled={scripts.running || scripts.dllAvailable === false}
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  {scripts.running
                    ? <><span className="spinner" /> {s.scriptRunning}</>
                    : <><Play size={13} /> {s.scriptRunBtn}</>}
                </TiltButton>

                <button
                  className="btn-icon"
                  onClick={() => {
                    if (scripts.activeName) {
                      scripts.saveScript();
                    } else {
                      const name = window.prompt(s.scriptSaveAsPrompt || 'Script name:', 'script');
                      if (name) scripts.saveScript(name);
                    }
                  }}
                  disabled={!scripts.dirty && !!scripts.activeName}
                  title={s.scriptSaveBtn}
                >
                  <Save size={14} />
                </button>

                <button
                  className="btn-icon"
                  onClick={() => setShowDocs(true)}
                  title={s.scriptDocsBtn}
                >
                  <BookOpen size={14} />
                </button>
              </>
            ) : (
              <>
                <TiltButton
                  onClick={() => {
                    if (webcamOutputRef.current && webcamOutputRef.current.textContent) {
                      const text = webcamOutputRef.current.textContent.replace(/<[^>]*>/g, '');
                      navigator.clipboard.writeText(text);
                      setStatusMsg(s.copied || 'Copied!');
                      setTimeout(() => setStatusMsg(''), 2000);
                    }
                  }}
                  disabled={!cameraActive}
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  <Save size={13} /> {s.copyClipboard || 'Copy'}
                </TiltButton>
              </>
            )}
          </div>
        </aside>

        {}
        <div
          className="viewport"
          style={{
            backgroundColor: bgColor,
          }}
          onWheel={handleWheel}
        >
          <div ref={outputRef} className="viewport-inner custom-scrollbar">
            {sidebarMode === 'scripts' ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: 0 }}>
                <div style={{ flex: 1, minHeight: 0, border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                  <ScriptEditor value={scripts.source} onChange={scripts.setSource} natives={scripts.natives} lintEnabled={scripts.dllAvailable === true} />
                </div>
                <div
                  className="custom-scrollbar"
                  style={{
                    height: 160,
                    flexShrink: 0,
                    background: 'var(--bg-section)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    padding: 8,
                    overflow: 'auto',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    whiteSpace: 'pre-wrap',
                    color: scripts.output
                      ? (scripts.output.ok ? 'var(--text-primary)' : 'var(--danger, #e05252)')
                      : 'var(--text-muted)',
                  }}
                >
                  {scripts.output ? scripts.output.text : s.scriptConsolePlaceholder}
                </div>
              </div>
            ) : sidebarMode === 'text' ? (
              isHtmlContent && textOutput ? (
                <div
                  dangerouslySetInnerHTML={{ __html: textOutput }}
                  className="ascii-output"
                  style={{ fontSize: `${zoom}px`, lineHeight: '1.0', userSelect: 'text' }}
                />
              ) : (
                <pre
                  className="ascii-output ascii-output--plain"
                  style={{ fontSize: `${zoom}px`, lineHeight: '1.0', userSelect: 'text' }}
                >
                  {textOutput || `${s.enterText || 'Enter text...'}\n\n${s.ctrlZoom}`}
                </pre>
              )
            ) : sidebarMode === 'webcam' ? (
              cameraActive ? (
                <pre
                  ref={webcamOutputRef}
                  className="ascii-output ascii-output--plain"
                  style={{ fontSize: `${zoom}px`, lineHeight: '1.0', userSelect: 'text' }}
                >
                  {s.cameraLoading}
                </pre>
              ) : (
                <pre
                  className="ascii-output ascii-output--plain"
                  style={{ fontSize: `${zoom}px`, lineHeight: '1.0' }}
                >
                  {s.startCamera || 'Start camera to see live ASCII output'}
                </pre>
              )
            ) : (
              isHtmlContent ? (
                <div
                  dangerouslySetInnerHTML={{ __html: currentContent }}
                  className="ascii-output"
                  style={{ fontSize: `${zoom}px`, lineHeight: '1.0', userSelect: 'text' }}
                />
              ) : (
                <pre
                  className="ascii-output ascii-output--plain"
                  style={{ fontSize: `${zoom}px`, lineHeight: '1.0', userSelect: 'text' }}
                >
                  {currentContent || `${s.waitingInput}\n\n${s.ctrlZoom}`}
                </pre>
              )
            )}
          </div>

          {sidebarMode !== 'scripts' && (
            <div className="viewport-badges">
              <div className="badge">Zoom: {zoom}px</div>
              {isVideo && hasResult && (
                <div className={`badge ${isPlaying ? 'badge--active' : ''}`}>
                  {isPlaying ? '▶' : '⏸'} {currentFrame + 1}/{videoFrames.length}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}