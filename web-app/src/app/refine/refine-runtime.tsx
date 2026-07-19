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
import { tokenDataProvider } from '@/features/settings/token';
import { noticeReceiverResourceName } from '@/features/alert/notice-receiver/notice-receiver-resource';

import { alertSilenceDataProvider } from './resources/alert-silence-data-provider';
import { labelDataProvider } from './resources/label-data-provider';
import { noticeReceiverDataProvider } from './resources/notice-receiver-data-provider';
import { noticeRuleDataProvider } from './resources/notice-rule-data-provider';
import { noticeTemplateDataProvider } from './resources/notice-template-data-provider';
import { objectStoreDataProvider } from './resources/object-store-data-provider';
import { systemConfigDataProvider } from './resources/system-config-data-provider';
import { refineResources, shellAccessControlProvider } from './refine-resource-registry';
import { SessionQueryRuntime } from './session-query-runtime';

function createAppQueryClient() {
  return new QueryClient({
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
}

const dataProviders = {
  default: labelDataProvider,
  labels: labelDataProvider,
  'alert-silences': alertSilenceDataProvider,
  [noticeReceiverResourceName]: noticeReceiverDataProvider,
  'notice-rules': noticeRuleDataProvider,
  'notice-templates': noticeTemplateDataProvider,
  'object-store': objectStoreDataProvider,
  'system-config': systemConfigDataProvider,
  tokens: tokenDataProvider
};

export function RefineRuntime() {
  const notificationProvider = useNotificationProvider();
  return (
    <SessionQueryRuntime createQueryClient={createAppQueryClient}>
      {({ generation, queryClient }) => (
        <Refine
          key={generation}
          dataProvider={dataProviders}
          accessControlProvider={shellAccessControlProvider}
          notificationProvider={notificationProvider}
          resources={refineResources}
          routerProvider={routerProvider}
          options={{
            disableRouteChangeHandler: true,
            disableTelemetry: true,
            mutationMode: 'pessimistic',
            syncWithLocation: false,
            reactQuery: { clientConfig: queryClient }
          }}
        >
          <SessionProvider>
            <Outlet />
          </SessionProvider>
        </Refine>
      )}
    </SessionQueryRuntime>
  );
}
