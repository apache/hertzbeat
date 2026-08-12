/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { theme } from 'antd';
import { describe, expect, it } from 'vitest';

import { createHertzBeatTheme } from '@/shared/theme/hertzbeat-theme';

describe('HertzBeat semantic theme', () => {
  it('maps the dense purple operator tokens into Ant Design', () => {
    const theme = createHertzBeatTheme('dark');

    expect(theme.token).toMatchObject({
      colorPrimary: '#9b5bb3',
      colorBgElevated: '#14171e',
      borderRadius: 6,
      borderRadiusLG: 8,
      controlHeight: 32,
      fontSize: 13
    });
    expect(theme.components?.Menu).toMatchObject({
      itemBorderRadius: 4,
      itemHeight: 32,
      itemSelectedBg: '#211a26'
    });
    expect(theme.components?.Button).toMatchObject({
      borderRadius: 5,
      controlHeight: 32,
      defaultShadow: 'none',
      fontWeight: 600,
      primaryShadow: 'none'
    });
    expect(theme.components?.Input).toMatchObject({
      activeBorderColor: '#a96abd',
      activeShadow: '0 0 0 2px rgba(155, 91, 179, 0.16)',
      hoverBorderColor: '#7a8190'
    });
    expect(theme.components?.Select).toMatchObject({
      activeBorderColor: '#a96abd',
      activeOutlineColor: 'rgba(155, 91, 179, 0.16)',
      optionHeight: 32,
      optionSelectedBg: '#211a26'
    });
    expect(theme.components?.Tabs).toMatchObject({
      horizontalItemGutter: 24,
      inkBarColor: '#9b5bb3',
      itemSelectedColor: '#eceef3'
    });
    expect(theme.components?.Pagination).toMatchObject({ itemSize: 28 });
    expect(theme.components?.Layout).toMatchObject({
      bodyBg: '#0d0f14',
      headerBg: '#101218',
      siderBg: '#101218'
    });
  });

  it('keeps raised and selected surfaces in each runtime theme hierarchy', () => {
    expect(createHertzBeatTheme('dark')).toMatchObject({
      token: { colorBgElevated: '#14171e' },
      components: { Menu: { itemSelectedBg: '#211a26' } }
    });
    expect(createHertzBeatTheme('compact')).toMatchObject({
      token: { colorBgElevated: '#14171e' },
      components: { Menu: { itemSelectedBg: '#211a26' } }
    });
    expect(createHertzBeatTheme('default')).toMatchObject({
      token: { colorBgElevated: '#ffffff' },
      components: {
        Input: { hoverBorderColor: '#89919e' },
        Menu: { itemSelectedBg: '#f7f0f8' },
        Select: { optionSelectedBg: '#f7f0f8' }
      }
    });
  });

  it.each(['dark', 'default', 'compact'] as const)(
    'enables the Ant variable contract for the %s theme',
    runtimeTheme => {
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
    }
  );
});
