import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const targets = ['app', 'components', 'lib', 'scripts'];
const filePattern = /\.(ts|tsx|js|mjs)$/;
const testFilePattern = /\.(test|spec)\.(ts|tsx|js|mjs)$/;
const cjkPattern = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const literalFallbackPattern = /\bt\(\s*(['"`])(?:\\.|(?!\1).)*\1\s*,\s*(['"`])/;
const staticTranslationKeyPattern = /\bt\(\s*(['"`])([^'"`$]+)\1/g;
const translationKeyPropertyPattern =
  /\b(?:labelKey|titleKey|copyKey|nameKey|placeholderKey|ariaKey|messageKey|statusLabelKey)\s*:\s*(['"`])([^'"`$]+)\1/g;
const translationKeyMapPattern =
  /\b[A-Z][A-Z0-9_]*(?:LABEL|TITLE|COPY|MESSAGE|PLACEHOLDER|ARIA|STATUS)[A-Z0-9_]*KEYS?\s*(?::\s*Record<[^=]+>)?\s*=\s*\{([\s\S]*?)\n\}/g;
const mapValuePattern = /:\s*['"]([a-z][a-z0-9]*(?:[._-][a-z0-9{}]+)+)['"]/g;
const runtimeCatalogPath = 'lib/i18n-runtime-messages.ts';
const requiredRuntimeLocales = ['en-US', 'zh-CN'];
const prefixAliases = [
  ['otlp.metrics.', 'ingestion.otlp.metrics.'],
  ['otlp.', 'ingestion.otlp.'],
];
const ignoredRelativePaths = new Set([
  runtimeCatalogPath,
  'lib/alert-notice/view-model.ts'
]);

function collectHitsFromFile(root, fullPath) {
  const relativePath = path.relative(root, fullPath);
  if (ignoredRelativePaths.has(relativePath)) {
    return [];
  }
  const hits = [];
  const text = fs.readFileSync(fullPath, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('import ')) return;
    if (literalFallbackPattern.test(line)) {
      hits.push(
        `${relativePath}:${index + 1}: literal-fallback: ${line.trim()}`
      );
      return;
    }
    if (!cjkPattern.test(line)) return;
    hits.push(`${relativePath}:${index + 1}: raw-cjk: ${line.trim()}`);
  });
  return hits;
}

function collectStaticTranslationKeyHitsFromFile(root, fullPath) {
  const relativePath = path.relative(root, fullPath);
  if (ignoredRelativePaths.has(relativePath)) {
    return [];
  }
  const hits = [];
  const text = fs.readFileSync(fullPath, 'utf8');
  let match;
  while ((match = staticTranslationKeyPattern.exec(text))) {
    const key = match[2];
    const line = text.slice(0, match.index).split('\n').length;
    hits.push({ key, relativePath, line, kind: 'static-t' });
  }

  while ((match = translationKeyPropertyPattern.exec(text))) {
    const key = match[2];
    const line = text.slice(0, match.index).split('\n').length;
    hits.push({ key, relativePath, line, kind: 'translation-key-property' });
  }

  while ((match = translationKeyMapPattern.exec(text))) {
    const body = match[1];
    let valueMatch;
    while ((valueMatch = mapValuePattern.exec(body))) {
      const key = valueMatch[1];
      const line = text.slice(0, match.index + valueMatch.index).split('\n').length;
      hits.push({ key, relativePath, line, kind: 'translation-key-map' });
    }
  }
  return hits;
}

function walk(root, dir, hits) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.next')) continue;
      walk(root, fullPath, hits);
      continue;
    }
    if (!filePattern.test(entry.name)) continue;
    if (testFilePattern.test(entry.name)) continue;
    hits.push(...collectHitsFromFile(root, fullPath));
  }
}

function walkStaticTranslationKeys(root, dir, hits) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.next')) continue;
      walkStaticTranslationKeys(root, fullPath, hits);
      continue;
    }
    if (!filePattern.test(entry.name)) continue;
    if (testFilePattern.test(entry.name)) continue;
    hits.push(...collectStaticTranslationKeyHitsFromFile(root, fullPath));
  }
}

function collectMessageKeysFromLine(line) {
  const match = line.match(/^\s*(?:'((?:\\'|[^'])+)'|([A-Za-z_$][\w$.-]*))\s*:/);
  if (!match) return null;
  return match[1] || match[2];
}

function collectRuntimeCatalogKeys(root) {
  const fullPath = path.join(root, runtimeCatalogPath);
  const groups = new Map();
  const localeSpreads = new Map();
  let active = null;

  if (!fs.existsSync(fullPath)) {
    return { localeKeys: new Map(), missingCatalog: true };
  }

  const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
  for (const line of lines) {
    if (!active) {
      const constMatch = line.match(/^\s*const\s+([A-Z][A-Z0-9_]+)\s*:\s*Messages\s*=\s*\{\s*$/);
      if (constMatch) {
        active = { name: constMatch[1], type: 'group', keys: new Set(), spreads: [] };
        continue;
      }

      const localeMatch = line.match(/^\s*'([^']+)'\s*:\s*\{\s*$/);
      if (localeMatch && requiredRuntimeLocales.includes(localeMatch[1])) {
        active = { name: localeMatch[1], type: 'locale', keys: new Set(), spreads: [] };
      }
      continue;
    }

    const spreadMatch = line.match(/^\s*\.\.\.([A-Z][A-Z0-9_]+)/);
    if (spreadMatch) {
      active.spreads.push(spreadMatch[1]);
      continue;
    }

    if (/^\s*}\s*,?;?\s*$/.test(line)) {
      groups.set(active.name, active.keys);
      if (active.type === 'locale') {
        localeSpreads.set(active.name, active.spreads);
      }
      active = null;
      continue;
    }

    const key = collectMessageKeysFromLine(line);
    if (key) {
      active.keys.add(key);
    }
  }

  for (const [locale, spreads] of localeSpreads) {
    const keys = groups.get(locale) || new Set();
    for (const spread of spreads) {
      for (const key of groups.get(spread) || []) {
        keys.add(key);
      }
    }
  }

  return {
    localeKeys: new Map(requiredRuntimeLocales.map(locale => [locale, groups.get(locale) || new Set()])),
    missingCatalog: false
  };
}

function hasRuntimeKey(keys, key) {
  if (keys.has(key)) return true;
  return prefixAliases.some(([from, to]) => key.startsWith(from) && keys.has(`${to}${key.slice(from.length)}`));
}

function collectMissingRuntimeKeyHits(root) {
  const staticHits = [];
  for (const dir of targets) {
    walkStaticTranslationKeys(root, path.join(root, dir), staticHits);
  }

  const { localeKeys, missingCatalog } = collectRuntimeCatalogKeys(root);
  if (missingCatalog) {
    return [`${runtimeCatalogPath}:1: missing-runtime-catalog: runtime i18n catalog is required for static key validation`];
  }

  const hitsByKey = new Map();
  for (const hit of staticHits) {
    if (!hitsByKey.has(hit.key)) {
      hitsByKey.set(hit.key, hit);
    }
  }

  const missingHits = [];
  for (const locale of requiredRuntimeLocales) {
    const keys = localeKeys.get(locale) || new Set();
    for (const [key, hit] of hitsByKey) {
      if (hasRuntimeKey(keys, key)) continue;
      missingHits.push(`${hit.relativePath}:${hit.line}: missing-i18n-key(${locale},${hit.kind}): ${key}`);
    }
  }
  return missingHits;
}

export async function collectI18nReportHits(root = process.cwd()) {
  const hits = [];
  for (const dir of targets) {
    walk(root, path.join(root, dir), hits);
  }
  hits.push(...collectMissingRuntimeKeyHits(root));
  return hits;
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const hits = await collectI18nReportHits();

  if (hits.length === 0) {
    console.log('No untranslated CJK literals, literal fallback args, or missing runtime i18n keys found in app/components/lib/scripts.');
    process.exit(0);
  }

  console.log('Potential i18n violations:');
  for (const hit of hits) {
    console.log(hit);
  }
  process.exit(1);
}
