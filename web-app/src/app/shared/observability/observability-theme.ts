import {
  BarSeriesOption,
  DataZoomComponentOption,
  EChartsOption,
  GridComponentOption,
  LegendComponentOption,
  LineSeriesOption,
  PieSeriesOption,
  SeriesOption,
  TitleComponentOption,
  TooltipComponentOption,
  XAXisComponentOption,
  YAXisComponentOption
} from 'echarts';

export type ObservabilityThemeMode = 'dark-ops' | 'light-ops';

export interface ObservabilitySurfaceTokens {
  canvas: string;
  panel: string;
  raised: string;
  elevated: string;
  spotlight: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
}

interface ObservabilityChartPresetBase {
  legend?: string[];
  categories?: string[];
}

export interface ObservabilityTimeseriesPreset extends ObservabilityChartPresetBase {
  kind: 'timeseries';
  series: LineSeriesOption[];
}

export interface ObservabilityBarPreset extends ObservabilityChartPresetBase {
  kind: 'bar';
  series: BarSeriesOption[];
}

export interface ObservabilityDonutPreset extends ObservabilityChartPresetBase {
  kind: 'donut';
  series: PieSeriesOption[];
}

export type ObservabilityChartPreset =
  | ObservabilityTimeseriesPreset
  | ObservabilityBarPreset
  | ObservabilityDonutPreset;

export type ObservabilityChartPresetName =
  | 'metrics-timeseries'
  | 'logs-trend'
  | 'trace-latency-distribution'
  | 'trace-waterfall-surface'
  | 'monitor-mini-trend'
  | 'entity-evidence-mini-trend';

export interface ObservabilityWorkspaceLayout {
  gap: number;
  panelRadius: number;
  compactRadius: number;
}

export interface ObservabilityWorkbenchState {
  loading: boolean;
  loadFailed: boolean;
  emptyStateReason?: string | null;
}

interface ObservabilityThemeTokens {
  mode: ObservabilityThemeMode;
  surface: ObservabilitySurfaceTokens;
  chart: {
    axisLabel: string;
    axisLine: string;
    gridLine: string;
    tooltipBackground: string;
    tooltipBorder: string;
    tooltipText: string;
    shadow: string;
    areaOpacity: number;
    dataZoomFill: string;
    dataZoomHandle: string;
    legendInactive: string;
    pointerLine: string;
    emptyDescription: string;
  };
  seriesPalette: string[];
  layout: ObservabilityWorkspaceLayout;
  semantic: {
    primary: string;
    success: string;
    warning: string;
    critical: string;
  };
}

interface EmptyChartShellModel {
  title: string;
  description?: string;
}

interface ObservabilityPresetConfig {
  legendPosition: 'top' | 'bottom';
  legendOrient?: 'horizontal' | 'vertical';
  legendTop?: number;
  legendBottom?: number;
  grid: GridComponentOption;
  includeSlider: boolean;
  seriesMode: 'timeseries' | 'bar' | 'donut';
  tooltipTrigger: 'axis' | 'item';
}

