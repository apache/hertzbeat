/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { theme, type ThemeConfig } from 'antd';

import type { RuntimeTheme } from '@/core/runtime-preferences';

export function createHertzBeatTheme(runtimeTheme: RuntimeTheme): ThemeConfig {
  const palette = runtimeTheme === 'default' ? lightPalette : darkPalette;
  return {
    algorithm: themeAlgorithm(runtimeTheme),
    cssVar: true,
    token: {
      // SigNoz keeps dense controls restrained while Horizon gives larger
      // surfaces more separation. Six/eight pixels preserves both qualities
      // without turning an operations console into pill-shaped UI.
      borderRadius: 6,
      borderRadiusLG: 8,
      colorBgBase: palette.canvas,
      colorBgContainer: palette.chrome,
      colorBgElevated: palette.raised,
      colorBorder: palette.border,
      colorBorderSecondary: palette.border,
      colorPrimary: '#9b5bb3',
      colorText: palette.text,
      colorTextSecondary: palette.muted,
      controlHeight: 32,
      fontSize: 13
    },
    components: {
      Layout: {
        bodyBg: palette.canvas,
        headerBg: palette.chrome,
        siderBg: palette.chrome
      },
      Menu: {
        itemBorderRadius: 6,
        itemHeight: 32,
        itemSelectedBg: palette.selected,
        itemSelectedColor: palette.selectedText
      },
      Table: { cellPaddingBlock: 8, cellPaddingInline: 10 }
    }
  };
}

const darkPalette = {
  border: '#282d38',
  canvas: '#0d0f14',
  chrome: '#101218',
  muted: '#929aaa',
  raised: '#14171e',
  selected: '#211a26',
  selectedText: '#f4edf6',
  text: '#eceef3'
};

const lightPalette = {
  border: '#dfe3e8',
  canvas: '#f5f6f8',
  chrome: '#ffffff',
  muted: '#697180',
  raised: '#ffffff',
  selected: '#f7f0f8',
  selectedText: '#71357f',
  text: '#20242c'
};

function themeAlgorithm(runtimeTheme: RuntimeTheme) {
  if (runtimeTheme === 'default') return theme.defaultAlgorithm;
  if (runtimeTheme === 'compact') return [theme.darkAlgorithm, theme.compactAlgorithm];
  return theme.darkAlgorithm;
}
