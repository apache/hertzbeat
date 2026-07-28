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

import { Form } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { useExclusiveOperation } from '@/shared/exclusive-operation/use-exclusive-operation';
import { defaultStatusAccent } from '@/features/status/shared/status-constants';

import type { StatusOrg, StatusOrgRecord } from '../model/status-management-contract';
import { StatusOrgActions, StatusOrgFields } from './status-org-presentation';
import { StatusWriteRecoveryAlert } from './status-write-recovery-alert';

const emptyOrg: StatusOrg = {
  name: '',
  description: '',
  home: '',
  logo: '',
  feedback: '',
  color: defaultStatusAccent,
  state: 0
};

interface StatusOrgFormProps {
  org: StatusOrg | undefined;
  canWrite: boolean;
  saving: boolean;
  commandLocked: boolean;
  writeRecovery: 'proof' | 'commit-uncertain' | undefined;
  onRetry: () => Promise<StatusOrgRecord | undefined>;
  onSubmit: (org: StatusOrg) => Promise<StatusOrgRecord>;
}

export function StatusOrgForm({
  org,
  canWrite,
  saving,
  commandLocked,
  writeRecovery,
  onRetry,
  onSubmit
}: StatusOrgFormProps) {
  const controller = useStatusOrgFormController({
    org,
    canWrite,
    saving,
    commandLocked,
    writeRecovery,
    onRetry,
    onSubmit
  });
  return (
    <Form form={controller.form} layout="vertical" onFinish={controller.save}>
      {writeRecovery && <StatusWriteRecoveryAlert />}
      <StatusOrgFields disabled={controller.fieldsDisabled} />
      <StatusOrgActions
        canWrite={canWrite}
        editing={controller.editing}
        saving={saving}
        locked={controller.locked}
        canCancel={Boolean(org)}
        writeRecovery={writeRecovery}
        onCancel={controller.cancel}
        onEdit={controller.edit}
        onRetry={controller.retry}
      />
    </Form>
  );
}

function useStatusOrgFormController({
  org,
  canWrite,
  saving,
  commandLocked,
  writeRecovery,
  onRetry,
  onSubmit
}: StatusOrgFormProps) {
  const [editing, setEditing] = useState(canWrite && !org);
  const [form] = Form.useForm<StatusOrg>();
  const submitOperation = useExclusiveOperation('status-org-form-submit');
  const initialized = useRef(false);
  const previousOrg = useRef(org);
  useEffect(() => {
    const orgChanged = previousOrg.current !== org;
    previousOrg.current = org;
    if (!initialized.current || (!editing && orgChanged)) {
      form.setFieldsValue(org ?? emptyOrg);
      initialized.current = true;
    }
  }, [editing, form, org]);
  const save = async (value: StatusOrg) => {
    if (!canWrite || saving || commandLocked) return;
    const owner = submitOperation.begin();
    if (!owner) return;
    try {
      await onSubmit(org ? value : { ...value, state: emptyOrg.state });
      if (submitOperation.isCurrent(owner)) setEditing(false);
    } catch {
      // The mutation reports the failure; retaining this state keeps the draft retryable.
    } finally {
      submitOperation.end(owner);
    }
  };

  const cancel = () => {
    if (saving || commandLocked || submitOperation.isLocked() || !org) return;
    form.setFieldsValue(org);
    previousOrg.current = org;
    setEditing(false);
  };

  const edit = () => {
    if (!canWrite || commandLocked || submitOperation.isLocked()) return;
    form.setFieldsValue(org ?? emptyOrg);
    previousOrg.current = org;
    setEditing(true);
  };

  return {
    form,
    save: (value: StatusOrg) => void save(value),
    cancel,
    edit,
    retry: () => void retryStatusOrgForm(writeRecovery, onRetry, setEditing),
    editing: editing || Boolean(writeRecovery),
    locked: saving || commandLocked || submitOperation.pending,
    fieldsDisabled:
      !canWrite || !editing || saving || commandLocked || submitOperation.pending || Boolean(writeRecovery)
  };
}

async function retryStatusOrgForm(
  recovery: StatusOrgFormProps['writeRecovery'],
  onRetry: StatusOrgFormProps['onRetry'],
  setEditing: (value: boolean) => void
) {
  if (recovery !== 'proof') return;
  if (await onRetry()) setEditing(false);
}
