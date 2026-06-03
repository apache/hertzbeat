import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { resolveAngularReferenceStubResponse } from './angular-reference-server-lib.mjs';

const scriptFile = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptFile);
const webNextDir = path.resolve(scriptDir, '..', '..');
const repoRoot = path.resolve(webNextDir, '..');
const legacyReferenceDistDir = process.env.LEGACY_REFERENCE_DIST_DIR
  ? path.resolve(process.env.LEGACY_REFERENCE_DIST_DIR)
  : path.join(repoRoot, '.tmp', 'legacy-web-reference-dist');
const backendOrigin = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:1157';

function parsePort(argv) {
  const index = argv.findIndex(value => value === '--port');
  if (index >= 0 && argv[index + 1]) {
    return Number.parseInt(argv[index + 1], 10);
  }
  return Number.parseInt(process.env.ANGULAR_REFERENCE_PORT || '4301', 10);
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}

function safeJoinStaticPath(requestPath) {
  const pathname = decodeURIComponent(new URL(requestPath, 'http://127.0.0.1').pathname);
  const normalized = path.normalize(path.join(legacyReferenceDistDir, pathname));
  if (!normalized.startsWith(legacyReferenceDistDir)) {
    return null;
  }
  return normalized;
}

async function proxyToBackend(req, res) {
  const body =
    req.method === 'GET' || req.method === 'HEAD'
      ? undefined
      : await new Promise(resolve => {
          const chunks = [];
          req.on('data', chunk => {
            chunks.push(chunk);
          });
          req.on('end', () => {
            resolve(Buffer.concat(chunks));
          });
        });

  async function fetchBackend(targetUrl) {
    return fetch(targetUrl, {
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers).filter(([key, value]) => key !== 'host' && typeof value === 'string')
      ),
      body
    });
  }

  const targetUrl = new URL(req.url, backendOrigin);
  let upstream = await fetchBackend(targetUrl);

  if (upstream.status === 404 && targetUrl.pathname.startsWith('/api/')) {
    const fallbackUrl = new URL(targetUrl);
    fallbackUrl.pathname = targetUrl.pathname.replace(/^\/api/, '') || '/';
    upstream = await fetchBackend(fallbackUrl);
  }

  const stubResponse = resolveAngularReferenceStubResponse({
    method: req.method,
    targetUrl,
    upstreamStatus: upstream.status
  });
  if (stubResponse) {
    res.writeHead(stubResponse.status, stubResponse.headers);
    res.end(stubResponse.body);
    return;
  }

  res.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()));
  const arrayBuffer = await upstream.arrayBuffer();
  res.end(Buffer.from(arrayBuffer));
}

function serveFile(filePath, res) {
  res.writeHead(200, {
    'Content-Type': contentType(filePath)
  });
  createReadStream(filePath).pipe(res);
}

function serveFallbackIndex(res) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8'
  });
  res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>HertzBeat legacy reference stub</title>
  </head>
  <body>
    <main data-angular-reference-stub="legacy-web-removed">
      HertzBeat legacy reference stub
    </main>
  </body>
</html>`);
}

function acceptsHtmlNavigation(req) {
  const accept = req.headers.accept;
  return (
    (req.method === 'GET' || req.method === 'HEAD') &&
    typeof accept === 'string' &&
    accept.includes('text/html')
  );
}

const port = parsePort(process.argv.slice(2));
const hasAngularDist = existsSync(path.join(legacyReferenceDistDir, 'index.html'));

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.writeHead(400);
      res.end('Missing request url');
      return;
    }

    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    const staticPath = safeJoinStaticPath(req.url);
    if (staticPath && existsSync(staticPath) && statSync(staticPath).isFile()) {
      serveFile(staticPath, res);
      return;
    }

    if (!acceptsHtmlNavigation(req) || pathname.startsWith('/api/') || pathname.startsWith('/management/')) {
      await proxyToBackend(req, res);
      return;
    }

    if (hasAngularDist) {
      serveFile(path.join(legacyReferenceDistDir, 'index.html'), res);
      return;
    }

    serveFallbackIndex(res);
  } catch (error) {
    res.writeHead(500, {
      'Content-Type': 'text/plain; charset=utf-8'
    });
    res.end(`angular reference server failed: ${error instanceof Error ? error.message : String(error)}`);
  }
});

server.listen(port, '127.0.0.1', () => {
  const mode = hasAngularDist ? 'dist' : 'stub';
  process.stdout.write(`angular reference server listening on http://127.0.0.1:${port} (${mode})\n`);
});
