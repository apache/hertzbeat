/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button } from 'antd';
import type { TFunction } from 'i18next';

export function ExploreLogTransactionNotices({
  mode,
  invalidTransactions,
  invalidCalculated,
  pending,
  t,
  onMode,
  onChange,
  onCalculatedChange
}: {
  mode: string | undefined;
  invalidTransactions: boolean;
  invalidCalculated: boolean;
  pending: boolean;
  t: TFunction;
  onMode: (mode: string) => void;
  onChange: (raw: string | undefined) => void;
  onCalculatedChange?: ((raw: string | undefined) => void) | undefined;
}) {
  return (
    <>
      {invalidTransactions && (
        <span role="alert">
          {t(mode === 'patterns' ? 'explore.logPatterns.invalidSettings' : 'explore.logTransactions.invalid')}
          <Button
            onClick={() => {
              onChange(undefined);
              if (mode === 'transactions') onMode('fields');
            }}
          >
            {t('explore.logTransactions.reset')}
          </Button>
        </span>
      )}
      {invalidCalculated && (
        <span role="alert">
          {t('explore.logCalculated.invalid')}
          <Button
            onClick={() => {
              onCalculatedChange?.(undefined);
              if (mode === 'calculated') onMode('fields');
            }}
          >
            {t('explore.logTransactions.reset')}
          </Button>
        </span>
      )}
      {pending && <span role="status">{t(pendingKey(mode))}</span>}
    </>
  );
}

function pendingKey(mode: string | undefined) {
  if (mode === 'patterns') return 'explore.logPatterns.pending';
  if (mode === 'calculated') return 'explore.logCalculated.pending';
  return 'explore.logTransactions.pending';
}
