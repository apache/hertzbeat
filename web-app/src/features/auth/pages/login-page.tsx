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

import { Alert, Button, Form, Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page/operational-page';

import styles from './login-page.module.css';
import { PassportPageFrame } from './passport-page-frame';
import { useLoginController } from '../controller/use-login-controller';
import type { LoginCredentials } from '../model/login-model';

export function LoginPage() {
  const controller = useLoginController();
  return <LoginSessionContent controller={controller} />;
}

type LoginController = ReturnType<typeof useLoginController>;

function LoginSessionContent({ controller }: { controller: LoginController }) {
  const { t } = useTranslation();

  if (controller.sessionState === 'checking') {
    return (
      <PassportPageFrame>
        <section className={styles.panel} aria-label={t('auth.checkingSession')}>
          <OperationalStatePanel kind="loading" title={t('auth.checkingSession')} />
        </section>
      </PassportPageFrame>
    );
  }
  if (controller.sessionFailureKey) {
    return (
      <PassportPageFrame>
        <section className={styles.panel}>
          <OperationalStatePanel
            kind={controller.sessionState === 'unavailable' ? 'unavailable' : 'error'}
            title={t(controller.sessionFailureKey)}
            action={<Button onClick={controller.retrySession}>{t('common.retry')}</Button>}
          />
        </section>
      </PassportPageFrame>
    );
  }
  if (controller.sessionState === 'authenticated') return null;

  return <LoginFormContent controller={controller} />;
}

function LoginFormContent({ controller }: { controller: LoginController }) {
  const { t } = useTranslation();

  return (
    <PassportPageFrame>
      <section className={styles.panel} aria-labelledby="login-title">
        <Typography.Title id="login-title" level={2}>
          {t('auth.title')}
        </Typography.Title>
        {controller.errorKey && (
          <OperationalStatePanel
            kind={controller.failureKind === 'unavailable' ? 'unavailable' : 'error'}
            title={t(controller.errorKey)}
          />
        )}
        {controller.defaultPasswordWarning && <Alert showIcon type="warning" message={t('auth.defaultPassword')} />}
        <Form<LoginCredentials>
          layout="vertical"
          initialValues={{ identifier: controller.prefillUsername }}
          onValuesChange={controller.resetDefaultPasswordConfirmation}
          onFinish={values => {
            void controller.submit(values);
          }}
          requiredMark={false}
        >
          <Form.Item name="identifier" label={t('auth.username')} rules={[{ required: true }]}>
            <Input autoComplete="username" autoFocus />
          </Form.Item>
          <Form.Item name="credential" label={t('auth.password')} rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button block type="primary" htmlType="submit" loading={controller.pending}>
            {t(controller.defaultPasswordWarning ? 'auth.continue' : 'auth.submit')}
          </Button>
        </Form>
      </section>
    </PassportPageFrame>
  );
}
