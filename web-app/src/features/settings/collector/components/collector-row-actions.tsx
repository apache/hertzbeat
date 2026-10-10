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

import { DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import { Button, Dropdown, Typography } from 'antd';
import type { TFunction } from 'i18next';

import { classifyCollectorKind } from '../model/collector-kind-model';
import type { CollectorMutationAction, CollectorRecord } from '../model/collector-model';
import styles from './collector-row-actions.module.css';

export type CollectorRowActionsProps = {
  canWrite: boolean;
  canDelete: boolean;
  busy: boolean;
  onAction: (action: CollectorMutationAction, collectors: string[]) => void;
  onIntake: (name: string) => void;
  onRuntime: (name: string) => void;
  showConfiguration?: boolean;
  collapseDanger?: boolean;
};

export function CollectorRowActions({
  record,
  t,
  showConfiguration = true,
  ...props
}: CollectorRowActionsProps & { record: CollectorRecord; t: TFunction }) {
  return (
    <div className={styles.actions}>
      <CollectorConfigurationActions {...props} record={record} t={t} visible={props.canWrite && showConfiguration} />
      {record.immutable ? (
        <Typography.Text type="secondary">{t('collectors.protected')}</Typography.Text>
      ) : (
        (props.canWrite || props.canDelete) && <MutableActions {...props} record={record} t={t} />
      )}
    </div>
  );
}

function CollectorConfigurationActions({
  record,
  t,
  visible,
  ...props
}: CollectorRowActionsProps & { record: CollectorRecord; t: TFunction; visible: boolean }) {
  if (!visible) return null;
  const serverOwnedIntake =
    record.instrumentationIntake.status === 'available' && record.instrumentationIntake.gateway === 'server';
  const hybrid = classifyCollectorKind(record) === 'hybrid';
  return (
    <>
      {(hybrid || serverOwnedIntake) && (
        <Button
          size="small"
          disabled={props.busy}
          aria-label={t(serverOwnedIntake ? 'collectors.intake.viewServerNamed' : 'collectors.intake.configureNamed', {
            name: record.name
          })}
          onClick={() => props.onIntake(record.name)}
        >
          {t(serverOwnedIntake ? 'collectors.intake.viewServer' : 'collectors.intake.configure')}
        </Button>
      )}
      {hybrid && (
        <Button
          size="small"
          disabled={props.busy}
          aria-label={t('collectors.runtime.configureNamed', { name: record.name })}
          onClick={() => props.onRuntime(record.name)}
        >
          {t('collectors.runtime.configure')}
        </Button>
      )}
    </>
  );
}

function MutableActions({ record, t, ...props }: CollectorRowActionsProps & { record: CollectorRecord; t: TFunction }) {
  return (
    <>
      {props.canWrite && (
        <Button
          size="small"
          disabled={props.busy}
          aria-label={t(record.online ? 'collectors.takeOfflineNamed' : 'collectors.takeOnlineNamed', {
            name: record.name
          })}
          onClick={() => props.onAction(record.online ? 'offline' : 'online', [record.name])}
        >
          {t(record.online ? 'collectors.takeOffline' : 'collectors.takeOnline')}
        </Button>
      )}
      {props.canDelete && props.collapseDanger && (
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              {
                key: 'delete',
                danger: true,
                icon: <DeleteOutlined />,
                label: t('collectors.delete')
              }
            ],
            onClick: ({ key }) => key === 'delete' && props.onAction('delete', [record.name])
          }}
        >
          <Button
            size="small"
            icon={<MoreOutlined />}
            aria-label={t('collectors.details.moreActions')}
            disabled={props.busy}
          />
        </Dropdown>
      )}
      {props.canDelete && !props.collapseDanger && (
        <Button
          size="small"
          danger
          disabled={props.busy}
          aria-label={t('collectors.deleteNamed', { name: record.name })}
          onClick={() => props.onAction('delete', [record.name])}
        >
          {t('collectors.delete')}
        </Button>
      )}
    </>
  );
}
