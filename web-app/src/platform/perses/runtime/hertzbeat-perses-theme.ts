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

import { createTheme, type Theme, type ThemeOptions } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';
import { getTheme } from '@perses-dev/components';

import type { RuntimeTheme } from '@/core/runtime-preferences';
import { getHertzBeatVisualTokens, type HertzBeatVisualTokens } from '@/shared/theme/hertzbeat-theme';

export function createHertzBeatPersesTheme(runtimeTheme: RuntimeTheme, contentSurface = false): Theme {
  const visual = getHertzBeatVisualTokens(runtimeTheme);
  const baseTheme = getTheme(visual.mode, {}, true);
  const shadows = [...baseTheme.shadows] as Theme['shadows'];
  if (contentSurface) shadows[1] = 'none';
  const palette = persesPalette(baseTheme, visual);
  if (contentSurface) palette.background = { default: visual.color.raised, paper: visual.color.raised };
  return createTheme({
    ...baseTheme,
    spacing: visual.spacing,
    shape: { borderRadius: visual.radius.control },
    palette,
    shadows,
    typography: persesTypography(baseTheme, visual),
    components: persesComponents(baseTheme, visual)
  });
}

function persesPalette(baseTheme: Theme, visual: HertzBeatVisualTokens): NonNullable<ThemeOptions['palette']> {
  const color = visual.color;
  return {
    ...baseTheme.palette,
    mode: visual.mode,
    primary: {
      main: color.brandAccent,
      dark: color.brandAccentActive,
      light: color.brandAccentHover,
      contrastText: '#ffffff'
    },
    error: { main: color.error },
    success: { main: color.success },
    warning: { main: color.warning },
    background: { default: color.canvas, paper: color.raised },
    divider: color.border,
    text: { primary: color.text, secondary: color.textSecondary, disabled: color.disabled },
    action: {
      active: color.textSecondary,
      hover: color.hover,
      selected: color.selected,
      focus: color.selected,
      disabled: color.disabled,
      disabledBackground: color.hover
    }
  };
}

function persesTypography(baseTheme: Theme, visual: HertzBeatVisualTokens): NonNullable<ThemeOptions['typography']> {
  return {
    ...baseTheme.typography,
    fontFamily: visual.font.sans,
    fontSize: visual.font.baseSize,
    h1: { fontSize: '20px', fontWeight: 600, lineHeight: 1.25 },
    h2: { fontSize: '18px', fontWeight: 600, lineHeight: 1.3 },
    h3: { fontSize: '16px', fontWeight: 600, lineHeight: 1.35 },
    h4: { fontSize: '14px', fontWeight: 600, lineHeight: '20px' },
    body1: { fontSize: '13px', fontWeight: 400, lineHeight: '20px' },
    body2: { fontSize: '12px', fontWeight: 400, lineHeight: '18px' },
    subtitle1: { fontSize: '13px', fontWeight: 600, lineHeight: '20px' },
    subtitle2: { fontSize: '12px', fontWeight: 600, lineHeight: '18px', textTransform: 'none' },
    button: { fontSize: '13px', fontWeight: 600, lineHeight: '16px', letterSpacing: 0, textTransform: 'none' },
    caption: { fontSize: '12px', fontWeight: 400, lineHeight: '16px' }
  };
}

function persesComponents(baseTheme: Theme, visual: HertzBeatVisualTokens): NonNullable<ThemeOptions['components']> {
  return {
    ...baseTheme.components,
    ...persesControlComponents(visual),
    ...persesInputComponents(visual),
    ...persesDataSurfaceComponents(visual),
    ...persesOverlayComponents(visual)
  };
}

