/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './login-page.module.css';
import { PassportBrand } from './passport-brand';

const CAPABILITY_KEYS = [
  'auth.passport.capability1',
  'auth.passport.capability2',
  'auth.passport.capability3',
  'auth.passport.capability4',
  'auth.passport.capability5',
  'auth.passport.capability6'
] as const;

/** Shared product context for standalone passport routes without coupling it to authentication state. */
export function PassportPageFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <main className={styles.page} data-passport-page="true" data-passport-background="legacy-artwork">
      <div className={styles.shell}>
        <header className={styles.brandHeader}>
          <PassportBrand variant="full" />
          <p className={styles.brandDescription}>{t('auth.passport.description')}</p>
        </header>

        <div className={styles.content}>
          <section
            className={styles.introduction}
            data-testid="passport-introduction"
            aria-labelledby="passport-introduction-title"
          >
            <h1 id="passport-introduction-title">
              <span>{t('auth.passport.headingLineOne')}</span>
              <span>{t('auth.passport.headingLineTwo')}</span>
            </h1>
            <ul aria-label={t('auth.passport.capabilityListLabel')}>
              {CAPABILITY_KEYS.map(key => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </section>

          <div className={styles.formRegion} data-testid="passport-form-region">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
