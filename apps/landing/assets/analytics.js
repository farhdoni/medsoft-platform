/*
 * Аналитика лендинга aivita.uz + баннер согласия на cookie.
 *
 * Подключается одной строкой на КАЖДОЙ странице лендинга:
 *   <script src="/assets/analytics.js" defer></script>
 *
 * - Согласие хранится в cookie `aivita_consent` (granted | denied) на
 *   .aivita.uz — его же читает приложение app.aivita.uz, так что человек
 *   отвечает один раз на оба сайта. Срок — год.
 * - Пока ответа нет — показывается баннер. Метрика и GTM НЕ загружаются,
 *   пока человек не нажал «Принять». «Отклонить» — не грузится ничего.
 * - ID счётчиков берутся из /api/landing-config (landing_config.payload:
 *   yandex_metrika_id, gtm_id) — одно место и для лендинга, и для
 *   приложения. Пустой ID — соответствующий тег просто не грузится.
 */
(function () {
  'use strict';

  var CONSENT_COOKIE = 'aivita_consent';
  var ONE_YEAR = 365 * 24 * 60 * 60;

  function readConsent() {
    var m = document.cookie.match(/(?:^|;\s*)aivita_consent=(granted|denied)/);
    return m ? m[1] : null;
  }

  function writeConsent(value) {
    var host = location.hostname;
    var domain = /(^|\.)aivita\.uz$/.test(host) ? '; domain=.aivita.uz' : '';
    var secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = CONSENT_COOKIE + '=' + value + '; max-age=' + ONE_YEAR +
      '; path=/' + domain + '; SameSite=Lax' + secure;
  }

  // ─── Tags ──────────────────────────────────────────────────────────────────

  var configPromise = null;
  function loadConfig() {
    if (!configPromise) {
      configPromise = fetch('/api/landing-config', { credentials: 'omit' })
        .then(function (r) { return r.ok ? r.json() : {}; })
        .catch(function () { return {}; });
    }
    return configPromise;
  }

  function loadMetrika(id) {
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    window.ym(id, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true });
  }

  function loadGtm(id) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
  }

  function metrikaId(cfg) {
    var id = Number(cfg && cfg.yandex_metrika_id);
    return id > 0 ? id : null;
  }
  function gtmId(cfg) {
    var id = cfg && cfg.gtm_id;
    return typeof id === 'string' && /^GTM-[A-Z0-9]+$/.test(id) ? id : null;
  }

  var tagsStarted = false;
  function startTags() {
    if (tagsStarted) return;
    tagsStarted = true;
    loadConfig().then(function (cfg) {
      var ym = metrikaId(cfg);
      if (ym) loadMetrika(ym);
      var gtm = gtmId(cfg);
      if (gtm) loadGtm(gtm);
    });
  }

  // ─── Banner ────────────────────────────────────────────────────────────────

  var TEXT = {
    ru: { text: 'Мы используем cookie для аналитики: так мы понимаем, откуда к нам приходят и что улучшать.', accept: 'Принять', decline: 'Отклонить', more: 'Подробнее' },
    uz: { text: "Biz tahlil uchun cookie'lardan foydalanamiz: bu bizga qayerdan kelishingizni va nimani yaxshilashni tushunishga yordam beradi.", accept: 'Qabul qilaman', decline: 'Rad etaman', more: 'Batafsil' },
    en: { text: 'We use cookies for analytics — to see where visitors come from and what to improve.', accept: 'Accept', decline: 'Decline', more: 'Learn more' },
  };

  // Страницы /uz/ и /en/ сами объявляют язык в <html lang> — он главнее.
  // Русские страницы переключают язык на лету и помнят выбор в aivita_lang.
  function pickLang() {
    var page = (document.documentElement.lang || '').slice(0, 2).toLowerCase();
    if (page === 'uz' || page === 'en') return page;
    var stored = null;
    try { stored = localStorage.getItem('aivita_lang'); } catch (e) {}
    stored = (stored || '').slice(0, 2).toLowerCase();
    return TEXT[stored] ? stored : 'ru';
  }

  function showBanner() {
    var t = TEXT[pickLang()];
    var css = document.createElement('style');
    css.textContent =
      '.aiv-consent{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483000;' +
      'width:calc(100% - 32px);max-width:640px;box-sizing:border-box;display:flex;align-items:center;gap:12px;' +
      'padding:14px 16px;border-radius:16px;background:#1f1a2e;color:rgba(255,255,255,.88);' +
      'box-shadow:0 12px 32px rgba(0,0,0,.25);font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}' +
      '.aiv-consent p{margin:0;flex:1}' +
      '.aiv-consent a{color:#f0b6c2}' +
      '.aiv-consent button{border:0;border-radius:10px;padding:9px 14px;font:600 13px system-ui,sans-serif;cursor:pointer;white-space:nowrap}' +
      '.aiv-consent .aiv-yes{background:#c87d8a;color:#fff}' +
      '.aiv-consent .aiv-no{background:transparent;color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.25)}' +
      '@media (max-width:560px){.aiv-consent{flex-direction:column;align-items:stretch;text-align:center}.aiv-consent button{width:100%}}';
    document.head.appendChild(css);

    var box = document.createElement('div');
    box.className = 'aiv-consent';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-live', 'polite');
    var p = document.createElement('p');
    p.textContent = t.text + ' ';
    var a = document.createElement('a');
    a.href = '/privacy.html';
    a.textContent = t.more;
    p.appendChild(a);
    var no = document.createElement('button');
    no.type = 'button'; no.className = 'aiv-no'; no.textContent = t.decline;
    var yes = document.createElement('button');
    yes.type = 'button'; yes.className = 'aiv-yes'; yes.textContent = t.accept;
    box.appendChild(p); box.appendChild(no); box.appendChild(yes);
    document.body.appendChild(box);

    function close(value) {
      writeConsent(value);
      box.remove();
      if (value === 'granted') startTags();
    }
    yes.addEventListener('click', function () { close('granted'); });
    no.addEventListener('click', function () { close('denied'); });
  }

  // ─── Start ─────────────────────────────────────────────────────────────────

  // Баннер — только если есть на что соглашаться: пока в настройках нет ни
  // одного счётчика, человека не спрашиваем.
  var consent = readConsent();
  if (consent === 'granted') startTags();
  else if (consent === null) {
    loadConfig().then(function (cfg) {
      if (!metrikaId(cfg) && !gtmId(cfg)) return;
      if (document.body) showBanner();
      else document.addEventListener('DOMContentLoaded', showBanner);
    });
  }
})();
