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

import { Alert, Button, Form, Modal, Progress, Space, Spin, Typography, Upload } from 'antd';
import { useTranslation } from 'react-i18next';

import { monitorImportAccept, type MonitorImportState } from '../model/monitor-import-model';

type MonitorImportDialogProps = {
  state: MonitorImportState;
  onCancel: () => void;
  onFile: (file: File | null) => void;
  onSubmit: () => Promise<boolean>;
};

export function MonitorImportDialog({ state, onCancel, onFile, onSubmit }: MonitorImportDialogProps) {
  const { t } = useTranslation();
  const file = state.draft?.file ?? null;
  return (
    <Modal
      open={state.open}
      title={t('monitor.import.title')}
      footer={
        state.task.kind === 'idle'
          ? [
              <Button key="cancel" onClick={onCancel}>
                {t('common.cancel')}
              </Button>,
              <Button key="submit" type="primary" loading={state.busy} onClick={() => void onSubmit()}>
                {t('monitor.import.submit')}
              </Button>
            ]
          : [
              <Button key="close" onClick={onCancel}>
                {t('monitor.import.close')}
              </Button>
            ]
      }
      onCancel={onCancel}
    >
      <Typography.Paragraph type="secondary">{t('monitor.import.description')}</Typography.Paragraph>
      <ImportFeedback state={state} />
      {state.task.kind === 'idle' ? (
        <Form layout="vertical">
          <Form.Item
            label={t('monitor.import.file')}
            {...(state.invalid
              ? { validateStatus: 'error' as const, help: t(`monitor.import.validation.${state.invalid}`) }
              : {})}
          >
            <Space wrap>
              <Upload
                accept={monitorImportAccept}
                disabled={state.busy}
                maxCount={1}
                showUploadList={false}
                beforeUpload={selected => {
                  onFile(selected);
                  return false;
                }}
              >
                <Button disabled={state.busy}>{t('monitor.import.choose')}</Button>
              </Upload>
              {file ? <Typography.Text>{t('monitor.import.fileSelected')}</Typography.Text> : null}
            </Space>
          </Form.Item>
        </Form>
      ) : (
        <ImportTaskEvidence task={state.task} />
      )}
    </Modal>
  );
}

function ImportTaskEvidence({ task }: { task: Exclude<MonitorImportState['task'], { kind: 'idle' }> }) {
  const { t } = useTranslation();
  if (task.kind === 'loading') {
    return (
      <Space>
        <Spin size="small" />
        <Typography.Text>{t('monitor.import.task.loading')}</Typography.Text>
      </Space>
    );
  }
  if (task.kind !== 'ready') {
    return <Alert showIcon type="warning" message={t(`monitor.import.task.read.${task.kind}`)} />;
  }

  const { status, progress, errorCode } = task.task;
  if (status === 'FAILED') {
    return <Alert showIcon type="error" message={t(`monitor.import.task.failure.${errorCode}`)} />;
  }
  return (
    <div>
      <Space>
        <Typography.Text strong>
          {t(status === 'COMPLETED' ? 'monitor.import.task.completed' : 'monitor.import.task.inProgress')}
        </Typography.Text>
        {task.refreshing ? <Spin size="small" /> : null}
      </Space>
      <Progress percent={progress} status={status === 'COMPLETED' ? 'success' : 'active'} />
    </div>
  );
}

function ImportFeedback({ state }: { state: MonitorImportState }) {
  const { t } = useTranslation();
  if (!state.failure) return null;
  return <Alert showIcon type="error" message={t(`monitor.import.failure.${state.failure}`)} />;
}
