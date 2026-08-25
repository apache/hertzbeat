/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Select } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { LabelSuggestionCatalog } from '@/shared/labels/label-suggestion-model';

import {
  alertRuleLabelMapFromRows,
  alertRuleLabelMapSignature,
  alertRuleLabelOptions,
  alertRuleLabelRowsFromValue,
  nextAlertRuleLabelRowId,
  replaceAlertRuleLabelRow,
  type AlertRuleLabelRow
} from '../model/alert-rule-label-selector-model';
import type { AlertLabelSuggestionState } from '../model/alert-label-suggestion-model';
import styles from '../shared/alert-rule-editor.module.css';

export function AlertRuleLabelSelector(props: {
  value: Record<string, string>;
  busy: boolean;
  suggestions: AlertLabelSuggestionState;
  change: (value: Record<string, string>) => void;
}) {
  const { t } = useTranslation();
  const valueSignature = alertRuleLabelMapSignature(props.value);
  const [draft, setDraft] = useState<LabelRowDraft | null>(null);
  const [keySearch, setKeySearch] = useState<Record<number, string>>({});
  const [valueSearch, setValueSearch] = useState<Record<number, string>>({});
  const rows = draft?.sourceSignature === valueSignature ? draft.rows : alertRuleLabelRowsFromValue(props.value);

  const commit = (nextRows: AlertRuleLabelRow[]) => {
    const nextValue = alertRuleLabelMapFromRows(nextRows);
    setDraft({ sourceSignature: alertRuleLabelMapSignature(nextValue), rows: nextRows });
    props.change(nextValue);
  };
  const catalog = props.suggestions.catalog ?? emptyCatalog;

  return (
    <div className={styles.labelSelector}>
      {rows.map((row, index) => (
        <div className={styles.labelRow} key={row.id}>
          <Select
            allowClear
            showSearch
            aria-label={t('alertRules.map.key')}
            disabled={props.busy}
            filterOption={false}
            loading={props.suggestions.kind === 'loading'}
            options={alertRuleLabelOptions(catalog.keys, row.key, keySearch[row.id] ?? '')}
            placeholder={t('alertRules.map.key')}
            value={row.key || undefined}
            onSearch={search => setKeySearch(current => ({ ...current, [row.id]: search }))}
            onChange={key => {
              setKeySearch(current => ({ ...current, [row.id]: '' }));
              commit(replaceAlertRuleLabelRow(rows, index, { key: key ?? '', value: '', id: row.id }));
            }}
          />
          <span aria-hidden="true">:</span>
          <Select
            allowClear
            showSearch
            aria-label={t('alertRules.map.value')}
            disabled={props.busy}
            filterOption={false}
            loading={props.suggestions.kind === 'loading'}
            options={alertRuleLabelOptions(catalog.valuesByKey[row.key] ?? [], row.value, valueSearch[row.id] ?? '')}
            placeholder={t('alertRules.map.value')}
            value={row.value || undefined}
            onSearch={search => setValueSearch(current => ({ ...current, [row.id]: search }))}
            onChange={value => {
              setValueSearch(current => ({ ...current, [row.id]: '' }));
              commit(replaceAlertRuleLabelRow(rows, index, { ...row, value: value ?? '' }));
            }}
          />
          <div className={styles.labelButtons}>
            {rows.length > 1 && (
              <Button
                size="small"
                aria-label={t('alertRules.map.remove')}
                disabled={props.busy}
                icon={<MinusOutlined />}
                onClick={() => commit(rows.filter(candidate => candidate.id !== row.id))}
              />
            )}
            <Button
              size="small"
              aria-label={t('alertRules.map.addLabel')}
              disabled={props.busy}
              icon={<PlusOutlined />}
              onClick={() => commit([...rows, { id: nextAlertRuleLabelRowId(rows), key: '', value: '' }])}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

type LabelRowDraft = { sourceSignature: string; rows: AlertRuleLabelRow[] };

const emptyCatalog: LabelSuggestionCatalog = { keys: [], valuesByKey: {} };