const OBSERVABILITY_THEMES: Record<ObservabilityThemeMode, ObservabilityThemeTokens> = {
  'dark-ops': {
    mode: 'dark-ops',
    surface: {
      canvas: '#0d1014',
      panel: '#12161c',
      raised: '#161b22',
      elevated: '#1b212a',
      spotlight: '#12161c',
      border: 'rgba(121, 130, 145, 0.18)',
      borderStrong: 'rgba(138, 147, 163, 0.22)',
      textPrimary: '#e8edf5',
      textSecondary: '#a3acbc',
      textTertiary: '#747f92'
    },
    chart: {
      axisLabel: '#8992a4',
      axisLine: 'rgba(128, 138, 155, 0.14)',
      gridLine: 'rgba(128, 138, 155, 0.12)',
      tooltipBackground: 'rgba(17, 21, 28, 0.98)',
      tooltipBorder: 'rgba(129, 139, 155, 0.22)',
      tooltipText: '#e8edf5',
      shadow: '0 10px 24px rgba(2, 6, 12, 0.18)',
      areaOpacity: 0.08,
      dataZoomFill: 'rgba(109, 134, 197, 0.14)',
      dataZoomHandle: '#6d86c5',
      legendInactive: 'rgba(163, 172, 188, 0.48)',
      pointerLine: 'rgba(109, 134, 197, 0.24)',
      emptyDescription: '#8e97a9'
    },
    seriesPalette: ['#6d86c5', '#5f9b8f', '#b7925e', '#c36f66', '#8a7bb6', '#6f94b9', '#7f9d67', '#b27d93'],
    layout: {
      gap: 16,
      panelRadius: 10,
      compactRadius: 6
    },
    semantic: {
      primary: '#6d86c5',
      success: '#5f9b8f',
      warning: '#b7925e',
      critical: '#c36f66'
    }
  },
  'light-ops': {
    mode: 'light-ops',
    surface: {
      canvas: '#eef1f4',
      panel: '#ffffff',
      raised: '#f6f7f9',
      elevated: '#eef1f4',
      spotlight: '#ffffff',
      border: 'rgba(96, 107, 126, 0.18)',
      borderStrong: 'rgba(108, 118, 136, 0.22)',
      textPrimary: '#171c24',
      textSecondary: '#596375',
      textTertiary: '#778091'
    },
    chart: {
      axisLabel: '#6e788a',
      axisLine: 'rgba(121, 131, 146, 0.14)',
      gridLine: 'rgba(121, 131, 146, 0.15)',
      tooltipBackground: 'rgba(255, 255, 255, 0.98)',
      tooltipBorder: 'rgba(118, 127, 143, 0.2)',
      tooltipText: '#171c24',
      shadow: '0 12px 28px rgba(18, 24, 33, 0.08)',
      areaOpacity: 0.1,
      dataZoomFill: 'rgba(88, 116, 178, 0.12)',
      dataZoomHandle: '#5874b2',
      legendInactive: 'rgba(89, 99, 117, 0.48)',
      pointerLine: 'rgba(88, 116, 178, 0.2)',
      emptyDescription: '#778091'
    },
    seriesPalette: ['#5874b2', '#4d8a73', '#b07f3f', '#bf6458', '#8477ad', '#6688a9', '#7d9861', '#ae778e'],
    layout: {
      gap: 16,
      panelRadius: 10,
      compactRadius: 6
    },
    semantic: {
      primary: '#5874b2',
      success: '#4d8a73',
      warning: '#b07f3f',
      critical: '#bf6458'
    }
  }
};

const DEFAULT_PRESET_BY_KIND: Record<ObservabilityChartPreset['kind'], ObservabilityChartPresetName> = {
  timeseries: 'metrics-timeseries',
  bar: 'trace-latency-distribution',
  donut: 'trace-latency-distribution'
};

const PRESET_CONFIGS: Record<ObservabilityChartPresetName, ObservabilityPresetConfig> = {
  'metrics-timeseries': {
    legendPosition: 'top',
    legendTop: 0,
    grid: { left: 44, right: 24, top: 54, bottom: 54, containLabel: true },
    includeSlider: true,
    seriesMode: 'timeseries',
    tooltipTrigger: 'axis'
  },
  'logs-trend': {
    legendPosition: 'top',
    legendTop: 0,
    grid: { left: 40, right: 20, top: 50, bottom: 50, containLabel: true },
    includeSlider: true,
    seriesMode: 'timeseries',
    tooltipTrigger: 'axis'
  },
  'trace-latency-distribution': {
    legendPosition: 'top',
    legendTop: 0,
    grid: { left: 36, right: 20, top: 48, bottom: 36, containLabel: true },
    includeSlider: false,
    seriesMode: 'bar',
    tooltipTrigger: 'axis'
  },
  'trace-waterfall-surface': {
    legendPosition: 'top',
    legendTop: 0,
    grid: { left: 28, right: 18, top: 40, bottom: 24, containLabel: true },
    includeSlider: false,
    seriesMode: 'timeseries',
    tooltipTrigger: 'axis'
  },
  'monitor-mini-trend': {
    legendPosition: 'bottom',
    legendBottom: 0,
    grid: { left: 12, right: 16, top: 32, bottom: 26, containLabel: true },
    includeSlider: false,
    seriesMode: 'timeseries',
    tooltipTrigger: 'axis'
  },
  'entity-evidence-mini-trend': {
    legendPosition: 'bottom',
    legendBottom: 0,
    grid: { left: 12, right: 12, top: 28, bottom: 22, containLabel: true },
    includeSlider: false,
    seriesMode: 'timeseries',
    tooltipTrigger: 'axis'
  }
};

