// Encodings: https://github.com/WebAssembly/relaxed-simd/blob/main/proposals/relaxed-simd/Overview.md
function moduleBytes(instructions, params = [], result = 0x7f) {
  const body = [0, ...instructions, 0x0b]; // No locals; end.
  const type = [1, 0x60, params.length, ...params, 1, result];
  return new Uint8Array([
    0, 97, 115, 109, 1, 0, 0, 0,
    1, type.length, ...type,
    3, 2, 1, 0,
    7, 9, 1, 5, 99, 104, 101, 99, 107, 0, 0, // Export "check".
    10, body.length + 2, 1, body.length, ...body,
  ]);
}

export const probes = {
  wasm: moduleBytes([0x41, 42]),
  simd: moduleBytes([
    0x41, 42, 0xfd, 0x0f, // i8x16.splat(42)
    0xfd, 0x16, 0, // i8x16.extract_lane_u(0)
  ]),
  relaxed: moduleBytes([
    0x41, 42, 0xfd, 0x0f, // Data: sixteen lanes of 42.
    0x41, 0, 0xfd, 0x0f, // Indices: sixteen lanes of zero.
    0xfd, 0x80, 0x02, // i8x16.relaxed_swizzle (0x100, unsigned LEB128).
    0xfd, 0x16, 0, // Extract lane zero; expected result is 42.
  ]),
};

export async function runProbe(bytes) {
  if (typeof WebAssembly === 'undefined') {
    return { ok: false, error: 'WebAssembly is unavailable in this browser context.' };
  }
  try {
    const { instance } = await WebAssembly.instantiate(bytes);
    const actual = instance.exports.check();
    return actual === 42
      ? { ok: true }
      : { ok: false, error: `Unexpected instruction result: ${actual}; expected 42.` };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

function maddModule(precision, relaxed) {
  const f32 = precision === 'f32';
  const type = f32 ? 0x7d : 0x7c;
  const splat = f32 ? 0x13 : 0x14;
  const getVector = (index) => [0x20, index, 0xfd, splat];
  return moduleBytes([
    ...getVector(0), ...getVector(1),
    ...(relaxed ? [] : [0xfd, f32 ? 0xe6 : 0xf2, 1]), // Strict SIMD mul.
    ...getVector(2),
    ...(relaxed
      ? [0xfd, f32 ? 0x85 : 0x87, 2] // relaxed_madd: 0x105 / 0x107.
      : [0xfd, f32 ? 0xe4 : 0xf0, 1]), // Strict SIMD add.
    0xfd, f32 ? 0x1f : 0x21, 0, // Extract lane zero.
  ], [type, type, type], type);
}

export const fmaModules = Object.fromEntries(['f32', 'f64'].map(precision => [precision, {
  relaxed: maddModule(precision, true), separate: maddModule(precision, false),
}]));

export async function runFmaProbe(precision, bytes = fmaModules[precision].relaxed) {
  try {
    const { instance } = await WebAssembly.instantiate(bytes);
    const { instance: control } = await WebAssembly.instantiate(fmaModules[precision].separate);
    // Exactly representable inputs. (1+2^-k)(1-2^-k)-1 = -2^-2k exactly;
    // rounding the product first gives 1, and then subtracting 1 gives zero.
    const k = precision === 'f32' ? 13 : 27;
    const cases = [1, -1].map(sign => ({
      inputs: [sign * (1 + 2 ** -k), 1 - 2 ** -k, -sign],
      fusedExpected: -sign * 2 ** (-2 * k),
      unfusedExpected: 0,
      fused: 0, unfused: 0, unexpected: 0, observed: [],
    }));
    for (const item of cases) {
      item.control = control.exports.check(...item.inputs);
      if (item.control !== 0) throw new Error(`Separate multiply/add control returned ${item.control}; expected zero.`);
    }
    // Include initial calls and repeated calls that may trigger engine tiering.
    // Inputs are runtime arguments, preventing constant folding of the expression.
    for (let iteration = 0; iteration < 4096; iteration++) {
      for (const item of cases) {
        const value = instance.exports.check(...item.inputs);
        if (!item.observed.includes(value)) item.observed.push(value);
        if (value === item.fusedExpected) item.fused++;
        else if (value === item.unfusedExpected) item.unfused++;
        else item.unexpected++;
      }
    }
    const fused = cases.reduce((sum, item) => sum + item.fused, 0);
    const unfused = cases.reduce((sum, item) => sum + item.unfused, 0);
    const unexpected = cases.reduce((sum, item) => sum + item.unexpected, 0);
    return {
      state: unexpected ? 'unexpected' : fused && unfused ? 'mixed' : fused ? 'fused' : 'unfused',
      instruction: `${precision === 'f32' ? 'f32x4' : 'f64x2'}.relaxed_madd`,
      fused, unfused, unexpected, cases,
    };
  } catch (error) {
    return { state: 'unavailable', error: String(error) };
  }
}
