/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { EntityEvidenceSource, EntityUnifiedEvidence } from '../model/entity-contract';
import { entityEvidenceSourceState } from '../model/entity-evidence-source-model';
import styles from './entity-view.module.css';

export function EntityEvidenceSources({ summary }: { summary: EntityUnifiedEvidence | undefined }) {
  const { t } = useTranslation();
  const state = entityEvidenceSourceState(summary);
  const title = t('entity.evidence.sources.title');
  return (
    <div role="group" aria-label={title}>
      <Typography.Title level={5}>{title}</Typography.Title>
      {state.kind === 'unavailable' ? (
        <Typography.Text>{t('entity.evidence.sources.unavailable')}</Typography.Text>
      ) : null}
      {state.kind === 'empty' ? <Typography.Text>{t('entity.evidence.sources.empty')}</Typography.Text> : null}
      {state.kind === 'ready' ? (
        <table className={styles.evidenceSourceTable} aria-label={title}>
          <thead>
            <tr>
              <th>{t('entity.fields.source')}</th>
              <th>{t('entity.evidence.sources.metrics')}</th>
              <th>{t('entity.evidence.sources.logs')}</th>
              <th>{t('entity.evidence.sources.traces')}</th>
              <th>{t('entity.evidence.sources.latest')}</th>
            </tr>
          </thead>
          <tbody>{state.rows.map(source => sourceRow(source, t))}</tbody>
        </table>
      ) : null}
    </div>
  );
}

function sourceRow(source: EntityEvidenceSource, t: (key: string) => string) {
  return (
    <tr key={source.source}>
      <th scope="row">{t(`entity.evidence.sources.${source.source}`)}</th>
      <td>{source.metrics}</td>
      <td>{source.logs}</td>
      <td>{source.traces}</td>
      <td>{formatEvidenceTime(source.lastObservedAt, t)}</td>
    </tr>
  );
}

function formatEvidenceTime(value: number | undefined, t: (key: string) => string) {
  return value === undefined
    ? t('entity.evidence.sources.notObserved')
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(value);
}
