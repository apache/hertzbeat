/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { theme, type ThemeConfig } from 'antd';

import type { RuntimeTheme } from '@/core/runtime-preferences';

export function createHertzBeatTheme(runtimeTheme: RuntimeTheme): ThemeConfig {
  const visual = getHertzBeatVisualTokens(runtimeTheme);
  return {
    algorithm: themeAlgorithm(runtimeTheme),
    cssVar: true,
    token: themeTokens(visual),
    components: themeComponents(visual)
  };
}

export type HertzBeatVisualTokens = {
  mode: 'light' | 'dark';
  color: typeof darkPalette;
  font: {
    sans: string;
    mono: string;
    baseSize: number;
    sectionTitleSize: number;
    supportingSize: number;
  };
  radius: { control: number; surface: number };
  size: { controlHeight: number; regionHeaderHeight: number };
  spacing: number;
};

const sansFontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const monoFontFamily = '"DejaVu Sans Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace';

export function getHertzBeatVisualTokens(runtimeTheme: RuntimeTheme): HertzBeatVisualTokens {
  return {
    mode: runtimeTheme === 'default' ? 'light' : 'dark',
    color: runtimeTheme === 'default' ? lightPalette : darkPalette,
    font: { sans: sansFontFamily, mono: monoFontFamily, baseSize: 13, sectionTitleSize: 14, supportingSize: 12 },
    radius: { control: 5, surface: 6 },
    size: { controlHeight: 32, regionHeaderHeight: 36 },
    spacing: 4
  };
}

function themeTokens(visual: HertzBeatVisualTokens): NonNullable<ThemeConfig['token']> {
  const palette = visual.color;
  return {
    // Dense controls and surfaces stay within the workbench's four-to-six
    // pixel radius vocabulary instead of reading as detached pills.
    borderRadius: visual.radius.control,
    borderRadiusLG: visual.radius.surface,
    colorBgBase: palette.canvas,
    colorBgContainer: palette.chrome,
    colorBgElevated: palette.raised,
    colorBorder: palette.border,
    colorBorderSecondary: palette.border,
    colorError: palette.error,
    colorErrorText: palette.errorText,
    colorErrorTextActive: palette.errorTextActive,
    colorErrorTextHover: palette.errorTextHover,
    colorLink: palette.link,
    colorLinkActive: palette.linkActive,
    colorLinkHover: palette.linkHover,
    colorPrimary: palette.brandAccent,
    colorPrimaryActive: palette.brandAccentActive,
    colorPrimaryHover: palette.brandAccentHover,
    colorText: palette.text,
    colorTextSecondary: palette.muted,
    controlHeight: visual.size.controlHeight,
    fontFamily: visual.font.sans,
    fontSize: visual.font.baseSize,
    fontSizeHeading2: 24,
    fontSizeHeading4: 14,
    lineHeightHeading2: 1.25
  };
}

function themeComponents(visual: HertzBeatVisualTokens): NonNullable<ThemeConfig['components']> {
  return { ...controlComponents(visual), ...surfaceComponents(visual) };
}

function controlComponents(visual: HertzBeatVisualTokens): NonNullable<ThemeConfig['components']> {
  const palette = visual.color;
  return {
    Button: {
      borderRadius: visual.radius.control,
      colorError: palette.errorText,
      colorErrorActive: palette.errorTextActive,
      colorErrorHover: palette.errorTextHover,
      controlHeight: visual.size.controlHeight,
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
    Select: {
      activeBorderColor: palette.activeBorder,
      activeOutlineColor: 'rgba(155, 91, 179, 0.16)',
      hoverBorderColor: palette.hoverBorder,
      optionActiveBg: palette.hover,
      optionHeight: 32,
      optionSelectedBg: palette.selected,
      optionSelectedColor: palette.selectedText,
      optionSelectedFontWeight: 600
    }
  };
}

function surfaceComponents(visual: HertzBeatVisualTokens): NonNullable<ThemeConfig['components']> {
  const palette = visual.color;
  return {
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
  };
}

const darkPalette = {
  activeBorder: '#a96abd',
  brandAccent: '#9b5bb3',
  brandAccentActive: '#7f448f',
  brandAccentHover: '#a96abd',
  border: '#282d38',
  canvas: '#0d0f14',
  chrome: '#101218',
  error: '#e15b5d',
  errorText: '#e15b5d',
  errorTextActive: '#e15b5d',
  errorTextHover: '#e46a6b',
  muted: '#929aaa',
  hover: '#181b22',
  link: '#b97bca',
  linkActive: '#b97bca',
  linkHover: '#c18ad0',
  raised: '#14171e',
  selected: '#211a26',
  selectedText: '#f4edf6',
  text: '#eceef3',
  textSecondary: '#b8bec9',
  hoverBorder: '#7a8190',
  focusRing: '#bd7bd0',
  disabled: '#626a78',
  success: '#49aa19',
  warning: '#d89614'
};

const lightPalette = {
  activeBorder: '#7f448f',
  brandAccent: '#9b5bb3',
  brandAccentActive: '#7f448f',
  brandAccentHover: '#a96abd',
  border: '#dfe3e8',
  canvas: '#f5f6f8',
  chrome: '#ffffff',
  error: '#b42318',
  errorText: '#b42318',
  errorTextActive: '#8f1c13',
  errorTextHover: '#9f2117',
  muted: '#697180',
  hover: '#f1f2f5',
  link: '#71357f',
  linkActive: '#512459',
  linkHover: '#63306f',
  raised: '#ffffff',
  selected: '#f7f0f8',
  selectedText: '#71357f',
  text: '#20242c',
  textSecondary: '#4d5563',
  hoverBorder: '#89919e',
  focusRing: '#71357f',
  disabled: '#9ca3af',
  success: '#389e0d',
  warning: '#d48806'
};

function themeAlgorithm(runtimeTheme: RuntimeTheme) {
  if (runtimeTheme === 'default') return theme.defaultAlgorithm;
  if (runtimeTheme === 'compact') return [theme.darkAlgorithm, theme.compactAlgorithm];
  return theme.darkAlgorithm;
}
