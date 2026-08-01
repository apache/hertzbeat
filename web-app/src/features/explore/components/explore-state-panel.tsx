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

import { Button } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel, type OperationalStateKind } from '@/shared/operational-page';

import styles from './explore-state-panel.module.css';

export function ExploreResultFrame({ children }: { children: ReactNode }) {
  return (
    <section className={styles.results} aria-live="polite">
      {children}
    </section>
  );
}

export function ExploreLoadingResult() {
  const { t } = useTranslation();
  return <OperationalStatePanel kind="loading" title={t('explore.states.loading')} />;
}

type MessageProps = {
  kind: OperationalStateKind;
  message: string;
  retry?: (() => Promise<void>) | undefined;
  retryLabel?: string | undefined;
};

export function ExploreMessageResult({ kind, message, retry, retryLabel }: MessageProps) {
  const retryAction =
    retry && retryLabel ? (
      <Button
        onClick={() => {
          void retry();
        }}
      >
        {retryLabel}
      </Button>
    ) : undefined;

  return <OperationalStatePanel kind={kind} title={message} action={retryAction} />;
}
