/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { ColumnsType } from 'antd/es/table';

import type { AlertCenterActionPolicy } from '../model/alert-capability-model';
import type { AlertGroup } from '../model/alert-model';
import { AlertCenterRowActions } from './alert-center-row-actions';

type Translator = (key: string) => string;

export type AlertCenterRowActionHandlers = {
  acknowledge: (group: AlertGroup) => void | Promise<unknown>;
  remove: (group: AlertGroup) => void | Promise<unknown>;
  resolve: (group: AlertGroup) => void | Promise<unknown>;
  reopen: (group: AlertGroup) => void | Promise<unknown>;
  unacknowledge: (group: AlertGroup) => void | Promise<unknown>;
};

type AlertCenterActionColumnOptions = {
  t: Translator;
  actionPolicy: AlertCenterActionPolicy;
  busy: boolean;
  actions: AlertCenterRowActionHandlers;
};

export function alertCenterActionColumn({
  t,
  actionPolicy,
  busy,
  actions
}: AlertCenterActionColumnOptions): ColumnsType<AlertGroup>[number] {
  return {
    title: t('common.actions'),
    width: 210,
    render: (_value, group) => (
      <AlertCenterRowActions
        actionPolicy={actionPolicy}
        acknowledge={actions.acknowledge}
        busy={busy}
        group={group}
        remove={actions.remove}
        resolve={actions.resolve}
        reopen={actions.reopen}
        unacknowledge={actions.unacknowledge}
      />
    )
  };
}
