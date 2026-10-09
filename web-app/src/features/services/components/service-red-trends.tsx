/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useTranslation } from 'react-i18next';
import type { EntityRedSignal } from '@/features/entity/queries';
import { HertzBeatMetricTimeSeriesResult, type HertzBeatPersesPrimitiveMessages } from '@/platform/perses';
import styles from './services-view.module.css';

type ReadyRed = Extract<EntityRedSignal, { state: 'ready' }>;
const panels = [
  { key: 'requestCount', label: 'services.requests', unit: '', display: 'bar' },
  { key: 'errorRate', label: 'services.errorRate', unit: '%', display: 'line' },
  { key: 'latencyP95Ms', label: 'services.latencyP95', unit: 'ms', display: 'line' }
] as const;

export function ServiceRedTrends({ red }: { red: ReadyRed }) {
  const { t } = useTranslation();
  const timeWindow = { from: red.window.start, to: red.window.end };
  const messages = primitiveMessages(t);
  return (
    <div className={styles.redTrends}>
      {panels.map(panel => {
        const label = `${t(panel.label)}${panel.unit ? ` (${panel.unit})` : ''}`;
        const points = red.series.flatMap(point => {
          const value = point[panel.key];
          return value == null
            ? []
            : [{ timestamp: point.timestamp, value: panel.key === 'errorRate' ? value * 100 : value }];
        });
        const sparse =
          points.length < red.series.length ||
          points.some(
            (point, index) => index > 0 && point.timestamp - points[index - 1]!.timestamp > red.resolutionSeconds * 1000
          );
        return (
          <figure key={panel.key}>
            <figcaption>{label}</figcaption>
            {points.length ? (
              <HertzBeatMetricTimeSeriesResult
                className={styles.redChart}
                title={label}
                ariaLabel={label}
                messages={messages}
                variant="fill"
                timeSeriesDisplay={points.length === 1 || sparse ? 'bar' : panel.display}
                query={{ signal: 'metrics', queryKind: 'time-series', timeWindow, metric: { name: panel.key } }}
                outcome={{
                  state: 'ready',
                  truncated: false,
                  data: {
                    timeWindow,
                    source: red.source,
                    series: [{ key: panel.key, name: label, unit: panel.unit, labels: {}, points }]
                  }
                }}
              />
            ) : (
              <p className={styles.note}>{t('services.unknown')}</p>
            )}
          </figure>
        );
      })}
    </div>
  );
}

function primitiveMessages(t: ReturnType<typeof useTranslation>['t']): HertzBeatPersesPrimitiveMessages {
  return {
    loading: t('entity.signals.query.loading'),
    empty: t('entity.signals.query.empty'),
    truncated: t('entity.signals.query.truncated'),
    truncationUnknown: t('entity.signals.query.truncationUnknown'),
    runtimeError: t('entity.signals.query.runtimeError'),
    failures: {
      'perses.query.invalid': t('entity.signals.query.invalid'),
      'perses.query.permission': t('entity.signals.query.permission'),
      'perses.query.overloaded': t('entity.signals.query.overloaded'),
      'perses.query.unavailable': t('entity.signals.query.unavailable'),
      'perses.query.contract': t('entity.signals.query.contract')
    }
  };
}
