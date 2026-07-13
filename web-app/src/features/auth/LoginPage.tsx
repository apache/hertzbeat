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

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { safeRedirectTarget } from '@/core/auth/navigation';
import { loginSession, sessionQueryKey } from '@/core/auth/session-api';

import styles from './LoginPage.module.css';

type LoginValues = { identifier: string; credential: string };

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [defaultPasswordConfirmed, setDefaultPasswordConfirmed] = useState(false);
  const login = useMutation({
    mutationFn: ({ identifier, credential }: LoginValues) => loginSession(identifier, credential),
    onSuccess: session => {
      queryClient.setQueryData(sessionQueryKey, session);
      void navigate(safeRedirectTarget(searchParams.get('redirect')) ?? '/dashboard', { replace: true });
    }
  });

  const submit = (values: LoginValues) => {
    if (values.credential === 'hertzbeat' && !defaultPasswordConfirmed) {
      setDefaultPasswordConfirmed(true);
      return;
    }
    login.mutate(values);
  };

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="login-title">
        <Typography.Title id="login-title" level={2}>{t('auth.title')}</Typography.Title>
        <Typography.Paragraph type="secondary">{t('auth.description')}</Typography.Paragraph>
        {defaultPasswordConfirmed && <Alert type="warning" showIcon message={t('auth.defaultPassword')} />}
        {login.error && <Alert type="error" showIcon message={login.error.message} />}
        <Form<LoginValues> layout="vertical" onFinish={submit} requiredMark={false}>
          <Form.Item name="identifier" label={t('auth.username')} rules={[{ required: true }]}>
            <Input autoComplete="username" autoFocus />
          </Form.Item>
          <Form.Item name="credential" label={t('auth.password')} rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button block type="primary" htmlType="submit" loading={login.isPending}>
            {defaultPasswordConfirmed ? t('auth.continue') : t('auth.submit')}
          </Button>
        </Form>
      </section>
    </main>
  );
}
