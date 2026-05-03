'use client';

import * as React from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { cn } from '../../lib/utils';

export type EChartsDataZoomRange = {
  start?: number;
  end?: number;
  startValue?: number | string;
  endValue?: number | string;
};

function readDataZoomNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readDataZoomValue(value: unknown) {
  return typeof value === 'number' || typeof value === 'string' ? value : undefined;
}

export function EChartsPanel({
  option,
  className,
  height = 320,
  onChartClick,
  onDataZoomChange,
  tone = 'default',
  preserveDataZoom = false
}: {
  option: EChartsOption;
  className?: string;
  height?: number;
  onChartClick?: (dataIndex: number) => void;
  onDataZoomChange?: (range: EChartsDataZoomRange) => void;
  tone?: 'default' | 'deck' | 'operator';
  preserveDataZoom?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<echarts.ECharts | null>(null);
  const dataZoomInteractionRef = React.useRef(false);
  const markDataZoomInteraction = React.useCallback(() => {
    dataZoomInteractionRef.current = true;
  }, []);

  React.useEffect(() => {
    if (!ref.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current);
    }
    const chart = chartRef.current;

    const handleClick = (params: { dataIndex?: number }) => {
      if (typeof params.dataIndex === 'number') {
        onChartClick?.(params.dataIndex);
      }
    };
    const handleDataZoom = (params: { batch?: Array<Record<string, unknown>> } & Record<string, unknown>) => {
      if (!dataZoomInteractionRef.current) return;
      const payload = Array.isArray(params.batch) ? params.batch[0] : params;
      const range: EChartsDataZoomRange = {
        start: readDataZoomNumber(payload?.start),
        end: readDataZoomNumber(payload?.end),
        startValue: readDataZoomValue(payload?.startValue),
        endValue: readDataZoomValue(payload?.endValue)
      };
      if (range.start == null && range.end == null && range.startValue == null && range.endValue == null) return;
      onDataZoomChange?.(range);
    };
    chart.on('click', handleClick);
    chart.on('datazoom', handleDataZoom);

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(ref.current);

    return () => {
      resizeObserver.disconnect();
      chart.off('click', handleClick);
      chart.off('datazoom', handleDataZoom);
    };
  }, [onChartClick, onDataZoomChange]);

  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (!preserveDataZoom) {
      chart.setOption(option, { notMerge: true });
      return;
    }

    const previousOption = chart.getOption() as { dataZoom?: Array<Record<string, unknown>> } | undefined;
    const previousDataZoom = Array.isArray(previousOption?.dataZoom) ? previousOption.dataZoom : [];

    chart.setOption(option, {
      notMerge: false,
      lazyUpdate: true,
      replaceMerge: ['xAxis', 'yAxis', 'series']
    });

    previousDataZoom.forEach((zoom, dataZoomIndex) => {
      const start = typeof zoom.start === 'number' ? zoom.start : undefined;
      const end = typeof zoom.end === 'number' ? zoom.end : undefined;
      const startValue = zoom.startValue;
      const endValue = zoom.endValue;
      if (start == null && end == null && startValue == null && endValue == null) return;
      chart.dispatchAction({ type: 'dataZoom', dataZoomIndex, start, end, startValue, endValue });
    });
  }, [option, preserveDataZoom]);

  React.useEffect(
    () => () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    },
    []
  );

  return (
    <div
      className={cn(
        tone === 'deck'
          ? 'overflow-hidden rounded-none border-x-0 border-y border-[var(--ops-border-color)] bg-transparent shadow-none'
          : tone === 'operator'
            ? 'overflow-hidden rounded-none border-x-0 border-y border-[var(--ops-border-color)] bg-transparent shadow-none'
          : 'overflow-hidden rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] shadow-none',
        className
      )}
    >
      <div className="pointer-events-none h-px w-full bg-[var(--ops-border-color)]" />
      <div
        className={tone === 'deck' || tone === 'operator' ? 'relative' : undefined}
        ref={ref}
        style={{ height }}
        onPointerDownCapture={markDataZoomInteraction}
        onWheelCapture={markDataZoomInteraction}
      />
    </div>
  );
}
