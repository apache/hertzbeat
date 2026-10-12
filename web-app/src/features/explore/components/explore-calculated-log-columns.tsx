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

import type { CalculatedPageResponse, LogRow } from '../model/explore-signal-contract';
import type { LogExploreQuery } from '../model/explore-query';
import type { LogSortControls } from '../model/explore-log-order';
import { readLogSort } from '../model/explore-log-order';
import type { TFunction } from 'i18next';
import { ExploreCalculatedSortHeader } from './explore-log-order';
import type { HertzBeatLogColumn } from '@/platform/perses';

export function calculatedLogColumns(
  rows: LogRow[],
  calculated: CalculatedPageResponse | undefined,
  query: LogExploreQuery,
  controls: LogSortControls | undefined,
  t: TFunction
): HertzBeatLogColumn[] {
  const sorted = readLogSort(query.logSort);
  return (
    calculated?.executed.calculatedFields.fields
      .flatMap(field => field.outputs)
      .map(output => ({
        id: `calculated:${output.name}`,
        label: `#${output.name}`,
        ariaSort:
          sorted?.field === `calculated:${output.name}`
            ? sorted.direction === 'asc'
              ? ('ascending' as const)
              : ('descending' as const)
            : undefined,
        header: (
          <ExploreCalculatedSortHeader
            name={output.name}
            type={output.type}
            controls={controls}
            t={t}
            direction={
              sorted?.field === `calculated:${output.name}`
                ? sorted.direction === 'asc'
                  ? 'ascending'
                  : 'descending'
                : undefined
            }
          />
        ),
        kind: 'field' as const,
        getValue: (index: number) => {
          const row = rows[index];
          const value = calculated.result.rows.find(item => item.log === row)?.derived[output.name];
          return value == null ? undefined : String(value);
        }
      })) ?? []
  );
}

export function selectedCalculatedValues(calculated: CalculatedPageResponse | undefined, selectedRow: LogRow) {
  return calculated?.result.rows.find(item => item.log === selectedRow)?.derived;
}
