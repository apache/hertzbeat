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
