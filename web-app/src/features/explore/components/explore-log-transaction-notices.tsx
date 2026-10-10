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

import { Button } from 'antd';
import type { TFunction } from 'i18next';

export function ExploreLogTransactionNotices({
  mode,
  invalidTransactions,
  invalidCalculated,
  pending,
  t,
  onMode,
  onChange,
  onCalculatedChange
}: {
  mode: string | undefined;
  invalidTransactions: boolean;
  invalidCalculated: boolean;
  pending: boolean;
  t: TFunction;
  onMode: (mode: string) => void;
  onChange: (raw: string | undefined) => void;
  onCalculatedChange?: ((raw: string | undefined) => void) | undefined;
}) {
  return (
    <>
      {invalidTransactions && (
        <span role="alert">
          {t(mode === 'patterns' ? 'explore.logPatterns.invalidSettings' : 'explore.logTransactions.invalid')}
          <Button
            onClick={() => {
              onChange(undefined);
              if (mode === 'transactions') onMode('fields');
            }}
          >
            {t('explore.logTransactions.reset')}
          </Button>
        </span>
      )}
      {invalidCalculated && (
        <span role="alert">
          {t('explore.logCalculated.invalid')}
          <Button
            onClick={() => {
              onCalculatedChange?.(undefined);
              if (mode === 'calculated') onMode('fields');
            }}
          >
            {t('explore.logTransactions.reset')}
          </Button>
        </span>
      )}
      {pending && <span role="status">{t(pendingKey(mode))}</span>}
    </>
  );
}

function pendingKey(mode: string | undefined) {
  if (mode === 'patterns') return 'explore.logPatterns.pending';
  if (mode === 'calculated') return 'explore.logCalculated.pending';
  return 'explore.logTransactions.pending';
}
