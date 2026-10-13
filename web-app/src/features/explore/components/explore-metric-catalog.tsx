/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Button, Grid, Input, Tooltip } from 'antd';
import { useEffect, useRef } from 'react';
import type { TFunction } from 'i18next';
import { METRIC_SEARCH_MAX_LENGTH, type MetricInventoryViewModel } from '../model/explore-metric-inventory';
import styles from './explore-metric-catalog.module.css';
import announcementStyles from './explore-result-announcer.module.css';

type Props = {
  model: MetricInventoryViewModel;
  draftMetric: string;
  committedMetric: string | undefined;
  select: (name: string) => void;
  t: TFunction;
};
export function ExploreMetricCatalog(props: Props) {
  const { model, draftMetric, committedMetric, select, t } = props;
  const desktop = Boolean(Grid.useBreakpoint().md);
  const content = (
    <div className={styles.content}>
      <div className={styles.search}>
        <Input
          value={model.search}
          maxLength={METRIC_SEARCH_MAX_LENGTH}
          onChange={event => model.setSearch(event.target.value)}
          aria-label={t('exploreMetric.searchMetrics')}
          placeholder={t('exploreMetric.searchExample')}
        />
        <SelectedMetadata model={model} name={draftMetric} t={t} />
      </div>
      <CatalogStatus model={model} t={t} />
      <CatalogAnnouncement message={model.state === 'ready' ? catalogCountMessage(model, t) : ''} />
      <div className={styles.list} role="list" aria-label={t('exploreMetric.catalog')}>
        {model.data?.items.map(item => (
          <div role="listitem" key={item.metricName}>
            <Tooltip title={item.metricName} trigger={['hover', 'focus']} placement="right">
              <button
                type="button"
                className={styles.metric}
                aria-pressed={draftMetric === item.metricName}
                data-committed={committedMetric === item.metricName}
                onClick={() => select(item.metricName)}
                title={item.metricName}
              >
                <span>{item.metricName}</span>
                <CatalogMetadata item={item} t={t} />
              </button>
            </Tooltip>
          </div>
        ))}
      </div>
    </div>
  );
  const count = <CatalogCount model={model} t={t} />;
  return desktop ? (
    <aside className={styles.catalog} data-metric-catalog="true" aria-label={t('exploreMetric.catalog')}>
      <h3 className={styles.heading}>
        {t('exploreMetric.catalog')}
        {count}
      </h3>
      {content}
    </aside>
  ) : (
    <details className={styles.catalog} data-metric-catalog="true">
      <summary>
        {t('exploreMetric.catalog')} {count}
      </summary>
      {content}
    </details>
  );
}

function CatalogCount({ model, t }: { model: MetricInventoryViewModel; t: TFunction }) {
  if (model.state !== 'ready') return null;
  return (
    <span className={styles.count} aria-label={catalogCountMessage(model, t)}>
      {model.data?.items.length ?? 0}
    </span>
  );
}

function CatalogStatus({ model, t }: { model: MetricInventoryViewModel; t: TFunction }) {
  if (model.state === 'loading') return <p className={styles.status}>{t('exploreMetric.catalogLoading')}</p>;
  if (model.state === 'error' || model.state === 'permission')
    return (
      <div className={styles.status}>
        <p>
          {t(
            model.state === 'permission'
              ? 'common.permission.roleRequiredDescription'
              : 'exploreMetric.catalogUnavailable'
          )}
        </p>
        <Button onClick={model.retry}>{t('common.retry')}</Button>
      </div>
    );
  if (model.state === 'ready' && model.data?.items.length && !model.data.truncated) return null;
  return (
    <div className={styles.status}>
      <p>{catalogCountMessage(model, t)}</p>
      {model.search && !model.data?.items.length && (
        <Button size="small" onClick={() => model.setSearch('')}>
          {t('explore.novice.clearSearch')}
        </Button>
      )}
    </div>
  );
}

function catalogCountMessage(model: MetricInventoryViewModel, t: TFunction) {
  if (model.search && !model.data?.items.length) return t('explore.novice.catalogNoMatch');
  return t(
    model.data?.truncated
      ? 'exploreMetric.catalogTruncated'
      : model.data?.items.length
        ? 'exploreMetric.catalogCount'
        : 'exploreMetric.catalogEmpty',
    { count: model.data?.items.length ?? 0 }
  );
}

function CatalogAnnouncement({ message }: { message: string }) {
  const region = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = region.current;
    if (!element) return undefined;
    element.textContent = message;
    const timer = setTimeout(() => {
      element.textContent = '';
    }, 4000);
    return () => clearTimeout(timer);
  }, [message]);
  return (
    <span ref={region} className={announcementStyles.liveStatus} role="status" aria-live="polite" aria-atomic="true" />
  );
}

function CatalogMetadata({
  item,
  t
}: {
  item: NonNullable<MetricInventoryViewModel['data']>['items'][number];
  t: TFunction;
}) {
  if (item.metadata?.state !== 'available') return null;
  return (
    <small
      title={t('explore.metricComposition.declaredMetadata', {
        type: item.metadata.declaredType ?? '—',
        unit: item.metadata.declaredUnit ?? '—'
      })}
    >
      {item.metadata.declaredType}
    </small>
  );
}
function SelectedMetadata({ model, name, t }: { model: MetricInventoryViewModel; name: string; t: TFunction }) {
  const item = model.data?.items.find(candidate => candidate.metricName === name);
  if (!item) return null;
  const metadata = item.metadata;
  return (
    <details className={styles.selectedMetadata}>
      <summary>{t('explore.metricComposition.metricInfo')}</summary>
      {metadata?.state === 'available' ? (
        <>
          <p>
            {t('explore.metricComposition.declaredMetadata', {
              type: metadata.declaredType ?? '—',
              unit: metadata.declaredUnit ?? '—'
            })}
          </p>
          <dl className={styles.metadataFacts}>
            {metadata.source && (
              <>
                <dt>{t('explore.metricComposition.metadataSource')}</dt>
                <dd>{metadata.source}</dd>
              </>
            )}
            {metadata.originalName && (
              <>
                <dt>{t('explore.metricComposition.metadataOriginalName')}</dt>
                <dd>{metadata.originalName}</dd>
              </>
            )}
            {metadata.temporality && (
              <>
                <dt>{t('explore.metricComposition.metadataTemporality')}</dt>
                <dd>{metadata.temporality}</dd>
              </>
            )}
            <dt>{t('explore.metricComposition.metadataInterval')}</dt>
            <dd>{t('explore.metricComposition.metadataIntervalUnavailable')}</dd>
          </dl>
          {metadata.description && <p>{metadata.description}</p>}
        </>
      ) : (
        <p>{t('explore.metricComposition.metadataUnavailable')}</p>
      )}
    </details>
  );
}
