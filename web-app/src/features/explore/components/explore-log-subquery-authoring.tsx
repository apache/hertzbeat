/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useContext } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { Button, Select } from 'antd';
import type { TFunction } from 'i18next';
import type { LogSearchSuggestions } from '../model/explore-log-search-authoring';
import type { LogFacetField } from '../model/explore-log-facets';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import { readDraftSubquery, type LogSubquery } from '../model/explore-log-subquery';
import { LogFacetVisibilityContext } from './explore-log-facet-visibility-context';
import { ExploreLogSearchInput } from './explore-log-search-input';
import styles from './explore-log-subquery-authoring.module.css';

type Props = {
  value: LogSubquery;
  t: TFunction;
  onChange: (next: LogSubquery) => void;
  onRemove: () => void;
  onSubmit?: (() => void) | undefined;
  error?: boolean | undefined;
  fields?: LogFacetField[] | undefined;
  suggestions?: LogSearchSuggestions | undefined;
};
type Controls = Pick<Props, 'value' | 't' | 'onChange' | 'fields'> & {
  options: Array<{ value: string; label: string }>;
};

export function ExploreLogSubqueryAuthoring({
  value,
  t,
  onChange,
  onRemove,
  onSubmit,
  error,
  fields = [],
  suggestions
}: Props) {
  const visibleFacets = useContext(LogFacetVisibilityContext);
  const options = fieldOptions(value, visibleFacets?.displayedFacetIds, t);
  return (
    <div className={styles.root} role="group" aria-label={t('explore.logSubquery.label')} data-log-subquery-authoring>
      <div className={styles.line}>
        <div className={styles.predicate}>
          <SubqueryMain {...{ value, options, t, onChange }} />
          <SubqueryRank {...{ value, options, t, onChange, fields }} />
        </div>
        <div className={styles.meta}>
          <span className={styles.keyword}>{t('explore.logSubquery.from')}</span>
          <div className={styles.search}>
            <ExploreLogSearchInput
              value={value.child.search}
              syntax={value.child.searchSyntax}
              suggestions={suggestions}
              t={t}
              onChange={search => onChange({ ...value, child: { ...value.child, search } })}
              onSubmit={onSubmit}
            />
          </div>
          <span className={styles.keyword}>{t('explore.logSubquery.sortedBy')}</span>
          <span className={styles.keyword}>
            {t(
              value.rank.measure.function === 'count_all'
                ? 'explore.logSubquery.countOf'
                : 'explore.logSubquery.countUniqueOf'
            )}
          </span>
          <Select
            className={styles.field ?? ''}
            aria-label={t('explore.logSubquery.sortedBy')}
            popupMatchSelectWidth={false}
            virtual={false}
            value={value.rank.measure.function === 'count_all' ? 'all' : value.rank.measure.field}
            options={[
              { value: 'all', label: t('explore.logSubquery.allLogs') },
              ...metricFieldOptions(value, fields, t)
            ]}
            onChange={field =>
              onChange({
                ...value,
                rank: {
                  ...value.rank,
                  measure: field === 'all' ? { function: 'count_all' } : { function: 'count_distinct', field }
                }
              })
            }
          />
        </div>
        <Button
          type="text"
          className={styles.remove ?? ''}
          onClick={onRemove}
          aria-label={t('explore.logSubquery.remove')}
        >
          <CloseOutlined aria-hidden="true" />
        </Button>
      </div>
      {error && <p role="alert">{t('explore.logSubquery.invalid')}</p>}
    </div>
  );
}

function SubqueryMain({ value, options, t, onChange }: Controls) {
  return (
    <>
      <span className={styles.keyword}>{t('explore.logSubquery.where')}</span>
      <Select
        className={styles.field ?? ''}
        aria-label={t('explore.logSubquery.mainField')}
        popupMatchSelectWidth={false}
        virtual={false}
        value={value.mainField}
        options={options}
        onChange={mainField => onChange({ ...value, mainField })}
      />
      <Select
        className={styles.operator ?? ''}
        aria-label={t('explore.logSubquery.operator')}
        popupMatchSelectWidth={false}
        value={value.operator}
        options={[
          { value: 'in', label: t('explore.logSubquery.in') },
          { value: 'not_in', label: t('explore.logSubquery.notIn') }
        ]}
        onChange={operator => onChange({ ...value, operator })}
      />
    </>
  );
}

