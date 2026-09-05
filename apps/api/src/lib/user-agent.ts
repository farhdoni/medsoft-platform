// Простой парсинг User-Agent для отображения "браузер · ОС" в списках
// сессий (admin_sessions.user_agent). Не претендует на точность uap-core —
// порядок проверок важен (Edge/Opera строки содержат "Chrome", Chrome
// строка содержит "Safari"), поэтому более специфичные паттерны идут
// раньше более общих.
export function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Неизвестное устройство';

  // iPhone/iPad UAs contain the literal substring "like Mac OS X", so the
  // iOS check must run before the macOS one or every iPhone gets labeled
  // "macOS".
  const os =
    /iPhone|iPad|iPod/.test(userAgent) ? 'iOS' :
    /Windows/.test(userAgent) ? 'Windows' :
    /Mac OS X/.test(userAgent) ? 'macOS' :
    /Android/.test(userAgent) ? 'Android' :
    /Linux/.test(userAgent) ? 'Linux' :
    'неизвестная ОС';

  const browser =
    /Edg\//.test(userAgent) ? 'Edge' :
    /OPR\//.test(userAgent) ? 'Opera' :
    /Chrome\//.test(userAgent) ? 'Chrome' :
    /Firefox\//.test(userAgent) ? 'Firefox' :
    /Safari\//.test(userAgent) ? 'Safari' :
    'неизвестный браузер';

  return `${browser} · ${os}`;
}
