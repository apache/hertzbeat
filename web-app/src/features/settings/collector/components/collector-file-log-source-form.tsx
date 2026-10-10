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

import { Button, Form, Input, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { ManagedFileLogSourceDraft } from '../model/collector-file-log-source-model';
import { managedRuntimeSafeNamePattern } from '../model/collector-runtime-config-model';

type Props = {
  source: ManagedFileLogSourceDraft | null;
  disabled: boolean;
  onApply: (source: ManagedFileLogSourceDraft) => void;
  onCancel: () => void;
};

export function CollectorFileLogSourceForm(props: Props) {
  const { t } = useTranslation();
  return (
    <Form<ManagedFileLogSourceDraft>
      layout="vertical"
      disabled={props.disabled}
      initialValues={props.source ?? { name: '', pathProfile: '' }}
      onFinish={props.onApply}
    >
      <Form.Item
        name="name"
        label={t('collectors.runtime.fileLog.name')}
        rules={[{ required: true }, { pattern: managedRuntimeSafeNamePattern }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="pathProfile"
        label={t('collectors.runtime.fileLog.pathProfile')}
        rules={[{ required: true }, { pattern: managedRuntimeSafeNamePattern }]}
      >
        {/* pathProfile is a local preset reference, never a filesystem path or glob. */}
        <Input />
      </Form.Item>
      <Typography.Paragraph type="secondary">{t('collectors.runtime.fileLog.referenceOnly')}</Typography.Paragraph>
      <Space>
        <Button type="primary" htmlType="submit">
          {t('collectors.runtime.fileLog.apply')}
        </Button>
        <Button onClick={props.onCancel}>{t('collectors.runtime.fileLog.backToList')}</Button>
      </Space>
    </Form>
  );
}
