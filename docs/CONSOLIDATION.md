# Browser test consolidation

Consolidation, including the existing JPEG fixtures, was approved on 2026-11-17.

The maintained suite lives in [lilith/browser-hdr-test](https://github.com/lilith/browser-hdr-test).
The original name and root HDR page remain to preserve the existing Pages URL.

| Source | Imported revision | Destination |
| --- | --- | --- |
| [HDR/gamut](https://github.com/lilith/browser-hdr-test) | `c2c073a5` | `/` (existing entry point) |
| [JPEG support](https://github.com/lilith/browser-jpeg-support) | `5da381146e806dfbf643f6102c3cc29ddf90b6cf` | `/jpeg/` |
| [WASM SIMD/FMA](https://github.com/lilith/wasm-relaxed-simd-check) | `8f4d658dee4cf0c341ede50f49f9f3da7ab48aae` | `/wasm/` |

The WASM source repository was private at import. Only the generic browser page,
probe implementation, tests, and explanation are imported. No host configuration
or service state is part of the suite.

The JPEG page's seven existing fixtures total 90,067 bytes. They are copied
without re-encoding or modification. [The manifest](../jpeg/fixtures.json) records
the source revision, sizes, and Git blob IDs; `npm test` verifies each copy.
The imported WASM probe implementation and regression tests retain their source
bytes. The pages gain suite navigation; numerical and image tests are unchanged.

The source repos retain their history and existing files. Migration notices point
to this maintained suite after publication. They are not deleted or archived.
Code and fixture updates belong here.

## Scope

The repository-name/description inventory of lilith and imazen on 2026-11-16 found
these three dedicated browser feature checks. `just inventory` repeats that
search. Project-specific integration tests, codec libraries, WASM bindings, and
applications remain with their own code.

## Verification

`npm test` covers local routes and assets, byte-identical JPEG fixtures, and
WASM execution including fused/unfused controls. Live Pages paths are checked
after publication. Visual HDR/gamut and JPEG decoder behavior still require
testing on the actual target browser/device.
