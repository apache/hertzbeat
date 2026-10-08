/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it, vi } from 'vitest';
import { init } from 'echarts';

import { getHertzBeatVisualTokens } from '@/shared/theme/hertzbeat-theme';

import { createHertzBeatPersesTheme } from './hertzbeat-perses-theme';
import { createHertzBeatChartsTheme } from './hertzbeat-perses-charts-theme';

describe('HertzBeat Perses theme', () => {
  it.each([350, 636, 1017])('keeps compact histogram labels inside the real %ipx chart canvas', width => {
    const theme = createHertzBeatPersesTheme('default');
    const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const chart = init(null, createHertzBeatChartsTheme(theme, true).echartsTheme, {
      renderer: 'svg',
      ssr: true,
      width,
      height: 84
    });
    const start = Date.parse('2026-09-05T01:35:00Z');
    try {
      // Official TimeSeriesChartPanel uses these gutters when yAxis.show is true.
      chart.setOption({
        animation: false,
        grid: { left: 20, right: 20, bottom: 0, containLabel: true },
        xAxis: {
          type: 'time',
          min: start,
          max: start + 1_800_000,
          axisLabel: { hideOverlap: true, formatter: (value: number) => new Date(value).toISOString().slice(11, 16) }
        },
        yAxis: { type: 'value', show: true, min: 0, axisLabel: { formatter: '{value}' } },
        series: [{ type: 'bar', data: Array.from({ length: 31 }, (_, i) => [start + i * 60_000, i % 3]) }]
      });
      chart.renderToSVGString();
      const labels = chart
        .getZr()
        .storage.getDisplayList()
        .filter(item => item.type === 'tspan');
      expect(labels.length).toBeGreaterThan(1);
      for (const label of labels) {
        expect(label.style.text).toMatch(/^\d{2}:\d{2}$/);
        const bounds = label.getBoundingRect().clone();
        if (label.transform) bounds.applyTransform(label.transform);
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      }
    } finally {
      chart.dispose();
      canvas.mockRestore();
    }
    expect(createHertzBeatChartsTheme(theme).echartsTheme).not.toMatchObject({
      valueAxis: { axisLabel: { show: false } }
    });
  });

  it('keeps the exact-window final time tick inside the 1230 workspace chart canvas', () => {
    const theme = createHertzBeatPersesTheme('default');
    const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(createHertzBeatChartsTheme(theme, true, false, 12).echartsTheme.timeAxis).toMatchObject({
      axisLabel: { alignMinLabel: 'left', alignMaxLabel: 'right' }
    });
    const width = 915;
    const start = 1790144936075;
    const end = 1790146736075;
    const chart = init(null, createHertzBeatChartsTheme(theme, true, false, 12).echartsTheme, {
      renderer: 'svg',
      ssr: true,
      width,
      height: 104
    });
    try {
      chart.setOption({
        animation: false,
        grid: { left: 20, right: 20, bottom: 0, containLabel: true },
        xAxis: {
          type: 'time',
          min: start,
          max: end,
          axisLabel: { hideOverlap: true, formatter: (value: number) => new Date(value).toISOString().slice(11, 16) }
        },
        yAxis: { type: 'value', show: true, min: 0, max: 12, axisLabel: { formatter: '{value}' } },
        series: [
          {
            type: 'bar',
            data: [
              [start + 1_000_000, 12],
              [end - 240_000, 3]
            ]
          }
        ]
      });
      chart.renderToSVGString();
      const labels = chart
        .getZr()
        .storage.getDisplayList()
        .filter(item => item.type === 'tspan' && /^\d{2}:\d{2}$/.test(String(item.style.text)));
      expect(labels.length).toBeGreaterThan(2);
      for (const label of labels) {
        const bounds = label.getBoundingRect().clone();
        if (label.transform) bounds.applyTransform(label.transform);
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      }
    } finally {
      chart.dispose();
      canvas.mockRestore();
    }
  });

  it.each(['default', 'dark'] as const)(
    'renders the %s native log list on the host content surface without elevation',
    themeName => {
      const theme = createHertzBeatPersesTheme(themeName, true);
      expect(theme.palette.background.default).toBe(theme.palette.background.paper);
      expect(theme.shadows[1]).toBe('none');
    }
  );
  it.each([12, 56])('renders native zero and actual %i peak labels for a compact count axis', peak => {
    const theme = createHertzBeatPersesTheme('default');
    const chart = init(null, createHertzBeatChartsTheme(theme, true, false, peak).echartsTheme, {
      renderer: 'svg',
      ssr: true,
      width: 636,
      height: 104
    });
    try {
      chart.setOption({
        animation: false,
        grid: { left: 20, right: 20, bottom: 0, containLabel: true },
        xAxis: { type: 'time', min: 1000, max: 2000 },
        // Perses supplies its own formatter after the theme is applied.
        yAxis: { type: 'value', show: true, min: 0, max: peak, axisLabel: { formatter: '{value}' } },
        series: [
          {
            type: 'bar',
            data: [
              [1000, peak],
              [1500, 3]
            ]
          }
        ]
      });
      chart.renderToSVGString();
      const labels = chart
        .getZr()
        .storage.getDisplayList()
        .filter(item => item.type === 'tspan')
        .map(item => {
          const label: unknown = item.style.text;
          return typeof label === 'string' ? label : '';
        });
      expect(labels).toContain('0');
      expect(labels).toContain(String(peak));
      expect(labels).not.toContain('50');
      expect(labels).not.toContain('2');
      expect(labels).not.toContain('4');
      expect(labels).not.toContain('6');
      expect(labels).not.toContain('8');
    } finally {
      chart.dispose();
    }
  });
  it.each(['default', 'dark', 'compact'] as const)(
    'maps the %s HertzBeat visual tokens into the Perses MUI runtime',
    runtimeTheme => {
      const tokens = getHertzBeatVisualTokens(runtimeTheme);
      const theme = createHertzBeatPersesTheme(runtimeTheme);

      expect(theme.palette.mode).toBe(tokens.mode);
      expect(theme.palette).toMatchObject({
        primary: { main: tokens.color.brandAccent },
        background: { default: tokens.color.canvas, paper: tokens.color.raised },
        divider: tokens.color.border,
        text: { primary: tokens.color.text, secondary: tokens.color.textSecondary },
        action: { hover: tokens.color.hover, selected: tokens.color.selected }
      });
      expect(theme.typography).toMatchObject({
        fontFamily: tokens.font.sans,
        fontSize: tokens.font.baseSize,
        h4: { fontSize: '14px', fontWeight: 600 },
        body2: { fontSize: '12px' },
        button: { fontSize: '13px', fontWeight: 600, textTransform: 'none' }
      });
      expect(theme.shape.borderRadius).toBe(tokens.radius.control);
      expect(theme.spacing(1)).toBe('4px');
    }
  );

  it('sizes native table headers and responsive single-line controls without constraining multiline fields', () => {
    const components = createHertzBeatPersesTheme('dark').components;
    expect(components?.MuiDataGrid).toMatchObject({ defaultProps: { columnHeaderHeight: 36 } });
    expect(components?.MuiIconButton?.styleOverrides?.root).toMatchObject({
      '@media (max-width: 700px)': { width: 36, height: 36 }
    });
    expect(components?.MuiOutlinedInput?.styleOverrides?.input).toMatchObject({
      '&:not(.MuiInputBase-inputMultiline)': {
        boxSizing: 'border-box',
        height: 32,
        paddingBlock: 6,
        '@media (max-width: 700px)': { height: 36, paddingBlock: 8 }
      }
    });
  });

  it('owns dense controls, table rhythm, focus, and flat embedded panel surfaces through MUI overrides', () => {
    const components = createHertzBeatPersesTheme('dark').components;
    expect(components?.MuiButton).toMatchObject({
      defaultProps: { disableElevation: true, size: 'small' },
      styleOverrides: { root: { minHeight: 32, borderRadius: 5, boxShadow: 'none' } }
    });
    expect(components?.MuiIconButton).toMatchObject({
      defaultProps: { size: 'small' },
      styleOverrides: { root: { width: 32, height: 32, borderRadius: 5 } }
    });
    expect(components?.MuiOutlinedInput).toMatchObject({
      defaultProps: { size: 'small' },
      styleOverrides: { root: { minHeight: 32, borderRadius: 5 } }
    });
    expect(components?.MuiTableCell).toMatchObject({
      styleOverrides: {
        root: { borderColor: '#282d38', fontSize: '12px' },
        head: { height: 36, backgroundColor: '#101218', fontWeight: 600 }
      }
    });
    expect(components?.MuiCard).toMatchObject({
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: 0, borderRadius: 0, backgroundColor: 'transparent', backgroundImage: 'none', boxShadow: 'none' }
      }
    });
    expect(components?.MuiCardContent).toMatchObject({ styleOverrides: { root: { padding: 0 } } });
    expect(components?.MuiButtonBase?.styleOverrides?.root).toEqual(
      expect.objectContaining({ '&.Mui-focusVisible': expect.objectContaining({ outline: '2px solid #bd7bd0' }) })
    );
  });
});
