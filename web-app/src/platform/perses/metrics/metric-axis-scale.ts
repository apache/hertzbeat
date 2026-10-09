/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { helper } from 'echarts/core';
import { getFormattedAxis } from '@perses-dev/components';
import { convertPanelYAxis } from '@perses-dev/timeseries-chart-plugin/lib/utils/data-transform';
import { metricAxisBoundsValid, type MetricAxisDomain } from './metric-axis-domain';

type Extent = { min: number; max: number };
function validExtent(extent: MetricAxisDomain): extent is Extent {
  return (
    extent.min !== undefined && extent.max !== undefined && Number.isFinite(extent.min) && Number.isFinite(extent.max)
  );
}
function safeAutomaticSpan(domain: MetricAxisDomain, extent: Extent) {
  return (domain.min !== undefined && domain.max !== undefined) || Number.isFinite(extent.max - extent.min);
}
function automaticExtentRetained(bounds: MetricAxisDomain, extent: Extent, lower: number, upper: number) {
  return (bounds.min !== undefined || lower <= extent.min) && (bounds.max !== undefined || upper >= extent.max);
}
function explicitExtentRetained(bounds: MetricAxisDomain, lower: number, upper: number) {
  return (bounds.min === undefined || lower === bounds.min) && (bounds.max === undefined || upper === bounds.max);
}
function resolvedScaleValid(bounds: MetricAxisDomain, extent: Extent) {
  const options = {
    ...(bounds.min === undefined ? {} : { min: bounds.min }),
    ...(bounds.max === undefined ? {} : { max: bounds.max })
  };
  const axis = getFormattedAxis(convertPanelYAxis(options))[0];
  if (!axis) return false;
  const scale = helper.createScale([extent.min, extent.max], axis);
  const [min, max] = scale.getExtent();
  if (min === undefined || max === undefined || !metricAxisBoundsValid({ min, max })) return false;
  if (!automaticExtentRetained(bounds, extent, min, max)) return false;
  if (!explicitExtentRetained(bounds, min, max)) return false;
  const ticks = scale.getTicks();
  return ticks.length >= 2 && ticks.every(tick => Number.isFinite(tick.value));
}
// Resolve the installed Perses options through ECharts, including automatic padding and nice ticks.
export function metricAxisScaleValid(
  domain: MetricAxisDomain,
  extent: MetricAxisDomain | undefined,
  zeroBaseline = false
) {
  if (!metricAxisBoundsValid(domain)) return false;
  if (!extent) return true;
  if (!validExtent(extent) || !safeAutomaticSpan(domain, extent)) return false;
  const bounds =
    zeroBaseline && domain.min === undefined && domain.max === undefined && extent.min >= 0
      ? { ...domain, min: 0 }
      : domain;
  try {
    return resolvedScaleValid(bounds, extent);
  } catch {
    return false;
  }
}
