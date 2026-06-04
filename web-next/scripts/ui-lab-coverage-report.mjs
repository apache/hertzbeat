import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webNextDirs = ['app', 'components', 'lib', 'packages', 'scripts'];
const sourceExtensions = ['.tsx', '.ts', '.jsx', '.js', '.mjs'];
const ignoredRelativePaths = new Set(['lib/i18n-runtime-messages.ts', 'test/i18n-test-helper.ts']);

function readIfExists(fullPath) {
  if (!fs.existsSync(fullPath)) return '';
  return fs.readFileSync(fullPath, 'utf8');
}

function parseRouteCatalog(navSource) {
  const catalogBody = navSource.match(/export const routeCatalog(?:\s*:[\s\S]*?)?\s*=\s*\[([\s\S]*?)\];/)?.[1] ?? '';
  const entries = [];
  let depth = 0;
  let start = -1;

  for (let index = 0; index < catalogBody.length; index += 1) {
    const char = catalogBody[index];
    if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const block = catalogBody.slice(start, index + 1);
        const readString = name => block.match(new RegExp(`${name}:\\s*'([^']*)'`))?.[1];
        const readBoolean = name => {
          const match = block.match(new RegExp(`${name}:\\s*(true|false)`));
          return match ? match[1] === 'true' : undefined;
        };
        entries.push({
          key: readString('key'),
          href: readString('href'),
          label: readString('label'),
          routeKind: readString('routeKind'),
          redirectTo: readString('redirectTo'),
          includeInRouteMatrix: readBoolean('includeInRouteMatrix')
        });
        start = -1;
      }
    }
  }

  return entries.filter(entry => entry.key && entry.href && entry.routeKind);
}

