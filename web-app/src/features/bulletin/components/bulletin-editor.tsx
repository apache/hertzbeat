/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Checkbox, Drawer, Form, Input, Select, Space, Spin, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { BulletinDraft } from '../model/bulletin-model';

type Dependencies = {
  kind: 'loading' | 'ready' | 'invalid' | 'unavailable' | 'error';
  apps: Array<{ value?: string | null; label?: string | null }>;
  monitors: Array<{ id: number; name: string; app: string }>;
  metrics: Array<{ name: string; fields: string[] }>;
};

export function BulletinEditor({ draft, dependencies, saving, onClose, onSave, onChange }: {
  draft: BulletinDraft | null; dependencies: Dependencies; saving: boolean;
  onClose: () => void; onSave: () => void; onChange: (patch: Partial<BulletinDraft>) => void;
}) {
  const { t } = useTranslation();
  const setMetric = (name: string, fields: Array<string | number | boolean>) => {
    const next = { ...draft!.fields };
    const normalized = fields.map(String);
    if (normalized.length) next[name] = normalized; else delete next[name];
    onChange({ fields: next });
  };
  return <Drawer
    open={draft != null} width={640} title={t(draft?.id == null ? 'bulletin.create' : 'bulletin.edit')}
    onClose={onClose} destroyOnHidden
    footer={<Space><Button onClick={onClose}>{t('common.cancel')}</Button><Button type="primary" loading={saving}
      disabled={dependencies.kind !== 'ready'} onClick={onSave}>{t('common.save')}</Button></Space>}
  >
    {draft && <Form layout="vertical">
      <Form.Item label={t('bulletin.name')} required><Input value={draft.name} onChange={event => onChange({ name: event.target.value })} /></Form.Item>
      <Form.Item label={t('bulletin.application')} required>
        <Select value={draft.app || null} showSearch options={dependencies.apps.map(app => ({ value: app.value!, label: app.label || app.value }))}
          onChange={(app: string) => onChange({ app, monitorIds: [], fields: {} })} />
      </Form.Item>
      {dependencies.kind === 'loading' && <Spin />}
      {dependencies.kind !== 'loading' && dependencies.kind !== 'ready' && <Alert type="error" showIcon message={t(`bulletin.dependencies.${dependencies.kind}`)} />}
      {dependencies.kind === 'ready' && draft.app && <>
        <Form.Item label={t('bulletin.monitors')} required>
          <Select mode="multiple" value={draft.monitorIds} options={dependencies.monitors.map(item => ({ value: item.id, label: item.name }))}
            placeholder={t('bulletin.monitorsPlaceholder')} onChange={monitorIds => onChange({ monitorIds, fields: {} })} />
        </Form.Item>
        <Form.Item label={t('bulletin.fields')} required>
          {!draft.monitorIds.length ? <Typography.Text type="secondary">{t('bulletin.selectMonitorFirst')}</Typography.Text>
            : dependencies.metrics.length === 0 ? <Alert type="warning" showIcon message={t('bulletin.noMetrics')} />
              : <Space direction="vertical" size="middle">
                {dependencies.metrics.map(metric => <div key={metric.name}>
                  <Typography.Text strong>{metric.name}</Typography.Text><br />
                  <Checkbox.Group value={draft.fields[metric.name] ?? []} options={metric.fields.map(field => ({ label: field, value: field }))}
                    onChange={fields => setMetric(metric.name, fields)} />
                </div>)}
              </Space>}
        </Form.Item>
      </>}
    </Form>}
  </Drawer>;
}
