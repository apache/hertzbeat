/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { describe, expect, it } from 'vitest';

import en from '@/assets/i18n/en-us.json';
import ja from '@/assets/i18n/ja-jp.json';
import pt from '@/assets/i18n/pt-br.json';
import zhCn from '@/assets/i18n/zh-cn.json';
import zhTw from '@/assets/i18n/zh-tw.json';

const submissionErrorKeys = ['unsupportedAggregation', 'invalidStep', 'invalidDuration', 'minExceedsMax'] as const;

const runtimeLocales = [en, ja, pt, zhCn, zhTw] as LocaleRoot[];

describe('Explore submission locale contract', () => {
  it('keeps every field validation message available in all runtime locales', () => {
    for (const locale of runtimeLocales) {
      for (const key of submissionErrorKeys) {
        expect(locale.explore.submissionErrors[key]).toEqual(expect.any(String));
      }
    }
  });

  it('describes the metric step in the integer-seconds format accepted by submission', () => {
    for (const locale of runtimeLocales) {
      expect(locale.exploreMetric.step).not.toContain('60s');
      expect(locale.exploreMetric.step).toMatch(/60$/);
    }
    expect(en.exploreMetric.step).toBe('Step in seconds, for example 60');
    expect(pt.exploreMetric.step).toBe('Passo em segundos, por exemplo 60');
  });
});

type LocaleRoot = {
  explore: { submissionErrors: Record<(typeof submissionErrorKeys)[number], string> };
  exploreMetric: { step: string };
};
