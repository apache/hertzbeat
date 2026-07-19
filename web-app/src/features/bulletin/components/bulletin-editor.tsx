/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Drawer, Form, Input, Select, Space, Spin, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { BulletinDependencies } from '../controller/bulletin-dependencies-controller';
import { bulletinMonitorMatchesSearch, type BulletinDraft } from '../model/bulletin-model';
import { BulletinMetricTree } from './bulletin-metric-tree';

type BulletinEditorProps = {
  draft: BulletinDraft | null;
  dependencies: BulletinDependencies;
  saving: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (patch: Partial<BulletinDraft>) => void;
};

export function BulletinEditor(props: BulletinEditorProps) {
  const { draft, dependencies, saving, busy, onClose, onSave } = props;
  const { t } = useTranslation();
  const canSave = dependencies.kind === 'ready' && dependencies.fieldSelection === 'valid';
  return (
    <Drawer
      open={draft != null}
      width={640}
      title={t(draft?.id == null ? 'bulletin.create' : 'bulletin.edit')}
      onClose={onClose}
      destroyOnHidden
      closable={!busy}
      keyboard={!busy}
      maskClosable={false}
      footer={
        <Space>
          <Button disabled={busy} onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="primary" loading={saving} disabled={busy || !canSave} onClick={onSave}>
            {t('common.save')}
          </Button>
        </Space>
      }
    >
      {draft && <BulletinEditorForm {...props} draft={draft} t={t} />}
    </Drawer>
  );
}

function BulletinEditorForm({
  draft,
  dependencies,
  busy,
  onChange,
  t
}: BulletinEditorProps & {
  draft: BulletinDraft;
  t: (key: string) => string;
}) {
  const monitorById = new Map(dependencies.monitors.map(monitor => [monitor.id, monitor]));
  const monitorOptions = dependencies.monitors.map(monitor => ({ value: monitor.id, label: monitor.name }));
  return (
    <Form layout="vertical">
      <Form.Item label={t('bulletin.name')} required>
        <Input disabled={busy} value={draft.name} onChange={event => onChange({ name: event.target.value })} />
      </Form.Item>
      <Form.Item label={t('bulletin.application')} required>
        <Select
          value={draft.app || null}
          showSearch
          disabled={busy || draft.id != null}
          options={dependencies.apps.map(app => ({ value: app.value!, label: app.label || app.value }))}
          onChange={(app: string) => onChange({ app, monitorIds: [], fields: {} })}
        />
      </Form.Item>
      {dependencies.kind === 'loading' && <Spin />}
      {dependencies.kind !== 'loading' && dependencies.kind !== 'ready' && (
        <Alert type="error" showIcon message={t(`bulletin.dependencies.${dependencies.kind}`)} />
      )}
      {dependencies.kind === 'ready' && draft.app && (
        <>
          <Form.Item label={t('bulletin.monitors')} required>
            <Select
              mode="multiple"
              disabled={busy}
              value={draft.monitorIds}
              options={monitorOptions}
              placeholder={t('bulletin.monitorsPlaceholder')}
              filterOption={(input, option) => {
                const monitor = typeof option?.value === 'number' ? monitorById.get(option.value) : undefined;
                return monitor ? bulletinMonitorMatchesSearch(monitor, input) : false;
              }}
              onChange={monitorIds => onChange({ monitorIds })}
            />
          </Form.Item>
          <Form.Item label={t('bulletin.fields')} required>
            <BulletinFieldSelection draft={draft} dependencies={dependencies} busy={busy} onChange={onChange} t={t} />
          </Form.Item>
        </>
      )}
    </Form>
  );
}

function BulletinFieldSelection({
  draft,
  dependencies,
  busy,
  onChange,
  t
}: {
  draft: BulletinDraft;
  dependencies: BulletinDependencies;
  busy: boolean;
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
          disabled={busy}
          fields={draft.fields}
          tree={dependencies.metricTree}
          onChange={fields => onChange({ fields })}
        />
      )}
    </Space>
  );
}
