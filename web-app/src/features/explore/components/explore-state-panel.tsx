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

import { Alert, Button, Skeleton } from 'antd';
import type { ReactNode } from 'react';

import styles from './explore-state-panel.module.css';

export function ExploreResultFrame({ children }: { children: ReactNode }) {
  return (
    <section className={styles.results} aria-live="polite">
      {children}
    </section>
  );
}

export function ExploreLoadingResult() {
  return (
    <ExploreResultFrame>
      <Skeleton active paragraph={{ rows: 8 }} />
    </ExploreResultFrame>
  );
}

type MessageProps = {
  type: 'error' | 'info' | 'warning';
  message: string;
  retry?: (() => Promise<void>) | undefined;
  retryLabel?: string | undefined;
};

export function ExploreMessageResult({ type, message, retry, retryLabel }: MessageProps) {
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

  return (
    <ExploreResultFrame>
      <Alert type={type} showIcon message={message} action={retryAction} />
    </ExploreResultFrame>
  );
}
