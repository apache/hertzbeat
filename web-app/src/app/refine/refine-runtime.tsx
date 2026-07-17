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

import { Refine } from '@refinedev/core';
import { useNotificationProvider } from '@refinedev/antd';
import routerProvider from '@refinedev/react-router';
import { QueryClient } from '@tanstack/react-query';
import { Outlet } from 'react-router-dom';

import { SessionProvider } from '@/core/auth/session-provider';

import { alertSilenceDataProvider } from './resources/alert-silence-data-provider';
import { labelDataProvider } from './resources/label-data-provider';
import { noticeReceiverDataProvider } from './resources/notice-receiver-data-provider';
import { noticeRuleDataProvider } from './resources/notice-rule-data-provider';
import { noticeTemplateDataProvider } from './resources/notice-template-data-provider';
import { objectStoreDataProvider } from './resources/object-store-data-provider';
import { systemConfigDataProvider } from './resources/system-config-data-provider';
import { tokenDataProvider } from './resources/token-data-provider';

const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 15_000
    },
    mutations: {
      retry: false
    }
  }
});

const dataProviders = {
  default: labelDataProvider,
  labels: labelDataProvider,
  'alert-silences': alertSilenceDataProvider,
  'notice-receivers': noticeReceiverDataProvider,
  'notice-rules': noticeRuleDataProvider,
  'notice-templates': noticeTemplateDataProvider,
  'object-store': objectStoreDataProvider,
  'system-config': systemConfigDataProvider,
  tokens: tokenDataProvider
};

const resources = [
  {
    name: 'alert-silences',
    list: '/alerts/silences',
    meta: { dataProviderName: 'alert-silences' }
  },
  {
    name: 'labels',
    list: '/settings/labels',
    meta: { dataProviderName: 'labels' }
  },
  {
    name: 'object-store',
    list: '/settings/storage/object-store',
    meta: { dataProviderName: 'object-store' }
  },
  {
    name: 'notice-templates',
    list: '/settings/notice-templates',
    meta: { dataProviderName: 'notice-templates' }
  },
  {
    name: 'notice-receivers',
    list: '/settings/notifications/receivers',
    meta: { dataProviderName: 'notice-receivers' }
  },
  {
    name: 'notice-rules',
    list: '/settings/notifications/rules',
    meta: { dataProviderName: 'notice-rules' }
  },
  {
    name: 'system-config',
    list: '/settings/system',
    meta: { dataProviderName: 'system-config' }
  },
  {
    name: 'tokens',
    list: '/settings/tokens',
    meta: { dataProviderName: 'tokens' }
  }
];

export function RefineRuntime() {
  const notificationProvider = useNotificationProvider();
  return (
    <Refine
      dataProvider={dataProviders}
      notificationProvider={notificationProvider}
      resources={resources}
      routerProvider={routerProvider}
      options={{
        disableRouteChangeHandler: true,
        disableTelemetry: true,
        mutationMode: 'pessimistic',
        syncWithLocation: false,
        reactQuery: { clientConfig: appQueryClient }
      }}
    >
      <SessionProvider>
        <Outlet />
      </SessionProvider>
    </Refine>
  );
}