function SubqueryRank({ value, options, t, onChange }: Controls) {
  return (
    <>
      <Select
        className={styles.direction ?? ''}
        aria-label={t('explore.logSubquery.rank')}
        popupMatchSelectWidth={false}
        value={value.rank.direction}
        options={[
          { value: 'top', label: t('explore.logSubquery.top') },
          { value: 'bottom', label: t('explore.logSubquery.bottom') }
        ]}
        onChange={direction => onChange({ ...value, rank: { ...value.rank, direction } })}
      />
      <Select
        aria-label={t('explore.logSubquery.limit')}
        value={value.rank.limit}
        virtual={false}
        options={rankLimitOptions(value.rank.limit)}
        onChange={limit => onChange({ ...value, rank: { ...value.rank, limit } })}
      />
      <Select
        className={styles.field ?? ''}
        aria-label={t('explore.logSubquery.childField')}
        popupMatchSelectWidth={false}
        virtual={false}
        value={value.child.field}
        options={options}
        onChange={field => onChange({ ...value, child: { ...value.child, field } })}
      />
    </>
  );
}

function rankLimitOptions(current: number) {
  const limits = [2, 5, 10, 15, 25, 30, 50, 100, 250, 500, 1000];
  if (!limits.includes(current)) limits.push(current);
  return limits
    .sort((left, right) => left - right)
    .map(limit => ({ value: limit, label: limit === 1000 ? '1K' : String(limit) }));
}

function metricFieldOptions(value: LogSubquery, fields: LogFacetField[], t: TFunction) {
  const options: Array<{ value: string; label: string; disabled?: boolean }> = fields
    .filter(field => field.scalar === true)
    .map(field => ({ value: field.id, label: fieldLabel(field.id, t) }));
  const measure = value.rank.measure;
  if (measure.function === 'count_distinct' && !options.some(field => field.value === measure.field)) {
    options.push({ value: measure.field, label: fieldLabel(measure.field, t), disabled: true });
  }
  return options;
}

function fieldOptions(value: LogSubquery, displayedFacetIds: string[] | undefined, t: TFunction) {
  const ids = new Set([value.mainField, value.child.field, ...(displayedFacetIds ?? [])]);
  return [...ids].map(id => ({ value: id, label: fieldLabel(id, t) }));
}

function fieldLabel(id: string, t: TFunction) {
  const separator = id.indexOf(':');
  const source = id.slice(0, separator);
  const key = id.slice(separator + 1);
  if (id === 'resource:host.name') return t('explore.logFacets.core.host');
  if (source === 'builtin') return t(`explore.logFacets.builtin.${key}`);
  return `${source === 'resource' ? 'resource.' : '@'}${key.replaceAll(':', '\\:')}`;
}

export function ExploreLogSubqueryDraft({
  submission,
  t,
  onSubmit,
  fields,
  suggestions
}: {
  submission: ExploreSubmissionViewModel;
  t: TFunction;
  onSubmit?: (() => void) | undefined;
  fields?: LogFacetField[] | undefined;
  suggestions?: LogSearchSuggestions | undefined;
}) {
  const draft = submission.draft;
  if (draft.signal !== 'logs' || draft.logSubquery === undefined) return null;
  return (
    <ExploreLogSubqueryAuthoring
      value={readDraftSubquery(draft.logSubquery)}
      t={t}
      error={Boolean(submission.errors.logSubquery)}
      onSubmit={onSubmit}
      fields={fields}
      suggestions={suggestions}
      onChange={value => submission.updateField({ field: 'logSubquery', value: JSON.stringify(value) })}
      onRemove={() => submission.updateField({ field: 'logSubquery', value: undefined })}
    />
  );
}
