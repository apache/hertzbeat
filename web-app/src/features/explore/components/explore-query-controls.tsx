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

import { ExploreLogComparisonEditor } from './explore-log-comparison-editor';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';
import { ExploreLogSearchInput } from './explore-log-search-input';
import type { LogSearchSuggestions } from '../model/explore-log-search-authoring';

import type { ReactNode } from 'react';
import { Input, Radio } from 'antd';
import type { TFunction } from 'i18next';
import { type SharedTimeValue } from '@/shared/time';
import { type ExploreQuery, type ExploreQueryPatch } from '../model/explore-model';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import type { RecentLogSearch } from '../model/explore-recent-log-searches';
import type { LogQueryEditorMode } from './explore-log-query-builder';
import { ExploreQueryField } from './explore-query-field';
import { EMPTY_TRACE_STRUCTURE_DRAFT } from '../model/explore-trace-structure';
import { ExploreMetricQueryControls } from './explore-metric-query-controls';
import styles from './explore-query-bar.module.css';
import traceLayout from './explore-trace-layout.module.css';
import { ExploreQueryRow } from './explore-query-row';

type Props = Pick<ExploreSubmissionViewModel, 'draft' | 'updateField'> & {
  query: ExploreQuery;
  recent?: ReactNode;
  recentQueries?: RecentLogSearch[] | undefined;
  restoreRecentQuery?: ((entry: RecentLogSearch) => void) | undefined;
  searchSuggestions?: LogSearchSuggestions | undefined;
  metricRows?: boolean | undefined;
  t: TFunction;
  updateScope: (changes: ExploreQueryPatch) => void;
  time: SharedTimeValue | null | undefined;
  mode: LogQueryEditorMode;
  lossless: boolean;
  changeMode: (mode: LogQueryEditorMode) => void;
  actions?: ReactNode;
  className?: string;
};

export function ExploreQueryControls(props: Props) {
  const { query, draft } = props;
  const logs = query.signal === 'logs' && draft.signal === 'logs';
  if (props.metricRows) {
    return <ExploreMetricQueryControls {...props} />;
  }
  if (query.signal === 'traces') return <ExploreTraceQueryControls {...props} />;
  return (
    <div data-log-command-fields={logs ? true : undefined} className={commandClass(props, logs)}>
      {logs && <ExploreEditorMode {...props} />}
      {draft.signal === 'traces' && <ExploreTraceQueryMode {...props} />}
      <QuerySearchField {...props} />
      <AddLogQuery {...props} />
      {logs && props.actions}
    </div>
  );
}

function ExploreTraceQueryControls(props: Props) {
  return (
    <ExploreQueryRow className={props.className ?? traceLayout.command} data-trace-command="true">
      <ExploreTraceQueryMode {...props} />
      <QuerySearchField {...props} />
      <div className={traceLayout.actions}>{props.actions}</div>
    </ExploreQueryRow>
  );
}

function ExploreTraceQueryMode({ draft, query, updateField, t }: Props) {
  if (draft.signal !== 'traces') return null;
  const contextual =
    query.signal === 'traces' &&
    Boolean(query.entityId || query.monitorId || query.intakeProfileId || query.collectorId);
  return (
    <ExploreQueryField slot="mode" label={t('exploreTrace.structure.modeLabel')}>
      <Radio.Group
        aria-label={t('exploreTrace.structure.modeLabel')}
        value={draft.traceStructure === undefined ? 'spans' : 'structure'}
        onChange={event =>
          updateField({
            field: 'traceStructure',
            value: event.target.value === 'structure' ? JSON.stringify(EMPTY_TRACE_STRUCTURE_DRAFT) : undefined
          })
        }
      >
        <Radio.Button value="spans">{t('exploreTrace.structure.spans')}</Radio.Button>
        <Radio.Button
          value="structure"
          disabled={contextual}
          {...(contextual ? { title: t('exploreTrace.structure.contextScope') } : {})}
        >
          {t('exploreTrace.structure.mode')}
        </Radio.Button>
      </Radio.Group>
    </ExploreQueryField>
  );
}

