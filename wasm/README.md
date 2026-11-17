# Relaxed SIMD browser check

Run `npm start` from the repository root, then open `/wasm/` on the server’s port
3337 from your phone on the same network. The [HTTPS live page](https://lilith.github.io/browser-hdr-test/wasm/)
also runs these probes on the device opening it.
The server binds to `0.0.0.0`; use `PORT` to override the port. No dependencies.

The page separately compiles and executes basic WebAssembly, standard SIMD, and
`i8x16.relaxed_swizzle`, checking an extracted lane against 42. A positive result
demonstrates that instruction works in the current browser context; it does not
test every relaxed SIMD instruction or measure performance. A negative result
includes the engine error and may reflect browser restrictions. No user-agent
version guessing, cross-origin isolation, external scripts, or analytics.

The FMA check runs `f32x4.relaxed_madd` and `f64x2.relaxed_madd` with runtime
arguments `(1 + 2^-k), (1 - 2^-k), -1`, where `k` is 13 for Float32 and 27 for
Float64, plus the sign-reversed cases. Single rounding gives `-2^-26` or `-2^-54`;
rounding the product first gives zero. Explicit SIMD multiply/add verifies the
unfused control. Each precision gets 8,192 calls, including initial calls and
repetitions that may trigger engine tiering. The page reports fused, unfused,
mixed, unexpected, or unavailable, with observed values and counts in details.
It checks lane zero of broadcast inputs. This measures numerical behavior for
these cases, not hardware instruction selection or all possible inputs/tiers.

Opcode reference: [WebAssembly relaxed SIMD proposal](https://github.com/WebAssembly/relaxed-simd/blob/main/proposals/relaxed-simd/Overview.md).

Run `npm test` to check probe execution and malformed-module handling on a Node
version supporting relaxed SIMD. The page must be opened on iOS to verify iOS support.
