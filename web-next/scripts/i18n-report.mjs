import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const targets = ['app', 'components', 'lib', 'scripts'];
const filePattern = /\.(ts|tsx|js|mjs)$/;
const testFilePattern = /\.(test|spec)\.(ts|tsx|js|mjs)$/;
const cjkPattern = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const literalFallbackPattern = /\bt\(\s*(['"`])(?:\\.|(?!\1).)*\1\s*,\s*(['"`])/;
const ignoredRelativePaths = new Set([
  'lib/i18n-runtime-messages.ts',
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

export async function collectI18nReportHits(root = process.cwd()) {
  const hits = [];
  for (const dir of targets) {
    walk(root, path.join(root, dir), hits);
  }
  return hits;
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const hits = await collectI18nReportHits();

  if (hits.length === 0) {
    console.log('No untranslated CJK string literals or literal fallback args found in app/components/lib/scripts.');
    process.exit(0);
  }

  console.log('Potential i18n violations:');
  for (const hit of hits) {
    console.log(hit);
  }
  process.exit(1);
}
