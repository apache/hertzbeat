/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { logFilterFailureDescription } from '../model/explore-log-filter-failure';
import { focusLogSyntaxDiagnostic, STRUCTURED_LOG_INPUT_SELECTOR } from './focus-log-syntax-diagnostic';
import type { LogFilterFailureReason, LogSyntaxDiagnostic } from '../model/explore-log-filter-failure';
import { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { OperationalStatePanel } from '@/shared/operational-page';

export function ExploreInvalidLogFilter({
  retained = false,
  invalidFilterReason,
  syntaxDiagnostic
}: {
  retained?: boolean;
  invalidFilterReason?: LogFilterFailureReason | undefined;
  syntaxDiagnostic?: LogSyntaxDiagnostic | undefined;
}) {
  const { t } = useTranslation();
  const region = useRef<HTMLDivElement>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  useEffect(() => {
    if (!focusRequest) return;
    const workspace = region.current?.closest('[data-explore-query-layout]');
    const target =
      workspace?.querySelector<HTMLElement>(STRUCTURED_LOG_INPUT_SELECTOR) ??
      workspace?.querySelector<HTMLTextAreaElement>('[data-log-filter-code] textarea') ??
      workspace?.querySelector<HTMLFormElement>('form');
    target?.focus();
  }, [focusRequest]);
  const reason = logFilterFailureDescription(t, invalidFilterReason, syntaxDiagnostic);
  let reviewKey = 'explore.logQueryBuilder.checkFilter';
  if (invalidFilterReason === 'group_selection_unsupported') reviewKey = 'explore.logGroupSelection.review';
  if (syntaxDiagnostic) reviewKey = 'explore.recovery.reviewQuery';
  return (
    <div ref={region}>
      <OperationalStatePanel
        kind="error"
        title={retained ? t('explore.states.staleError', { reason }) : reason}
        action={
          <Button
            onClick={() => {
              if (focusLogSyntaxDiagnostic(region.current, syntaxDiagnostic)) return;
              if (focusLogFilter(region.current, invalidFilterReason)) return;
              setFocusRequest(current => current + 1);
            }}
          >
            {t(reviewKey)}
          </Button>
        }
      />
    </div>
  );
}

function focusLogFilter(region: HTMLDivElement | null, reason: LogFilterFailureReason | undefined) {
  const workspace = region?.closest('[data-explore-query-layout]');
  const target =
    reason === 'group_selection_unsupported'
      ? workspace?.querySelector<HTMLButtonElement>('[data-log-group-selection-clear]')
      : workspace?.querySelector<HTMLElement>(STRUCTURED_LOG_INPUT_SELECTOR);
  if (target) {
    target.focus();
    return true;
  }
  workspace?.querySelector<HTMLInputElement>('input[name="log-query-editor"][value="code"]')?.click();
  return false;
}
