export type Lang = 'ru' | 'en' | 'de' | 'fr' | 'zh' | 'ja' | 'es' | 'pt' | 'ko' | 'it';

export interface LangMeta {
  code: Lang;
  name: string;
  flag: string; // Emoji флаг
}

export const LANGUAGES: LangMeta[] = [
  { code: 'ru', name: 'Русский',   flag: '🇷🇺' },
  { code: 'en', name: 'English',   flag: '🇺🇸' },
  { code: 'de', name: 'Deutsch',   flag: '🇩🇪' },
  { code: 'fr', name: 'Français',  flag: '🇫🇷' },
  { code: 'zh', name: '中文',       flag: '🇨🇳' },
  { code: 'ja', name: '日本語',     flag: '🇯🇵' },
  { code: 'es', name: 'Español',   flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'ko', name: '한국어',     flag: '🇰🇷' },
  { code: 'it', name: 'Italiano',  flag: '🇮🇹' },
];

// Названия тем локализованные
export type ThemeNames = {
  dark: string; light: string; grey: string; blue: string; navy: string;
  green: string; red: string; purple: string; amber: string; cyan: string;
  rose: string; teal: string; indigo: string; orange: string; nord: string;
  solarized: string; dracula: string; monokai: string; gruvbox: string;
  catppuccin: string; onedark: string; tokyonight: string; everforest: string;
  midnight: string; terminal: string; retro: string; slate: string;
  paper: string;
};

type Strings = {
  appTitle: string;
  openImage: string;
  openVideo: string;
  execute: string;
  save: string;
  processing: string;
  geometry: string;
  width: string;
  fontRatio: string;
  brightness: string;
  contrast: string;
  gamma: string;
  symbols: string;
  colorRender: string;
  invert: string;
  dithering: string;
  viewport: string;
  bgColor: string;
  player: string;
  settings: string;
  theme: string;
  font: string;
  language: string;
  resetDefaults: string;
  saveSettings: string;
  formatTitle: string;
  formatSubImage: string;
  formatSubVideo: string;
  gifAnim: string;
  mp4Video: string;
  coloredHtml: string;
  textTxt: string;
  cancel: string;
  loaded: string;
  done: string;
  error: string;
  framesAt: string;
  renderMp4: string;
  renderGif: string;
  saved: string;
  paletteStandard: string;
  paletteUltra: string;
  paletteDetailed: string;
  paletteBlocks: string;
  paletteBinary: string;
  paletteBraille?: string;
  waitingInput: string;
  ctrlZoom: string;
  settingsTitle: string;
  splashInit: string;
  splashFonts: string;
  splashTheme: string;
  splashLang: string;
  splashConfig: string;
  splashWebview: string;
  splashReady: string;
  s_showStars: string;
  s_autoPlay: string;
  s_defaultWidth: string;
  s_defaultPalette: string;
  s_defaultFontRatio: string;
  s_defaultBg: string;
  s_defaultZoom: string;
  uploadFont: string;
  customTheme: string;
  themeEditor: string;
  themeNames: ThemeNames;
  s_starsCount?: string;
  s_starsMinSize?: string;
  s_starsMaxSize?: string;
  s_starsColor?: string;
  virtualCameraPort?: string;
  copyUrl?: string;
  textToAscii?: string;
  webcamToAscii?: string;
  imageMode?: string;
  textMode?: string;
  webcamMode?: string;
  scriptsMode?: string;
  scriptsPanelTitle?: string;
  scriptNewBtn?: string;
  scriptRunBtn?: string;
  scriptRunning?: string;
  scriptSaveBtn?: string;
  scriptSaveAsPrompt?: string;
  scriptDllMissing?: string;
  scriptPickLibBtn?: string;
  scriptNoScripts?: string;
  scriptConsolePlaceholder?: string;
  scriptDeleteConfirm?: string;
  scriptDefaultGreeting?: string;
  scriptDocsBtn?: string;
  docsTitle?: string;
  docsSubtitle?: string;
  docsEmpty?: string;
  docsSyntaxTitle?: string;
  docsExampleTitle?: string;
  enterText?: string;
  selectFont?: string;
  fontLayout?: string;
  startCamera?: string;
  stopCamera?: string;
  startRecord?: string;
  stopRecord?: string;
  recordingActive?: string;
  copyClipboard?: string;
  copied?: string;
  backToMain?: string;
  downloadingFont?: string;
  fontPreviewText?: string;
  startVirtualCam?: string;
  stopVirtualCam?: string;
  virtualCamActive?: string;
  camErrorNotSupported?: string;
  camErrorNoStream?: string;
  camErrorNotAllowed?: string;
  camErrorNotFound?: string;
  camErrorNotReadable?: string;
  camErrorOverConstrained?: string;
  camErrorSecurity?: string;
  camErrorGeneric?: string;
  cameraLoading?: string;
  cameraStopped?: string;
  
  // Additional webcam and virtual camera strings
  enableCameraFirst?: string;
  canvasNotReady?: string;
  tryAgain?: string;
  resolution?: string;
  virtualCameraError?: string;
  savingWebcamVideo?: string;
  recordingComplete?: string;
  recordingError?: string;
  recordingStarted?: string;
  
  // Preview and loading
  loadingPreview?: string;
  previewError?: string;
  errorLabel?: string;
  
  // Comments and sections
  commentCaching?: string;
  commentWebcam?: string;
  commentVirtualCamera?: string;
  commentLoading?: string;
  commentSaving?: string;
  commentHiddenElements?: string;
  
  // Native camera
  cameraStartedWebAPI?: string;
  cameraStartedNative?: string;
  
  // Frame info
  framesLabel?: string;
  symbolsLabel?: string;
  
  minimize?: string;
  maximize?: string;
  restore?: string;
  close?: string;
  
  formatSubText?: string;
  markdownMd?: string;
  pngImage?: string;
  gifImage?: string;
  
  errFileOpen?: string;
  errPaletteMin?: string;
  errFFmpegNotFound?: string;
  errTempDir?: string;
  errNoFrames?: string;
  errFrameOpen?: string;
  errFFmpeg?: string;
  errFFmpegExtract?: string;
  errNoFramesProcess?: string;
  errFont?: string;
  errFirstFrame?: string;
  errFrameN?: string;
  errSaveFrame?: string;
  errFFmpegEncode?: string;
  videoComplete?: string;
  errWriteFile?: string;
  errSaveImage?: string;
  imageSaved?: string;
  errInvalidRGB?: string;
  errInvalidImageData?: string;
  vcamNotRunning?: string;
  vcamNotStarted?: string;
  vcamBusy?: string;
  vcamStartedSoftcam?: string;
  vcamRegistered?: string;
  vcamRegisterDenied?: string;
  vcamRegisterFailed?: string;
  vcamInstallPrompt?: string;
  vcamInstallBtn?: string;
  updateAvailable?: string;
  updateNow?: string;
  updateLater?: string;
  vcamStartedV4l2?: string;
  vcamNoLoopback?: string;
  
  savingAs?: string;
  canvasContextError?: string;
  blobCreateError?: string;
  urlCopied?: string;
  
  // NumInput validation
  numInputMinValue?: string;
  numInputMaxValue?: string;
  
  // FFmpeg dialog
  ffmpegNotFound?: string;
  ffmpegNotFoundDesc?: string;
  ffmpegInstallAuto?: string;
  ffmpegInstallManual?: string;
  ffmpegInstalling?: string;
  ffmpegInstallSuccess?: string;
  ffmpegInstallError?: string;
  ffmpegDownloadFrom?: string;
  
  // Theme editor
  themeNameLabel?: string;
  themeNameDefault?: string;
  themeBgApp?: string;
  themeBgSidebar?: string;
  themeAccent?: string;
  themeTextPrimary?: string;
  themeTextMuted?: string;
  themeBorder?: string;
  
  // Default text
  defaultTextInput?: string;
  
  // File save dialogs
  fileMarkdown?: string;
  fileText?: string;
  fileHtml?: string;
  fileAnimatedGif?: string;
  fileMp4Video?: string;
};

const THEME_NAMES_RU: ThemeNames = {
  dark: 'Тёмная', light: 'Светлая', grey: 'Серая', blue: 'Синяя',
  navy: 'Тёмно-синяя', green: 'Зелёная', red: 'Красная', purple: 'Фиолетовая',
  amber: 'Янтарная', cyan: 'Циановая', rose: 'Розовая', teal: 'Бирюзовая',
  indigo: 'Индиго', orange: 'Оранжевая', nord: 'Nord', solarized: 'Solarized',
  dracula: 'Dracula', monokai: 'Monokai', gruvbox: 'Gruvbox',
  catppuccin: 'Catppuccin', onedark: 'One Dark', tokyonight: 'Tokyo Night',
  everforest: 'Everforest', midnight: 'Полночь', terminal: 'Терминал',
  retro: 'Ретро', slate: 'Сланцевая', paper: 'Бумага',
};

const THEME_NAMES_EN: ThemeNames = {
  dark: 'Dark', light: 'Light', grey: 'Grey', blue: 'Blue',
  navy: 'Navy', green: 'Green', red: 'Red', purple: 'Purple',
  amber: 'Amber', cyan: 'Cyan', rose: 'Rose', teal: 'Teal',
  indigo: 'Indigo', orange: 'Orange', nord: 'Nord', solarized: 'Solarized',
  dracula: 'Dracula', monokai: 'Monokai', gruvbox: 'Gruvbox',
  catppuccin: 'Catppuccin', onedark: 'One Dark', tokyonight: 'Tokyo Night',
  everforest: 'Everforest', midnight: 'Midnight', terminal: 'Terminal',
  retro: 'Retro', slate: 'Slate', paper: 'Paper',
};

