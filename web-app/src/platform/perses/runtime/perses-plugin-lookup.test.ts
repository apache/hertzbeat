/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it, vi } from 'vitest';
import esmSource from '@perses-dev/plugin-system/dist/components/PluginRegistry/getPluginSearchHelper.js?raw';
import cjsSource from '@perses-dev/plugin-system/dist/cjs/components/PluginRegistry/getPluginSearchHelper.js?raw';

type Lookup = {
  resolvePluginKeys: (
    keys: string[],
    query: { kind: string; name: string; version?: string; registry?: string },
    precedence?: { registryOverVersion: boolean }
  ) => string[];
};
const esm = await vi.importActual<Lookup>(
  '@perses-dev/plugin-system/dist/components/PluginRegistry/getPluginSearchHelper'
);
const cjs = await vi.importActual<Lookup>(
  '@perses-dev/plugin-system/dist/cjs/components/PluginRegistry/getPluginSearchHelper'
);
const query = { kind: 'Panel', name: 'TimeSeriesChart' };
const key = (version: string, registry = '') => `Panel:TimeSeriesChart:${registry}:${version}`;

describe.each([esm, cjs])('native plugin version lookup', ({ resolvePluginKeys }) => {
  it('loads only the locked comparator without the unrelated semver barrel', () => {
    for (const source of [esmSource, cjsSource]) {
      expect(source).toContain('semver/functions/gt');
      expect(source).not.toMatch(/(?:from\s+|require\()['"]semver['"]/);
    }
  });
  it('retains exact first and highest version fallback', () => {
    expect(resolvePluginKeys([key('1.0.0'), key('2.0.0')], { ...query, version: '1.0.0' })).toEqual([
      key('1.0.0'),
      key('2.0.0')
    ]);
    expect(resolvePluginKeys([key('1.0.0-beta.1'), key('1.0.0-beta.2')], query)).toEqual([key('1.0.0-beta.2')]);
    expect(resolvePluginKeys([key('1.0.0'), key('1.0.0-rc.1')], query)).toEqual([key('1.0.0')]);
  });
  it('preserves equal-version registry precedence and absent candidates', () => {
    const keys = [key('1.0.0', 'official'), key('1.0.0')];
    expect(resolvePluginKeys(keys, query)).toEqual([key('1.0.0')]);
    expect(resolvePluginKeys(keys, query, { registryOverVersion: true })).toEqual([key('1.0.0', 'official')]);
    expect(resolvePluginKeys([], query)).toEqual([]);
  });
});
