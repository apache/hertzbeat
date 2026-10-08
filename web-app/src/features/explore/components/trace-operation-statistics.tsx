/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
