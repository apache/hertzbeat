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

import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './agent-workspace-message-copy.module.css';

export function MessageCopy({ text, generating }: { text: string; generating: boolean }) {
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState<{ owner: string; result: 'idle' | 'copied' | 'failed'; busy: boolean }>({
    owner: '',
    result: 'idle',
    busy: false
  });
  const result = feedback.owner === text ? feedback.result : 'idle';
  const busy = feedback.owner === text && feedback.busy;
  const request = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      request.current += 1;
      clearTimeout(timer.current);
    },
    [text, generating]
  );
  const copy = async () => {
    const current = ++request.current;
    clearTimeout(timer.current);
    setFeedback({ owner: text, result: 'idle', busy: true });
    try {
      await navigator.clipboard.writeText(text);
      if (current === request.current) setFeedback({ owner: text, result: 'copied', busy: false });
    } catch {
      if (current === request.current) setFeedback({ owner: text, result: 'failed', busy: false });
    } finally {
      if (current === request.current) {
        timer.current = setTimeout(() => setFeedback({ owner: text, result: 'idle', busy: false }), 2500);
      }
    }
  };
  const label = t(generating ? 'aiWorkspace.message.copyAfterGeneration' : 'aiWorkspace.message.copy');
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.copy}
        aria-label={label}
        title={label}
        disabled={generating || busy || !text.trim()}
        onClick={() => void copy()}
      >
        {result === 'copied' ? <CheckOutlined /> : <CopyOutlined />}
      </button>
      <span
        role={result === 'failed' ? 'alert' : 'status'}
        aria-live="polite"
        aria-atomic="true"
        className={styles.feedback}
      >
        {result === 'idle'
          ? ''
          : t(result === 'copied' ? 'aiWorkspace.message.copied' : 'aiWorkspace.message.copyFailed')}
      </span>
    </div>
  );
}
