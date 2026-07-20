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

import { Form, Input, Modal } from 'antd';
import { useTranslation } from 'react-i18next';

import type { LabelEditorState, LabelRecord } from '../model/label-model';

type LabelEditorProps = {
  editor: LabelEditorState;
  locked: boolean;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (value: Partial<LabelRecord>) => void;
};

export function LabelEditor({ editor, locked, saving, onCancel, onSubmit }: LabelEditorProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<Partial<LabelRecord>>();
  const submit = (values: Partial<LabelRecord>) => onSubmit({ ...editor.value, ...values });

  return (
    <Modal
      open
      destroyOnHidden
      title={t(editor.isNew ? 'labels.new' : 'labels.edit')}
      confirmLoading={saving}
      closable={!saving}
      keyboard={!saving}
      maskClosable={false}
      cancelButtonProps={{ disabled: saving }}
      okButtonProps={{ disabled: locked }}
      onCancel={onCancel}
      onOk={() => form.submit()}
    >
      <Form form={form} layout="vertical" initialValues={editor.value} onFinish={submit}>
        <Form.Item
          name="name"
          label={t('labels.name')}
          rules={[{ required: true, whitespace: true, message: t('labels.nameRequired') }]}
        >
          <Input disabled={locked} />
        </Form.Item>
        <Form.Item name="tagValue" label={t('labels.value')}>
          <Input disabled={locked} />
        </Form.Item>
        <Form.Item name="description" label={t('labels.descriptionLabel')}>
          <Input disabled={locked} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
