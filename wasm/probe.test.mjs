import assert from 'node:assert/strict';
import test from 'node:test';
import { probes, runProbe, fmaModules, runFmaProbe } from './probe.mjs';

for (const [name, bytes] of Object.entries(probes)) {
  test(`${name} compiles and executes with the expected lane result`, async () => {
    assert.equal(WebAssembly.validate(bytes), true);
    assert.deepEqual(await runProbe(bytes), { ok: true });
  });
}
test('invalid Wasm reports failure rather than support', async () => {
  const result = await runProbe(new Uint8Array([0, 1, 2]));
  assert.equal(result.ok, false);
  assert.match(result.error, /CompileError/);
});

for (const precision of ['f32', 'f64']) {
  test(`${precision} relaxed madd matches an allowed numerical result`, async () => {
    const result = await runFmaProbe(precision);
    assert.ok(['fused', 'unfused', 'mixed'].includes(result.state), JSON.stringify(result));
    assert.equal(result.fused + result.unfused, 8192);
    assert.equal(result.unexpected, 0);
    for (const item of result.cases) {
      assert.notEqual(item.fusedExpected, item.unfusedExpected);
      assert.equal(item.control, 0);
    }
  });
  test(`${precision} explicit SIMD multiply/add is identified as unfused`, async () => {
    const result = await runFmaProbe(precision, fmaModules[precision].separate);
    assert.equal(result.state, 'unfused');
    assert.equal(result.unfused, 8192);
    assert.equal(result.fused, 0);
  });
}
test('unsupported FMA probe reports unavailable, not unfused', async () => {
  const result = await runFmaProbe('f32', new Uint8Array([0]));
  assert.equal(result.state, 'unavailable');
  assert.match(result.error, /CompileError/);
});