const T: Record<Lang, Strings> = {
  ru: {
    appTitle: 'ASCII Art Studio',
    openImage: 'Изображение', openVideo: 'Видео / GIF',
    execute: 'Выполнить', save: 'Сохранить', processing: 'Обработка...',
    geometry: 'Геометрия и Свет', width: 'Ширина', fontRatio: 'Пропорции шрифта',
    brightness: 'Яркость', contrast: 'Контраст', gamma: 'Гамма',
    symbols: 'Символы и Рендер', colorRender: 'HTML Цветной рендер',
    invert: 'Инвертировать (Негатив)', dithering: 'Дизеринг (Флойд–Стейнберг)', viewport: 'Вьюпорт', bgColor: 'Цвет фона',
    player: 'ASCII Плеер', settings: 'Настройки', theme: 'Тема', font: 'Шрифт',
    language: 'Язык', resetDefaults: 'Сбросить настройки',
    saveSettings: 'Сохранить настройки',
    formatTitle: 'В каком формате сохранить?',
    formatSubImage: 'Выберите формат для ASCII-арта',
    formatSubVideo: 'Выберите формат выходного файла',
    gifAnim: 'Анимация GIF', mp4Video: 'Видео MP4',
    coloredHtml: 'Цветной HTML', textTxt: 'Текст TXT', cancel: 'Отмена',
    loaded: 'Загружено', done: 'Готово', error: 'Ошибка', framesAt: 'кадров @',
    renderMp4: 'Рендер MP4...', renderGif: 'Рендер GIF...', saved: 'Сохранено',
    paletteStandard: 'Стандарт (10)', paletteUltra: 'Ультра (92)',
    paletteDetailed: 'Детальный (70)', paletteBlocks: 'Блоки ░▒▓█',
    paletteBinary: 'Бинарный 0/1',
    paletteBraille: 'Брайль ⠿⣿',
    waitingInput: '[SYSTEM] Ожидание ввода данных.\nЗагрузите файл и нажмите Выполнить.',
    ctrlZoom: 'Ctrl + Колесо — масштаб.',
    settingsTitle: 'Настройки программы',
    splashInit: 'Инициализация...', splashFonts: 'Загрузка шрифтов...',
    splashTheme: 'Применение темы...', splashLang: 'Загрузка локализации...',
    splashConfig: 'Чтение конфигурации...', splashWebview: 'Инициализация WebView...',
    splashReady: 'Готово!',
    s_showStars: 'Показывать звёзды на фоне',
    s_autoPlay: 'Автовоспроизведение видео',
    s_defaultWidth: 'Ширина по умолчанию',
    s_defaultPalette: 'Палитра по умолчанию',
    s_defaultFontRatio: 'Пропорции шрифта по умолчанию',
    s_defaultBg: 'Цвет фона по умолчанию',
    s_defaultZoom: 'Масштаб по умолчанию',
    uploadFont: 'Загрузить свой шрифт',
    customTheme: 'Кастомная тема',
    themeEditor: 'Редактор темы',
    themeNames: THEME_NAMES_RU,
    s_starsCount: 'Количество звезд',
    s_starsMinSize: 'Мин. размер звезд',
    s_starsMaxSize: 'Макс. размер звезд',
    s_starsColor: 'Цвет звезд',
    virtualCameraPort: 'Порт виртуальной камеры',
    copyUrl: 'Копировать URL',
    textToAscii: 'Текст в ASCII',
    webcamToAscii: 'Камера в ASCII',
    imageMode: 'Медиа',
    textMode: 'Текст',
    webcamMode: 'Камера',
    scriptsMode: 'Скрипты',
    scriptsPanelTitle: 'Скрипты Axium',
    scriptNewBtn: 'Новый',
    scriptRunBtn: 'Запустить',
    scriptRunning: 'Выполняется...',
    scriptSaveBtn: 'Сохранить',
    scriptSaveAsPrompt: 'Имя скрипта:',
    scriptDllMissing: 'axium_vm не найдена — вкладка скриптов недоступна',
    scriptPickLibBtn: 'Указать файл движка...',
    scriptNoScripts: 'Нет сохранённых скриптов',
    scriptConsolePlaceholder: 'Вывод скрипта появится здесь после запуска',
    scriptDeleteConfirm: 'Удалить скрипт "{0}"?',
    scriptDefaultGreeting: 'Привет из Axium!',
    scriptDocsBtn: 'Справка по API',
    docsTitle: 'API скриптов',
    docsSubtitle: 'Native-функции, доступные скриптам Axium',
    docsEmpty: 'API недоступно (движок не загружен).',
    docsSyntaxTitle: 'Синтаксис',
    docsExampleTitle: 'Пример',
    enterText: 'Введите текст...',
    selectFont: 'Выберите шрифт',
    fontLayout: 'Макет шрифта',
    startCamera: 'Включить камеру',
    stopCamera: 'Выключить камеру',
    startRecord: 'Запись видео',
    stopRecord: 'Остановить запись',
    recordingActive: 'Идет запись...',
    copyClipboard: 'Копировать',
    copied: 'Скопировано в буфер!',
    backToMain: 'Назад к генерации',
    downloadingFont: 'Загрузка шрифта...',
    fontPreviewText: 'Предпросмотр',
    startVirtualCam: 'Запустить виртуальную камеру',
    stopVirtualCam: 'Остановить виртуальную камеру',
    virtualCamActive: 'Виртуальная камера активна',
    camErrorNotSupported: 'Браузер API не поддерживает доступ к камере',
    camErrorNoStream: 'Не удалось получить поток с камеры',
    camErrorNotAllowed: 'Доступ к камере запрещён. Проверьте разрешения в системе.',
    camErrorNotFound: 'Камера не найдена. Подключите веб-камеру и попробуйте снова.',
    camErrorNotReadable: 'Камера занята другим приложением.',
    camErrorOverConstrained: 'Камера не поддерживает запрошенные параметры.',
    camErrorSecurity: 'Ошибка безопасности. Возможно, требуется HTTPS.',
    camErrorGeneric: 'Ошибка доступа к камере',
    cameraLoading: 'Загрузка камеры...',
    cameraStopped: 'Камера остановлена.',
    
    enableCameraFirst: 'Сначала включите камеру!',
    canvasNotReady: 'Canvas не готов. Попробуйте снова.',
    tryAgain: 'Попробуйте снова',
    resolution: 'Разрешение',
    virtualCameraError: 'Ошибка виртуальной камеры',
    savingWebcamVideo: 'Сохранение записи веб-камеры...',
    recordingComplete: 'Запись завершена! Нажмите "Выполнить" для генерации ASCII-видео.',
    recordingError: 'Ошибка сохранения видео',
    recordingStarted: 'Запись веб-камеры пошла...',
    
    loadingPreview: 'Загрузка превью...',
    previewError: 'Ошибка генерации превью',
    errorLabel: 'Ошибка',
    
    commentCaching: 'Кэширование и загрузка шрифтов',
    commentWebcam: 'Веб-камера в реальном времени',
    commentVirtualCamera: 'Управление виртуальной камерой',
    commentLoading: 'Загрузка',
    commentSaving: 'Сохранение',
    commentHiddenElements: 'Скрытые элементы для камеры',
    
    cameraStartedWebAPI: 'Камера запущена',
    cameraStartedNative: 'Камера запущена',
    
    framesLabel: 'кадров',
    symbolsLabel: 'символов',
    
    minimize: 'Свернуть',
    maximize: 'Развернуть',
    restore: 'Восстановить',
    close: 'Закрыть',
    
    formatSubText: 'Выберите формат для сохранения',
    markdownMd: 'Markdown',
    pngImage: 'PNG Изображение',
    gifImage: 'GIF Изображение',
    
    errFileOpen: 'Не удалось открыть файл: {0}',
    errPaletteMin: 'Палитра должна содержать минимум 2 символа',
    errFFmpegNotFound: 'FFmpeg не найден в PATH. Установите: https://ffmpeg.org/',
    errTempDir: 'Не удалось создать временную папку: {0}',
    errNoFrames: 'Не удалось извлечь ни одного кадра',
    errFrameOpen: 'Ошибка открытия кадра: {0}',
    errFFmpeg: 'Ошибка FFmpeg: {0}',
    errFFmpegExtract: 'FFmpeg не смог извлечь кадры',
    errNoFramesProcess: 'Нет кадров для обработки',
    errFont: 'Ошибка шрифта: {0}',
    errFirstFrame: 'Ошибка первого кадра: {0}',
    errFrameN: 'Кадр {0}: {1}',
    errSaveFrame: 'Ошибка сохранения кадра {0}: {1}',
    errFFmpegEncode: 'FFmpeg не смог закодировать видео',
    videoComplete: 'Готово! Кадров: {0} | FPS: {1} | Размер: {2}\nСохранено: {3}',
    errWriteFile: 'Ошибка записи \'{0}\': {1}',
    errSaveImage: 'Не удалось сохранить изображение: {0}',
    imageSaved: 'Сохранено: {0}',
    errInvalidRGB: 'Неверные RGB данные',
    errInvalidImageData: 'Неверные данные изображения',
    vcamNotRunning: 'Виртуальная камера не запущена',
    vcamNotStarted: 'Виртуальная камера не запущена',
    vcamBusy: 'Виртуальная камера уже используется другим приложением',
    vcamStartedSoftcam: 'Виртуальная камера запущена ({0}) — «DirectShow Softcam» доступна в Discord/Zoom/OBS',
    vcamRegistered: 'Драйвер виртуальной камеры установлен! Теперь запустите камеру.',
    vcamRegisterDenied: 'Установка драйвера отменена (нужны права администратора)',
    vcamRegisterFailed: 'Не удалось зарегистрировать драйвер виртуальной камеры',
    vcamInstallPrompt: 'Установить драйвер виртуальной камеры? Камера станет видна в Discord, Zoom, OBS как настоящая. Потребуются права администратора (Windows: softcam, Linux: модуль v4l2loopback).',
    vcamInstallBtn: 'Установить драйвер камеры',
    updateAvailable: 'Доступно обновление',
    updateNow: 'Обновить',
    updateLater: 'Позже',
    vcamStartedV4l2: 'Виртуальная камера запущена ({0}) через v4l2loopback',
    vcamNoLoopback: 'Устройство v4l2loopback не найдено. Выполните: sudo modprobe v4l2loopback exclusive_caps=1 card_label="ASCII Art Camera" (exclusive_caps=1 обязателен — иначе Discord/браузеры камеру не увидят)',

    savingAs: 'Сохранение как {0}...',
    canvasContextError: 'Canvas context недоступен',
    blobCreateError: 'Не удалось создать image blob',
    urlCopied: 'URL скопирован!',
    
    numInputMinValue: 'Минимальное значение: {0}',
    numInputMaxValue: 'Максимальное значение: {0}',
    
    ffmpegNotFound: 'FFmpeg не найден',
    ffmpegNotFoundDesc: 'Для работы с видео требуется FFmpeg. Установить автоматически или скачать вручную?',
    ffmpegInstallAuto: 'Установить автоматически',
    ffmpegInstallManual: 'Скачать вручную',
    ffmpegInstalling: 'Установка FFmpeg...',
    ffmpegInstallSuccess: 'FFmpeg успешно установлен! Перезапустите приложение.',
    ffmpegInstallError: 'Ошибка установки FFmpeg: {0}',
    ffmpegDownloadFrom: 'Скачайте FFmpeg с',
    
    themeNameLabel: 'Название',
    themeNameDefault: 'Моя тема',
    themeBgApp: 'Фон приложения',
    themeBgSidebar: 'Фон боковой панели',
    themeAccent: 'Акцентный цвет',
    themeTextPrimary: 'Основной текст',
    themeTextMuted: 'Приглушённый текст',
    themeBorder: 'Границы',
    
    defaultTextInput: 'ASCII ИСКУССТВО',
    
    fileMarkdown: 'Файл Markdown',
    fileText: 'Текстовый файл',
    fileHtml: 'HTML файл',
    fileAnimatedGif: 'Анимированный GIF',
    fileMp4Video: 'MP4 видео',
  },
  en: {
    appTitle: 'ASCII Art Studio',
    openImage: 'Image', openVideo: 'Video / GIF',
    execute: 'Execute', save: 'Save', processing: 'Processing...',
    geometry: 'Geometry & Light', width: 'Width', fontRatio: 'Font Ratio',
    brightness: 'Brightness', contrast: 'Contrast', gamma: 'Gamma',
    symbols: 'Symbols & Render', colorRender: 'HTML Color Render',
    invert: 'Invert (Negative)', dithering: 'Dithering (Floyd–Steinberg)', viewport: 'Viewport', bgColor: 'Background Color',
    player: 'ASCII Player', settings: 'Settings', theme: 'Theme', font: 'Font',
    language: 'Language', resetDefaults: 'Reset Defaults',
    saveSettings: 'Save Settings',
    formatTitle: 'Choose save format',
    formatSubImage: 'Select format for ASCII art',
    formatSubVideo: 'Select output format',
    gifAnim: 'Animated GIF', mp4Video: 'MP4 Video',
    coloredHtml: 'Colored HTML', textTxt: 'Plain TXT', cancel: 'Cancel',
    loaded: 'Loaded', done: 'Done', error: 'Error', framesAt: 'frames @',
    renderMp4: 'Rendering MP4...', renderGif: 'Rendering GIF...', saved: 'Saved',
    paletteStandard: 'Standard (10)', paletteUltra: 'Ultra (92)',
    paletteDetailed: 'Detailed (70)', paletteBlocks: 'Blocks ░▒▓█',
    paletteBinary: 'Binary 0/1',
    paletteBraille: 'Braille ⠿⣿',
    waitingInput: '[SYSTEM] Waiting for input.\nLoad a file and press Execute.',
    ctrlZoom: 'Ctrl + Scroll to zoom.',
    settingsTitle: 'Application Settings',
    splashInit: 'Initializing...', splashFonts: 'Loading fonts...',
    splashTheme: 'Applying theme...', splashLang: 'Loading localization...',
    splashConfig: 'Reading configuration...', splashWebview: 'Initializing WebView...',
    splashReady: 'Ready!',
    s_showStars: 'Show background stars',
    s_autoPlay: 'Auto-play video',
    s_defaultWidth: 'Default width',
    s_defaultPalette: 'Default palette',
    s_defaultFontRatio: 'Default font ratio',
    s_defaultBg: 'Default background color',
    s_defaultZoom: 'Default zoom',
    uploadFont: 'Upload custom font',
    customTheme: 'Custom theme',
    themeEditor: 'Theme editor',
    themeNames: THEME_NAMES_EN,
    s_starsCount: 'Stars Count',
    s_starsMinSize: 'Min Star Size',
    s_starsMaxSize: 'Max Star Size',
    s_starsColor: 'Stars Color',
    virtualCameraPort: 'Virtual Camera Port',
    copyUrl: 'Copy URL',
    textToAscii: 'Text to ASCII',
    webcamToAscii: 'Webcam to ASCII',
    imageMode: 'Media',
    textMode: 'Text',
    webcamMode: 'Camera',
    scriptsMode: 'Scripts',
    scriptsPanelTitle: 'Axium Scripts',
    scriptNewBtn: 'New',
    scriptRunBtn: 'Run',
    scriptRunning: 'Running...',
    scriptSaveBtn: 'Save',
    scriptSaveAsPrompt: 'Script name:',
    scriptDllMissing: 'axium_vm not found — scripts tab unavailable',
    scriptPickLibBtn: 'Locate engine file...',
    scriptNoScripts: 'No saved scripts',
    scriptConsolePlaceholder: 'Script output will appear here after running',
    scriptDeleteConfirm: 'Delete script "{0}"?',
    scriptDefaultGreeting: 'Hello from Axium!',
    scriptDocsBtn: 'API Reference',
    docsTitle: 'Script API',
    docsSubtitle: 'Native functions available to Axium scripts',
    docsEmpty: 'No API available (engine not loaded).',
    docsSyntaxTitle: 'Syntax',
    docsExampleTitle: 'Example',
    enterText: 'Enter text...',
    selectFont: 'Select Font',
    fontLayout: 'Font Layout',
    startCamera: 'Start Camera',
    stopCamera: 'Stop Camera',
    startRecord: 'Record Video',
    stopRecord: 'Stop Recording',
    recordingActive: 'Recording...',
    copyClipboard: 'Copy to Clipboard',
    copied: 'Copied to clipboard!',
    backToMain: 'Back to Generation',
    downloadingFont: 'Downloading Font...',
    fontPreviewText: 'Preview',
    startVirtualCam: 'Start Virtual Camera',
    stopVirtualCam: 'Stop Virtual Camera',
    virtualCamActive: 'Virtual Camera Active',
    camErrorNotSupported: 'Browser API does not support camera access',
    camErrorNoStream: 'Failed to get camera stream',
    camErrorNotAllowed: 'Camera access denied. Check system permissions.',
    camErrorNotFound: 'Camera not found. Connect a webcam and try again.',
    camErrorNotReadable: 'Camera is being used by another application.',
    camErrorOverConstrained: 'Camera does not support requested parameters.',
    camErrorSecurity: 'Security error. HTTPS may be required.',
    camErrorGeneric: 'Camera access error',
    cameraLoading: 'Loading camera...',
    cameraStopped: 'Camera stopped.',
    
    enableCameraFirst: 'Please enable camera first!',
    canvasNotReady: 'Canvas not ready. Try again.',
    tryAgain: 'Try again',
    resolution: 'Resolution',
    virtualCameraError: 'Virtual camera error',
    savingWebcamVideo: 'Saving webcam recording...',
    recordingComplete: 'Recording complete! Press "Execute" to generate ASCII video.',
    recordingError: 'Error saving video',
    recordingStarted: 'Recording webcam...',
    
    loadingPreview: 'Loading preview...',
    previewError: 'Preview generation error',
    errorLabel: 'Error',
    
    commentCaching: 'Caching and loading fonts',
    commentWebcam: 'Real-time webcam',
    commentVirtualCamera: 'Virtual camera controls',
    commentLoading: 'Loading',
    commentSaving: 'Saving',
    commentHiddenElements: 'Hidden camera elements',
    
    cameraStartedWebAPI: 'Camera started',
    cameraStartedNative: 'Camera started',
    
    framesLabel: 'frames',
    symbolsLabel: 'symbols',
    
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore',
    close: 'Close',
    
    formatSubText: 'Select format to save',
    markdownMd: 'Markdown',
    pngImage: 'PNG Image',
    gifImage: 'GIF Image',
    
    errFileOpen: 'Failed to open file: {0}',
    errPaletteMin: 'Palette must contain at least 2 characters',
    errFFmpegNotFound: 'FFmpeg not found in PATH. Install: https://ffmpeg.org/',
    errTempDir: 'Failed to create temp directory: {0}',
    errNoFrames: 'Failed to extract any frames',
    errFrameOpen: 'Error opening frame: {0}',
    errFFmpeg: 'FFmpeg error: {0}',
    errFFmpegExtract: 'FFmpeg failed to extract frames',
    errNoFramesProcess: 'No frames to process',
    errFont: 'Font error: {0}',
    errFirstFrame: 'First frame error: {0}',
    errFrameN: 'Frame {0}: {1}',
    errSaveFrame: 'Error saving frame {0}: {1}',
    errFFmpegEncode: 'FFmpeg failed to encode video',
    videoComplete: 'Done! Frames: {0} | FPS: {1} | Size: {2}\nSaved: {3}',
    errWriteFile: 'Write error \'{0}\': {1}',
    errSaveImage: 'Failed to save image: {0}',
    imageSaved: 'Saved: {0}',
    errInvalidRGB: 'Invalid RGB data',
    errInvalidImageData: 'Invalid image data',
    vcamNotRunning: 'Virtual camera not running',
    vcamNotStarted: 'Virtual camera not started',
    vcamBusy: 'Virtual camera is already in use by another application',
    vcamStartedSoftcam: 'Virtual camera started ({0}) — "DirectShow Softcam" is now visible in Discord/Zoom/OBS',
    vcamRegistered: 'Virtual camera driver installed! Now start the camera.',
    vcamRegisterDenied: 'Driver installation cancelled (administrator rights required)',
    vcamRegisterFailed: 'Failed to register virtual camera driver',
    vcamInstallPrompt: 'Install the virtual camera driver? The camera will appear in Discord, Zoom, OBS as a real device. Administrator rights required (Windows: softcam, Linux: v4l2loopback module).',
    vcamInstallBtn: 'Install camera driver',
    updateAvailable: 'Update available',
    updateNow: 'Update',
    updateLater: 'Later',
    vcamStartedV4l2: 'Virtual camera started ({0}) via v4l2loopback',
    vcamNoLoopback: 'v4l2loopback device not found. Run: sudo modprobe v4l2loopback exclusive_caps=1 card_label="ASCII Art Camera" (exclusive_caps=1 is required — Discord/browsers will not list the camera without it)',

    savingAs: 'Saving as {0}...',
    canvasContextError: 'Canvas context not available',
    blobCreateError: 'Failed to create image blob',
    urlCopied: 'URL copied!',
    
    numInputMinValue: 'Minimum value: {0}',
    numInputMaxValue: 'Maximum value: {0}',
    
    ffmpegNotFound: 'FFmpeg Not Found',
    ffmpegNotFoundDesc: 'FFmpeg is required for video processing. Install automatically or download manually?',
    ffmpegInstallAuto: 'Install Automatically',
    ffmpegInstallManual: 'Download Manually',
    ffmpegInstalling: 'Installing FFmpeg...',
    ffmpegInstallSuccess: 'FFmpeg successfully installed! Please restart the application.',
    ffmpegInstallError: 'FFmpeg installation error: {0}',
    ffmpegDownloadFrom: 'Download FFmpeg from',
    
    themeNameLabel: 'Name',
    themeNameDefault: 'My Theme',
    themeBgApp: 'App Background',
    themeBgSidebar: 'Sidebar Background',
    themeAccent: 'Accent Color',
    themeTextPrimary: 'Primary Text',
    themeTextMuted: 'Muted Text',
    themeBorder: 'Borders',
    
    defaultTextInput: 'ASCII ART',
    
    fileMarkdown: 'Markdown File',
    fileText: 'Text File',
    fileHtml: 'HTML File',
    fileAnimatedGif: 'Animated GIF',
    fileMp4Video: 'MP4 Video',
  },
  // Остальные языки — копируем EN и меняем нужное
  de: { appTitle:'ASCII Art Studio', openImage:'Bild', openVideo:'Video / GIF',
    execute:'Ausführen', save:'Speichern', processing:'Verarbeitung...',
    geometry:'Geometrie & Licht', width:'Breite', fontRatio:'Schriftverhältnis',
    brightness:'Helligkeit', contrast:'Kontrast', gamma:'Gamma',
    symbols:'Symbole & Render', colorRender:'HTML Farb-Render',
    invert:'Invertieren', dithering:'Dithering (Floyd–Steinberg)', viewport:'Ansicht', bgColor:'Hintergrundfarbe',
    player:'ASCII-Player', settings:'Einstellungen', theme:'Thema', font:'Schrift',
    language:'Sprache', resetDefaults:'Zurücksetzen', saveSettings:'Speichern',
    formatTitle:'Format wählen', formatSubImage:'ASCII Format', formatSubVideo:'Ausgabeformat',
    gifAnim:'Animiertes GIF', mp4Video:'MP4-Video', coloredHtml:'Farbiges HTML',
    textTxt:'Text TXT', cancel:'Abbrechen', loaded:'Geladen', done:'Fertig',
    error:'Fehler', framesAt:'Frames @', renderMp4:'Rendere MP4...',
    renderGif:'Rendere GIF...', saved:'Gespeichert',
    paletteStandard:'Standard (10)', paletteUltra:'Ultra (92)',
    paletteDetailed:'Detailliert (70)', paletteBlocks:'Blöcke ░▒▓█',
    paletteBinary:'Binär 0/1',
    waitingInput:'[SYSTEM] Warte auf Eingabe.\nDatei laden und Ausführen.',
    ctrlZoom:'Strg + Rad zum Zoomen.', settingsTitle:'Einstellungen',
    splashInit:'Initialisierung...', splashFonts:'Schriften laden...',
    splashTheme:'Thema anwenden...', splashLang:'Lokalisierung laden...',
    splashConfig:'Konfiguration lesen...', splashWebview:'WebView init...',
    splashReady:'Bereit!',
    s_showStars:'Sterne anzeigen',
    s_autoPlay:'Autoplay',
    s_defaultWidth:'Standardbreite', s_defaultPalette:'Standard-Palette',
    s_defaultFontRatio:'Standard-Schriftverhältnis',
    s_defaultBg:'Standard-Hintergrund',
    s_defaultZoom:'Standard-Zoom',
    uploadFont:'Schrift hochladen',
    customTheme:'Eigenes Thema', themeEditor:'Themen-Editor',
    themeNames: THEME_NAMES_EN,
    startVirtualCam: 'Virtuelle Kamera starten',
    stopVirtualCam: 'Virtuelle Kamera stoppen',
    virtualCamActive: 'Virtuelle Kamera aktiv',
    cameraLoading: 'Kamera wird geladen...',
    cameraStopped: 'Kamera gestoppt.',
    
    enableCameraFirst: 'Bitte zuerst Kamera aktivieren!',
    canvasNotReady: 'Canvas nicht bereit. Erneut versuchen.',
    tryAgain: 'Erneut versuchen',
    resolution: 'Auflösung',
    virtualCameraError: 'Virtueller Kamerafehler',
    savingWebcamVideo: 'Webcam-Aufnahme wird gespeichert...',
    recordingComplete: 'Aufnahme abgeschlossen! Drücken Sie "Ausführen" für ASCII-Video.',
    recordingError: 'Fehler beim Speichern',
    recordingStarted: 'Webcam-Aufnahme läuft...',
    loadingPreview: 'Vorschau wird geladen...',
    previewError: 'Vorschau-Fehler',
    errorLabel: 'Fehler',
    cameraStartedWebAPI: 'Kamera gestartet',
    cameraStartedNative: 'Kamera gestartet',
    framesLabel: 'Frames',
    symbolsLabel: 'Symbole',
    
    minimize: 'Minimieren',
    maximize: 'Maximieren',
    restore: 'Wiederherstellen',
    close: 'Schließen',
    
    formatSubText: 'Format auswählen',
    markdownMd: 'Markdown',
    pngImage: 'PNG-Bild',
    gifImage: 'GIF-Bild',
    
    errFileOpen: 'Datei öffnen fehlgeschlagen: {0}',
    errPaletteMin: 'Palette muss mindestens 2 Zeichen enthalten',
    errFFmpegNotFound: 'FFmpeg nicht gefunden. Installieren: https://ffmpeg.org/',
    errTempDir: 'Temp-Verzeichnis erstellen fehlgeschlagen: {0}',
    errNoFrames: 'Keine Frames extrahiert',
    errFrameOpen: 'Frame-Fehler: {0}',
    errFFmpeg: 'FFmpeg-Fehler: {0}',
    errFFmpegExtract: 'FFmpeg konnte Frames nicht extrahieren',
    errNoFramesProcess: 'Keine Frames zum Verarbeiten',
    errFont: 'Schriftart-Fehler: {0}',
    errFirstFrame: 'Erster Frame-Fehler: {0}',
    errFrameN: 'Frame {0}: {1}',
    errSaveFrame: 'Frame {0} speichern fehlgeschlagen: {1}',
    errFFmpegEncode: 'FFmpeg konnte Video nicht kodieren',
    videoComplete: 'Fertig! Frames: {0} | FPS: {1} | Größe: {2}\nGespeichert: {3}',
    errWriteFile: 'Schreibfehler \'{0}\': {1}',
    errSaveImage: 'Bild speichern fehlgeschlagen: {0}',
    imageSaved: 'Gespeichert: {0}',
    errInvalidRGB: 'Ungültige RGB-Daten',
    errInvalidImageData: 'Ungültige Bilddaten',
    vcamNotRunning: 'Virtuelle Kamera läuft nicht',
    vcamNotStarted: 'Virtuelle Kamera nicht gestartet',
    
    savingAs: 'Speichern als {0}...',
    canvasContextError: 'Canvas-Kontext nicht verfügbar',
    blobCreateError: 'Bild-Blob konnte nicht erstellt werden',
    urlCopied: 'URL kopiert!',
    
    numInputMinValue: 'Mindestwert: {0}',
    numInputMaxValue: 'Höchstwert: {0}',
    
    ffmpegNotFound: 'FFmpeg nicht gefunden',
    ffmpegNotFoundDesc: 'FFmpeg ist für die Videoverarbeitung erforderlich. Automatisch installieren oder manuell herunterladen?',
    ffmpegInstallAuto: 'Automatisch installieren',
    ffmpegInstallManual: 'Manuell herunterladen',
    ffmpegInstalling: 'FFmpeg wird installiert...',
    ffmpegInstallSuccess: 'FFmpeg erfolgreich installiert! Bitte starten Sie die Anwendung neu.',
    ffmpegInstallError: 'FFmpeg-Installationsfehler: {0}',
    ffmpegDownloadFrom: 'FFmpeg herunterladen von',
    
    themeNameLabel: 'Name',
    themeNameDefault: 'Mein Thema',
    themeBgApp: 'App-Hintergrund',
    themeBgSidebar: 'Seitenleisten-Hintergrund',
    themeAccent: 'Akzentfarbe',
    themeTextPrimary: 'Primärtext',
    themeTextMuted: 'Gedämpfter Text',
    themeBorder: 'Rahmen',
    
    defaultTextInput: 'ASCII KUNST',
    
    fileMarkdown: 'Markdown-Datei',
    fileText: 'Textdatei',
    fileHtml: 'HTML-Datei',
    fileAnimatedGif: 'Animiertes GIF',
    fileMp4Video: 'MP4-Video',
  },
  fr: { appTitle:'ASCII Art Studio', openImage:'Image', openVideo:'Vidéo / GIF',
    execute:'Exécuter', save:'Enregistrer', processing:'Traitement...',
    geometry:'Géométrie & Lumière', width:'Largeur', fontRatio:'Rapport police',
    brightness:'Luminosité', contrast:'Contraste', gamma:'Gamma',
    symbols:'Symboles & Rendu', colorRender:'Rendu HTML couleur',
    invert:'Inverser', dithering:'Tramage (Floyd–Steinberg)', viewport:'Fenêtre', bgColor:'Couleur fond',
    player:'Lecteur ASCII', settings:'Paramètres', theme:'Thème', font:'Police',
    language:'Langue', resetDefaults:'Réinitialiser', saveSettings:'Enregistrer',
    formatTitle:'Choisir format', formatSubImage:'Format ASCII', formatSubVideo:'Format sortie',
    gifAnim:'GIF animé', mp4Video:'Vidéo MP4', coloredHtml:'HTML coloré',
    textTxt:'Texte TXT', cancel:'Annuler', loaded:'Chargé', done:'Terminé',
    error:'Erreur', framesAt:'images @', renderMp4:'Rendu MP4...',
    renderGif:'Rendu GIF...', saved:'Enregistré',
    paletteStandard:'Standard (10)', paletteUltra:'Ultra (92)',
    paletteDetailed:'Détaillé (70)', paletteBlocks:'Blocs ░▒▓█',
    paletteBinary:'Binaire 0/1',
    waitingInput:'[SYSTÈME] En attente.\nChargez un fichier.',
    ctrlZoom:'Ctrl + Molette pour zoomer.', settingsTitle:'Paramètres',
    splashInit:'Initialisation...', splashFonts:'Chargement polices...',
    splashTheme:'Application thème...', splashLang:'Chargement localisation...',
    splashConfig:'Lecture configuration...', splashWebview:'Init WebView...',
    splashReady:'Prêt!',
    s_showStars:'Afficher étoiles',
    s_autoPlay:'Lecture auto',
    s_defaultWidth:'Largeur défaut', s_defaultPalette:'Palette défaut',
    s_defaultFontRatio:'Rapport police défaut',
    s_defaultBg:'Fond défaut',
    s_defaultZoom:'Zoom défaut',
    uploadFont:'Charger police',
    customTheme:'Thème personnalisé', themeEditor:'Éditeur de thème',
    themeNames: THEME_NAMES_EN,
    startVirtualCam: 'Démarrer caméra virtuelle',
    stopVirtualCam: 'Arrêter caméra virtuelle',
    virtualCamActive: 'Caméra virtuelle active',
    cameraLoading: 'Chargement caméra...',
    cameraStopped: 'Caméra arrêtée.',
    
    enableCameraFirst: 'Activez d\'abord la caméra!',
    canvasNotReady: 'Canvas non prêt. Réessayez.',
    tryAgain: 'Réessayer',
    resolution: 'Résolution',
    virtualCameraError: 'Erreur caméra virtuelle',
    savingWebcamVideo: 'Enregistrement webcam en cours...',
    recordingComplete: 'Enregistrement terminé! Appuyez sur "Exécuter" pour générer une vidéo ASCII.',
    recordingError: 'Erreur d\'enregistrement',
    recordingStarted: 'Enregistrement webcam...',
    loadingPreview: 'Chargement aperçu...',
    previewError: 'Erreur d\'aperçu',
    errorLabel: 'Erreur',
    cameraStartedWebAPI: 'Caméra démarrée',
    cameraStartedNative: 'Caméra démarrée',
    framesLabel: 'images',
    symbolsLabel: 'symboles',
    
    minimize: 'Réduire',
    maximize: 'Agrandir',
    restore: 'Restaurer',
    close: 'Fermer',
    
    formatSubText: 'Choisir le format',
    markdownMd: 'Markdown',
    pngImage: 'Image PNG',
    gifImage: 'Image GIF',
    
    errFileOpen: 'Échec d\'ouverture du fichier: {0}',
    errPaletteMin: 'La palette doit contenir au moins 2 caractères',
    errFFmpegNotFound: 'FFmpeg introuvable. Installer: https://ffmpeg.org/',
    errTempDir: 'Échec de création du répertoire temp: {0}',
    errNoFrames: 'Aucune image extraite',
    errFrameOpen: 'Erreur d\'ouverture de l\'image: {0}',
    errFFmpeg: 'Erreur FFmpeg: {0}',
    errFFmpegExtract: 'FFmpeg n\'a pas pu extraire les images',
    errNoFramesProcess: 'Aucune image à traiter',
    errFont: 'Erreur de police: {0}',
    errFirstFrame: 'Erreur première image: {0}',
    errFrameN: 'Image {0}: {1}',
    errSaveFrame: 'Erreur de sauvegarde image {0}: {1}',
    errFFmpegEncode: 'FFmpeg n\'a pas pu encoder la vidéo',
    videoComplete: 'Terminé! Images: {0} | FPS: {1} | Taille: {2}\nEnregistré: {3}',
    errWriteFile: 'Erreur d\'écriture \'{0}\': {1}',
    errSaveImage: 'Échec de sauvegarde de l\'image: {0}',
    imageSaved: 'Enregistré: {0}',
    errInvalidRGB: 'Données RGB invalides',
    errInvalidImageData: 'Données d\'image invalides',
    vcamNotRunning: 'Caméra virtuelle non active',
    vcamNotStarted: 'Caméra virtuelle non démarrée',
    
    savingAs: 'Enregistrement en {0}...',
    canvasContextError: 'Contexte Canvas non disponible',
    blobCreateError: 'Échec de création du blob d\'image',
    urlCopied: 'URL copiée!',
    
    numInputMinValue: 'Valeur minimale: {0}',
    numInputMaxValue: 'Valeur maximale: {0}',
    
    ffmpegNotFound: 'FFmpeg introuvable',
    ffmpegNotFoundDesc: 'FFmpeg est requis pour le traitement vidéo. Installer automatiquement ou télécharger manuellement?',
    ffmpegInstallAuto: 'Installer automatiquement',
    ffmpegInstallManual: 'Télécharger manuellement',
    ffmpegInstalling: 'Installation de FFmpeg...',
    ffmpegInstallSuccess: 'FFmpeg installé avec succès! Veuillez redémarrer l\'application.',
    ffmpegInstallError: 'Erreur d\'installation FFmpeg: {0}',
    ffmpegDownloadFrom: 'Télécharger FFmpeg depuis',
    
    themeNameLabel: 'Nom',
    themeNameDefault: 'Mon thème',
    themeBgApp: 'Arrière-plan de l\'application',
    themeBgSidebar: 'Arrière-plan de la barre latérale',
    themeAccent: 'Couleur d\'accentuation',
    themeTextPrimary: 'Texte principal',
    themeTextMuted: 'Texte atténué',
    themeBorder: 'Bordures',
    
    defaultTextInput: 'ART ASCII',
    
    fileMarkdown: 'Fichier Markdown',
    fileText: 'Fichier texte',
    fileHtml: 'Fichier HTML',
    fileAnimatedGif: 'GIF animé',
    fileMp4Video: 'Vidéo MP4',
  },
  zh: { appTitle:'ASCII艺术工作室', openImage:'图像', openVideo:'视频/GIF',
    execute:'执行', save:'保存', processing:'处理中...',
    geometry:'几何与光线', width:'宽度', fontRatio:'字体比例',
    brightness:'亮度', contrast:'对比度', gamma:'伽马',
    symbols:'符号与渲染', colorRender:'HTML彩色渲染',
    invert:'反转', dithering:'抖动 (Floyd–Steinberg)', viewport:'视口', bgColor:'背景颜色',
    player:'ASCII播放器', settings:'设置', theme:'主题', font:'字体',
    language:'语言', resetDefaults:'重置', saveSettings:'保存设置',
    formatTitle:'选择格式', formatSubImage:'ASCII格式', formatSubVideo:'输出格式',
    gifAnim:'动态GIF', mp4Video:'MP4视频', coloredHtml:'彩色HTML',
    textTxt:'文本TXT', cancel:'取消', loaded:'已加载', done:'完成',
    error:'错误', framesAt:'帧 @', renderMp4:'渲染MP4...', renderGif:'渲染GIF...',
    saved:'已保存', paletteStandard:'标准(10)', paletteUltra:'超级(92)',
    paletteDetailed:'详细(70)', paletteBlocks:'块 ░▒▓█', paletteBinary:'二进制 0/1',
    waitingInput:'[系统] 等待输入。\n加载文件并点击执行。',
    ctrlZoom:'Ctrl+滚轮缩放。', settingsTitle:'程序设置',
    splashInit:'初始化...', splashFonts:'加载字体...',
    splashTheme:'应用主题...', splashLang:'加载本地化...',
    splashConfig:'读取配置...', splashWebview:'初始化WebView...',
    splashReady:'就绪！',
    s_showStars:'显示星星', s_autoPlay:'自动播放',
    s_defaultWidth:'默认宽度', s_defaultPalette:'默认调色板',
    s_defaultFontRatio:'默认字体比例',
    s_defaultBg:'默认背景色',
    s_defaultZoom:'默认缩放',
    uploadFont:'上传字体',
    customTheme:'自定义主题', themeEditor:'主题编辑器',
    themeNames: THEME_NAMES_EN,
    startVirtualCam: '启动虚拟摄像头',
    stopVirtualCam: '停止虚拟摄像头',
    virtualCamActive: '虚拟摄像头已激活',
    cameraLoading: '正在加载摄像头...',
    cameraStopped: '摄像头已停止。',
    enableCameraFirst: '请先启用摄像头！',
    canvasNotReady: 'Canvas未就绪。请重试。',
    tryAgain: '重试',
    resolution: '分辨率',
    virtualCameraError: '虚拟摄像头错误',
    savingWebcamVideo: '正在保存网络摄像头录像...',
    recordingComplete: '录制完成！按"执行"生成ASCII视频。',
    recordingError: '保存视频错误',
    recordingStarted: '正在录制网络摄像头...',
    loadingPreview: '正在加载预览...',
    previewError: '预览错误',
    errorLabel: '错误',
    cameraStartedWebAPI: '摄像头已启动',
    cameraStartedNative: '摄像头已启动',
    framesLabel: '帧',
    symbolsLabel: '符号',
    
    minimize: '最小化',
    maximize: '最大化',
    restore: '还原',
    close: '关闭',
    
    formatSubText: '选择格式',
    markdownMd: 'Markdown',
    pngImage: 'PNG图像',
    gifImage: 'GIF图像',
    
    errFileOpen: '打开文件失败: {0}',
    errPaletteMin: '调色板必须包含至少2个字符',
    errFFmpegNotFound: '未找到FFmpeg. 安装: https://ffmpeg.org/',
    errTempDir: '创建临时目录失败: {0}',
    errNoFrames: '未提取到帧',
    errFrameOpen: '打开帧错误: {0}',
    errFFmpeg: 'FFmpeg错误: {0}',
    errFFmpegExtract: 'FFmpeg提取帧失败',
    errNoFramesProcess: '没有帧可处理',
    errFont: '字体错误: {0}',
    errFirstFrame: '第一帧错误: {0}',
    errFrameN: '帧 {0}: {1}',
    errSaveFrame: '保存帧 {0} 错误: {1}',
    errFFmpegEncode: 'FFmpeg编码视频失败',
    videoComplete: '完成! 帧数: {0} | FPS: {1} | 大小: {2}\n已保存: {3}',
    errWriteFile: '写入错误 \'{0}\': {1}',
    errSaveImage: '保存图像失败: {0}',
    imageSaved: '已保存: {0}',
    errInvalidRGB: '无效的RGB数据',
    errInvalidImageData: '无效的图像数据',
    vcamNotRunning: '虚拟摄像头未运行',
    vcamNotStarted: '虚拟摄像头未启动',
    
    savingAs: '正在保存为 {0}...',
    canvasContextError: 'Canvas上下文不可用',
    blobCreateError: '无法创建图像blob',
    urlCopied: 'URL已复制!',
    
    numInputMinValue: '最小值: {0}',
    numInputMaxValue: '最大值: {0}',
    
    ffmpegNotFound: '未找到FFmpeg',
    ffmpegNotFoundDesc: '视频处理需要FFmpeg。自动安装还是手动下载？',
    ffmpegInstallAuto: '自动安装',
    ffmpegInstallManual: '手动下载',
    ffmpegInstalling: '正在安装FFmpeg...',
    ffmpegInstallSuccess: 'FFmpeg安装成功！请重启应用程序。',
    ffmpegInstallError: 'FFmpeg安装错误：{0}',
    ffmpegDownloadFrom: '从以下地址下载FFmpeg',
    
    themeNameLabel: '名称',
    themeNameDefault: '我的主题',
    themeBgApp: '应用背景',
    themeBgSidebar: '侧边栏背景',
    themeAccent: '强调色',
    themeTextPrimary: '主要文本',
    themeTextMuted: '柔和文本',
    themeBorder: '边框',
    
    defaultTextInput: 'ASCII 艺术',
    
    fileMarkdown: 'Markdown 文件',
    fileText: '文本文件',
    fileHtml: 'HTML 文件',
    fileAnimatedGif: '动态 GIF',
    fileMp4Video: 'MP4 视频',
  },
  ja: { appTitle:'ASCIIアートスタジオ', openImage:'画像', openVideo:'動画/GIF',
    execute:'実行', save:'保存', processing:'処理中...',
    geometry:'ジオメトリと光', width:'幅', fontRatio:'フォント比率',
    brightness:'明るさ', contrast:'コントラスト', gamma:'ガンマ',
    symbols:'シンボルとレンダー', colorRender:'HTMLカラーレンダー',
    invert:'反転', dithering:'ディザリング (Floyd–Steinberg)', viewport:'ビューポート', bgColor:'背景色',
    player:'ASCIIプレーヤー', settings:'設定', theme:'テーマ', font:'フォント',
    language:'言語', resetDefaults:'リセット', saveSettings:'設定を保存',
    formatTitle:'保存形式を選択', formatSubImage:'ASCII形式', formatSubVideo:'出力形式',
    gifAnim:'アニメGIF', mp4Video:'MP4動画', coloredHtml:'カラーHTML',
    textTxt:'テキストTXT', cancel:'キャンセル', loaded:'読込完了', done:'完了',
    error:'エラー', framesAt:'フレーム @', renderMp4:'MP4レンダリング...',
    renderGif:'GIFレンダリング...', saved:'保存済み',
    paletteStandard:'標準(10)', paletteUltra:'ウルトラ(92)',
    paletteDetailed:'詳細(70)', paletteBlocks:'ブロック ░▒▓█',
    paletteBinary:'バイナリ 0/1',
    waitingInput:'[SYSTEM] 入力待ち。\nファイルを読み込んでください。',
    ctrlZoom:'Ctrl+スクロールでズーム。', settingsTitle:'プログラム設定',
    splashInit:'初期化中...', splashFonts:'フォント読込...',
    splashTheme:'テーマ適用...', splashLang:'ローカライゼーション読込...',
    splashConfig:'設定読込...', splashWebview:'WebView初期化...',
    splashReady:'準備完了！',
    s_showStars:'星を表示', s_autoPlay:'自動再生',
    s_defaultWidth:'デフォルト幅',
    s_defaultPalette:'デフォルトパレット', s_defaultFontRatio:'デフォルトフォント比率',
    s_defaultBg:'デフォルト背景色', s_defaultZoom:'デフォルトズーム',
    uploadFont:'フォントをアップロード', customTheme:'カスタムテーマ',
    themeEditor:'テーマエディター', themeNames: THEME_NAMES_EN,
    startVirtualCam: '仮想カメラを開始',
    stopVirtualCam: '仮想カメラを停止',
    virtualCamActive: '仮想カメラ有効',
    cameraLoading: 'カメラを読み込み中...',
    cameraStopped: 'カメラが停止しました。',
    enableCameraFirst: '先にカメラを有効にしてください！',
    canvasNotReady: 'Canvas準備ができていません。再試行してください。',
    tryAgain: '再試行',
    resolution: '解像度',
    virtualCameraError: '仮想カメラエラー',
    savingWebcamVideo: 'ウェブカメラ録画を保存中...',
    recordingComplete: '録画完了！「実行」を押してASCIIビデオを生成します。',
    recordingError: 'ビデオ保存エラー',
    recordingStarted: 'ウェブカメラ録画中...',
    loadingPreview: 'プレビュー読み込み中...',
    previewError: 'プレビューエラー',
    errorLabel: 'エラー',
    cameraStartedWebAPI: 'カメラ開始',
    cameraStartedNative: 'カメラ開始',
    framesLabel: 'フレーム',
    symbolsLabel: 'シンボル',
    
    minimize: '最小化',
    maximize: '最大化',
    restore: '復元',
    close: '閉じる',
    
    formatSubText: '保存形式を選択',
    markdownMd: 'Markdown',
    pngImage: 'PNG画像',
    gifImage: 'GIF画像',
    
    errFileOpen: 'ファイルを開けませんでした: {0}',
    errPaletteMin: 'パレットには最低2文字必要です',
    errFFmpegNotFound: 'FFmpegが見つかりません。インストール: https://ffmpeg.org/',
    errTempDir: '一時ディレクトリの作成に失敗: {0}',
    errNoFrames: 'フレームが抽出されませんでした',
    errFrameOpen: 'フレームを開くエラー: {0}',
    errFFmpeg: 'FFmpegエラー: {0}',
    errFFmpegExtract: 'FFmpegフレーム抽出失敗',
    errNoFramesProcess: '処理するフレームがありません',
    errFont: 'フォントエラー: {0}',
    errFirstFrame: '最初のフレームエラー: {0}',
    errFrameN: 'フレーム {0}: {1}',
    errSaveFrame: 'フレーム {0} の保存エラー: {1}',
    errFFmpegEncode: 'FFmpegビデオエンコード失敗',
    videoComplete: '完了! フレーム: {0} | FPS: {1} | サイズ: {2}\n保存: {3}',
    errWriteFile: '書き込みエラー \'{0}\': {1}',
    errSaveImage: '画像保存失敗: {0}',
    imageSaved: '保存済み: {0}',
    errInvalidRGB: '無効なRGBデータ',
    errInvalidImageData: '無効な画像データ',
    vcamNotRunning: '仮想カメラが実行されていません',
    vcamNotStarted: '仮想カメラが起動していません',
    
    savingAs: '{0}として保存中...',
    canvasContextError: 'Canvasコンテキストが利用できません',
    blobCreateError: '画像blobの作成に失敗しました',
    urlCopied: 'URLをコピーしました!',
    
    numInputMinValue: '最小値: {0}',
    numInputMaxValue: '最大値: {0}',
    
    ffmpegNotFound: 'FFmpegが見つかりません',
    ffmpegNotFoundDesc: 'ビデオ処理にはFFmpegが必要です。自動インストールまたは手動ダウンロードしますか？',
    ffmpegInstallAuto: '自動インストール',
    ffmpegInstallManual: '手動ダウンロード',
    ffmpegInstalling: 'FFmpegをインストール中...',
    ffmpegInstallSuccess: 'FFmpegが正常にインストールされました！アプリケーションを再起動してください。',
    ffmpegInstallError: 'FFmpegインストールエラー: {0}',
    ffmpegDownloadFrom: 'FFmpegをダウンロード',
    
    themeNameLabel: '名前',
    themeNameDefault: 'マイテーマ',
    themeBgApp: 'アプリの背景',
    themeBgSidebar: 'サイドバーの背景',
    themeAccent: 'アクセントカラー',
    themeTextPrimary: 'プライマリテキスト',
    themeTextMuted: 'ミュートテキスト',
    themeBorder: 'ボーダー',
    
    defaultTextInput: 'ASCII アート',
    
    fileMarkdown: 'Markdownファイル',
    fileText: 'テキストファイル',
    fileHtml: 'HTMLファイル',
    fileAnimatedGif: 'アニメーションGIF',
    fileMp4Video: 'MP4ビデオ',
  },
  es: { appTitle:'ASCII Art Studio', openImage:'Imagen', openVideo:'Video / GIF',
    execute:'Ejecutar', save:'Guardar', processing:'Procesando...',
    geometry:'Geometría y Luz', width:'Ancho', fontRatio:'Relación fuente',
    brightness:'Brillo', contrast:'Contraste', gamma:'Gamma',
    symbols:'Símbolos y Render', colorRender:'Render HTML color',
    invert:'Invertir', dithering:'Tramado (Floyd–Steinberg)', viewport:'Ventana', bgColor:'Color fondo',
    player:'Reproductor ASCII', settings:'Configuración', theme:'Tema', font:'Fuente',
    language:'Idioma', resetDefaults:'Restablecer', saveSettings:'Guardar config.',
    formatTitle:'Elegir formato', formatSubImage:'Formato ASCII', formatSubVideo:'Formato salida',
    gifAnim:'GIF animado', mp4Video:'Video MP4', coloredHtml:'HTML color',
    textTxt:'Texto TXT', cancel:'Cancelar', loaded:'Cargado', done:'Listo',
    error:'Error', framesAt:'fotogramas @', renderMp4:'Renderizando MP4...',
    renderGif:'Renderizando GIF...', saved:'Guardado',
    paletteStandard:'Estándar (10)', paletteUltra:'Ultra (92)',
    paletteDetailed:'Detallado (70)', paletteBlocks:'Bloques ░▒▓█',
    paletteBinary:'Binario 0/1',
    waitingInput:'[SISTEMA] Esperando.\nCarga un archivo.',
    ctrlZoom:'Ctrl + Rueda para zoom.', settingsTitle:'Configuración',
    splashInit:'Inicializando...', splashFonts:'Cargando fuentes...',
    splashTheme:'Aplicando tema...', splashLang:'Cargando localización...',
    splashConfig:'Leyendo configuración...', splashWebview:'Iniciando WebView...',
    splashReady:'¡Listo!',
    s_showStars:'Mostrar estrellas',
    s_autoPlay:'Reproducción automática',
    s_defaultWidth:'Ancho predeterminado', s_defaultPalette:'Paleta predeterminada',
    s_defaultFontRatio:'Relación fuente predeterminada',
    s_defaultBg:'Fondo predeterminado',
    s_defaultZoom:'Zoom predeterminado',
    uploadFont:'Subir fuente',
    customTheme:'Tema personalizado', themeEditor:'Editor de tema',
    themeNames: THEME_NAMES_EN,
    startVirtualCam: 'Iniciar cámara virtual',
    stopVirtualCam: 'Detener cámara virtual',
    virtualCamActive: 'Cámara virtual activa',
    cameraLoading: 'Cargando cámara...',
    cameraStopped: 'Cámara detenida.',
    enableCameraFirst: '¡Primero active la cámara!',
    canvasNotReady: 'Canvas no está listo. Intente de nuevo.',
    tryAgain: 'Intentar de nuevo',
    resolution: 'Resolución',
    virtualCameraError: 'Error de cámara virtual',
    savingWebcamVideo: 'Guardando grabación de webcam...',
    recordingComplete: '¡Grabación completa! Presione "Ejecutar" para generar video ASCII.',
    recordingError: 'Error al guardar video',
    recordingStarted: 'Grabando webcam...',
    loadingPreview: 'Cargando vista previa...',
    previewError: 'Error de vista previa',
    errorLabel: 'Error',
    cameraStartedWebAPI: 'Cámara iniciada',
    cameraStartedNative: 'Cámara iniciada',
    framesLabel: 'fotogramas',
    symbolsLabel: 'símbolos',
    
    minimize: 'Minimizar',
    maximize: 'Maximizar',
    restore: 'Restaurar',
    close: 'Cerrar',
    
    formatSubText: 'Elegir formato',
    markdownMd: 'Markdown',
    pngImage: 'Imagen PNG',
    gifImage: 'Imagen GIF',
    
    errFileOpen: 'Error al abrir archivo: {0}',
    errPaletteMin: 'La paleta debe contener al menos 2 caracteres',
    errFFmpegNotFound: 'FFmpeg no encontrado. Instalar: https://ffmpeg.org/',
    errTempDir: 'Error al crear directorio temporal: {0}',
    errNoFrames: 'No se extrajeron fotogramas',
    errFrameOpen: 'Error al abrir fotograma: {0}',
    errFFmpeg: 'Error FFmpeg: {0}',
    errFFmpegExtract: 'FFmpeg no pudo extraer fotogramas',
    errNoFramesProcess: 'No hay fotogramas para procesar',
    errFont: 'Error de fuente: {0}',
    errFirstFrame: 'Error primer fotograma: {0}',
    errFrameN: 'Fotograma {0}: {1}',
    errSaveFrame: 'Error al guardar fotograma {0}: {1}',
    errFFmpegEncode: 'FFmpeg no pudo codificar el video',
    videoComplete: '¡Listo! Fotogramas: {0} | FPS: {1} | Tamaño: {2}\nGuardado: {3}',
    errWriteFile: 'Error de escritura \'{0}\': {1}',
    errSaveImage: 'Error al guardar imagen: {0}',
    imageSaved: 'Guardado: {0}',
    errInvalidRGB: 'Datos RGB inválidos',
    errInvalidImageData: 'Datos de imagen inválidos',
    vcamNotRunning: 'Cámara virtual no activa',
    vcamNotStarted: 'Cámara virtual no iniciada',
    
    savingAs: 'Guardando como {0}...',
    canvasContextError: 'Contexto Canvas no disponible',
    blobCreateError: 'Error al crear blob de imagen',
    urlCopied: '¡URL copiada!',
    
    numInputMinValue: 'Valor mínimo: {0}',
    numInputMaxValue: 'Valor máximo: {0}',
    
    ffmpegNotFound: 'FFmpeg no encontrado',
    ffmpegNotFoundDesc: 'FFmpeg es necesario para el procesamiento de video. ¿Instalar automáticamente o descargar manualmente?',
    ffmpegInstallAuto: 'Instalar automáticamente',
    ffmpegInstallManual: 'Descargar manualmente',
    ffmpegInstalling: 'Instalando FFmpeg...',
    ffmpegInstallSuccess: '¡FFmpeg instalado con éxito! Por favor reinicie la aplicación.',
    ffmpegInstallError: 'Error de instalación de FFmpeg: {0}',
    ffmpegDownloadFrom: 'Descargar FFmpeg desde',
    
    themeNameLabel: 'Nombre',
    themeNameDefault: 'Mi tema',
    themeBgApp: 'Fondo de la aplicación',
    themeBgSidebar: 'Fondo de la barra lateral',
    themeAccent: 'Color de acento',
    themeTextPrimary: 'Texto principal',
    themeTextMuted: 'Texto atenuado',
    themeBorder: 'Bordes',
    
    defaultTextInput: 'ARTE ASCII',
    
    fileMarkdown: 'Archivo Markdown',
    fileText: 'Archivo de texto',
    fileHtml: 'Archivo HTML',
    fileAnimatedGif: 'GIF animado',
    fileMp4Video: 'Video MP4',
  },
  pt: { appTitle:'ASCII Art Studio', openImage:'Imagem', openVideo:'Vídeo / GIF',
    execute:'Executar', save:'Salvar', processing:'Processando...',
    geometry:'Geometria e Luz', width:'Largura', fontRatio:'Proporção fonte',
    brightness:'Brilho', contrast:'Contraste', gamma:'Gama',
    symbols:'Símbolos e Render', colorRender:'Render HTML colorido',
    invert:'Inverter', dithering:'Pontilhado (Floyd–Steinberg)', viewport:'Janela', bgColor:'Cor fundo',
    player:'Player ASCII', settings:'Configurações', theme:'Tema', font:'Fonte',
    language:'Idioma', resetDefaults:'Redefinir', saveSettings:'Salvar config.',
    formatTitle:'Escolha o formato', formatSubImage:'Formato ASCII', formatSubVideo:'Formato saída',
    gifAnim:'GIF animado', mp4Video:'Vídeo MP4', coloredHtml:'HTML colorido',
    textTxt:'Texto TXT', cancel:'Cancelar', loaded:'Carregado', done:'Concluído',
    error:'Erro', framesAt:'quadros @', renderMp4:'Renderizando MP4...',
    renderGif:'Renderizando GIF...', saved:'Salvo',
    paletteStandard:'Padrão (10)', paletteUltra:'Ultra (92)',
    paletteDetailed:'Detalhado (70)', paletteBlocks:'Blocos ░▒▓█',
    paletteBinary:'Binário 0/1',
    waitingInput:'[SISTEMA] Aguardando.\nCarregue um arquivo.',
    ctrlZoom:'Ctrl + Roda para zoom.', settingsTitle:'Configurações',
    splashInit:'Inicializando...', splashFonts:'Carregando fontes...',
    splashTheme:'Aplicando tema...', splashLang:'Carregando localização...',
    splashConfig:'Lendo configuração...', splashWebview:'Iniciando WebView...',
    splashReady:'Pronto!',
    s_showStars:'Mostrar estrelas',
    s_autoPlay:'Reprodução automática',
    s_defaultWidth:'Largura padrão', s_defaultPalette:'Paleta padrão',
    s_defaultFontRatio:'Proporção fonte padrão',
    s_defaultBg:'Fundo padrão',
    s_defaultZoom:'Zoom padrão',
    uploadFont:'Carregar fonte',
    customTheme:'Tema personalizado', themeEditor:'Editor de tema',
    themeNames: THEME_NAMES_EN,
    startVirtualCam: 'Iniciar câmera virtual',
    stopVirtualCam: 'Parar câmera virtual',
    virtualCamActive: 'Câmera virtual ativa',
    cameraLoading: 'Carregando câmera...',
    cameraStopped: 'Câmera parada.',
    enableCameraFirst: 'Ative a câmera primeiro!',
    canvasNotReady: 'Canvas não está pronto. Tente novamente.',
    tryAgain: 'Tente novamente',
    resolution: 'Resolução',
    virtualCameraError: 'Erro de câmera virtual',
    savingWebcamVideo: 'Salvando gravação de webcam...',
    recordingComplete: 'Gravação completa! Pressione "Executar" para gerar vídeo ASCII.',
    recordingError: 'Erro ao salvar vídeo',
    recordingStarted: 'Gravando webcam...',
    loadingPreview: 'Carregando visualização...',
    previewError: 'Erro de visualização',
    errorLabel: 'Erro',
    cameraStartedWebAPI: 'Câmera iniciada',
    cameraStartedNative: 'Câmera iniciada',
    framesLabel: 'quadros',
    symbolsLabel: 'símbolos',
    
    minimize: 'Minimizar',
    maximize: 'Maximizar',
    restore: 'Restaurar',
    close: 'Fechar',
    
    formatSubText: 'Selecionar formato',
    markdownMd: 'Markdown',
    pngImage: 'Imagem PNG',
    gifImage: 'Imagem GIF',
    
    errFileOpen: 'Falha ao abrir arquivo: {0}',
    errPaletteMin: 'A paleta deve conter pelo menos 2 caracteres',
    errFFmpegNotFound: 'FFmpeg não encontrado. Instalar: https://ffmpeg.org/',
    errTempDir: 'Falha ao criar diretório temporário: {0}',
    errNoFrames: 'Nenhum quadro extraído',
    errFrameOpen: 'Erro ao abrir quadro: {0}',
    errFFmpeg: 'Erro FFmpeg: {0}',
    errFFmpegExtract: 'FFmpeg falhou ao extrair quadros',
    errNoFramesProcess: 'Nenhum quadro para processar',
    errFont: 'Erro de fonte: {0}',
    errFirstFrame: 'Erro no primeiro quadro: {0}',
    errFrameN: 'Quadro {0}: {1}',
    errSaveFrame: 'Erro ao salvar quadro {0}: {1}',
    errFFmpegEncode: 'FFmpeg falhou ao codificar vídeo',
    videoComplete: 'Concluído! Quadros: {0} | FPS: {1} | Tamanho: {2}\nSalvo: {3}',
    errWriteFile: 'Erro de escrita \'{0}\': {1}',
    errSaveImage: 'Falha ao salvar imagem: {0}',
    imageSaved: 'Salvo: {0}',
    errInvalidRGB: 'Dados RGB inválidos',
    errInvalidImageData: 'Dados de imagem inválidos',
    vcamNotRunning: 'Câmera virtual não está ativa',
    vcamNotStarted: 'Câmera virtual não iniciada',
    
    savingAs: 'Salvando como {0}...',
    canvasContextError: 'Contexto Canvas não disponível',
    blobCreateError: 'Falha ao criar blob de imagem',
    urlCopied: 'URL copiada!',
    
    numInputMinValue: 'Valor mínimo: {0}',
    numInputMaxValue: 'Valor máximo: {0}',
    
    ffmpegNotFound: 'FFmpeg não encontrado',
    ffmpegNotFoundDesc: 'FFmpeg é necessário para processamento de vídeo. Instalar automaticamente ou baixar manualmente?',
    ffmpegInstallAuto: 'Instalar automaticamente',
    ffmpegInstallManual: 'Baixar manualmente',
    ffmpegInstalling: 'Instalando FFmpeg...',
    ffmpegInstallSuccess: 'FFmpeg instalado com sucesso! Por favor reinicie a aplicação.',
    ffmpegInstallError: 'Erro de instalação do FFmpeg: {0}',
    ffmpegDownloadFrom: 'Baixar FFmpeg de',
    
    themeNameLabel: 'Nome',
    themeNameDefault: 'Meu tema',
    themeBgApp: 'Fundo do aplicativo',
    themeBgSidebar: 'Fundo da barra lateral',
    themeAccent: 'Cor de destaque',
    themeTextPrimary: 'Texto principal',
    themeTextMuted: 'Texto atenuado',
    themeBorder: 'Bordas',
    
    defaultTextInput: 'ARTE ASCII',
    
    fileMarkdown: 'Arquivo Markdown',
    fileText: 'Arquivo de texto',
    fileHtml: 'Arquivo HTML',
    fileAnimatedGif: 'GIF animado',
    fileMp4Video: 'Vídeo MP4',
  },
  ko: { appTitle:'ASCII 아트 스튜디오', openImage:'이미지', openVideo:'비디오/GIF',
    execute:'실행', save:'저장', processing:'처리 중...',
    geometry:'기하학 및 빛', width:'너비', fontRatio:'글꼴 비율',
    brightness:'밝기', contrast:'대비', gamma:'감마',
    symbols:'기호 및 렌더', colorRender:'HTML 컬러 렌더',
    invert:'반전', dithering:'디더링 (Floyd–Steinberg)', viewport:'뷰포트', bgColor:'배경색',
    player:'ASCII 플레이어', settings:'설정', theme:'테마', font:'글꼴',
    language:'언어', resetDefaults:'기본값 재설정', saveSettings:'설정 저장',
    formatTitle:'저장 형식 선택', formatSubImage:'ASCII 형식', formatSubVideo:'출력 형식',
    gifAnim:'애니메이션 GIF', mp4Video:'MP4 비디오', coloredHtml:'컬러 HTML',
    textTxt:'텍스트 TXT', cancel:'취소', loaded:'로드됨', done:'완료',
    error:'오류', framesAt:'프레임 @', renderMp4:'MP4 렌더링...',
    renderGif:'GIF 렌더링...', saved:'저장됨',
    paletteStandard:'표준 (10)', paletteUltra:'울트라 (92)',
    paletteDetailed:'상세 (70)', paletteBlocks:'블록 ░▒▓█',
    paletteBinary:'이진 0/1',
    waitingInput:'[시스템] 입력 대기 중.\n파일을 로드하세요.',
    ctrlZoom:'Ctrl + 스크롤로 확대/축소.', settingsTitle:'프로그램 설정',
    splashInit:'초기화 중...', splashFonts:'글꼴 로드 중...',
    splashTheme:'테마 적용 중...', splashLang:'현지화 로드 중...',
    splashConfig:'설정 읽는 중...', splashWebview:'WebView 초기화...',
    splashReady:'준비 완료!',
    s_showStars:'별 표시',
    s_autoPlay:'자동 재생',
    s_defaultWidth:'기본 너비', s_defaultPalette:'기본 팔레트',
    s_defaultFontRatio:'기본 글꼴 비율',
    s_defaultBg:'기본 배경색',
    s_defaultZoom:'기본 확대/축소',
    uploadFont:'글꼴 업로드',
    customTheme:'커스텀 테마', themeEditor:'테마 편집기',
    themeNames: THEME_NAMES_EN,
    startVirtualCam: '가상 카메라 시작',
    stopVirtualCam: '가상 카메라 중지',
    virtualCamActive: '가상 카메라 활성',
    cameraLoading: '카메라 로딩 중...',
    cameraStopped: '카메라가 중지되었습니다.',
    enableCameraFirst: '먼저 카메라를 활성화하세요!',
    canvasNotReady: 'Canvas가 준비되지 않았습니다. 다시 시도하세요.',
    tryAgain: '다시 시도',
    resolution: '해상도',
    virtualCameraError: '가상 카메라 오류',
    savingWebcamVideo: '웹캠 녹화 저장 중...',
    recordingComplete: '녹화 완료! "실행"을 눌러 ASCII 비디오를 생성하세요.',
    recordingError: '비디오 저장 오류',
    recordingStarted: '웹캠 녹화 중...',
    loadingPreview: '미리보기 로딩 중...',
    previewError: '미리보기 오류',
    errorLabel: '오류',
    cameraStartedWebAPI: '카메라 시작됨',
    cameraStartedNative: '카메라 시작됨',
    framesLabel: '프레임',
    symbolsLabel: '심볼',
    
    minimize: '최소화',
    maximize: '최대화',
    restore: '복원',
    close: '닫기',
    
    formatSubText: '형식 선택',
    markdownMd: 'Markdown',
    pngImage: 'PNG 이미지',
    gifImage: 'GIF 이미지',
    
    errFileOpen: '파일 열기 실패: {0}',
    errPaletteMin: '팔레트는 최소 2개의 문자를 포함해야 합니다',
    errFFmpegNotFound: 'FFmpeg를 찾을 수 없습니다. 설치: https://ffmpeg.org/',
    errTempDir: '임시 디렉토리 생성 실패: {0}',
    errNoFrames: '프레임이 추출되지 않았습니다',
    errFrameOpen: '프레임 열기 오류: {0}',
    errFFmpeg: 'FFmpeg 오류: {0}',
    errFFmpegExtract: 'FFmpeg 프레임 추출 실패',
    errNoFramesProcess: '처리할 프레임이 없습니다',
    errFont: '글꼴 오류: {0}',
    errFirstFrame: '첫 번째 프레임 오류: {0}',
    errFrameN: '프레임 {0}: {1}',
    errSaveFrame: '프레임 {0} 저장 오류: {1}',
    errFFmpegEncode: 'FFmpeg 비디오 인코딩 실패',
    videoComplete: '완료! 프레임: {0} | FPS: {1} | 크기: {2}\n저장됨: {3}',
    errWriteFile: '쓰기 오류 \'{0}\': {1}',
    errSaveImage: '이미지 저장 실패: {0}',
    imageSaved: '저장됨: {0}',
    errInvalidRGB: '잘못된 RGB 데이터',
    errInvalidImageData: '잘못된 이미지 데이터',
    vcamNotRunning: '가상 카메라가 실행되고 있지 않습니다',
    vcamNotStarted: '가상 카메라가 시작되지 않았습니다',
    
    savingAs: '{0}(으)로 저장 중...',
    canvasContextError: 'Canvas 컨텍스트를 사용할 수 없습니다',
    blobCreateError: '이미지 blob 생성 실패',
    urlCopied: 'URL이 복사되었습니다!',
    
    numInputMinValue: '최소값: {0}',
    numInputMaxValue: '최대값: {0}',
    
    ffmpegNotFound: 'FFmpeg를 찾을 수 없습니다',
    ffmpegNotFoundDesc: '비디오 처리에는 FFmpeg가 필요합니다. 자동으로 설치하시겠습니까, 아니면 수동으로 다운로드하시겠습니까?',
    ffmpegInstallAuto: '자동 설치',
    ffmpegInstallManual: '수동 다운로드',
    ffmpegInstalling: 'FFmpeg 설치 중...',
    ffmpegInstallSuccess: 'FFmpeg가 성공적으로 설치되었습니다! 애플리케이션을 재시작하세요.',
    ffmpegInstallError: 'FFmpeg 설치 오류: {0}',
    ffmpegDownloadFrom: 'FFmpeg 다운로드',
    
    themeNameLabel: '이름',
    themeNameDefault: '내 테마',
    themeBgApp: '앱 배경',
    themeBgSidebar: '사이드바 배경',
    themeAccent: '강조 색상',
    themeTextPrimary: '기본 텍스트',
    themeTextMuted: '흐린 텍스트',
    themeBorder: '테두리',
    
    defaultTextInput: 'ASCII 아트',
    
    fileMarkdown: 'Markdown 파일',
    fileText: '텍스트 파일',
    fileHtml: 'HTML 파일',
    fileAnimatedGif: '애니메이션 GIF',
    fileMp4Video: 'MP4 비디오',
  },
  it: { appTitle:'ASCII Art Studio', openImage:'Immagine', openVideo:'Video / GIF',
    execute:'Esegui', save:'Salva', processing:'Elaborazione...',
    geometry:'Geometria e Luce', width:'Larghezza', fontRatio:'Rapporto carattere',
    brightness:'Luminosità', contrast:'Contrasto', gamma:'Gamma',
    symbols:'Simboli e Render', colorRender:'Render HTML a colori',
    invert:'Inverti', dithering:'Retinatura (Floyd–Steinberg)', viewport:'Viewport', bgColor:'Colore sfondo',
    player:'Player ASCII', settings:'Impostazioni', theme:'Tema', font:'Carattere',
    language:'Lingua', resetDefaults:'Ripristina', saveSettings:'Salva impostazioni',
    formatTitle:'Scegli il formato', formatSubImage:'Formato ASCII', formatSubVideo:'Formato output',
    gifAnim:'GIF animata', mp4Video:'Video MP4', coloredHtml:'HTML colorato',
    textTxt:'Testo TXT', cancel:'Annulla', loaded:'Caricato', done:'Fatto',
    error:'Errore', framesAt:'fotogrammi @', renderMp4:'Rendering MP4...',
    renderGif:'Rendering GIF...', saved:'Salvato',
    paletteStandard:'Standard (10)', paletteUltra:'Ultra (92)',
    paletteDetailed:'Dettagliato (70)', paletteBlocks:'Blocchi ░▒▓█',
    paletteBinary:'Binario 0/1',
    waitingInput:'[SISTEMA] In attesa.\nCarica un file.',
    ctrlZoom:'Ctrl + Rotella per zoom.', settingsTitle:'Impostazioni',
    splashInit:'Inizializzazione...', splashFonts:'Caricamento font...',
    splashTheme:'Applicazione tema...', splashLang:'Caricamento localizzazione...',
    splashConfig:'Lettura configurazione...', splashWebview:'Init WebView...',
    splashReady:'Pronto!',
    s_showStars:'Mostra stelle',
    s_autoPlay:'Riproduzione automatica',
    s_defaultWidth:'Larghezza predefinita', s_defaultPalette:'Palette predefinita',
    s_defaultFontRatio:'Rapporto carattere predefinito',
    s_defaultBg:'Sfondo predefinito',
    s_defaultZoom:'Zoom predefinito',
    uploadFont:'Carica font',
    customTheme:'Tema personalizzato', themeEditor:'Editor tema',
    themeNames: THEME_NAMES_EN,
    startVirtualCam: 'Avvia camera virtuale',
    stopVirtualCam: 'Ferma camera virtuale',
    virtualCamActive: 'Camera virtuale attiva',
    cameraLoading: 'Caricamento camera...',
    cameraStopped: 'Camera fermata.',
    enableCameraFirst: 'Attiva prima la camera!',
    canvasNotReady: 'Canvas non pronto. Riprova.',
    tryAgain: 'Riprova',
    resolution: 'Risoluzione',
    virtualCameraError: 'Errore camera virtuale',
    savingWebcamVideo: 'Salvataggio registrazione webcam...',
    recordingComplete: 'Registrazione completa! Premi "Esegui" per generare video ASCII.',
    recordingError: 'Errore salvataggio video',
    recordingStarted: 'Registrazione webcam...',
    loadingPreview: 'Caricamento anteprima...',
    previewError: 'Errore anteprima',
    errorLabel: 'Errore',
    cameraStartedWebAPI: 'Camera avviata',
    cameraStartedNative: 'Camera avviata',
    framesLabel: 'fotogrammi',
    symbolsLabel: 'simboli',
    
    minimize: 'Riduci',
    maximize: 'Ingrandisci',
    restore: 'Ripristina',
    close: 'Chiudi',
    
    formatSubText: 'Scegli formato',
    markdownMd: 'Markdown',
    pngImage: 'Immagine PNG',
    gifImage: 'Immagine GIF',
    
    errFileOpen: 'Impossibile aprire il file: {0}',
    errPaletteMin: 'La palette deve contenere almeno 2 caratteri',
    errFFmpegNotFound: 'FFmpeg non trovato. Installare: https://ffmpeg.org/',
    errTempDir: 'Impossibile creare directory temporanea: {0}',
    errNoFrames: 'Nessun fotogramma estratto',
    errFrameOpen: 'Errore apertura fotogramma: {0}',
    errFFmpeg: 'Errore FFmpeg: {0}',
    errFFmpegExtract: 'FFmpeg non ha potuto estrarre i fotogrammi',
    errNoFramesProcess: 'Nessun fotogramma da elaborare',
    errFont: 'Errore carattere: {0}',
    errFirstFrame: 'Errore primo fotogramma: {0}',
    errFrameN: 'Fotogramma {0}: {1}',
    errSaveFrame: 'Errore salvataggio fotogramma {0}: {1}',
    errFFmpegEncode: 'FFmpeg non ha potuto codificare il video',
    videoComplete: 'Fatto! Fotogrammi: {0} | FPS: {1} | Dimensione: {2}\nSalvato: {3}',
    errWriteFile: 'Errore di scrittura \'{0}\': {1}',
    errSaveImage: 'Impossibile salvare l\'immagine: {0}',
    imageSaved: 'Salvato: {0}',
    errInvalidRGB: 'Dati RGB non validi',
    errInvalidImageData: 'Dati immagine non validi',
    vcamNotRunning: 'Camera virtuale non attiva',
    vcamNotStarted: 'Camera virtuale non avviata',
    
    savingAs: 'Salvataggio come {0}...',
    canvasContextError: 'Contesto Canvas non disponibile',
    blobCreateError: 'Impossibile creare blob immagine',
    urlCopied: 'URL copiato!',
    
    numInputMinValue: 'Valore minimo: {0}',
    numInputMaxValue: 'Valore massimo: {0}',
    
    ffmpegNotFound: 'FFmpeg non trovato',
    ffmpegNotFoundDesc: 'FFmpeg è necessario per l\'elaborazione video. Installare automaticamente o scaricare manualmente?',
    ffmpegInstallAuto: 'Installa automaticamente',
    ffmpegInstallManual: 'Scarica manualmente',
    ffmpegInstalling: 'Installazione di FFmpeg...',
    ffmpegInstallSuccess: 'FFmpeg installato con successo! Si prega di riavviare l\'applicazione.',
    ffmpegInstallError: 'Errore di installazione FFmpeg: {0}',
    ffmpegDownloadFrom: 'Scarica FFmpeg da',
    
    themeNameLabel: 'Nome',
    themeNameDefault: 'Il mio tema',
    themeBgApp: 'Sfondo dell\'applicazione',
    themeBgSidebar: 'Sfondo della barra laterale',
    themeAccent: 'Colore di accento',
    themeTextPrimary: 'Testo principale',
    themeTextMuted: 'Testo attenuato',
    themeBorder: 'Bordi',
    
    defaultTextInput: 'ARTE ASCII',
    
    fileMarkdown: 'File Markdown',
    fileText: 'File di testo',
    fileHtml: 'File HTML',
    fileAnimatedGif: 'GIF animata',
    fileMp4Video: 'Video MP4',
  },
};

