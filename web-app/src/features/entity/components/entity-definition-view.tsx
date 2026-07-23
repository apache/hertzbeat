/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Empty, Input, Select, Space, Spin, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { localizeEntityCode } from '../model/entity-display';
import { entityDefinitionFormats, type EntityDefinitionViewModel } from '../model/entity-definition-model';
import type { EditableEntityDto } from '../model/entity-editor-contract';
import { EntityDefinitionSummary } from './entity-definition-summary';
import styles from './entity-view.module.css';

export function EntityDefinitionView({ state, actions }: EntityDefinitionViewModel) {
  const { t } = useTranslation();
  if (state.evidence.kind === 'loading')
    return (
      <div role="status">
        <Spin />
      </div>
    );
  if (state.evidence.kind === 'missing') return <Empty description={t('entity.definition.missing')} />;
  if (state.evidence.kind !== 'ready') {
    return (
      <Space direction="vertical">
        <Alert
          showIcon
          type={state.evidence.kind === 'unavailable' ? 'warning' : 'error'}
          message={t(`entity.definition.loadFailure.${state.evidence.kind}`)}
        />
        <Button onClick={actions.retry}>{t('common.retry')}</Button>
      </Space>
    );
  }
  return <ReadyDefinition state={state} actions={actions} resource={state.evidence.resource} />;
}

function ReadyDefinition({ state, actions, resource }: EntityDefinitionViewModel & { resource: EditableEntityDto }) {
  const { t } = useTranslation();
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('entity.definition.title')}</Typography.Title>
          <Typography.Text type="secondary">
            {`${resource.entity.displayName || resource.entity.name} · ${localizeEntityCode(t, 'type', resource.entity.type)}`}
          </Typography.Text>
        </div>
        <Button disabled={state.saving} onClick={actions.back}>
          {t('entity.definition.back')}
        </Button>
      </header>
      <DefinitionNotices state={state} actions={actions} />
      <DefinitionEditor state={state} actions={actions} />
      {state.preview ? <DefinitionPreview resource={state.preview} /> : null}
    </div>
  );
}

function DefinitionEditor({ state, actions }: EntityDefinitionViewModel) {
  const { t } = useTranslation();
  const refreshBlocked = Boolean(state.refreshFailure);
  return (
    <Space direction="vertical" size="middle">
      <Select
        aria-label={t('entity.definition.format')}
        value={state.format}
        disabled={state.dirty || state.saving || refreshBlocked}
        options={entityDefinitionFormats.map(value => ({ value, label: value.toUpperCase() }))}
        onChange={actions.changeFormat}
      />
      <Input.TextArea
        aria-label={t('entity.definition.content')}
        className={styles.definitionEditor ?? ''}
        rows={18}
        value={state.content}
        disabled={state.saving || refreshBlocked}
        onChange={event => actions.changeContent(event.target.value)}
      />
      <Space>
        <Button
          type={state.preview ? 'default' : 'primary'}
          disabled={!state.content.trim() || state.saving || refreshBlocked}
          loading={state.previewing}
          onClick={actions.preview}
        >
          {t('entity.definition.previewAction')}
        </Button>
        <Button
          type={state.preview ? 'primary' : 'default'}
          disabled={!state.saveEnabled}
          loading={state.saving}
          onClick={actions.save}
        >
          {t('entity.definition.saveAction')}
        </Button>
        <Button disabled={!state.dirty || state.saving || refreshBlocked} onClick={actions.reset}>
          {t('entity.definition.resetAction')}
        </Button>
      </Space>
    </Space>
  );
}

function DefinitionNotices({ state, actions }: EntityDefinitionViewModel) {
  const { t } = useTranslation();
  return (
    <>
      {state.dirty ? <Alert showIcon type="info" message={t('entity.definition.formatBlocked')} /> : null}
      {state.failure ? (
        <Alert
          showIcon
          type={state.failure.kind === 'unavailable' ? 'warning' : 'error'}
          message={t(`entity.definition.failure.${state.failure.kind}`)}
        />
      ) : null}
      {state.refreshFailure ? (
        <Alert
          showIcon
          type={state.refreshFailure.kind === 'unavailable' ? 'warning' : 'error'}
          message={t(`entity.definition.refreshFailure.${state.refreshFailure.kind}`)}
          action={
            <Button size="small" loading={state.refreshing} onClick={actions.retry}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : null}
      {state.saved ? <Alert showIcon type="success" message={t('entity.definition.saved')} /> : null}
    </>
  );
}

function DefinitionPreview({ resource }: { resource: EditableEntityDto }) {
  const { t } = useTranslation();
  return (
    <section aria-label={t('entity.definition.previewTitle')}>
      <Typography.Title level={3}>{t('entity.definition.previewTitle')}</Typography.Title>
      <Alert showIcon type="info" message={t('entity.definition.zeroWrite')} />
      <EntityDefinitionSummary resource={resource} messageNamespace="entity.definition" />
    </section>
  );
}
