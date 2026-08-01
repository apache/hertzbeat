/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import type { NoticeRuleDetailState } from '../model/notice-rule-failure';

type NoticeRuleDetailEvidenceProps = {
  state: NoticeRuleDetailState;
  busy: boolean;
  retry: () => unknown;
};

export function NoticeRuleDetailEvidence({ state, busy, retry }: NoticeRuleDetailEvidenceProps) {
  const { t } = useTranslation();
  if (state.kind === 'idle') return null;
  if (state.kind === 'loading') return <OperationalStatePanel kind="loading" title={t('noticeRules.loading')} />;
  return (
    <OperationalStatePanel
      kind={state.kind === 'unavailable' ? 'unavailable' : 'error'}
      title={t(`noticeRules.read.${state.kind}`)}
      action={
        <Button size="small" disabled={busy} onClick={() => void retry()}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}
