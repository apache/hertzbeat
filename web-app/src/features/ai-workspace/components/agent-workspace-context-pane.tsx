/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Input, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AgentInputRequest, AgentToolActivity } from '../model/agent-workspace-reducer';
import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import styles from './agent-workspace-view.module.css';

export function AgentWorkspaceContextPane({
  controller,
  isAdmin
}: {
  controller: AgentWorkspaceViewModel;
  isAdmin: boolean;
}) {
  const { t } = useTranslation();
  return (
    <aside className={styles.context} aria-label={t('aiWorkspace.context.label')}>
      <ContextTarget target={controller.target} />
      <ContextTools tools={controller.run.tools} />
      <ContextApprovals controller={controller} isAdmin={isAdmin} />
      <ContextInputs controller={controller} />
    </aside>
  );
}

function ContextTarget({ target }: { target: AgentWorkspaceViewModel['target'] }) {
  const { t } = useTranslation();
  const facts = useMemo(() => targetFacts(target), [target]);
  return (
    <ContextSection title={t('aiWorkspace.context.target')}>
      {facts.length ? facts.map(item => <Tag key={item}>{item}</Tag>) : <Muted value={t('aiWorkspace.context.none')} />}
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
  return (
    <div className={styles.activity}>
      <code>{tool.toolName}</code>
      <Tag>{tool.status}</Tag>
    </div>
  );
}

function ContextApprovals({ controller, isAdmin }: { controller: AgentWorkspaceViewModel; isAdmin: boolean }) {
  const { t } = useTranslation();
  const pending = controller.run.approvals.filter(isPending);
  return (
    <ContextSection title={t('aiWorkspace.context.approvals')}>
      {pending.length ? (
        pending.map(item => (
          <div className={styles.approval} key={item.approvalId}>
            <code>{item.toolName}</code>
            <ApprovalActions controller={controller} approvalId={item.approvalId} isAdmin={isAdmin} />
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
  isAdmin
}: {
  controller: AgentWorkspaceViewModel;
  approvalId: string;
  isAdmin: boolean;
}) {
  const { t } = useTranslation();
  if (!isAdmin) return <Muted value={t('aiWorkspace.approval.adminRequired')} />;
  return (
    <div className={styles.approvalActions}>
      <Button size="small" type="primary" onClick={() => void controller.actions.decideApproval(approvalId, 'approve')}>
        {t('aiWorkspace.actions.approve')}
      </Button>
      <Button size="small" danger onClick={() => void controller.actions.decideApproval(approvalId, 'reject')}>
        {t('aiWorkspace.actions.reject')}
      </Button>
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
  return item.status === 'PENDING' || item.status === 'WAITING_INPUT' || item.status === 'WAITING_APPROVAL';
}

function targetFacts(target: AgentWorkspaceViewModel['target']) {
  if (!target) return [];
  const facts: string[] = [];
  if (target.monitorId) facts.push(`Monitor ${target.monitorId}`);
  if (target.entityId) facts.push(`Entity ${target.entityId}`);
  if (target.alertId) facts.push(`Alert ${target.alertId}`);
  if (target.collector) facts.push(`Collector ${target.collector}`);
  if (target.signal)
    facts.push(`${target.signal.type}${target.signal.timeRange ? ` · ${target.signal.timeRange}` : ''}`);
  if (target.topology) facts.push('Topology');
  return facts;
}