function ExploreEditorMode({ mode, lossless, changeMode, t }: Props) {
  return (
    <ExploreQueryField slot="editor" label={t('explore.logQueryBuilder.editor')}>
      <div className={styles.logMode} role="radiogroup" aria-label={t('explore.logQueryBuilder.editor')}>
        <Radio.Group
          name="log-query-editor"
          value={mode}
          onChange={event => {
            const value: unknown = event.target.value;
            if (value === 'builder' || value === 'code') changeMode(value);
          }}
        >
          <Radio.Button value="builder" disabled={!lossless}>
            {t('explore.logQueryBuilder.builder')}
          </Radio.Button>
          <Radio.Button value="code">{t('explore.logQueryBuilder.code')}</Radio.Button>
        </Radio.Group>
      </div>
    </ExploreQueryField>
  );
}

function QuerySearchField(props: Props) {
  const { query, draft, updateField, t } = props;
  if (draft.signal === 'traces' && draft.traceStructure !== undefined) return null;
  const logs = query.signal === 'logs' && draft.signal === 'logs';
  const comparison = fieldsComparison(draft);
  return (
    <>
      {!(query.signal === 'metrics' && props.metricRows) && (
        <ExploreQueryField
          slot={searchSlot(logs, query.signal)}
          className={styles.queryInput}
          label={t(logs && comparison ? 'explore.logComparison.source' : `explore.queryLabels.${query.signal}`, {
            source: 'a'
          })}
        >
          {logs ? (
            <>
              <div data-log-comparison-source="a">
                <ExploreLogSearchInput
                  value={draft.query}
                  syntax={draft.searchSyntax}
                  onChange={value => updateField({ field: 'query', value })}
                  onBlurSubmit={hasPendingSearch(query, draft)}
                  recent={props.recent}
                  recentQueries={props.recentQueries}
                  restoreRecentQuery={props.restoreRecentQuery}
                  suggestions={props.searchSuggestions}
                  t={t}
                />
              </div>
              {!query.live && comparison && (
                <ExploreLogComparisonEditor draft={draft} updateField={updateField} t={t} />
              )}
            </>
          ) : (
            <Input
              value={draft.query}
              aria-label={t(`explore.queryLabels.${query.signal}`)}
              onChange={event => updateField({ field: 'query', value: event.target.value })}
              placeholder={t(`explore.queryPlaceholders.${query.signal}`)}
            />
          )}
        </ExploreQueryField>
      )}
    </>
  );
}

function hasPendingSearch(
  query: Extract<ExploreQuery, { signal: 'logs' }>,
  draft: Extract<Props['draft'], { signal: 'logs' }>
) {
  return draft.query !== query.query || draft.searchSyntax !== (query.searchSyntax ?? '');
}

function AddLogQuery({ query, draft, updateField, t }: Props) {
  if (
    query.signal !== 'logs' ||
    draft.signal !== 'logs' ||
    query.live ||
    ['transactions', 'patterns', 'calculated'].includes(draft.logAggregation ?? '')
  )
    return null;
  if (readLogAnalysisDraft(draft.logAnalysis)?.comparison) return null;
  return (
    <div data-log-command-slot="add">
      <ExploreLogComparisonEditor draft={draft} updateField={updateField} t={t} />
    </div>
  );
}

function fieldsComparison(draft: Props['draft']) {
  return draft.signal === 'logs' && !['transactions', 'patterns', 'calculated'].includes(draft.logAggregation ?? '')
    ? readLogAnalysisDraft(draft.logAnalysis)?.comparison
    : undefined;
}

function commandClass(props: Props, logs: boolean) {
  if (props.className) return props.className;
  if (logs) return styles.logCommandFields;
  return styles.commandFields;
}
function searchSlot(logs: boolean, signal: ExploreQuery['signal']) {
  return logs || signal === 'traces' ? 'search' : undefined;
}
