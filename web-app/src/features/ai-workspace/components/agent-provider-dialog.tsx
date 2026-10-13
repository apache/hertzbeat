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

import { Button, Modal, Popconfirm, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AgentProviderConfiguration } from '../model/agent-workspace-contract';
import type { AgentProviderViewModel } from '../model/agent-workspace-view-model';
import { AgentProviderEditor } from './agent-provider-editor';
import { AgentProviderTestResultView } from './agent-provider-test-result-view';
import styles from './agent-provider-dialog.module.css';

type ProviderEditor = AgentProviderConfiguration | null | undefined;

export function AgentProviderDialog({
  controller,
  open,
  onClose
}: {
  controller: AgentProviderViewModel;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const close = () => {
    controller.actions.clearModels?.();
    onClose();
  };
  return (
    <Modal width={760} footer={null} open={open} title={t('aiWorkspace.providers.title')} onCancel={close}>
      <Typography.Paragraph type="secondary">{t('aiWorkspace.providers.description')}</Typography.Paragraph>
      <AgentProviderContent controller={controller} />
    </Modal>
  );
}

function AgentProviderContent({ controller }: { controller: AgentProviderViewModel }) {
  const { t } = useTranslation();
  const [editor, setEditor] = useState<ProviderEditor>();
  if (controller.phase === 'loading') {
    return <Typography.Text>{t('aiWorkspace.providers.loading')}</Typography.Text>;
  }
  return (
    <>
      {controller.phase === 'error' ? <ProviderFailure reload={controller.actions.reload} /> : null}
      <AgentProviderTestResultView controller={controller} />
      {controller.view ? <ProviderList controller={controller} edit={setEditor} /> : null}
      {editor !== undefined ? (
        <AgentProviderEditor
          key={editor?.uid ?? 'new'}
          controller={controller}
          provider={editor}
          close={() => {
            controller.actions.clearModels?.();
            setEditor(undefined);
          }}
        />
      ) : null}
    </>
  );
}

function ProviderFailure({ reload }: { reload: () => Promise<void> }) {
  const { t } = useTranslation();
  return (
    <div className={styles.failure} role="alert">
      <Typography.Text type="danger">{t('aiWorkspace.providers.unavailable')}</Typography.Text>
      <Button size="small" onClick={() => void reload()}>
        {t('common.retry')}
      </Button>
    </div>
  );
}

function ProviderList({
  controller,
  edit
}: {
  controller: AgentProviderViewModel;
  edit: (provider: ProviderEditor) => void;
}) {
  const { t } = useTranslation();
  const view = controller.view;
  if (!view) return null;
  return (
    <div className={styles.providerList}>
      <ProviderDefault controller={controller} />
      {view.providers.map(provider => (
        <div className={styles.providerRow} key={provider.uid}>
          <div className={styles.providerCopy}>
            <Typography.Text strong>{provider.name || provider.code}</Typography.Text>
            <Typography.Text>{provider.model || provider.baseUrl || provider.type}</Typography.Text>
            <Typography.Text type="secondary">{provider.protocol || provider.type}</Typography.Text>
            <Typography.Text type="secondary">{provider.endpoint || provider.baseUrl}</Typography.Text>
            <ProviderCredentials provider={provider} />
          </div>
          <ProviderActions controller={controller} provider={provider} edit={edit} />
        </div>
      ))}
      <Button
        onClick={() => {
          controller.actions.clearModels?.();
          edit(null);
        }}
      >
        {t('aiWorkspace.providers.add')}
      </Button>
    </div>
  );
}

function ProviderDefault({ controller }: { controller: AgentProviderViewModel }) {
  const { t } = useTranslation();
  const effective = controller.view?.effectiveProvider;
  const yaml = effective?.uid === 'yaml-default' ? effective : undefined;
  return (
    <div className={styles.providerRow}>
      <div className={styles.providerCopy}>
        <Typography.Text strong>{t('aiWorkspace.providers.default')}</Typography.Text>
        <Typography.Text type="secondary">{yaml ? `${yaml.protocol} · ${yaml.model}` : ''}</Typography.Text>
        <Typography.Text type="secondary">{yaml?.endpoint}</Typography.Text>
        {yaml ? <ProviderCredentials provider={yaml} /> : null}
      </div>
      {controller.view?.activeProviderUid === null ? (
        <ActiveTag />
      ) : (
        <Button
          size="small"
          disabled={controller.phase === 'saving'}
          onClick={() => void controller.actions.activateDefault()}
        >
          {t('aiWorkspace.providers.activate')}
        </Button>
      )}
    </div>
  );
}

function ProviderCredentials({ provider }: { provider: AgentProviderConfiguration }) {
  const { t } = useTranslation();
  const key =
    provider.authMode === 'none'
      ? 'authentication.none'
      : provider.authMode === 'custom-header'
        ? 'authentication.custom-header'
        : provider.apiKeyConfigured
          ? 'configured'
          : 'notConfigured';
  return <Typography.Text type="secondary">{t(`aiWorkspace.providers.${key}`)}</Typography.Text>;
}

function ProviderActions({
  controller,
  provider,
  edit
}: {
  controller: AgentProviderViewModel;
  provider: AgentProviderConfiguration;
  edit: (provider: ProviderEditor) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.providerActions}>
      {controller.view?.activeProviderUid === provider.uid ? (
        <ActiveTag />
      ) : (
        <Button
          size="small"
          disabled={controller.phase === 'saving'}
          onClick={() => void controller.actions.activate(provider.uid)}
        >
          {t('aiWorkspace.providers.activate')}
        </Button>
      )}
      {controller.actions.test ? (
        <Button
          size="small"
          loading={controller.testingUid === provider.uid}
          disabled={Boolean(controller.testingUid)}
          onClick={() => void controller.actions.test?.(provider.uid)}
        >
          {t('aiWorkspace.providers.test')}
        </Button>
      ) : null}
      <Button
        size="small"
        onClick={() => {
          controller.actions.clearModels?.();
          edit(provider);
        }}
      >
        {t('aiWorkspace.providers.edit')}
      </Button>
      <Popconfirm
        title={t('aiWorkspace.providers.delete')}
        onConfirm={() => void controller.actions.delete(provider.uid)}
      >
        <Button size="small" danger>
          {t('aiWorkspace.providers.delete')}
        </Button>
      </Popconfirm>
    </div>
  );
}

function ActiveTag() {
  const { t } = useTranslation();
  return <Tag color="purple">{t('aiWorkspace.providers.active')}</Tag>;
}
