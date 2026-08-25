/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Select } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  alertLabelMatcherOptions,
  alertLabelMatcherRowsFromValue,
  nextAlertLabelMatcherRowId,
  replaceAlertLabelMatcherRow,
  serializeAlertLabelMatcherRows,
  type AlertLabelMatcherRow
} from '../model/alert-label-matcher-editor-model';
import type { AlertLabelSuggestionState } from '../model/alert-label-suggestion-model';
import { parseLabelMatchers } from '../shared/alert-label-matchers';
import styles from '../shared/alert-label-matcher-editor.module.css';

type MatcherDraft = { baseValue: string; nextValue: string; rows: AlertLabelMatcherRow[] };

export function AlertLabelMatcherEditor(props: {
  value: string;
  disabled: boolean;
  invalid: boolean;
  suggestions: AlertLabelSuggestionState;
  translationRoot: 'alertInhibits' | 'alertSilences';
  change: (value: string) => void;
}) {
  const { t } = useTranslation();
  const source = parseLabelMatchers(props.value) ?? {};
  const [draft, setDraft] = useState<MatcherDraft | null>(null);
  const [keySearch, setKeySearch] = useState<Record<number, string>>({});
  const [valueSearch, setValueSearch] = useState<Record<number, string>>({});
  const draftIsCurrent = draft && (draft.baseValue === props.value || draft.nextValue === props.value);
  const rows = draftIsCurrent ? draft.rows : alertLabelMatcherRowsFromValue(source);
  const catalogKeys = props.suggestions.catalog?.keys ?? props.suggestions.keys;
  const valuesByKey = props.suggestions.catalog?.valuesByKey ?? {};
  const keyLabel = t(`${props.translationRoot}.matcherKey`);
  const valueLabel = t(`${props.translationRoot}.matcherValue`);

  const commit = (nextRows: AlertLabelMatcherRow[]) => {
    const nextValue = serializeAlertLabelMatcherRows(nextRows);
    setDraft({ baseValue: draftIsCurrent ? draft.baseValue : props.value, nextValue, rows: nextRows });
    props.change(nextValue);
  };

  return (
    <div className={styles.matcherRows}>
      {rows.map((row, index) => (
        <div className={styles.matcherRow} key={row.id}>
          <Select
            allowClear
            showSearch
            aria-label={keyLabel}
            aria-invalid={props.invalid}
            disabled={props.disabled}
            filterOption={false}
            loading={props.suggestions.kind === 'loading'}
            options={alertLabelMatcherOptions(catalogKeys, row.key, keySearch[row.id] ?? '')}
            placeholder={keyLabel}
            value={row.key || undefined}
            {...(props.invalid ? { status: 'error' as const } : {})}
            onSearch={search => setKeySearch(current => ({ ...current, [row.id]: search }))}
            onChange={key => {
              setKeySearch(current => ({ ...current, [row.id]: '' }));
              commit(replaceAlertLabelMatcherRow(rows, index, { id: row.id, key: key ?? '', value: '' }));
            }}
          />
          <span aria-hidden="true">:</span>
          <Select
            allowClear
            showSearch
            aria-label={valueLabel}
            aria-invalid={props.invalid}
            disabled={props.disabled}
            filterOption={false}
            loading={props.suggestions.kind === 'loading'}
            options={alertLabelMatcherOptions(valuesByKey[row.key] ?? [], row.value, valueSearch[row.id] ?? '')}
            placeholder={valueLabel}
            value={row.value || undefined}
            {...(props.invalid ? { status: 'error' as const } : {})}
            onSearch={search => setValueSearch(current => ({ ...current, [row.id]: search }))}
            onChange={value => {
              setValueSearch(current => ({ ...current, [row.id]: '' }));
              commit(replaceAlertLabelMatcherRow(rows, index, { ...row, value: value ?? '' }));
            }}
          />
          <div className={styles.matcherActions}>
            {rows.length > 1 && (
              <Button
                size="small"
                aria-label={t(`${props.translationRoot}.removeMatcher`)}
                disabled={props.disabled}
                icon={<MinusOutlined />}
                onClick={() => commit(rows.filter(candidate => candidate.id !== row.id))}
              />
            )}
            <Button
              size="small"
              aria-label={t(`${props.translationRoot}.addMatcher`)}
              disabled={props.disabled}
              icon={<PlusOutlined />}
              onClick={() => commit([...rows, { id: nextAlertLabelMatcherRowId(rows), key: '', value: '' }])}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
