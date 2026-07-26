/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import enUs from '@/assets/i18n/en-us.json';
import jaJp from '@/assets/i18n/ja-jp.json';
import ptBr from '@/assets/i18n/pt-br.json';
import zhCn from '@/assets/i18n/zh-cn.json';
import zhTw from '@/assets/i18n/zh-tw.json';

describe('Entity noise-control locales', () => {
  it('keeps evidence copy complete in every runtime locale', () => {
    for (const locale of [enUs, jaJp, ptBr, zhCn, zhTw]) {
      expect(locale.entity.noiseControls.title).toBeTruthy();
      expect(locale.entity.noiseControls.summary).toContain('{{silenceCount}}');
      expect(locale.entity.noiseControls.summary).toContain('{{inhibitCount}}');
      expect(locale.entity.noiseControls.types.silence).toBeTruthy();
      expect(locale.entity.noiseControls.types.inhibit).toBeTruthy();
    }
  });
});
