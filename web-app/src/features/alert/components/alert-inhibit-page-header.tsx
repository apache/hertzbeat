/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Popconfirm, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertActionCapabilities } from '../model/alert-action-capability';
import styles from '../shared/alert-policy-page.module.css';

export function AlertInhibitPageHeader({
  busy,
  capabilities,
  selectedCount,
  create,
  removeSelected
}: {
  busy: boolean;
  capabilities: AlertActionCapabilities;
  selectedCount: number;
  create: () => unknown;
  removeSelected: () => void;
}) {
  const { t } = useTranslation();
  return (
    <header className={styles.heading}>
      <div>
        <Typography.Title level={2}>{t('alertInhibits.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('alertInhibits.description')}</Typography.Text>
      </div>
      <Space>
        {capabilities.canDelete && selectedCount > 0 && (
          <Popconfirm
            title={t('alertInhibits.deleteSelectedConfirm', { count: selectedCount })}
            disabled={busy}
            okText={t('common.delete')}
            onConfirm={removeSelected}
          >
            <Button danger disabled={busy}>
              {t('alertInhibits.deleteSelected')}
            </Button>
          </Popconfirm>
        )}
        {capabilities.canWrite && (
          <Button type="primary" disabled={busy} onClick={create}>
            {t('alertInhibits.new')}
          </Button>
        )}
      </Space>
    </header>
  );
}