function routePagePath(root, href) {
  if (!href || href.startsWith('http')) return null;
  if (href === '/') return path.join(root, 'app/page.tsx');
  return path.join(root, 'app', href.replace(/^\//, ''), 'page.tsx');
}

function resolveLocalImport(root, fromFile, specifier) {
  if (specifier.startsWith('@hertzbeat/ui')) {
    return { packageOwner: true, specifier };
  }

  let basePath;
  if (specifier.startsWith('@/')) {
    basePath = path.join(root, specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    basePath = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return null;
  }

  for (const extension of sourceExtensions) {
    const candidate = `${basePath}${extension}`;
    if (fs.existsSync(candidate)) return { file: candidate };
  }
  for (const extension of sourceExtensions) {
    const candidate = path.join(basePath, `index${extension}`);
    if (fs.existsSync(candidate)) return { file: candidate };
  }
  return null;
}

function isScannableWebNextFile(root, fullPath) {
  const relativePath = path.relative(root, fullPath);
  if (!relativePath || relativePath.startsWith('..')) return false;
  if (ignoredRelativePaths.has(relativePath)) return false;
  return webNextDirs.some(dir => relativePath === dir || relativePath.startsWith(`${dir}/`));
}

function scanRouteEvidence(root, pagePath) {
  const seen = new Set();
  const stack = [pagePath];
  const evidence = {
    pageExists: Boolean(pagePath && fs.existsSync(pagePath)),
    uiOwner: false,
    coldOwner: false,
    uiFiles: new Set(),
    coldFiles: new Set(),
    scannedFiles: new Set()
  };

  while (stack.length > 0) {
    const currentFile = stack.pop();
    if (!currentFile || seen.has(currentFile) || !fs.existsSync(currentFile)) continue;
    seen.add(currentFile);
    if (!isScannableWebNextFile(root, currentFile)) continue;

    const relativePath = path.relative(root, currentFile);
    evidence.scannedFiles.add(relativePath);
    const source = readIfExists(currentFile);
    const fileHasUiOwner =
      source.includes('@hertzbeat/ui') || source.includes('data-hz-ui') || source.includes('hertzbeat-ui');
    const fileHasColdOwner = source.includes('data-cold-') || /\bcold-[a-z0-9-]+/.test(source);

    if (fileHasUiOwner) {
      evidence.uiOwner = true;
      evidence.uiFiles.add(relativePath);
    }
    if (fileHasColdOwner) {
      evidence.coldOwner = true;
      evidence.coldFiles.add(relativePath);
    }

    const importPattern =
      /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;
    while ((match = importPattern.exec(source))) {
      const resolved = resolveLocalImport(root, currentFile, match[1] || match[2]);
      if (!resolved) continue;
      if (resolved.packageOwner) {
        evidence.uiOwner = true;
        evidence.uiFiles.add(`${relativePath} -> ${resolved.specifier}`);
      } else if (resolved.file) {
        stack.push(resolved.file);
      }
    }
  }

  return {
    ...evidence,
    uiFiles: [...evidence.uiFiles].sort(),
    coldFiles: [...evidence.coldFiles].sort(),
    scannedFiles: [...evidence.scannedFiles].sort()
  };
}

export function collectUiLabCoverage(root = process.cwd()) {
  const navSource = readIfExists(path.join(root, 'lib/nav.ts'));
  const routes = parseRouteCatalog(navSource).map(route => {
    const pagePath = routePagePath(root, route.href);
    const evidence = pagePath ? scanRouteEvidence(root, pagePath) : null;
    return {
      ...route,
      page: pagePath ? path.relative(root, pagePath) : null,
      external: !pagePath,
      uiOwner: Boolean(evidence?.uiOwner),
      coldOwner: Boolean(evidence?.coldOwner),
      pageExists: evidence?.pageExists ?? false,
      uiFiles: evidence?.uiFiles ?? [],
      coldFiles: evidence?.coldFiles ?? []
    };
  });

  const primaryLocalRoutes = routes.filter(route => route.routeKind === 'primary' && !route.external);
  const aliasLocalRoutes = routes.filter(route => route.routeKind === 'legacy-alias' && !route.external);
  const primaryMissingUiOwner = primaryLocalRoutes.filter(route => !route.uiOwner);
  const primaryPartialColdOwner = primaryLocalRoutes.filter(route => route.uiOwner && route.coldOwner);

  return {
    summary: {
      catalogRoutes: routes.length,
      externalRoutes: routes.filter(route => route.external).length,
      localPrimaryRoutes: primaryLocalRoutes.length,
      primaryWithUiOwner: primaryLocalRoutes.filter(route => route.uiOwner).length,
      primaryMissingUiOwner: primaryMissingUiOwner.length,
      primaryPartialColdOwner: primaryPartialColdOwner.length,
      aliasLocalRoutes: aliasLocalRoutes.length,
      aliasWithoutUiOwner: aliasLocalRoutes.filter(route => !route.uiOwner).length
    },
    routes,
    primaryMissingUiOwner,
    primaryPartialColdOwner
  };
}

export function formatUiLabCoverageReport(coverage) {
  const lines = [
    'UI Lab coverage report',
    `catalogRoutes=${coverage.summary.catalogRoutes}`,
    `externalRoutes=${coverage.summary.externalRoutes}`,
    `localPrimaryRoutes=${coverage.summary.localPrimaryRoutes}`,
    `primaryWithUiOwner=${coverage.summary.primaryWithUiOwner}`,
    `primaryMissingUiOwner=${coverage.summary.primaryMissingUiOwner}`,
    `primaryPartialColdOwner=${coverage.summary.primaryPartialColdOwner}`,
    `aliasLocalRoutes=${coverage.summary.aliasLocalRoutes}`,
    `aliasWithoutUiOwner=${coverage.summary.aliasWithoutUiOwner}`
  ];

  if (coverage.primaryMissingUiOwner.length > 0) {
    lines.push('', 'Primary routes missing @hertzbeat/ui ownership:');
    for (const route of coverage.primaryMissingUiOwner) {
      lines.push(`- ${route.key} ${route.href} (${route.page ?? 'external'})`);
    }
  }

  if (coverage.primaryPartialColdOwner.length > 0) {
    lines.push('', 'Primary routes still mixing cold/local owners:');
    for (const route of coverage.primaryPartialColdOwner) {
      lines.push(`- ${route.key} ${route.href}`);
    }
  }

  return lines.join('\n');
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const coverage = collectUiLabCoverage();
  console.log(formatUiLabCoverageReport(coverage));
  if (coverage.primaryMissingUiOwner.length > 0) {
    process.exit(1);
  }
}
