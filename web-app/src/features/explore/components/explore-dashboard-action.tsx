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

import { Button, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { signalDashboardPath } from '@/shared/navigation/signal-dashboard-paths';
import type { ExactTimeWindow } from '@/shared/query-context';

import { buildExploreDashboardHandoff } from '../model/explore-dashboard-handoff';
import type { ExploreQuery } from '../model/explore-query';

type Props = {
  query: ExploreQuery;
  timeWindow: ExactTimeWindow | undefined;
  timeZone: string;
  canWrite: boolean;
  blocked: boolean;
  dirty: boolean;
};

export function ExploreDashboardAction({ query, timeWindow, timeZone, canWrite, blocked, dirty }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const title = t(`explore.signals.${query.signal}`);
  const options = timeWindow ? { timeWindow, timeZone, title, dashboardKey: 'explore-panel' } : undefined;
  const preview = options ? buildExploreDashboardHandoff(query, options) : { state: 'unsupported' as const };
  if (!canWrite) return null;
  const disabled = blocked || dirty || preview.state !== 'ready';
  const reason = dashboardDisabledReason(dirty, 'reason' in preview ? preview.reason : undefined);
  const add = () => {
    if (disabled || !options) return;
    const result = buildExploreDashboardHandoff(query, { ...options, dashboardKey: crypto.randomUUID() });
    if (result.state === 'ready') {
      void navigate(signalDashboardPath, { state: { dashboardPanelHandoff: result.handoff } });
    }
  };
  const sourceHint =
    preview.state === 'ready' && preview.pinned ? 'signalDashboard.addFixedTrace' : 'signalDashboard.addSourceWindow';
  const visibleReason = visibleDashboardUnsupportedReason(preview);
  return (
    <>
      <Tooltip title={disabled ? t(reason) : t(sourceHint)}>
        <span>
          <Button disabled={disabled} onClick={add}>
            {t('signalDashboard.addFromExplore')}
          </Button>
        </span>
      </Tooltip>
      {visibleReason && <span role="status">{t(visibleReason)}</span>}
    </>
  );
}

function visibleDashboardUnsupportedReason(preview: { state: string; reason?: string }) {
  if (preview.reason === 'log-transactions') return 'signalDashboard.addTransactionsUnsupported';
  if (preview.reason === 'log-patterns') return 'explore.logPatterns.dashboardUnsupported';
  if (preview.reason === 'log-calculated') return 'explore.logCalculated.dashboardUnsupported';
  if (preview.reason === 'log-calculated-v2') return 'explore.logCalculatedV2.dashboardUnsupported';
  if (preview.reason === 'log-subquery') return 'explore.logSubquery.dashboardUnsupported';
  if (preview.reason === 'trace-structure') return 'exploreTrace.structure.dashboardUnsupported';
  return undefined;
}

function dashboardDisabledReason(dirty: boolean, reason: string | undefined) {
  if (reason === 'log-transactions') return 'signalDashboard.addTransactionsUnsupported';
  if (reason === 'log-patterns') return 'explore.logPatterns.dashboardUnsupported';
  if (reason === 'log-calculated') return 'explore.logCalculated.dashboardUnsupported';
  if (reason === 'log-calculated-v2') return 'explore.logCalculatedV2.dashboardUnsupported';
  if (reason === 'log-subquery') return 'explore.logSubquery.dashboardUnsupported';
  if (reason === 'trace-structure') return 'exploreTrace.structure.dashboardUnsupported';
  if (dirty) return 'signalDashboard.addApplyFirst';
  if (reason === 'log-group-selection') return 'explore.logGroupSelection.dashboardUnsupported';
  return 'signalDashboard.addUnsupported';
}
