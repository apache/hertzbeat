/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Input, Modal, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { factoryResetDeployment } from '../api/deployment-api';
import styles from './factory-reset-section.module.css';
import { waitForFactoryResetSetup } from './factory-reset-transition';

const CONFIRMATION = 'RESET HERTZBEAT';

export function DeploymentDangerZone({
  onOpenMigration,
  onAccepted = redirectToSetup
}: {
  onOpenMigration: () => void;
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

      <FactoryResetOperation onAccepted={onAccepted} />
    </section>
  );
}

function FactoryResetOperation({ onAccepted }: { onAccepted: () => void | Promise<void> }) {
  const { t } = useTranslation();
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
      await factoryResetDeployment(confirmation);
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

  return (
    <div className={styles.operation}>
      <div className={styles.copy}>
        <Typography.Text strong>{t('deployment.reset.action')}</Typography.Text>
        <Typography.Text type="secondary">{t('deployment.reset.description')}</Typography.Text>
      </div>
      <Button danger onClick={() => setOpen(true)}>
        {t('deployment.reset.action')}
      </Button>

      <Modal
        open={open}
        title={t('deployment.reset.modalTitle')}
        onCancel={close}
        destroyOnHidden
        footer={[
          <Button key="cancel" disabled={submitting} onClick={close}>
            {t('common.cancel')}
          </Button>,
          <Button
            key="confirm"
            danger
            type="primary"
            disabled={confirmation !== CONFIRMATION}
            loading={submitting}
            onClick={() => void submit()}
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
              value={confirmation}
              autoComplete="off"
              disabled={submitting}
              onChange={event => setConfirmation(event.target.value)}
            />
          </label>
          {failed ? <Alert type="error" showIcon message={t('deployment.reset.failed')} /> : null}
          {transitionDelayed ? (
            <Alert type="warning" showIcon message={t('deployment.reset.transitionDelayed')} />
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

async function redirectToSetup() {
  await waitForFactoryResetSetup();
  window.location.assign('/setup');
}
