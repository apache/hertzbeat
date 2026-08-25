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

describe('Alert Center locale coverage', () => {
  it('provides the progressive filter disclosure copy in every runtime locale', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw]) {
      expect(locale.alert.filters.more).toBeTruthy();
      expect(locale.alert.filters.less).toBeTruthy();
      expect(locale.alert.filters.moreActive).toContain('{{count}}');
    }
  });

  it('provides the restored delete workflow copy in every runtime locale', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw]) {
      expect(locale.alert.delete).toBeTruthy();
      expect(locale.alert.confirmDelete).toBeTruthy();
      expect(locale.alert.deleteConfirm).toContain('{{target}}');
      expect(locale.alert.deleteSuccess).toBeTruthy();
      expect(locale.alert.deleteFailed).toBeTruthy();
    }
  });

  it('provides localized current-page selection names in every runtime locale', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw]) {
      expect(locale.common.tableSelection.selectAll).toBeTruthy();
      expect(locale.common.tableSelection.clearAll).toBeTruthy();
      expect(locale.alert.diagnosticActions).toBeTruthy();
    }
  });

  it('uses operator-facing workspace and handled summary terminology in every runtime locale', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw]) {
      expect(Object.hasOwn(locale.alert.summary, 'workspaceScope')).toBe(true);
      expect(Object.hasOwn(locale.alert.summary, 'handled')).toBe(true);
      expect(Object.hasOwn(locale.alert.summary, 'scope')).toBe(false);
      expect(Object.hasOwn(locale.alert.summary, 'nonFiring')).toBe(false);
    }
  });

  it('provides every child-alert evidence label in every runtime locale', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw]) {
      expect(locale.alert.openMonitor).toBeTruthy();
      expect(locale.alert.openEntity).toBeTruthy();
      expect(locale.alert.details.triggerTimes).toBeTruthy();
      expect(locale.alert.details.labels).toBeTruthy();
      expect(locale.alert.details.annotations).toBeTruthy();
      expect(locale.alert.details.startAt).toBeTruthy();
      expect(locale.alert.details.activeAt).toBeTruthy();
      expect(locale.alert.details.endAt).toBeTruthy();
    }
  });
});
