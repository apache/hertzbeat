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

import { Button, Checkbox, Modal, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import type { AgentCollectionPreview } from '../model/agent-collection-preview';
import { AgentCollectionPreviewView } from './agent-collection-preview-view';
import { AgentReviseProposal } from './agent-revise-proposal';
import { agentRequestIsPending } from '../model/agent-runtime-status';
import styles from './agent-workspace-context-pane.module.css';

type ApprovalActionProps = {
  controller: AgentWorkspaceViewModel;
  approvalId: string;
  canDecide: boolean;
  collection?: AgentCollectionPreview | undefined;
  requiresCollection?: boolean;
};
export function ApprovalActions({
  controller,
  approvalId,
  canDecide,
  collection,
  requiresCollection
}: ApprovalActionProps) {
  const { t } = useTranslation();
  const { open, confirmed, submitting, setOpen, setConfirmed, decide } = useApprovalDecision(
    controller,
    approvalId,
    collection
  );
  if (!canDecide || (requiresCollection && !collection))
    return <Typography.Text type="secondary">{t('aiWorkspace.approval.decisionUnavailable')}</Typography.Text>;
  return (
    <div className={styles.approvalActions}>
      {collection ? (
        <CollectionApprovalModal
          preview={collection}
          open={open}
          confirmed={confirmed}
          setConfirmed={setConfirmed}
          submitting={submitting || controller.stopping}
          close={() => setOpen(false)}
          decide={decide}
        />
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
      <ApprovalRevision controller={controller} approvalId={approvalId} disabled={submitting || controller.stopping} />
    </div>
  );
}

function CollectionApprovalModal({
  preview,
  open,
  confirmed,
  setConfirmed,
  submitting,
  close,
  decide
}: {
  preview: AgentCollectionPreview;
  open: boolean;
  confirmed: boolean;
  setConfirmed: (value: boolean) => void;
  submitting: boolean;
  close: () => void;
  decide: () => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      title={t('aiWorkspace.approval.collection.title')}
      okText={t('aiWorkspace.actions.approve')}
      onCancel={close}
      onOk={() => void decide()}
      okButtonProps={{ disabled: !confirmed || submitting }}
      destroyOnHidden
    >
      <AgentCollectionPreviewView preview={preview} />
      <Checkbox checked={confirmed} onChange={event => setConfirmed(event.target.checked)}>
        {t('aiWorkspace.approval.collection.confirm')}
      </Checkbox>
    </Modal>
  );
}

function useApprovalDecision(
  controller: AgentWorkspaceViewModel,
  approvalId: string,
  collection: AgentCollectionPreview | undefined
) {
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
  return { open, confirmed, submitting, setOpen, setConfirmed, decide };
}

function ApprovalRevision({
  controller,
  approvalId,
  disabled
}: Pick<ApprovalActionProps, 'controller' | 'approvalId'> & { disabled: boolean }) {
  const revise = controller.actions.reviseApproval;
  return revise ? (
    <AgentReviseProposal
      approvalId={approvalId}
      disabled={disabled}
      pendingCount={controller.run.approvals.filter(item => agentRequestIsPending(item.status)).length}
      revise={revise}
    />
  ) : null;
}
