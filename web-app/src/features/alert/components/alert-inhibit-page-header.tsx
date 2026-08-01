/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Popconfirm, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalPageHeader } from '@/shared/operational-page/operational-page';
import type { AlertActionCapabilities } from '../model/alert-action-capability';

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
    <OperationalPageHeader
      title={t('alertInhibits.title')}
      description={t('alertInhibits.description')}
      actions={
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
      }
    />
  );
}
