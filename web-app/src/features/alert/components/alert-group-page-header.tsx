/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Popconfirm, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalPageHeader } from '@/shared/operational-page/operational-page';

export function AlertGroupPageHeader({
  busy,
  canCreate,
  canDelete,
  create,
  removeSelected,
  selectedCount
}: {
  busy: boolean;
  canCreate: boolean;
  canDelete: boolean;
  create: () => void;
  removeSelected: () => unknown;
  selectedCount: number;
}) {
  const { t } = useTranslation();
  return (
    <OperationalPageHeader
      title={t('alertGroups.title')}
      description={t('alertGroups.description')}
      actions={
        <Space>
          {canDelete && selectedCount > 0 && (
            <Popconfirm
              title={t('alertGroups.deleteSelectedConfirm', { count: selectedCount })}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true, disabled: busy }}
              onConfirm={removeSelected}
            >
              <Button danger disabled={busy}>
                {t('alertGroups.deleteSelected')}
              </Button>
            </Popconfirm>
          )}
          {canCreate && (
            <Button type="primary" disabled={busy} onClick={create}>
              {t('alertGroups.new')}
            </Button>
          )}
        </Space>
      }
    />
  );
}
