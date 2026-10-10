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
