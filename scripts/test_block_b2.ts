/**
 * scripts/test_block_b2.ts — Валидация интеграции Маркетинга в админку (Блок Б2)
 * 
 * Проверяет 6 ключевых условий:
 * 1. Без сессии на /marketing — редирект на вход админки (/auth/login).
 * 2. С сессией без права — 403 экраном админки (Доступ запрещён).
 * 3. С правом marketing / superadmin — открывается движок, действие пишется в журнал с именем оператора.
 * 4. Без сессии на /marketing/public-media/<опубликованный_файл> — файл отдаётся (200 + Accept-Ranges).
 * 5. Без сессии на /marketing/public-media/<черновик_или_несуществующий> — 404 Not Found.
 * 6. Без сессии на /marketing/api/... — редирект на вход, а не отдача данных.
 */

import { NextRequest } from 'next/server';
import { middleware } from '../apps/admin/src/middleware';
import { GET as handleMarketingProxy } from '../apps/admin/src/app/marketing/[[...path]]/route';

async function runTests() {
  console.log('========================================================================');
  console.log('🔍 ТЕСТИРОВАНИЕ БЛОКА Б2: РАЗДЕЛ «МАРКЕТИНГ» В АДМИНКЕ (6 ПРОВЕРОК)');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 6;

  // ---------------------------------------------------------------------------
  // 1. Без сессии на /marketing — редирект на вход админки
  // ---------------------------------------------------------------------------
  console.log('--- 1. Проверка: без сессии на /marketing ---');
  const req1 = new NextRequest('http://localhost:3000/marketing', {
    method: 'GET',
    headers: { 'accept': 'text/html' }
  });
  const mid1 = middleware(req1);
  const isRedirect1 = mid1.status >= 300 && mid1.status < 400;
  const location1 = mid1.headers.get('location') || '';

  if (isRedirect1 && location1.includes('/auth/login')) {
    console.log(`  [OK] Middleware перенаправляет неавторизованного пользователя:`);
    console.log(`       -> HTTP ${mid1.status} Redirect to: ${location1}`);
    passed++;
  } else {
    throw new Error(`Expected redirect to /auth/login, got: ${mid1.status} ${location1}`);
  }

  // ---------------------------------------------------------------------------
  // 2. С сессией без права — 403 экраном админки
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Проверка: с сессией без права marketing ---');
  // Эмуляция вызова handleMarketingProxy с фиктивным пользователем без права marketing
  // Запрос с токеном оператора без прав
  const req2 = new NextRequest('http://localhost:3000/marketing', {
    method: 'GET',
    headers: {
      'cookie': 'access_token=token_support_no_marketing',
      'accept': 'text/html'
    }
  });

  // Мокаем fetch для /v1/auth/me внутри getOperator
  const originalFetch = global.fetch;
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = String(input);
    if (urlStr.includes('/v1/auth/me')) {
      return new Response(JSON.stringify({
        id: 'usr_support_001',
        email: 'support@medsoft.uz',
        fullName: 'Азиз (Оператор поддержки)',
        role: 'support_operator',
        isActive: true,
        rights: ['aivita:support', 'users:read', 'main:read']
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return originalFetch(input, init);
  };

  const res2 = await handleMarketingProxy(req2);
  const html2 = await res2.text();

  if (res2.status === 403 && (html2.includes('403') || html2.includes('Доступ запрещён'))) {
    console.log(`  [OK] Запрос оператора без прав заблокирован:`);
    console.log(`       -> HTTP ${res2.status} Forbidden, отображён защитный экран 403 админки.`);
    passed++;
  } else {
    throw new Error(`Expected HTTP 403 with forbidden screen, got: ${res2.status}`);
  }

  // ---------------------------------------------------------------------------
  // 3. С правом marketing — открывается движок, передаются X-Operator-*
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Проверка: с правом marketing (суперадмин / маркетолог) ---');
  let capturedHeaders: Record<string, string> = {};
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = String(input);
    if (urlStr.includes('/v1/auth/me')) {
      return new Response(JSON.stringify({
        id: 'usr_marketer_007',
        email: 'marketer@medsoft.uz',
        fullName: 'Камилла Маркетолог',
        role: 'marketer',
        isActive: true,
        rights: ['marketing', 'marketing:read', 'marketing:manage']
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (urlStr.includes('8080/marketing')) {
      // Сохраняем заголовки, отправленные маркетинговому движку
      if (init?.headers) {
        capturedHeaders = init.headers as Record<string, string>;
      }
      return new Response(`<!DOCTYPE html><html><body><div class="app-layout">AIVITA Media Hub — Движок запущен</div></body></html>`, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8'
        }
      });
    }
    return originalFetch(input, init);
  };

  const req3 = new NextRequest('http://localhost:3000/marketing', {
    method: 'GET',
    headers: {
      'cookie': 'access_token=token_marketer_valid',
      'accept': 'text/html'
    }
  });
  const res3 = await handleMarketingProxy(req3);
  const text3 = await res3.text();

  if (res3.status === 200 &&
      text3.includes('AIVITA Media Hub') &&
      capturedHeaders['X-Operator-Id'] === 'usr_marketer_007' &&
      capturedHeaders['X-Operator-Name'] === 'Камилла Маркетолог') {
    console.log(`  [OK] Движок успешно проксирован (HTTP 200 OK).`);
    console.log(`       -> Переданы безопасные заголовки оператора:`);
    console.log(`          X-Operator-Id: ${capturedHeaders['X-Operator-Id']}`);
    console.log(`          X-Operator-Name: ${capturedHeaders['X-Operator-Name']}`);
    console.log(`          X-Operator-Role: ${capturedHeaders['X-Operator-Role']}`);
    passed++;
  } else {
    throw new Error(`Expected proxy to engine with headers, got status ${res3.status}, headers: ${JSON.stringify(capturedHeaders)}`);
  }

  // ---------------------------------------------------------------------------
  // 4. Без сессии на /marketing/public-media/<опубликованный_файл> — файл отдаётся
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Проверка: без сессии на /marketing/public-media/<опубликованный_файл> ---');
  // Проверяем middleware исключение
  const req4 = new NextRequest('http://localhost:3000/marketing/public-media/media_master_intro_1080x1920.mp4', {
    method: 'GET',
    headers: {
      'user-agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
    }
  });
  const mid4 = middleware(req4);
  // Не должно быть редиректа на /auth/login
  if (mid4.status >= 300 && mid4.status < 400 && mid4.headers.get('location')?.includes('/auth/login')) {
    throw new Error('Public media must not be redirected to login!');
  }

  // Проверяем отработку прокси
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = String(input);
    if (urlStr.includes('/marketing/public-media/media_master_intro_1080x1920.mp4')) {
      // Убеждаемся, что заголовки оператора НЕ передаются для публичного медиа
      const h = (init?.headers || {}) as Record<string, string>;
      if (h['X-Operator-Id'] || h['X-Operator-Name']) {
        throw new Error('Operator headers must NOT be sent for unauthenticated public media requests!');
      }
      return new Response(new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]), {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': '9923450',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }
    return originalFetch(input, init);
  };

  const res4 = await handleMarketingProxy(req4);
  if (res4.status === 200 &&
      res4.headers.get('content-type') === 'video/mp4' &&
      res4.headers.get('accept-ranges') === 'bytes') {
    console.log(`  [OK] Публичный медиафайл отдан роботу Meta без сессии:`);
    console.log(`       -> HTTP ${res4.status} OK, Content-Type: ${res4.headers.get('content-type')}`);
    console.log(`       -> Accept-Ranges: ${res4.headers.get('accept-ranges')}`);
    console.log(`       -> Заголовки оператора не передавались.`);
    passed++;
  } else {
    throw new Error(`Expected HTTP 200 video/mp4 with Accept-Ranges, got: ${res4.status} ${res4.headers.get('content-type')}`);
  }

  // ---------------------------------------------------------------------------
  // 5. Без сессии на /marketing/public-media/<черновик_или_несуществующий> — 404
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Проверка: без сессии на /marketing/public-media/<черновик_или_несуществующий> ---');
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = String(input);
    if (urlStr.includes('/marketing/public-media/draft_unpublished_video.mp4')) {
      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
    return originalFetch(input, init);
  };

  const req5 = new NextRequest('http://localhost:3000/marketing/public-media/draft_unpublished_video.mp4', {
    method: 'GET'
  });
  const res5 = await handleMarketingProxy(req5);
  if (res5.status === 404) {
    console.log(`  [OK] Запрос к неопубликованному файлу возвращает HTTP 404 Not Found без утечки данных.`);
    passed++;
  } else {
    throw new Error(`Expected HTTP 404 for draft file, got: ${res5.status}`);
  }

  // ---------------------------------------------------------------------------
  // 6. Без сессии на /marketing/api/... — редирект на вход
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Проверка: без сессии на /marketing/api/... ---');
  const req6 = new NextRequest('http://localhost:3000/marketing/api/reaction/snapshots', {
    method: 'GET'
  });
  const mid6 = middleware(req6);
  const isRedirect6 = mid6.status >= 300 && mid6.status < 400;
  const location6 = mid6.headers.get('location') || '';

  if (isRedirect6 && location6.includes('/auth/login')) {
    console.log(`  [OK] Запрос к внутреннему API /marketing/api/... без сессии перенаправлен на вход:`);
    console.log(`       -> HTTP ${mid6.status} Redirect to: ${location6}`);
    console.log(`       -> Сырые данные API защищены от прямого неавторизованного доступа.`);
    passed++;
  } else {
    throw new Error(`Expected API request to redirect to login, got: ${mid6.status} ${location6}`);
  }

  // Восстанавливаем оригинальный fetch
  global.fetch = originalFetch;

  console.log('\n========================================================================');
  console.log(`🎉 ВСЕ ${passed} ИЗ ${total} ПРОВЕРОК БЛОКА Б2 УСПЕШНО ПРОЙДЕНЫ (100% OK)!`);
  console.log('========================================================================');
}

runTests().catch((err) => {
  console.error('\n❌ Ошибка валидации Блока Б2:', err);
  process.exit(1);
});
