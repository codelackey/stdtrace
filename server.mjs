import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialSections } from './data.js';

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
let sections = structuredClone(initialSections);
const clients = new Set();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function broadcast() {
  const msg = `data: ${JSON.stringify(sections)}\n\n`;
  for (const res of clients) res.write(msg);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // 1. Live SSE stream for all connected browser clients
  if (url.pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write(`data: ${JSON.stringify(sections)}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  // 2. Toggle switch or reset state -> broadcast to all clients
  if (url.pathname === '/api/toggle' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { section_id, reset } = JSON.parse(body || '{}');

    if (reset) {
      sections = structuredClone(initialSections);
    } else {
      const sec = sections.find(s => s.section_id === section_id);
      if (sec) sec.is_open = sec.is_open ? 0 : 1;
    }

    broadcast();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // 3. Static file server (index.html, style.css, app.js, data.js)
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

server.listen(3000, () => console.log('Control room server running at http://localhost:3000'));
