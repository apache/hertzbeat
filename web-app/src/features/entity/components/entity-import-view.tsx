/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Collapse, Input, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { entityRoutePaths } from '@/shared/navigation/app-paths';
import type { EditableEntityDto } from '../model/entity-editor-contract';
import { localizeEntityCode } from '../model/entity-display';
import { entityImportFormats, type EntityImportViewModel } from '../model/entity-import-model';
import styles from './entity-view.module.css';

export function EntityImportView({ state, actions }: EntityImportViewModel) {
  const { t } = useTranslation();
  if (state.createdIds && state.preview)
    return <ImportSuccess ids={state.createdIds} resources={state.preview} returnTo={state.returnTo} />;
  return (
    <div className={styles.page}>
      <header>
        <Typography.Title level={2}>{t('entity.import.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('entity.import.description')}</Typography.Text>
      </header>
      {state.failure ? (
        <Alert
          showIcon
          type={state.failure.kind === 'unavailable' ? 'warning' : 'error'}
          message={state.failure.message ?? t(`entity.import.failure.${state.failure.kind}`)}
        />
      ) : null}
      <Space direction="vertical" size="middle">
        <Select
          aria-label={t('entity.import.format')}
          value={state.draft.format}
          disabled={state.confirming}
          options={entityImportFormats.map(value => ({ value, label: t(`entity.import.formats.${value}`) }))}
          onChange={actions.changeFormat}
        />
        <Input.TextArea
          aria-label={t('entity.import.content')}
          value={state.draft.content}
          disabled={state.confirming}
          rows={12}
          onChange={event => actions.changeContent(event.target.value)}
        />
        <Space>
          <Button
            type={state.preview ? 'default' : 'primary'}
            disabled={!state.draft.content.trim() || state.confirming}
            loading={state.previewing}
            onClick={actions.preview}
          >
            {t('entity.import.previewAction')}
          </Button>
          <Button type="primary" disabled={!state.confirmEnabled} loading={state.confirming} onClick={actions.confirm}>
            {t('entity.import.confirmAction')}
          </Button>
          <Button disabled={state.previewing || state.confirming} onClick={actions.cancel}>
            {t('common.cancel')}
          </Button>
        </Space>
      </Space>
      {state.preview ? <ImportPreview resources={state.preview} /> : null}
    </div>
  );
}

function ImportPreview({ resources }: { resources: EditableEntityDto[] }) {
  const { t } = useTranslation();
  const rows = resources.map((resource, index) => ({ key: String(index), resource }));
  return (
    <section aria-label={t('entity.import.previewTitle')}>
      <Typography.Title level={3}>{t('entity.import.previewTitle')}</Typography.Title>
      <Alert showIcon type="info" message={t('entity.import.zeroWrite')} />
      <Table<PreviewRow> rowKey="key" size="small" pagination={false} dataSource={rows} columns={previewColumns(t)} />
    </section>
  );
}

type PreviewRow = { key: string; resource: EditableEntityDto };

function previewColumns(t: (key: string) => string): ColumnsType<PreviewRow> {
  return [
    {
      title: t('entity.fields.name'),
      render: (_value, row) => <strong>{row.resource.entity.displayName || row.resource.entity.name}</strong>
    },
    {
      title: t('entity.fields.type'),
      render: (_value, row) => <Tag>{localizeEntityCode(t, 'type', row.resource.entity.type)}</Tag>
    },
    {
      title: t('entity.import.details'),
      render: (_value, row) => (
        <Collapse
          ghost
          size="small"
          items={[
            {
              key: 'details',
              label: t('entity.import.details'),
              children: <ImportDetails resource={row.resource} />
            }
          ]}
        />
      )
    }
  ];
}

function ImportDetails({ resource }: { resource: EditableEntityDto }) {
  const { t } = useTranslation();
  const entries = [
    ['owner', resource.entity.owner],
    ['environment', resource.entity.environment],
    ['namespace', resource.entity.namespace],
    ['source', resource.entity.source]
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  return (
    <Space direction="vertical" size={2}>
      {entries.map(([key, value]) => (
        <Typography.Text key={key}>{`${t(`entity.import.fields.${key}`)}: ${value}`}</Typography.Text>
      ))}
      <Typography.Text type="secondary">
        {t('entity.import.associationSummary', {
          identities: resource.identities?.length ?? 0,
          monitors: resource.monitorBinds?.length ?? 0,
          relations: resource.relations?.length ?? 0
        })}
      </Typography.Text>
    </Space>
  );
}

function ImportSuccess({
  ids,
  resources,
  returnTo
}: {
  ids: number[];
  resources: EditableEntityDto[];
  returnTo: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.page}>
      <Alert showIcon type="success" message={t('entity.import.success', { count: ids.length })} />
      <Space direction="vertical">
        {ids.map((id, index) => (
          <Link key={`${id}:${index}`} to={entityRoutePaths.detail.replace(':entityId', String(id))}>
            {resources[index]?.entity.displayName || resources[index]?.entity.name}
          </Link>
        ))}
        <Link to={returnTo}>{t('entity.import.returnToCatalog')}</Link>
      </Space>
    </div>
  );
}
