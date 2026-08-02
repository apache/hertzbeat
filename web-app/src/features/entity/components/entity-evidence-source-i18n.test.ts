/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import enUS from '@/assets/i18n/en-us.json';
import jaJP from '@/assets/i18n/ja-jp.json';
import ptBR from '@/assets/i18n/pt-br.json';
import zhCN from '@/assets/i18n/zh-cn.json';
import zhTW from '@/assets/i18n/zh-tw.json';

describe('entity evidence source locale contract', () => {
  it.each([enUS, jaJP, ptBR, zhCN, zhTW])('keeps the complete visible provenance vocabulary', locale => {
    expect(Object.keys(locale.entity.evidence.sources).sort()).toEqual([
      'empty',
      'latest',
      'logs',
      'metrics',
      'monitor',
      'notObserved',
      'otlp',
      'title',
      'traces',
      'unavailable'
    ]);
    expect(Object.values(locale.entity.evidence.sources).every(value => value.length > 0)).toBe(true);
  });
});
