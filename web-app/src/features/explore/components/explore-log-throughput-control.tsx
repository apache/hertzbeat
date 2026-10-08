/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import { Select } from 'antd';
import type { LogAnalysisState } from '@/platform/perses';
export function ExploreLogThroughputControl({
  value,
  onChange,
  t
}: {
  value: LogAnalysisState;
  onChange: (value: LogAnalysisState) => void;
  t: TFunction;
}) {
  if (value.representation !== 'timeseries' && !value.transform) return null;
  return (
    <label>
      {t('explore.logAnalysis.transform')}
      <Select<'throughput' | ''>
        value={value.transform ?? ''}
        title={t('explore.logAnalysis.throughputHint')}
        onChange={transform => {
          const next = { ...value };
          if (transform === 'throughput') next.transform = 'throughput';
          else delete next.transform;
          onChange(next);
        }}
        options={[
          { value: '', label: t('explore.logAnalysis.transformNone') },
          { value: 'throughput', label: t('explore.logAnalysis.throughput') }
        ]}
      />
    </label>
  );
}
