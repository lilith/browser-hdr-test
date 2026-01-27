# Browser HDR & Wide Gamut Testing

Interactive test page for detecting HDR headroom and wide color gamut support in browsers.

**Live Test:** [https://yourusername.github.io/browser-hdr-test/](https://yourusername.github.io/browser-hdr-test/)

## Summary of Findings

### Platform Support Matrix

| Platform | Browser | HDR Headroom | P3 Gamut | Rec.2020 | Notes |
|----------|---------|--------------|----------|----------|-------|
| Windows 10/11 | Chrome/Brave | ≥4.0x | ✅ | Partial | Full HDR with NVIDIA/AMD |
| macOS | Safari | 2-8x | ✅ | ✅ | EDR headroom varies by display |
| macOS | Chrome | ≥4.0x | ✅ | Partial | |
| iOS 17+ | Safari | ~2.0x | ✅ | ✅ | |
| iOS 17+ | Chrome | ~2.0x | ✅ | ✅ | Uses WebKit |
| Android | Chrome/Brave | 2.0x* | ✅* | ❌ | *Requires Samsung "Super HDR" |

### Android-Specific Findings

#### What Works
- **Samsung "Super HDR"** - Enable in Settings → Advanced Features → Super HDR
  - Provides 2.0x HDR headroom in Chrome/Brave
  - WebGPU `rgba16float` + `toneMapping: extended` works
  - Headroom appears capped at 2.0x regardless of settings

#### What Doesn't Help
- `chrome://flags/#force-color-profile` - No effect on HDR headroom
  - All options (sRGB, P3, scRGB linear, HDR10, BT2020) show same 2.0x headroom
  - May affect color gamut but not HDR brightness
- Standard Android without Super HDR - HDR clamped to SDR (1.0x)

#### P3 Gamut on Android
- Set `chrome://flags/#force-color-profile` to "Display P3 D65" for wide gamut
- This affects gamut but not HDR headroom

### Key Technical Details

#### WebGPU HDR Requirements
```javascript
// Canvas must use rgba16float for HDR values > 1.0
const format = 'rgba16float';  // NOT getPreferredCanvasFormat()

ctx.configure({
    device,
    format: 'rgba16float',
    toneMapping: { mode: 'extended' },  // Critical for HDR output
    alphaMode: 'premultiplied',
});
```

#### CSS dynamic-range-limit
New CSS property to control HDR brightness:
```css
.hdr-content {
    dynamic-range-limit: no-limit;  /* Full HDR */
    /* Other values: standard, constrained */
}
```
- May help unlock HDR on some browsers
- Test page includes comparison with/without this property

#### Detection APIs
```javascript
// HDR display capability
const hdrDisplay = matchMedia('(dynamic-range: high)').matches;

// Color gamut
const p3 = matchMedia('(color-gamut: p3)').matches;
const rec2020 = matchMedia('(color-gamut: rec2020)').matches;

// CSS property support
const hasDynamicRangeLimit = CSS.supports('dynamic-range-limit', 'no-limit');
```

### HDR Headroom Detection Method

The test uses pairwise brightness comparisons with binary search:

1. **Baseline check** - Verify 1.0x vs 0.5x shows difference
2. **Coarse search** - Test at 1.0 intervals (2.0, 3.0, 4.0)
3. **Binary search** - Narrow to 0.25 precision within found range
4. **Confirmation** - Triple-test the boundary

This detects headroom values: 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0+

### Color Profile Investigation

#### scRGB Linear
- Extended range linear RGB (-0.5 to 7.5 typical)
- Can represent HDR and wide gamut
- Common on Windows for HDR compositing
- Browser converts internal HDR to display's native format

#### HDR10 (ST2084 + BT2020)
- PQ transfer function (Perceptual Quantizer)
- BT.2020 color primaries
- Up to 10,000 nits theoretical, ~1000 nits typical

#### Current Limitations
- **No JavaScript API to detect active color profile**
- `chrome://flags/#force-color-profile` doesn't expose selection to web content
- WebGPU `colorSpace` option only accepts `'srgb'` or `'display-p3'`
- Can only infer from behavior (gamut tests, headroom tests)

#### What We CAN Detect
```javascript
// Display capability (not active profile)
matchMedia('(color-gamut: p3)').matches
matchMedia('(color-gamut: rec2020)').matches
matchMedia('(dynamic-range: high)').matches

// Canvas color space support
canvas.getContext('2d', { colorSpace: 'display-p3' })
gpuContext.configure({ colorSpace: 'display-p3' })

// WebGL drawing buffer color space
gl.drawingBufferColorSpace = 'display-p3'  // if supported
```

#### What We CANNOT Detect
- Which `chrome://flags/#force-color-profile` is active
- Whether display is using scRGB, HDR10, or Dolby Vision
- Actual nits/headroom of display (only estimates)
- Whether system-level color management is active

#### Behavioral Tests (Indirect Detection)
Our tests can infer display capabilities through user perception:
1. **HDR Headroom Test** - measures actual brightness range the user can perceive
2. **Gamut Test** - measures which P3/Rec.2020 colors the user can distinguish
3. **These results may differ** from what media queries report (API vs reality)

## Test Features

### HDR Headroom Test
- Pairwise comparison of brightness patches
- Binary search to 0.25x precision
- Randomized left/right positions to avoid bias
- Triple confirmation of detected ceiling

### Color Gamut Test
- Tests colors outside sRGB that are within P3
- Tests colors outside P3 that are within Rec.2020
- Pairwise comparison: can you distinguish the saturated color from sRGB clipped version?

### Capability Detection
- WebGPU availability and features
- Display media queries (dynamic-range, color-gamut)
- CSS property support
- GPU adapter info

## Files

- `index.html` - Main test page
- `BROWSER_HDR_TEST.md` - This documentation

## Contributing

Test on your devices and share reports! The test page generates a copy-paste report with all detected capabilities and test results.

## References

- [WebGPU Canvas Configuration](https://www.w3.org/TR/webgpu/#canvas-configuration)
- [CSS dynamic-range-limit](https://developer.mozilla.org/en-US/docs/Web/CSS/dynamic-range-limit)
- [Android HDR](https://source.android.com/docs/core/display/hdr)
- [HDR on the Web (Chrome)](https://developer.chrome.com/blog/hdr-canvas/)

## Known Issues

### Android WebGPU HDR
WebGPU on Android claims full HDR support via API but output may be clamped to SDR without Samsung "Super HDR" enabled. Native apps (YouTube, Photos) can display HDR through different surface APIs that Chrome's WebGPU implementation doesn't use.

See [ANDROID-HDR-INVESTIGATION.md](./docs/ANDROID-HDR-INVESTIGATION.md) for detailed investigation.
