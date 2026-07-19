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
import { extname, isAbsolute, join, normalize, relative, sep } from 'node:path';
import ts from 'typescript';

const baselinePath = join('scripts', 'function-debt-baseline.json');
const functionLineLimit = 60;
const sourceExtensions = new Set(['.ts', '.tsx']);

export function checkFunctionConventions(projectRoot) {
  const observations = collectFunctionDebt(projectRoot);
  const { entries, failures } = readAndValidateBaseline(projectRoot);
  const observationsByKey = new Map(observations.map(item => [functionKey(item), item]));

  for (const entry of entries.filter(item => !item.invalid)) {
    const current = observationsByKey.get(functionKey(entry));
    if (!current) {
      failures.push(
        `stale function baseline: ${entry.path} ${entry.identity} is no longer over ${functionLineLimit} lines`
      );
      continue;
    }
    if (current.actual > entry.allowedMax) {
      failures.push(
        `function baseline exceeded at ${entry.path} ${entry.identity}: actual ${current.actual} exceeds allowedMax ${entry.allowedMax}`
      );
    } else if (current.actual < entry.allowedMax) {
      failures.push(
        `stale function baseline at ${entry.path} ${entry.identity}: actual ${current.actual} is below allowedMax ${entry.allowedMax}`
      );
    }
    observationsByKey.delete(functionKey(entry));
  }

  failures.push(
    ...[...observationsByKey.values()].map(
      item => `${item.path} ${item.identity}: ${item.actual} lines exceeds ${functionLineLimit}`
    )
  );
  return failures;
}

function collectFunctionDebt(projectRoot) {
  const sourceRoot = join(projectRoot, 'src');
  if (!existsSync(sourceRoot)) return [];
  return walk(sourceRoot).flatMap(path => {
    if (!sourceExtensions.has(extname(path)) || isTest(path) || path.endsWith('.d.ts')) return [];
    const source = readFileSync(path, 'utf8');
    const sourceFile = ts.createSourceFile(
      path,
      source,
      ts.ScriptTarget.Latest,
      true,
      extname(path) === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    const relativePath = relative(sourceRoot, path).split(sep).join('/');
    return inspectFunctions(source, sourceFile, relativePath);
  });
}

function inspectFunctions(source, sourceFile, path) {
  const observations = [];
  const identityOccurrences = new Map();
  const visit = node => {
    if (isFunctionWithBody(node)) {
      const baseIdentity = functionIdentity(node, sourceFile);
      const occurrence = (identityOccurrences.get(baseIdentity) ?? 0) + 1;
      identityOccurrences.set(baseIdentity, occurrence);
      const identity = occurrence === 1 ? baseIdentity : `${baseIdentity}#${occurrence}`;
      const actual = countFunctionLines(source, sourceFile, node);
      if (actual > functionLineLimit) observations.push({ path, identity, actual });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return observations;
}

function isFunctionWithBody(node) {
  return ts.isFunctionLike(node) && node.body !== undefined;
}

function functionIdentity(node, sourceFile) {
  if (ts.isFunctionDeclaration(node) && node.name) return `function:${node.name.text}`;
  if (ts.isMethodDeclaration(node)) return `method:${ownerName(node)}.${nodeName(node.name, sourceFile)}`;
  if (ts.isGetAccessorDeclaration(node)) return `getter:${ownerName(node)}.${nodeName(node.name, sourceFile)}`;
  if (ts.isSetAccessorDeclaration(node)) return `setter:${ownerName(node)}.${nodeName(node.name, sourceFile)}`;
  if (ts.isConstructorDeclaration(node)) return `constructor:${ownerName(node)}`;

  const parent = node.parent;
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return `variable:${parent.name.text}`;
  if ((ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent)) && parent.name) {
    return `property:${nodeName(parent.name, sourceFile)}`;
  }
  if (ts.isCallExpression(parent)) return `callback:${callName(parent.expression, sourceFile)}`;
  if (ts.isJsxExpression(parent) && parent.parent && ts.isJsxAttribute(parent.parent)) {
    return `jsx-callback:${parent.parent.name.text}`;
  }
  return `anonymous:${ts.SyntaxKind[node.kind]}`;
}

function ownerName(node) {
  let current = node.parent;
  while (current) {
    if ((ts.isClassDeclaration(current) || ts.isClassExpression(current)) && current.name) {
      return current.name.text;
    }
    if (ts.isObjectLiteralExpression(current)) {
      const parent = current.parent;
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
    }
    current = current.parent;
  }
  return '<object>';
}

function nodeName(name, sourceFile) {
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name))
    return name.text;
  return name.getText(sourceFile).replace(/\s+/g, '');
}

