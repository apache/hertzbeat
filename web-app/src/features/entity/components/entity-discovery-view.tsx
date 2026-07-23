/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Collapse, Empty, Input, Space, Spin, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { monitorStatusColor, monitorStatusKey } from '@/features/monitor';
import { localizeEntityCode } from '../model/entity-display';
import type {
  EntityDiscoveryCandidate,
  EntityDiscoveryRow,
  EntityDiscoveryViewModel
} from '../model/entity-discovery-model';
import styles from './entity-view.module.css';

export function EntityDiscoveryView({ state, actions }: EntityDiscoveryViewModel) {
  const { t } = useTranslation();
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('entity.discovery.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('entity.discovery.description')}</Typography.Text>
        </div>
        <Space>
          <Button disabled={state.refreshing} onClick={actions.refresh}>
            {t('common.refresh')}
          </Button>
          <Button onClick={actions.back}>{t('entity.discovery.back')}</Button>
        </Space>
      </header>
      <Input.Search
        allowClear
        value={state.draft}
        placeholder={t('entity.discovery.search')}
        onChange={event => actions.updateDraft(event.target.value)}
        onSearch={actions.submit}
      />
      <DiscoveryResults state={state} actions={actions} />
    </div>
  );
}

function DiscoveryResults({ state, actions }: EntityDiscoveryViewModel) {
  const { t } = useTranslation();
  const evidence = state.evidence;
  if (evidence.kind === 'loading')
    return (
      <div role="status">
        <Spin />
      </div>
    );
  if (evidence.kind === 'empty') return <Empty description={t('entity.discovery.empty')} />;
  if (evidence.kind === 'unavailable')
    return <Alert showIcon type="warning" message={t('entity.discovery.unavailable')} />;
  if (evidence.kind === 'error') return <Alert showIcon type="error" message={t('entity.discovery.error')} />;
  return (
    <Table<EntityDiscoveryRow>
      rowKey={row => row.monitor.id}
      size="small"
      dataSource={evidence.records}
      columns={discoveryColumns(t, actions.openCandidate, actions.create)}
      pagination={{
        current: state.query.pageIndex + 1,
        pageSize: state.query.pageSize,
        pageSizeOptions: [8, 20, 50],
        showSizeChanger: true,
        total: evidence.total,
        onChange: actions.changePage
      }}
    />
  );
}

function discoveryColumns(
  t: (key: string) => string,
  openCandidate: (resourceId: number) => void,
  create: () => void
): ColumnsType<EntityDiscoveryRow> {
  return [
    { title: t('entity.discovery.fields.name'), render: (_value, row) => <strong>{row.monitor.name}</strong> },
    { title: t('entity.discovery.fields.address'), render: (_value, row) => row.monitor.instance },
    {
      title: t('entity.discovery.fields.type'),
      render: (_value, row) => <Tag>{row.monitor.app}</Tag>
    },
    {
      title: t('entity.discovery.fields.status'),
      render: (_value, row) => (
        <Tag color={monitorStatusColor(row.monitor.status)}>{t(monitorStatusKey(row.monitor.status))}</Tag>
      )
    },
    {
      title: t('entity.discovery.fields.candidates'),
      render: (_value, row) => <CandidateList candidates={row.candidates} t={t} open={openCandidate} create={create} />
    }
  ];
}

function CandidateList({
  candidates,
  t,
  open,
  create
}: {
  candidates: EntityDiscoveryCandidate[];
  t: (key: string) => string;
  open: (resourceId: number) => void;
  create: () => void;
}) {
  if (candidates.length === 0)
    return (
      <Space direction="vertical" size={4}>
        <Typography.Text type="secondary">{t('entity.discovery.noCandidates')}</Typography.Text>
        <Button size="small" onClick={create}>
          {t('entity.editor.addTitle')}
        </Button>
      </Space>
    );
  return (
    <Space direction="vertical" size={8}>
      {candidates.map(candidate => (
        <Space key={`${candidate.resourceId}-${candidate.match}`} direction="vertical" size={2}>
          <Space wrap>
            <strong>{candidate.resourceName}</strong>
            <Tag>{localizeEntityCode(t, 'type', candidate.resourceType)}</Tag>
            <Tag>{t(`entity.discovery.match.${candidate.match}`)}</Tag>
            <Button type="link" size="small" className={styles.rowLink!} onClick={() => open(candidate.resourceId)}>
              {t(
                candidate.match === 'already_bound' ? 'entity.discovery.openResource' : 'entity.discovery.viewCandidate'
              )}
            </Button>
          </Space>
          {candidate.matchedKeys.length > 0 ? (
            <Collapse
              ghost
              size="small"
              items={[
                {
                  key: 'evidence',
                  label: t('entity.discovery.evidence'),
                  children: (
                    <Space wrap>
                      {candidate.matchedKeys.map(key => (
                        <Tag key={key}>{key}</Tag>
                      ))}
                    </Space>
                  )
                }
              ]}
            />
          ) : null}
        </Space>
      ))}
    </Space>
  );
}