export function t(lang: Lang): Required<Strings> {
  const base = T.en;
  const localized = T[lang];
  const merged = { ...base, ...localized } as Required<Strings>;
  
  // Fallback для новых полей
  if (!merged.textToAscii) merged.textToAscii = localized.textToAscii || 'Text to ASCII';
  if (!merged.webcamToAscii) merged.webcamToAscii = localized.webcamToAscii || 'Webcam to ASCII';
  if (!merged.imageMode) merged.imageMode = localized.imageMode || 'Media';
  if (!merged.textMode) merged.textMode = localized.textMode || 'Text';
  if (!merged.webcamMode) merged.webcamMode = localized.webcamMode || 'Camera';
  if (!merged.updateAvailable) merged.updateAvailable = localized.updateAvailable || 'Update available';
  if (!merged.updateNow) merged.updateNow = localized.updateNow || 'Update';
  if (!merged.updateLater) merged.updateLater = localized.updateLater || 'Later';
  if (!merged.enterText) merged.enterText = localized.enterText || 'Enter text...';
  if (!merged.selectFont) merged.selectFont = localized.selectFont || 'Select Font';
  if (!merged.fontLayout) merged.fontLayout = localized.fontLayout || 'Font Layout';
  if (!merged.startCamera) merged.startCamera = localized.startCamera || 'Start Camera';
  if (!merged.stopCamera) merged.stopCamera = localized.stopCamera || 'Stop Camera';
  if (!merged.startRecord) merged.startRecord = localized.startRecord || 'Record Video';
  if (!merged.stopRecord) merged.stopRecord = localized.stopRecord || 'Stop Recording';
  if (!merged.recordingActive) merged.recordingActive = localized.recordingActive || 'Recording...';
  if (!merged.copyClipboard) merged.copyClipboard = localized.copyClipboard || 'Copy to Clipboard';
  if (!merged.copied) merged.copied = localized.copied || 'Copied to clipboard!';
  if (!merged.backToMain) merged.backToMain = localized.backToMain || 'Back to Generation';
  if (!merged.downloadingFont) merged.downloadingFont = localized.downloadingFont || 'Downloading Font...';
  if (!merged.fontPreviewText) merged.fontPreviewText = localized.fontPreviewText || 'Preview';
  if (!merged.s_starsCount) merged.s_starsCount = localized.s_starsCount || 'Stars Count';
  if (!merged.s_starsMinSize) merged.s_starsMinSize = localized.s_starsMinSize || 'Min Star Size';
  if (!merged.s_starsMaxSize) merged.s_starsMaxSize = localized.s_starsMaxSize || 'Max Star Size';
  if (!merged.s_starsColor) merged.s_starsColor = localized.s_starsColor || 'Stars Color';
  if (!merged.startVirtualCam) merged.startVirtualCam = localized.startVirtualCam || 'Start Virtual Camera';
  if (!merged.stopVirtualCam) merged.stopVirtualCam = localized.stopVirtualCam || 'Stop Virtual Camera';
  if (!merged.virtualCamActive) merged.virtualCamActive = localized.virtualCamActive || 'Virtual Camera Active';
  if (!merged.virtualCameraPort) merged.virtualCameraPort = localized.virtualCameraPort || 'Virtual Camera Port';
  if (!merged.copyUrl) merged.copyUrl = localized.copyUrl || 'Copy URL';
  if (!merged.cameraLoading) merged.cameraLoading = localized.cameraLoading || 'Loading camera...';
  if (!merged.cameraStopped) merged.cameraStopped = localized.cameraStopped || 'Camera stopped.';
  
  return merged;
}