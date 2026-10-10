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

import type { MonitorMetricWorkbenchController } from '../model/monitor-detail-model';
import styles from './monitor-realtime-card.module.css';
import { RealtimeEvidence } from './monitor-realtime-evidence';
import { RealtimeFavoriteButton } from './monitor-realtime-group-support';
import { formatGroupTime } from './monitor-realtime-group-time';

export function RealtimeGroupCard({
  group,
  state,
  onSelectMetric,
  onToggleGroup,
  collapsed = false
}: {
  group: MonitorMetricWorkbenchController['state']['realtimeGroups'][number];
  state: MonitorMetricWorkbenchController['state'];
  onSelectMetric?: ((metricKey: string) => void) | undefined;
  onToggleGroup: MonitorMetricWorkbenchController['actions']['toggleRealtimeFavorite'];
  collapsed?: boolean | undefined;
}) {
  return (
    <article className={styles.realtimeGroup} data-monitor-group={group.group}>
      <RealtimeGroupHeader group={group} onToggle={onToggleGroup} />
      {collapsed ? null : <RealtimeGroupBody group={group} state={state} onSelectMetric={onSelectMetric} />}
    </article>
  );
}

function RealtimeGroupHeader({
  group,
  onToggle
}: {
  group: MonitorMetricWorkbenchController['state']['realtimeGroups'][number];
  onToggle: MonitorMetricWorkbenchController['actions']['toggleRealtimeFavorite'];
}) {
  const { t } = useTranslation();
  return (
    <header className={styles.realtimeGroupHeader} data-layout-panel-header="">
      <div className={styles.realtimeGroupIdentity}>
        <h5>{group.group}</h5>
        <time>{formatGroupTime(group.result)}</time>
      </div>
      <div className={styles.realtimeGroupActions}>
        <span>{t('monitorMetrics.itemCount', { count: group.result.rows.length })}</span>
        <RealtimeFavoriteButton group={group} onToggle={onToggle} />
      </div>
    </header>
  );
}

function RealtimeGroupBody({
  group,
  state,
  onSelectMetric
}: {
  group: MonitorMetricWorkbenchController['state']['realtimeGroups'][number];
  state: MonitorMetricWorkbenchController['state'];
  onSelectMetric?: ((metricKey: string) => void) | undefined;
}) {
  return (
    <div className={styles.realtimeGroupBody}>
      <RealtimeEvidence
        evidence={group.result}
        group={group.group}
        metricOptions={state.catalog.options}
        selectedMetricKey={state.metricKey}
        onSelectMetric={onSelectMetric}
      />
    </div>
  );
}
