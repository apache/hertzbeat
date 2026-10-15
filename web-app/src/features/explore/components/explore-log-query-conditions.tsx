/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Input, Select } from 'antd';
import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';
import { LOG_FILTER_OPERATORS, type LogFilterOperator } from '../model/explore-log-filter-expression';
import { VALUELESS_OPERATORS, type FilterScope, type ScopedClause } from '../model/explore-log-builder-model';
import styles from './explore-log-query-builder.module.css';

export function BuilderConditions({
  rows,
  t,
  add,
  update,
  remove,
  emptyFooter
}: {
  rows: ScopedClause[];
  t: TFunction;
  add: () => void;
  update: (index: number, changes: Partial<ScopedClause>) => void;
  remove: (index: number) => void;
  emptyFooter: ReactNode;
}) {
  const addButton = (
    <Button type="text" icon={<PlusOutlined aria-hidden />} onClick={add}>
      {t('explore.logQueryBuilder.addCondition')}
    </Button>
  );
  if (!rows.length) {
    return (
      <div className={styles.emptyConditions} role="group" aria-label={t('explore.logQueryBuilder.conditions')}>
        <span className={styles.emptyConditionsTitle}>{t('explore.logQueryBuilder.conditions')}</span>
        {addButton}
        {emptyFooter}
      </div>
    );
  }
  return (
    <fieldset className={styles.conditions} aria-label={t('explore.logQueryBuilder.conditions')}>
      <legend>{t('explore.logQueryBuilder.conditions')}</legend>
      <div className={styles.conditionHeader} aria-hidden>
        <span>{t('explore.logQueryBuilder.scope')}</span>
        <span>{t('explore.logQueryBuilder.field')}</span>
        <span>{t('explore.logQueryBuilder.operator')}</span>
        <span>{t('explore.logQueryBuilder.value')}</span>
        <span>{t('explore.logQueryBuilder.actions')}</span>
      </div>
      {rows.map((row, index) => (
        <ConditionRow
          key={row.id}
          index={index}
          row={row}
          t={t}
          update={changes => update(index, changes)}
          remove={() => remove(index)}
        />
      ))}
      {addButton}
    </fieldset>
  );
}

function ConditionRow({
  index,
  row,
  t,
  update,
  remove
}: {
  index: number;
  row: ScopedClause;
  t: TFunction;
  update: (changes: Partial<ScopedClause>) => void;
  remove: () => void;
}) {
  const number = index + 1;
  const prefix = t('explore.logQueryBuilder.conditionLabel', { number });
  const valueDisabled = VALUELESS_OPERATORS.has(row.operator);
  return (
    <div className={styles.conditionRow}>
      <ScopeField row={row} t={t} prefix={prefix} update={update} />
      <ConditionField label={t('explore.logQueryBuilder.field')}>
        <Input
          aria-label={`${prefix} ${t('explore.logQueryBuilder.field').toLocaleLowerCase()}`}
          value={row.field}
          placeholder={t('explore.logQueryBuilder.fieldExample')}
          onChange={event => update({ field: event.target.value })}
        />
      </ConditionField>
      <ConditionField label={t('explore.logQueryBuilder.operator')}>
        <Select<LogFilterOperator>
          aria-label={`${prefix} ${t('explore.logQueryBuilder.operator').toLocaleLowerCase()}`}
          value={row.operator}
          options={LOG_FILTER_OPERATORS.map(operator => ({ value: operator, label: operator }))}
          onChange={operator => update({ operator, value: VALUELESS_OPERATORS.has(operator) ? '' : row.value })}
        />
      </ConditionField>
      <ConditionField label={t('explore.logQueryBuilder.value')}>
        <Input
          aria-label={`${prefix} ${t('explore.logQueryBuilder.value').toLocaleLowerCase()}`}
          value={row.value}
          disabled={valueDisabled}
          placeholder={
            valueDisabled ? t('explore.logQueryBuilder.notRequired') : t('explore.logQueryBuilder.valueExample')
          }
          onChange={event => update({ value: event.target.value })}
        />
      </ConditionField>
      <Button
        type="text"
        aria-label={t('explore.logQueryBuilder.removeCondition', { number })}
        icon={<DeleteOutlined aria-hidden />}
        onClick={remove}
      />
    </div>
  );
}

function ConditionField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.conditionField}>
      <span>{label}</span>
      {children}
    </div>
  );
}

function ScopeField({
  row,
  t,
  prefix,
  update
}: {
  row: ScopedClause;
  t: TFunction;
  prefix: string;
  update: (changes: Partial<ScopedClause>) => void;
}) {
  return (
    <ConditionField label={t('explore.logQueryBuilder.scope')}>
      <Select<FilterScope>
        aria-label={`${prefix} ${t('explore.logQueryBuilder.scope').toLocaleLowerCase()}`}
        value={row.scope}
        options={[
          { value: 'resource', label: t('explore.logQueryBuilder.resourceScope') },
          { value: 'attribute', label: t('explore.logQueryBuilder.attributeScope') }
        ]}
        onChange={scope => update({ scope })}
      />
    </ConditionField>
  );
}
