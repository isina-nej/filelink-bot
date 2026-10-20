import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const runtimeFiles = ['tgcloud/schema.js', ...['tgcloud/handlers', 'tgcloud/lib'].flatMap((root) => readdirSync(root).filter((name) => name.endsWith('.js')).map((name) => join(root, name)))];
const forbidden = [/from\s+['"](?:node:|fs|path|crypto|dotenv)/, /process\.env/, /\bBuffer\b/, /setTimeout\s*\(/];
const failures = [];
for (const file of runtimeFiles) {
  const source = readFileSync(file, 'utf8');
  for (const pattern of forbidden) if (pattern.test(source)) failures.push(`${file}: forbidden runtime construct ${pattern}`);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Runtime lint OK: ${runtimeFiles.length} files`);
