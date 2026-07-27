/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import en from '@/assets/i18n/en-us.json';
import ja from '@/assets/i18n/ja-jp.json';
import pt from '@/assets/i18n/pt-br.json';
import zhCn from '@/assets/i18n/zh-cn.json';
import zhTw from '@/assets/i18n/zh-tw.json';

describe('Notice Rule locale coverage', () => {
  it('provides both read-only toggle states in every runtime locale', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw]) {
      expect(locale.noticeRules.enabled).toBeTruthy();
      expect(locale.noticeRules.disabled).toBeTruthy();
    }
  });
});
