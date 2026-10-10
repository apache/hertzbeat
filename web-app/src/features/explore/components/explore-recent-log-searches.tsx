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

import { recentLogSearchSummary } from '../model/explore-recent-log-search-summary';
import styles from './explore-recent-log-searches.module.css';
import { useEffect, useRef, useState } from 'react';
import { Button, Popover, Empty, Input, List, Typography, type InputRef } from 'antd';
import type { TFunction } from 'i18next';
import type { LogExploreSubmissionDraft } from '../model/explore-submission-model';
import type { RecentLogSearchesViewModel } from '../model/explore-recent-log-searches';

export function ExploreRecentLogSearches({
  history,
  restore,
  t
}: {
  history: RecentLogSearchesViewModel;
  restore: (draft: LogExploreSubmissionDraft) => void;
  t: TFunction;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <Popover
      trigger="click"
      destroyOnHidden
      open={open}
      onOpenChange={setOpen}
      getPopupContainer={element => element.ownerDocument.body}
      placement="bottomRight"
      title={t('explore.recentLogs.title')}
      content={<RecentSearchPopup history={history} restore={restore} t={t} close={close} />}
    >
      <Button
        ref={trigger}
        onClick={event => event.stopPropagation()}
        type="text"
        size="small"
        aria-expanded={open}
        onKeyDown={event => {
          if (event.key === 'Escape') close();
        }}
      >
        {t('explore.recentLogs.title')}
      </Button>
    </Popover>
  );
}

function RecentSearchRow({
  entry,
  t,
  remove,
  restore
}: {
  entry: import('../model/explore-recent-log-searches').RecentLogSearch;
  t: TFunction;
  remove: () => void;
  restore: (draft: LogExploreSubmissionDraft) => void;
}) {
  const summary = recentLogSearchSummary(entry, t);
  return (
    <List.Item
      actions={[
        <Button
          key="remove"
          type="text"
          onClick={remove}
          aria-label={t('explore.recentLogs.remove', { query: entry.query || t('explore.recentLogs.all') })}
        >
          {t('common.delete')}
        </Button>
      ]}
    >
      <div className={styles.entry}>
        <Button
          type="link"
          className={styles.query ?? ''}
          onClick={() => {
            restore(entry);
          }}
        >
          {entry.query || t('explore.recentLogs.all')}
        </Button>
        {summary && <div>{summary}</div>}
        <Typography.Text type="secondary">{t('explore.recentLogs.statusUnknown')}</Typography.Text>
        <Typography.Text type="secondary">
          {new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(entry.executedAt)}
        </Typography.Text>
      </div>
    </List.Item>
  );
}

function RecentSearchPopup({
  history,
  restore,
  t,
  close
}: {
  history: RecentLogSearchesViewModel;
  restore: (draft: LogExploreSubmissionDraft) => void;
  t: TFunction;
  close: () => void;
}) {
  const [search, setSearch] = useState('');
  const searchInput = useRef<InputRef>(null);
  useEffect(() => {
    searchInput.current?.focus();
  }, []);

  return (
    <div
      className={styles.popup}
      role="region"
      data-log-command-skip-submit
      aria-label={t('explore.recentLogs.title')}
      tabIndex={0}
      onClick={event => event.stopPropagation()}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          close();
        }
      }}
    >
      <Typography.Paragraph type="secondary">{t('explore.recentLogs.hint')}</Typography.Paragraph>
      <Input.Search
        ref={searchInput}
        value={search}
        aria-label={t('explore.recentLogs.search')}
        placeholder={t('explore.recentLogs.search')}
        allowClear
        onChange={event => setSearch(event.target.value)}
      />
      <RecentSearchList
        history={history}
        search={search}
        t={t}
        restore={draft => {
          restore(draft);
          close();
        }}
      />
      <Button type="text" disabled={!history.entries.length} onClick={history.clear}>
        {t('explore.recentLogs.clear')}
      </Button>
    </div>
  );
}

function RecentSearchList({
  history,
  search,
  t,
  restore
}: {
  history: RecentLogSearchesViewModel;
  search: string;
  t: TFunction;
  restore: (draft: LogExploreSubmissionDraft) => void;
}) {
  return (
    <List
      className={styles.list ?? ''}
      dataSource={history.entries.filter(entry =>
        Object.entries(entry).some(
          ([key, value]) =>
            key !== 'executedAt' &&
            key !== 'signal' &&
            typeof value === 'string' &&
            value.toLowerCase().includes(search.toLowerCase())
        )
      )}
      locale={{
        emptyText: (
          <Empty
            description={t(history.entries.length ? 'explore.recentLogs.noMatches' : 'explore.recentLogs.empty')}
          />
        )
      }}
      renderItem={entry => (
        <RecentSearchRow
          entry={entry}
          t={t}
          remove={() => history.remove(history.entries.indexOf(entry))}
          restore={restore}
        />
      )}
    />
  );
}
