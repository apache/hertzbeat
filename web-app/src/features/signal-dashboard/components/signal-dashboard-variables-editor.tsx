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

import { Button, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import type { HertzBeatDashboardDocument } from '@/platform/perses';
import styles from './signal-dashboard.module.css';

type Variable = HertzBeatDashboardDocument['spec']['variables'][number];
type Props = {
  document: HertzBeatDashboardDocument;
  update: (document: HertzBeatDashboardDocument) => void;
  disabled: boolean;
};
const names = ['serviceName', 'serviceNamespace', 'environment'] as const;

export function SignalDashboardVariablesEditor({ document, update, disabled }: Props) {
  const { t } = useTranslation();
  const variables = document.spec.variables;
  const change = (index: number, variable?: Variable) => {
    const next = structuredClone(document);
    if (variable) next.spec.variables[index] = variable;
    else next.spec.variables.splice(index, 1);
    update(next);
  };
  return (
    <details>
      <summary>{t('signalDashboard.variables')}</summary>
      <div className={styles.fields}>
        {variables.map((variable, index) => (
          <VariableFields
            key={variable.spec.name}
            variable={variable}
            disabled={disabled}
            change={next => change(index, next)}
            remove={() => change(index)}
          />
        ))}
        {names
          .filter(name => !variables.some(variable => variable.spec.name === name))
          .map(name => (
            <Button
              key={name}
              disabled={disabled}
              onClick={() => {
                const next = structuredClone(document);
                next.spec.variables.push({ kind: 'TextVariable', spec: { name, value: '' } });
                update(next);
              }}
            >
              {t('signalDashboard.addVariable', { name: t('signalDashboard.' + name) })}
            </Button>
          ))}
      </div>
    </details>
  );
}

function VariableFields({
  variable,
  disabled,
  change,
  remove
}: {
  variable: Variable;
  disabled: boolean;
  change: (variable: Variable) => void;
  remove: () => void;
}) {
  const { t } = useTranslation();
  return (
    <section className={styles.variableDefinition}>
      <strong>{t('signalDashboard.' + variable.spec.name)}</strong>
      <Select
        aria-label={t('signalDashboard.variableKind', { name: t('signalDashboard.' + variable.spec.name) })}
        disabled={disabled}
        value={variable.kind}
        options={['TextVariable', 'ListVariable'].map(value => ({ value, label: t('signalDashboard.' + value) }))}
        onChange={kind =>
          change(
            kind === 'TextVariable'
              ? { kind, spec: { name: variable.spec.name, value: '' } }
              : {
                  kind: 'ListVariable',
                  spec: {
                    name: variable.spec.name,
                    defaultValue: '',
                    allowMultiple: false,
                    allowAllValue: false,
                    plugin: { kind: 'StaticListVariable', spec: { values: [] } }
                  }
                }
          )
        }
      />
      <VariableValueFields variable={variable} disabled={disabled} change={change} />
      <Button disabled={disabled} onClick={() => remove()}>
        {t('signalDashboard.removeVariable')}
      </Button>
    </section>
  );
}

function VariableValueFields({
  variable,
  disabled,
  change
}: {
  variable: Variable;
  disabled: boolean;
  change: (variable: Variable) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {' '}
      {variable.kind === 'TextVariable' ? (
        <label>
          {t('signalDashboard.defaultValue')}
          <Input
            value={variable.spec.value}
            maxLength={256}
            onChange={event => change({ ...variable, spec: { ...variable.spec, value: event.target.value } })}
          />
        </label>
      ) : (
        <>
          <label>
            {t('signalDashboard.staticValues')}
            <Input.TextArea
              value={variable.spec.plugin.spec.values.join('\n')}
              onChange={event =>
                change({
                  ...variable,
                  spec: {
                    ...variable.spec,
                    plugin: { kind: 'StaticListVariable', spec: { values: event.target.value.split('\n') } }
                  }
                })
              }
            />
          </label>
          <label>
            {t('signalDashboard.defaultValue')}
            <Select
              disabled={disabled}
              value={variable.spec.defaultValue}
              options={variable.spec.plugin.spec.values.map(value => ({ value, label: value }))}
              onChange={defaultValue => change({ ...variable, spec: { ...variable.spec, defaultValue } })}
            />
          </label>
        </>
      )}
    </>
  );
}
