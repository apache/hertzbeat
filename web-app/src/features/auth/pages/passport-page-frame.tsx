/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ConfigProvider } from 'antd';
import type { ReactNode } from 'react';

import { createHertzBeatTheme } from '@/shared/theme/hertzbeat-theme';

import styles from './login-page.module.css';
import { PassportBrand } from './passport-brand';
import { PassportIntroduction } from './passport-introduction';

const passportTheme = createHertzBeatTheme('default');

/** Shared product context for standalone passport routes without coupling it to authentication state. */
export function PassportPageFrame({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider theme={passportTheme}>
      <main
        className={styles.page}
        data-passport-page="true"
        data-passport-background="legacy-artwork"
        data-theme-scope="default"
      >
        <div className={styles.shell}>
          <header className={styles.brandHeader}>
            <PassportBrand variant="full" />
          </header>

          <div className={styles.content}>
            <PassportIntroduction />

            <div className={styles.formRegion} data-testid="passport-form-region">
              {children}
            </div>
          </div>
        </div>
      </main>
    </ConfigProvider>
  );
}
