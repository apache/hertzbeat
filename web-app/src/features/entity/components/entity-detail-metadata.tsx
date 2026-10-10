/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Descriptions, Space, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalSection, OperationalStatePanel } from '@/shared/operational-page';

import type { EntityDetail, EntityRecord } from '../model/entity-contract';
import { localizeEntityCode } from '../model/entity-display';
import { EntityEvidenceSources } from './entity-evidence-sources';
import styles from './entity-view.module.css';
import { EntityDetailSection } from './entity-detail-navigation';

export function EntityDetailMetadata({ detail }: { detail: EntityDetail }) {
  const { t } = useTranslation();
  return (
    <>
      <EntityDetailSection id="entity-details" label={t('entity.sections.details')}>
        <OperationalSection title={t('entity.sections.details')}>
          <Descriptions className={styles.metadataGrid!} size="small" column={2} items={baseItems(t, detail)} />
        </OperationalSection>
      </EntityDetailSection>
      <EntityDetailSection id="entity-evidence" label={t('entity.sections.evidence')}>
        <OperationalSection title={t('entity.sections.evidence')}>
          {detail.evidence ? (
            <Descriptions
              className={styles.evidenceGrid!}
              size="small"
              column={5}
              items={evidenceItems(t, detail.evidence)}
            />
          ) : (
            <OperationalStatePanel kind="empty" title={t('entity.missing.evidence')} />
          )}
          <EntityEvidenceSources summary={detail.unifiedEvidence} />
        </OperationalSection>
      </EntityDetailSection>
    </>
  );
}

export function EntityIdentityMetadata({ entity }: { entity: EntityRecord }) {
  const { t } = useTranslation();
  return (
    <EntityDetailSection id="entity-details" label={t('entity.sections.details')}>
      <OperationalSection title={t('entity.sections.details')}>
        <Descriptions className={styles.metadataGrid!} size="small" column={2} items={entityItems(t, entity)} />
      </OperationalSection>
    </EntityDetailSection>
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
    {
      key: 'reason',
      label: t('entity.fields.reason'),
      children: (
        <span id="entity-status-evidence" tabIndex={-1}>
          {detail.status?.reason || '—'}
        </span>
      )
    },
    ...entityItems(t, entity)
  ];
}

function entityItems(t: (key: string) => string, entity: EntityRecord) {
  return [
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
