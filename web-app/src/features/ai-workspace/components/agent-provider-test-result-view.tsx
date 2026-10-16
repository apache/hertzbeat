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

import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import type { AgentProviderViewModel } from '../model/agent-workspace-view-model';

export function AgentProviderTestResultView({ controller }: { controller: AgentProviderViewModel }) {
  const { t } = useTranslation();
  const result = controller.testResult;
  if (controller.testFailed || controller.view?.effectiveError)
    return <Alert type="error" message={t('aiWorkspace.providers.unavailable')} />;
  if (!result) return null;
  return (
    <Alert
      type={result.error ? 'warning' : 'info'}
      message={['text', 'streaming', 'toolCalling']
        .map(
          key =>
            `${t(`aiWorkspace.providers.capabilities.${key}`)}: ${t(`aiWorkspace.providers.testStatuses.${result[key as 'text']}`)}`
        )
        .join(' · ')}
      description={result.error}
    />
  );
}
