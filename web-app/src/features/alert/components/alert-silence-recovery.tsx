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

import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertSilenceRecovery as RecoveryState } from '../model/alert-silence-page-model';

export function AlertSilenceRecovery({
  busy,
  canRetry = true,
  recovery,
  retry
}: {
  busy: boolean;
  canRetry?: boolean;
  recovery: RecoveryState | null;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (!recovery) return null;
  return (
    <Alert
      showIcon
      type="warning"
      message={t(recoveryMessageKey(recovery))}
      action={
        recovery.retryable ? (
          <Button size="small" disabled={busy || !canRetry} onClick={() => void retry()}>
            {t('common.retry')}
          </Button>
        ) : undefined
      }
    />
  );
}

function recoveryMessageKey(recovery: RecoveryState) {
  if (recovery.phase === 'projection') return 'common.routeError.description';
  if (recovery.kind === 'create' || recovery.kind === 'update') return 'alertSilences.saveFailed';
  return 'alertSilences.operationFailed';
}
