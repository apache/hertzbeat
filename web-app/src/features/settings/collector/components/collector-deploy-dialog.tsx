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

import { Alert, Button, Descriptions, Form, Input, Modal, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  collectorDeployDockerCommand,
  collectorDeployPackageConfig,
  collectorReleasesUrl,
  type CollectorDeployState
} from '../model/collector-deploy-model';

type Props = {
  state: CollectorDeployState;
  onSubmit: (collector: string) => void;
  onCancel: () => void;
  onClose: () => void;
};

export function CollectorDeployDialog(props: Props) {
  const { t } = useTranslation();
  if (props.state.kind === 'closed') return null;
  const state = props.state;
  return (
    <Modal
      open
      destroyOnHidden
      maskClosable={false}
      title={t('collectors.deploy.title')}
      okText={t(state.kind === 'failed' ? 'collectors.deploy.retry' : 'collectors.deploy.generate')}
      cancelText={t('common.cancel')}
      footer={<CollectorDeployFooter {...props} />}
      onCancel={state.kind === 'ready' ? props.onClose : props.onCancel}
    >
      {state.kind === 'ready' ? (
        <CollectorDeployResult deployment={state.deployment} />
      ) : (
        <CollectorDeployForm {...props} state={state} />
      )}
    </Modal>
  );
}

function CollectorDeployForm(props: Props & { state: Exclude<CollectorDeployState, { kind: 'closed' | 'ready' }> }) {
  const { t } = useTranslation();
  return (
    <>
      {props.state.kind === 'failed' && (
        <Alert type="error" showIcon message={t(`collectors.deploy.failure.${props.state.failure}`)} />
      )}
      <Form
        id="collector-deploy-form"
        layout="vertical"
        initialValues={{ collector: props.state.collector }}
        onFinish={({ collector }: { collector: string }) => props.onSubmit(collector)}
      >
        <Form.Item
          name="collector"
          label={t('collectors.deploy.name')}
          rules={[{ required: true, whitespace: true, message: t('collectors.deploy.required') }]}
        >
          <Input
            autoFocus
            disabled={props.state.kind === 'submitting'}
            placeholder={t('collectors.deploy.placeholder')}
          />
        </Form.Item>
      </Form>
    </>
  );
}

function CollectorDeployFooter(props: Props) {
  const { t } = useTranslation();
  if (props.state.kind === 'ready') {
    return <Button onClick={props.onClose}>{t('collectors.deploy.close')}</Button>;
  }
  return (
    <>
      <Button onClick={props.onCancel}>{t('common.cancel')}</Button>
      <Button type="primary" htmlType="submit" form="collector-deploy-form" loading={props.state.kind === 'submitting'}>
        {t(props.state.kind === 'failed' ? 'collectors.deploy.retry' : 'collectors.deploy.generate')}
      </Button>
    </>
  );
}

function CollectorDeployResult({
  deployment
}: {
  deployment: Extract<CollectorDeployState, { kind: 'ready' }>['deployment'];
}) {
  const { t } = useTranslation();
  const docker = collectorDeployDockerCommand(deployment);
  const packageConfig = collectorDeployPackageConfig(deployment);
  return (
    <>
      <Descriptions column={1} size="small">
        <Descriptions.Item label={t('collectors.deploy.identity')}>
          <Typography.Text copyable>{deployment.identity}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label={t('collectors.deploy.host')}>
          <Typography.Text copyable>{deployment.host}</Typography.Text>
        </Descriptions.Item>
      </Descriptions>
      <Typography.Title level={5}>{t('collectors.deploy.dockerTitle')}</Typography.Title>
      <Typography.Paragraph>{t('collectors.deploy.dockerHelp')}</Typography.Paragraph>
      <Typography.Paragraph copyable={{ text: docker }}>
        <pre>{docker}</pre>
      </Typography.Paragraph>
      <Typography.Title level={5}>{t('collectors.deploy.packageTitle')}</Typography.Title>
      <Typography.Paragraph>{t('collectors.deploy.packageHelp')}</Typography.Paragraph>
      <Typography.Link href={collectorReleasesUrl} target="_blank" rel="noreferrer">
        {t('collectors.deploy.releases')}
      </Typography.Link>
      <Typography.Paragraph copyable={{ text: packageConfig }}>
        <pre>{packageConfig}</pre>
      </Typography.Paragraph>
    </>
  );
}
