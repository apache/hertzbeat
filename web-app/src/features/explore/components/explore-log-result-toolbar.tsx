/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { LogSortControls } from '../model/explore-log-order';
import type { LogColumn, LogColumnControls } from '../model/explore-log-columns';
import { Popover } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { TFunction } from 'i18next';

import type { ExactTimeWindow } from '@/shared/query-context';

import type { LogExploreQuery } from '../model/explore-query';
import type { LogHistoryEvidence } from '../model/explore-signal-contract';
import type { ExploreLogDisplayPreferences } from './explore-log-display-preferences';
import { ExploreHistoryPagination } from './explore-history-pagination';
import { ExploreLogResultOptions } from './explore-log-result-options';
import styles from './explore-log-result-toolbar.module.css';

export function ExploreLogResultToolbar({
  logColumns,
  logOrder,
  availableColumns,
  page,
  query,
  timeWindow,
  evidenceCurrent,
  preferences,
  onPreferencesChange,
  openPath,
  t
}: {
  logOrder?: LogSortControls | undefined;
  logColumns?: LogColumnControls | undefined;
  availableColumns?: LogColumn[] | undefined;
  page: LogHistoryEvidence['page'];
  query: LogExploreQuery;
  timeWindow: ExactTimeWindow;
  evidenceCurrent: boolean;
  preferences: ExploreLogDisplayPreferences;
  onPreferencesChange: (preferences: ExploreLogDisplayPreferences) => void;
  openPath: (path: string) => void;
  t: TFunction;
}) {
  return (
    <div className={styles.toolbar} role="group" aria-label={t('explore.perses.resultToolbar')}>
      <ExploreLogResultOptions
        {...{ logColumns, availableColumns, logOrder, query, preferences, onPreferencesChange, t }}
      />
      <ResultStatus page={page} query={query} timeWindow={timeWindow} t={t} />
      <ExploreHistoryPagination
        page={page}
        query={query}
        enabled={evidenceCurrent}
        openPath={openPath}
        t={t}
        variant="compact"
      />
    </div>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div aria-label={`${label}: ${value}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ResultStatus({
  page,
  query,
  timeWindow,
  t
}: Pick<Parameters<typeof ExploreLogResultToolbar>[0], 'page' | 'query' | 'timeWindow' | 't'>) {
  const exactWindow = `${new Date(timeWindow.from).toISOString()} – ${new Date(timeWindow.to).toISOString()}`;
  const currentPage = page.totalPages === 0 ? 0 : (query.pageIndex ?? page.number) + 1;
  return (
    <>
      <Popover
        trigger="click"
        placement="bottomRight"
        content={
          <dl className={styles.details}>
            <Status
              label={t('explore.perses.returnedStatus')}
              value={`${page.content.length.toLocaleString()} / ${page.totalElements.toLocaleString()}`}
            />
            <Status label={t('explore.perses.windowStatus')} value={exactWindow} />
            <Status label={t('explore.perses.provenance')} value={t('explore.perses.historicalEvidence')} />
          </dl>
        }
      >
        <button type="button" className={styles.detailsButton} aria-label={t('explore.perses.queryDetails')}>
          <InfoCircleOutlined aria-hidden />
        </button>
      </Popover>
      <dl className={styles.status}>
        <Status
          label={t('explore.perses.pageStatus')}
          value={`${currentPage.toLocaleString()} / ${page.totalPages.toLocaleString()}`}
        />
      </dl>
    </>
  );
}
