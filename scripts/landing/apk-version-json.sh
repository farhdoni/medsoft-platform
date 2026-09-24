#!/usr/bin/env bash
# Пишет downloads/version.json лендинга по реальным APK: versionName и
# versionCode достаются из самих файлов через aapt, поэтому цифра на
# get-app.html не может разойтись с тем, что человек скачает.
#
# Живёт на VPS как /usr/local/bin/aivita-apk-version-json. Запускать после
# каждой выкладки APK (docs/apk-release.md). Без аргументов работает с
# /var/www/aivita-landing/downloads; можно передать другой каталог.
#
# Пишет атомарно (tmp + mv). Если какой-то APK не читается aapt — выходит
# с ошибкой и старый version.json не трогает.
set -euo pipefail

DIR="${1:-/var/www/aivita-landing/downloads}"
OUT="$DIR/version.json"
TMP="$(mktemp "$DIR/.version.json.XXXXXX")"
trap 'rm -f "$TMP"' EXIT

entry() {
  local key="$1" file="$2" path="$DIR/$2" badging
  [ -f "$path" ] || return 0
  badging="$(aapt dump badging "$path" | awk '/^package:/ && !f {print; f=1}')"
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$key" "$file" \
    "$(sed -nE "s/.*versionName='([^']*)'.*/\1/p" <<<"$badging")" \
    "$(sed -nE "s/.*versionCode='([0-9]+)'.*/\1/p" <<<"$badging")" \
    "$(stat -c %s "$path")" \
    "$(sha256sum "$path" | cut -d' ' -f1)"
}

{
  entry patient aivita-patient.apk
  entry doctor  aivita-doctor.apk
} | python3 -c '
import json, sys, datetime
out = {"generatedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
for line in sys.stdin:
    key, file, name, code, size, sha = line.rstrip("\n").split("\t")
    if not name or not code:
        sys.exit(f"aapt: не удалось прочитать версию {file}")
    out[key] = {"file": file, "versionName": name, "versionCode": int(code),
                "size": int(size), "sha256": sha}
json.dump(out, sys.stdout, ensure_ascii=False, indent=2)
print()
' > "$TMP"

chmod 644 "$TMP"
mv "$TMP" "$OUT"
trap - EXIT
cat "$OUT"
