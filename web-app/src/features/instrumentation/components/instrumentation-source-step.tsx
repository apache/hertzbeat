/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { Input, Select, Space, Tag, Typography } from 'antd';
import type { TFunction } from 'i18next';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  APPLICATION_QUESTIONS,
  applicationQuestionOptions,
  answerApplicationQuestion,
  selectSource,
  type ApplicationQuestion,
  type InstrumentationDraft
} from '../model/instrumentation-flow';
import { SIGNALS, type CatalogResponse, type Recipe, type SourceEntry } from '../model/instrumentation-v2-contract';
import { translateBackend } from './instrumentation-i18n';
import { InstrumentationSourceCategoryRail } from './instrumentation-source-category-rail';
import { InstrumentationSourceIcon } from './instrumentation-source-icon';
import styles from './instrumentation-shell.module.css';

export function InstrumentationSourceStep(props: {
  catalog: CatalogResponse;
  sourceId?: string;
  recipeId?: string;
  framework?: string;
  method?: string;
  environment?: string;
  platform?: string;
  onSource: (sourceId: string) => void;
  onApplicationAnswer: (field: ApplicationQuestion, value: string) => void;
}) {
  const { t } = useTranslation();
  const draft = buildDraft(props);
  return (
    <section className={styles.section} aria-labelledby="instrumentation-source-title">
      <Typography.Title id="instrumentation-source-title" level={4}>
        {t('instrumentation.v2.connectTitle')}
      </Typography.Title>
      <SourceDirectory {...props} />
      {draft?.sourceKind === 'application' && <ApplicationQuestions {...props} draft={draft} />}
    </section>
  );
}

function SourceDirectory(props: Parameters<typeof InstrumentationSourceStep>[0]) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [groupId, setGroupId] = useState<string>();
  const visible = useMemo(() => filteredSources(props.catalog, groupId, query, t), [groupId, props.catalog, query, t]);
  return (
    <>
      <Input.Search
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder={t('instrumentation.v2.directory.search')}
      />
      <div className={styles.directory}>
        <div className={styles.sourceList}>
          {props.catalog.groups.map(group => {
            const entries = sourcesForGroup(visible, group.id, groupId, query);
            return entries.length ? (
              <section key={group.id} className={styles.sourceGroup}>
                <Typography.Text strong>{translateBackend(t, group.labelKey)}</Typography.Text>
                {entries.map(source => (
                  <SourceRow
                    key={source.id}
                    source={source}
                    selected={source.id === props.sourceId}
                    onSelect={props.onSource}
                  />
                ))}
              </section>
            ) : null;
          })}
        </div>
        <InstrumentationSourceCategoryRail
          catalog={props.catalog}
          {...(groupId ? { groupId } : {})}
          onGroup={setGroupId}
        />
      </div>
    </>
  );
}

function SourceRow(props: { source: SourceEntry; selected: boolean; onSelect: (sourceId: string) => void }) {
  const { t } = useTranslation();
  const source = props.source;
  return (
    <button
      type="button"
      className={`${styles.sourceRow} ${props.selected ? styles.sourceRowSelected : ''}`}
      disabled={source.support === 'unsupported'}
      onClick={() => props.onSelect(source.id)}
    >
      <InstrumentationSourceIcon source={source} />
      <span className={styles.sourceCopy}>
        <strong>{translateBackend(t, source.labelKey)}</strong>
        <Typography.Text type="secondary">{translateBackend(t, source.descriptionKey)}</Typography.Text>
      </span>
      <span className={styles.capabilities}>
        {SIGNALS.map(signal => (
          <span key={signal} data-capability={source.signals[signal]}>
            {t(`instrumentation.signal.${signal}`)}
          </span>
        ))}
      </span>
      <Tag color={supportTagColor(source.support)}>{t(`instrumentation.capability.${source.support}`)}</Tag>
    </button>
  );
}

function supportTagColor(support: SourceEntry['support']) {
  if (support === 'preview') return 'warning';
  if (support === 'supported') return 'success';
  return 'default';
}

function ApplicationQuestions(
  props: Parameters<typeof InstrumentationSourceStep>[0] & {
    draft: InstrumentationDraft;
  }
) {
  const { t } = useTranslation();
  const selectedRecipe = props.catalog.recipes.find(recipe => recipe.id === props.draft.recipeId);
  const question = APPLICATION_QUESTIONS.find(
    field => !props.draft[field] && applicationQuestionOptions(props.catalog, props.draft, field).length > 1
  );
  return (
    <Space direction="vertical" className={styles.fullWidth!}>
      {question && (
        <label className={styles.question}>
          <Typography.Text strong>
            {t(`instrumentation.field.${question === 'environment' ? 'deploymentEnvironment' : question}`)}
          </Typography.Text>
          <Select
            className={styles.questionSelect!}
            value={props[question] ?? null}
            placeholder={t('instrumentation.v2.questionPlaceholder')}
            options={applicationQuestionOptions(props.catalog, props.draft, question).map(value => ({
              value,
              label: t(`instrumentation.${question}.${value}`, { defaultValue: value })
            }))}
            onChange={value => props.onApplicationAnswer(question, value)}
          />
        </label>
      )}
      {selectedRecipe && (
        <Typography.Text type="secondary">
          {translateRecipe(t, selectedRecipe)}
          {selectedRecipe.preview && <Tag color="warning">{t('instrumentation.preview')}</Tag>}
        </Typography.Text>
      )}
    </Space>
  );
}

function buildDraft(props: Parameters<typeof InstrumentationSourceStep>[0]): InstrumentationDraft | undefined {
  if (!props.sourceId) return undefined;
  let draft = selectSource(props.catalog, props.sourceId);
  for (const field of APPLICATION_QUESTIONS) {
    const value = props[field];
    if (value && draft[field] !== value) draft = answerApplicationQuestion(draft, props.catalog, field, value);
  }
  return draft;
}

function filteredSources(catalog: CatalogResponse, groupId: string | undefined, query: string, t: TFunction) {
  const needle = query.trim().toLocaleLowerCase();
  return catalog.sources.filter(source => {
    if (!needle) return !groupId || source.groupIds.includes(groupId);
    return [source.id, translateBackend(t, source.labelKey), translateBackend(t, source.descriptionKey)].some(value =>
      value.toLocaleLowerCase().includes(needle)
    );
  });
}

function sourcesForGroup(sources: SourceEntry[], groupId: string, selectedGroupId: string | undefined, query: string) {
  const activeGroupId = query.trim() ? undefined : selectedGroupId;
  if (activeGroupId) return activeGroupId === groupId ? sources : [];
  return sources.filter(source => source.groupIds[0] === groupId);
}

function translateRecipe(t: TFunction, recipe: Recipe) {
  const fallback = (['language', 'framework', 'method'] as const)
    .flatMap(field => (recipe[field] ? [[field, recipe[field]]] : []))
    .map(([field, value]) => t(`instrumentation.${field}.${value}`, { defaultValue: value }))
    .join(' · ');
  return t(recipe.labelKey, { defaultValue: fallback });
}
