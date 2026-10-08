/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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
import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';

import { OperationalStatePanel } from '@/shared/operational-page';

import { exploreHandoffState, type ExploreQuery, type ExploreQueryPatch } from '../model/explore-model';
import { invalidExploreContextMessageKey } from '../model/explore-retired-log-reference-message';
import { validatedTraceReturn } from '../model/explore-trace-log-return';
import styles from './explore-workbench.module.css';
import { ExploreWorkflowGuide } from './explore-workflow-guide';

type Props = {
  query: ExploreQuery;
  actions?: ReactNode;
  timeToolbar?: ReactNode;
  t: TFunction;
  updateQuery: (changes: ExploreQueryPatch) => void;
  openPath?: ((path: string) => void) | undefined;
};

export function ExploreWorkbench({ query, t, openPath, actions, timeToolbar }: Props) {
  const traceReturn = validatedTraceReturn(query);
  return (
    <>
      <header
        className={styles.pageHeader}
        data-explore-page-header="true"
        data-explore-header-signal={query.signal}
        data-signal-workbench-header
      >
        <div className={styles.headingRow} data-signal-header-level="title">
          <h2 id={`explore-heading-${query.signal}`}>{t(`explore.signals.${query.signal}`)}</h2>
          <div className={styles.scopeNavigation}>
            {traceReturn && openPath && (
              <Button onClick={() => openPath(traceReturn)}>{t('exploreTrace.backToTrace')}</Button>
            )}
            {query.servicesReturnTo && openPath && (
              <Button onClick={() => openPath(query.servicesReturnTo!)}>{t('services.back')}</Button>
            )}
            {query.dashboardReturnTo && openPath && (
              <Button onClick={() => openPath(query.dashboardReturnTo!)}>{t('signalDashboard.back')}</Button>
            )}
          </div>
          <ExploreWorkflowGuide query={query} t={t} />
        </div>
        <div className={styles.toolbarRow} data-signal-header-level="tools">
          <div className={styles.viewSlot} data-signal-view-slot>
            {actions}
          </div>
          {timeToolbar}
        </div>
      </header>
      {exploreHandoffState(query) === 'invalid' && (
        <OperationalStatePanel kind="error" title={t(invalidExploreContextMessageKey(query))} />
      )}
    </>
  );
}
