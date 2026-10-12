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

import { readLogNumericRange } from '@/shared/log-numeric-range';
import type { TFunction } from 'i18next';
import type { RecentLogSearch } from './explore-recent-log-searches';
import { logGroupSelectionLabel } from './explore-log-group-selection';
import { readLogAnalysisDraft } from './explore-log-analysis';
import { logOrderLabel } from './explore-log-order';
import { logGroupingFieldLabel } from './explore-log-grouping';
import { parseLogCalculatedV2 } from './explore-log-calculated-v2';
import { parseLogSubquery } from './explore-log-subquery';
export function recentLogSearchSummary(entry: RecentLogSearch, t: TFunction) {
  const filters = Object.entries(entry)
    .filter(
      ([key, value]) =>
        ![
          'signal',
          'query',
          'executedAt',
          'sort',
          'logSort',
          'logAnalysis',
          'logCalculatedV2',
          'logSubquery',
          'logReferenceJoin'
        ].includes(key) && Boolean(value)
    )
    .map(([key, value]) => {
      if (key === 'logNumericRange') {
        const range = readLogNumericRange(String(value));
        return range ? `${t('explore.logNumericRange.title')}: ${range.field} [${range.min}, ${range.max}]` : '';
      }
      if (key === 'logGroupSelection') return logGroupSelectionLabel(String(value), t);
      if (typeof value === 'boolean') return t(`exploreLog.${key}`);
      if (key === 'searchSyntax')
        return `${t('explore.logAuthoring.syntax')}: ${t(['structured-v1', 'structured-v2'].includes(String(value)) ? 'explore.logAuthoring.structured' : 'explore.logAuthoring.unsupportedMode')}`;
      return `${t(scopeLabel(key))}: ${String(value)}`;
    });
  if (entry.logAnalysis) filters.push(analysisSummary(entry.logAnalysis, t));
  const calculated = parseLogCalculatedV2(entry.logCalculatedV2);
  if (calculated)
    filters.push(
      `${t('explore.logCalculated.mode')}: ${calculated.fields.flatMap(field => (field.kind === 'formula' ? [field.name] : field.captures.map(capture => capture.name))).join(', ')}`
    );
  const subquery = parseLogSubquery(entry.logSubquery);
  if (subquery)
    filters.push(
      `${t('explore.logSubquery.label')}: ${subquery.mainField} ${subquery.operator === 'in' ? t('explore.logSubquery.in') : t('explore.logSubquery.notIn')} ${t(`explore.logSubquery.${subquery.rank.direction}`)} ${subquery.rank.limit}`
    );
  if (entry.logReferenceJoin !== undefined) filters.push(t('explore.retiredReferenceJoin'));
  if (entry.sort || entry.logSort)
    filters.push(`${t('explore.logColumns.sort')}: ${logOrderLabel(entry.logSort, entry.sort, t)}`);
  return filters.filter(Boolean).join(' · ');
}
function analysisSummary(raw: string, t: TFunction) {
  const analysis = readLogAnalysisDraft(raw);
  if (!analysis) return '';
  const measure = analysis.measure;
  const label = t(`explore.logAnalysis.${measure?.function ?? 'count'}`);
  const summary = t('explore.recentLogs.analysisSummary', {
    view: t(`explore.logAnalysis.${analysis.representation}`),
    measure: measure ? `${label} (${logGroupingFieldLabel(measure.field, t)})` : label
  });
  return analysis.comparison ? `${summary} · ${t('explore.recentLogs.comparisonSummary')}` : summary;
}
function scopeLabel(key: string) {
  if (key === 'resourceFilter' || key === 'attributeFilter') return `exploreLog.${key}`;
  if (key === 'severityText') return 'explore.originalSeverity';
  if (key === 'severityCategory') return 'explore.severity';
  if (key === 'instance' || key === 'endpoint') return `signalDashboard.fields.${key}`;
  return `explore.${key}`;
}
