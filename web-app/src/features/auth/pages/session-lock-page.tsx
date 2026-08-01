/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Form, Input, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel, type OperationalStateKind } from '@/shared/operational-page/operational-page';
import type { SessionLockFailure } from '@/core/auth/session-lock-model';

import { useSessionLockController } from '../controller/use-session-lock-controller';
import styles from './login-page.module.css';
import { PassportBrand } from './passport-brand';

export function SessionLockPage() {
  const { t } = useTranslation();
  const controller = useSessionLockController();
  if (controller.loading) {
    return (
      <main className={styles.page}>
        <section className={styles.panel} aria-label={t('auth.checkingSession')}>
          <PassportBrand />
          <OperationalStatePanel kind="loading" title={t('auth.checkingSession')} />
        </section>
      </main>
    );
  }
  return (
    <main className={styles.page}>
      <SessionLockPanel controller={controller} />
    </main>
  );
}

function SessionLockPanel({ controller }: { controller: ReturnType<typeof useSessionLockController> }) {
  const { t } = useTranslation();
  return (
    <section className={styles.panel} aria-labelledby="session-lock-title">
      <PassportBrand />
      <Typography.Title id="session-lock-title" level={2}>
        {t('auth.lock.title')}
      </Typography.Title>
      <Typography.Paragraph type="secondary">{t('auth.lock.description')}</Typography.Paragraph>
      {controller.identity && (
        <Typography.Paragraph>
          <strong>{controller.identity.username}</strong>
          <br />
          {t('auth.lock.workspace', { workspace: controller.identity.workspaceId })}
        </Typography.Paragraph>
      )}
      {controller.failureKey && (
        <OperationalStatePanel
          kind={sessionLockFailureState(controller.failure)}
          title={t(controller.failureKey)}
          action={
            controller.retryableSessionFailure ? (
              <Button onClick={controller.retrySession}>{t('common.retry')}</Button>
            ) : undefined
          }
        />
      )}
      <SessionUnlockForm controller={controller} />
    </section>
  );
}

function sessionLockFailureState(failure: SessionLockFailure | null): OperationalStateKind {
  return failure === 'unavailable' ? 'unavailable' : 'error';
}

function SessionUnlockForm({ controller }: { controller: ReturnType<typeof useSessionLockController> }) {
  const { t } = useTranslation();
  return (
    <Form layout="vertical" requiredMark={false} onFinish={() => void controller.unlock()}>
      <Form.Item label={t('auth.password')} htmlFor="session-lock-password">
        <Input.Password
          id="session-lock-password"
          autoComplete="current-password"
          autoFocus
          disabled={!controller.identity || controller.operation !== null}
          value={controller.password}
          onChange={event => controller.setPassword(event.target.value)}
        />
      </Form.Item>
      <Space className={styles.actions ?? ''} direction="vertical" size="middle">
        <Button
          block
          type="primary"
          htmlType="submit"
          loading={controller.operation === 'unlock'}
          disabled={!controller.canUnlock}
        >
          {t('auth.lock.unlock')}
        </Button>
        <Button
          block
          danger
          loading={controller.operation === 'logout'}
          disabled={controller.operation !== null}
          onClick={() => void controller.logout()}
        >
          {t('auth.logout')}
        </Button>
      </Space>
    </Form>
  );
}
