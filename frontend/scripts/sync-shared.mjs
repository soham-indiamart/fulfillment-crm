// Copies the shared API contract (types, date rules, dropdown values) from the backend
// repository, which owns it, into src/shared.
// Usage: npm run sync:shared [-- <path to the backend folder>]   (default: ../backend)
import fs from 'node:fs';
import path from 'node:path';

const backend = path.resolve(process.argv[2] ?? process.env.BACKEND_DIR ?? '../backend');
const from = path.join(backend, 'src', 'shared');
const to = path.resolve('src', 'shared');

if (!fs.existsSync(from)) {
  console.error(`No shared contract at ${from}.\nPass the backend folder: npm run sync:shared -- <path>`);
  process.exit(1);
}

const sources = fs.readdirSync(from).filter((file) => file.endsWith('.ts'));
fs.mkdirSync(to, { recursive: true });
for (const file of fs.readdirSync(to)) {
  if (file.endsWith('.ts') && !sources.includes(file)) fs.rmSync(path.join(to, file));
}
for (const file of sources) fs.copyFileSync(path.join(from, file), path.join(to, file));
console.log(`Synced ${sources.length} files from ${from}`);
