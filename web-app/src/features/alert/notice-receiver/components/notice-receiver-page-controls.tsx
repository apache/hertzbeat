/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import styles from '../../shared/alert-policy-page.module.css';
import type { NoticeReceiverRecovery as NoticeReceiverRecoveryState } from '../model/notice-receiver-operation-state';

export function NoticeReceiverHeading({ busy, create }: { busy: boolean; create: () => void }) {
  const { t } = useTranslation();
  return (
    <header className={styles.heading}>
      <div>
        <Typography.Title level={2}>{t('noticeReceivers.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('noticeReceivers.description')}</Typography.Text>
      </div>
      <Button type="primary" disabled={busy} onClick={create}>
        {t('noticeReceivers.new')}
      </Button>
    </header>
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
    <div className={styles.toolbar}>
      <Input
        allowClear
        value={name}
        placeholder={t('noticeReceivers.search')}
        disabled={busy}
        onChange={event => setName(event.target.value)}
        onPressEnter={() => void search()}
      />
      <Button type="primary" disabled={busy} onClick={search}>
        {t('common.query')}
      </Button>
      <Button
        loading={refreshing}
        disabled={busy && (!recovering || !recoveryRetryable)}
        onClick={() => void refresh()}
      >
        {t('common.refresh')}
      </Button>
    </div>
  );
}

export function NoticeReceiverRecovery({
  recovery,
  busy,
  retry
}: {
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
        <Button size="small" disabled={busy || !recovery.retryable} onClick={() => void retry()}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}
