import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
function files(dir) { return readdirSync(dir).flatMap(name => { const p = resolve(dir, name); return statSync(p).isDirectory() ? files(p) : [p]; }); }
const source = files(resolve('src'));
const extensions = ['', '.ts', '.vue', '.json', '.css', '/index.ts'];
const reachable = new Set();
const errors = [];
const dependencies = new Set(Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).dependencies));
const forbidden = /client-(?:interactive|video-gen|live|device-logo|device-logs|device-control|setting-canvas|billing-recharge)|components-vue|video-generation|next\/(?:image|link|navigation)/;
function visit(file) {
  if (reachable.has(file)) return;
  reachable.add(file);
  const text = readFileSync(file, 'utf8');
  assert.ok(!forbidden.test(text), `Dormant feature reference: ${relative(root, file)}`);
  for (const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|@import\s*)['"]([^'"]+)['"]/g)) {
    const spec = match[1];
    if (spec.startsWith('.')) {
      const target = extensions.map(ext => resolve(dirname(file), spec + ext)).find(p => { try { return statSync(p).isFile(); } catch { return false; } });
      if (!target) errors.push(`${relative(root, file)} -> ${spec}`);
      else visit(target);
    } else {
      const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      if (!dependencies.has(name)) errors.push(`${relative(root, file)} -> undeclared dependency ${name}`);
    }
  }
  if (extname(file) !== '.json') for (const match of text.matchAll(/["'`]\/([^"'`\s<>]+?\.(?:svg|png|jpe?g|webp|gif|webm|mp4|wav|mp3))(?:[?][^"'`]*)?["'`]/g)) {
    try { assert.ok(statSync(resolve('public', match[1])).isFile()); } catch { errors.push(`Missing asset: /${match[1]}`); }
  }
}
visit(resolve('src/main.ts'));
visit(resolve('src/exhibition.ts'));
assert.deepEqual(errors, [], 'Client import / asset integrity failed');
assert.deepEqual(source.filter(p => !reachable.has(p) && !p.endsWith('.d.ts') && !p.endsWith('.txt')), [], 'Unreachable production source');
assert.ok(!['react', 'react-dom', '@arco-design/web-react', 'zustand'].some(name => dependencies.has(name)), 'Legacy runtime dependency');
console.log(`Client integrity passed: ${reachable.size} reachable files, no hidden routes, no missing imports or media.`);
