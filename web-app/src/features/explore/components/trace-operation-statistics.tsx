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

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { OperationSpan } from '../model/trace-operation-statistics';
import styles from './trace-operation-statistics.module.css';
import { GroupsTable } from './trace-operation-statistics-table';
import { GroupDrilldown } from './trace-operation-statistics-drilldown';
import { StatisticsControls, StatisticsSampleNotice, LocalPagination } from './trace-operation-statistics-primitives';
import { useTraceOperationStatistics } from './use-trace-operation-statistics';
const COPY = 'exploreInvestigation.trace.operationStatistics.';
type Props = { spans: readonly OperationSpan[]; partial: boolean; evidenceCurrent: boolean };
export function TraceOperationStatistics(props: Props) {
  const { t } = useTranslation();
  const model = useTraceOperationStatistics(props);
  const container = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  return (
    <section ref={container} className={styles.statistics} aria-label={t(COPY + 'title')}>
      <StatisticsSampleNotice data={model.data} evidenceCurrent={props.evidenceCurrent} />
      <StatisticsControls filter={model.filter} sort={model.sort} onFilter={model.onFilter} onSort={model.onSort} />
      <GroupsTable
        groups={model.groups}
        page={model.currentPage}
        selectedKey={model.groupKey}
        onOpen={(key, button) => {
          trigger.current = button;
          model.onOpen(key);
        }}
      />
      {!model.groups.length && <p>{t(COPY + (model.data.validCount === 0 ? 'noUsable' : 'noMatches'))}</p>}
      <LocalPagination
        page={model.currentPage}
        total={model.groups.length}
        onPage={model.onPage}
        label={t(COPY + 'groups')}
      />
      {model.selected && (
        <GroupDrilldown
          key={model.selected.key}
          group={model.selected}
          onClose={() => {
            model.onClose();
            (trigger.current?.isConnected ? trigger.current : container.current?.querySelector('input'))?.focus();
          }}
        />
      )}
    </section>
  );
}
