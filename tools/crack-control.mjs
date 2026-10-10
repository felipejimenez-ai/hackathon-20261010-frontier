import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { reset, probe } from "./recon.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "control-dataset.json");

const PREFIXES = [
  "PING",
  "ALTA;Lucia",
  "ALTA;Mateo",
  "ALTA;Gomez",
  "CONSULTA;AC-0001",
  "CONSULTA;AC-0002",
  "CONSULTA;AC-0009",
  "DEPOSITO;AC-0001;250000",
  "DEPOSITO;AC-0002;700",
  "DEPOSITO;AC-0001;700",
  "TRANSFER;AC-0001;AC-0002;40000",
  "TRANSFER;AC-0001;AC-0002;120000",
  "TRANSFER;AC-0001;AC-0002;100000",
  "TRANSFER;AC-0002;AC-0001;50000",
  "ANULA;OP-0003",
  "ANULA;OP-0001",
  "CONSULTA;XY",
  "CONSULTA;A",
  "CONSULTA;B",
  "CONSULTA;C",
  "CONSULTA;ZZ",
  "CONSULTA;0",
  "CONSULTA;1",
  "CONSULTA;9",
  "CONSULTA;AA",
  "CONSULTA;AB",
  "CONSULTA;AC",
  "CONSULTA;AC-0000",
  "CONSULTA;AC-0003",
  "ALTA;AC-0001",
  "CONSULTA;2",
  "CONSULTA;3",
  "CONSULTA;4",
  "CONSULTA;5",
  "CONSULTA;8",
  "CONSULTA;D",
  "CONSULTA;E",
  "CONSULTA;a",
  "CONSULTA;z",
  "CONSULTA;",
  "ALTA;Z",
  "CONSULTA;AAAAAA",
  "CONSULTA;AAAAAB",
  "CONSULTA;AAAABA",
  "CONSULTA;AAABAA",
  "CONSULTA;AABAAA",
  "CONSULTA;ABAAAA",
  "CONSULTA;BAAAAA",
  "CONSULTA;AAAAAC",
  "CONSULTA;AAAAAAAAAA",
  "CONSULTA;AAABAAAAAA",
  "CONSULTA;AABAAAAAAA",
  "CONSULTA;ABAAAAAAAA",
  "CONSULTA;BAAAAAAAAA",
  "CONSULTA;AAAAA1",
  "CONSULTA;AAAAA2",
  "CONSULTA;AAAAAQ",
  "CONSULTA;AAAABB",
  "CONSULTA;AAAAA0",
  "CONSULTA;AAAAAF",
  "CONSULTA;AAAAAP",
  "CONSULTA;AAAAA_",
  "CONSULTA;AAAAAG",
  "CONSULTA;AAAAAZ",
  "CONSULTA;AAAAAR",
  "CONSULTA;AAAAAO",
  "CONSULTA;AAAAAH",
  "CONSULTA;AAAAAM",
  "CONSULTA;AAAAAN",
  "CONSULTA;CCA",
  "CONSULTA;DCA",
];

const dataset = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
const known = new Map(dataset.map((d) => [d.prefix, d]));

for (const prefix of PREFIXES) {
  if (known.has(prefix)) continue;
  const seq = `crack:${prefix}`;
  await reset(seq);
  const passing = [];
  for (let n = 0; n <= 99; n++) {
    const control = String(n);
    const r = await probe({ seq, hipotesis: `crack control "${prefix}"`, m: `${prefix};${control}` });
    if (!(r.json && r.json.error === "E202")) {
      passing.push({ control, status: r.status, body: r.json });
      break;
    }
  }
  const rec = { prefix, passing };
  known.set(prefix, rec);
  dataset.push(rec);
  writeFileSync(OUT, JSON.stringify(dataset, null, 2));
  console.log(`${prefix} -> ${JSON.stringify(passing.map((p) => p.control))}`);
}

console.log(`\nwrote ${OUT}`);
