/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useId, useState } from 'react';
import { Button, Drawer, Input, InputNumber } from 'antd';
import type { TFunction } from 'i18next';
import type { LogFacetField } from '../model/explore-log-facets';
import { parseLogTransactions, validTransactionField } from '../model/explore-log-transactions';
import styles from './explore-log-transaction-editor.module.css';

export function TransactionEditor({
  raw,
  fields,
  t,
  onClose,
  onApply
}: {
  raw: string | undefined;
  fields: LogFacetField[];
  t: TFunction;
  onClose: () => void;
  onApply: (raw: string) => void;
}) {
  const [value, setValue] = useState<Record<string, unknown>>(() => readDraft(raw));
  return (
    <Drawer
      title={t('explore.logTransactions.transactions')}
      open
      onClose={onClose}
      width={480}
      footer={
        <div className={styles.calculatedActions}>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            type="primary"
            disabled={!parseLogTransactions(JSON.stringify(value))}
            onClick={() => onApply(JSON.stringify(value))}
          >
            {t('common.confirm')}
          </Button>
        </div>
      }
    >
      <div className={styles.calculatedEditor}>
        <TransactionFields
          fields={fields}
          value={value}
          change={patch => setValue(current => ({ ...current, ...patch }))}
          t={t}
        />
      </div>
    </Drawer>
  );
}
function readDraft(raw: string | undefined): Record<string, unknown> {
  if (raw === undefined) return { version: 1, field: '', limit: 20, order: 'related-count-desc' };
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : { field: raw };
  } catch {
    return { field: raw };
  }
}

function TransactionFields({
  fields,
  value,
  change,
  t
}: {
  fields: LogFacetField[];
  value: Record<string, unknown>;
  change: (patch: Record<string, unknown>) => void;
  t: TFunction;
}) {
  const listId = useId();
  return (
    <>
      <label>
        {t('explore.logTransactions.field')}
        <Input
          list={listId}
          value={typeof value.field === 'string' ? value.field : ''}
          placeholder="attribute:requestId"
          onChange={e => change({ field: e.target.value })}
        />
      </label>
      <datalist id={listId}>
        {fields
          .filter(field => validTransactionField(field.id))
          .map(field => (
            <option key={field.id} value={field.id} />
          ))}
      </datalist>
      <label>
        {t('explore.logTransactions.limit')}
        <InputNumber
          min={1}
          max={100}
          value={typeof value.limit === 'number' ? value.limit : null}
          onChange={limit => change({ limit })}
        />
      </label>
    </>
  );
}
