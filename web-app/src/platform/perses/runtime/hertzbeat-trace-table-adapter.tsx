import { traceDisplayColumns } from './perses-trace-display-columns';
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

import { ItemActionsProvider, SelectionProvider } from '@perses-dev/components';
import { DataTable, type TraceTableData } from '@perses-dev/trace-table-plugin';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { traceTableColumns } from './perses-trace-table-columns';
import type { TraceTableHost } from './perses-trace-table-model';
import styles from './perses-trace-table.module.css';

export function HertzBeatTraceTableAdapter(props: TraceTableHost & { data: TraceTableData }) {
  const { t } = useTranslation();
  const { rows, links, unavailableLinks, onNavigate } = props;
  const columns = useMemo(
    () => traceTableColumns({ rows, links, unavailableLinks, onNavigate }, t),
    [rows, links, unavailableLinks, onNavigate, t]
  );
  const result = useMemo(
    () => [
      {
        definition: {
          kind: 'TraceQuery' as const,
          spec: { plugin: { kind: 'HertzBeatSnapshotTraceQuery', spec: {} } }
        },
        data: props.data
      }
    ],
    [props.data]
  );
  return (
    <div className={styles.table} aria-label={t('explore.perses.traceTable.scrollHint')} tabIndex={0}>
      <SelectionProvider>
        <ItemActionsProvider>
          <DataTable
            result={result}
            options={{}}
            {...(props.display ? { displayColumns: traceDisplayColumns(props, props.display, t) } : {})}
            density={props.display?.density === 'compact' ? 'compact' : 'standard'}
            columnOverrides={columns}
            {...(props.serverPagination ? { serverPagination: props.serverPagination } : {})}
          />
        </ItemActionsProvider>
      </SelectionProvider>
    </div>
  );
}
