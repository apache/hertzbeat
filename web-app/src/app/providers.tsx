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

import { App as AntApp, ConfigProvider } from 'antd';
import { useCallback, useState, type PropsWithChildren } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';

import { i18n } from '@/core/i18n/i18n';
import { resolveAntLocale } from '@/core/i18n/ant-locale';
import { persistSystemPreferences, readRuntimeLocale, readRuntimeTheme, type RuntimeTheme } from '@/core/runtime-preferences';
import { RuntimeThemeContext } from '@/core/runtime-theme-context';

import { createHertzBeatTheme } from './theme/hertzbeat-theme';

function RuntimeProviders({ children }: PropsWithChildren) {
  const { i18n: runtimeI18n } = useTranslation();
  const [runtimeTheme, setRuntimeTheme] = useState(readRuntimeTheme);
  const updateTheme = useCallback((next: RuntimeTheme) => {
    document.documentElement.dataset.theme = next;
    persistSystemPreferences({ locale: readRuntimeLocale() ?? runtimeI18n.resolvedLanguage ?? 'en-US', theme: next });
    setRuntimeTheme(next);
  }, [runtimeI18n.resolvedLanguage]);
  return (
    <RuntimeThemeContext.Provider value={{ theme: runtimeTheme, setTheme: updateTheme }}>
      <ConfigProvider
        locale={resolveAntLocale(runtimeI18n.resolvedLanguage)}
        theme={createHertzBeatTheme(runtimeTheme)}
      >
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </RuntimeThemeContext.Provider>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <I18nextProvider i18n={i18n}>
      <RuntimeProviders>{children}</RuntimeProviders>
    </I18nextProvider>
  );
}
