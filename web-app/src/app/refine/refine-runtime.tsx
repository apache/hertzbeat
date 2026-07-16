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

import { labelDataProvider } from './resources/label-data-provider';

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
  labels: labelDataProvider
};

const resources = [{
  name: 'labels',
  list: '/settings/labels',
  meta: { dataProviderName: 'labels' }
}];

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
