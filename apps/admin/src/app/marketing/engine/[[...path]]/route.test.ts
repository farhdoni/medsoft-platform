import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Регрессия на прод-дефект 2026-09-07: POST/PUT/PATCH с телом больше ~25-30 МБ
// (загрузка видео в медиатеку) проксировались через `body: req.body, duplex: 'half'` —
// апстрим (движок) получал и обрабатывал файл корректно, но fetch() в этом хендлере
// резолвился с ПУСТЫМ телом ответа вместо JSON с карточкой материала (проверено
// отдельно: прямой curl к движку в обход этого хендлера отрабатывал верно для того
// же файла, а не-Next.js Node-скрипт с тем же паттерном fetch тоже отрабатывал верно —
// значит ломало именно потоковое чтение req.body у Next.js Route Handler). Фикс —
// буферизация тела запроса через req.arrayBuffer() вместо потоковой пересылки.
//
// Этот тест не воспроизводит порог 25-30 МБ (мокнутый fetch не гоняет байты по
// реальному сокету), а фиксирует структурный факт исправления: тело запроса,
// уходящее к движку, — это законченный буфер точного размера, а не поток, который
// хендлер передал бы дальше не читая.

const originalFetch = global.fetch;

describe('marketing/engine proxy — request body forwarding', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('forwards a large POST body to the engine as a fully-read buffer, not a stream', async () => {
    const bodySize = 2 * 1024 * 1024; // 2 МБ — размер не важен для этой проверки, важна структура
    const bodyBytes = new Uint8Array(bodySize).fill(7);

    let capturedEngineInit: RequestInit | undefined;

    global.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/v1/auth/me')) {
        return new Response(
          JSON.stringify({ id: 'op1', role: 'marketer', rights: ['marketing:manage'], isActive: true, fullName: 'Тест Оператор' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('/marketing/engine/api/media/upload')) {
        capturedEngineInit = init;
        return new Response(JSON.stringify({ status: 'success', data: { id: 'med_test' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Unexpected fetch URL in test: ' + url);
    }) as unknown as typeof fetch;

    const { POST } = await import('./route');

    const req = new NextRequest('http://localhost/marketing/engine/api/media/upload', {
      method: 'POST',
      headers: {
        cookie: 'access_token=test-token',
        'content-type': 'multipart/form-data; boundary=x',
      },
      body: bodyBytes,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const forwarded = await res.json();
    expect(forwarded).toEqual({ status: 'success', data: { id: 'med_test' } });

    expect(capturedEngineInit).toBeDefined();
    // Раньше: capturedEngineInit.body === req.body (ReadableStream), duplex: 'half'.
    // Теперь: тело буферизовано целиком, полный размер сохранён.
    expect(capturedEngineInit!.duplex).toBeUndefined();
    const forwardedBody = capturedEngineInit!.body;
    expect(forwardedBody).not.toBeInstanceOf(ReadableStream);
    const forwardedByteLength =
      forwardedBody instanceof ArrayBuffer
        ? forwardedBody.byteLength
        : forwardedBody instanceof Uint8Array
          ? forwardedBody.byteLength
          : -1;
    expect(forwardedByteLength).toBe(bodySize);
  });

  it('sends no body for GET requests', async () => {
    let capturedEngineInit: RequestInit | undefined;

    global.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/v1/auth/me')) {
        return new Response(
          JSON.stringify({ id: 'op1', role: 'marketer', rights: ['marketing:manage'], isActive: true, fullName: 'Тест Оператор' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('/marketing/engine/api/media')) {
        capturedEngineInit = init;
        return new Response(JSON.stringify({ status: 'success', data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Unexpected fetch URL in test: ' + url);
    }) as unknown as typeof fetch;

    const { GET } = await import('./route');

    const req = new NextRequest('http://localhost/marketing/engine/api/media', {
      method: 'GET',
      headers: { cookie: 'access_token=test-token' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(capturedEngineInit!.body).toBeUndefined();
  });
});
