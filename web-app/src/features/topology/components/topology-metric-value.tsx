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
