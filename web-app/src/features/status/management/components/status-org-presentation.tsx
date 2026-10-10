/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Button, Form, Input, Space } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './status-org-settings.module.css';
import type { StatusOrg } from '../model/status-management-contract';

interface StatusOrgFieldsProps {
  disabled: boolean;
}

interface StatusOrgActionsProps {
  canWrite: boolean;
  editing: boolean;
  saving: boolean;
  locked: boolean;
  canCancel: boolean;
  initialSetup: boolean;
  writeRecovery: 'proof' | 'commit-uncertain' | undefined;
  onCancel: () => void;
  onEdit: () => void;
  onRetry: () => void;
}

export function StatusOrgFields({ disabled }: StatusOrgFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="status-org-grid">
      <Form.Item name="name" label={t('statusManagement.name')} rules={[{ required: true, whitespace: true }]}>
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item name="home" label={t('statusManagement.home')} rules={[{ required: true, whitespace: true }]}>
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item name="description" label={t('status.descriptionLabel')} rules={[{ required: true, whitespace: true }]}>
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item name="logo" label={t('statusManagement.logo')} rules={[{ required: true, whitespace: true }]}>
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item name="feedback" label={t('statusManagement.feedback')}>
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item name="color" label={t('statusManagement.color')} extra={t('statusManagement.colorDescription')}>
        <Input className={styles.colorInput} disabled={disabled} type="color" />
      </Form.Item>
    </div>
  );
}

export function StatusOrgSummary({ org }: { org: StatusOrg }) {
  const { t } = useTranslation();
  return (
    <div role="group" aria-label={t('statusManagement.organizationDetails')}>
      <dl className={styles.settingsList}>
        <StatusOrgSummaryRow label={t('statusManagement.name')}>{org.name}</StatusOrgSummaryRow>
        <StatusOrgSummaryRow label={t('status.descriptionLabel')}>{org.description}</StatusOrgSummaryRow>
        <StatusOrgSummaryRow label={t('statusManagement.home')}>
          <StatusOrgLinkValue value={org.home} />
        </StatusOrgSummaryRow>
        <StatusOrgSummaryRow label={t('statusManagement.logo')}>
          <span className={styles.logoValue}>
            <img src={org.logo} alt="" />
            <span>{org.logo}</span>
          </span>
        </StatusOrgSummaryRow>
        <StatusOrgSummaryRow label={t('statusManagement.feedback')}>
          {org.feedback ? <StatusOrgLinkValue value={org.feedback} /> : <span className={styles.emptyValue}>—</span>}
        </StatusOrgSummaryRow>
        <StatusOrgSummaryRow label={t('statusManagement.color')}>
          <span className={styles.colorValue}>
            <span className={styles.colorSwatch} style={{ backgroundColor: org.color ?? undefined }} />
            {org.color || '—'}
          </span>
        </StatusOrgSummaryRow>
      </dl>
    </div>
  );
}

function StatusOrgLinkValue({ value }: { value: string }) {
  return (
    <span className={styles.linkValue}>
      <strong>{publicLinkLabel(value)}</strong>
      <span>{value}</span>
    </span>
  );
}

function publicLinkLabel(value: string) {
  if (value.startsWith('/')) return value;
  try {
    return new URL(value).host || value;
  } catch {
    return value;
  }
}

function StatusOrgSummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.settingsRow}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function StatusOrgActions({
  canWrite,
  editing,
  saving,
  locked,
  canCancel,
  initialSetup,
  writeRecovery,
  onCancel,
  onEdit,
  onRetry
}: StatusOrgActionsProps) {
  const { t } = useTranslation();
  if (!canWrite) return null;

  return (
    <Space>
      {editing ? (
        <>
          <Button
            type="primary"
            htmlType={writeRecovery ? 'button' : 'submit'}
            loading={saving}
            disabled={writeRecovery === 'commit-uncertain' || (locked && writeRecovery !== 'proof')}
            onClick={writeRecovery === 'proof' ? onRetry : undefined}
          >
            {t(statusOrgActionKey(writeRecovery, initialSetup))}
          </Button>
          {canCancel && (
            <Button htmlType="button" disabled={locked} onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          )}
        </>
      ) : (
        <Button htmlType="button" disabled={locked} onClick={onEdit}>
          {t('common.edit')}
        </Button>
      )}
    </Space>
  );
}

function statusOrgActionKey(writeRecovery: StatusOrgActionsProps['writeRecovery'], initialSetup: boolean) {
  if (writeRecovery === 'proof') return 'common.retry';
  if (initialSetup) return 'statusManagement.createPage';
  return 'common.save';
}
