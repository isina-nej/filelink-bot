import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['tgcloud/handlers', 'tgcloud/lib'];
const files = ['tgcloud/schema.js'];
for (const root of roots) {
  for (const name of readdirSync(root)) if (name.endsWith('.js')) files.push(join(root, name));
}
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(`${file}\n${result.stderr}`);
    process.exit(result.status || 1);
  }
}
console.log(`Syntax OK: ${files.length} JavaScript files`);
