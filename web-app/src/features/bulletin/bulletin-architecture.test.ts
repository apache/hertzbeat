/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';
import apiSource from './api/bulletin-api.ts?raw';
import controllerSource from './controller/bulletin-controller.ts?raw';
import queryControllerSource from './controller/bulletin-query-controller.ts?raw';
import baselineSource from '../../../scripts/feature-debt-baseline.json?raw';

const controllerSources = import.meta.glob('./controller/*.ts', {
  eager: true,
  import: 'default',
  query: '?raw'
});
const productionControllerSources = Object.fromEntries(
  Object.entries(controllerSources).filter(([path]) => !path.endsWith('.test.ts'))
);

describe('bulletin architecture', () => {
  it('uses the monitor public contract instead of feature internals', () => {
    const sources = Object.values(productionControllerSources).join('\n');
    expect(sources).toContain("from '@/features/monitor'");
    expect(sources).not.toMatch(/@\/features\/monitor\/(api|controller|model|pages|components)/);
  });

  it('uses runtime schemas instead of a local primitive parser family', () => {
    expect(apiSource).toContain("from './bulletin-schema'");
    expect(apiSource).not.toMatch(/function\s+(?:array|boolean|integer|number|object|record|stringArray|text)\s*\(/);
  });

  it('splits controller responsibilities around one Query Key factory', () => {
    const required = [
      './controller/bulletin-query-keys.ts',
      './controller/bulletin-list-controller.ts',
      './controller/bulletin-dependencies-controller.ts',
      './controller/bulletin-metrics-controller.ts',
      './controller/bulletin-transactions-controller.ts'
    ];

    expect(required.filter(path => controllerSources[path] === undefined)).toEqual([]);
    expect(controllerSource).not.toMatch(/\buseQuery(?:Client)?\s*\(/);
    expect(Object.entries(productionControllerSources).flatMap(([path, source]) => (
      /queryKey\s*:\s*\[/.test(source) ? [path] : []
    ))).toEqual([]);
  });

  it('keeps every Bulletin controller reviewable and removes its exact debt', () => {
    const oversized = Object.entries(productionControllerSources).flatMap(([path, source]) => {
      const lines = sourceLineCount(source);
      return lines > 200 ? [`${path}: ${lines}`] : [];
    });

    expect(oversized).toEqual([]);
    expect(baselineSource).not.toContain('features/bulletin/controller/bulletin-controller.ts');
  });

  it('keeps the query controller in ordinary readable statements', () => {
    expect(queryControllerSource).not.toMatch(/useEffect\(\(\) => \{[^\n]+\}/);
    expect(queryControllerSource).not.toMatch(/return \{[^\n]+query[^\n]+search[^\n]+\}/);
  });
});

function sourceLineCount(value: string) {
  return value.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('//')).length;
}
