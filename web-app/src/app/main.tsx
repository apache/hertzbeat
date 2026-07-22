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

import '@ant-design/v5-patch-for-react-19';
import 'antd/dist/reset.css';
import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { initializeI18n } from '@/core/i18n/i18n';
import { readRuntimeTheme } from '@/core/runtime-preferences';

import { AppProviders } from './providers';
import { AppRouter } from './router';

async function bootstrap() {
  document.documentElement.dataset.theme = readRuntimeTheme();
  await initializeI18n();
  const root = document.getElementById('root');
  if (!root) throw new Error('The HertzBeat application root was not found.');

  createRoot(root).render(
    <StrictMode>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </StrictMode>
  );
}

void bootstrap();
