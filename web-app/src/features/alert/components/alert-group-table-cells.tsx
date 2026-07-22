/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Popconfirm, Space, Switch } from 'antd';
import type { TFunction } from 'i18next';

import type { AlertGroupConverge } from '../model/alert-group-model';

export type AlertGroupColumnActions = {
  busy: boolean;
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
      disabled={actions.busy || value === null}
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
      <Button type="link" disabled={actions.busy} onClick={() => void actions.edit(group.id)}>
        {t('common.edit')}
      </Button>
      <Popconfirm
        title={t('alertGroups.deleteConfirm')}
        okButtonProps={{ disabled: actions.busy }}
        onConfirm={() => actions.remove(group.id)}
      >
        <Button type="link" danger disabled={actions.busy}>
          {t('alertGroups.delete')}
        </Button>
      </Popconfirm>
    </Space>
  );
}