function callName(expression, sourceFile) {
  return expression.getText(sourceFile).replace(/\s+/g, '').slice(0, 80);
}

function countFunctionLines(source, sourceFile, node) {
  const functionSource = source.slice(node.getStart(sourceFile), node.getEnd());
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, sourceFile.languageVariant, functionSource);
  const commentRanges = [];
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) {
      commentRanges.push([scanner.getTokenPos(), scanner.getTextPos()]);
    }
  }
  let cursor = 0;
  const withoutComments =
    commentRanges
      .map(([start, end]) => {
        const unchanged = functionSource.slice(cursor, start);
        const comment = functionSource.slice(start, end).replace(/[^\r\n]/g, ' ');
        cursor = end;
        return unchanged + comment;
      })
      .join('') + functionSource.slice(cursor);
  return withoutComments.split(/\r?\n/).filter(line => line.trim()).length;
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
  const entries = baseline.entries.map((value, index) => {
    const label = `${baselinePath} entry ${index + 1}`;
    const entry = value && typeof value === 'object' ? { ...value, invalid: false } : { invalid: true };
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      failures.push(`${label}: baseline entry must be an object`);
      return entry;
    }
    if (entry.rule !== 'function-size') {
      failures.push(`${label}: unknown baseline rule '${String(entry.rule)}'`);
      entry.invalid = true;
    }
    if (!isExactSourcePath(entry.path) || !isProductionTypeScriptPath(entry.path)) {
      failures.push(`${label}: baseline path must name an exact production TypeScript source: ${String(entry.path)}`);
      entry.invalid = true;
    } else if (!existsSync(join(projectRoot, 'src', entry.path))) {
      failures.push(`${label}: baseline path does not exist: ${entry.path}`);
      entry.invalid = true;
    }
    if (!isExactIdentity(entry.identity)) {
      failures.push(`${label}: function identity must be exact: ${String(entry.identity)}`);
      entry.invalid = true;
    }
    if (!Number.isSafeInteger(entry.allowedMax) || entry.allowedMax <= functionLineLimit) {
      failures.push(`${label}: allowedMax must be a safe integer above ${functionLineLimit}`);
      entry.invalid = true;
    }
    const key = functionKey(entry);
    if (seen.has(key)) {
      failures.push(`${label}: duplicate function baseline for ${entry.path} ${entry.identity}`);
      entry.invalid = true;
    }
    seen.add(key);
    return entry;
  });
  return { entries, failures };
}

function isExactSourcePath(path) {
  return (
    typeof path === 'string' &&
    path.length > 0 &&
    !isAbsolute(path) &&
    !path.includes('\\') &&
    normalize(path).split(sep).join('/') === path &&
    !path.startsWith('../') &&
    !/[?*[\]{}!]/.test(path)
  );
}

function isProductionTypeScriptPath(path) {
  return sourceExtensions.has(extname(path)) && !isTest(path) && !path.endsWith('.d.ts');
}

function isExactIdentity(identity) {
  return typeof identity === 'string' && identity.length > 0 && !/[?*[\]{}!]/.test(identity);
}

function functionKey(value) {
  return `${value.path}:${value.identity}`;
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
