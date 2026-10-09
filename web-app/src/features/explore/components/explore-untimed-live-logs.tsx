/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useTranslation } from 'react-i18next';
import { formatShortLocalTimeRange } from '@/shared/time';
import type { LogRow } from '../model/explore-signal-contract';
import type { LogExploreQuery } from '../model/explore-query';
import type { LogInspectorFilterControls } from '../model/explore-log-inspector-filter';
import type { LogColumnControls } from '../model/explore-log-columns';
import { liveTraceWindow } from '../model/explore-live-log-model';
import { logBody } from '../model/explore-signal-model';
import { ExploreLogInspector } from './explore-log-inspector';
import { traceAction } from './log-trace-action';
import { useLogSelection } from './use-log-selection';
import styles from './explore-live-log.module.css';
export function UntimedLiveLogs({
  rows,
  query,
  navigate,
  onSelectionChange,
  ...controls
}: LogInspectorFilterControls & {
  onSelectionChange: () => void;
  rows: LogRow[];
  query: LogExploreQuery;
  navigate: (path: string) => void;
  logColumns?: LogColumnControls | undefined;
}) {
  const { t } = useTranslation();
  const {
    selectedRow: row,
    selectedIndex,
    selectedAt,
    selectRow,
    closeInspector
  } = useLogSelection(rows, 'untimed', true, 'preserve', onSelectionChange, true);
  const window = row ? liveTraceWindow(query.timeRange, row, selectedAt!) : undefined;
  if (rows.length === 0 && !row) return null;
  return (
    <section className={styles.untimed} aria-label={t('explore.liveFlow.untimed')}>
      {rows.length > 0 && <p>{t('explore.liveFlow.untimed')}</p>}
      <ul>
        {rows.map((row, index) => (
          <li key={index}>
            <button onClick={() => selectRow(index)}>{logBody(row) ?? t('explore.perses.notRecorded')}</button>
          </li>
        ))}
      </ul>
      {row && window && (
        <ExploreLogInspector
          {...controls}
          id="live-untimed-inspector"
          row={row}
          selectedIndex={selectedIndex}
          rowCount={rows.length}
          scopeHint={`${t('explore.liveFlow.pivotWindow')}: ${formatShortLocalTimeRange(window.from, window.to)}`}
          evidenceCurrent
          onSelectIndex={selectRow}
          onOpenTrace={traceAction(row, query, window, navigate)}
          onClose={() => closeInspector(false)}
        />
      )}
    </section>
  );
}
