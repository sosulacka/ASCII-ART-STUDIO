# Third-Party Notices — ASCII ART STUDIO

Это сводный список стороннего ПО, поставляемого с приложением или
используемого при сборке. Полные тексты лицензий компонентов, которые
распространяются вместе с приложением, лежат в подпапках `licenses/`.

## Распространяются с приложением (бандл)

| Компонент | Версия |            Лицензия        |        Папка              |
|
| softcam (tshino)   | v1.8.1 | MIT               | `licenses/softcam/`       |
| DejaVu Sans Mono   | — | Bitstream Vera License | `licenses/DejaVuSansMono/`|
| Lucide Icons       | (npm lucide-react)         | ISC | `licenses/lucide/`  |

## Основные библиотеки (компилируются в бинарник / JS-бандл)

- **Tauri** (tauri, tauri-plugin-dialog, tauri-plugin-shell) — MIT/Apache-2.0
- **React**, react-dom — MIT
- **figlet.js** — MIT
- **image**, **imageproc**, **ab_glyph**, **rayon**, **serde**, **tokio**,
  **axum**, **base64**, **once_cell**, **tempfile**, **dirs**,
  **libloading** — MIT и/или Apache-2.0
- **v4l** (Linux) — MIT

Полный машинный список зависимостей и их лицензий можно получить командами
`cargo license` (Rust) и `npx license-checker` (npm) в корне репозитория.

## Внешние программы (не поставляются, вызываются если установлены)

- **FFmpeg** — LGPL/GPL. Не бандлится: приложение вызывает системный
  `ffmpeg`/`ffprobe`, установленный пользователем.
- **v4l2loopback** (Linux) — GPL-2.0, модуль ядра. Не бандлится: приложение
  лишь пишет кадры в предоставленное модулем /dev-устройство.

## Не используется в продукте

Файлы в корневой папке `assets/` (иконки, шрифты) имеют неустановленное
происхождение и НЕ включаются ни в сборку, ни в установщик.
