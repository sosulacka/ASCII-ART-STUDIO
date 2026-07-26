# Softcam

- **Проект:** softcam — Software Virtual Camera for Windows (DirectShow)
- **Автор:** tshino (Copyright (c) 2020 tshino)
- **Репозиторий:** https://github.com/tshino/softcam
- **Версия:** v1.8.1
- **Лицензия:** MIT (см. файл `LICENSE` рядом)

## Как используется в ASCII ART STUDIO

`softcam.dll` собирается из немодифицированных исходников v1.8.1
(`src-tauri/vendor/softcam`) и поставляется вместе с приложением как один из
бэкендов виртуальной камеры на Windows 7/8/10 (DirectShow-фильтр
"DirectShow Softcam"). Приложение обращается к DLL через C-API
(`scCreateCamera` / `scSendFrame` / `scDeleteCamera`).

Текст лицензии MIT и уведомление об авторских правах сохранены в соответствии
с условиями лицензии.
