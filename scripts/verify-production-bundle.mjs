import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const root = process.argv[2] ?? "dist";
const expectedUrl = process.env.VITE_SUPABASE_URL;
if (!expectedUrl) throw new Error("VITE_SUPABASE_URL is required for bundle verification");
const expectedOrigin = new URL(expectedUrl).origin;

function filesIn(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? filesIn(child) : [child];
  });
}

const files = filesIn(root).filter((path) => [".js", ".html"].includes(extname(path)));
if (!files.length) throw new Error(`No frontend bundle found in ${root}`);
const bundle = files.map((path) => readFileSync(path, "utf8")).join("\n");
if (!bundle.includes(expectedOrigin)) throw new Error("Production bundle does not contain the configured Supabase origin");

const forbidden = [
  "gross-lean-montage.",
  "creator@example.test",
  "head@example.test",
  "director@example.test",
  "itr@example.test",
  "Демо: создатель",
  "Демо: руководитель",
  "Демо: директор",
  "Демо: ИТР",
  "gross-lean-montage.visual.mvp.v7",
  "gross-lean-montage.manual-tasks.v1",
  "gross-lean-montage.door-matrix.v1",
  "gross-lean-montage.auth-session.v1",
  "@gk-gross.ru",
  "@gk-gross.local",
  "gk-gross@yandex.ru",
  "creator@gross.ru",
  "Гаранин Сергей",
  "Скляров Иван",
  "Следующий этап MVP",
  "Mock-показатель недели",
  "Демо-данные",
  "Команда ИТР",
];
const leaked = forbidden.filter((value) => bundle.includes(value));
if (leaked.length) throw new Error(`Production bundle contains forbidden demo/PII markers: ${leaked.join(", ")}`);

const totalBytes = files.reduce((sum, path) => sum + statSync(path).size, 0);
console.log(`Production bundle verified: ${files.length} files, ${totalBytes} bytes, Supabase runtime present, no forbidden PII markers.`);
