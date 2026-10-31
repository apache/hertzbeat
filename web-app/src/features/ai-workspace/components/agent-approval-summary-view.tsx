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

import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { AgentCollectionPreviewView } from './agent-collection-preview-view';
import type { AgentApprovalSummary } from '../model/agent-approval-summary';

import { AgentPersonalWorkspacePreviewView } from './agent-personal-workspace-preview-view';

import { AgentInhibitionPreviewView } from './agent-inhibition-preview-view';
export function AgentApprovalSummaryView({ summary }: { summary?: AgentApprovalSummary | undefined }) {
  const { t } = useTranslation();
  if (!summary)
    return <Typography.Text type="secondary">{t('aiWorkspace.approval.summary.unavailable')}</Typography.Text>;
  return (
    <section aria-label={t('aiWorkspace.approval.summary.title')}>
      <p>
        {t('aiWorkspace.approval.summary.operationCount', {
          operation: t(`aiWorkspace.approval.summary.operation.${summary.operation}`),
          count: summary.targetCount
        })}
      </p>
      {summary.collection ? <AgentCollectionPreviewView preview={summary.collection} /> : null}
      {summary.inhibition ? <AgentInhibitionPreviewView preview={summary.inhibition} /> : null}
      {summary.personal ? <AgentPersonalWorkspacePreviewView preview={summary.personal} /> : null}
      {!summary.personal && !summary.inhibition ? (
        <ol>
          {summary.targets.map((target, index) => (
            <li key={index}>
              <code>
                {target.origin ?? (target.id ? `#${target.id}` : t('aiWorkspace.approval.summary.unknownTarget'))}
              </code>
              {target.intervals !== null ? (
                <div>{t('aiWorkspace.approval.summary.intervals', { value: target.intervals })}</div>
              ) : null}
              {target.timeout !== null ? (
                <div>{t('aiWorkspace.approval.summary.timeout', { value: target.timeout })}</div>
              ) : null}
              {target.pathFingerprint ? (
                <div>
                  {t('aiWorkspace.approval.summary.pathFingerprint')} <code>{target.pathFingerprint}</code>
                </div>
              ) : null}
              {target.keyFingerprint ? (
                <div>
                  {t('aiWorkspace.approval.summary.keyFingerprint')} <code>{target.keyFingerprint}</code>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
      {summary.changes.map(change => (
        <p key={change.field}>
          {t(`aiWorkspace.approval.summary.field.${change.field}`)}: <code>{change.value}</code>
        </p>
      ))}
      {summary.inputHash ? (
        <p style={{ wordBreak: 'break-all' }}>
          {t('aiWorkspace.approval.summary.inputHash')} <code>{summary.inputHash}</code>
        </p>
      ) : null}
      {summary.maskedFields.length ? <p>{t('aiWorkspace.approval.summary.masked')}</p> : null}
      {!summary.complete ? <p role="alert">{t('aiWorkspace.approval.summary.incomplete')}</p> : null}
    </section>
  );
}
