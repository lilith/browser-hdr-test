# Browser HDR & Wide Gamut Test

Interactive test page for detecting actual HDR brightness headroom and wide color gamut support in browsers.

**[Live Test](https://yourusername.github.io/browser-hdr-test/)** | [Documentation](BROWSER_HDR_TEST.md)

## Features

### HDR Headroom Test
- Pairwise brightness comparison using WebGPU
- Binary search to 0.25x precision
- Triple confirmation of detected ceiling
- Detects headroom from 1.0x to 4.0x+

### Color Gamut Test
- Tests P3 colors outside sRGB
- Tests Rec.2020 colors outside P3
- Pairwise comparison of wide gamut vs sRGB-clipped versions
- Uses CSS `color(display-p3 ...)` for accurate color rendering

### Capability Detection
- WebGPU availability and features
- Display media queries (dynamic-range, color-gamut)
- CSS dynamic-range-limit support
- GPU adapter information

## Quick Results

| Platform | HDR Headroom | P3 Gamut | Notes |
|----------|--------------|----------|-------|
| Windows Chrome | ≥4.0x | ✅ | Full HDR support |
| macOS Safari | 2-8x | ✅ | EDR varies by display |
| iOS Safari | ~2.0x | ✅ | |
| Android Chrome | 2.0x* | ✅* | *Requires Samsung Super HDR |

## Android Setup

1. **For HDR**: Enable Samsung "Super HDR" in Settings → Advanced Features
2. **For P3**: Set `chrome://flags/#force-color-profile` to "Display P3 D65"

## Usage

Just open the test page and follow the on-screen instructions:
1. Tap the brighter/more saturated patch
2. Tap "same" if they look identical
3. Copy the generated report to share

## Local Development

```bash
# Serve locally (requires HTTPS for WebGPU)
python3 -m http.server 8080
# Then open https://localhost:8080
```

Or use any static file server. For WebGPU to work, you need either:
- HTTPS
- localhost
- `chrome://flags/#unsafely-treat-insecure-origin-as-secure`

## Technical Details

See [BROWSER_HDR_TEST.md](BROWSER_HDR_TEST.md) for full documentation including:
- WebGPU HDR canvas configuration
- CSS dynamic-range-limit property
- scRGB vs HDR10 color profiles
- Android compositor architecture

## License

MIT
