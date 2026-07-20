/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, isAbsolute, join, normalize, posix, relative, sep } from 'node:path';
import ts from 'typescript';

const featureDebtRules = Object.freeze({
  moduleSize: 'feature-module-size',
  primitiveParser: 'primitive-wire-parser',
  inlineQueryKey: 'inline-query-key',
  rawCssColor: 'feature-css-raw-color',
  genericHooksFile: 'generic-hooks-file',
  presentationApiDependency: 'presentation-api-dependency',
  modelApiDependency: 'model-api-dependency',
  crossFeatureInternalDependency: 'cross-feature-internal-dependency'
});

const knownRules = new Set(Object.values(featureDebtRules));
const identityRules = new Set([
  featureDebtRules.presentationApiDependency,
  featureDebtRules.modelApiDependency,
  featureDebtRules.crossFeatureInternalDependency
]);
const baselinePath = join('scripts', 'feature-debt-baseline.json');
const sourceExtensions = new Set(['.ts', '.tsx', '.css']);
const primitiveParserNames = new Set([
  'array',
  'boolean',
  'enumValue',
  'integer',
  'number',
  'object',
  'record',
  'string',
  'stringArray',
  'text'
]);

export function checkFeatureConventions(projectRoot) {
  const violations = collectFeatureViolations(projectRoot);
  const { entries, failures } = readAndValidateBaseline(projectRoot);
  const violationsByKey = new Map(violations.map(violation => [violationKey(violation), violation]));
  const validEntries = entries.filter(entry => !entry.invalid);

  for (const entry of validEntries) {
    const violation = violationsByKey.get(violationKey(entry));
    if (!violation) {
      failures.push(`stale baseline entry: ${entry.rule} at ${entry.path}`);
      continue;
    }
    if (violation.actual > entry.allowedMax) {
      failures.push(
        `baseline exceeded for ${entry.rule} at ${entry.path}: actual ${violation.actual} exceeds allowedMax ${entry.allowedMax}`
      );
    } else if (violation.actual < entry.allowedMax) {
      failures.push(
        `stale baseline ceiling for ${entry.rule} at ${entry.path}: actual ${violation.actual} is below allowedMax ${entry.allowedMax}`
      );
    }
    violationsByKey.delete(violationKey(entry));
  }

  failures.push(...[...violationsByKey.values()].map(formatViolation));
  return failures;
}

function collectFeatureViolations(projectRoot) {
  const featureRoot = join(projectRoot, 'src', 'features');
  if (!existsSync(featureRoot)) return [];
  const observations = walk(featureRoot).flatMap(path => inspectFeatureFile(path, join(projectRoot, 'src')));
  const byKey = new Map();
  for (const item of observations) {
    const key = violationKey(item);
    const current = byKey.get(key);
    byKey.set(key, current ? { ...current, actual: current.actual + item.actual } : item);
  }
  return [...byKey.values()];
}

