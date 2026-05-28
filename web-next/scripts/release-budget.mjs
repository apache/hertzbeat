import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export const DEFAULT_RELEASE_BUDGET_BYTES = 8 * 1024 * 1024;

export function parseBudgetBytes(value = process.env.HERTZBEAT_WEB_NEXT_BUNDLE_BUDGET_BYTES) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return DEFAULT_RELEASE_BUDGET_BYTES;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid HERTZBEAT_WEB_NEXT_BUNDLE_BUDGET_BYTES value: ${value}`);
  }
  return parsed;
}

export function formatBudgetBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KiB`;
  }
  return `${bytes} B`;
}

function collectFiles(rootDir) {
  if (!existsSync(rootDir)) {
    return [];
  }

  return readdirSync(rootDir, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(entryPath);
    }
    if (entry.isFile()) {
      return [entryPath];
    }
    return [];
  });
}

export function collectReleaseJsAssets(distDir = process.env.NEXT_DIST_DIR || '.next') {
  const staticDir = path.resolve(process.cwd(), distDir, 'static');

  return collectFiles(staticDir)
    .filter(filePath => filePath.endsWith('.js'))
    .map(filePath => ({
      path: path.relative(path.resolve(process.cwd(), distDir), filePath).replaceAll(path.sep, '/'),
      bytes: statSync(filePath).size
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function evaluateReleaseBudget(entries, maxBytes = DEFAULT_RELEASE_BUDGET_BYTES) {
  const normalizedEntries = entries
    .map(entry => ({
      path: String(entry.path || ''),
      bytes: Number(entry.bytes || 0)
    }))
    .filter(entry => entry.path && Number.isFinite(entry.bytes) && entry.bytes >= 0);
  const totalBytes = normalizedEntries.reduce((total, entry) => total + entry.bytes, 0);
  const largestEntries = [...normalizedEntries].sort((left, right) => right.bytes - left.bytes).slice(0, 5);

  return {
    totalBytes,
    maxBytes,
    passed: totalBytes <= maxBytes,
    largestEntries
  };
}

export function assertReleaseBudget({ distDir = process.env.NEXT_DIST_DIR || '.next', maxBytes = parseBudgetBytes() } = {}) {
  const entries = collectReleaseJsAssets(distDir);
  if (entries.length === 0) {
    throw new Error(`No Next.js release JavaScript assets found under ${distDir}/static. Run npm run build first.`);
  }

  const result = evaluateReleaseBudget(entries, maxBytes);
  if (!result.passed) {
    const largest = result.largestEntries
      .map(entry => `${entry.path}=${formatBudgetBytes(entry.bytes)}`)
      .join(', ');
    throw new Error(
      `web-next release JavaScript assets exceed budget: ${formatBudgetBytes(result.totalBytes)} > `
        + `${formatBudgetBytes(result.maxBytes)}. Largest chunks: ${largest}`,
    );
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = assertReleaseBudget();
  console.log(
    `web-next release JavaScript assets: ${formatBudgetBytes(result.totalBytes)} / ${formatBudgetBytes(result.maxBytes)}`,
  );
}
