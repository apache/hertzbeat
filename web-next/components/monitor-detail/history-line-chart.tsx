'use client';

import React, { useState } from 'react';
import { HzActionGroup, HzButton, HzButtonLink, HzChartSurface, HzDataMetaText, HzDetailRows } from '@hertzbeat/ui';
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
  const activeDetailRows = activePoint
    ? [
        {
          key: 'active-point',
          title: hoveredPointIndex != null ? 'hovered point' : 'selected point',
          copy: activePoint.rawValue,
          meta: activePoint.label
        },
        ...activeSeriesValues.map(item => ({
          key: item.key,
          title: item.label,
          copy: item.point?.rawValue ?? '-',
          meta: item.key
        }))
      ]
    : [];
  const downloadUrl = buildHistoryChartSvgDataUrl(buildHistoryChartSvgDocument(visibleSeries, selectedPointIndex));
  const downloadName = buildHistoryChartDownloadName(aggregated);
  const primarySeriesKey = aggregated ? 'mean' : 'origin';
  const canFocusPrimarySeries = aggregated && resolvedVisibleSeriesKeys.length !== 1;
  const canShowAllStats = aggregated && resolvedVisibleSeriesKeys.length !== seriesKeys.length;

  return (
    <HzChartSurface
      heading={aggregated ? 'Aggregated history' : 'History'}
      variant="inline"
      data-monitor-history-line-owner="hertzbeat-ui-chart-surface"
      data-monitor-history-line-legacy-svg="true"
      contentClassName="px-3 py-2"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {aggregated && series.length > 1 ? (
          <HzActionGroup
            layout="stack"
            density="inline"
            data-monitor-history-line-action-stack-owner="hertzbeat-ui-action-group"
          >
            {onVisibleSeriesKeysChange ? (
              <HzActionGroup
                density="inline"
                data-monitor-history-line-action-owner="hertzbeat-ui-action-group"
                data-monitor-history-line-action="quick-presets"
              >
                <HzButton
                  type="button"
                  size="xs"
                  intent="ghost"
                  data-monitor-history-line-control-owner="hertzbeat-ui-button"
                  disabled={!canFocusPrimarySeries}
                  onClick={() => onVisibleSeriesKeysChange([primarySeriesKey])}
                >
                  Primary only
                </HzButton>
                <HzButton
                  type="button"
                  size="xs"
                  intent="ghost"
                  data-monitor-history-line-control-owner="hertzbeat-ui-button"
                  disabled={!canShowAllStats}
                  onClick={() => onVisibleSeriesKeysChange(seriesKeys)}
                >
                  Show all stats
                </HzButton>
              </HzActionGroup>
            ) : null}
            <HzActionGroup
              density="inline"
              data-monitor-history-line-action-owner="hertzbeat-ui-action-group"
              data-monitor-history-line-action="series-visibility"
            >
              {series.map(item => (
                <HzButton
                  key={item.key}
                  type="button"
                  size="xs"
                  intent={resolvedVisibleSeriesKeys.includes(item.key) ? 'secondary' : 'ghost'}
                  data-monitor-history-line-control-owner="hertzbeat-ui-button"
                  data-series-selected={resolvedVisibleSeriesKeys.includes(item.key) ? 'true' : 'false'}
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
                </HzButton>
                ))}
              </HzActionGroup>
          </HzActionGroup>
        ) : (
          <div />
        )}
        <HzButtonLink
          href={downloadUrl}
          download={downloadName}
          size="xs"
          intent="secondary"
          data-monitor-history-line-control-owner="hertzbeat-ui-button"
          data-monitor-history-download-owner="hertzbeat-ui-button-link"
        >
          Download SVG
        </HzButtonLink>
      </div>
      {onSelectPoint ? (
        <HzDataMetaText
          className="mb-2 block tracking-[0.16em]"
          data-monitor-history-line-meta-owner="hertzbeat-ui-data-meta-text"
        >
          Click or hover the chart to inspect the nearest point
        </HzDataMetaText>
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
            <HzActionGroup
              density="inline"
              data-monitor-history-line-action-owner="hertzbeat-ui-action-group"
              data-monitor-history-line-action="point-navigation"
            >
              <HzButton
                type="button"
                size="xs"
                intent="ghost"
                data-monitor-history-line-control-owner="hertzbeat-ui-button"
                disabled={activePointIndex == null || activePointIndex <= 0}
                onClick={() => activePointIndex != null && onSelectPoint(Math.max(0, activePointIndex - 1))}
              >
                Previous
              </HzButton>
              <span>{`Point ${(activePointIndex ?? 0) + 1} / ${points.length}`}</span>
              <HzButton
                type="button"
                size="xs"
                intent="ghost"
                data-monitor-history-line-control-owner="hertzbeat-ui-button"
                disabled={activePointIndex == null || activePointIndex >= points.length - 1}
                onClick={() => activePointIndex != null && onSelectPoint(Math.min(points.length - 1, activePointIndex + 1))}
              >
                Next
              </HzButton>
            </HzActionGroup>
          ) : null}
          <HzDetailRows
            rows={activeDetailRows}
            data-monitor-history-line-point-owner="hertzbeat-ui-detail-rows"
          />
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap justify-between gap-2">
        <HzDataMetaText data-monitor-history-line-meta-owner="hertzbeat-ui-data-meta-text">
          {points[0]?.label}
        </HzDataMetaText>
        <HzDataMetaText data-monitor-history-line-meta-owner="hertzbeat-ui-data-meta-text">
          {points[points.length - 1]?.label}
        </HzDataMetaText>
      </div>
    </HzChartSurface>
  );
}
