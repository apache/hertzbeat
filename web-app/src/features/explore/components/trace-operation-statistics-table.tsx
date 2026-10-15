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
import { formatOperationDuration, type OperationGroup } from '../model/trace-operation-statistics';
import {
  OperationLiteral as Literal,
  TRACE_OPERATION_PAGE_SIZE as PAGE_SIZE
} from './trace-operation-statistics-primitives';
import styles from './trace-operation-statistics.module.css';
const COPY = 'exploreInvestigation.trace.operationStatistics.';
function GroupRow({
  group,
  selected,
  onOpen
}: {
  group: OperationGroup;
  selected: boolean;
  onOpen: (button: HTMLButtonElement) => void;
}) {
  const { t } = useTranslation();
  return (
    <tr data-operation-group={group.key} data-selected={selected}>
      <td>
        <Literal value={group.serviceName} />
      </td>
      <td>
        <button
          className={styles.operation}
          type="button"
          onClick={event => onOpen(event.currentTarget)}
          aria-expanded={selected}
        >
          <Literal value={group.spanName} />
        </button>
      </td>
      <td>{group.count}</td>
      <td title={`${group.sumNanos} ns / ${group.count}`}>{formatOperationDuration(group.sumNanos, group.count)}</td>
      <td title={`${group.sumNanos} ns`}>{formatOperationDuration(group.sumNanos)}</td>
      <td title={t(COPY + 'selfExplanation') + ` (${group.selfNanos} ns)`}>
        {formatOperationDuration(group.selfNanos)}
      </td>
    </tr>
  );
}

export function GroupsTable({
  groups,
  page,
  selectedKey,
  onOpen
}: {
  groups: OperationGroup[];
  page: number;
  selectedKey: string | null;
  onOpen: (key: string, button: HTMLButtonElement) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.tableScroll}>
      <table aria-label={t(COPY + 'groups')}>
        <thead>
          <tr>
            {['service', 'operation', 'count', 'average', 'sum', 'self'].map(key => (
              <th key={key} scope="col">
                {t(COPY + key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(group => (
            <GroupRow
              key={group.key}
              group={group}
              selected={group.key === selectedKey}
              onOpen={button => onOpen(group.key, button)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
