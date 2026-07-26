# ASCII Art Studio

<div align="center">

```
 ╔═══════════════════════════════════════════════════════════════╗
 ║                                                               ║
 ║         Professional Desktop Application for ASCII Art         ║
 ║                                                               ║
 ║   Transform images and videos into ASCII art with real-time   ║
 ║      webcam support and a true system virtual camera          ║
 ║                                                               ║
 ╚═══════════════════════════════════════════════════════════════╝
```

[![Tauri](https://img.shields.io/badge/Tauri-2-blue.svg)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg)](https://www.typescriptlang.org)
[![Rust](https://img.shields.io/badge/Rust-2021-orange.svg)](https://www.rust-lang.org)

[English](#english) • [Русский](#русский)

</div>

---

<a name="english"></a>
## ► English

### ═══ Overview

ASCII Art Studio is a desktop application that converts images, videos, and a
live webcam feed into ASCII art. Built with Tauri, React, and Rust, the heavy
image processing runs in Rust (parallelised across CPU cores), while the UI
stays fast and responsive.

The virtual camera is a **real DirectShow device** on Windows (via the bundled
softcam driver) — it appears directly in Discord, Zoom, OBS, and browsers as an
ordinary camera. No external streaming software required.

### ═══ Key Features

```
┌─ Image Conversion      │ Turn any image into ASCII art with fine-grained control
├─ Video Processing      │ Convert whole videos frame-by-frame (parallelised) with FPS kept
├─ Real-time Webcam      │ Live ASCII rendering from your camera (conversion done in Rust)
├─ True Virtual Camera   │ Real DirectShow device — pick it directly in Discord/Zoom/OBS
├─ 6 Palettes            │ Standard, Ultra, Detailed, Blocks, Binary, Braille + custom
├─ Dithering             │ Floyd–Steinberg dithering for smooth gradients on small palettes
├─ Color Support         │ Full-color ASCII with RGB preservation
├─ Fine-tuning           │ Width, font ratio, brightness, contrast, gamma, invert
├─ Multilingual          │ 10 languages (EN, RU, DE, FR, ZH, JA, ES, PT, KO, IT)
├─ Export Options        │ TXT, MD, HTML, PNG, GIF, MP4
├─ Figlet Text           │ ASCII text art with 400+ fonts (downloaded on demand + cached)
├─ Axium Scripting       │ Built-in IDE for the Axium scripting language: automate conversions, batch export
├─ Auto-Updates          │ Checks the repo on launch and every 15 minutes
└─ 28 Themes             │ Dark, Light, Matrix, Dracula, Monokai, Gruvbox, and more
```

### ═══ Technology Stack

**Frontend:**
- React 19 with TypeScript
- Vite for the dev server and build
- Lucide React for icons
- Local fonts: Inter (UI) and JetBrains Mono (mono), bundled — no network needed

**Backend (Rust / Tauri 2):**
- CPU image processing with the `image` and `imageproc` crates
- Parallel frame rendering via `rayon`
- Tokio async runtime, `axum` for the MJPEG fallback server
- Virtual camera: bundled **softcam** DirectShow driver (Windows), **v4l2loopback** (Linux)
- Scripting: **Axium VM** loaded at runtime as a dynamic library (`axium_vm.dll` / `libaxium_vm.so`)
- `ureq` for update checks and downloads

### ═══ System Requirements

**Windows:**
- Windows 10/11 (64-bit)
- WebView2 (pre-installed on Windows 11; auto-installed otherwise)
- FFmpeg — optional, only needed for video/GIF/MP4 processing (the app can install it for you)

**Linux:**
- Ubuntu 20.04+ or equivalent
- GTK 3.24+, WebKitGTK 2.40+
- v4l2loopback (for the virtual camera), FFmpeg (for video)

### ═══ Install (end users)

**Windows:** download `ASCII-Art-Studio-Setup.exe` from the
[Releases](https://github.com/sosulacka/ASCII-ART-STUDIO/releases) page and run it.

**Linux:** either install the `.deb` / AppImage, or download the
`ASCII-Art-Studio-Setup` binary (same custom installer UI as on Windows,
per-user, no root required):
```bash
chmod +x ASCII-Art-Studio-Setup && ./ASCII-Art-Studio-Setup
```

The installer is **per-user** — Windows: `%LOCALAPPDATA%\Programs`,
Linux: `~/.local/share/ASCIIArtStudio` — and **does not require
administrator/root rights**. On Windows the app registers itself in
"Add or remove programs"; on Linux a menu entry and `uninstall.sh` are created.

The app checks for updates automatically (on launch and every 15 minutes) and
can download and apply them in place.

### ═══ Build from Source

```bash
# Clone the repository
git clone https://github.com/sosulacka/ASCII-ART-STUDIO.git
cd ASCII-ART-STUDIO

# Install dependencies
npm install
```

**Development:**
```bash
# Run with hot reload
npm run dev
```
Frontend changes hot-reload; Rust changes require a restart.

**Build the app (no bundle):**
```bash
npm run tauri build
```
Output goes to `src-tauri/target/release/`.

**Build the custom installer (Windows):**
```bash
npm run build:installer
```
This builds the app, packs it, and embeds it into a single self-contained
`dist-installer/ASCII-Art-Studio-Setup.exe`.

### ═══ Platform Notes

**Windows — virtual camera driver:**
The bundled softcam DirectShow driver must be registered once. The app offers a
one-click "Install camera driver" button (asks for administrator rights via UAC
just for that step). After that, "DirectShow Softcam" appears in any app's
camera list — restart the target app (Discord/Zoom/browser) so it re-scans
cameras. No system reboot needed.

**Linux — virtual camera:**
```bash
# Native camera support
sudo apt-get install libv4l-dev v4l-utils

# Virtual camera device
sudo apt-get install v4l2loopback-dkms
sudo modprobe v4l2loopback devices=1 video_nr=10 card_label="ASCII Art Camera" exclusive_caps=1

# Make it persistent
echo "v4l2loopback" | sudo tee /etc/modules-load.d/v4l2loopback.conf
echo "options v4l2loopback devices=1 video_nr=10 card_label='ASCII Art Camera' exclusive_caps=1" | sudo tee /etc/modprobe.d/v4l2loopback.conf
```

**Linux — GTK/WebKitGTK (build):**
```bash
sudo apt-get install libgtk-3-dev libwebkit2gtk-4.1-dev
```

### ═══ Usage Guide

**Image / Video (Media tab):**
1. Open an image or video (or drag & drop)
2. Adjust width, palette, brightness, contrast, gamma; toggle color, invert, dithering
3. Preview updates live
4. Export as TXT, HTML, PNG, GIF, MP4, or copy to clipboard

**Text (Figlet):**
1. Type your text, pick one of 400+ Figlet fonts
2. Export as TXT, MD, PNG, or GIF

**Camera:**
1. Start the camera — live ASCII preview (converted in Rust for low CPU)
2. Start the **Virtual Camera** to expose it system-wide
3. In Windows apps, select "DirectShow Softcam"; if no driver is registered,
   use the in-app "Install camera driver" button first
4. On Linux, the virtual camera is a **real V4L2 device** (via v4l2loopback) —
   it appears as an ordinary camera in Discord/OBS/browsers. Load the module
   first (see Platform Notes)
5. If no backend is available (driver/module missing), the app falls back to
   an MJPEG stream at `http://localhost:8765/stream` (usable as an OBS
   Browser Source)

**Scripts (Axium):**
1. Open the Scripts tab — a full IDE for the Axium scripting language (AXL):
   syntax highlighting, autocompletion, and inline compile diagnostics
2. Write a script (or start from the template) and press **Run** — output
   appears in the console below the editor
3. Scripts can call into the app: convert pixel buffers to ASCII with the real
   conversion engine, save TXT/PNG files, show toasts, switch themes
4. Press the **API Reference** button for the built-in docs: AXL syntax
   (`([ ])` blocks, `.` statement terminator, `;string;` literals) and every
   available native function with descriptions
5. Scripts are saved to your user config directory as `.ax` files

> The Axium language engine is closed-source; the app ships only the compiled
> VM binary (`assets/Axium/bin/`), which the installer downloads. The app looks
> for it next to the executable, in bundle resources, and in your config
> directory — if it is still missing, the Scripts tab offers a
> **"Locate engine file..."** button to pick the `.dll`/`.so` manually
> (the path is remembered).

### ═══ Customization

**Custom palettes** — characters ordered darkest → brightest, e.g. ` .:-=+*#%@`.
**28 themes** with a built-in theme editor (edit colors with a custom color
picker, save your own).

### ═══ Performance Notes

- Webcam conversion runs entirely in Rust with lookup tables; the render loop is
  throttled to the camera FPS to avoid burning CPU
- Video export renders frames in parallel across all CPU cores (`rayon`)
- Lower width (80–120) and shorter palettes are faster; color is slower than mono

### ═══ Troubleshooting

**Virtual camera shows a black screen:** make sure the camera is running in the
app first (the driver is always visible to other apps, but shows black until the
app feeds it frames). Restart the target app so it re-scans cameras.

**Camera not detected (Windows):** check camera permissions in Windows Settings
and make sure no other app holds the camera.

**Virtual camera not working (Linux):**
```bash
lsmod | grep v4l2loopback   # module loaded?
ls /dev/video*              # device present?
```

**Build errors:** `rustup update`, use Node 18 LTS or later, and clear caches
with `rm -rf node_modules src-tauri/target` before reinstalling.

### ═══ License

Open source under the MIT License. See the `LICENSE` file. Third-party
components (softcam, DejaVu Sans Mono, Inter, JetBrains Mono, Lucide) are
documented under `licenses/` with their respective licenses.

### ═══ Author

**Discord:** @syswow64deleted

### ═══ Acknowledgments

- [Tauri](https://tauri.app) — desktop app framework
- [React](https://reactjs.org) — UI library
- [Rust](https://www.rust-lang.org) — systems language
- [image-rs](https://github.com/image-rs/image) — image processing
- [softcam](https://github.com/tshino/softcam) — DirectShow virtual camera (MIT)
- [figlet.js](https://github.com/patorjk/figlet.js) — Figlet text rendering

---

<a name="русский"></a>
## ► Русский

### ═══ Обзор

ASCII Art Studio — десктопное приложение, которое превращает изображения, видео
и живой поток с веб-камеры в ASCII-арт. Построено на Tauri, React и Rust:
тяжёлая обработка изображений выполняется в Rust (параллельно на всех ядрах CPU),
а интерфейс остаётся быстрым.

Виртуальная камера на Windows — это **настоящее DirectShow-устройство** (через
встроенный драйвер softcam): она видна прямо в Discord, Zoom, OBS и браузерах
как обычная камера. Внешнее ПО для стриминга не нужно.

### ═══ Ключевые возможности

```
┌─ Конвертация изображений │ Любое изображение в ASCII с точной настройкой
├─ Обработка видео         │ Видео покадрово (параллельно) с сохранением FPS
├─ Веб-камера в реальном времени │ Живой ASCII с камеры (конверсия в Rust)
├─ Настоящая вирт. камера  │ DirectShow-устройство — выбирается прямо в Discord/Zoom/OBS
├─ 6 палитр                │ Стандарт, Ультра, Детальная, Блоки, Бинарная, Брайль + свои
├─ Дизеринг               │ Флойд–Стейнберг для плавных градиентов на малых палитрах
├─ Цветной режим           │ Полноцветный ASCII с сохранением RGB
├─ Точная настройка        │ Ширина, пропорции шрифта, яркость, контраст, гамма, инверсия
├─ Мультиязычность         │ 10 языков (RU, EN, DE, FR, ZH, JA, ES, PT, KO, IT)
├─ Экспорт                 │ TXT, MD, HTML, PNG, GIF, MP4
├─ Figlet-текст            │ ASCII-текст с 400+ шрифтами (докачка по требованию + кэш)
├─ Скриптинг Axium         │ Встроенная IDE для языка скриптов Axium: автоматизация конверсий, батч-экспорт
├─ Автообновление          │ Проверка репозитория при запуске и каждые 15 минут
└─ 28 тем                  │ Тёмная, Светлая, Matrix, Dracula, Monokai, Gruvbox и другие
```

### ═══ Технологический стек

**Фронтенд:**
- React 19 с TypeScript
- Vite для dev-сервера и сборки
- Lucide React для иконок
- Локальные шрифты Inter (UI) и JetBrains Mono (моно) — встроены, сеть не нужна

**Бэкенд (Rust / Tauri 2):**
- CPU-обработка изображений через `image` и `imageproc`
- Параллельный рендеринг кадров через `rayon`
- Асинхронный runtime Tokio, `axum` для MJPEG-фоллбека
- Виртуальная камера: встроенный драйвер **softcam** (Windows), **v4l2loopback** (Linux)
- Скриптинг: **Axium VM**, подгружается в рантайме как динамическая библиотека (`axium_vm.dll` / `libaxium_vm.so`)
- `ureq` для проверки и загрузки обновлений

### ═══ Системные требования

**Windows:**
- Windows 10/11 (64-bit)
- WebView2 (предустановлен на Windows 11, иначе ставится автоматически)
- FFmpeg — опционально, только для обработки видео/GIF/MP4 (приложение может установить его само)

**Linux:**
- Ubuntu 20.04+ или эквивалент
- GTK 3.24+, WebKitGTK 2.40+
- v4l2loopback (для виртуальной камеры), FFmpeg (для видео)

### ═══ Установка (для пользователей)

**Windows:** скачайте `ASCII-Art-Studio-Setup.exe` со страницы
[Releases](https://github.com/sosulacka/ASCII-ART-STUDIO/releases) и запустите.

**Linux:** установите `.deb` / AppImage, либо скачайте бинарник
`ASCII-Art-Studio-Setup` (тот же кастомный установщик, что и на Windows,
per-user, без root):
```bash
chmod +x ASCII-Art-Studio-Setup && ./ASCII-Art-Studio-Setup
```

Установщик **per-user** — Windows: `%LOCALAPPDATA%\Programs`,
Linux: `~/.local/share/ASCIIArtStudio` — и **не требует прав
администратора/root**. На Windows приложение регистрируется в «Установка и
удаление программ»; на Linux создаются пункт меню и `uninstall.sh`.

Приложение проверяет обновления автоматически (при запуске и каждые 15 минут)
и может скачать и применить их на месте.

### ═══ Сборка из исходников

```bash
# Клонируйте репозиторий
git clone https://github.com/sosulacka/ASCII-ART-STUDIO.git
cd ASCII-ART-STUDIO

# Установите зависимости
npm install
```

**Разработка:**
```bash
# Запуск с hot reload
npm run dev
```
Фронтенд обновляется на лету; изменения в Rust требуют перезапуска.

**Сборка приложения:**
```bash
npm run tauri build
```
Результат — в `src-tauri/target/release/`.

**Сборка кастомного установщика (Windows):**
```bash
npm run build:installer
```
Собирает приложение, упаковывает и вшивает в единый самодостаточный
`dist-installer/ASCII-Art-Studio-Setup.exe`.

### ═══ Особенности платформ

**Windows — драйвер виртуальной камеры:**
Встроенный DirectShow-драйвер softcam нужно один раз зарегистрировать. В
приложении есть кнопка «Установить драйвер камеры» (запросит права
администратора через UAC только для этого шага). После этого «DirectShow
Softcam» появится в списке камер — перезапустите целевое приложение
(Discord/Zoom/браузер), чтобы оно пересканировало камеры. Перезагрузка ПК не нужна.

**Linux — виртуальная камера:**
```bash
# Поддержка нативной камеры
sudo apt-get install libv4l-dev v4l-utils

# Устройство виртуальной камеры
sudo apt-get install v4l2loopback-dkms
sudo modprobe v4l2loopback devices=1 video_nr=10 card_label="ASCII Art Camera" exclusive_caps=1

# Сделать постоянным
echo "v4l2loopback" | sudo tee /etc/modules-load.d/v4l2loopback.conf
echo "options v4l2loopback devices=1 video_nr=10 card_label='ASCII Art Camera' exclusive_caps=1" | sudo tee /etc/modprobe.d/v4l2loopback.conf
```

**Linux — GTK/WebKitGTK (сборка):**
```bash
sudo apt-get install libgtk-3-dev libwebkit2gtk-4.1-dev
```

### ═══ Руководство по использованию

**Изображение / Видео (вкладка «Медиа»):**
1. Откройте изображение или видео (или перетащите)
2. Настройте ширину, палитру, яркость, контраст, гамму; переключите цвет,
   инверсию, дизеринг
3. Предпросмотр обновляется в реальном времени
4. Экспорт в TXT, HTML, PNG, GIF, MP4 или копирование в буфер

**Текст (Figlet):**
1. Введите текст, выберите один из 400+ Figlet-шрифтов
2. Экспорт в TXT, MD, PNG или GIF

**Камера:**
1. Запустите камеру — живой ASCII-предпросмотр (конверсия в Rust, низкий CPU)
2. Включите **Виртуальную камеру**, чтобы отдавать её в систему
3. В приложениях Windows выберите «DirectShow Softcam»; если драйвер не
   зарегистрирован — сначала нажмите «Установить драйвер камеры»
4. На Linux виртуальная камера — **настоящее V4L2-устройство** (через
   v4l2loopback): видна как обычная камера в Discord/OBS/браузерах.
   Сначала загрузите модуль (см. «Особенности платформ»)
5. Если бэкенда нет (драйвер/модуль не установлен) — фоллбек: MJPEG-поток по
   адресу `http://localhost:8765/stream` (можно как Browser Source в OBS)

**Скрипты (Axium):**
1. Откройте вкладку «Скрипты» — полноценная IDE для языка скриптов Axium (AXL):
   подсветка синтаксиса, автодополнение, инлайн-диагностика компиляции
2. Напишите скрипт (или начните с шаблона) и нажмите **Запустить** — вывод
   появится в консоли под редактором
3. Скрипты могут обращаться к приложению: конвертировать пиксельные буферы в
   ASCII настоящим движком конверсии, сохранять TXT/PNG, показывать
   уведомления, переключать темы
4. Кнопка **Справка по API** открывает встроенную документацию: синтаксис AXL
   (блоки `([ ])`, точка-терминатор `.`, строки `;текст;`) и все доступные
   native-функции с описаниями
5. Скрипты сохраняются в пользовательский конфиг-каталог как файлы `.ax`

> Движок языка Axium — с закрытым исходным кодом; в репозитории лежит только
> скомпилированный бинарник VM (`assets/Axium/bin/`), который скачивает
> установщик. Приложение ищет его рядом с исполняемым файлом, в ресурсах
> бандла и в конфиг-каталоге — если файла всё же нет, во вкладке «Скрипты»
> появляется кнопка **«Указать файл движка...»** для выбора `.dll`/`.so`
> вручную (путь запоминается).

### ═══ Кастомизация

**Свои палитры** — символы от тёмного к светлому, например ` .:-=+*#%@`.
**28 тем** со встроенным редактором (цвета правятся кастомным color picker'ом,
можно сохранять свои темы).

### ═══ Заметки о производительности

- Конверсия вебкамеры выполняется целиком в Rust на LUT-таблицах; цикл рендера
  ограничен по FPS камеры, чтобы не жечь CPU
- Экспорт видео рендерит кадры параллельно на всех ядрах (`rayon`)
- Меньшая ширина (80–120) и короткие палитры быстрее; цвет медленнее монохрома

### ═══ Устранение неполадок

**Виртуальная камера показывает чёрный экран:** сначала запустите камеру в самом
приложении (драйвер всегда виден другим приложениям, но показывает чёрное, пока
приложение не начнёт слать кадры). Перезапустите целевое приложение.

**Камера не обнаружена (Windows):** проверьте разрешения камеры в настройках
Windows и убедитесь, что её не занимает другое приложение.

**Виртуальная камера не работает (Linux):**
```bash
lsmod | grep v4l2loopback   # модуль загружен?
ls /dev/video*              # устройство есть?
```

**Ошибки сборки:** `rustup update`, используйте Node 18 LTS или новее, очистите
кэш `rm -rf node_modules src-tauri/target` и переустановите.

### ═══ Лицензия

Открытый исходный код под лицензией MIT. См. файл `LICENSE`. Сторонние
компоненты (softcam, DejaVu Sans Mono, Inter, JetBrains Mono, Lucide)
задокументированы в папке `licenses/` с их лицензиями.

### ═══ Автор

**Discord:** @syswow64deleted

### ═══ Благодарности

- [Tauri](https://tauri.app) — фреймворк для десктопных приложений
- [React](https://reactjs.org) — UI-библиотека
- [Rust](https://www.rust-lang.org) — системный язык
- [image-rs](https://github.com/image-rs/image) — обработка изображений
- [softcam](https://github.com/tshino/softcam) — DirectShow виртуальная камера (MIT)
- [figlet.js](https://github.com/patorjk/figlet.js) — рендеринг Figlet-текста

---

<div align="center">

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                    Made with code in 2026                     ║
║                                                               ║
║          ASCII Art Studio — Where pixels meet characters      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

</div>
