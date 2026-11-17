import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const jpegFiles = [
  'cmyk_source.jpg', 'sof0_baseline.jpg', 'sof1_12bit_real.jpg',
  'sof1_block16.jpg', 'sof2_progressive.jpg', 'sof9_arithmetic.jpg', 'testorig_8bit.jpg',
];
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/jpeg/', ['jpeg/index.html', 'text/html; charset=utf-8']],
  ['/wasm/', ['wasm/index.html', 'text/html; charset=utf-8']],
  ['/wasm/probe.mjs', ['wasm/probe.mjs', 'text/javascript; charset=utf-8']],
  ['/PRIVACY.md', ['PRIVACY.md', 'text/plain; charset=utf-8']],
  ...jpegFiles.map(name => [`/jpeg/${name}`, [`jpeg/${name}`, 'image/jpeg']]),
]);

export function createDevServer() {
  return createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://server.invalid').pathname;
    if (pathname === '/jpeg' || pathname === '/wasm') {
      response.writeHead(308, { Location: `${pathname}/` }).end();
      return;
    }
    const file = files.get(pathname);
    if (!file || !['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(404).end('Not found');
      return;
    }
    try {
      const content = await readFile(new URL(file[0], import.meta.url));
      response.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) {
      console.error(error);
      response.writeHead(500).end('Could not load the page');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3337);
  createDevServer().listen(port, '0.0.0.0', () => console.log(`Listening on port ${port}`));
}
