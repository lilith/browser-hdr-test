# Android HDR WebGPU Investigation

## Problem Statement

WebGPU HDR canvas output works on Windows and iOS but **fails on Android** despite the API reporting full support. Native Android apps can display HDR content, so the display hardware and OS pipeline are capable - the issue is specific to Chrome/Brave WebGPU.

## Confirmed Findings

### What Works
| Platform | Browser | rgba16float | Extended Tonemapping | Visual HDR |
|----------|---------|-------------|---------------------|------------|
| Windows 10/11 | Brave/Chrome | ✅ | ✅ | ✅ YES |
| iOS 26 | Brave/Safari | ✅ | ✅ | ✅ YES |
| Android 10+ | Chrome/Brave | ✅ | ✅ | ❌ NO |

### Android Test Device
- **Device**: Samsung Galaxy Z Fold 7
- **Display**: HDR10+, P3 wide gamut capable
- **GPU**: Qualcomm Adreno 8xx (Snapdragon 8 Gen 4)
- **WebGPU Features**: shader-f16, rg11b10ufloat-renderable, subgroups, etc.

### What We Tried (All Failed)
- `chrome://flags/#force-color-profile` with every option:
  - sRGB
  - Display P3 D65
  - scRGB linear (should work for HDR)
  - HDR10 (ST2084 + BT2020)
  - BT2020
- All resulted in same behavior: values ≥1.0 appear identical brightness

### API vs Reality
```
API Report:
- rgba16float Canvas: Yes
- Extended Tone Mapping: Yes
- HDR Status: FULL
- Display HDR (dynamic-range): Yes

Visual Test:
- Brightness patches at 1.0x, 1.5x, 2.0x, 3.0x, 4.0x all appear identical
- Only 0.5x appears dimmer
- Conclusion: Output clamped to SDR [0,1] range
```

## Known Facts About Android HDR

### Native Apps CAN Display HDR
- YouTube HDR videos play correctly
- Google Photos shows HDR photos with extra brightness
- Camera app captures/displays HDR
- Games with HDR support work

### Android HDR Architecture
1. **Hardware Composer (HWC)** - Composites layers, can handle HDR
2. **SurfaceFlinger** - System compositor, manages surfaces
3. **Gralloc** - Graphics memory allocator, HDR buffer formats
4. **Display HAL** - Hardware abstraction for display

### HDR Surface Requirements (Native)
For an Android app to output HDR, it needs:
1. Request a surface with HDR color space (`STANDARD_BT2020`, `TRANSFER_ST2084` or `TRANSFER_HLG`)
2. Use appropriate buffer format (`RGBA_1010102` or `RGBA_FP16`)
3. Set HDR metadata if needed
4. SurfaceFlinger must composite in HDR mode

## Investigation Directions

### 1. Chrome's Surface Configuration
**Question**: What color space and transfer function does Chrome request for WebGPU canvas surfaces on Android?

**How to investigate**:
- Chrome source: `gpu/command_buffer/service/` and `ui/gl/`
- Look for `ANativeWindow` configuration, `EGLConfig` selection
- Search for `ACOLORSPACE_` or `ADATASPACE_` constants
- Check if `extended` tonemapping triggers different surface request

**Key files** (Chromium):
- `ui/gl/gl_surface_egl.cc`
- `gpu/command_buffer/service/shared_image/`
- `components/viz/service/display_embedder/skia_output_surface_impl.cc`

### 2. SurfaceFlinger HDR Layer Detection
**Question**: Does Chrome's surface get classified as HDR by SurfaceFlinger?

**How to investigate**:
```bash
# On device with root/ADB
adb shell dumpsys SurfaceFlinger --layers
# Look for Chrome's layer, check dataspace field
# HDR should show BT2020_PQ or BT2020_HLG, not SRGB
```

### 3. WebGPU Dawn Implementation
**Question**: Does Dawn (WebGPU impl) configure Android surfaces for HDR?

**How to investigate**:
- Dawn source: `src/dawn/native/vulkan/` and `src/dawn/native/opengl/`
- Look for Android surface configuration
- Check if `toneMapping: extended` affects surface setup
- File: `src/dawn/native/Surface.cpp`

### 4. Vulkan vs OpenGL ES Path
**Question**: Does Chrome use Vulkan or GLES on this device, and does it matter?

**How to investigate**:
- Check `chrome://gpu` for "Graphics Backend"
- Vulkan path may have different HDR surface support
- Try `chrome://flags/#enable-vulkan` or `#disable-vulkan`

### 5. ANGLE Configuration
**Question**: Is ANGLE intercepting and losing HDR capability?

**How to investigate**:
- ANGLE translates OpenGL ES to Vulkan on Android
- Check if ANGLE preserves HDR surface attributes
- ANGLE source: `src/libANGLE/renderer/vulkan/android/`

### 6. Compare with Working HDR App
**Question**: What does a working HDR app (YouTube) do differently?

**How to investigate**:
- Use `adb shell dumpsys SurfaceFlinger` while playing HDR video
- Compare YouTube's layer dataspace to Chrome's
- Check if YouTube uses different surface type (SurfaceView vs TextureView)

## Potential Fixes to Test

### 1. Force Vulkan Backend
```
chrome://flags/#enable-vulkan → Enabled
chrome://flags/#enable-unsafe-webgpu → Enabled (if needed)
```

### 2. Disable ANGLE
```
chrome://flags/#choose-angle-graphics-backend → OpenGL ES
```

### 3. Chrome Canary/Dev
Newer Chrome versions may have fixes. Test with:
- Chrome Canary
- Chrome Dev channel
- Chromium nightly builds

### 4. Different Browser Engines
- Firefox Nightly (WebGPU behind flag)
- Samsung Internet (if WebGPU available)

## References

### Chromium Bug Tracker
Search for existing issues:
- https://bugs.chromium.org/p/chromium/issues/list?q=webgpu+hdr+android
- https://bugs.chromium.org/p/chromium/issues/list?q=canvas+hdr+android

### Relevant Specs
- WebGPU Canvas Configuration: https://www.w3.org/TR/webgpu/#canvas-configuration
- Android HDR: https://source.android.com/docs/core/display/hdr
- Vulkan HDR on Android: https://developer.android.com/games/develop/vulkan-hdr

### Dawn/WebGPU Issues
- https://dawn.googlesource.com/dawn/
- https://github.com/nichmack/nichmack.github.io/issues (WebGPU HDR demo issues)

## Test Page

The test page at `https://[server]:8443/test-hdr-browser.html` includes:
1. Full capability detection report
2. Brightness comparison test (6 patches at 0.5x-4.0x)
3. User response recording
4. Android-specific flag instructions
5. Copy-paste report for sharing

## Contact / Continuation

This investigation was started on 2026-01-27. The test infrastructure is in:
- `/home/lilith/hdr-research/test-hdr-browser.html`
- `/home/lilith/hdr-research/https_server.py`

Key finding: **Android WebGPU claims HDR support but output is clamped to SDR. Native apps work, so this is a Chrome/WebGPU compositor issue, not a hardware limitation.**
