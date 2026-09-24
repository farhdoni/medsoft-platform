# Выкладка APK на aivita.uz

APK пациента и врача отдаются с лендинга:

- `https://aivita.uz/downloads/aivita-patient.apk`
- `https://aivita.uz/downloads/aivita-doctor.apk`

Файлы лежат на VPS в `/var/www/aivita-landing/downloads/` и **в git не
хранятся** (`*.apk` в `.gitignore`, в `deploy-landing.yml` стоит
`--exclude='downloads/*.apk'`). Деплой лендинга их не трогает: rsync
идёт без `--delete`, а ключ `LANDING_SSH_KEY` заужен до `rrsync -no-del`.
Значит, APK выкладывается только руками, по шагам ниже.

## 1. Сборка

- CI: Actions → «Build Android APK (local EAS)» → Run workflow; готовый
  файл скачать из артефакта `aivita-patient-<sha>`.
- Или локально из `apps/mobile-patient`:
  `eas build --local --platform android --profile preview --output aivita-patient.apk`.

Перед выкладкой убедиться, что `versionCode` больше текущего на проде
(иначе Android не поставит обновление поверх):

```bash
ssh root@109.123.249.224 "aapt dump badging /var/www/aivita-landing/downloads/aivita-patient.apk | head -1"
```

## 2. Загрузка на VPS

Загружать под временным именем и подменять атомарно через `mv` — так
пользователь, который качает файл в эту секунду, не получит обрезанный APK.
Старую версию сохранить с датой, пока новая не проверена.

```bash
scp aivita-patient.apk root@109.123.249.224:/var/www/aivita-landing/downloads/aivita-patient.apk.new
ssh root@109.123.249.224 '
  set -e; cd /var/www/aivita-landing/downloads
  aapt dump badging aivita-patient.apk.new | head -1   # проверить versionName / versionCode
  cp -p aivita-patient.apk /root/backups/aivita-patient-$(date +%Y%m%d-%H%M).apk
  chmod 644 aivita-patient.apk.new
  mv aivita-patient.apk.new aivita-patient.apk
  aivita-apk-version-json      # пересобрать downloads/version.json
'
```

`aivita-apk-version-json` достаёт `versionName`/`versionCode` из самих APK
через `aapt`, считает размер и sha256 и атомарно пишет
`downloads/version.json`. Из него `get-app.html` подставляет версию и
размер на кнопки скачивания — руками цифры на странице больше не
правятся. Если шаг забыть, страница покажет старую версию из прошлого
`version.json`; если файла нет вовсе — нейтральный текст «APK для Android».

Исходник скрипта — `scripts/landing/apk-version-json.sh`; при изменении
переустановить на VPS (`sed` снимает CRLF, если файл брался из Windows-чекаута):

```bash
scp scripts/landing/apk-version-json.sh root@109.123.249.224:/tmp/
ssh root@109.123.249.224 'sed -i "s/\r$//" /tmp/apk-version-json.sh && install -m 755 /tmp/apk-version-json.sh /usr/local/bin/aivita-apk-version-json && rm /tmp/apk-version-json.sh'
```

Для врача — то же самое с `aivita-doctor.apk`.

## 3. Проверка

```bash
curl -sI https://aivita.uz/downloads/aivita-patient.apk | grep -iE "^HTTP|content-length"
```

`content-length` должен совпасть с размером загруженного файла. Затем
открыть `https://aivita.uz/get-app.html`: на кнопке должна стоять новая
версия (та же, что в `https://aivita.uz/downloads/version.json`).

Старые бэкапы APK в `/root/backups/` удалять, когда новая версия
подтверждена на устройстве.
