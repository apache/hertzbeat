/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useTranslation } from 'react-i18next';

import { OperationalStatePanel, type OperationalStateKind } from '@/shared/operational-page';

import type { BulletinCommand, BulletinOutcomeNotice, BulletinRecovery } from '../model/bulletin-operation-state';
import { BulletinOutcomeNoticeAlert, BulletinRecoveryAlert } from './bulletin-recovery-alert';

type BulletinListKind =
  'idle' | 'loading' | 'correcting' | 'empty' | 'ready' | 'invalid' | 'permission' | 'unavailable' | 'error';

export function BulletinPageStatus({
  command,
  list,
  notice,
  recovery,
  onDismissNotice,
  onRetry,
  onStopVerification
}: {
  command: BulletinCommand;
  list: { kind: BulletinListKind };
  notice: BulletinOutcomeNotice | null;
  recovery: BulletinRecovery | null;
  onDismissNotice: () => void;
  onRetry: () => void;
  onStopVerification: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {(list.kind === 'loading' || list.kind === 'correcting') && (
        <OperationalStatePanel kind="loading" title={t('bulletin.loading')} />
      )}
      {list.kind === 'empty' && <OperationalStatePanel kind="empty" title={t('bulletin.empty')} />}
      {(list.kind === 'invalid' ||
        list.kind === 'permission' ||
        list.kind === 'unavailable' ||
        list.kind === 'error') && (
        <OperationalStatePanel kind={failureStateKind(list.kind)} title={t(`bulletin.list.${list.kind}`)} />
      )}
      <BulletinRecoveryAlert
        recovery={recovery}
        recovering={command === 'recovering'}
        onRetry={onRetry}
        onStop={onStopVerification}
      />
      <BulletinOutcomeNoticeAlert notice={notice} onDismiss={onDismissNotice} />
    </>
  );
}

function failureStateKind(kind: 'invalid' | 'permission' | 'unavailable' | 'error'): OperationalStateKind {
  if (kind === 'permission') return 'permission';
  if (kind === 'unavailable') return 'unavailable';
  return 'error';
}
