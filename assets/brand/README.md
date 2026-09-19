# AIVITA — набор логотипов

Бренд-ассеты AIVITA (2026-05, из `AIVITA_Logos.zip`) плюс два отдельных файла логотипа. Набор используется **как есть, без перерисовки**: неоновый крест — в иконках и аватарах, маскот (робот) — в горизонтальном логотипе. Это уже согласованное решение, а не временная заглушка.

Это склад ассетов, а не то, что подключено в приложениях. Замена текущих логотипов в apps/* — отдельная будущая задача.

## Где что лежит

| Файл / папка | Для чего |
|---|---|
| `horizontal/aivita_logo_horizontal_1024x339.png` | Логотип на сайте, в шапке лендинга, в презентациях — максимальный размер набора |
| `horizontal/aivita_logo_800x264.png`, `600x198.png`, `400x132.png`, `300x99.png` | Те же пропорции (≈3.02:1) в уменьшенных размерах — под конкретные блоки вёрстки, чтобы не грузить полноразмерный PNG там, где он не нужен |
| `horizontal/aivita_logo_email_200.png` | Логотип в письмах (email-рассылки, подпись) — маленький вес, безопасный размер для почтовых клиентов |
| `social-avatars/aivita_avatar_*.png` | Аватары в соцсетях и мессенджерах — по файлу на каждую площадку (Facebook, Instagram, LinkedIn, Telegram, TikTok, Twitter/X, WhatsApp, YouTube) с уже подогнанным под неё размером; `aivita_avatar_1024x1024.png` — мастер-версия аватара |
| `app-icons/aivita_icon_ios_*.png`, `android_*.png` | Иконка приложения — все размеры под требования App Store / iOS и Android (в т.ч. `appstore_1024x1024` и `playstore_512x512` — версии для сторов) |
| `app-icons/aivita_icon_favicon_16x16.png`, `32x32.png`, `64x64.png` | Фавикон сайта — растровые PNG на выбор по разрешению |
| `app-icons/favicon.ico` | Фавикон в формате `.ico` (единственное разрешение внутри — 16×16) — для мест, где нужен именно `.ico`, а не PNG |
| `Aivita_logo.png` | Отдельный квадратный логотип (431×431, **с прозрачным фоном**) — на сегодня это единственный файл в наборе, который можно ставить на тёмный фон без белой/светлой подложки |
| `Aivita_logo_копия.jpg` | JPEG-копия того же логотипа — без прозрачности (JPEG её не поддерживает), фон запечён в белый/светлый; держим для сравнения и как fallback там, где PNG с альфа-каналом нежелателен |

## Важно: прозрачность

Из всего набора **только `Aivita_logo.png` имеет реальную прозрачность** (RGBA, часть пикселей с alpha=0). Всё остальное — `app-icons/*`, `social-avatars/*`, `horizontal/*`, включая `aivita_icon_1024x1024.png` — это непрозрачный PNG в режиме RGB со светлым (белым) фоном, запечённым в файл.

Для тёмных тем (тёмный режим сайта/приложения, аватары на тёмных площадках, иконка на тёмной теме ОС) этого набора недостаточно — понадобится отдельная версия с прозрачным фоном хотя бы для иконки приложения и/или горизонтального логотипа. Сейчас такой версии нет.

## Файлы: размер, формат, прозрачность

| Файл | Размер (px) | Формат | Прозрачность |
|---|---|---|---|
| `horizontal/aivita_logo_300x99.png` | 300×99 | PNG (RGB) | нет |
| `horizontal/aivita_logo_400x132.png` | 400×132 | PNG (RGB) | нет |
| `horizontal/aivita_logo_600x198.png` | 600×198 | PNG (RGB) | нет |
| `horizontal/aivita_logo_800x264.png` | 800×264 | PNG (RGB) | нет |
| `horizontal/aivita_logo_email_200.png` | 200×66 | PNG (RGB) | нет |
| `horizontal/aivita_logo_horizontal_1024x339.png` | 1024×339 | PNG (RGB) | нет |
| `social-avatars/aivita_avatar_1024x1024.png` | 1024×1024 | PNG (RGB) | нет |
| `social-avatars/aivita_avatar_facebook_180x180.png` | 180×180 | PNG (RGB) | нет |
| `social-avatars/aivita_avatar_instagram_320x320.png` | 320×320 | PNG (RGB) | нет |
| `social-avatars/aivita_avatar_linkedin_300x300.png` | 300×300 | PNG (RGB) | нет |
| `social-avatars/aivita_avatar_telegram_512x512.png` | 512×512 | PNG (RGB) | нет |
| `social-avatars/aivita_avatar_tiktok_200x200.png` | 200×200 | PNG (RGB) | нет |
| `social-avatars/aivita_avatar_twitter_400x400.png` | 400×400 | PNG (RGB) | нет |
| `social-avatars/aivita_avatar_whatsapp_500x500.png` | 500×500 | PNG (RGB) | нет |
| `social-avatars/aivita_avatar_youtube_800x800.png` | 800×800 | PNG (RGB) | нет |
| `app-icons/aivita_icon_1024x1024.png` | 1024×1024 | PNG (RGB) | **нет — светлый фон запечён** |
| `app-icons/aivita_icon_appstore_1024x1024.png` | 1024×1024 | PNG (RGB) | нет |
| `app-icons/aivita_icon_playstore_512x512.png` | 512×512 | PNG (RGB) | нет |
| `app-icons/aivita_icon_android_144x144.png` | 144×144 | PNG (RGB) | нет |
| `app-icons/aivita_icon_android_192x192.png` | 192×192 | PNG (RGB) | нет |
| `app-icons/aivita_icon_android_48x48.png` | 48×48 | PNG (RGB) | нет |
| `app-icons/aivita_icon_android_72x72.png` | 72×72 | PNG (RGB) | нет |
| `app-icons/aivita_icon_android_96x96.png` | 96×96 | PNG (RGB) | нет |
| `app-icons/aivita_icon_ios_120x120.png` | 120×120 | PNG (RGB) | нет |
| `app-icons/aivita_icon_ios_152x152.png` | 152×152 | PNG (RGB) | нет |
| `app-icons/aivita_icon_ios_167x167.png` | 167×167 | PNG (RGB) | нет |
| `app-icons/aivita_icon_ios_180x180.png` | 180×180 | PNG (RGB) | нет |
| `app-icons/aivita_icon_ios_40x40.png` | 40×40 | PNG (RGB) | нет |
| `app-icons/aivita_icon_ios_58x58.png` | 58×58 | PNG (RGB) | нет |
| `app-icons/aivita_icon_ios_60x60.png` | 60×60 | PNG (RGB) | нет |
| `app-icons/aivita_icon_ios_76x76.png` | 76×76 | PNG (RGB) | нет |
| `app-icons/aivita_icon_ios_80x80.png` | 80×80 | PNG (RGB) | нет |
| `app-icons/aivita_icon_ios_87x87.png` | 87×87 | PNG (RGB) | нет |
| `app-icons/aivita_icon_favicon_16x16.png` | 16×16 | PNG (RGB) | нет |
| `app-icons/aivita_icon_favicon_32x32.png` | 32×32 | PNG (RGB) | нет |
| `app-icons/aivita_icon_favicon_64x64.png` | 64×64 | PNG (RGB) | нет |
| `app-icons/favicon.ico` | 16×16 (одно разрешение внутри) | ICO (RGB) | нет |
| `Aivita_logo.png` | 431×431 | PNG (RGBA) | **да, реальная** (часть пикселей alpha=0) |
| `Aivita_logo_копия.jpg` | 431×431 | JPEG (RGB) | нет (JPEG не поддерживает альфа-канал) |

37 файлов из архива — единообразный непрозрачный RGB PNG (плюс `favicon.ico`, тоже без альфы). Единственный файл с реальной прозрачностью во всём наборе — отдельный `Aivita_logo.png`.

## Происхождение

Файлы распакованы из `AIVITA_Logos.zip` (41 запись = 37 файлов + 4 записи-папки). Оригинальные имена папок внутри архива были в кодировке, которая не читается штатными средствами Windows (ни cp437, ни cp866, ни windows-1251 не дают осмысленный текст) — папки идентифицированы по числовому префиксу (`1_`, `2_`, `3_`) и по составу файлов, и переименованы на этом основании:

- `1_...` → `horizontal/` (горизонтальные варианты логотипа)
- `2_...` → `social-avatars/` (аватары соцсетей)
- `3_...` → `app-icons/` (иконки приложения + favicon)

Имена самих файлов внутри папок не менялись.
