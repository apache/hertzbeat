import {
  buildObservabilitySeriesPalette,
  createAxisTokens,
  createDataZoomTokens,
  createEmptyChartShell,
  createObservabilityChartOption,
  createTooltipTokens,
  getObservabilityThemeTokens
} from './observability-theme';

describe('observability-theme', () => {
  it('should expose distinct dark and light token sets', () => {
    const dark = getObservabilityThemeTokens('dark-ops');
    const light = getObservabilityThemeTokens('light-ops');

    expect(dark.mode).toBe('dark-ops');
    expect(light.mode).toBe('light-ops');
    expect(dark.surface.canvas).not.toBe(light.surface.canvas);
    expect(dark.surface.textPrimary).not.toBe(light.surface.textPrimary);
    expect(dark.chart.gridLine).not.toBe(light.chart.gridLine);
  });

  it('should prefer restrained panel geometry and flat surfaces over spotlight chrome', () => {
    const dark = getObservabilityThemeTokens('dark-ops');
    const light = getObservabilityThemeTokens('light-ops');

    expect(dark.layout.panelRadius).toBeLessThanOrEqual(10);
    expect(light.layout.panelRadius).toBeLessThanOrEqual(10);
    expect(dark.layout.compactRadius).toBeLessThanOrEqual(6);
    expect(light.layout.compactRadius).toBeLessThanOrEqual(6);
    expect(dark.surface.spotlight).toBe(dark.surface.panel);
    expect(light.surface.spotlight).toBe(light.surface.panel);
  });

  it('should build a reusable series palette for observability workbenches', () => {
    const palette = buildObservabilitySeriesPalette('dark-ops');

    expect(palette.length).toBeGreaterThanOrEqual(6);
    expect(palette[0]).toContain('#');
  });

  it('should expose reusable chart primitives for axes, tooltips and data zoom', () => {
    const axis = createAxisTokens('light-ops');
    const tooltip = createTooltipTokens('dark-ops', 'axis');
    const dataZoom = createDataZoomTokens('dark-ops', true);
    const lightTheme = getObservabilityThemeTokens('light-ops');

    expect(axis.axisLabel?.color).toBe(lightTheme.chart.axisLabel);
    expect(tooltip.trigger).toBe('axis');
    expect(dataZoom.length).toBe(2);
    expect((dataZoom[1] as { type?: string }).type).toBe('slider');
  });

  it('should create a metrics-timeseries chart option with shared observability chrome', () => {
    const option = createObservabilityChartOption('dark-ops', 'metrics-timeseries', {
      kind: 'timeseries',
      legend: ['p95', 'p99'],
      series: [
        {
          name: 'p95',
          type: 'line',
          data: [
            [1_710_000_000_000, 12],
            [1_710_000_060_000, 18]
          ]
        }
      ]
    });

    expect(option.backgroundColor).toBe('transparent');
    expect(option.tooltip).toEqual(jasmine.objectContaining({ trigger: 'axis' }));
    expect(option.legend).toEqual(jasmine.objectContaining({ data: ['p95', 'p99'] }));
    expect((option.dataZoom as unknown[]).length).toBe(2);
    expect((option.series as unknown[]).length).toBe(1);
  });

  it('should create a monitor-mini-trend option without the large slider chrome', () => {
    const option = createObservabilityChartOption('dark-ops', 'monitor-mini-trend', {
      kind: 'timeseries',
      legend: ['cpu'],
      series: [
        {
          name: 'cpu',
          type: 'line',
          data: [
            [1_710_000_000_000, 41],
            [1_710_000_060_000, 55]
          ]
        }
      ]
    });

    expect((option.grid as { top?: number; bottom?: number }).top).toBeLessThan(60);
    expect((option.dataZoom as unknown[]).length).toBe(1);
    expect((option.legend as { bottom?: number }).bottom).toBe(0);
  });

  it('should create a readable empty chart shell for auth and empty states', () => {
    const shell = createEmptyChartShell('light-ops', {
      title: '暂无指标',
      description: '请选择一个 metric 后继续查询'
    });

    expect(shell.title).toEqual(
      jasmine.objectContaining({
        text: '暂无指标',
        subtext: '请选择一个 metric 后继续查询'
      })
    );
  });
});
