/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Descriptions, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { EntityDetail } from '../model/entity-contract';
import { localizeEntityCode } from '../model/entity-display';
import styles from './entity-view.module.css';

export function EntityDetailMetadata({ detail }: { detail: EntityDetail }) {
  const { t } = useTranslation();
  return (
    <>
      <Descriptions bordered size="small" column={2} items={baseItems(t, detail)} />
      <section className={styles.section} aria-label={t('entity.sections.evidence')}>
        <Typography.Title level={4}>{t('entity.sections.evidence')}</Typography.Title>
        {detail.evidence ? (
          <Descriptions size="small" column={5} items={evidenceItems(t, detail.evidence)} />
        ) : (
          <Typography.Text type="secondary">{t('entity.missing.evidence')}</Typography.Text>
        )}
      </section>
    </>
  );
}

function baseItems(t: (key: string) => string, detail: EntityDetail) {
  const entity = detail.entity;
  return [
    {
      key: 'status',
      label: t('entity.fields.status'),
      children: <Tag>{localizeEntityCode(t, 'status', detail.status?.status)}</Tag>
    },
    { key: 'reason', label: t('entity.fields.reason'), children: detail.status?.reason || '—' },
    { key: 'environment', label: t('entity.fields.environment'), children: entity.environment || '—' },
    { key: 'owner', label: t('entity.fields.owner'), children: entity.owner || '—' },
    { key: 'source', label: t('entity.fields.source'), children: localizeEntityCode(t, 'source', entity.source) },
    { key: 'lifecycle', label: t('entity.fields.lifecycle'), children: entity.lifecycle || '—' },
    { key: 'tier', label: t('entity.fields.tier'), children: entity.tier || '—' },
    { key: 'system', label: t('entity.fields.system'), children: entity.system || '—' },
    { key: 'description', label: t('entity.fields.description'), children: entity.description || '—', span: 2 },
    { key: 'labels', label: t('entity.fields.labels'), children: metadataTags(entity.labels), span: 2 },
    { key: 'tags', label: t('entity.fields.tags'), children: valueTags(entity.tags), span: 2 }
  ];
}

function evidenceItems(t: (key: string) => string, evidence: NonNullable<EntityDetail['evidence']>) {
  return [
    { key: 'alerts', label: t('entity.evidence.alerts'), children: evidence.activeAlertCount ?? '—' },
    { key: 'down', label: t('entity.evidence.downMonitors'), children: evidence.downMonitorCount ?? '—' },
    { key: 'healthy', label: t('entity.evidence.healthyMonitors'), children: evidence.healthyMonitorCount ?? '—' },
    { key: 'identities', label: t('entity.evidence.identities'), children: evidence.identityCount ?? '—' },
    { key: 'logs', label: t('entity.evidence.logHints'), children: evidence.logHintCount ?? '—' }
  ];
}

function metadataTags(labels?: Record<string, string>) {
  const entries = Object.entries(labels ?? {});
  return entries.length > 0 ? (
    <Space size={[0, 4]} wrap>
      {entries.map(([key, value]) => (
        <Tag key={key}>
          {key}={value}
        </Tag>
      ))}
    </Space>
  ) : (
    '—'
  );
}

function valueTags(values?: string[]) {
  return values?.length ? (
    <Space size={[0, 4]} wrap>
      {values.map(value => (
        <Tag key={value}>{value}</Tag>
      ))}
    </Space>
  ) : (
    '—'
  );
}
