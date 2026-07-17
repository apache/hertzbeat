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

import { Alert, Button, Form, Input, Skeleton, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import styles from './login-page.module.css';
import { useLoginController } from './use-login-controller';

type LoginValues = { identifier: string; credential: string };

export function LoginPage() {
  const { t } = useTranslation();
  const controller = useLoginController();

  if (controller.sessionState === 'checking') {
    return (
      <main className={styles.page}>
        <section className={styles.panel} aria-label={t('auth.checkingSession')}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </section>
      </main>
    );
  }
  if (controller.sessionState === 'unavailable') {
    return (
      <main className={styles.page}>
        <section className={styles.panel}>
          <Alert
            type="error"
            showIcon
            message={t('common.unavailable')}
            action={<Button onClick={controller.retrySession}>{t('common.retry')}</Button>}
          />
        </section>
      </main>
    );
  }
  if (controller.sessionState === 'authenticated') return null;

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="login-title">
        <Typography.Title id="login-title" level={2}>{t('auth.title')}</Typography.Title>
        <Typography.Paragraph type="secondary">{t('auth.description')}</Typography.Paragraph>
        {controller.errorKey && <Alert type="error" showIcon message={t(controller.errorKey)} />}
        <Form<LoginValues>
          layout="vertical"
          onFinish={values => { void controller.submit(values); }}
          requiredMark={false}
        >
          <Form.Item name="identifier" label={t('auth.username')} rules={[{ required: true }]}>
            <Input autoComplete="username" autoFocus />
          </Form.Item>
          <Form.Item name="credential" label={t('auth.password')} rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button block type="primary" htmlType="submit" loading={controller.pending}>
            {t('auth.submit')}
          </Button>
        </Form>
      </section>
    </main>
  );
}
