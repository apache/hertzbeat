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

import { batchActionKey, batchStageKey } from '../model/agent-batch-presentation';
import { Button, Progress, Space, Table, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { AgentBatchItem, AgentBatchView } from '../model/agent-batch';
import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
type BatchController = Pick<AgentWorkspaceViewModel, 'streaming' | 'stopping' | 'failure'> & {
  actions: Pick<AgentWorkspaceViewModel['actions'], 'decideApproval'>;
};
import styles from './agent-batch-progress.module.css';

export function AgentBatchProgress({
  batch,
  controller
}: {
  batch?: AgentBatchView | undefined;
  controller: BatchController;
}) {
  const { t } = useTranslation();
  const progress = batch?.progress;
  if (!progress) return null;
  const active = progress.stage === 'RUNNING' || progress.stage === 'WAITING_APPROVAL';
  return (
    <section className={styles.batch} aria-label={t('aiWorkspace.batch.title')}>
      <Typography.Title level={5}>{t('aiWorkspace.batch.title')}</Typography.Title>
      <p role="status">{t('aiWorkspace.batch.counts', progress)}</p>
      <Progress percent={Math.floor((progress.verified / progress.total) * 100)} showInfo={false} />
      <p>
        {t('aiWorkspace.batch.segment', {
          segment: progress.segment + 1,
          calls: progress.toolCalls,
          budget: progress.toolBudget
        })}
      </p>
      <p>{t(batchStageKey(progress))}</p>
      <BatchItems items={progress.items} controller={controller} active={active} />
      {progress.runStatus !== 'CANCELLED' &&
      progress.nextAction === 'CONTINUE' &&
      progress.actionReason !== 'PREFLIGHT_FAILED' ? (
        <p className={styles.note}>{t('aiWorkspace.batch.frozen')}</p>
      ) : null}
      {progress.reviewRequired > 0 ? <p role="alert">{t('aiWorkspace.batch.unknown')}</p> : null}
      {batch.unavailable ? <p role="alert">{t('aiWorkspace.batch.unavailable')}</p> : null}
      <BatchActions batch={batch} controller={controller} />
    </section>
  );
}
function BatchItems({
  items,
  controller,
  active
}: {
  items: AgentBatchItem[];
  controller: BatchController;
  active: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Table<AgentBatchItem>
      size="small"
      pagination={{ pageSize: 10, hideOnSinglePage: true }}
      rowKey="id"
      dataSource={items}
      scroll={{ x: 600 }}
      columns={[
        {
          title: t('aiWorkspace.batch.target'),
          dataIndex: 'name',
          render: (_, item) => <BatchTarget item={item} />
        },
        { title: t('aiWorkspace.batch.interval'), render: (_, item) => displayFrozenValue(item.arguments.intervals) },
        {
          title: t('aiWorkspace.batch.status'),
          render: (_, item) => <ItemStatus item={item} controller={controller} active={active} />
        },
        {
          title: t('aiWorkspace.batch.receipt'),
          render: (_, item) => (
            <>
              <span>{item.monitorId ?? '—'}</span>
              <br />
              <small>{t(`aiWorkspace.batch.receiptKind.${item.receiptKind}`)}</small>
            </>
          )
        }
      ]}
    />
  );
}
function ItemStatus({
  item,
  controller,
  active
}: {
  item: AgentBatchItem;
  controller: BatchController;
  active: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Space direction="vertical" size="small">
      <span>{t(`aiWorkspace.batch.item.${item.status}`, { defaultValue: item.status })}</span>
      {active && item.status === 'WAITING_APPROVAL' && item.approvalId ? (
        <Space>
          <Button
            size="small"
            disabled={controller.stopping}
            onClick={() => void controller.actions.decideApproval(item.approvalId!, 'approve')}
          >
            {t('aiWorkspace.actions.approve')}
          </Button>
          <Button
            size="small"
            disabled={controller.stopping}
            onClick={() => void controller.actions.decideApproval(item.approvalId!, 'reject')}
          >
            {t('aiWorkspace.actions.reject')}
          </Button>
        </Space>
      ) : null}
    </Space>
  );
}

function BatchTarget({ item }: { item: AgentBatchItem }) {
  const { t } = useTranslation();
  const monitorId =
    item.arguments.monitorId != null
      ? displayFrozenValue(item.arguments.monitorId)
      : Array.isArray(item.arguments.monitorIds)
        ? item.arguments.monitorIds.map(displayFrozenValue).join(', ')
        : item.id;
  return (
    <>
      <span>{item.name ?? t('aiWorkspace.batch.monitor', { id: monitorId })}</span>
      <br />
      <Typography.Text type="secondary">{item.target}</Typography.Text>
      <details>
        <summary>{t('aiWorkspace.batch.parameters')}</summary>
        <pre>{JSON.stringify(item.arguments, null, 2)}</pre>
      </details>
    </>
  );
}

function BatchActions({ batch, controller }: { batch: AgentBatchView; controller: BatchController }) {
  const { t } = useTranslation();
  const progress = batch.progress;
  if (!progress) return null;
  const active = progress.stage === 'RUNNING' || progress.stage === 'WAITING_APPROVAL';
  const actionKey = batchActionKey(progress);
  const canContinue =
    progress.runStatus !== 'CANCELLED' && (active ? !controller.streaming : progress.nextAction !== 'NONE');
  return (
    <Space direction="vertical">
      {canContinue ? (
        <Button loading={batch.busy} disabled={controller.stopping} onClick={() => void batch.continue()}>
          {t(`aiWorkspace.batch.${actionKey}`)}
        </Button>
      ) : null}
      {active ? (
        <Button loading={batch.stopping} onClick={() => void batch.stop()}>
          {t('aiWorkspace.actions.stop')}
        </Button>
      ) : null}
      {progress.actionReason === 'STOPPING' ? <p>{t('aiWorkspace.batch.stopping')}</p> : null}
    </Space>
  );
}
function displayFrozenValue(value: unknown): string {
  return typeof value === 'number' || typeof value === 'string' ? String(value) : '—';
}
