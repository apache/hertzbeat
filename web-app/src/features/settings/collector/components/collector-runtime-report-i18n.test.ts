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

describe('Collector runtime source locale contract', () => {
  it('describes configuration lifecycle without claiming receiver health', () => {
    expect(en.collectors.runtime.report.sourceState).toEqual({
      DESIRED: 'Pending application',
      ACTIVE: 'Applied',
      REJECTED: 'Rejected'
    });
    expect(en.collectors.runtime.report.sourceStateNote).toBe(
      'Applied means the source revision is active; it does not prove telemetry was received.'
    );
  });

  it('keeps the lifecycle labels and explanatory note present in every locale', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw]) {
      expect(Object.keys(locale.collectors.runtime.report.sourceState).sort()).toEqual([
        'ACTIVE',
        'DESIRED',
        'REJECTED'
      ]);
      expect(Object.values(locale.collectors.runtime.report.sourceState).every(value => value.trim().length > 0)).toBe(
        true
      );
      expect(locale.collectors.runtime.report.sourceStateNote.trim()).not.toBe('');
    }
  });
});
