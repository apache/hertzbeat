/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useMemo, useState } from 'react';
import { Button, Checkbox, Input, Select } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import type { SavedQueryRecord } from '../model/explore-saved-query-model';
import {
  pendingSavedViewChanges,
  type SavedQueriesViewModel,
  type SavedQueryGroup
} from '../model/explore-saved-query-view-model';
import { SavedQueryOriginal } from './explore-saved-query-original';
import { ViewsRailEditor } from './explore-logs-view-editor';
import { SavedViewRow } from './explore-logs-view-row';
import { orderSavedViews, savedViewSortOptions } from '../model/explore-saved-view-directory';
import styles from './explore-logs-saved-views.module.css';
import { ExploreViewTrigger } from './explore-view-trigger';
import { savedViewTriggerLabel } from './saved-view-trigger-label';
import { dismissViews } from './dismiss-logs-views';
import { DefaultViewRow } from './explore-logs-default-view-row';

const defaultDirectoryPreferences = { sort: 'default' as const, onlyMine: false, favoriteKeys: [], recentKeys: [] };

export function ExploreLogsViewTrigger({ model }: { model: SavedQueriesViewModel }) {
  const { t } = useTranslation();
  const activeLabel = savedViewTriggerLabel(model, t);
  return (
    <div className={styles.triggerBar}>
      <ExploreViewTrigger
        id="explore-logs-views-trigger"
        aria-controls="explore-logs-views"
        aria-expanded={model.open}
        title={activeLabel}
        onClick={() => model.setOpen(!model.open)}
        onKeyDown={event => dismissViews(event, model)}
      >
        {activeLabel}
      </ExploreViewTrigger>
      {model.activeChanged && (
        <Button
          className={styles.triggerSave ?? ''}
          type="link"
          disabled={!model.canWrite || model.saveBlocked || model.busy || Boolean(model.editor)}
          onClick={() => void model.updateActive?.()}
        >
          {t('exploreSaved.saveChanges')}
        </Button>
      )}
    </div>
  );
}

export function ExploreLogsViewsRail({ model }: { model: SavedQueriesViewModel }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [inspected, setInspected] = useState<SavedQueryRecord>();
  const group = model.groups.find(item => item.signal === 'logs');
  const preferences = useMemo(
    () => model.directoryPreferences ?? defaultDirectoryPreferences,
    [model.directoryPreferences]
  );
  const records = useMemo(() => {
    const filtered = group?.records.filter(
      record =>
        (!preferences.onlyMine || Boolean(model.username && record.creator === model.username)) &&
        `${record.label} ${record.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())
    );
    return filtered ? orderSavedViews(filtered, preferences) : undefined;
  }, [group?.records, model.username, preferences, search]);
  const pendingChanges = pendingSavedViewChanges(model);
  if (!model.open) return null;
  return (
    <>
      <aside
        id="explore-logs-views"
        className={styles.rail}
        aria-label={t('exploreSaved.views')}
        onKeyDown={event => dismissViews(event, model)}
      >
        <ViewsRailHeader model={model} search={search} setSearch={setSearch} preferences={preferences} />
        {model.dirty && <p role="status">{t('exploreSaved.applyFirst')}</p>}
        {model.error && <p role="alert">{t(`exploreSaved.${model.error}`)}</p>}
        {model.activeUnavailable && !model.activeLoading && <p role="alert">{t('exploreSaved.activeUnavailable')}</p>}
        <div className={styles.list}>
          {!search && <DefaultViewRow model={model} pendingChanges={pendingChanges} />}
          <ViewsRailList group={group} records={records} model={model} inspect={setInspected} />
        </div>
      </aside>
      <SavedQueryOriginal record={inspected} onClose={() => setInspected(undefined)} />
    </>
  );
}

function ViewsRailHeader({
  model,
  search,
  setSearch,
  preferences
}: {
  model: SavedQueriesViewModel;
  search: string;
  setSearch: (value: string) => void;
  preferences: NonNullable<SavedQueriesViewModel['directoryPreferences']>;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.railTop}>
      {model.editor ? (
        <ViewsRailEditor model={model} />
      ) : (
        <>
          <Button
            className={styles.saveNew ?? ''}
            type="primary"
            icon={<PlusOutlined aria-hidden />}
            disabled={!model.canWrite || model.saveBlocked || model.busy}
            onClick={() => model.begin(model.active ? 'copy' : 'create')}
          >
            {t('exploreSaved.saveNewView')}
          </Button>
          <Input
            allowClear
            prefix={<SearchOutlined aria-hidden />}
            placeholder={t('exploreSaved.filterViews')}
            aria-label={t('exploreSaved.filterViews')}
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
          <Select
            aria-label={t('exploreSaved.sort')}
            value={preferences.sort}
            options={savedViewSortOptions.map(value => ({ value, label: t(`exploreSaved.sortOptions.${value}`) }))}
            onChange={value => model.setDirectorySort?.(value)}
          />
          <Checkbox
            checked={preferences.onlyMine}
            disabled={!model.username}
            onChange={event => model.setOnlyMine?.(event.target.checked)}
          >
            {t('exploreSaved.onlyMine')}
          </Checkbox>
        </>
      )}
    </div>
  );
}

function ViewsRailList({
  group,
  records,
  model,
  inspect
}: {
  group: SavedQueryGroup | undefined;
  records: SavedQueryRecord[] | undefined;
  model: SavedQueriesViewModel;
  inspect: (record: SavedQueryRecord) => void;
}) {
  const { t } = useTranslation();
  if (group?.state !== 'ready') return <p role="status">{t(`exploreSaved.states.${group?.state ?? 'loading'}`)}</p>;
  if (!records?.length) return <p role="status">{t('explore.savedDirectory.noMatches')}</p>;
  return records.map(record => (
    <SavedViewRow
      key={record.viewKey}
      record={record}
      model={model}
      inspect={inspect}
      favorite={Boolean(model.directoryPreferences?.favoriteKeys.includes(record.viewKey))}
    />
  ));
}