function inspectFeatureFile(path, sourceRoot) {
  if (!sourceExtensions.has(extname(path)) || isTest(path)) return [];
  const normalizedPath = relative(sourceRoot, path).split(sep).join('/');
  const source = readFileSync(path, 'utf8');
  const observations = [];
  const syntaxCounts = extname(path) === '.css' ? undefined : countTypeScriptSyntax(source, path);
  if (normalizedPath.split('/').includes('hooks')) {
    observations.push(observation(featureDebtRules.genericHooksFile, normalizedPath, 1));
  }
  const limit = featureModuleLimit(normalizedPath);
  if (limit !== undefined) {
    const actual = countSourceLines(source, extname(path));
    if (actual > limit) observations.push(observation(featureDebtRules.moduleSize, normalizedPath, actual, limit));
  }
  if (/\/api\//.test(`/${normalizedPath}`)) {
    addCountObservation(
      observations,
      featureDebtRules.primitiveParser,
      normalizedPath,
      syntaxCounts?.primitiveParsers ?? 0
    );
  }
  addCountObservation(
    observations,
    featureDebtRules.inlineQueryKey,
    normalizedPath,
    syntaxCounts?.inlineQueryKeys ?? 0
  );
  if (extname(path) === '.css') {
    const sourceWithoutComments = stripCssComments(source);
    addCountObservation(
      observations,
      featureDebtRules.rawCssColor,
      normalizedPath,
      [...sourceWithoutComments.matchAll(/#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\s*\(/gi)].length
    );
  } else {
    observations.push(...collectDependencyObservations(source, path, normalizedPath));
  }
  return observations;
}

function observation(rule, path, actual, limit = 0, identity) {
  return { rule, path, actual, limit, ...(identity ? { identity } : {}) };
}

function addCountObservation(observations, rule, path, actual) {
  if (actual > 0) observations.push(observation(rule, path, actual));
}

export function containsPrimitiveParserHelper(source, path, parserNames = primitiveParserNames, options = {}) {
  return countTypeScriptSyntax(source, path, parserNames, options).primitiveParsers > 0;
}

function countTypeScriptSyntax(
  source,
  path,
  parserNames = primitiveParserNames,
  { includeVariableDeclarations = false } = {}
) {
  const sourceFile = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    extname(path) === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const counts = { primitiveParsers: 0, inlineQueryKeys: 0 };
  const visit = node => {
    if (ts.isFunctionDeclaration(node) && node.name && parserNames.has(node.name.text)) {
      counts.primitiveParsers += 1;
    }
    if (
      includeVariableDeclarations &&
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      parserNames.has(node.name.text) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      counts.primitiveParsers += 1;
    }
    if (isInlineQueryKey(node)) counts.inlineQueryKeys += 1;
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return counts;
}

function isInlineQueryKey(node) {
  if (!ts.isPropertyAssignment(node) && !ts.isPropertyDeclaration(node)) return false;
  return (
    propertyName(node.name) === 'queryKey' &&
    node.initializer !== undefined &&
    ts.isArrayLiteralExpression(node.initializer)
  );
}

function collectDependencyObservations(source, path, importerPath) {
  const sourceFile = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    extname(path) === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const observations = [];
  const importerSegments = importerPath.split('/');
  const importerFeature = importerSegments[1];
  const isFeatureRootPage = importerSegments.length === 3 && /-page\.tsx?$/.test(importerSegments[2] ?? '');
  const isPresentation =
    isFeatureRootPage || importerSegments.includes('components') || importerSegments.includes('pages');
  const isModel = importerSegments.includes('model');

  for (const specifier of collectModuleSpecifiers(sourceFile)) {
    const target = resolveSourceImport(importerPath, specifier);
    if (!target?.startsWith('features/')) continue;
    const targetSegments = target.split('/');
    const targetFeature = targetSegments[1];
    const targetsApi = targetSegments.includes('api');
    if (isPresentation && targetsApi) {
      observations.push(observation(featureDebtRules.presentationApiDependency, importerPath, 1, 0, target));
    }
    if (isModel && targetsApi) {
      observations.push(observation(featureDebtRules.modelApiDependency, importerPath, 1, 0, target));
    }
    if (targetFeature !== importerFeature && target !== `features/${targetFeature}`) {
      observations.push(observation(featureDebtRules.crossFeatureInternalDependency, importerPath, 1, 0, target));
    }
  }
  return observations;
}

function collectModuleSpecifiers(sourceFile) {
  const specifiers = [];
  const visit = node => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return specifiers;
}

function resolveSourceImport(importerPath, specifier) {
  let target;
  if (specifier.startsWith('@/')) target = specifier.slice(2);
  else if (specifier.startsWith('.')) target = posix.normalize(posix.join(posix.dirname(importerPath), specifier));
  else return undefined;
  return target.replace(/\.(?:[cm]?[jt]sx?)$/, '').replace(/\/index$/, '');
}

function propertyName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) {
    return name.text;
  }
  if (ts.isComputedPropertyName(name) && ts.isStringLiteral(name.expression)) return name.expression.text;
  return undefined;
}

function featureModuleLimit(path) {
  if (/-page\.[jt]sx?$/.test(path) || /\/pages\/[^/]+\.[jt]sx?$/.test(path)) return 150;
  if (/\/(?:components|controller)\//.test(path) || /(?:^|\/)[^/]+-controller\.[jt]sx?$/.test(path)) return 200;
  if (/\/(?:api|model)\//.test(path)) return 250;
  if (/^features\/[^/]+\/index\.[jt]sx?$/.test(path)) return 100;
  return undefined;
}

function countSourceLines(source, extension) {
  const withoutComments =
    extension === '.css' ? stripCssComments(source) : stripTypeScriptComments(source, extension === '.tsx');
  return withoutComments.split(/\r?\n/).filter(line => line.trim()).length;
}

function stripCssComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\r\n]/g, ' '));
}

function stripTypeScriptComments(source, jsx) {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    jsx ? ts.LanguageVariant.JSX : ts.LanguageVariant.Standard,
    source
  );
  const ranges = [];
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) {
      ranges.push([scanner.getTokenPos(), scanner.getTextPos()]);
    }
  }
  let cursor = 0;
  return (
    ranges
      .map(([start, end]) => {
        const unchanged = source.slice(cursor, start);
        const comment = source.slice(start, end).replace(/[^\r\n]/g, ' ');
        cursor = end;
        return unchanged + comment;
      })
      .join('') + source.slice(cursor)
  );
}

