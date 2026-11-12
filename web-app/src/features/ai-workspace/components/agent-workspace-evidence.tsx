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

import { Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { AgentEvidence } from '../model/agent-evidence';
import { agentEvidenceSourcePath } from '../model/agent-source-path';
import { formatAgentScopeWindow } from './agent-workspace-format';
import styles from './agent-workspace-context-pane.module.css';

export function AgentWorkspaceEvidence({
  evidence,
  running
}: {
  evidence?: AgentEvidence[] | undefined;
  running: boolean;
}) {
  const { t } = useTranslation();
  const emptyKey = running ? 'collecting' : evidence === undefined ? 'unrecorded' : 'empty';
  return (
    <section className={styles.contextSection} aria-label={t('aiWorkspace.evidence.title')}>
      <Typography.Text strong>{t('aiWorkspace.evidence.title')}</Typography.Text>
      <div className={styles.contextBody}>
        {evidence?.length ? (
          evidence.map(item => <EvidenceItem key={item.evidenceId} evidence={item} />)
        ) : (
          <Typography.Text type="secondary">{t(`aiWorkspace.evidence.${emptyKey}`)}</Typography.Text>
        )}
      </div>
    </section>
  );
}

function EvidenceItem({ evidence }: { evidence: AgentEvidence }) {
  const { t } = useTranslation();
  const path = agentEvidenceSourcePath(evidence);
  const coverage = evidence.partial === null ? 'coverageUnknown' : evidence.partial ? 'partial' : 'complete';
  return (
    <article className={styles.evidence}>
      <div className={styles.activitySummary}>
        <Typography.Text strong>{evidence.signalType}</Typography.Text>
        <Tag color={evidence.partial === true ? 'warning' : 'default'}>{t(`aiWorkspace.evidence.${coverage}`)}</Tag>
      </div>
      <Typography.Text>{evidence.summary}</Typography.Text>
      <Typography.Text type="secondary">
        {t('aiWorkspace.evidence.observations', { count: evidence.observationCount })}
      </Typography.Text>
      {evidence.start !== null && evidence.end !== null ? (
        <Typography.Text type="secondary">{formatAgentScopeWindow(evidence.start, evidence.end)}</Typography.Text>
      ) : null}
      <code>{evidence.toolName}</code>
      {path ? <Typography.Link href={path}>{t('aiWorkspace.context.viewSource')}</Typography.Link> : null}
    </article>
  );
}
