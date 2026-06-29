# Incident: VPS CPU 100% (повтор) — 109.123.249.224

Зафиксировано: 2026-06-29 09:24 UTC — повторный скачок CPU до 100%.
Это **повтор** инцидента: redis hardening и закрытие портов ещё не были выполнены на сервере
после первого случая, поэтому сервер остаётся в уязвимом состоянии.

## Почему нет автоматизации через GitHub Actions

В репозитории есть только один workflow с доступом к VPS — `.github/workflows/deploy-coolify.yml`.
Он открывает SSH-туннель только для вызова Coolify API (`/api/v1/deploy?uuid=...`) и не умеет
выполнять произвольные shell-команды (ps, docker stats, kill, docker update). Заводить новый workflow
ради этого сейчас медленнее и рискованнее, чем выполнить команды руками. Поэтому — ручной runbook ниже.

## Что выполнить на сервере СЕЙЧАС (по порядку)

Скрипты `/tmp/aivita_hardening.sh`, `/tmp/redis_hardening.sh`, `/tmp/close_ports.sh` уже лежат на сервере
с прошлой сессии. Выполнять как root.

```bash
echo "=== [1] Снимок нагрузки (форензика — сохранить вывод!) ==="
ps aux --sort=-%cpu | head -10
echo "---"
docker stats --no-stream | sort -k3 -rh | head -10

echo ""
echo "=== [2] ВНИМАНИЕ: если в выводе выше виден майнер/подозрительный процесс ==="
echo "Перед kill — запишите PID, имя процесса/контейнера и путь к бинарю (через ls -la /proc/<PID>/exe)."
echo "Затем для обычного процесса:   kill -9 <PID>"
echo "Для контейнера:                docker kill <container_name>"
echo "(Эти команды НЕ выполняются автоматически — впишите PID/имя руками после просмотра вывода [1].)"

echo ""
echo "=== [3] Redis hardening — закрыть Redis от интернета ==="
if [ -f /tmp/redis_hardening.sh ]; then bash /tmp/redis_hardening.sh; else echo "ПРОПУСК: /tmp/redis_hardening.sh не найден"; fi

echo ""
echo "=== [3b] Закрытие портов ==="
if [ -f /tmp/close_ports.sh ]; then bash /tmp/close_ports.sh; else echo "ПРОПУСК: /tmp/close_ports.sh не найден"; fi

echo ""
echo "=== [3c] Общий aivita hardening ==="
if [ -f /tmp/aivita_hardening.sh ]; then bash /tmp/aivita_hardening.sh; else echo "ПРОПУСК: /tmp/aivita_hardening.sh не найден"; fi

echo ""
echo "=== [4] Лимит CPU/RAM на контейнер aivita ==="
docker update --cpus="1.5" --memory="1g" $(docker ps -q -f name=aivita)

echo ""
echo "=== [5] Лимит CPU=1.0 на все контейнеры кроме postgres и n8n ==="
for c in $(docker ps --format '{{.Names}}' | grep -viE 'postgres|n8n'); do
  echo "  -> $c"
  docker update --cpus="1.0" "$c"
done

echo ""
echo "=== Итог: текущее состояние контейнеров ==="
docker stats --no-stream
```

## После выполнения

- Это **второй** скачок CPU подряд при невыполненном hardening — если майнер обнаружится снова после
  закрытия Redis, это означает persistence (cron, authorized_keys, новый systemd-сервис, web-shell) —
  нужен отдельный аудит `crontab -l`, `/etc/cron.*`, `~/.ssh/authorized_keys`, `last`, `systemctl list-units --type=service`.
- Ротация секретов (DB пароли, JWT, Telegram bot token, API ключи) обязательна, если Redis/любой сервис
  был доступен из интернета без пароля.
