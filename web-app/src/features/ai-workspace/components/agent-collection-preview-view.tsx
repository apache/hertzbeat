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
import type { AgentCollectionPreview } from '../model/agent-collection-preview';
export function AgentCollectionPreviewView({ preview }: { preview: AgentCollectionPreview }) {
  const { t } = useTranslation();
  return (
    <section aria-label={t('aiWorkspace.approval.collection.title')}>
      <p role="alert">{t('aiWorkspace.approval.collection.risk')}</p>
      <dl>
        <dt>{t('aiWorkspace.approval.collection.target')}</dt>
        <dd>
          #{preview.monitorId} / {preview.collector}
        </dd>
        <dt>{t('aiWorkspace.approval.collection.account')}</dt>
        <dd>
          {preview.account} / {preview.operatingSystem}
        </dd>
        <dt>{t('aiWorkspace.approval.collection.directory')}</dt>
        <dd>
          <code>{preview.directory}</code>
        </dd>
        <dt>{t('aiWorkspace.approval.collection.revision')}</dt>
        <dd style={{ overflowWrap: 'anywhere' }}>
          <code>{preview.sourceRevision}</code>
        </dd>
        <dt>{t('aiWorkspace.approval.collection.hash')}</dt>
        <dd style={{ overflowWrap: 'anywhere' }}>
          <code>{preview.planHash}</code>
        </dd>
        <dt>{t('aiWorkspace.approval.collection.expires')}</dt>
        <dd>{new Date(preview.expiresAt).toLocaleString()}</dd>
      </dl>
      <p>
        <code>
          {preview.argv[0]} {preview.argv[1]}
        </code>
      </p>
      <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
        <code>{preview.argv[2]}</code>
      </pre>
    </section>
  );
}
