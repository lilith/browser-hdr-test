// Set PLAYWRIGHT_MODULE to an installed playwright or playwright-core ESM entry.
import assert from 'node:assert/strict';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.argv[2] || 'https://lilith.github.io/browser-hdr-test/');
const engine = process.env.BROWSER_ENGINE === 'webkit' ? webkit : chromium;
const browser = await engine.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  console.log(`Browser engine: ${browser.browserType().name()} ${browser.version()}`);
  for (const path of ['', 'jpeg/', 'wasm/']) {
    const response = await page.goto(new URL(path, base).href);
    assert.equal(response.status(), 200);
    assert.equal(await page.locator('nav[aria-label="Browser tests"] a').count(), 3);
    if (path === 'wasm/') {
      await page.waitForFunction(() => document.querySelector('#retry')?.disabled === false
        && document.querySelector('#result')?.textContent !== 'Testing…');
      assert.doesNotMatch(await page.locator('#result').innerText(), /Test error/);
      const details = JSON.parse(await page.locator('#details').textContent());
      assert.equal(typeof details.results.wasm.ok, 'boolean');
      assert.deepEqual(Object.keys(details.fma), ['f32', 'f64']);
      assert.doesNotMatch(await page.locator('#fma').innerText(), /Testing/);
      console.log('WASM/FMA browser results:', JSON.stringify({ results: details.results, fma: {
        f32: details.fma.f32.state, f64: details.fma.f64.state,
      } }));
      await page.locator('#retry').click();
      await page.waitForFunction(() => document.querySelector('#retry').disabled === false);
    }
    if (path === 'jpeg/') {
      for (const src of ['sof0_baseline.jpg', 'sof2_progressive.jpg']) {
        const image = page.locator(`img[src="${src}"]`);
        await image.evaluate(img => img.decode());
        assert.ok(await image.evaluate(img => img.naturalWidth > 0));
      }
    }
    console.log(`Browser loaded: ${new URL(path, base)}`);
  }
  if (process.env.CHECK_LEGACY_REDIRECTS === '1') {
    const redirects = [
      ['https://lilith.github.io/browser-jpeg-support/', new URL('jpeg/', base).href],
    ];
    if (process.env.LEGACY_WASM_URL) redirects.push([process.env.LEGACY_WASM_URL, new URL('wasm/', base).href]);
    for (const [source, destination] of redirects) {
      await page.goto(source);
      await page.waitForURL(destination);
      console.log(`Verified legacy redirect: ${source} -> ${destination}`);
    }
  }
  assert.deepEqual(errors, [], 'Uncaught browser exceptions');
} finally {
  await browser.close();
}
