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
