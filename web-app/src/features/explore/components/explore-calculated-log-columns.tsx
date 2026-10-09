/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
