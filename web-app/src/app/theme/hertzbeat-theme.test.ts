/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { theme } from 'antd';
import { describe, expect, it } from 'vitest';

import globalStyles from '../styles.css?raw';
import { createHertzBeatTheme } from './hertzbeat-theme';

describe('HertzBeat semantic theme', () => {
  it('maps the dense purple operator tokens into Ant Design', () => {
    const theme = createHertzBeatTheme('dark');

    expect(theme.token).toMatchObject({
      colorPrimary: '#9b5bb3',
      colorBgElevated: '#14171e',
      borderRadius: 2,
      controlHeight: 28,
      fontSize: 13
    });
    expect(theme.components?.Menu).toMatchObject({
      itemBorderRadius: 2,
      itemHeight: 32,
      itemSelectedBg: '#211a26'
    });
    expect(theme.components?.Layout).toMatchObject({
      bodyBg: '#0d0f14',
      headerBg: '#101218',
      siderBg: '#101218'
    });
  });

  it('keeps overlay surfaces in the same neutral hierarchy as the application shell', () => {
    expect(createHertzBeatTheme('dark').token).toMatchObject({ colorBgElevated: '#14171e' });
    expect(createHertzBeatTheme('compact').token).toMatchObject({ colorBgElevated: '#14171e' });
    expect(createHertzBeatTheme('default').token).toMatchObject({ colorBgElevated: '#ffffff' });
  });

  it('defines selected surfaces independently from transient hover state', () => {
    expect(globalStyles).toMatch(/:root\s*\{[^}]*--hb-bg-selected:\s*#211a26;/s);
    expect(globalStyles).toMatch(/:root\[data-theme='default'\]\s*\{[^}]*--hb-bg-selected:\s*#f7f0f8;/s);
    expect(globalStyles.match(/--hb-nav-selected:\s*var\(--hb-bg-selected\);/g)).toHaveLength(1);
  });

  it.each(['dark', 'default', 'compact'] as const)('enables the Ant variable contract for the %s theme', runtimeTheme => {
    const themeConfig = createHertzBeatTheme(runtimeTheme);
    const tokens = theme.getDesignToken(themeConfig);

    expect(themeConfig.cssVar).toBe(true);
    expect(tokens).toMatchObject({
      borderRadius: expect.any(Number),
      colorBorderSecondary: expect.any(String),
      colorError: expect.any(String),
      colorFillQuaternary: expect.any(String),
      colorTextSecondary: expect.any(String)
    });
  });
});