function readAndValidateBaseline(projectRoot) {
  const path = join(projectRoot, baselinePath);
  if (!existsSync(path)) return { entries: [], failures: [] };
  let baseline;
  try {
    baseline = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return { entries: [], failures: [`${baselinePath}: baseline must be valid JSON`] };
  }
  if (!baseline || baseline.version !== 1 || !Array.isArray(baseline.entries)) {
    return { entries: [], failures: [`${baselinePath}: expected { version: 1, entries: [] }`] };
  }
  const failures = [];
  const seen = new Set();
  const entries = baseline.entries.map((entry, index) =>
    validateBaselineEntry(projectRoot, entry, index, seen, failures)
  );
  return { entries, failures };
}

function validateBaselineEntry(projectRoot, value, index, seen, failures) {
  const label = `${baselinePath} entry ${index + 1}`;
  const entry = value && typeof value === 'object' ? { ...value, invalid: false } : { invalid: true };
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failures.push(`${label}: baseline entry must be an object`);
    return entry;
  }
  if (!knownRules.has(entry.rule)) {
    failures.push(`${label}: unknown baseline rule '${String(entry.rule)}'`);
    entry.invalid = true;
  }
  if (!isExactFeaturePath(entry.path)) {
    failures.push(`${label}: baseline path must be exact: ${String(entry.path)}`);
    entry.invalid = true;
  } else if (!existsSync(join(projectRoot, 'src', entry.path))) {
    failures.push(`${label}: baseline path does not exist: ${entry.path}`);
    entry.invalid = true;
  }
  if (!Number.isSafeInteger(entry.allowedMax) || entry.allowedMax <= 0) {
    failures.push(`${label}: allowedMax must be a positive safe integer`);
    entry.invalid = true;
  }
  if (identityRules.has(entry.rule) && !isExactDependencyIdentity(entry.identity)) {
    failures.push(`${label}: dependency identity must be exact: ${String(entry.identity)}`);
    entry.invalid = true;
  } else if (!identityRules.has(entry.rule) && entry.identity !== undefined) {
    failures.push(`${label}: rule '${String(entry.rule)}' does not accept an identity`);
    entry.invalid = true;
  }
  const key = violationKey(entry);
  if (seen.has(key)) {
    failures.push(`${label}: duplicate baseline entry for ${entry.rule} at ${entry.path}`);
    entry.invalid = true;
  }
  seen.add(key);
  return entry;
}

function isExactFeaturePath(path) {
  return (
    typeof path === 'string' &&
    path.startsWith('features/') &&
    !isAbsolute(path) &&
    !path.includes('\\') &&
    normalize(path).split(sep).join('/') === path &&
    !/[?*[\]{}!]/.test(path)
  );
}

function violationKey(value) {
  return `${value.rule}:${value.path}:${value.identity ?? ''}`;
}

function isExactDependencyIdentity(identity) {
  return (
    typeof identity === 'string' &&
    identity.startsWith('features/') &&
    !isAbsolute(identity) &&
    !identity.includes('\\') &&
    posix.normalize(identity) === identity &&
    !/[?*[\]{}!]/.test(identity)
  );
}

function formatViolation(violation) {
  switch (violation.rule) {
    case featureDebtRules.moduleSize:
      return `${violation.path}: ${violation.actual} lines exceeds ${violation.limit}`;
    case featureDebtRules.primitiveParser:
      return `${violation.path}: use runtime schemas instead of local primitive wire parsers`;
    case featureDebtRules.inlineQueryKey:
      return `${violation.path}: use the feature Query Key factory`;
    case featureDebtRules.rawCssColor:
      return `${violation.path}: use shared semantic color tokens`;
    case featureDebtRules.genericHooksFile:
      return `${violation.path}: generic feature hooks directories are forbidden; move orchestration to controller`;
    case featureDebtRules.presentationApiDependency:
      return `${violation.path}: presentation cannot depend on feature API ${violation.identity}`;
    case featureDebtRules.modelApiDependency:
      return `${violation.path}: model cannot depend on feature API ${violation.identity}`;
    case featureDebtRules.crossFeatureInternalDependency:
      return `${violation.path}: cross-feature imports must use the target public API instead of ${violation.identity}`;
    default:
      return `${violation.path}: unknown feature convention violation`;
  }
}

function walk(directory) {
  return readdirSync(directory).flatMap(entry => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function isTest(path) {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path);
}
