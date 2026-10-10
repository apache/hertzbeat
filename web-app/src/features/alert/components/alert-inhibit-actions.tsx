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

import { Button, Popconfirm, Space } from 'antd';
import type { TFunction } from 'i18next';

import type { AlertActionCapabilities } from '../model/alert-action-capability';
import type { AlertInhibit } from '../model/alert-inhibit-model';

type AlertInhibitActionsProps = {
  t: TFunction;
  busy: boolean;
  capabilities: AlertActionCapabilities;
  inhibit: AlertInhibit;
  edit: (id: number) => unknown;
  remove: (id: number) => unknown;
};

export function AlertInhibitActions({ t, busy, capabilities, inhibit, edit, remove }: AlertInhibitActionsProps) {
  return (
    <Space>
      {capabilities.canWrite && (
        <Button
          type="link"
          disabled={busy}
          onClick={() => {
            if (!busy) void edit(inhibit.id);
          }}
        >
          {t('common.edit')}
        </Button>
      )}
      {capabilities.canDelete && (
        <Popconfirm
          disabled={busy}
          title={t('alertInhibits.deleteConfirm')}
          okButtonProps={{ disabled: busy }}
          onConfirm={() => {
            if (!busy) void remove(inhibit.id);
          }}
        >
          <Button type="link" danger disabled={busy}>
            {t('alertInhibits.delete')}
          </Button>
        </Popconfirm>
      )}
    </Space>
  );
}
