/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it } from 'vitest';
import en from '@/assets/i18n/explore/en-us.json';
import ja from '@/assets/i18n/explore/ja-jp.json';
import pt from '@/assets/i18n/explore/pt-br.json';
import zh from '@/assets/i18n/explore/zh-cn.json';
import tw from '@/assets/i18n/explore/zh-tw.json';

describe('Trace ordering, coverage and evidence reason localization', () => {
  it.each([en, ja, pt, zh, tw])('includes every supported reason and sort/coverage state', catalog => {
    for (const key of ['label', 'newest', 'duration_desc'] as const)
      expect(catalog.exploreTrace.sort[key].trim()).not.toBe('');
    for (const key of ['window', 'bounded', 'truncated', 'boundedUnknown', 'unknown'] as const)
      expect(catalog.exploreTrace.coverage[key].trim()).not.toBe('');
    for (const key of [
      'no_data',
      'not_found',
      'not_correlated',
      'storage_unavailable',
      'malformed_data',
      'limit_exceeded',
      'identity_unavailable',
      'upstream_unavailable',
      'query_strategy_unavailable'
    ] as const)
      expect(catalog.exploreInvestigation.reasons[key].trim()).not.toBe('');
  });
});
