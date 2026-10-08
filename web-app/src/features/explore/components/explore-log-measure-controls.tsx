/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import type { Ref } from 'react';
import type { RefSelectProps } from 'antd';
import type { LogAnalysisState } from '@/platform/perses';
import type { LogFacetField } from '../model/explore-log-facets';
import { LogMeasureSelector } from './explore-log-measure-selector';
export function ExploreLogMeasureControls({
  value,
  fields,
  extraFields,
  onChange,
  fieldRef,
  t
}: {
  value: LogAnalysisState;
  fields: LogFacetField[];
  extraFields?: string[];
  onChange: (value: LogAnalysisState) => void;
  fieldRef?: Ref<RefSelectProps> | undefined;
  t: TFunction;
}) {
  return (
    <LogMeasureSelector
      fieldRef={fieldRef}
      measure={value.measure}
      fields={fields}
      extraFields={extraFields}
      allowCount
      t={t}
      onChange={measure => {
        const next: LogAnalysisState = {
          ...value,
          order: `${measure ? 'measure' : 'count'}-${value.order.endsWith('asc') ? 'asc' : 'desc'}`
        };
        if (measure) onChange({ ...next, measure });
        else {
          delete next.measure;
          onChange(next);
        }
      }}
    />
  );
}
