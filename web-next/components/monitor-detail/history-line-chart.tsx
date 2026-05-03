'use client';

import React, { useState } from 'react';
import { ObservabilityInsetPanel, ObservabilityPillButton } from '../observability';
import {
  buildHistoryChartDownloadName,
  buildHistoryChartPoints,
  buildHistoryChartPolyline,
  buildHistoryChartSeries,
  findNearestHistoryChartPointIndex,
  buildHistoryChartSvgDataUrl,
  buildHistoryChartSvgDocument
} from '../../lib/monitor-detail/history-chart';
import type { MonitorHistoryValue } from '../../lib/types';
import { toggleMonitorHistoryVisibleSeriesKey } from '../../lib/monitor-detail/view-model';

export function HistoryLineChart({
  values,
  formatTime,
  aggregated = false,
  selectedPointIndex = null,
  onSelectPoint,
  visibleSeriesKeys,
  onVisibleSeriesKeysChange
}: {
  values: MonitorHistoryValue[];
  formatTime: (value?: number | string | null) => string;
  aggregated?: boolean;
  selectedPointIndex?: number | null;
  onSelectPoint?: (index: number) => void;
  visibleSeriesKeys?: string[];
  onVisibleSeriesKeysChange?: (keys: string[]) => void;
}) {
  const points = buildHistoryChartPoints(values, formatTime, aggregated);
  const series = buildHistoryChartSeries(values, formatTime, aggregated);
  const seriesKeys = series.map(item => item.key);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  if (points.length === 0) return null;

  const resolvedVisibleSeriesKeys = visibleSeriesKeys?.length ? visibleSeriesKeys.filter(key => seriesKeys.includes(key)) : seriesKeys;
  const visibleSeries = series.filter(item => resolvedVisibleSeriesKeys.includes(item.key));
  const activePointIndex = hoveredPointIndex ?? selectedPointIndex;
  const activeSeriesValues = activePointIndex == null
    ? []
    : visibleSeries
        .map(item => ({
          key: item.key,
          label: item.label,
          color: item.color,
          point: item.points[activePointIndex] || null
        }))
        .filter(item => item.point);
  const activePoint = activePointIndex == null ? null : points[activePointIndex] || null;
  const downloadUrl = buildHistoryChartSvgDataUrl(buildHistoryChartSvgDocument(visibleSeries, selectedPointIndex));
  const downloadName = buildHistoryChartDownloadName(aggregated);
  const primarySeriesKey = aggregated ? 'mean' : 'origin';
  const canFocusPrimarySeries = aggregated && resolvedVisibleSeriesKeys.length !== 1;
  const canShowAllStats = aggregated && resolvedVisibleSeriesKeys.length !== seriesKeys.length;

  return (
    <ObservabilityInsetPanel>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {aggregated && series.length > 1 ? (
          <div className="space-y-2">
            {onVisibleSeriesKeysChange ? (
              <div className="flex flex-wrap gap-2 text-[11px] text-[var(--ops-text-secondary)]">
                <ObservabilityPillButton
                  type="button"
                  size="compact"
                  disabled={!canFocusPrimarySeries}
                  onClick={() => onVisibleSeriesKeysChange([primarySeriesKey])}
                >
                  Primary only
                </ObservabilityPillButton>
                <ObservabilityPillButton
                  type="button"
                  size="compact"
                  disabled={!canShowAllStats}
                  onClick={() => onVisibleSeriesKeysChange(seriesKeys)}
                >
                  Show all stats
                </ObservabilityPillButton>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3 text-[11px] text-[var(--ops-text-secondary)]">
              {series.map(item => (
                <ObservabilityPillButton
                  key={item.key}
                  type="button"
                  size="compact"
                  active={resolvedVisibleSeriesKeys.includes(item.key)}
                  className="gap-2"
                  style={{ opacity: resolvedVisibleSeriesKeys.includes(item.key) ? 1 : 0.45 }}
                  onClick={() => {
                    if (!onVisibleSeriesKeysChange) return;
                    const nextKeys = toggleMonitorHistoryVisibleSeriesKey(resolvedVisibleSeriesKeys, item.key, seriesKeys);
                    onVisibleSeriesKeysChange(nextKeys);
                  }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </ObservabilityPillButton>
              ))}
            </div>
          </div>
        ) : (
          <div />
        )}
        <ObservabilityPillButton
          as="a"
          size="compact"
          href={downloadUrl}
          download={downloadName}
        >
          Download SVG
        </ObservabilityPillButton>
      </div>
      {onSelectPoint ? (
        <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">
          Click or hover the chart to inspect the nearest point
        </div>
      ) : null}
      <svg viewBox="0 0 100 100" className="h-40 w-full overflow-visible">
        <line x1="0" y1="100" x2="100" y2="100" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <line x1="0" y1="0" x2="0" y2="100" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        {activePoint ? <line x1={activePoint.x} y1="0" x2={activePoint.x} y2="100" stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" strokeWidth="1" /> : null}
        {onSelectPoint ? (
          <rect
            x="0"
            y="0"
            width="100"
            height="100"
            fill="transparent"
            onMouseLeave={() => setHoveredPointIndex(null)}
            onMouseMove={event => {
              const svg = event.currentTarget.ownerSVGElement;
              if (!svg) return;
              const bounds = svg.getBoundingClientRect();
              if (bounds.width <= 0) return;
              const relativeX = ((event.clientX - bounds.left) / bounds.width) * 100;
              const nextIndex = findNearestHistoryChartPointIndex(points, relativeX);
              setHoveredPointIndex(nextIndex);
            }}
            onClick={event => {
              const svg = event.currentTarget.ownerSVGElement;
              if (!svg) return;
              const bounds = svg.getBoundingClientRect();
              if (bounds.width <= 0) return;
              const relativeX = ((event.clientX - bounds.left) / bounds.width) * 100;
              const nextIndex = findNearestHistoryChartPointIndex(points, relativeX);
              if (nextIndex != null) {
                onSelectPoint(nextIndex);
              }
            }}
          />
        ) : null}
        {visibleSeries.map(item => (
          <g key={item.key}>
            <polyline fill="none" stroke={item.color} strokeWidth={item.key === 'mean' || item.key === 'origin' ? '2' : '1.4'} points={buildHistoryChartPolyline(item.points)} />
            {item.points.map((point, index) => {
              const selected = selectedPointIndex === index;
              return (
                <circle
                  key={`${item.key}-${point.x}-${point.y}`}
                  cx={point.x}
                  cy={point.y}
                  r={selected ? '3' : item.key === 'mean' || item.key === 'origin' ? '1.8' : '1.3'}
                  fill={item.color}
                  stroke={selected ? 'white' : 'transparent'}
                  strokeWidth={selected ? '0.9' : '0'}
                  data-selected={selected ? 'true' : 'false'}
                  className={onSelectPoint ? 'cursor-pointer' : undefined}
                  onClick={onSelectPoint ? () => onSelectPoint(index) : undefined}
                >
                  <title>{`${item.label} · ${point.label} · ${point.rawValue}`}</title>
                </circle>
              );
            })}
          </g>
        ))}
      </svg>
      {activePoint ? (
        <div className="mt-3 space-y-2">
          {onSelectPoint ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ops-text-secondary)]">
              <ObservabilityPillButton
                type="button"
                size="compact"
                disabled={activePointIndex == null || activePointIndex <= 0}
                onClick={() => activePointIndex != null && onSelectPoint(Math.max(0, activePointIndex - 1))}
              >
                Previous
              </ObservabilityPillButton>
              <span>{`Point ${(activePointIndex ?? 0) + 1} / ${points.length}`}</span>
              <ObservabilityPillButton
                type="button"
                size="compact"
                disabled={activePointIndex == null || activePointIndex >= points.length - 1}
                onClick={() => activePointIndex != null && onSelectPoint(Math.min(points.length - 1, activePointIndex + 1))}
              >
                Next
              </ObservabilityPillButton>
            </div>
          ) : null}
          <div className="rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-2 text-xs text-[var(--ops-text-secondary)]">
            <span className="font-medium text-[var(--ops-text-primary)]">{hoveredPointIndex != null ? 'hovered point' : 'selected point'}</span>
            {' · '}
            <span>{activePoint.label}</span>
            {' · '}
            <span>{activePoint.rawValue}</span>
          </div>
          {activeSeriesValues.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {activeSeriesValues.map(item => (
                <div key={item.key} className="rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-2 text-xs text-[var(--ops-text-secondary)]">
                  <div className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-[var(--ops-text-primary)]">{item.label}</span>
                  </div>
                  <div className="mt-1">{item.point?.rawValue}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-[var(--ops-text-tertiary)]">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </ObservabilityInsetPanel>
  );
}
