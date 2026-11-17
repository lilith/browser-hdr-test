# Browser tests

One home for our browser capability checks. The repository keeps its original
name and HDR entry point so existing links continue to work.

| Test | Live page | Checks |
| --- | --- | --- |
| HDR & wide gamut | [Open](https://lilith.github.io/browser-hdr-test/) | Interactive brightness/gamut comparisons and browser capability reporting |
| JPEG support | [Open](https://lilith.github.io/browser-hdr-test/jpeg/) | Baseline, progressive, extended sequential, 12-bit, arithmetic, and CMYK JPEG samples |
| WebAssembly SIMD & FMA | [Open](https://lilith.github.io/browser-hdr-test/wasm/) | Basic WASM, standard/relaxed SIMD, and numerical Float32/Float64 fusion probes |

Run `npm start` (Node, no dependencies) to serve all three on port 3337, bound
to `0.0.0.0`. Open the server's hostname and port from your phone on the same
network. `PORT` overrides the port. Use the HTTPS live page for HDR/WebGPU on
remote devices; the local server serves HTTP, which does not provide WebGPU's
secure context requirement on another device.

Run `npm test` to verify routes, relative assets, original JPEG fixture hashes,
and the WASM/FMA probes. These checks do not establish JPEG decoding or display
behavior on iOS; open the pages on the device to measure those capabilities.

The HDR page retains its optional **Submit Results** flow; see [privacy](PRIVACY.md).
JPEG and WASM pages do not submit results. Details: [HDR](BROWSER_HDR_TEST.md),
[WASM/FMA](wasm/README.md), [migration and sources](docs/CONSOLIDATION.md).

GitHub Pages publishes `main` from the repository root. `.nojekyll` serves the
static pages and modules directly. `just check-pages` verifies deployed page and
fixture bytes, module content type, directory redirects, and the custom 404.
For browser QA, `just browser-smoke` uses an installed Playwright package
(`PLAYWRIGHT_MODULE` can select its ESM entry); `BROWSER_ENGINE=webkit` selects
WebKit instead of Chromium. This is not an iOS device test.
