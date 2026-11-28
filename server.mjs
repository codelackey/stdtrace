import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialSections } from './data.js';

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const baseById = new Map(initialSections.map(s => [s.section_id, s]));
const overrides = new Map(); // Stores only off-nominal states: section_id -> 0 | 1
const clients = new Set();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] [SERVER] ${msg}`);
}

function broadcast(payload) {
  const raw = JSON.stringify(payload);
  const msg = `data: ${raw}\n\n`;
  log(`Broadcasting ${raw} (${raw.length} bytes) to ${clients.size} client(s)`);
  for (const res of clients) res.write(msg);
}

setInterval(() => {
  for (const res of clients) res.write(': ping\n\n');
}, 25000).unref();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // 1. Live SSE stream
  if (url.pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    const initPayload = { type: 'INIT', overrides: Object.fromEntries(overrides) };
    res.write(`data: ${JSON.stringify(initPayload)}\n\n`);
    clients.add(res);
    log(`Client connected (active clients: ${clients.size}, active overrides: ${overrides.size})`);

    req.on('close', () => {
      clients.delete(res);
      log(`Client disconnected (active clients: ${clients.size})`);
    });
    return;
  }

  // 2. Toggle switch or reset
  if (url.pathname === '/api/toggle' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { section_id, reset } = JSON.parse(body || '{}');

    if (reset) {
      overrides.clear();
      log('Received RESET request -> cleared all overrides');
      broadcast({ type: 'RESET' });
    } else if (baseById.has(section_id)) {
      const baseSec = baseById.get(section_id);
      const currentOpen = overrides.has(section_id) ? overrides.get(section_id) : baseSec.is_open;
      const nextOpen = currentOpen ? 0 : 1;

      if (nextOpen === baseSec.is_open) overrides.delete(section_id);
      else overrides.set(section_id, nextOpen);

      log(`Toggled ${section_id}: ${currentOpen ? 'OPEN' : 'CLOSED'} -> ${nextOpen ? 'OPEN' : 'CLOSED'} (active overrides: ${overrides.size})`);
      broadcast({ type: 'DELTA', section_id, is_open: nextOpen });
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // 3. Static file server
  const relPath = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
  const filePath = path.resolve(ROOT_DIR, relPath);
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(3000, () => log('Delta Sync control room listening at http://localhost:3000'));
