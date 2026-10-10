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

import { Select } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { TraceExploreQuery } from '../model/explore-query';
import type { TraceExploreSubmissionDraft, ExploreDraftFieldUpdate } from '../model/explore-submission-model';
import type { TraceFacetField } from '../model/explore-trace-analytics';
import {
  readTraceFacetGroup,
  traceFacetAction,
  traceFacetModeAction,
  traceFacetClearAction,
  type TraceFacetMode
} from '../model/explore-trace-facet-action';
import { ExploreTraceHelp } from './explore-trace-help';
import styles from './explore-trace-facet-groups.module.css';
type Props = {
  draft: TraceExploreSubmissionDraft;
  scope: TraceExploreQuery;
  field: TraceFacetField;
  mode: TraceFacetMode;
  enabled: boolean;
  onModeChange: (mode: TraceFacetMode) => void;
  onChange: (patch: ExploreDraftFieldUpdate) => void;
};
export function TraceFacetGroups(props: Props) {
  const { t } = useTranslation(),
    { draft, scope, field, enabled, mode, onChange, onModeChange } = props;
  const group = readTraceFacetGroup(draft, scope, field);
  return (
    <>
      <Select<TraceFacetMode>
        aria-label={t('exploreTrace.facets.mode')}
        value={group.state === 'raw' ? null : mode}
        placeholder={t('exploreTrace.facets.rawLabel')}
        disabled={!enabled || group.state !== 'ready'}
        options={(['include', 'exclude'] as const).map(value => ({ value, label: t(`exploreTrace.facets.${value}`) }))}
        onChange={value => {
          const patch = traceFacetModeAction(draft, scope, field, value);
          if (patch) onChange(patch);
          onModeChange(value);
        }}
      />
      {group.state !== 'ready' && <p>{t(`exploreTrace.facets.${group.state}`)}</p>}
      <ExploreTraceHelp>
        <p>{t('exploreTrace.analytics.draft')}</p>
        <p>{t('exploreTrace.facets.spanMeaning')}</p>
      </ExploreTraceHelp>
      {(mode === 'exclude' ||
        (['serviceName', 'operationName', 'environment'] as const).some(
          key => readTraceFacetGroup(draft, scope, key).mode === 'exclude'
        )) && <p>{t('exploreTrace.facets.missing')}</p>}
      <section className={styles.groups} aria-label={t('exploreTrace.facets.current')}>
        {(['serviceName', 'operationName', 'environment'] as const).map(key => (
          <FacetGroup key={key} {...props} field={key} />
        ))}
      </section>
    </>
  );
}
function FacetGroup({ draft, scope, field, enabled, onChange }: Props) {
  const { t } = useTranslation(),
    group = readTraceFacetGroup(draft, scope, field),
    label = t(`exploreTrace.analytics.fields.${field}`);
  if (!group.values.length && group.state !== 'raw') return null;
  const disabled = !enabled || group.state !== 'ready';
  return (
    <div className={styles.group}>
      <div className={styles.heading}>
        <strong>{label}</strong>
        <span>{t(`exploreTrace.facets.${group.state === 'raw' ? 'rawLabel' : group.mode}`)}</span>
        <button
          type="button"
          disabled={disabled || !group.values.length}
          aria-label={t('exploreTrace.facets.clear', { field: label })}
          onClick={() => {
            const patch = traceFacetClearAction(draft, scope, field);
            if (patch) onChange(patch);
          }}
        >
          {t('exploreTrace.facets.clearLabel')}
        </button>
      </div>
      <ul className={styles.values}>
        {group.values.map(value => (
          <li key={value}>
            <span title={value}>{value}</span>
            <button
              type="button"
              disabled={disabled}
              aria-label={t('exploreTrace.facets.remove', { field: label, value })}
              onClick={() => {
                const patch = traceFacetAction(draft, scope, field, value, group.mode);
                if (patch) onChange(patch);
              }}
            >
              <CloseOutlined aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
