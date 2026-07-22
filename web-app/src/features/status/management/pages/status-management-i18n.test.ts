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

describe('status management locale contract', () => {
  it('keeps the management catalog and navigation label aligned across runtime locales', () => {
    const expected = flatten(en.statusManagement);

    for (const locale of [ja, pt, zhCn, zhTw]) {
      expect(flatten(locale.statusManagement)).toEqual(expected);
      expect(locale.settingsNavigation.statusPage).toBeTruthy();
    }
    expect(en.settingsNavigation.statusPage).toBeTruthy();
    expect(expected).toContain('notConfigured');
    expect(expected).toContain('loadIncidentFailed');
  });
});

function flatten(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value)
    .flatMap(([key, item]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return item && typeof item === 'object' && !Array.isArray(item)
        ? flatten(item as Record<string, unknown>, path)
        : [path];
    })
    .sort();
}