export function resolveObservabilityThemeMode(theme: string | null | undefined): ObservabilityThemeMode {
  return theme === 'light-ops' ? 'light-ops' : 'dark-ops';
}

export function getObservabilityThemeTokens(mode: ObservabilityThemeMode = 'dark-ops'): ObservabilityThemeTokens {
  return OBSERVABILITY_THEMES[mode];
}

export function buildObservabilitySeriesPalette(mode: ObservabilityThemeMode = 'dark-ops'): string[] {
  return [...getObservabilityThemeTokens(mode).seriesPalette];
}

export function createAxisTokens(mode: ObservabilityThemeMode = 'dark-ops'): {
  axisLabel: XAXisComponentOption['axisLabel'];
  axisLine: XAXisComponentOption['axisLine'];
  splitLine: XAXisComponentOption['splitLine'];
  axisPointer: XAXisComponentOption['axisPointer'];
} {
  const tokens = getObservabilityThemeTokens(mode);
  return {
    axisLabel: { color: tokens.chart.axisLabel },
    axisLine: { lineStyle: { color: tokens.chart.axisLine } },
    splitLine: { lineStyle: { color: tokens.chart.gridLine } },
    axisPointer: {
      lineStyle: { color: tokens.chart.pointerLine, width: 1 },
      label: {
        backgroundColor: tokens.surface.elevated,
        color: tokens.surface.textPrimary
      }
    }
  };
}

export function createGridTokens(
  _mode: ObservabilityThemeMode = 'dark-ops',
  preset: ObservabilityChartPresetName = 'metrics-timeseries'
): GridComponentOption {
  return { ...PRESET_CONFIGS[preset].grid };
}

export function createTooltipTokens(
  mode: ObservabilityThemeMode = 'dark-ops',
  trigger: 'axis' | 'item' = 'axis'
): TooltipComponentOption {
  const tokens = getObservabilityThemeTokens(mode);
  return {
    trigger,
    backgroundColor: tokens.chart.tooltipBackground,
    borderColor: tokens.chart.tooltipBorder,
    borderWidth: 1,
    textStyle: {
      color: tokens.chart.tooltipText
    },
    extraCssText: `box-shadow:${tokens.chart.shadow};border-radius:12px;`
  };
}

export function createLegendTokens(
  mode: ObservabilityThemeMode = 'dark-ops',
  legend: string[] = [],
  preset: ObservabilityChartPresetName = 'metrics-timeseries'
): LegendComponentOption {
  const tokens = getObservabilityThemeTokens(mode);
  const config = PRESET_CONFIGS[preset];
  return {
    data: legend,
    orient: config.legendOrient || 'horizontal',
    top: config.legendPosition === 'top' ? config.legendTop : undefined,
    bottom: config.legendPosition === 'bottom' ? config.legendBottom : undefined,
    textStyle: {
      color: tokens.surface.textSecondary
    },
    inactiveColor: tokens.chart.legendInactive
  };
}

export function createDataZoomTokens(
  mode: ObservabilityThemeMode = 'dark-ops',
  includeSlider: boolean = true
): DataZoomComponentOption[] {
  const tokens = getObservabilityThemeTokens(mode);
  const zooms: DataZoomComponentOption[] = [{ type: 'inside' }];
  if (includeSlider) {
    zooms.push({
      type: 'slider',
      height: 18,
      bottom: 10,
      borderColor: 'transparent',
      backgroundColor: tokens.surface.raised,
      fillerColor: tokens.chart.dataZoomFill,
      handleStyle: {
        color: tokens.chart.dataZoomHandle,
        borderColor: tokens.chart.dataZoomHandle
      }
    });
  }
  return zooms;
}

export function createSeriesBaseStyle(mode: ObservabilityThemeMode = 'dark-ops'): {
  lineStyle: LineSeriesOption['lineStyle'];
  areaStyle: LineSeriesOption['areaStyle'];
  emphasis: LineSeriesOption['emphasis'];
} {
  const tokens = getObservabilityThemeTokens(mode);
  return {
    lineStyle: { width: 2 },
    areaStyle: { opacity: tokens.chart.areaOpacity },
    emphasis: { focus: 'series' }
  };
}

