/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Input, Modal, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './factory-reset-section.module.css';
import { waitForFactoryResetSetup } from './factory-reset-transition';

const CONFIRMATION = 'RESET HERTZBEAT';

export function DeploymentDangerZone({
  onOpenMigration,
  onReset,
  onAccepted = redirectToSetup
}: {
  onOpenMigration: () => void;
  onReset: (confirmation: string) => Promise<unknown>;
  onAccepted?: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <section className={styles.section} aria-labelledby="deployment-danger-zone-title">
      <header className={styles.header}>
        <Typography.Title id="deployment-danger-zone-title" level={4} className={styles.title!}>
          {t('deployment.danger.title')}
        </Typography.Title>
        <Typography.Text type="secondary">{t('deployment.danger.description')}</Typography.Text>
      </header>

      <div className={styles.operation}>
        <div className={styles.copy}>
          <Typography.Text strong>{t('deployment.migration.title')}</Typography.Text>
          <Typography.Text type="secondary">{t('deployment.migration.description')}</Typography.Text>
        </div>
        <Button onClick={onOpenMigration}>{t('deployment.migration.open')}</Button>
      </div>

      <FactoryResetOperation onReset={onReset} onAccepted={onAccepted} />
    </section>
  );
}

function FactoryResetOperation({
  onReset,
  onAccepted
}: {
  onReset: (confirmation: string) => Promise<unknown>;
  onAccepted: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const operation = useFactoryResetState(onReset, onAccepted);

  return (
    <div className={styles.operation}>
      <div className={styles.copy}>
        <Typography.Text strong>{t('deployment.reset.action')}</Typography.Text>
        <Typography.Text type="secondary">{t('deployment.reset.description')}</Typography.Text>
      </div>
      <Button danger onClick={() => operation.setOpen(true)}>
        {t('deployment.reset.action')}
      </Button>

      <Modal
        open={operation.open}
        title={t('deployment.reset.modalTitle')}
        onCancel={operation.close}
        destroyOnHidden
        footer={[
          <Button key="cancel" disabled={operation.submitting} onClick={operation.close}>
            {t('common.cancel')}
          </Button>,
          <Button
            key="confirm"
            danger
            type="primary"
            disabled={operation.confirmation !== CONFIRMATION}
            loading={operation.submitting}
            onClick={() => void operation.submit()}
          >
            {t('deployment.reset.confirm')}
          </Button>
        ]}
      >
        <div className={styles.dialog}>
          <Alert type="error" showIcon message={t('deployment.reset.warning')} />
          <div>
            <Typography.Text strong>{t('deployment.reset.scopeTitle')}</Typography.Text>
            <ul className={styles.scope}>
              <li>{t('deployment.reset.scope.management')}</li>
              <li>{t('deployment.reset.scope.telemetry')}</li>
              <li>{t('deployment.reset.scope.local')}</li>
            </ul>
            <Typography.Paragraph type="secondary" className={styles.externalNote!}>
              {t('deployment.reset.externalObjects')}
            </Typography.Paragraph>
          </div>
          <label className={styles.confirmation} htmlFor="factory-reset-confirmation">
            <span>{t('deployment.reset.inputLabel')}</span>
            <Typography.Text type="secondary">
              {t('deployment.reset.instruction')} <Typography.Text code>{CONFIRMATION}</Typography.Text>
            </Typography.Text>
            <Input
              id="factory-reset-confirmation"
              aria-label={t('deployment.reset.inputLabel')}
              value={operation.confirmation}
              autoComplete="off"
              disabled={operation.submitting}
              onChange={event => operation.setConfirmation(event.target.value)}
            />
          </label>
          {operation.failed ? <Alert type="error" showIcon message={t('deployment.reset.failed')} /> : null}
          {operation.transitionDelayed ? (
            <Alert type="warning" showIcon message={t('deployment.reset.transitionDelayed')} />
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

function useFactoryResetState(
  onReset: (confirmation: string) => Promise<unknown>,
  onAccepted: () => void | Promise<void>
) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [transitionDelayed, setTransitionDelayed] = useState(false);

  const close = () => {
    if (submitting) return;
    setOpen(false);
    setConfirmation('');
    setFailed(false);
    setTransitionDelayed(false);
  };

  const submit = async () => {
    if (confirmation !== CONFIRMATION || submitting) return;
    setSubmitting(true);
    setFailed(false);
    setTransitionDelayed(false);
    try {
      await onReset(confirmation);
      try {
        await onAccepted();
      } catch {
        setTransitionDelayed(true);
        setSubmitting(false);
      }
    } catch {
      setFailed(true);
      setSubmitting(false);
    }
  };

  return {
    open,
    confirmation,
    submitting,
    failed,
    transitionDelayed,
    close,
    submit,
    setOpen,
    setConfirmation
  };
}

async function redirectToSetup() {
  await waitForFactoryResetSetup();
  window.location.assign('/setup');
}
