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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider, theme } from 'antd';
import type { PropsWithChildren } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';

import { i18n } from '@/core/i18n/i18n';
import { SessionProvider } from '@/core/auth/session-provider';
import { resolveAntLocale } from '@/core/i18n/ant-locale';
import { readRuntimeTheme } from '@/core/runtime-preferences';

const queryClient = new QueryClient({
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

function RuntimeProviders({ children }: PropsWithChildren) {
  const { i18n: runtimeI18n } = useTranslation();
  const runtimeTheme = readRuntimeTheme();
  const algorithm = runtimeTheme === 'default'
    ? theme.defaultAlgorithm
    : runtimeTheme === 'compact'
      ? [theme.darkAlgorithm, theme.compactAlgorithm]
      : theme.darkAlgorithm;
  return (
    <ConfigProvider
        locale={resolveAntLocale(runtimeI18n.resolvedLanguage)}
        theme={{
          algorithm,
          token: {
            colorPrimary: '#5b6fd8',
            borderRadius: 4,
            fontSize: 14,
            ...(runtimeTheme === 'default' ? { colorBgBase: '#f6f7f9' } : { colorBgBase: '#101114' })
          }
        }}
    >
        <AntApp>
          <QueryClientProvider client={queryClient}>
            <SessionProvider>{children}</SessionProvider>
          </QueryClientProvider>
        </AntApp>
    </ConfigProvider>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <I18nextProvider i18n={i18n}>
      <RuntimeProviders>{children}</RuntimeProviders>
    </I18nextProvider>
  );
}
