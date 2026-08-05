/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
