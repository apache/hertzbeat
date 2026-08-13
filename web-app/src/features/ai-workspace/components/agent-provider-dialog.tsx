/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Modal, Popconfirm, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AgentProviderConfiguration } from '../model/agent-workspace-contract';
import type { AgentProviderViewModel } from '../model/agent-workspace-view-model';
import { AgentProviderEditor } from './agent-provider-editor';
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
  return (
    <Modal width={760} footer={null} open={open} title={t('aiWorkspace.providers.title')} onCancel={onClose}>
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
      {controller.view ? <ProviderList controller={controller} edit={setEditor} /> : null}
      {editor !== undefined ? (
        <AgentProviderEditor
          key={editor?.uid ?? 'new'}
          controller={controller}
          provider={editor}
          close={() => setEditor(undefined)}
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
            <Typography.Text strong>{provider.code}</Typography.Text>
            <Typography.Text>{provider.model || provider.baseUrl || provider.type}</Typography.Text>
            <Typography.Text type="secondary">
              {t(
                provider.apiKeyConfigured ? 'aiWorkspace.providers.configured' : 'aiWorkspace.providers.notConfigured'
              )}
            </Typography.Text>
          </div>
          <ProviderActions controller={controller} provider={provider} edit={edit} />
        </div>
      ))}
      <Button onClick={() => edit(null)}>{t('aiWorkspace.providers.add')}</Button>
    </div>
  );
}

function ProviderDefault({ controller }: { controller: AgentProviderViewModel }) {
  const { t } = useTranslation();
  return (
    <div className={styles.providerRow}>
      <Typography.Text strong>{t('aiWorkspace.providers.default')}</Typography.Text>
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
      <Button size="small" onClick={() => edit(provider)}>
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
