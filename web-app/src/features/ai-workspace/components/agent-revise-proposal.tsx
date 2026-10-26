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

import { Button, Input, Modal, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
export function AgentReviseProposal({
  approvalId,
  disabled,
  pendingCount,
  revise
}: {
  approvalId: string;
  disabled: boolean;
  pendingCount: number;
  revise: (id: string, text: string) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const submit = async () => {
    if (busy || !text.trim() || disabled) return;
    setBusy(true);
    setFailed(false);
    try {
      const ok = await revise(approvalId, text);
      if (ok) {
        setOpen(false);
        setText('');
      } else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button
        size="small"
        disabled={disabled || busy}
        onClick={() => {
          setOpen(true);
          setFailed(false);
        }}
      >
        {t('aiWorkspace.approval.revision.action')}
      </Button>
      <Modal
        open={open}
        title={t('aiWorkspace.approval.revision.title')}
        onCancel={() => setOpen(false)}
        onOk={() => void submit()}
        okText={t('aiWorkspace.approval.revision.confirm')}
        okButtonProps={{ disabled: disabled || busy || !text.trim(), loading: busy }}
        destroyOnHidden
      >
        <p>{t('aiWorkspace.approval.revision.scope', { count: pendingCount })}</p>
        <p>{t('aiWorkspace.approval.revision.effects')}</p>
        <Input.TextArea
          value={text}
          maxLength={4000}
          rows={4}
          onChange={e => setText(e.target.value)}
          aria-label={t('aiWorkspace.approval.revision.instructions')}
        />
        <p>{t('aiWorkspace.approval.revision.manualSend')}</p>
        {failed ? (
          <Typography.Text role="alert" type="danger">
            {t('aiWorkspace.approval.revision.failed')}
          </Typography.Text>
        ) : null}
      </Modal>
    </>
  );
}
