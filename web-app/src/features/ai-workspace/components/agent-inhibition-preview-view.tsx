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
import type { AgentInhibitionPreview } from '../model/agent-inhibition-preview';
export function AgentInhibitionPreviewView({ preview }: { preview: AgentInhibitionPreview }) {
  const { t } = useTranslation();
  return (
    <section aria-label={t('aiWorkspace.approval.inhibition.title')}>
      <p role="note">{t('aiWorkspace.approval.inhibition.impact')}</p>
      <p>{t('aiWorkspace.approval.inhibition.versionLimit')}</p>
      <dl>
        <dt>{t('aiWorkspace.approval.inhibition.target')}</dt>
        <dd>
          <code>{preview.targetId ?? t('aiWorkspace.approval.inhibition.newTarget')}</code>
        </dd>
        {preview.sourceHash ? (
          <>
            <dt>{t('aiWorkspace.approval.inhibition.snapshot')}</dt>
            <dd>
              <code>{preview.sourceHash}</code>
            </dd>
          </>
        ) : null}
      </dl>
      <InhibitionChanges preview={preview} />
      {preview.configuration ? (
        <details open>
          <summary>{t('aiWorkspace.approval.inhibition.configuration')}</summary>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 320, overflow: 'auto' }}>
            <code>{JSON.stringify(preview.configuration, null, 2)}</code>
          </pre>
        </details>
      ) : (
        <p>{t('aiWorkspace.approval.inhibition.deleting')}</p>
      )}
    </section>
  );
}

function InhibitionChanges({ preview }: { preview: AgentInhibitionPreview }) {
  const { t } = useTranslation();
  if (!preview.targetId) return <p>{t('aiWorkspace.approval.revision.creating')}</p>;
  if (!preview.before) return <p>{t('aiWorkspace.approval.revision.beforeUnavailable')}</p>;
  const fields = ['name', 'sourceLabels', 'targetLabels', 'equalLabels', 'enable'] as const;
  const changed = fields.filter(
    field => !preview.configuration || comparison(preview.before?.[field]) !== comparison(preview.configuration[field])
  );
  if (!changed.length) return <p>{t('aiWorkspace.approval.revision.noChanges')}</p>;
  return (
    <table>
      <caption>{t('aiWorkspace.approval.revision.changes')}</caption>
      <thead>
        <tr>
          <th>{t('aiWorkspace.approval.revision.field')}</th>
          <th>{t('aiWorkspace.approval.revision.before')}</th>
          <th>{t('aiWorkspace.approval.revision.after')}</th>
        </tr>
      </thead>
      <tbody>
        {changed.map(field => (
          <tr key={field}>
            <th>{field}</th>
            <td>
              <code>{JSON.stringify(preview.before?.[field])}</code>
            </td>
            <td>
              <code>
                {preview.configuration
                  ? JSON.stringify(preview.configuration[field])
                  : t('aiWorkspace.approval.revision.removed')}
              </code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function comparison(value: unknown) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value))
    return JSON.stringify(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify(value);
}
