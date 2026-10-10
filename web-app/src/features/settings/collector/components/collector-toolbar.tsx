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

import { Button, Input, Space } from 'antd';
import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalCommandBar } from '@/shared/operational-page';

import type { CollectorMutationAction } from '../model/collector-model';
import styles from './collector-toolbar.module.css';

type Props = {
  canWrite: boolean;
  canDelete: boolean;
  name: string;
  selected: string[];
  mutating: boolean;
  refreshing: boolean;
  onDeploy: () => void;
  deployTriggerRef?: Ref<HTMLButtonElement>;
  searchButtonRef?: Ref<HTMLButtonElement>;
  onName: (name: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
  onAction: (action: CollectorMutationAction, collectors: string[]) => void;
};

export function CollectorToolbar({ deployTriggerRef, searchButtonRef, ...props }: Props) {
  const { t } = useTranslation();
  const disabled = props.mutating || props.selected.length === 0;
  return (
    <OperationalCommandBar
      role="search"
      ariaLabel={t('collectors.search')}
      primary={
        <Space.Compact className={styles.search}>
          <Input
            allowClear
            value={props.name}
            disabled={props.mutating}
            placeholder={t('collectors.search')}
            onChange={event => props.onName(event.target.value)}
            onPressEnter={props.onSearch}
          />
          <Button ref={searchButtonRef} type="primary" disabled={props.mutating} onClick={props.onSearch}>
            {t('collectors.searchAction')}
          </Button>
        </Space.Compact>
      }
      secondary={
        <Space wrap size={8}>
          <Button disabled={props.mutating} loading={props.refreshing && !props.mutating} onClick={props.onRefresh}>
            {t('common.refresh')}
          </Button>
          {props.canWrite && (
            <>
              <Button ref={deployTriggerRef} disabled={props.mutating} onClick={props.onDeploy}>
                {t('collectors.deploy.action')}
              </Button>
              <Button disabled={disabled} onClick={() => props.onAction('online', props.selected)}>
                {t('collectors.takeSelectedOnline')}
              </Button>
              <Button disabled={disabled} onClick={() => props.onAction('offline', props.selected)}>
                {t('collectors.takeSelectedOffline')}
              </Button>
            </>
          )}
          {props.canDelete && (
            <Button danger disabled={disabled} onClick={() => props.onAction('delete', props.selected)}>
              {t('collectors.deleteSelected')}
            </Button>
          )}
        </Space>
      }
    />
  );
}
