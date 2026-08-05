/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Form, Input, Modal, Select, Space, Spin, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { BulletinDependencyProof } from '../model/bulletin-dependency-proof';
import { bulletinMonitorMatchesSearch, type BulletinDraft } from '../model/bulletin-model';
import { BulletinMetricTree } from './bulletin-metric-tree';

type BulletinEditorDependencies = Pick<
  BulletinDependencyProof,
  'apps' | 'fieldSelection' | 'kind' | 'metricTree' | 'monitorSelection' | 'monitors'
>;

type BulletinEditorProps = {
  draft: BulletinDraft | null;
  dependencies: BulletinEditorDependencies;
  saving: boolean;
  writeLocked: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (patch: Partial<BulletinDraft>) => void;
};

export function BulletinEditor(props: BulletinEditorProps) {
  const { draft, dependencies, saving, writeLocked, onClose, onSave } = props;
  const { t } = useTranslation();
  const canSave =
    dependencies.kind === 'ready' &&
    dependencies.monitorSelection === 'valid' &&
    dependencies.fieldSelection === 'valid';
  return (
    <Modal
      open={draft != null}
      width={720}
      title={t(draft?.id == null ? 'bulletin.create' : 'bulletin.edit')}
      onCancel={onClose}
      onOk={onSave}
      destroyOnHidden
      closable={!writeLocked}
      keyboard={!writeLocked}
      maskClosable={false}
      confirmLoading={saving}
      cancelText={t('common.cancel')}
      okText={t('common.save')}
      cancelButtonProps={{ disabled: writeLocked }}
      okButtonProps={{ disabled: writeLocked || !canSave }}
    >
      {draft && <BulletinEditorForm {...props} draft={draft} t={t} />}
    </Modal>
  );
}

function BulletinEditorForm({
  draft,
  dependencies,
  writeLocked,
  onChange,
  t
}: BulletinEditorProps & {
  draft: BulletinDraft;
  t: (key: string) => string;
}) {
  return (
    <Form labelCol={{ span: 6 }} wrapperCol={{ span: 16 }}>
      <Form.Item label={t('bulletin.name')} required>
        <Input disabled={writeLocked} value={draft.name} onChange={event => onChange({ name: event.target.value })} />
      </Form.Item>
      <Form.Item label={t('bulletin.monitorType')} required>
        <Select
          value={draft.app || null}
          showSearch
          disabled={writeLocked || draft.id != null}
          options={dependencies.apps.map(app => ({ value: app.value, label: app.label || app.value }))}
          onChange={(app: string) => onChange({ app, monitorIds: [], fields: {} })}
        />
      </Form.Item>
      {dependencies.kind === 'loading' && <Spin />}
      {dependencies.kind !== 'loading' && dependencies.kind !== 'ready' && (
        <Alert type="error" showIcon message={t(`bulletin.dependencies.${dependencies.kind}`)} />
      )}
      {dependencies.kind === 'ready' && draft.app && (
        <>
          <Form.Item label={t('bulletin.monitorTaskName')} required>
            <BulletinMonitorSelection
              dependencies={dependencies}
              draft={draft}
              onChange={onChange}
              t={t}
              writeLocked={writeLocked}
            />
          </Form.Item>
          {dependencies.monitorSelection === 'stale' && (
            <Alert type="warning" showIcon message={t('bulletin.validation')} />
          )}
          <Form.Item label={t('bulletin.monitorMetrics')} required>
            <BulletinFieldSelection
              draft={draft}
              dependencies={dependencies}
              writeLocked={writeLocked}
              onChange={onChange}
              t={t}
            />
          </Form.Item>
        </>
      )}
    </Form>
  );
}

function BulletinMonitorSelection({
  dependencies,
  draft,
  onChange,
  t,
  writeLocked
}: {
  dependencies: BulletinEditorDependencies;
  draft: BulletinDraft;
  onChange: (patch: Partial<BulletinDraft>) => void;
  t: (key: string) => string;
  writeLocked: boolean;
}) {
  const monitorById = new Map(dependencies.monitors.map(monitor => [monitor.id, monitor]));
  return (
    <Select
      mode="multiple"
      disabled={writeLocked}
      value={draft.monitorIds}
      options={dependencies.monitors.map(monitor => ({ value: monitor.id, label: monitor.name }))}
      placeholder={t('bulletin.monitorsPlaceholder')}
      filterOption={(input, option) => {
        const monitor = typeof option?.value === 'number' ? monitorById.get(option.value) : undefined;
        return monitor ? bulletinMonitorMatchesSearch(monitor, input) : false;
      }}
      onChange={monitorIds => onChange({ monitorIds })}
    />
  );
}

function BulletinFieldSelection({
  draft,
  dependencies,
  writeLocked,
  onChange,
  t
}: {
  draft: BulletinDraft;
  dependencies: BulletinEditorDependencies;
  writeLocked: boolean;
  onChange: (patch: Partial<BulletinDraft>) => void;
  t: (key: string) => string;
}) {
  if (!draft.monitorIds.length) {
    return <Typography.Text type="secondary">{t('bulletin.selectMonitorFirst')}</Typography.Text>;
  }
  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {dependencies.fieldSelection === 'stale' && <Alert type="warning" showIcon message={t('bulletin.validation')} />}
      {dependencies.metricTree.length === 0 ? (
        <Alert type="warning" showIcon message={t('bulletin.noMetrics')} />
      ) : (
        <BulletinMetricTree
          key={draft.app}
          disabled={writeLocked}
          fields={draft.fields}
          tree={dependencies.metricTree}
          onChange={fields => onChange({ fields })}
        />
      )}
    </Space>
  );
}
