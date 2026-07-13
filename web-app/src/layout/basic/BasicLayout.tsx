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

import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Layout, Menu, Space, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { routeRegistry } from '@/app/route-registry';
import { anonymousSession, logoutSession, sessionQueryKey } from '@/core/auth/session-api';
import { useSession } from '@/core/auth/session-context';

import styles from './BasicLayout.module.css';

const { Content, Header, Sider } = Layout;

export function BasicLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const { message } = App.useApp();
  const [loggingOut, setLoggingOut] = useState(false);
  const navigation = routeRegistry.filter(route => route.navigation);

  const logout = async () => {
    setLoggingOut(true);
    try {
      await logoutSession();
      queryClient.setQueryData(sessionQueryKey, anonymousSession);
      await navigate('/passport/login', { replace: true });
    } catch {
      void message.error(t('auth.logoutFailed'));
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Layout className={styles.root}>
      <Header className={styles.header}>
        <strong className={styles.brand}>HertzBeat</strong>
        <Space className={styles.account ?? ''}>
          <Typography.Text>{session?.username}</Typography.Text>
          <Button type="text" loading={loggingOut} onClick={() => void logout()}>{t('auth.logout')}</Button>
        </Space>
      </Header>
      <Layout>
        <Sider className={styles.sider} width={220} aria-label={t('menu.primary')}>
          <Menu
            mode="inline"
            selectedKeys={[navigation.find(route => location.pathname.startsWith(route.path))?.id ?? '']}
            items={navigation.map(route => ({ key: route.id, label: t(route.labelKey) }))}
            onClick={({ key }) => {
              const route = navigation.find(item => item.id === key);
              if (route) void navigate(route.path);
            }}
          />
        </Sider>
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
