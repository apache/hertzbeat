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

import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalCommandBar, OperationalPageHeader, OperationalSearchControl } from '@/shared/operational-page';
import type { NoticeReceiverRecovery as NoticeReceiverRecoveryState } from '../model/notice-receiver-operation-state';

export function NoticeReceiverHeading({
  busy,
  canCreate,
  create
}: {
  busy: boolean;
  canCreate: boolean;
  create: () => void;
}) {
  const { t } = useTranslation();
  return (
    <OperationalPageHeader
      title={t('noticeReceivers.title')}
      description={t('noticeReceivers.description')}
      actions={
        canCreate ? (
          <Button type="primary" disabled={busy} onClick={create}>
            {t('noticeReceivers.new')}
          </Button>
        ) : undefined
      }
    />
  );
}

export function NoticeReceiverToolbar({
  name,
  refreshing,
  busy,
  recovering,
  recoveryRetryable,
  setName,
  search,
  refresh
}: {
  name: string;
  refreshing: boolean;
  busy: boolean;
  recovering: boolean;
  recoveryRetryable: boolean;
  setName: (value: string) => void;
  search: () => unknown;
  refresh: () => unknown;
}) {
  const { t } = useTranslation();
  return (
    <OperationalCommandBar
      role="search"
      ariaLabel={t('noticeReceivers.search')}
      primary={
        <OperationalSearchControl
          ariaLabel={t('noticeReceivers.search')}
          value={name}
          placeholder={t('noticeReceivers.search')}
          submitLabel={t('common.query')}
          disabled={busy || refreshing}
          onChange={setName}
          onSubmit={search}
        />
      }
      secondary={
        <Button
          loading={refreshing}
          disabled={busy && (!recovering || !recoveryRetryable)}
          onClick={() => void refresh()}
        >
          {t('common.refresh')}
        </Button>
      }
    />
  );
}

export function NoticeReceiverRecovery({
  canRetry,
  recovery,
  busy,
  retry
}: {
  canRetry: boolean;
  recovery: NoticeReceiverRecoveryState | undefined;
  busy: boolean;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (!recovery) return null;
  const message =
    recovery.kind === 'save' ? t('noticeReceivers.save.unavailable') : t('noticeReceivers.deleteError.unavailable');
  return (
    <Alert
      type="warning"
      showIcon
      message={message}
      action={
        canRetry ? (
          <Button size="small" disabled={busy || !recovery.retryable} onClick={() => void retry()}>
            {t('common.retry')}
          </Button>
        ) : undefined
      }
    />
  );
}
