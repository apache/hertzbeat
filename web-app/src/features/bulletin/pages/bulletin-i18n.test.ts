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

describe('Bulletin locale coverage', () => {
  it('provides selected-delete copy in every runtime locale', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw]) {
      expect(locale.bulletin.deleteSelected).toBeTruthy();
      expect(locale.bulletin.deleteSelectedConfirm).toContain('{{count}}');
      expect(locale.bulletin.deleteSelectedSuccess).toBeTruthy();
    }
  });
});
