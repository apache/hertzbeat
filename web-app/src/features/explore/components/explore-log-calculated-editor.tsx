/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useId, useState } from 'react';
import { Button, Drawer, Input, Select } from 'antd';
import type { TFunction } from 'i18next';
import type { LogFacetField } from '../model/explore-log-facets';
import { defaultLogCalculatedDraft, parseLogCalculated } from '../model/explore-log-calculated';
import { validTransactionField } from '../model/explore-log-transactions';
import styles from './explore-log-transaction-editor.module.css';

export function CalculatedEditor({
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
  const [value, setValue] = useState<Record<string, unknown>>(() => readCalculatedDraft(raw));
  return (
    <Drawer
      title={t('explore.logCalculated.mode')}
      open
      onClose={onClose}
      width={480}
      footer={
        <div className={styles.calculatedActions}>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            type="primary"
            disabled={!parseLogCalculated(JSON.stringify(value))}
            onClick={() => onApply(JSON.stringify(value))}
          >
            {t('common.confirm')}
          </Button>
        </div>
      }
    >
      <div className={styles.calculatedEditor}>
        <CalculatedFields
          fields={fields}
          value={value}
          change={patch => setValue(current => ({ ...current, ...patch }))}
          t={t}
        />
      </div>
    </Drawer>
  );
}
function readCalculatedDraft(raw: string | undefined): Record<string, unknown> {
  if (raw === undefined) return JSON.parse(defaultLogCalculatedDraft()) as Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : { name: raw };
  } catch {
    return { name: raw };
  }
}

function CalculatedFields({
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
  const kind = value.kind === 'extract' ? 'extract' : 'formula';
  const input = (key: string, placeholder = '') => (
    <label>
      {t('explore.logCalculated.' + key)}
      <Input
        list={['left', 'right', 'source'].includes(key) ? listId : undefined}
        value={typeof value[key] === 'string' ? value[key] : ''}
        placeholder={placeholder}
        onChange={event => change({ [key]: event.target.value })}
      />
    </label>
  );
  return (
    <>
      {input('name', 'derived')}
      <CalculatedKindSelect kind={kind} change={change} t={t} />
      {kind === 'formula' ? (
        <>
          {input('left', 'attribute:client_latency')}
          <label>
            {t('explore.logCalculated.operator')}
            <Select
              value={typeof value.operator === 'string' ? value.operator : '-'}
              options={['+', '-', '*', '/'].map(item => ({ value: item, label: item }))}
              onChange={operator => change({ operator })}
            />
          </label>
          {input('right', 'attribute:server_latency')}
        </>
      ) : (
        <>
          {input('source', 'body')}
          {input('before')}
          {input('after')}
        </>
      )}
      <datalist id={listId}>
        <option value="body" />
        {fields
          .filter(field => validTransactionField(field.id))
          .map(field => (
            <option key={field.id} value={field.id} />
          ))}
      </datalist>
    </>
  );
}

function CalculatedKindSelect({
  kind,
  change,
  t
}: {
  kind: 'formula' | 'extract';
  change: (patch: Record<string, unknown>) => void;
  t: TFunction;
}) {
  return (
    <label>
      {t('explore.logCalculated.kind')}
      <Select
        value={kind}
        options={['formula', 'extract'].map(item => ({ value: item, label: t('explore.logCalculated.' + item) }))}
        onChange={next =>
          change(
            next === 'formula'
              ? {
                  kind: 'formula',
                  left: '',
                  operator: '-',
                  right: '',
                  source: undefined,
                  before: undefined,
                  after: undefined
                }
              : {
                  kind: 'extract',
                  source: 'body',
                  before: '',
                  after: '',
                  left: undefined,
                  operator: undefined,
                  right: undefined
                }
          )
        }
      />
    </label>
  );
}
