/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
