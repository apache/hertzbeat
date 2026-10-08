/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { AutoComplete, Badge, Button, Input, Select, Space } from 'antd';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalCommandBar } from '@/shared/operational-page';
import { entitySortFields } from '../model/entity-contract';
import { entityTypes } from '../model/entity-editor-contract';
import { localizeEntityCode } from '../model/entity-display';
import type { EntityListViewActions, EntityListViewState } from '../model/entity-view-model';
import styles from './entity-view.module.css';

const advancedFilterKeys = ['owner', 'source', 'lifecycle', 'tier', 'system'] as const;
type EntityListViewProps = { state: EntityListViewState; actions: EntityListViewActions };

export function EntityFilters({ state, actions }: EntityListViewProps) {
  const { t } = useTranslation();
  const [advanced, setAdvanced] = useState(false);
  const advancedCount = advancedFilterKeys.filter(key => state.query[key].length > 0).length;
  return (
    <OperationalCommandBar
      role="search"
      primary={
        <div className={styles.filterStack}>
          <div className={styles.filters}>
            <Input.Search
              allowClear
              value={state.draft}
              placeholder={t('entity.filters.search')}
              onChange={event => actions.updateDraft(event.target.value)}
              onSearch={actions.submit}
            />
            <FilterInput filter="type" state={state} actions={actions} />
            <FilterInput filter="status" state={state} actions={actions} />
            <FilterInput filter="environment" state={state} actions={actions} />
            <SortFields state={state} actions={actions} />
          </div>
          {advanced ? <AdvancedFilters state={state} actions={actions} /> : null}
        </div>
      }
      secondary={
        <Badge count={advancedCount} size="small" className={styles.advancedToggle!}>
          <Button onClick={() => setAdvanced(value => !value)}>
            {t(advanced ? 'entity.filters.hideAdvanced' : 'entity.filters.showAdvanced')}
          </Button>
        </Badge>
      }
    />
  );
}

function AdvancedFilters({ state, actions }: EntityListViewProps) {
  return (
    <div className={styles.advancedFilters}>
      {advancedFilterKeys.map(filter => (
        <FilterInput key={filter} filter={filter} state={state} actions={actions} />
      ))}
    </div>
  );
}

function FilterInput({
  filter,
  state,
  actions
}: EntityListViewProps & { filter: Parameters<EntityListViewActions['changeFilter']>[0] }) {
  const { t } = useTranslation();
  const id = useId();
  const label = t(`entity.filters.${filter}`);
  return (
    <div className={styles.filterField}>
      <label htmlFor={id}>{label}</label>
      {filter === 'type' ? (
        <TypeFilter
          id={id}
          label={label}
          value={state.query.type}
          navigation={state.navigation}
          change={value => actions.changeFilter('type', value)}
        />
      ) : (
        <Input
          id={id}
          allowClear
          value={state.query[filter]}
          placeholder={label}
          onChange={event => actions.changeFilter(filter, event.target.value.trim())}
        />
      )}
    </div>
  );
}

function TypeFilter({
  id,
  label,
  value,
  navigation,
  change
}: {
  id: string;
  label: string;
  value: string;
  navigation?: EntityListViewState['navigation'];
  change: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const pending = useRef<string[]>([]);
  useEffect(() => {
    const acknowledged = navigation?.type === 'POP' ? -1 : pending.current.lastIndexOf(value);
    if (acknowledged >= 0) pending.current.splice(0, acknowledged + 1);
    else {
      pending.current = [];
      setText(value);
    }
  }, [value, navigation?.key, navigation?.type]);
  return (
    <AutoComplete
      id={id}
      allowClear
      value={editing ? text : value ? localizeEntityCode(t, 'type', value) : ''}
      onFocus={() => {
        setText(value);
        setEditing(true);
      }}
      onBlur={() => setEditing(false)}
      placeholder={label}
      options={entityTypes.map(value => ({ value, label: localizeEntityCode(t, 'type', value) }))}
      filterOption={(input, option) =>
        [option?.value, option?.label].some(value =>
          String(value ?? '')
            .toLowerCase()
            .includes(input.toLowerCase())
        )
      }
      onChange={next => {
        // Combobox clear emits undefined then an empty string; keep one history entry.
        if (typeof next !== 'string') return;
        setText(next);
        const canonical = next.trim();
        // URL acknowledgements must not replace newer keystrokes still being edited.
        if (canonical !== value) pending.current.push(canonical);
        change(canonical);
      }}
    />
  );
}

function SortFields({ state, actions }: EntityListViewProps) {
  const { t } = useTranslation();
  return (
    <Space.Compact>
      <Select
        aria-label={t('entity.sort.field')}
        value={state.query.sort}
        options={entitySortFields.map(value => ({ value, label: t(`entity.sort.${value}`) }))}
        onChange={sort => actions.changeSort(sort, state.query.order)}
      />
      <Select
        aria-label={t('entity.sort.order')}
        value={state.query.order}
        options={['asc', 'desc'].map(value => ({ value, label: t(`entity.sort.${value}`) }))}
        onChange={order => actions.changeSort(state.query.sort, order)}
      />
    </Space.Compact>
  );
}
