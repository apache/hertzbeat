/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { EyeOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertRulePreviewState } from '../model/alert-rule-editor-evidence';
import { AlertRulePreviewEvidence } from './alert-rule-editor-evidence';

export function AlertRulePreviewAction({
  busy,
  state,
  preview
}: {
  busy: boolean;
  state: AlertRulePreviewState;
  preview: () => unknown;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Button
        icon={<EyeOutlined aria-hidden="true" />}
        type="primary"
        loading={state.kind === 'loading'}
        disabled={busy}
        onClick={() => void preview()}
      >
        {t('alertRules.preview')}
      </Button>
      <AlertRulePreviewEvidence state={state} />
    </>
  );
}
