import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createDevServer } from './server.mjs';

const read = path => readFile(new URL(path, import.meta.url));
const fixtureManifest = JSON.parse(await read('jpeg/fixtures.json'));

test('JPEG fixtures retain the original source bytes', async () => {
  for (const file of fixtureManifest.files) {
    const bytes = await read(`jpeg/${file.path}`);
    assert.equal(bytes.length, file.size, file.path);
    const hash = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    assert.equal(hash, file.gitBlob, file.path);
  }
});

test('suite navigation and relative image/module links work under a Pages prefix', async () => {
  const pages = ['index.html', 'jpeg/index.html', 'wasm/index.html'];
  const known = new Set([
    '/browser-hdr-test/', '/browser-hdr-test/jpeg/', '/browser-hdr-test/wasm/',
    '/browser-hdr-test/PRIVACY.md', '/browser-hdr-test/wasm/probe.mjs',
    ...fixtureManifest.files.map(file => `/browser-hdr-test/jpeg/${file.path}`),
  ]);
  for (const page of pages) {
    const html = (await read(page)).toString();
    const base = new URL(page.replace(/index\.html$/, ''), 'https://example.com/browser-hdr-test/');
    assert.match(html, /aria-label="Browser tests"/);
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"|from '([^']+\.mjs)'/g)) {
      const link = match[1] || match[2];
      if (/^(https?:|data:|#)/.test(link)) continue;
      assert.ok(known.has(new URL(link, base).pathname), `${page}: ${link}`);
    }
  }
});

test('dev server serves all pages/assets and keeps repository files private', async t => {
  const server = createDevServer();
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [path, type] of [
    ['/', 'text/html'], ['/jpeg/', 'text/html'], ['/wasm/', 'text/html'],
    ['/wasm/probe.mjs', 'text/javascript'], ['/PRIVACY.md', 'text/plain'],
    ...fixtureManifest.files.map(file => [`/jpeg/${file.path}`, 'image/jpeg']),
  ]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.ok(response.headers.get('content-type').startsWith(type), path);
    assert.equal(response.headers.get('cache-control'), 'no-store', path);
    assert.ok((await response.arrayBuffer()).byteLength > 0, path);
  }
  for (const path of ['/jpeg', '/wasm']) {
    const response = await fetch(base + path, { redirect: 'manual' });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), path + '/');
  }
  for (const path of ['/.git/config', '/server.mjs', '/missing']) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
  const head = await fetch(base + '/wasm/', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});
