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

import { Button, Input } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalCommandBar, OperationalPageHeader } from '@/shared/operational-page';

type NoticeRuleToolbarProps = {
  name: string;
  canCreate: boolean;
  busy: boolean;
  refreshing: boolean;
  createDisabled: boolean;
  onNameChange: (value: string) => void;
  onQuery: () => void;
  onRefresh: () => void;
  onCreate: () => void;
};

export function NoticeRuleToolbar(props: NoticeRuleToolbarProps) {
  const { t } = useTranslation();
  return (
    <>
      <OperationalPageHeader
        title={t('noticeRules.title')}
        description={t('noticeRules.description')}
        actions={
          props.canCreate ? (
            <Button type="primary" disabled={props.createDisabled} onClick={props.onCreate}>
              {t('noticeRules.new')}
            </Button>
          ) : undefined
        }
      />
      <OperationalCommandBar
        role="search"
        ariaLabel={t('noticeRules.search')}
        primary={
          <Input
            allowClear
            disabled={props.busy || props.refreshing}
            value={props.name}
            placeholder={t('noticeRules.search')}
            aria-label={t('noticeRules.search')}
            onChange={event => props.onNameChange(event.target.value)}
            onPressEnter={props.onQuery}
          />
        }
        secondary={
          <>
            <Button type="primary" disabled={props.busy || props.refreshing} onClick={props.onQuery}>
              {t('common.query')}
            </Button>
            <Button disabled={props.busy} loading={props.refreshing} onClick={props.onRefresh}>
              {t('common.refresh')}
            </Button>
          </>
        }
      />
    </>
  );
}
