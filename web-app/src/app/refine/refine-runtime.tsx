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
import { noticeReceiverDataProvider, noticeReceiverResourceName } from '@/features/alert/notice-receiver/refine';
import { noticeRuleDataProvider, noticeRuleResourceName } from '@/features/alert/notice-rule';
import { noticeTemplateDataProvider, noticeTemplateResourceName } from '@/features/alert/notice-template';
import { labelDataProvider, labelResourceName } from '@/features/settings/label/refine';
import { objectStoreDataProvider } from '@/features/settings/object-store/refine';
import { systemConfigDataProvider, systemConfigResourceName } from '@/features/settings/system-config/refine';
import { tokenDataProvider } from '@/features/settings/token';

import { alertSilenceDataProvider } from './resources/alert-silence-data-provider';
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
  [labelResourceName]: labelDataProvider,
  'alert-silences': alertSilenceDataProvider,
  [noticeReceiverResourceName]: noticeReceiverDataProvider,
  [noticeRuleResourceName]: noticeRuleDataProvider,
  [noticeTemplateResourceName]: noticeTemplateDataProvider,
  'object-store': objectStoreDataProvider,
  [systemConfigResourceName]: systemConfigDataProvider,
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
