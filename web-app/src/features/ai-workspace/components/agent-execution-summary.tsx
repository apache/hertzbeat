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

import type { AgentExecutionSummary as ExecutionSummary, AgentQueryCoverage } from '../model/agent-workspace-contract';
import styles from './agent-workspace-execution.module.css';

export function AgentExecutionSummary({ summary, cancelledBeforeApproval = false }: { summary: ExecutionSummary; cancelledBeforeApproval?: boolean }) {
  const { t } = useTranslation();
  return (
    <details className={styles.executionDetails} data-status={cancelledBeforeApproval ? 'CANCELLED' : summary.status}>
      <summary className={styles.executionSummary}>
        <span>{t(cancelledBeforeApproval ? 'aiWorkspace.context.cancelledBeforeExecution' : `aiWorkspace.executionSummary.compact.${summary.status}`)}</span>
        <span className={styles.detailsHint}>{t('aiWorkspace.executionSummary.details')}</span>
      </summary>
      {cancelledBeforeApproval ? (
        <div className={styles.executionFacts}>
          <p>{t('aiWorkspace.context.cancelledBeforeExecution')}</p>
          <QueryCoverage summary={summary} />
        </div>
      ) : <ExecutionFacts summary={summary} />}
    </details>
  );
}

function ExecutionFacts({ summary }: { summary: ExecutionSummary }) {
  const { t } = useTranslation();
  return (
    <div className={styles.executionFacts}>
      <p>{t(`aiWorkspace.executionSummary.${summary.status}`)}</p>
      {summary.totalAttempts === null ? null : (
        <p>
          {t('aiWorkspace.executionSummary.counts', {
            total: summary.totalAttempts,
            succeeded: summary.succeededAttempts,
            failed: summary.failedAttempts,
            recovered: summary.recoveredAttempts,
            unresolved: summary.unresolvedAttempts,
            unfinished: summary.unfinishedAttempts
          })}
        </p>
      )}
      <p>{t('aiWorkspace.executionSummary.coverage')}</p>
      {summary.stopReason ? (
        <p>
          {t('aiWorkspace.executionSummary.stopReason')}: {summary.stopReason}
        </p>
      ) : null}
      <QueryCoverage summary={summary} />
      {summary.failures.length ? (
        <ul>
          {summary.failures.map((failure, index) => (
            <li key={failure.toolCallId ?? index}>
              <code>{failure.toolName}</code> · {failure.status} ·{' '}
              {t(`aiWorkspace.executionSummary.${failure.recovery}`)}
              {failure.errorMessage ? <div>{failure.errorMessage}</div> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {summary.truncated ? <p>{t('aiWorkspace.executionSummary.truncated')}</p> : null}
    </div>
  );
}

function QueryCoverage({ summary }: { summary: ExecutionSummary }) {
  const { t } = useTranslation();
  const items = summary.queryCoverage ?? [];
  if (!items.length) return null;
  return (
    <section>
      <p>{t('aiWorkspace.executionSummary.queryCoverage')}</p>
      <ul>
        {items.map(item => (
          <CoverageItem key={item.toolCallId} item={item} />
        ))}
      </ul>
      {summary.coverageTruncated ? <p>{t('aiWorkspace.executionSummary.coverageTruncated')}</p> : null}
    </section>
  );
}

function CoverageItem({ item }: { item: AgentQueryCoverage }) {
  const { t } = useTranslation();
  const unknown = t('aiWorkspace.executionSummary.countUnknown');
  const window =
    item.start !== null && item.end !== null
      ? `${new Date(item.start).toISOString()} – ${new Date(item.end).toISOString()}`
      : t('aiWorkspace.executionSummary.absoluteWindowUnknown');
  return (
    <li>
      <code>{item.toolName}</code> · {t(`aiWorkspace.executionSummary.coverageStates.${item.state}`)}
      <div>
        {t('aiWorkspace.executionSummary.rangeCounts', {
          returned: item.returned ?? unknown,
          total: item.total ?? unknown,
          offset: item.offset ?? unknown,
          unit: t(`aiWorkspace.executionSummary.${item.unit}`)
        })}
      </div>
      <div>{window}</div>
      <div>
        {Object.entries(item.scope)
          .map(([name, value]) => `${name}: ${value}`)
          .join(' · ')}
      </div>
    </li>
  );
}
