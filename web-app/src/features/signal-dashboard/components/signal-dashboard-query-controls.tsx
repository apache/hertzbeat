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

import { Button, Input, Select, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatShortLocalTimeRange, globalTimeRanges, type GlobalTimeRange } from '@/shared/time';
import type { DashboardViewProps } from '../model/signal-dashboard-view-model';
import styles from './signal-dashboard.module.css';

export function SignalDashboardQueryControls({ state, actions }: DashboardViewProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.query} aria-label={t('signalDashboard.query')}>
      <div className={styles.controls}>
        <label>
          {t('signalDashboard.timeRange')}
          <Select<GlobalTimeRange | 'fixed'>
            aria-label={t('signalDashboard.timeRange')}
            value={state.fixedTime && !state.controls.presetSelected ? 'fixed' : state.controls.duration}
            options={[
              ...(state.fixedTime ? [{ value: 'fixed', label: t('signalDashboard.fixedWindow'), disabled: true }] : []),
              ...globalTimeRanges.map(value => ({ value, label: t('signalDashboard.range', { range: value }) }))
            ]}
            onChange={duration => {
              if (duration !== 'fixed') actions.controls({ ...state.controls, duration, presetSelected: true });
            }}
          />
        </label>
        <DashboardVariableInputs state={state} actions={actions} />
        <Space>
          <Button
            type="primary"
            disabled={state.busy || state.validationError || (!state.validView && !state.controls.presetSelected)}
            onClick={actions.query}
          >
            {t('signalDashboard.query')}
          </Button>
          <Button disabled={state.busy || !state.validView} onClick={actions.refresh}>
            {t('common.refresh')}
          </Button>
        </Space>
      </div>
      <Typography.Text type="secondary">
        {state.timeWindow
          ? formatShortLocalTimeRange(state.timeWindow.from, state.timeWindow.to, { timeZone: state.timeZone }) +
            ' · ' +
            state.timeZone
          : t('signalDashboard.invalidTime')}
      </Typography.Text>
    </section>
  );
}

function DashboardVariableInputs({ state, actions }: DashboardViewProps) {
  const { t } = useTranslation();
  return (
    <>
      {' '}
      {state.document?.spec.variables.map(variable => {
        const name = variable.spec.name;
        const value =
          state.controls.variables[name] ??
          (variable.kind === 'TextVariable' ? variable.spec.value : variable.spec.defaultValue);
        const changed = (next: string) =>
          actions.controls({ ...state.controls, variables: { ...state.controls.variables, [name]: next } });
        return (
          <label key={name}>
            {t('signalDashboard.' + name)}
            {variable.kind === 'ListVariable' ? (
              <Select
                aria-label={t('signalDashboard.' + name)}
                value={value}
                options={variable.spec.plugin.spec.values.map(option => ({ value: option, label: option }))}
                onChange={changed}
              />
            ) : (
              <Input
                aria-label={t('signalDashboard.' + name)}
                value={value}
                maxLength={256}
                onChange={event => changed(event.target.value)}
              />
            )}
          </label>
        );
      })}
    </>
  );
}