export function createEmptyChartShell(
  mode: ObservabilityThemeMode = 'dark-ops',
  model: EmptyChartShellModel
): EChartsOption {
  const tokens = getObservabilityThemeTokens(mode);
  const title: TitleComponentOption = {
    text: model.title,
    subtext: model.description,
    left: 'center',
    top: 'middle',
    textStyle: {
      color: tokens.surface.textPrimary,
      fontSize: 16,
      fontWeight: 600
    },
    subtextStyle: {
      color: tokens.chart.emptyDescription,
      fontSize: 12,
      lineHeight: 18
    }
  };
  return {
    backgroundColor: 'transparent',
    title,
    xAxis: { show: false, type: 'value' },
    yAxis: { show: false, type: 'value' },
    series: []
  };
}

export function createObservabilityChartOption(
  mode: ObservabilityThemeMode,
  preset: ObservabilityChartPreset
): EChartsOption;
export function createObservabilityChartOption(
  mode: ObservabilityThemeMode,
  presetName: ObservabilityChartPresetName,
  preset: ObservabilityChartPreset
): EChartsOption;
export function createObservabilityChartOption(
  mode: ObservabilityThemeMode,
  presetOrName: ObservabilityChartPreset | ObservabilityChartPresetName,
  maybePreset?: ObservabilityChartPreset
): EChartsOption {
  const preset = typeof presetOrName === 'string' ? maybePreset : presetOrName;
  if (!preset) {
    return createEmptyChartShell(mode, {
      title: '',
      description: ''
    });
  }
  const presetName =
    typeof presetOrName === 'string' ? presetOrName : DEFAULT_PRESET_BY_KIND[preset.kind];
  const tokens = getObservabilityThemeTokens(mode);
  const palette = buildObservabilitySeriesPalette(mode);
  const config = PRESET_CONFIGS[presetName];
  const sharedOption: EChartsOption = {
    animation: false,
    backgroundColor: 'transparent',
    color: palette,
    textStyle: {
      color: tokens.surface.textSecondary
    },
    tooltip: createTooltipTokens(mode, config.tooltipTrigger),
    grid: createGridTokens(mode, presetName)
  };

  if (preset.legend) {
    sharedOption.legend = createLegendTokens(mode, preset.legend, presetName);
  }

  if (config.seriesMode === 'timeseries' && preset.kind === 'timeseries') {
    const axisTokens = createAxisTokens(mode);
    const seriesBaseStyle = createSeriesBaseStyle(mode);
    const series = preset.series.map((item, index): LineSeriesOption => ({
      ...item,
      smooth: true,
      showSymbol: false,
      lineStyle: {
        ...seriesBaseStyle.lineStyle,
        ...item.lineStyle
      },
      areaStyle: {
        ...seriesBaseStyle.areaStyle,
        ...item.areaStyle
      },
      emphasis: {
        ...seriesBaseStyle.emphasis,
        ...item.emphasis
      },
      color: item.color || palette[index % palette.length]
    }));
    return {
      ...sharedOption,
      xAxis: {
        type: 'time',
        ...axisTokens
      },
      yAxis: {
        type: 'value',
        axisLabel: axisTokens.axisLabel,
        axisLine: { show: false },
        splitLine: axisTokens.splitLine
      },
      dataZoom: createDataZoomTokens(mode, config.includeSlider),
      series
    };
  }

  if (config.seriesMode === 'bar' && preset.kind === 'bar') {
    const axisTokens = createAxisTokens(mode);
    const series = preset.series.map((item, index): BarSeriesOption => ({
      ...item,
      itemStyle: {
        color: palette[index % palette.length],
        ...item.itemStyle
      }
    }));
    return {
      ...sharedOption,
      xAxis: {
        type: 'category',
        data: preset.categories || [],
        axisLabel: axisTokens.axisLabel,
        axisLine: axisTokens.axisLine
      },
      yAxis: {
        type: 'value',
        axisLabel: axisTokens.axisLabel,
        splitLine: axisTokens.splitLine
      },
      series
    };
  }

  if (preset.kind === 'donut') {
    const series = preset.series.map((item, index): PieSeriesOption => ({
      ...item,
      radius: item.radius || ['42%', '72%'],
      itemStyle: {
        color: item.itemStyle?.color || palette[index % palette.length],
        ...item.itemStyle
      }
    }));
    return {
      ...sharedOption,
      tooltip: createTooltipTokens(mode, 'item'),
      series
    };
  }

  return sharedOption;
}
