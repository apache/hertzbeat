/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
