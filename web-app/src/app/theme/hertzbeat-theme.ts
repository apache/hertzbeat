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
      colorPrimaryActive: '#7f448f',
      colorPrimaryHover: '#a96abd',
      colorText: palette.text,
      colorTextSecondary: palette.muted,
      controlHeight: 32,
      fontSize: 13,
      fontSizeHeading2: 24,
      fontSizeHeading4: 14,
      lineHeightHeading2: 1.25
    },
    components: {
      Button: {
        borderRadius: 5,
        controlHeight: 32,
        defaultActiveBorderColor: palette.activeBorder,
        defaultActiveColor: palette.text,
        defaultHoverBg: palette.hover,
        defaultHoverBorderColor: palette.hoverBorder,
        defaultHoverColor: palette.text,
        defaultShadow: 'none',
        fontWeight: 600,
        paddingInline: 12,
        primaryShadow: 'none'
      },
      Form: {
        itemMarginBottom: 18,
        labelColor: palette.textSecondary,
        labelFontSize: 12
      },
      Input: {
        activeBorderColor: palette.activeBorder,
        activeShadow: '0 0 0 2px rgba(155, 91, 179, 0.16)',
        hoverBorderColor: palette.hoverBorder,
        paddingInline: 10
      },
      Layout: {
        bodyBg: palette.canvas,
        headerBg: palette.chrome,
        siderBg: palette.chrome
      },
      Menu: {
        itemBorderRadius: 4,
        itemHeight: 32,
        itemSelectedBg: palette.selected,
        itemSelectedColor: palette.selectedText
      },
      Pagination: {
        itemActiveBg: palette.raised,
        itemBg: 'transparent',
        itemSize: 28
      },
      Select: {
        activeBorderColor: palette.activeBorder,
        activeOutlineColor: 'rgba(155, 91, 179, 0.16)',
        hoverBorderColor: palette.hoverBorder,
        optionActiveBg: palette.hover,
        optionHeight: 32,
        optionSelectedBg: palette.selected,
        optionSelectedColor: palette.selectedText,
        optionSelectedFontWeight: 600
      },
      Table: {
        borderColor: palette.border,
        cellPaddingBlock: 8,
        cellPaddingInline: 10,
        headerBg: palette.chrome,
        headerColor: palette.muted,
        headerSplitColor: palette.border,
        rowSelectedBg: palette.selected,
        rowSelectedHoverBg: palette.hover,
        rowHoverBg: palette.hover
      },
      Tabs: {
        horizontalItemGutter: 24,
        inkBarColor: '#9b5bb3',
        itemActiveColor: palette.text,
        itemHoverColor: palette.text,
        itemSelectedColor: palette.text
      }
    }
  };
}

const darkPalette = {
  activeBorder: '#a96abd',
  border: '#282d38',
  canvas: '#0d0f14',
  chrome: '#101218',
  muted: '#929aaa',
  hover: '#181b22',
  raised: '#14171e',
  selected: '#211a26',
  selectedText: '#f4edf6',
  text: '#eceef3',
  textSecondary: '#b8bec9',
  hoverBorder: '#7a8190'
};

const lightPalette = {
  activeBorder: '#7f448f',
  border: '#dfe3e8',
  canvas: '#f5f6f8',
  chrome: '#ffffff',
  muted: '#697180',
  hover: '#f1f2f5',
  raised: '#ffffff',
  selected: '#f7f0f8',
  selectedText: '#71357f',
  text: '#20242c',
  textSecondary: '#4d5563',
  hoverBorder: '#89919e'
};

function themeAlgorithm(runtimeTheme: RuntimeTheme) {
  if (runtimeTheme === 'default') return theme.defaultAlgorithm;
  if (runtimeTheme === 'compact') return [theme.darkAlgorithm, theme.compactAlgorithm];
  return theme.darkAlgorithm;
}
