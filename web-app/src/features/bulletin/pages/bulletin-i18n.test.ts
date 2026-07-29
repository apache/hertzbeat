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

  it('provides local permission copy for every Bulletin read and write surface', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw]) {
      expect(locale.bulletin.list.permission).toBeTruthy();
      expect(locale.bulletin.dependencies.permission).toBeTruthy();
      expect(locale.bulletin.read.permission).toBeTruthy();
      expect(locale.bulletin.save.permission).toBeTruthy();
      expect(locale.bulletin.deleteError.permission).toBeTruthy();
      expect(locale.bulletin.metrics.permission).toBeTruthy();
    }
  });

  it('provides recovery stop and immutable outcome copy in every runtime locale', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw]) {
      expect(locale.bulletin.recovery.stop).toBeTruthy();
      expect(locale.bulletin.recovery.dismiss).toBeTruthy();
      expect(locale.bulletin.recovery.projectionStale).toBeTruthy();
      expect(locale.bulletin.recovery.create).toContain('{{name}}');
      expect(locale.bulletin.recovery.update).toContain('{{id}}');
      expect(locale.bulletin.recovery.update).toContain('{{name}}');
      expect(locale.bulletin.recovery.delete).toContain('{{ids}}');
      expect(locale.bulletin.recovery.deleteBatch).toContain('{{count}}');
      expect(locale.bulletin.recovery.deleteBatch).toContain('{{ids}}');
      expect(locale.bulletin.recovery.projection.save).toBeTruthy();
      expect(locale.bulletin.recovery.projection.delete).toBeTruthy();
    }
  });
});
