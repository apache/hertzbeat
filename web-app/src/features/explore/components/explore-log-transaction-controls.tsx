/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useState, type ReactNode } from 'react';
import type { LogFacetField } from '../model/explore-log-facets';
import { Button } from 'antd';
import { ApartmentOutlined, BarsOutlined, BranchesOutlined } from '@ant-design/icons';
import type { TFunction } from 'i18next';
import { parseLogTransactions } from '../model/explore-log-transactions';
import { parseLogCalculated } from '../model/explore-log-calculated';
import styles from './explore-log-transaction-controls.module.css';
import { CalculatedEditor } from './explore-log-calculated-editor';
import { TransactionEditor } from './explore-log-transaction-editor';
import { ExploreLogTransactionNotices } from './explore-log-transaction-notices';
type Props = {
  fields: LogFacetField[];
  mode: string | undefined;
  raw: string | undefined;
  rawCalculated?: string | undefined;
  pending: boolean;
  t: TFunction;
  onMode: (mode: string) => void;
  onChange: (raw: string | undefined) => void;
  onCalculatedChange?: ((raw: string | undefined) => void) | undefined;
  calculatedOpen?: boolean | undefined;
  onCalculatedOpenChange?: ((open: boolean) => void) | undefined;
  hideCalculatedAction?: boolean | undefined;
  additionSummary?: ReactNode;
};
export function ExploreLogTransactionControls(props: Props) {
  const { fields, mode, raw, rawCalculated, pending, t, onMode, onChange, onCalculatedChange } = props;
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [internalCalculatedOpen, setInternalCalculatedOpen] = useState(false);
  const calculatedOpen = props.calculatedOpen ?? internalCalculatedOpen;
  const setCalculatedOpen = props.onCalculatedOpenChange ?? setInternalCalculatedOpen;
  const invalidTransactions = (raw !== undefined || mode === 'transactions') && !parseLogTransactions(raw);
  const invalidCalculated =
    (rawCalculated !== undefined || mode === 'calculated') && !parseLogCalculated(rawCalculated);
  return (
    <section className={styles.controls} aria-label={t('explore.logTransactions.groupInto')}>
      <span>{t('explore.logTransactions.groupInto')}</span>
      <TransactionModeButtons mode={mode} t={t} onMode={onMode} openTransactions={() => setTransactionOpen(true)} />
      {!props.hideCalculatedAction && (
        <Button
          className={styles.calculatedAction ?? ''}
          aria-pressed={mode === 'calculated'}
          onClick={() => setCalculatedOpen(true)}
        >
          {t('explore.logCalculated.mode')}
        </Button>
      )}
      {props.additionSummary}
      <ExploreLogTransactionNotices
        {...{ mode, invalidTransactions, invalidCalculated, pending, t, onMode, onChange, onCalculatedChange }}
      />
      {transactionOpen && (
        <TransactionEditor
          raw={raw}
          fields={fields}
          t={t}
          onClose={() => setTransactionOpen(false)}
          onApply={value => {
            onChange(value);
            onMode('transactions');
            setTransactionOpen(false);
          }}
        />
      )}
      {calculatedOpen && (
        <CalculatedEditor
          raw={rawCalculated}
          fields={fields}
          t={t}
          onClose={() => setCalculatedOpen(false)}
          onApply={value => {
            onCalculatedChange?.(value);
            onMode('calculated');
            setCalculatedOpen(false);
          }}
        />
      )}
    </section>
  );
}

function TransactionModeButtons({
  mode,
  t,
  onMode,
  openTransactions
}: Pick<Props, 'mode' | 't' | 'onMode'> & { openTransactions: () => void }) {
  const items = mode === 'patterns' || mode === 'transactions' ? ['fields', mode] : ['fields'];
  return (
    <div role="group" aria-label={t('explore.logTransactions.groupInto')}>
      {items.map(item => (
        <Button
          key={item}
          icon={
            item === 'fields' ? (
              <BarsOutlined aria-hidden />
            ) : item === 'patterns' ? (
              <BranchesOutlined aria-hidden />
            ) : (
              <ApartmentOutlined aria-hidden />
            )
          }
          aria-label={t(item === 'patterns' ? 'explore.logPatterns.mode' : 'explore.logTransactions.' + item)}
          aria-pressed={(mode === 'calculated' ? 'fields' : (mode ?? 'fields')) === item}
          onClick={() => (item === 'transactions' ? openTransactions() : onMode(item))}
        >
          {t(item === 'patterns' ? 'explore.logPatterns.mode' : 'explore.logTransactions.' + item)}
        </Button>
      ))}
    </div>
  );
}
