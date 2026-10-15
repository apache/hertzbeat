/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Button, Checkbox, Input } from 'antd';
import { useState } from 'react';
import type { TFunction } from 'i18next';
import { removeLogSource, type LogQuerySet, type LogQuerySource } from '@/platform/perses';
import { parseQueryFormula } from '@/shared/query-context/query-formula';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';
import styles from './explore-log-add-authoring.module.css';

function sourceDependent(value: LogQuerySet, refId: string) {
  return value.formulas.some(formula => {
    try {
      return parseQueryFormula(formula.expression).references.includes(refId);
    } catch {
      return true;
    }
  });
}

export function SourceActions({
  source,
  value,
  update,
  remove,
  onSubmit,
  t
}: {
  source: LogQuerySource;
  value: LogQuerySet;
  update: (next: LogQuerySource) => void;
  remove: () => void;
  onSubmit?: (() => void) | undefined;
  t: TFunction;
}) {
  const dependent = sourceDependent(value, source.refId);
  return (
    <span className={styles.actions}>
      <AliasEditor
        refId={source.refId}
        alias={source.alias}
        t={t}
        onChange={alias => update({ ...source, alias })}
        onSubmit={onSubmit}
      />
      <Checkbox
        checked={source.visible}
        aria-label={t('explore.logComparison.showSource', { source: source.refId })}
        onChange={event => update({ ...source, visible: event.target.checked })}
      />
      {value.queries.length > 1 && (
        <Button
          type="text"
          aria-label={t('explore.logAdd.removeQuery', { source: source.refId })}
          disabled={dependent}
          title={dependent ? t('explore.logAdd.dependency') : undefined}
          onClick={remove}
        >
          {t('common.delete')}
        </Button>
      )}
    </span>
  );
}

export function ExploreLogPrimarySourceActions({
  raw,
  onChange,
  t
}: {
  raw: string | undefined;
  onChange: (raw: string) => void;
  t: TFunction;
}) {
  const analysis = readLogAnalysisDraft(raw);
  const value = analysis?.querySet;
  const source = value?.queries[0];
  if (!analysis || !value || !source) return null;
  const updateSet = (next: LogQuerySet) => onChange(JSON.stringify({ ...analysis, querySet: next }));
  return (
    <SourceActions
      source={source}
      value={value}
      t={t}
      update={next =>
        updateSet({ ...value, queries: value.queries.map(item => (item.refId === source.refId ? next : item)) })
      }
      remove={() => updateSet(removeLogSource(value, source.refId))}
    />
  );
}

export function AliasEditor({
  refId,
  alias,
  t,
  onChange,
  onSubmit
}: {
  refId: string;
  alias: string;
  t: TFunction;
  onChange: (alias: string) => void;
  onSubmit?: (() => void) | undefined;
}) {
  const [editing, setEditing] = useState(alias !== refId);
  return editing ? (
    <span className={styles.aliasEditor}>
      <span>{t('explore.logAdd.aliasPrefix')}</span>
      <Input
        className={styles.alias}
        value={alias}
        maxLength={64}
        aria-label={t('explore.logAdd.alias', { ref: refId })}
        onChange={event => onChange(event.target.value)}
        onKeyDown={event => {
          if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.keyCode === 229) return;
          event.preventDefault();
          if (onSubmit) onSubmit();
          else event.currentTarget.closest('form')?.requestSubmit();
        }}
      />
      <Button
        type="text"
        size="small"
        aria-label={t('explore.logAdd.removeAlias', { ref: refId })}
        onClick={() => {
          onChange(refId);
          setEditing(false);
        }}
      >
        {t('common.delete')}
      </Button>
    </span>
  ) : (
    <Button
      type="text"
      size="small"
      className={styles.aliasTrigger ?? ''}
      aria-label={t('explore.logAdd.alias', { ref: refId })}
      onClick={() => setEditing(true)}
    >
      {t('explore.logAdd.aliasAction')}
    </Button>
  );
}
