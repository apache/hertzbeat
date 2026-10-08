/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button, Drawer, Empty, Input, Popconfirm, Select, Space, Typography } from 'antd';
import { formatShortLocalTime } from '@/shared/time';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SavedQueryTimeSummary } from './saved-query-time-summary';
import { SavedQueryOriginal } from './explore-saved-query-original';

import { readSavedQuery, type SavedQueryRecord } from '../model/explore-saved-query-model';
import type { ExploreSignal } from '../model/explore-query';
import { type SavedQueriesViewModel, type SavedQueryGroup } from '../model/explore-saved-query-view-model';
import styles from './explore-saved-queries.module.css';

export function ExploreSavedQueryDrawer({ model }: { model: SavedQueriesViewModel }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ExploreSignal | 'all'>('all');
  const [inspected, setInspected] = useState<SavedQueryRecord>();
  const groups = matchingGroups(model.groups, filter, search);
  const count = groups.reduce((total, group) => total + group.records.length, 0);
  return (
    <>
      <Drawer open={model.open} onClose={() => model.setOpen(false)} title={t('exploreSaved.directory')} width={720}>
        <Typography.Paragraph type="secondary">{t('exploreSaved.shared')}</Typography.Paragraph>
        <Space wrap className={styles.toolbar!}>
          <Input
            aria-label={t('explore.savedDirectory.search')}
            placeholder={t('explore.savedDirectory.search')}
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
          <Select
            aria-label={t('exploreSaved.signal')}
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: t('exploreSaved.allSignals') },
              ...model.groups.map(group => ({ value: group.signal, label: t(`explore.signals.${group.signal}`) }))
            ]}
          />
          <Button onClick={model.refresh}>{t('common.refresh')}</Button>
        </Space>
        {model.error && !model.editor && (
          <Typography.Paragraph type="danger" role="alert">
            {t(`exploreSaved.${model.error}`)}
          </Typography.Paragraph>
        )}
        {groups.every(group => group.state === 'ready') && (
          <p role="status">{t('explore.savedDirectory.matches', { count })}</p>
        )}
        {count === 0 && groups.every(group => group.state === 'ready') && (search || filter !== 'all') && (
          <p>
            {t('explore.savedDirectory.noMatches')}{' '}
            <Button
              onClick={() => {
                setSearch('');
                setFilter('all');
              }}
            >
              {t('explore.clearFilters')}
            </Button>
          </p>
        )}
        {groups
          .filter(group => group.state !== 'ready' || group.records.length > 0 || (!search && filter === 'all'))
          .map(group => (
            <SavedQueryRows key={group.signal} group={group} model={model} inspect={setInspected} />
          ))}
      </Drawer>
      <SavedQueryOriginal record={inspected} onClose={() => setInspected(undefined)} />
    </>
  );
}

function SavedQueryRows({
  group,
  model,
  inspect
}: {
  group: SavedQueryGroup;
  model: SavedQueriesViewModel;
  inspect: (record: SavedQueryRecord) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className={styles.group} aria-label={t(`explore.signals.${group.signal}`)}>
      <h3>{t(`explore.signals.${group.signal}`)}</h3>
      {group.state !== 'ready' ? (
        <Typography.Paragraph role="status">{t(`exploreSaved.states.${group.state}`)}</Typography.Paragraph>
      ) : group.records.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('exploreSaved.empty')} />
      ) : (
        <ul className={styles.list}>
          {group.records.map(record => (
            <SavedQueryRow key={record.viewKey} record={record} model={model} inspect={inspect} />
          ))}
        </ul>
      )}
    </section>
  );
}

function SavedQueryRow({
  record,
  model,
  inspect
}: {
  record: SavedQueryRecord;
  model: SavedQueriesViewModel;
  inspect: (record: SavedQueryRecord) => void;
}) {
  const { t } = useTranslation();
  const result = readSavedQuery(record);
  return (
    <li className={styles.row}>
      <div className={styles.rowCopy}>
        <Typography.Text strong>{record.label}</Typography.Text>
        {record.description && <Typography.Text type="secondary">{record.description}</Typography.Text>}
        <Typography.Text type="secondary">
          {result.kind === 'ready' ? (
            <SavedQueryTimeSummary query={result.query} />
          ) : (
            t(`exploreSaved.reasons.${result.reason}`)
          )}
        </Typography.Text>
        <Typography.Text type="secondary">
          <span title={record.updateTime ?? undefined}>
            {t('exploreSaved.updated', { time: savedUpdatedTime(record.updateTime) ?? t('exploreSaved.unknownTime') })}
          </span>
        </Typography.Text>
      </div>
      <Space wrap size="small">
        <Popconfirm
          disabled={!model.dirty && !model.activeChanged && !model.editor}
          title={t(model.dirty ? 'exploreSaved.discardDraft' : 'common.unsavedChangesConfirm')}
          onConfirm={() => model.reopen(record, true)}
        >
          <Button
            disabled={result.kind !== 'ready' || model.busy}
            onClick={() => {
              if (!model.dirty && !model.activeChanged && !model.editor) model.reopen(record);
            }}
          >
            {t('exploreSaved.open')}
          </Button>
        </Popconfirm>
        <Button onClick={() => inspect(record)}>{t('exploreSaved.inspect')}</Button>
        {model.canWrite && (
          <Popconfirm title={t('exploreSaved.deleteConfirm')} onConfirm={() => void model.remove(record)}>
            <Button danger disabled={model.busy}>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        )}
      </Space>
    </li>
  );
}

function savedUpdatedTime(value: string | null | undefined) {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? formatShortLocalTime(timestamp, { date: true }) : undefined;
}

function matchingGroups(groups: SavedQueryGroup[], filter: ExploreSignal | 'all', search: string) {
  return groups
    .filter(group => filter === 'all' || filter === group.signal)
    .map(group => ({
      ...group,
      records: group.records.filter(record =>
        `${record.label} ${record.description ?? ''}`.toLowerCase().includes(search.toLowerCase())
      )
    }));
}
