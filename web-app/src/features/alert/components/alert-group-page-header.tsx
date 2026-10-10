/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
