/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Input } from 'antd';
import { useTranslation } from 'react-i18next';
import type { MetricQueryRow } from '@/platform/perses';

export function MetricPlanMetricInput({ row, onChange }: { row: MetricQueryRow; onChange: (metric: string) => void }) {
  const { t } = useTranslation();
  return (
    <Input
      aria-label={t('explore.metricComposition.metric', { ref: row.refId })}
      placeholder={t('explore.metricComposition.metricPlaceholder')}
      maxLength={256}
      title={row.metric}
      data-metric-plan-ref={row.refId}
      value={row.metric}
      onChange={event => onChange(event.target.value)}
    />
  );
}
