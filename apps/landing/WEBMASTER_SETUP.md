# Webmaster Verification — ручные шаги (один раз в браузере)

## Статус
- [x] IndexNow ключ: `6e3a3321e0a7ac487e75f14c6909ebf9` — задеплоен, 8 URL отправлены (202/200)
- [ ] Google Search Console
- [ ] Яндекс Вебмастер  
- [ ] Bing Webmaster Tools

---

## Google Search Console

1. https://search.google.com/search-console → «Добавить ресурс»
2. Тип: **Префикс URL** → `https://aivita.uz/`
3. Верификация → **HTML-файл**
4. Скачать файл (имя вида `googleXXXXXXXXXXXXXXXX.html`)
5. Положить на сервер:
   ```bash
   scp googleXXXXXXXXXXXXXXXX.html root@109.123.249.224:/var/www/aivita-landing/
   ```
6. Проверить: `curl https://aivita.uz/googleXXXXXXXXXXXXXXXX.html` → `google-site-verification: ...`
7. Нажать «Подтвердить»
8. Sitemaps → `sitemap.xml` → «Отправить»

**Также скопировать файл в репо** (`apps/landing/`) и закоммитить на эту ветку:
```bash
cp googleXXXXXXXXXXXXXXXX.html apps/landing/
git add apps/landing/googleXXXXXXXXXXXXXXXX.html
git commit -m "feat(seo): GSC verification file"
git push origin fix/search-console-verification
```

---

## Яндекс Вебмастер

1. https://webmaster.yandex.ru → «Добавить сайт» → `https://aivita.uz`
2. Верификация → **HTML-файл** (имя вида `yandex_XXXXXXXXXXXXXXXX.html`)
3. Положить на сервер:
   ```bash
   scp yandex_XXXXXXXXXXXXXXXX.html root@109.123.249.224:/var/www/aivita-landing/
   ```
4. «Проверить»
5. Индексирование → Файлы Sitemap → `https://aivita.uz/sitemap.xml`
6. Региональность → Узбекистан

**Также в репо** (аналогично GSC).

---

## Bing Webmaster Tools

1. https://www.bing.com/webmasters → Sign in with Google (farhodni@gmail.com)
2. **«Import from Google Search Console»** → авторизовать → aivita.uz подтянется автоматически
3. Если импорт не работает → «Add a site» → `https://aivita.uz` → HTML-файл верификации

---

## IndexNow (уже выполнено)

- Ключ: `6e3a3321e0a7ac487e75f14c6909ebf9`
- Файл: `https://aivita.uz/6e3a3321e0a7ac487e75f14c6909ebf9.txt` → 200
- Отправлено: indexnow.org (202), yandex.com (202), bing.com (200)
- 8 URL: /, /about.html, /pricing.html, /clinics.html, /start.html, /get-app.html, /privacy.html, /terms.html
