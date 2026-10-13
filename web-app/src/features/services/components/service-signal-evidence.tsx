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

import { Button, Table, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { OperationalSection, OperationalStatePanel } from '@/shared/operational-page';
import type { ServiceOperation } from '../model/services-model';
import type { ServicesViewModel } from '../model/services-model';
import type { ServicesViewProps } from '../model/services-model';
import styles from './services-view.module.css';
import { ServiceRedTrends } from './service-red-trends';

const evidenceStateKinds = {
  idle: 'empty',
  missing: 'empty',
  invalid: 'error',
  ready: 'error',
  empty: 'empty',
  loading: 'loading',
  permission: 'permission',
  unavailable: 'unavailable',
  error: 'error'
} as const;

export function ServiceRedEvidence({ state }: { state: ServicesViewModel }) {
  const { t } = useTranslation();
  const red = state.red.kind === 'ready' ? state.red.data : undefined;
  const values = red?.state === 'ready' ? red.summary : undefined;
  const kind = state.validWindow ? (red?.state ?? state.red.kind) : 'invalid';
  return (
    <OperationalSection title={t('services.red')} description={t('services.redLimit')}>
      {values ? (
        <>
          <dl className={styles.redValues}>
            <div>
              <dt>{t('services.requests')}</dt>
              <dd>{values.requestCount.toLocaleString()}</dd>
            </div>
            <div>
              <dt>{t('services.requestRate')}</dt>
              <dd>{values.requestRatePerSecond.toLocaleString(undefined, { maximumFractionDigits: 3 })}</dd>
            </div>
            <div>
              <dt>{t('services.errorRate')}</dt>
              <dd>{(values.errorRate * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%</dd>
            </div>
            <div>
              <dt>{t('services.latencyP95')}</dt>
              <dd>
                {values.latencyP95Ms == null
                  ? t('services.unknown')
                  : `${values.latencyP95Ms.toLocaleString(undefined, { maximumFractionDigits: 2 })} ms`}
              </dd>
            </div>
          </dl>
          {red?.state === 'ready' && <ServiceRedTrends red={red} />}
        </>
      ) : (
        <OperationalStatePanel
          presentation="quiet"
          kind={evidenceStateKinds[kind]}
          title={t(state.validWindow ? `services.state.${kind}` : 'services.invalidWindow')}
        />
      )}
    </OperationalSection>
  );
}

export function ServiceOperations({ state, actions }: ServicesViewProps) {
  const { t } = useTranslation();
  const columns = operationColumns(t, state, actions);
  return (
    <OperationalSection title={t('services.operations')} description={t('services.operationLimit')}>
      {state.query.operation && (
        <p>
          {t('services.operation')}: {state.query.operation}
          {state.query.errorsOnly ? ` · ${t('services.errorTraces')}` : ''}
        </p>
      )}
      {state.operations.kind === 'ready' ? (
        <Table
          size="small"
          rowKey="value"
          columns={columns}
          dataSource={state.operations.data}
          pagination={false}
          scroll={{ x: 560 }}
          locale={{ emptyText: t('services.noOperations') }}
        />
      ) : (
        <OperationalStatePanel
          presentation="quiet"
          kind={evidenceStateKinds[state.validWindow ? state.operations.kind : 'invalid']}
          title={t(state.validWindow ? `services.state.${state.operations.kind}` : 'services.invalidWindow')}
        />
      )}
    </OperationalSection>
  );
}

function operationColumns(
  t: ReturnType<typeof useTranslation>['t'],
  state: ServicesViewModel,
  actions: ServicesViewProps['actions']
) {
  const columns: ColumnsType<ServiceOperation> = [
    {
      title: t('services.operation'),
      dataIndex: 'value',
      render: (value: string) => (
        <Button
          type="link"
          className={styles.serviceLink ?? ''}
          disabled={!value}
          aria-pressed={state.query.operation === value && !state.query.errorsOnly}
          onClick={() => actions.operation(value, false)}
        >
          {value || t('services.unnamedOperation')}
        </Button>
      )
    },
    { title: t('services.observedTraces'), dataIndex: 'traceCount' },
    { title: t('services.errorTraces'), dataIndex: 'errorTraceCount' },
    {
      title: t('services.latencyP95'),
      dataIndex: 'latencyP95Ms',
      render: (value: number | null) =>
        value == null ? t('services.unknown') : `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ms`
    },
    {
      title: t('services.investigate'),
      key: 'actions',
      render: (_, row) => (
        <Space>
          <Button
            aria-pressed={state.query.operation === row.value && Boolean(state.query.errorsOnly)}
            disabled={row.errorTraceCount === 0 || !row.value}
            onClick={() => actions.operation(row.value, true)}
          >
            {t('services.errorAction')}
          </Button>
        </Space>
      )
    }
  ];
  return columns;
}
