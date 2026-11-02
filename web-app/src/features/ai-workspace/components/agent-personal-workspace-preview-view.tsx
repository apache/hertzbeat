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

import { useTranslation } from 'react-i18next';
import type { AgentPersonalWorkspacePreview } from '../model/agent-personal-workspace-preview';
export function AgentPersonalWorkspacePreviewView({ preview }: { preview: AgentPersonalWorkspacePreview }) {
  const { t } = useTranslation();
  return (
    <section aria-label={t('aiWorkspace.approval.personal.title')}>
      <p>{t('aiWorkspace.approval.personal.scope')}</p>
      {preview.kind === 'FAVORITE' ? (
        <dl>
          <dt>{t('aiWorkspace.approval.personal.monitor')}</dt>
          <dd>
            <code>#{preview.monitorId}</code>
          </dd>
          <dt>{t('aiWorkspace.approval.personal.metric')}</dt>
          <dd>
            <code>{preview.metricsName}</code>
          </dd>
          <dt>{t('aiWorkspace.approval.personal.action')}</dt>
          <dd>
            {t(
              preview.favorite ? 'aiWorkspace.approval.personal.favorite' : 'aiWorkspace.approval.personal.unfavorite'
            )}
          </dd>
        </dl>
      ) : (
        <>
          <dl>
            <dt>{t('aiWorkspace.approval.personal.application')}</dt>
            <dd>
              <code>{preview.application}</code>
            </dd>
            <dt>{t('aiWorkspace.approval.personal.action')}</dt>
            <dd>{t(preview.request ? 'aiWorkspace.approval.personal.save' : 'aiWorkspace.approval.personal.reset')}</dd>
            <dt>{t('aiWorkspace.approval.personal.revision')}</dt>
            <dd>
              <code>{preview.expectedRevision}</code>
            </dd>
          </dl>
          {preview.request ? (
            <details open>
              <summary>{t('aiWorkspace.approval.personal.document')}</summary>
              <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 320, overflow: 'auto' }}>
                <code>{JSON.stringify(preview.request, null, 2)}</code>
              </pre>
            </details>
          ) : null}
        </>
      )}
    </section>
  );
}
