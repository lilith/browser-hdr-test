start:
    node server.mjs

test:
    node --test

fma-results:
    node --input-type=module -e 'import { runFmaProbe } from "./wasm/probe.mjs"; for (const precision of ["f32", "f64"]) console.log(JSON.stringify({ precision, ...await runFmaProbe(precision) }, null, 2));'

check-http base:
    curl --fail --silent {{base}}/ -o /dev/null
    curl --fail --silent {{base}}/jpeg/ -o /dev/null
    curl --fail --silent {{base}}/wasm/ -o /dev/null
    curl --fail --silent {{base}}/wasm/probe.mjs -o /dev/null

inventory:
    gh repo list lilith --limit 1000 --json name,description,url,isPrivate --jq '.[] | select((.name + " " + .description) | test("browser|wasm|webassembly"; "i"))'
    gh repo list imazen --limit 1000 --json name,description,url,isPrivate --jq '.[] | select((.name + " " + .description) | test("browser|wasm|webassembly"; "i"))'
