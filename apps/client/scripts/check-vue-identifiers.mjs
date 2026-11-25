import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import ts from 'typescript';
import { parse } from '@vue/compiler-sfc';

// tsc alone does not inspect script blocks in .vue files. Check unresolved
// script identifiers without adding a second framework or generating files.
function files(dir) { return readdirSync(dir).flatMap(name => { const p = resolve(dir, name); return statSync(p).isDirectory() ? files(p) : [p]; }); }
const scripts = new Map();
for (const file of files('src').filter(p => p.endsWith('.vue'))) {
  const { descriptor } = parse(readFileSync(file, 'utf8'), { filename: file });
  const script = [descriptor.script?.content, descriptor.scriptSetup?.content].filter(Boolean).join('\n');
  if (script) scripts.set(file + '.__check__.ts', script);
}
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
const host = ts.createCompilerHost(options);
const getSourceFile = host.getSourceFile.bind(host);
host.getSourceFile = (file, languageVersion, onError, shouldCreateNewSourceFile) => scripts.has(file)
  ? ts.createSourceFile(file, scripts.get(file), languageVersion, true, ts.ScriptKind.TS)
  : getSourceFile(file, languageVersion, onError, shouldCreateNewSourceFile);
const fileExists = host.fileExists.bind(host), readFile = host.readFile.bind(host);
host.fileExists = file => scripts.has(file) || fileExists(file);
host.readFile = file => scripts.get(file) ?? readFile(file);
const program = ts.createProgram([...scripts.keys(), resolve('src/shims-vue.d.ts'), resolve('src/vite-env.d.ts')], options, host);
const macros = new Set(['defineProps', 'defineEmits', 'defineExpose', 'defineOptions', 'defineSlots', 'defineModel', 'withDefaults']);
const errors = program.getSemanticDiagnostics().filter(d => scripts.has(d.file?.fileName) && [2304, 2552].includes(d.code)
  && !macros.has(d.file.text.slice(d.start, d.start + d.length)));
for (const d of errors) {
  const { line } = d.file.getLineAndCharacterOfPosition(d.start);
  console.error(`${relative(process.cwd(), d.file.fileName).replace('.__check__.ts', '')}:${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
}
if (errors.length) process.exit(1);
console.log(`Vue identifier check passed: ${scripts.size} component scripts.`);
