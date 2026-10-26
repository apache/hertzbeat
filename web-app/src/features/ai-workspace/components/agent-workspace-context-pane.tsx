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

import { CloseOutlined } from '@ant-design/icons';
import { Button, Checkbox, Input, Modal, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { agentRequestIsPending } from '../model/agent-runtime-status';
import type { AgentInputRequest, AgentToolActivity } from '../model/agent-workspace-reducer';
import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { AgentCollectionPreviewView } from './agent-collection-preview-view';
import type { AgentCollectionPreview } from '../model/agent-collection-preview';
import { AgentApprovalSummaryView } from './agent-approval-summary-view';
import { AgentWorkspaceEvidence } from './agent-workspace-evidence';
import { agentTargetSourcePath } from '../model/agent-source-path';
import { agentWorkspaceTargetFacts } from './agent-workspace-target-facts';
import styles from './agent-workspace-context-pane.module.css';

import { AgentReviseProposal } from './agent-revise-proposal';
import { toolStatusLabel } from './agent-workspace-format';
export function AgentWorkspaceContextPane({
  controller,
  onClose
}: {
  controller: AgentWorkspaceViewModel;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <aside className={styles.context} id="agent-run-context" aria-label={t('aiWorkspace.context.label')}>
      <header className={styles.contextHeader}>
        <Typography.Text strong>{t('aiWorkspace.context.label')}</Typography.Text>
        <Button
          aria-label={t('aiWorkspace.context.panelClose')}
          icon={<CloseOutlined />}
          size="small"
          type="text"
          onClick={onClose}
        />
      </header>
      <ContextTarget target={controller.target} />
      <AgentWorkspaceEvidence evidence={controller.run.evidence} running={controller.run.status === 'running'} />
      <ContextTools tools={controller.run.tools} />
      <ContextApprovals controller={controller} />
      <ContextInputs controller={controller} />
    </aside>
  );
}

function ContextTarget({ target }: { target: AgentWorkspaceViewModel['target'] }) {
  const { t } = useTranslation();
  const facts = useMemo(() => agentWorkspaceTargetFacts(target, t), [t, target]);
  const source = target ? agentTargetSourcePath(target) : undefined;
  return (
    <ContextSection title={t('aiWorkspace.context.target')}>
      {facts.length ? (
        facts.map((item, index) => <Typography.Text key={index}>{item}</Typography.Text>)
      ) : (
        <Muted value={t('aiWorkspace.context.none')} />
      )}
      {source ? <Typography.Link href={source}>{t('aiWorkspace.context.viewSource')}</Typography.Link> : null}
    </ContextSection>
  );
}

function ContextTools({ tools }: { tools: AgentToolActivity[] }) {
  const { t } = useTranslation();
  return (
    <ContextSection title={t('aiWorkspace.context.activity')}>
      {tools.length ? (
        tools.map(tool => <ToolActivity key={tool.toolCallId} tool={tool} />)
      ) : (
        <Muted value={t('aiWorkspace.context.noActivity')} />
      )}
    </ContextSection>
  );
}

function ToolActivity({ tool }: { tool: AgentToolActivity }) {
  const { t } = useTranslation();
  return (
    <div className={styles.activity}>
      <div className={styles.activitySummary}>
        <code>{tool.toolName}</code>
        <Tag>{toolStatusLabel(tool.status, t)}</Tag>
      </div>
      {tool.errorMessage ? (
        <Typography.Text className={styles.activityError ?? ''} type="danger">
          {tool.errorMessage}
        </Typography.Text>
      ) : null}
    </div>
  );
}

function ContextApprovals({ controller }: { controller: AgentWorkspaceViewModel }) {
  const { t } = useTranslation();
  const pending = controller.run.approvals.filter(
    item => isPending(item) || ['EXPIRED', 'UNAVAILABLE'].includes(item.status.toUpperCase())
  );
  return (
    <ContextSection title={t('aiWorkspace.context.approvals')}>
      {controller.run.approvalRecoveryUnavailable ? (
        <Muted value={t('aiWorkspace.approval.recoveryUnavailable')} />
      ) : null}
      {pending.length ? (
        pending.map(item => (
          <div className={styles.approval} key={item.approvalId}>
            <code>{item.toolName}</code>
            <AgentApprovalSummaryView summary={item.summary} />
            {isPending(item) ? (
              <ApprovalActions
                key={`${item.approvalId}:${item.summary?.collection?.planHash ?? 'ordinary'}`}
                controller={controller}
                collection={item.summary?.collection ?? undefined}
                requiresCollection={item.toolName === 'monitor.collection_detect'}
                approvalId={item.approvalId}
                canDecide={item.canDecide === true}
              />
            ) : (
              <Muted
                value={t(
                  item.status.toUpperCase() === 'EXPIRED'
                    ? 'aiWorkspace.approval.expired'
                    : 'aiWorkspace.approval.runtimeUnavailable'
                )}
              />
            )}
          </div>
        ))
      ) : (
        <Muted value={t('aiWorkspace.context.noApprovals')} />
      )}
    </ContextSection>
  );
}

function ApprovalActions({
  controller,
  approvalId,
  canDecide,
  collection,
  requiresCollection
}: {
  controller: AgentWorkspaceViewModel;
  approvalId: string;
  canDecide: boolean;
  collection?: AgentCollectionPreview | undefined;
  requiresCollection?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const decide = async () => {
    if (submitting || controller.stopping) return;
    setSubmitting(true);
    setOpen(false);
    try {
      if (collection) await controller.actions.decideApproval(approvalId, 'approve', collection.planHash);
      else await controller.actions.decideApproval(approvalId, 'approve');
    } finally {
      setSubmitting(false);
    }
  };
  if (!canDecide || (requiresCollection && !collection))
    return <Muted value={t('aiWorkspace.approval.decisionUnavailable')} />;
  return (
    <div className={styles.approvalActions}>
      {collection ? (
        <Modal
          open={open}
          title={t('aiWorkspace.approval.collection.title')}
          okText={t('aiWorkspace.actions.approve')}
          onCancel={() => setOpen(false)}
          onOk={() => void decide()}
          okButtonProps={{ disabled: !confirmed || submitting || controller.stopping }}
          destroyOnHidden
        >
          <AgentCollectionPreviewView preview={collection} />
          <Checkbox checked={confirmed} onChange={event => setConfirmed(event.target.checked)}>
            {t('aiWorkspace.approval.collection.confirm')}
          </Checkbox>
        </Modal>
      ) : null}
      <Button
        size="small"
        type="primary"
        loading={submitting}
        disabled={submitting || controller.stopping}
        onClick={() => {
          if (collection) {
            setConfirmed(false);
            setOpen(true);
          } else void decide();
        }}
      >
        {t('aiWorkspace.actions.approve')}
      </Button>
      <Button
        size="small"
        danger
        disabled={submitting || controller.stopping}
        onClick={() => void controller.actions.decideApproval(approvalId, 'reject')}
      >
        {t('aiWorkspace.actions.reject')}
      </Button>
      {controller.actions.reviseApproval ? (
        <AgentReviseProposal
          approvalId={approvalId}
          disabled={submitting || controller.stopping}
          pendingCount={controller.run.approvals.filter(isPending).length}
          revise={controller.actions.reviseApproval}
        />
      ) : null}
    </div>
  );
}

function ContextInputs({ controller }: { controller: AgentWorkspaceViewModel }) {
  const { t } = useTranslation();
  const pending = controller.run.inputs.filter(isPending);
  return (
    <ContextSection title={t('aiWorkspace.context.inputs')}>
      {pending.length ? (
        pending.map(item => (
          <InputRequest key={item.interactionId} request={item} submit={controller.actions.submitInteraction} />
        ))
      ) : (
        <Muted value={t('aiWorkspace.context.noInputs')} />
      )}
    </ContextSection>
  );
}

function InputRequest({
  request,
  submit
}: {
  request: AgentInputRequest;
  submit: AgentWorkspaceViewModel['actions']['submitInteraction'];
}) {
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <div className={styles.inputRequest}>
      <Typography.Text strong>{request.title}</Typography.Text>
      {request.description ? <Typography.Text type="secondary">{request.description}</Typography.Text> : null}
      {request.fields.map(field => (
        <InputField field={field} key={String(field.field)} values={values} setValues={setValues} />
      ))}
      <Button size="small" type="primary" onClick={() => void submit(request.interactionId, values)}>
        {t('aiWorkspace.actions.submit')}
      </Button>
    </div>
  );
}

function InputField({
  field,
  values,
  setValues
}: {
  field: Record<string, unknown>;
  values: Record<string, string>;
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const name = typeof field.field === 'string' ? field.field : '';
  if (!name) return null;
  return (
    <label className={styles.inputField}>
      <span>{typeof field.label === 'string' ? field.label : name}</span>
      <Input
        type={field.type === 'password' ? 'password' : 'text'}
        value={values[name] ?? ''}
        placeholder={typeof field.placeholder === 'string' ? field.placeholder : undefined}
        onChange={event => setValues(current => ({ ...current, [name]: event.target.value }))}
      />
    </label>
  );
}

function ContextSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.contextSection}>
      <Typography.Text strong>{title}</Typography.Text>
      <div className={styles.contextBody}>{children}</div>
    </section>
  );
}

function Muted({ value }: { value: string }) {
  return <Typography.Text type="secondary">{value}</Typography.Text>;
}

function isPending(item: { status: string }) {
  return agentRequestIsPending(item.status);
}
