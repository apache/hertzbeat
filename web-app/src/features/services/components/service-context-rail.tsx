/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Descriptions, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { OperationalSection } from '@/shared/operational-page';
import type { EntityDetail } from '@/features/entity/queries';
import { formatShortLocalTime } from '@/shared/time';
import type { ServicesViewProps } from '../model/services-model';
import styles from './services-view.module.css';

export function ServiceContextRail(props: ServicesViewProps) {
  const { t } = useTranslation();
  if (props.state.detail.kind !== 'ready') return null;
  return (
    <details className={styles.information}>
      <summary>{t('services.information')}</summary>
      <div className={styles.contextRail}>
        <ServiceIdentity {...props} />
        <ServiceAssociations {...props} />
      </div>
    </details>
  );
}

function ServiceIdentity({ state, actions }: ServicesViewProps) {
  const { t } = useTranslation();
  if (state.detail.kind !== 'ready') return null;
  return (
    <OperationalSection
      title={t('services.information')}
      actions={
        state.paths.entity && <Button onClick={() => actions.open(state.paths.entity!)}>{t('services.entity')}</Button>
      }
    >
      <Descriptions size="small" column={1} items={serviceIdentityItems(state, t, state.detail.data)} />
      <p className={styles.note}>{t('services.freshnessLimit')}</p>
    </OperationalSection>
  );
}

function ServiceAssociations({ state }: ServicesViewProps) {
  const { t } = useTranslation();
  if (state.detail.kind !== 'ready') return null;
  const detail = state.detail.data;
  return (
    <OperationalSection title={t('services.associations')} description={t('services.associationLimit')}>
      <Space wrap>
        <span>
          {t('services.linkedAlerts')}: {detail.evidence?.activeAlertCount ?? t('services.unknown')}
        </span>
      </Space>
      {detail.relations.length ? (
        <ul className={styles.relations}>
          {detail.relations.map((relation, index) => (
            <li key={relation.relationId ?? index}>
              <span>{relation.entityName ?? relation.targetRef ?? t('services.unknown')}</span>
              <span>
                {relation.direction ?? t('services.unknown')} · {relation.relationType ?? t('services.unknown')} ·{' '}
                {relation.relationSource ?? t('services.unknown')}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>{t('services.noRelations')}</p>
      )}
    </OperationalSection>
  );
}

function serviceIdentityItems(
  state: ServicesViewProps['state'],
  t: ReturnType<typeof useTranslation>['t'],
  detail: EntityDetail
) {
  const identity = state.identity ?? (state.red.kind === 'ready' ? state.red.data.identity : undefined);
  const freshness = serviceFreshnessLabel(state, t);
  return [
    {
      key: 'alias',
      label: t('entity.editor.fields.displayName'),
      children: detail.entity.displayName ?? detail.entity.name
    },
    { key: 'name', label: t('services.service'), children: identity?.serviceName ?? detail.entity.name },
    {
      key: 'namespace',
      label: t('services.namespace'),
      children: identity?.serviceNamespace ?? t('services.unknown')
    },
    {
      key: 'environment',
      label: t('services.environment'),
      children: identity?.deploymentEnvironment ?? detail.entity.environment ?? t('services.unknown')
    },
    { key: 'source', label: t('services.source'), children: detail.entity.source ?? t('services.unknown') },
    { key: 'latest', label: t('services.latestTrace'), children: freshness }
  ];
}

function serviceFreshnessLabel(state: ServicesViewProps['state'], t: ReturnType<typeof useTranslation>['t']) {
  if (!state.validWindow) return t('services.invalidWindow');
  const freshness =
    state.freshness.kind === 'ready' && state.freshness.data != null
      ? formatShortLocalTime(state.freshness.data, { date: true })
      : t(`services.state.${state.freshness.kind === 'ready' ? 'empty' : state.freshness.kind}`);
  return freshness;
}
