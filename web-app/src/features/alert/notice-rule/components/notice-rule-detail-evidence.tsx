/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Spin } from 'antd';
import { useTranslation } from 'react-i18next';

import type { NoticeRuleDetailState } from '../model/notice-rule-failure';

type NoticeRuleDetailEvidenceProps = {
  state: NoticeRuleDetailState;
  busy: boolean;
  retry: () => unknown;
};

export function NoticeRuleDetailEvidence({ state, busy, retry }: NoticeRuleDetailEvidenceProps) {
  const { t } = useTranslation();
  if (state.kind === 'idle') return null;
  if (state.kind === 'loading') return <Spin data-testid="notice-rule-detail-loading" />;
  return (
    <Alert
      type="warning"
      showIcon
      message={t(`noticeRules.read.${state.kind}`)}
      action={
        <Button size="small" disabled={busy} onClick={() => void retry()}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}
