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

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorMetricWorkbenchController } from '../model/monitor-detail-model';
import styles from './monitor-realtime-card.module.css';
import { RealtimeEvidence } from './monitor-realtime-evidence';
import { RealtimeGroupCard } from './monitor-realtime-group-card';
import { MonitorRealtimeLayoutGrid } from './monitor-realtime-layout-grid';
import { useActivateWhenVisible } from './use-activate-when-visible';

export function MonitorRealtimeResult({
  state,
  actions,
  groups = state.realtimeGroups,
  onSelectMetric
}: Pick<MonitorMetricWorkbenchController, 'state' | 'actions'> & {
  groups?: MonitorMetricWorkbenchController['state']['realtimeGroups'] | undefined;
  onSelectMetric?: ((metricKey: string) => void) | undefined;
}) {
  if (groups.length > 0) {
    return <RealtimeGroupGrid state={state} actions={actions} groups={groups} onSelectMetric={onSelectMetric} />;
  }
  return <RealtimeEvidence evidence={state.realtime} />;
}

function RealtimeGroupGrid({
  state,
  actions,
  groups,
  onSelectMetric
}: Pick<MonitorMetricWorkbenchController, 'state' | 'actions'> & {
  groups: MonitorMetricWorkbenchController['state']['realtimeGroups'];
  onSelectMetric?: ((metricKey: string) => void) | undefined;
}) {
  const { t } = useTranslation();
  const loadMoreRef = useActivateWhenVisible<HTMLButtonElement>(
    state.hasMoreRealtimeGroups,
    actions.loadMoreRealtimeGroups
  );
  return (
    <>
      <MonitorRealtimeLayoutGrid
        state={state.layout}
        actions={actions.layout}
        groups={groups}
        renderGroup={(group, item) => (
          <RealtimeGroupCard
            group={group}
            state={state}
            onSelectMetric={onSelectMetric}
            onToggleGroup={actions.toggleRealtimeFavorite}
            collapsed={item.collapsed}
          />
        )}
      />
      {state.hasMoreRealtimeGroups ? (
        <Button ref={loadMoreRef} className={styles.loadMore!} onClick={actions.loadMoreRealtimeGroups}>
          {t('monitorMetrics.loadMore')}
        </Button>
      ) : null}
    </>
  );
}
