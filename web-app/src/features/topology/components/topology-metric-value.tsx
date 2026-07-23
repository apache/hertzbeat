/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useTranslation } from 'react-i18next';

export type TopologyMetricKind = 'count' | 'latency' | 'rate' | 'ratio';

export function TopologyMetricValue({ kind, value }: { kind: TopologyMetricKind; value: number | null }) {
  const { t } = useTranslation();
  if (value === null) return <span aria-label={t('topology.metrics.unavailable')}>—</span>;
  if (kind === 'ratio') return <>{`${(value * 100).toFixed(2)}%`}</>;
  if (kind === 'latency') return <>{`${value.toFixed(1)} ms`}</>;
  if (kind === 'rate') return <>{value.toFixed(2)}</>;
  return <>{value.toLocaleString()}</>;
}
