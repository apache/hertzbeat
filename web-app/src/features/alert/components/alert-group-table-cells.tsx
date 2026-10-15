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

import { Button, Popconfirm, Space, Switch } from 'antd';
import type { TFunction } from 'i18next';

import type { AlertGroupConverge } from '../model/alert-group-model';

export type AlertGroupColumnActions = {
  busy: boolean;
  canDelete: boolean;
  canWrite: boolean;
  edit: (id: number) => unknown;
  toggle: (group: AlertGroupConverge, enabled: boolean) => unknown;
  remove: (id: number) => unknown;
};

export function AlertGroupEnabledCell({
  actions,
  group,
  value
}: {
  actions: AlertGroupColumnActions;
  group: AlertGroupConverge;
  value: boolean | null;
}) {
  return (
    <Switch
      checked={value === true}
      disabled={!actions.canWrite || actions.busy || value === null}
      onChange={enabled => void actions.toggle(group, enabled)}
    />
  );
}

export function AlertGroupActionCell({
  actions,
  group,
  t
}: {
  actions: AlertGroupColumnActions;
  group: AlertGroupConverge;
  t: TFunction;
}) {
  return (
    <Space>
      {actions.canWrite && (
        <Button type="link" disabled={actions.busy} onClick={() => void actions.edit(group.id)}>
          {t('common.edit')}
        </Button>
      )}
      {actions.canDelete && (
        <Popconfirm
          title={t('alertGroups.deleteConfirm')}
          okButtonProps={{ disabled: actions.busy }}
          onConfirm={() => actions.remove(group.id)}
        >
          <Button type="link" danger disabled={actions.busy}>
            {t('alertGroups.delete')}
          </Button>
        </Popconfirm>
      )}
    </Space>
  );
}
