# Sounds

Звуковые файлы генерируются в runtime через Web Audio API (см. lib/voice-notifications.ts).
Статические MP3/WAV файлы не используются — тоны создаются программно.

Типы тонов:
- reminder  — 660Hz, sine, 2 beeps
- medication — 880Hz, sine, 3 beeps  
- urgent    — 1200Hz, square, 5 beeps
- gentle    — 528Hz, sine, 1 beep
