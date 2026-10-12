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

import type { TFunction } from 'i18next';
import type { LogQueryBuilderViewModel } from '../model/explore-log-builder-model';
import type { LogScopeSuggestions } from '../model/explore-log-scope-suggestions';
import type { ExploreQuery } from '../model/explore-model';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import { ExploreAdvancedFilters, ExploreGuidedFilters } from './explore-advanced-filters';
import { ExploreLogQueryBuilder, type LogQueryEditorMode } from './explore-log-query-builder';
import type { MetricPlanEditorProps } from './explore-metric-plan-editor';
import { ExploreMetricQueryDisclosure } from './explore-metric-query-disclosure';
import { ExploreTraceStructureEditor } from './explore-trace-structure-editor';

type ExploreQueryFiltersProps = {
  query: ExploreQuery;
  t: TFunction;
  submission: ExploreSubmissionViewModel;
  editor: LogQueryBuilderViewModel;
  suggestions?: LogScopeSuggestions | undefined;
  metricEditor?: MetricPlanEditorProps | undefined;
};

export function ExploreQueryFilters(props: ExploreQueryFiltersProps & { mode: LogQueryEditorMode }) {
  const { draft, errors, updateField } = props.submission;
  const { t, editor, mode } = props;
  if (draft.signal === 'metrics' && props.metricEditor) {
    return <ExploreMetricQueryDisclosure submission={props.submission} metricEditor={props.metricEditor} t={t} />;
  }
  return (
    <>
      {draft.signal === 'logs' ? (
        <ExploreLogQueryBuilder
          draft={draft}
          mode={mode}
          t={t}
          updateField={updateField}
          editor={editor}
          suggestions={props.suggestions}
        />
      ) : draft.signal === 'traces' && draft.traceStructure !== undefined ? (
        <ExploreTraceStructureEditor draft={draft} errors={errors} t={t} updateField={updateField} />
      ) : (
        <>
          {!props.metricEditor && (
            <ExploreGuidedFilters
              appliedTraceView={props.query.signal === 'traces' ? props.query.traceView : undefined}
              metricRows={Boolean(props.metricEditor)}
              draft={draft}
              errors={errors}
              t={t}
              updateField={updateField}
            />
          )}
          <ExploreAdvancedFilters
            metricRows={Boolean(props.metricEditor)}
            draft={draft}
            errors={errors}
            t={t}
            updateField={updateField}
          />
        </>
      )}
    </>
  );
}
