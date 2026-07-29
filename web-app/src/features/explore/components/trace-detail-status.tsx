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

import { Alert, Button, Empty, Skeleton } from 'antd';
import type { TFunction } from 'i18next';

import type { TraceDetailState } from '../model/explore-signal-model';

type Props = {
  state: Exclude<TraceDetailState, { kind: 'closed' }>;
  retry: () => Promise<void>;
  t: TFunction;
};

export function TraceDetailStatus({ state, retry, t }: Props) {
  if (state.kind === 'loading') return <Skeleton active paragraph={{ rows: 10 }} />;
  if (state.kind === 'missing') return <Empty description={t('explore.empty.traces')} />;
  if (state.kind === 'permission')
    return <Alert type="warning" showIcon message={t('common.permission.roleRequiredDescription')} />;
  if (state.kind === 'unavailable')
    return <TraceFailure type="warning" message={t('common.unavailable')} retry={retry} t={t} />;
  if (state.kind === 'error')
    return <TraceFailure type="error" message={t('exploreTrace.loadFailed')} retry={retry} t={t} />;
  return null;
}

function TraceFailure({
  type,
  message,
  retry,
  t
}: {
  type: 'warning' | 'error';
  message: string;
  retry: () => Promise<void>;
  t: TFunction;
}) {
  return (
    <Alert
      type={type}
      showIcon
      message={message}
      action={<Button onClick={() => void retry()}>{t('common.retry')}</Button>}
    />
  );
}
