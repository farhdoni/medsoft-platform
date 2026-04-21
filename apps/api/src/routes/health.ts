import { Hono } from 'hono';

export const healthRouter = new Hono();

healthRouter.get('/', (c) => c.json({ status: 'ok', time: new Date().toISOString() }));