function persesControlComponents(visual: HertzBeatVisualTokens): NonNullable<ThemeOptions['components']> {
  const color = visual.color;
  return {
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': { outline: `2px solid ${color.focusRing}`, outlineOffset: 2 },
          transition: 'background-color 140ms ease, border-color 140ms ease, color 140ms ease'
        }
      }
    },
    MuiButton: {
      defaultProps: { disableElevation: true, size: 'small' },
      styleOverrides: {
        root: {
          minHeight: visual.size.controlHeight,
          padding: '0 12px',
          borderRadius: visual.radius.control,
          boxShadow: 'none',
          textTransform: 'none'
        }
      }
    },
    MuiIconButton: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          width: visual.size.controlHeight,
          height: visual.size.controlHeight,
          padding: 6,
          borderRadius: visual.radius.control,
          '@media (max-width: 700px)': { width: 36, height: 36 }
        }
      }
    }
  };
}

function persesInputComponents(visual: HertzBeatVisualTokens): NonNullable<ThemeOptions['components']> {
  const color = visual.color;
  return {
    MuiFormControl: { defaultProps: { margin: 'none', size: 'small' } },
    MuiTextField: { defaultProps: { margin: 'none', size: 'small' } },
    MuiInputBase: {
      styleOverrides: {
        root: { minHeight: visual.size.controlHeight, fontSize: visual.font.baseSize },
        input: { paddingBlock: 6, paddingInline: 10 }
      }
    },
    MuiOutlinedInput: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          minHeight: visual.size.controlHeight,
          borderRadius: visual.radius.control,
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: color.hoverBorder },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: color.activeBorder, borderWidth: 1 }
        },
        notchedOutline: { borderColor: color.border },
        input: {
          '&:not(.MuiInputBase-inputMultiline)': {
            boxSizing: 'border-box',
            height: visual.size.controlHeight,
            paddingBlock: 6,
            '@media (max-width: 700px)': { height: 36, paddingBlock: 8 }
          }
        }
      }
    },
    MuiFormLabel: {
      styleOverrides: { root: { color: color.textSecondary, fontSize: visual.font.supportingSize } }
    }
  };
}

function persesDataSurfaceComponents(visual: HertzBeatVisualTokens): NonNullable<ThemeOptions['components']> {
  const color = visual.color;
  return {
    MuiDataGrid: { defaultProps: { columnHeaderHeight: visual.size.regionHeaderHeight } },
    MuiTableContainer: {
      styleOverrides: { root: { maxWidth: '100%', overflowX: 'auto', borderRadius: 0, boxShadow: 'none' } }
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: color.border, padding: '8px 10px', fontSize: '12px' },
        head: {
          height: visual.size.regionHeaderHeight,
          paddingBlock: 0,
          backgroundColor: color.chrome,
          color: color.muted,
          fontWeight: 600
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&.MuiTableRow-hover:hover': { backgroundColor: color.hover },
          '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: color.selected }
        }
      }
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: 0,
          borderRadius: 0,
          backgroundColor: 'transparent',
          backgroundImage: 'none',
          boxShadow: 'none'
        }
      }
    },
    MuiCardContent: {
      styleOverrides: { root: { padding: 0, '&:last-child': { paddingBottom: 0 } } }
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { borderRadius: 0, backgroundColor: 'transparent', backgroundImage: 'none', boxShadow: 'none' }
      }
    }
  };
}

function persesOverlayComponents(visual: HertzBeatVisualTokens): NonNullable<ThemeOptions['components']> {
  const color = visual.color;
  const overlaySurface = {
    border: `1px solid ${color.border}`,
    borderRadius: visual.radius.control,
    backgroundColor: color.raised,
    backgroundImage: 'none',
    boxShadow: '0 12px 28px rgb(0 0 0 / 18%)'
  };
  return {
    MuiMenu: { styleOverrides: { paper: overlaySurface } },
    MuiPopover: { styleOverrides: { paper: overlaySurface } },
    MuiDialog: { styleOverrides: { paper: overlaySurface } },
    MuiDrawer: {
      styleOverrides: {
        paper: { ...overlaySurface, borderBlock: 0, borderRight: 0, borderRadius: 0 }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          border: `1px solid ${color.border}`,
          borderRadius: visual.radius.control,
          backgroundColor: color.raised,
          color: color.text,
          fontSize: '12px'
        }
      }
    }
  };
}
