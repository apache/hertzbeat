/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import en from '@/assets/i18n/explore/en-us.json';
import ja from '@/assets/i18n/explore/ja-jp.json';
import pt from '@/assets/i18n/explore/pt-br.json';
import zhCn from '@/assets/i18n/explore/zh-cn.json';
import zhTw from '@/assets/i18n/explore/zh-tw.json';

const stateKeys = [
  'unsupportedQuery',
  'storageUnavailable',
  'transportError',
  'contractError',
  'refreshing',
  'staleError'
] as const;

describe('Explore result state locale contract', () => {
  it('keeps every honest result state available in all runtime locales', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw] as LocaleRoot[]) {
      for (const key of stateKeys) expect(locale.explore.states[key]).toEqual(expect.any(String));
    }
  });
});

type LocaleRoot = { explore: { states: Record<(typeof stateKeys)[number], string> } };
