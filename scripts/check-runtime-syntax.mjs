import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TAB_REGISTRY } from '../app/tab-registry.js';
import { resolveLazyModuleUrl } from '../app/lazy-loader.js';

const root = path.resolve(import.meta.dirname, '..');
const manifest = readFileSync(path.join(root, 'runtime-assets.js'), 'utf8');
const assets = [...manifest.matchAll(/'([^']+)'/g)].map(match => match[1]);
const modules = [...new Set(assets
  .filter(asset => asset.endsWith('.js'))
  .map(asset => path.resolve(root, asset.replace(/^\.\//, ''))))];
const manifestModules = new Set(modules.map(modulePath => path.normalize(modulePath)));

function collectRelativeSpecifiers(source) {
  const patterns = [
    /^\s*import\s+(?:[\w*$\s{},]+?\s+from\s+)?['"]([^'"]+)['"]/gm,
    /^\s*export\s+(?:[\w*$\s{},]+?\s+from\s+)['"]([^'"]+)['"]/gm,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  return new Set(patterns.flatMap(pattern => [...source.matchAll(pattern)].map(match => match[1]))
    .filter(specifier => specifier.startsWith('.')));
}

function collectExternalImportExports(source) {
  const exportsBySpecifier = new Map();
  const pattern = /^\s*import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/gm;

  for (const match of source.matchAll(pattern)) {
    const clause = match[1].trim();
    const specifier = match[2];
    if (specifier.startsWith('.')) continue;

    const exportNames = exportsBySpecifier.get(specifier) || new Set();
    const named = clause.match(/\{([\s\S]*?)\}/);
    if (named) {
      for (const item of named[1].split(',')) {
        const name = item.trim().split(/\s+as\s+/i)[0]?.trim();
        if (name) exportNames.add(name);
      }
    }

    const defaultOrNamespace = clause.split('{', 1)[0].replace(',', '').trim();
    if (defaultOrNamespace && !defaultOrNamespace.startsWith('*')) exportNames.add('default');
    exportsBySpecifier.set(specifier, exportNames);
  }

  return exportsBySpecifier;
}

function resolveSpecifier(modulePath, specifier) {
  return path.resolve(path.dirname(modulePath), specifier.split(/[?#]/, 1)[0]);
}

const importErrors = [];
const sources = new Map();
const externalImports = new Map();

for (const modulePath of modules) {
  execFileSync(process.execPath, ['--check', modulePath], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
  });

  const source = readFileSync(modulePath, 'utf8');
  sources.set(path.normalize(modulePath), source);
  for (const [specifier, exportNames] of collectExternalImportExports(source)) {
    const collected = externalImports.get(specifier) || new Set();
    for (const exportName of exportNames) collected.add(exportName);
    externalImports.set(specifier, collected);
  }
  for (const specifier of collectRelativeSpecifiers(source)) {
    const target = resolveSpecifier(modulePath, specifier);
    if (!target.startsWith(`${root}${path.sep}`)) {
      importErrors.push(`${path.relative(root, modulePath)} escapes root: ${specifier}`);
    } else if (!existsSync(target)) {
      importErrors.push(`${path.relative(root, modulePath)} missing: ${specifier}`);
    } else if (!manifestModules.has(path.normalize(target))) {
      importErrors.push(`${path.relative(root, modulePath)} not precached: ${specifier}`);
    }
  }
}

for (const definition of Object.values(TAB_REGISTRY)) {
  if (!definition.module) continue;
  const target = path.normalize(fileURLToPath(resolveLazyModuleUrl(definition.module)));
  if (!existsSync(target)) {
    importErrors.push(`tab ${definition.id} lazy module missing: ${definition.module}`);
  } else if (!manifestModules.has(target)) {
    importErrors.push(`tab ${definition.id} lazy module not precached: ${definition.module}`);
  }
}

if (importErrors.length) throw new Error(`Runtime import graph errors:\n${importErrors.join('\n')}`);

async function validateStaticImportExports() {
  const context = vm.createContext({});
  const runtimeModules = new Map();
  const externalModules = new Map();

  for (const [modulePath, source] of sources) {
    runtimeModules.set(modulePath, new vm.SourceTextModule(source, {
      context,
      identifier: pathToFileURL(modulePath).href,
    }));
  }

  for (const [specifier, exportNames] of externalImports) {
    externalModules.set(specifier, new vm.SyntheticModule([...exportNames], () => {}, {
      context,
      identifier: `external:${specifier}`,
    }));
  }

  const linker = (specifier, referencingModule) => {
    if (!specifier.startsWith('.')) return externalModules.get(specifier);
    const referencingPath = path.normalize(fileURLToPath(referencingModule.identifier));
    const target = path.normalize(resolveSpecifier(referencingPath, specifier));
    return runtimeModules.get(target);
  };

  for (const runtimeModule of runtimeModules.values()) {
    if (runtimeModule.status === 'unlinked') await runtimeModule.link(linker);
  }
}

const validatingExports = process.argv.includes('--validate-exports');
if (typeof vm.SourceTextModule !== 'function') {
  if (validatingExports) throw new Error('Node must expose vm.SourceTextModule for runtime export validation');
  execFileSync(process.execPath, ['--experimental-vm-modules', process.argv[1], '--validate-exports'], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
  });
} else {
  await validateStaticImportExports();
}

console.log(`[syntax] ok modules=${modules.length} imports=resolved exports=resolved`);
