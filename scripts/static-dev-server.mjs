import { createReadStream, promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i], process.argv[i + 1]);
}

const port = Number(args.get('--port') || 5500);
const root = path.resolve(args.get('--root') || process.cwd());

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf'],
]);

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function resolveRequestPath(req) {
  const requestUrl = new URL(req.url || '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    return null;
  }

  if (pathname === '/') pathname = '/index.html';
  const candidate = path.resolve(root, `.${pathname}`);
  const relative = path.relative(root, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return candidate;
}

const server = createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method || '')) {
    send(res, 405, 'Method Not Allowed');
    return;
  }

  const filePath = resolveRequestPath(req);
  if (!filePath) {
    send(res, 403, 'Forbidden');
    return;
  }

  try {
    let stat = await fs.stat(filePath);
    let finalPath = filePath;

    if (stat.isDirectory()) {
      finalPath = path.join(filePath, 'index.html');
      stat = await fs.stat(finalPath);
    }

    if (!stat.isFile()) {
      send(res, 404, 'Not Found');
      return;
    }

    const type = mimeTypes.get(path.extname(finalPath).toLowerCase()) || 'application/octet-stream';
    res.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': stat.size,
      'Content-Type': type,
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    createReadStream(finalPath).pipe(res);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      send(res, 404, 'Not Found');
      return;
    }

    console.error('[static-dev-server] Request failed:', error);
    send(res, 500, 'Internal Server Error');
  }
});

server.listen(port, () => {
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  console.log(`[static-dev-server] Serving ${root}`);
  console.log(`[static-dev-server] URL: http://localhost:${actualPort}`);
});

