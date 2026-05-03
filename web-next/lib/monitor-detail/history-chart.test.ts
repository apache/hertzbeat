import { describe, expect, it } from 'vitest';
import {
  buildHistoryChartDownloadName,
  buildHistoryChartEChartsOption,
  buildHistoryChartPoints,
  buildHistoryChartPolyline,
  buildHistoryChartSeries,
  buildHistoryDataZoomTimeContext,
  findNearestHistoryChartPointIndex,
  buildHistoryChartSvgDataUrl,
  buildHistoryChartSvgDocument
} from './history-chart';

describe('monitor history chart helpers', () => {
  it('builds normalized chart points and polyline', () => {
    const points = buildHistoryChartPoints(
      [
        { origin: '10', time: 1 },
        { origin: '20', time: 2 },
        { origin: '15', time: 3 }
      ] as any,
      value => `t${value}`
    );

    expect(points).toEqual([
      { x: 0, y: 100, label: 't1', rawValue: '10' },
      { x: 50, y: 0, label: 't2', rawValue: '20' },
      { x: 100, y: 50, label: 't3', rawValue: '15' }
    ]);
    expect(buildHistoryChartPolyline(points)).toBe('0,100 50,0 100,50');
  });

  it('prefers mean values for aggregated history charts', () => {
    const points = buildHistoryChartPoints(
      [
        { origin: '10', mean: '15', time: 1 },
        { origin: '20', mean: '25', time: 2 }
      ] as any,
      value => `t${value}`,
      true
    );

    expect(points).toEqual([
      { x: 0, y: 100, label: 't1', rawValue: '15' },
      { x: 100, y: 0, label: 't2', rawValue: '25' }
    ]);
  });

  it('builds aggregated multi-series data for mean min and max', () => {
    const series = buildHistoryChartSeries(
      [
        { mean: '15', min: '10', max: '20', time: 1 },
        { mean: '25', min: '22', max: '29', time: 2 }
      ] as any,
      value => `t${value}`,
      true
    );

    expect(series.map(item => item.key)).toEqual(['mean', 'min', 'max']);
    expect(series[0].points.map(point => point.rawValue)).toEqual(['15', '25']);
    expect(series[0].points[0].label).toBe('t1');
    expect(series[0].points[1].label).toBe('t2');
    expect(series[0].points[0].y).toBeGreaterThan(series[0].points[1].y);
    expect(series[1].points[0].rawValue).toBe('10');
    expect(series[2].points[1].rawValue).toBe('29');
  });

  it('does not fabricate min/max series when aggregated samples only contain mean values', () => {
    const series = buildHistoryChartSeries(
      [
        { mean: '15', time: 1 },
        { mean: '25', time: 2 }
      ] as any,
      value => `t${value}`,
      true
    );

    expect(series.map(item => item.key)).toEqual(['mean']);
  });

  it('builds downloadable svg markup and data url', () => {
    const series = buildHistoryChartSeries(
      [
        { mean: '15', min: '10', max: '20', time: 1 },
        { mean: '25', min: '22', max: '29', time: 2 }
      ] as any,
      value => `t${value}`,
      true
    );

    const svg = buildHistoryChartSvgDocument(series, 1);
    const dataUrl = buildHistoryChartSvgDataUrl(svg);

    expect(svg).toContain('<svg');
    expect(svg).toContain('data-series="mean"');
    expect(svg).toContain('stroke="white"');
    expect(svg).toContain('Mean · t2 · 25');
    expect(dataUrl).toContain('data:image/svg+xml;charset=utf-8,');
    expect(buildHistoryChartDownloadName()).toBe('monitor-history-raw.svg');
    expect(buildHistoryChartDownloadName(true)).toBe('monitor-history-aggregated.svg');
  });

  it('builds an echarts option for the visible history series', () => {
    const option = buildHistoryChartEChartsOption({
      values: [
        { mean: '15', min: '10', max: '20', time: 1 },
        { mean: '25', min: '22', max: '29', time: 2 }
      ] as any,
      formatTime: value => `t${value}`,
      aggregated: true,
      selectedPointIndex: 1,
      visibleSeriesKeys: ['mean', 'max']
    });

    expect(option.xAxis).toMatchObject({ type: 'time' });
    expect(Array.isArray(option.series)).toBe(true);
    expect((option.series as any[]).map(item => item.name)).toEqual(['Mean', 'Max']);
    expect((option.series as any[])[0].data).toEqual([
      [1, 15],
      [2, 25]
    ]);
    expect((option.series as any[])[1].data).toEqual([
      [1, 20],
      [2, 29]
    ]);
    expect(option.tooltip).toMatchObject({
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    });
    expect((option.yAxis as any).splitLine.lineStyle).toMatchObject({
      type: 'dashed'
    });
    expect((option.series as any[])[0].areaStyle.opacity).toBeGreaterThan(0);
    expect((option.series as any[])[0].emphasis).toMatchObject({
      focus: 'series'
    });
    expect(Array.isArray(option.dataZoom)).toBe(true);
    expect((option.dataZoom as any[]).map(item => item.type)).toEqual(['slider', 'inside']);
    expect(option.toolbox).toMatchObject({ show: false });
  });

  it('allows legacy panels without an apply-to-query-time action to opt out of dataZoom', () => {
    const option = buildHistoryChartEChartsOption({
      values: [
        { time: 1000, origin: '10' },
        { time: 2000, origin: '12' }
      ] as any,
      formatTime: value => String(value),
      enableDataZoom: false
    }) as any;

    expect(option.dataZoom).toBeUndefined();
    expect(option.grid.bottom).toBe(46);
  });

  it('keeps dense history time axes readable with the shared timeseries spacing', () => {
    const start = new Date(2026, 4, 2, 20, 10, 0).getTime();
    const option = buildHistoryChartEChartsOption({
      values: Array.from({ length: 61 }, (_, index) => ({
        origin: String(120 + index),
        time: start + index * 60_000
      })) as any,
      formatTime: value => `full-${value}`,
      aggregated: false,
      visibleSeriesKeys: ['origin']
    });

    const xAxis = option.xAxis as any;
    const slider = (option.dataZoom as any[]).find(item => item.type === 'slider');
    const inside = (option.dataZoom as any[]).find(item => item.type === 'inside');

    expect((option.grid as any).bottom).toBeGreaterThanOrEqual(88);
    expect(xAxis.splitNumber).toBeLessThanOrEqual(5);
    expect(xAxis.axisLabel).toMatchObject({
      hideOverlap: true,
      showMinLabel: true,
      showMaxLabel: true
    });
    expect(xAxis.axisLabel.margin).toBeGreaterThanOrEqual(14);
    expect(xAxis.axisLabel.formatter(start)).toMatch(/^\d{2}:\d{2}$/);
    expect(slider.height).toBeGreaterThanOrEqual(28);
    expect(slider.bottom).toBeGreaterThanOrEqual(16);
    expect(slider).toMatchObject({
      type: 'slider',
      start: 0,
      end: 100
    });
    expect(slider.fillerColor).toBeUndefined();
    expect(slider.backgroundColor).toBeUndefined();
    expect(slider.handleStyle).toBeUndefined();
    expect(slider.selectedDataBackground).toBeUndefined();
    expect(inside).toMatchObject({
      type: 'inside',
      start: 0,
      end: 100,
      zoomOnMouseWheel: false,
      moveOnMouseMove: false,
      moveOnMouseWheel: false
    });
  });

  it('keeps missing history samples as null instead of fabricating zero values', () => {
    const option = buildHistoryChartEChartsOption({
      values: [
        { mean: '15', time: 1 },
        { mean: undefined, time: 2 },
        { mean: '25', time: 3 }
      ] as any,
      formatTime: value => `t${value}`,
      aggregated: true,
      visibleSeriesKeys: ['mean']
    });

    expect((option.series as any[])[0].data).toEqual([
      [1, 15],
      [2, null],
      [3, 25]
    ]);
  });

  it('keeps missing timestamps null instead of coercing them to synthetic coordinates', () => {
    const option = buildHistoryChartEChartsOption({
      values: [
        { mean: '15', time: undefined },
        { mean: '25', time: 2 }
      ] as any,
      formatTime: value => `t${value}`,
      aggregated: true,
      visibleSeriesKeys: ['mean']
    });

    expect((option.series as any[])[0].data).toEqual([
      [null, 15],
      [2, 25]
    ]);
  });

  it('resolves a local dataZoom percentage range into an explicit query time window', () => {
    const context = buildHistoryDataZoomTimeContext(
      [
        { origin: '10', time: 1_000 },
        { origin: '20', time: 2_000 },
        { origin: '30', time: 3_000 }
      ] as any,
      { start: 25, end: 75 },
      'last-1h'
    );

    expect(context).toEqual({
      timeRange: 'last-1h',
      start: '1500',
      end: '2500'
    });
  });

  it('prefers concrete dataZoom startValue and endValue when applying chart zoom to query time', () => {
    const context = buildHistoryDataZoomTimeContext(
      [
        { origin: '10', time: 1_000 },
        { origin: '20', time: 2_000 },
        { origin: '30', time: 3_000 }
      ] as any,
      { start: 0, end: 100, startValue: 1_200, endValue: 2_600 },
      'last-1h'
    );

    expect(context).toEqual({
      timeRange: 'last-1h',
      start: '1200',
      end: '2600'
    });
  });

  it('does not expose a query time update for an unchanged full-range dataZoom selection', () => {
    const context = buildHistoryDataZoomTimeContext(
      [
        { origin: '10', time: 1_000 },
        { origin: '20', time: 2_000 }
      ] as any,
      { start: 0, end: 100 },
      'last-1h'
    );

    expect(context).toBeNull();
  });

  it('finds the nearest history chart point by x coordinate', () => {
    const points = buildHistoryChartPoints(
      [
        { origin: '10', time: 1 },
        { origin: '20', time: 2 },
        { origin: '30', time: 3 }
      ] as any,
      value => `t${value}`
    );

    expect(findNearestHistoryChartPointIndex(points, 0)).toBe(0);
    expect(findNearestHistoryChartPointIndex(points, 12)).toBe(0);
    expect(findNearestHistoryChartPointIndex(points, 54)).toBe(1);
    expect(findNearestHistoryChartPointIndex(points, 100)).toBe(2);
    expect(findNearestHistoryChartPointIndex([], 50)).toBeNull();
  });
});
