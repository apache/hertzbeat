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

import { App } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import { classifyAlertSilenceReadError } from '../alert-silence-api';

export type AlertSilenceProjectionFailure = 'unavailable' | 'error';

type Feedback = { success: string; error: string };
type CommittedOperation = {
  write: () => Promise<void>;
  onCommitted?: () => void;
  verify: () => Promise<void>;
};

export function useAlertSilenceOperationGate() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [active, setActive] = useState(false);
  const [projectionFailure, setProjectionFailure] = useState<AlertSilenceProjectionFailure | null>(null);
  const owner = useRef<number | null>(null);
  const nextOwner = useRef(0);
  const mounted = useRef(false);
  const projectionFailureRef = useRef<AlertSilenceProjectionFailure | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      owner.current = null;
    };
  }, []);

  const clearProjectionFailure = useCallback(() => {
    projectionFailureRef.current = null;
    if (mounted.current) setProjectionFailure(null);
  }, []);
  const isLocked = useCallback(() => owner.current !== null || projectionFailureRef.current !== null, []);
  const run = useCallback(
    async (operation: CommittedOperation, feedback: Feedback) => {
      if (owner.current !== null || projectionFailureRef.current !== null) return;
      // Claim a ref owner before React publishes busy state to close same-tick
      // duplicate writes from repeated clicks or imperative callers.
      const commandOwner = ++nextOwner.current;
      owner.current = commandOwner;
      setActive(true);
      try {
        await operation.write();
      } catch {
        if (owns(commandOwner, owner, mounted)) void message.error(t(feedback.error));
        retire(commandOwner, owner, mounted, setActive);
        return;
      }
      if (!owns(commandOwner, owner, mounted)) return;
      try {
        // A successful write is final. Later read failures describe stale or
        // unavailable projection state and must not turn into a retryable write.
        operation.onCommitted?.();
        void message.success(t(feedback.success));
        await operation.verify();
        clearProjectionFailure();
      } catch (reason) {
        if (owns(commandOwner, owner, mounted)) {
          const failure = projectionFailureKind(reason);
          projectionFailureRef.current = failure;
          setProjectionFailure(failure);
          void message.error(t('common.routeError.description'));
        }
      } finally {
        retire(commandOwner, owner, mounted, setActive);
      }
    },
    [clearProjectionFailure, message, t]
  );

  return { busy: active || projectionFailure !== null, clearProjectionFailure, isLocked, projectionFailure, run };
}

function owns(commandOwner: number, owner: RefObject<number | null>, mounted: RefObject<boolean>) {
  return mounted.current && owner.current === commandOwner;
}

function retire(
  commandOwner: number,
  owner: RefObject<number | null>,
  mounted: RefObject<boolean>,
  setActive: Dispatch<SetStateAction<boolean>>
) {
  if (owner.current !== commandOwner) return;
  owner.current = null;
  if (mounted.current) setActive(false);
}

function projectionFailureKind(reason: unknown): AlertSilenceProjectionFailure {
  return classifyAlertSilenceReadError(reason) === 'unavailable' ? 'unavailable' : 'error';
}
