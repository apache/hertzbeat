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
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import { checkFeatureConventions, containsPrimitiveParserHelper } from './feature-conventions.mjs';
import { checkFunctionConventions } from './function-conventions.mjs';

const requiredDirectories = ['app', 'core', 'layout', 'features', 'shared', join('assets', 'i18n')];
const forbiddenSegments = new Set(['compat', 'controllers', 'deprecated', 'legacy', 'view-models']);
const sourceExtensions = new Set(['.ts', '.tsx', '.css']);
const ignoredDirectories = new Set(['.tmp', 'coverage', 'dist', 'node_modules']);
const maximumSourceLineLength = 200;
const authPrimitiveParserNames = new Set([
  'array',
  'boolean',
  'enumValue',
  'hasExactKeys',
  'integer',
  'isRecord',
  'isString',
  'isStringArray',
  'isUnknownArray',
  'number',
  'object',
  'record',
  'string',
  'stringArray',
  'text'
]);

export function checkArchitecture(projectRoot) {
  const sourceRoot = join(projectRoot, 'src');
  const failures = [];

  for (const directory of requiredDirectories) {
    if (!existsSync(join(sourceRoot, directory))) {
      failures.push(`missing required directory: src/${directory.split(sep).join('/')}`);
    }
  }

  for (const path of walk(sourceRoot)) {
    if (!sourceExtensions.has(extname(path))) continue;
    validateSource(path, sourceRoot, failures);
  }

  failures.push(...checkFeatureConventions(projectRoot));
  failures.push(...checkFunctionConventions(projectRoot));

  return failures;
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap(entry => {
    if (ignoredDirectories.has(entry)) return [];
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function validateSource(path, sourceRoot, failures) {
  const normalizedPath = relative(sourceRoot, path).split(sep).join('/');
  const segments = normalizedPath.split('/');
  const forbidden = segments.find(segment => forbiddenSegments.has(segment));
  if (forbidden) failures.push(`${normalizedPath}: forbidden directory segment '${forbidden}'`);

  validateSourceFileName(path, normalizedPath, failures);
  const source = readFileSync(path, 'utf8');
  validateReadableTsx(path, normalizedPath, source, failures);
  validateModuleSize(path, normalizedPath, source, failures);

  if (/\/(?:pages|components)\//.test(`/${normalizedPath}`) && /\b(?:fetch|EventSource)\s*\(/.test(source)) {
    failures.push(`${normalizedPath}: pages and components cannot own transport`);
  }

  if (
    !isTest(path) &&
    /\b(?:localStorage|sessionStorage|indexedDB)\b/.test(source) &&
    normalizedPath.startsWith('features/instrumentation/')
  ) {
    failures.push(`${normalizedPath}: instrumentation cannot persist onboarding state or secrets`);
  }

  if (
    !isTest(path) &&
    /\b(?:console\.(?:log|info|warn|error)|sendBeacon|analytics)\b/.test(source) &&
    normalizedPath.startsWith('features/instrumentation/')
  ) {
    failures.push(`${normalizedPath}: instrumentation cannot log or analyze onboarding state or secrets`);
  }

  if (
    !isTest(path) &&
    normalizedPath.startsWith('core/auth/') &&
    containsPrimitiveParserHelper(source, path, authPrimitiveParserNames, {
      includeVariableDeclarations: true
    })
  ) {
    failures.push(
      `${normalizedPath}: core auth contracts must use runtime schemas instead of primitive parser helpers`
    );
  }
}

function validateSourceFileName(path, normalizedPath, failures) {
  const fileName = basename(path);
  const validName =
    /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.(?:test|spec))?\.tsx$/.test(fileName) ||
    /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.(?:test|spec|d))?\.ts$/.test(fileName) ||
    /^[a-z0-9]+(?:-[a-z0-9]+)*\.module\.css$/.test(fileName) ||
    /^[a-z0-9]+(?:-[a-z0-9]+)*\.css$/.test(fileName);
  if (!validName) failures.push(`${normalizedPath}: source files must use kebab-case`);
}

function validateReadableTsx(path, normalizedPath, source, failures) {
  if (extname(path) !== '.tsx' || isTest(path)) return;
  source.split(/\r?\n/).forEach((line, index) => {
    if (line.length > maximumSourceLineLength) {
      failures.push(`${normalizedPath}:${index + 1}: ${line.length} characters exceeds ${maximumSourceLineLength}`);
    }
  });
  if (/\.then\s*\(/.test(source)) {
    failures.push(`${normalizedPath}: use a named async handler instead of a Promise chain in TSX`);
  }
}

function validateModuleSize(path, normalizedPath, source, failures) {
  if (isTest(path) || normalizedPath.startsWith('features/')) return;
  const lines = source.trimEnd().split(/\r?\n/).length;
  const limit = lineLimit(normalizedPath);
  if (lines > limit) failures.push(`${normalizedPath}: ${lines} lines exceeds ${limit}`);
}

function lineLimit(normalizedPath) {
  if (/-page\.[jt]sx?$/.test(normalizedPath) || /\/pages\/[^/]+\.[jt]sx?$/.test(normalizedPath)) return 300;
  if (/\/(?:api|components|controller|hooks|model)\//.test(normalizedPath)) return 400;
  if (/\/index\.[jt]sx?$/.test(normalizedPath) && normalizedPath.startsWith('features/')) return 100;
  return 600;
}

function isTest(path) {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  const projectRoot = resolve(import.meta.dirname, '..');
  const failures = checkArchitecture(projectRoot);
  if (failures.length > 0) {
    console.error('Frontend source convention check failed:');
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log('Frontend source convention check passed.');
}
