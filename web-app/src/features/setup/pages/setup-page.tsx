/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Form, Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { useSetupRouteContext } from '../controller/setup-route-context';
import type { SetupUnlockFailureKind } from '../controller/use-setup-route-controller';
import { SetupPhaseRouter } from './setup-phase-router';
import styles from './setup-page.module.css';

export function SetupPage() {
  const { t } = useTranslation();
  const controller = useSetupRouteContext();
  const locked = controller.status.access === 'locked';

  return (
    <main className={styles.page} aria-labelledby="setup-title">
      <div className={styles.rail}>
        <header className={styles.brand}>
          <img src="/assets/hertzbeat-brand.svg" alt="HertzBeat" width={176} height={44} />
          <Typography.Title id="setup-title" level={1}>
            {t('setup.title')}
          </Typography.Title>
        </header>
        {controller.statusRefreshFailed && (
          <Alert
            type="warning"
            showIcon
            message={t('setup.statusRefreshUnavailable')}
            action={<Button onClick={controller.retry}>{t('common.retry')}</Button>}
          />
        )}
        {locked ? (
          <section className={styles.content} aria-labelledby="setup-unlock-title">
            <Typography.Title id="setup-unlock-title" level={2}>
              {t('setup.access.unlockTitle')}
            </Typography.Title>
            <Typography.Paragraph>{t('setup.access.unlockDescription')}</Typography.Paragraph>
            {controller.unlockFailureKind && (
              <Alert type="error" message={t(unlockFailureKey(controller.unlockFailureKind))} />
            )}
            <Form onFinish={() => void controller.unlock()} layout="vertical" requiredMark={false}>
              <Form.Item label={t('setup.access.codeLabel')} htmlFor="setup-unlock-code" required>
                <Input.Password
                  id="setup-unlock-code"
                  autoComplete="one-time-code"
                  value={controller.unlockCode}
                  onChange={event => controller.setUnlockCode(event.target.value)}
                />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={controller.unlockPending}>
                {t('setup.access.unlockAction')}
              </Button>
            </Form>
          </section>
        ) : (
          <SetupPhaseRouter status={controller.status} refetchStatus={controller.retry} />
        )}
      </div>
    </main>
  );
}

function unlockFailureKey(failure: SetupUnlockFailureKind) {
  if (failure === 'rejected') return 'setup.access.unlockFailed';
  if (failure === 'unavailable') return 'setup.access.unlockUnavailable';
  if (failure === 'contract') return 'setup.access.unlockContract';
  return 'setup.access.unlockError';
}
