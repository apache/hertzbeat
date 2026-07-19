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

import { describe, expect, it } from 'vitest';

const sourceDirectories = ['api', 'model', 'controller', 'components', 'pages'] as const;
const allowedDependencies: Record<(typeof sourceDirectories)[number], readonly string[]> = {
  api: ['api'],
  model: ['api', 'model'],
  controller: ['api', 'model', 'controller'],
  components: ['model', 'controller', 'components'],
  pages: ['controller', 'components', 'pages']
};
const presentationImportExceptions = new Set<string>();
const importPattern = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
const productionSources = import.meta.glob('./**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw'
});

describe('instrumentation feature boundaries', () => {
  it('uses one controller-owned page boundary and has no generic hooks layer', () => {
    const paths = Object.keys(productionSources).filter(path => !path.includes('.test.'));
    expect(paths.filter(path => path.startsWith('./hooks/'))).toEqual([]);
    expect(productionSources['./pages/instrumentation-page.tsx']).toContain(
      "from '../controller/use-instrumentation-page-controller'"
    );
    expect(productionSources['./pages/instrumentation-page.tsx']).not.toMatch(/useNavigate|\.\.\/model\//);
  });

  it('keeps production source in explicit feature-local layers', () => {
    const paths = Object.keys(productionSources).filter(path => !path.includes('.test.'));
    expect(sourceDirectories.filter(directory => !paths.some(path => path.startsWith(`./${directory}/`)))).toEqual([]);
    expect(paths.filter(path => /^\.\/[^/]+$/.test(path) && path !== './index.ts')).toEqual([]);
  });

  it('keeps transport independent from UI flow and enforces inward imports', () => {
    const violations = Object.entries(productionSources)
      .filter(([path]) => !path.includes('.test.'))
      .flatMap(([path, source]) => validateImports(path, source));
    expect(violations).toEqual([]);
  });

  it('keeps presentation controller-owned without API or model imports', () => {
    const directPresentationImports = Object.entries(productionSources)
      .filter(([path]) => path.startsWith('./components/') || path.startsWith('./pages/'))
      .flatMap(([path, source]) =>
        [...source.matchAll(importPattern)]
          .map(match => match[1])
          .filter(specifier => specifier?.startsWith('../api/') || specifier?.startsWith('../model/'))
          .map(specifier => `${path}|${specifier}`)
      );
    expect(directPresentationImports.sort()).toEqual([...presentationImportExceptions].sort());
  });

  it('keeps secret-bearing contract layers out of persistence, logging, and analytics', () => {
    const forbidden =
      /\b(?:localStorage|sessionStorage|indexedDB|sendBeacon|analytics|console\.(?:log|info|warn|error))\b/;
    const violations = Object.entries(productionSources)
      .filter(([path]) => ['./api/', './model/', './controller/'].some(prefix => path.startsWith(prefix)))
      .filter(([, source]) => forbidden.test(source))
      .map(([path]) => path);
    expect(violations).toEqual([]);
  });

  it('keeps token material out of every instrumentation persistence, log, and URL surface', () => {
    const forbiddenSink =
      /\b(?:localStorage|sessionStorage|indexedDB|sendBeacon|analytics|console\.(?:log|info|warn|error))\b/;
    const tokenUrl =
      /(?:URLSearchParams|searchParams|location|href)[\s\S]{0,120}\btoken\b|\btoken\b[\s\S]{0,120}(?:URLSearchParams|searchParams|location|href)/i;
    const violations = Object.entries(productionSources)
      .filter(([path]) => !path.includes('.test.'))
      .filter(([, source]) => forbiddenSink.test(source) || tokenUrl.test(source))
      .map(([path]) => path);
    expect(violations).toEqual([]);
  });

  it('keeps language-specific installation recipes out of presentation source', () => {
    const tutorialLiteral = /\b(?:spring_boot|go_generic|aspnet_core|zero_code|javaagent|opentelemetry-instrument)\b/i;
    const violations = Object.entries(productionSources)
      .filter(([path]) => !path.includes('.test.'))
      .filter(([path]) => path.startsWith('./components/') || path.startsWith('./pages/'))
      .filter(([, source]) => tutorialLiteral.test(source))
      .map(([path]) => path);
    expect(violations).toEqual([]);
  });

  it('keeps query navigation out of detection presentation markup', () => {
    const detection = productionSources['./components/instrumentation-detection.tsx'];
    expect(detection).not.toMatch(/\bhref\s*=/);
    expect(detection).toContain('detection.openQuery(signal)');
    expect(detection).not.toMatch(/react-router|useNavigate/);
  });

  it('keeps guide copy transactions in the parent and rendering in pure presentation', () => {
    const guide = productionSources['./components/instrumentation-guide.tsx'];
    const presentation = productionSources['./components/instrumentation-guide-presentation.tsx'];

    expect(guide).toContain("from './instrumentation-guide-presentation'");
    expect(guide).toContain('App.useApp()');
    expect(guide).toContain('await setup.copySnippet(snippet)');
    expect(guide).toContain("message.success(t('instrumentation.copySuccess'))");
    expect(guide).toContain("'instrumentation.tokenRequired' : 'instrumentation.copyFailed'");
    expect(guide).toContain('const tokenAvailable = Boolean(setup.token)');
    expect(guide).toContain('onBack={() => setup.setStage(3)}');
    expect(guide).toContain('onStartDetection={onStartDetection}');
    expect(presentation).toContain('export function InstrumentationComponentSummary');
    expect(presentation).toContain('export function InstrumentationGuideSteps');
    expect(presentation).toContain('function InstrumentationSnippet');
    expect(presentation).toContain('export function InstrumentationGuideActions');
    expect(presentation).toContain("String(index + 1).padStart(2, '0')");
    expect(presentation).toContain('snippet.secretPlaceholders.length > 0 && !tokenAvailable');
    expect(presentation).toContain('<code>{snippet.content}</code>');
    expect(presentation).not.toMatch(/App\.useApp|setup\.|message\.|useEffect|useRef|useState/);
  });

  it('keeps Collector inventory intake separate from the transient render target', () => {
    expect(productionSources['./api/collector-api.ts']).not.toContain('CollectorTarget');
    expect(productionSources['./controller/use-instrumentation-guide-controller.ts']).toContain('CollectorTarget');
  });
});

function validateImports(path: string, source: string) {
  const sourceDirectory = path.split('/')[1] as (typeof sourceDirectories)[number];
  if (!sourceDirectories.includes(sourceDirectory)) return [];
  return [...source.matchAll(importPattern)].flatMap(match => {
    const specifier = match[1];
    if (!specifier) return [];
    if (presentationImportExceptions.has(`${path}|${specifier}`)) return [];
    if (specifier.startsWith('@/core/http/'))
      return sourceDirectory === 'api' ? [] : [`${path} imports core transport`];
    if (!specifier.startsWith('.')) return [];
    const target = resolveFeaturePath(path, specifier);
    const targetDirectory = target.split('/')[1];
    if (!target.startsWith('./') || !targetDirectory) return [`${path} imports outside the feature`];
    return allowedDependencies[sourceDirectory].includes(targetDirectory) ? [] : [`${path} imports ${targetDirectory}`];
  });
}

function resolveFeaturePath(sourcePath: string, specifier: string) {
  const segments = sourcePath.split('/');
  segments.pop();
  for (const segment of specifier.split('/')) {
    if (segment === '..') segments.pop();
    else if (segment !== '.') segments.push(segment);
  }
  return segments.join('/');
}
