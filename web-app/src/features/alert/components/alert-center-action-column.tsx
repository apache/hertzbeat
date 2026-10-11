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
    width: 56,
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
