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

import { Button, Checkbox, Dropdown, Input, InputNumber, type MenuProps } from 'antd';
import type { TFunction } from 'i18next';
import type { LogQuerySet, LogQueryFormula } from '@/platform/perses';
import { parseQueryFormula, QueryFormulaError } from '@/shared/query-context/query-formula';
import { AliasEditor } from './explore-log-query-set-row-actions';
import styles from './explore-log-add-authoring.module.css';

export function FormulaRow({
  formula,
  value,
  t,
  update,
  remove,
  onSubmit
}: {
  formula: LogQueryFormula;
  value: LogQuerySet;
  t: TFunction;
  update: (next: LogQueryFormula) => void;
  remove: () => void;
  onSubmit?: (() => void) | undefined;
}) {
  const diagnostic = formulaDiagnostic(formula, value, t);
  return (
    <div className={styles.row} role="group" aria-label={t('explore.logAdd.formula', { ref: formula.refId })}>
      <span className={styles.label}>{formula.refId}</span>
      <div className={styles.formula}>
        <Input
          className={styles.queryInput}
          value={formula.expression}
          maxLength={256}
          aria-label={t('explore.logAdd.formula', { ref: formula.refId })}
          aria-invalid={diagnostic !== undefined || undefined}
          onChange={event => update({ ...formula, expression: event.target.value })}
          onKeyDown={event => {
            if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (onSubmit) {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        <FormulaFunctionPicker formula={formula} t={t} update={update} />
        <FormulaFunctions formula={formula} t={t} update={update} />
      </div>
      <AliasEditor
        refId={formula.refId}
        alias={formula.alias}
        t={t}
        onChange={alias => update({ ...formula, alias })}
        onSubmit={onSubmit}
      />
      <Checkbox
        checked={formula.visible}
        aria-label={t('explore.logComparison.showSource', { source: formula.refId })}
        onChange={event => update({ ...formula, visible: event.target.checked })}
      />
      <Button type="text" aria-label={t('explore.logAdd.removeFormula', { ref: formula.refId })} onClick={remove}>
        {t('common.delete')}
      </Button>
      {diagnostic && <span role="alert">{diagnostic}</span>}
    </div>
  );
}

type FormulaFunctionName = NonNullable<LogQueryFormula['functions']>[number]['name'];

function FormulaFunctions({
  formula,
  t,
  update
}: {
  formula: LogQueryFormula;
  t: TFunction;
  update: (next: LogQueryFormula) => void;
}) {
  return formula.functions?.map((fn, index) => (
    <span className={styles.functionChip} key={`${fn.name}-${index}`}>
      <span>{t(`explore.logAdd.function.${fn.name}`)}</span>
      {fn.name === 'pow' && (
        <InputNumber
          aria-label={t('explore.logAdd.powerExponent')}
          min={-16}
          max={16}
          value={fn.exponent}
          onChange={exponent => {
            if (exponent !== null && Number.isFinite(exponent))
              update({
                ...formula,
                functions: formula.functions!.map((item, itemIndex) =>
                  itemIndex === index && item.name === 'pow' ? { ...item, exponent } : item
                )
              });
          }}
        />
      )}
      <Button
        type="text"
        aria-label={t('explore.logAdd.removeFunction', { function: t(`explore.logAdd.function.${fn.name}`) })}
        onClick={() =>
          update({ ...formula, functions: formula.functions!.filter((_, itemIndex) => itemIndex !== index) })
        }
      >
        ×
      </Button>
    </span>
  ));
}

function formulaFunctionMenu(t: TFunction): NonNullable<MenuProps['items']> {
  return ['abs', 'log2', 'log10', 'pow', 'cumsum', 'integral'].map(name => ({
    key: name,
    label: t(`explore.logAdd.function.${name}`)
  }));
}

function FormulaFunctionPicker({
  formula,
  t,
  update
}: {
  formula: LogQueryFormula;
  t: TFunction;
  update: (next: LogQueryFormula) => void;
}) {
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: formulaFunctionMenu(t),
        onClick: ({ key }) => {
          const name = key as FormulaFunctionName;
          update({
            ...formula,
            functions: [...(formula.functions ?? []), name === 'pow' ? { name, exponent: 2 } : { name }]
          });
        }
      }}
    >
      <Button type="default">{t('explore.logAdd.functions')}</Button>
    </Dropdown>
  );
}

function formulaDiagnostic(formula: LogQueryFormula, value: LogQuerySet, t: TFunction) {
  let diagnostic: string | undefined;
  try {
    const unknown = parseQueryFormula(formula.expression).references.filter(
      ref => !value.queries.some(source => source.refId === ref)
    );
    if (unknown.length) diagnostic = t('explore.logAdd.formulaUnknownReferences', { refs: unknown.join(', ') });
  } catch (error) {
    diagnostic = t('explore.logAdd.formulaSyntax', {
      position: error instanceof QueryFormulaError ? error.position + 1 : 1
    });
  }
  return diagnostic;
}
