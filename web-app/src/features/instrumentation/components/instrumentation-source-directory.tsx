/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { Input, Typography } from 'antd';
import type { TFunction } from 'i18next';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import type { CatalogResponse, SourceEntry } from '../model/instrumentation-v2-contract';
import { translateBackend } from './instrumentation-i18n';
import { InstrumentationSourceCategoryRail } from './instrumentation-source-category-rail';
import { InstrumentationSourceTile } from './instrumentation-source-tile';
import styles from './instrumentation-shell.module.css';
import directoryStyles from './instrumentation-source-directory.module.css';

export function InstrumentationSourceDirectory(props: {
  catalog: CatalogResponse;
  agentlessTarget?: string;
  canCreateMonitor?: boolean;
  onSource: (sourceId: string) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [groupId, setGroupId] = useState<string>();
  const visible = useMemo(() => filteredSources(props.catalog, groupId, query, t), [groupId, props.catalog, query, t]);
  const { availableCatalog, common, entries, unsupported } = partitionSources(
    props.catalog,
    visible,
    !groupId && !query.trim()
  );
  return (
    <>
      {props.agentlessTarget && (
        <div className={directoryStyles.agentlessEntry}>
          <Typography.Text type="secondary">{t('instrumentation.v2.directory.agentlessBoundary')}</Typography.Text>
          <Link to={props.agentlessTarget}>
            {t(props.canCreateMonitor ? 'dashboard.start.active.action' : 'dashboard.openMonitors')}
          </Link>
        </div>
      )}
      <Input.Search
        className={styles.sourceSearch}
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder={t('instrumentation.v2.directory.search')}
      />
      <div className={styles.directory}>
        <div className={styles.sourceList}>
          <SourceGroup
            title={t('instrumentation.v2.directory.commonPaths')}
            sources={common}
            onSource={props.onSource}
          />
          {props.catalog.groups.map(group => (
            <SourceGroup
              key={group.id}
              title={translateBackend(t, group.labelKey)}
              sources={sourcesForGroup(entries, group.id, groupId, query)}
              onSource={props.onSource}
            />
          ))}
          {entries.length === 0 && common.length === 0 && (
            <Typography.Text type="secondary">{t('instrumentation.v2.directory.noAvailableMatches')}</Typography.Text>
          )}
          {unsupported.length > 0 && <UnsupportedGuides sources={unsupported} />}
        </div>
        <InstrumentationSourceCategoryRail
          catalog={availableCatalog}
          {...(groupId ? { groupId } : {})}
          onGroup={setGroupId}
        />
      </div>
    </>
  );
}

const commonSourceIds = ['java', 'opentelemetry_collector', 'hertzbeat_hybrid_collector'];

function partitionSources(catalog: CatalogResponse, visible: SourceEntry[], showCommon: boolean) {
  const common = showCommon
    ? commonSourceIds.flatMap(id => visible.filter(source => source.id === id && source.support === 'supported'))
    : [];
  return {
    availableCatalog: { ...catalog, sources: catalog.sources.filter(source => source.support !== 'unsupported') },
    common,
    entries: visible.filter(source => source.support !== 'unsupported' && !common.includes(source)),
    unsupported: visible.filter(source => source.support === 'unsupported')
  };
}

function UnsupportedGuides({ sources }: { sources: SourceEntry[] }) {
  const { t } = useTranslation();
  return (
    <details className={directoryStyles.capabilityDetails}>
      <summary>{t('instrumentation.v2.directory.unsupportedGuides', { count: sources.length })}</summary>
      <Typography.Paragraph type="secondary">{t('instrumentation.v2.directory.otlpBoundary')}</Typography.Paragraph>
      <ul>
        {sources.map(source => (
          <li key={source.id}>
            <Typography.Text>{translateBackend(t, source.labelKey)}</Typography.Text>
            <Typography.Text type="secondary">{t('instrumentation.v2.directory.guideUnavailable')}</Typography.Text>
          </li>
        ))}
      </ul>
    </details>
  );
}

function SourceGroup(props: { title: string; sources: SourceEntry[]; onSource: (id: string) => void }) {
  if (props.sources.length === 0) return null;
  return (
    <section className={styles.sourceGroup} aria-label={props.title}>
      <Typography.Text strong>{props.title}</Typography.Text>
      <div className={styles.sourceGrid}>
        {props.sources.map(source => (
          <InstrumentationSourceTile key={source.id} source={source} selected={false} onSelect={props.onSource} />
        ))}
      </div>
    </section>
  );
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
