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
import {
  DEFAULT_LOG_ANALYSIS,
  removeLogSource,
  type LogQuerySet,
  type LogQuerySource,
  type LogQueryFormula
} from '@/platform/perses';
import type { LogFacetField } from '../model/explore-log-facets';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';
import { ExploreLogIntervalControls } from './explore-log-interval-controls';
import { SourceRow } from './explore-log-query-set-source-row';
import { FormulaRow } from './explore-log-query-set-formula-row';
import styles from './explore-log-add-authoring.module.css';

type Props = {
  value: LogQuerySet;
  raw: string | undefined;
  onChange: (raw: string) => void;
  fields: LogFacetField[];
  t: TFunction;
  onSubmit?: (() => void) | undefined;
  error?: string | undefined;
};

export function ExploreLogQuerySetAuthoring({ value, raw, onChange, fields, t, onSubmit, error }: Props) {
  const update = (next: LogQuerySet) => {
    const base = readLogAnalysisDraft(raw) ?? DEFAULT_LOG_ANALYSIS;
    onChange(JSON.stringify({ ...base, querySet: next }));
  };
  const updateSource = (next: LogQuerySource) =>
    update({
      ...value,
      queries: value.queries.map(source => (source.refId === next.refId ? next : source))
    });
  const updateFormula = (next: LogQueryFormula) =>
    update({
      ...value,
      formulas: value.formulas.map(formula => (formula.refId === next.refId ? next : formula))
    });
  return (
    <div className={styles.authoring} data-log-query-set-authoring>
      {error && <p role="alert">{error}</p>}
      {value.queries.map(source => (
        <SourceRow
          key={source.refId}
          source={source}
          value={value}
          fields={fields}
          t={t}
          update={updateSource}
          remove={() => update(removeLogSource(value, source.refId))}
          onSubmit={onSubmit}
        />
      ))}
      {value.formulas.map(formula => (
        <FormulaRow
          key={formula.refId}
          formula={formula}
          value={value}
          t={t}
          update={updateFormula}
          remove={() => update({ ...value, formulas: value.formulas.filter(item => item.refId !== formula.refId) })}
          onSubmit={onSubmit}
        />
      ))}
      <div className={styles.commonSettings}>
        <ExploreLogIntervalControls
          value={readLogAnalysisDraft(raw) ?? DEFAULT_LOG_ANALYSIS}
          onChange={next => onChange(JSON.stringify(next))}
          t={t}
        />
      </div>
    </div>
  );
}
