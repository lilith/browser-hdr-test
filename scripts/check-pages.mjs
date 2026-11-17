import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = new URL(process.argv[2] || 'https://lilith.github.io/browser-hdr-test/');
if (!base.pathname.endsWith('/')) throw new Error('Base URL must end with a slash.');
const manifest = JSON.parse(await readFile(new URL('../jpeg/fixtures.json', import.meta.url)));
for (const path of [
  '', 'jpeg/', 'wasm/', 'wasm/probe.mjs',
  ...manifest.files.map(file => `jpeg/${file.path}`),
]) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, path);
  if (path.endsWith('.mjs')) assert.match(response.headers.get('content-type'), /javascript/, path);
  const localPath = path === '' ? 'index.html' : path.endsWith('/') ? path + 'index.html' : path;
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.deepEqual(bytes, await readFile(new URL('../' + localPath, import.meta.url)), path);
  console.log(`Verified deployed bytes: ${path || '/'}`);
}
for (const path of ['jpeg', 'wasm']) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, path);
  assert.equal(response.url, new URL(path + '/', base).href, path);
}
const missing = await fetch(new URL('not-a-test/', base));
assert.equal(missing.status, 404);
assert.match(await missing.text(), /Choose a browser test/);
console.log('Verified directory redirects and custom 404.');
