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

describe('Dashboard locale contract', () => {
  it('keeps independent monitor and alert states aligned across all five locales', () => {
    const expected = flatten(en.dashboard);
    for (const locale of [ja, pt, zhCn, zhTw]) {
      expect(flatten(locale.dashboard)).toEqual(expected);
    }
    expect(expected).toContain('monitorStates.unavailable');
    expect(expected).toContain('alertStates.error');
    expect(expected).toContain('recentAlerts.states.contract');
    expect(expected).toContain('runtimeStates.permission');
    expect(expected).toContain('unresolvedAlerts');
  });

  it('localizes the Start navigation and telemetry terminology in every locale', () => {
    expect(en.menu.dashboard).toBe('Start');
    expect(en.instrumentation.menu).toBe('Telemetry setup');
    for (const locale of [ja, pt, zhCn, zhTw]) {
      expect(locale.menu.dashboard).not.toBe(locale.dashboard.title);
      expect(locale.menu.dashboard.trim()).not.toBe('');
      expect(locale.instrumentation.menu.trim()).not.toBe('');
    }
  });

  it('keeps the compact Collector node label stable across locales', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw]) {
      expect(locale.dashboard.start.telemetry.sources.collector).toBe('OTel Collector');
    }
  });

  it('uses operational labels instead of promotional onboarding copy', () => {
    expect(en.dashboard.start).toMatchObject({
      title: 'Choose a data collection method',
      active: { title: 'Active monitoring', outcomeTitle: 'Collected data' },
      telemetry: { title: 'Telemetry ingestion', outcomeTitle: 'Telemetry signals' }
    });
    for (const locale of [ja, pt, zhCn, zhTw]) {
      expect(locale.dashboard.start.title).not.toMatch(/[?？]$/);
      expect(locale.dashboard.start.active.outcomeTitle.trim()).not.toBe('');
      expect(locale.dashboard.start.telemetry.outcomeTitle.trim()).not.toBe('');
    }
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
