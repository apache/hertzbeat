/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { Input, Tag, Typography } from 'antd';
import type { TFunction } from 'i18next';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  APPLICATION_QUESTIONS,
  answerApplicationQuestion,
  selectSource,
  type ApplicationQuestion
} from '../model/instrumentation-flow';
import { SIGNALS, type CatalogResponse, type SourceEntry } from '../model/instrumentation-v2-contract';
import { InstrumentationApplicationQuestions } from './instrumentation-application-questions';
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
  const selectedSource = props.catalog.sources.find(source => source.id === props.sourceId);
  return (
    <section className={styles.section} aria-label={t('instrumentation.v2.connectTitle')}>
      {!draft && (
        <>
          <Typography.Title level={3}>{t('instrumentation.v2.connectTitle')}</Typography.Title>
          <Typography.Text type="secondary">{t('instrumentation.v2.description')}</Typography.Text>
          <SourceDirectory {...props} />
        </>
      )}
      {draft?.sourceKind === 'application' && (
        <InstrumentationApplicationQuestions
          catalog={props.catalog}
          draft={draft}
          onAnswer={props.onApplicationAnswer}
        />
      )}
      {draft?.sourceKind !== 'application' && selectedSource && (
        <div className={styles.selectedSource}>
          <SourceTile source={selectedSource} selected onSelect={props.onSource} />
        </div>
      )}
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
                <div className={styles.sourceGrid}>
                  {entries.map(source => (
                    <SourceTile
                      key={source.id}
                      source={source}
                      selected={source.id === props.sourceId}
                      onSelect={props.onSource}
                    />
                  ))}
                </div>
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

function SourceTile(props: { source: SourceEntry; selected: boolean; onSelect: (sourceId: string) => void }) {
  const { t } = useTranslation();
  const source = props.source;
  return (
    <button
      type="button"
      aria-pressed={props.selected}
      className={`${styles.sourceTile} ${props.selected ? styles.sourceTileSelected : ''}`}
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
      <Tag className={styles.supportTag!} color={supportTagColor(source.support)}>
        {t(`instrumentation.capability.${source.support}`)}
      </Tag>
    </button>
  );
}

function supportTagColor(support: SourceEntry['support']) {
  if (support === 'preview') return 'warning';
  if (support === 'supported') return 'success';
  return 'default';
}

function buildDraft(props: Parameters<typeof InstrumentationSourceStep>[0]) {
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
