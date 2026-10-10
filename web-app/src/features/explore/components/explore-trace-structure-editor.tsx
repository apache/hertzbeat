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

import { Button, Input, Select } from 'antd';
import type { TFunction } from 'i18next';
import type { ExploreSubmissionViewModel, TraceExploreSubmissionDraft } from '../model/explore-submission-model';
import { readTraceStructureDraft, type TraceStructureDraft } from '../model/explore-trace-structure';
import { ExploreQueryField } from './explore-query-field';
import styles from './explore-query-bar.module.css';

type Props = Pick<ExploreSubmissionViewModel, 'updateField' | 'errors'> & {
  draft: TraceExploreSubmissionDraft;
  t: TFunction;
};

export function ExploreTraceStructureEditor({ draft, updateField, errors, t }: Props) {
  const structure = readTraceStructureDraft(draft.traceStructure);
  if (!structure) return <p role="alert">{t('exploreTrace.structure.invalid')}</p>;
  const update = (next: TraceStructureDraft) => updateField({ field: 'traceStructure', value: JSON.stringify(next) });
  const conflicting =
    [
      draft.serviceName,
      draft.serviceNamespace,
      draft.environment,
      draft.instance,
      draft.endpoint,
      draft.query,
      draft.traceId,
      draft.resourceFilter,
      draft.attributeFilter,
      draft.minDurationMs,
      draft.maxDurationMs,
      draft.spanScope
    ].some(Boolean) ||
    draft.errorOnly ||
    draft.hideInternal ||
    draft.sort !== 'newest';
  return (
    <div className={styles.guidedFields} data-trace-structure-editor="">
      <p>{t('exploreTrace.structure.help')}</p>
      {(['a', 'b'] as const).map(key => (
        <div
          key={key}
          className={styles.guidedFields}
          aria-label={t('exploreTrace.structure.clause', { clause: key.toUpperCase() })}
        >
          <strong>{t('exploreTrace.structure.clause', { clause: key.toUpperCase() })}</strong>
          <ExploreQueryField label={t('explore.serviceName')}>
            <Input
              aria-label={`${key.toUpperCase()} ${t('explore.serviceName')}`}
              value={structure[key].serviceName ?? ''}
              onChange={event =>
                update({ ...structure, [key]: { ...structure[key], serviceName: event.target.value || null } })
              }
            />
          </ExploreQueryField>
          <ExploreQueryField label={t('exploreTrace.structure.operation')}>
            <Input
              aria-label={`${key.toUpperCase()} ${t('exploreTrace.structure.operation')}`}
              value={structure[key].operationName ?? ''}
              onChange={event =>
                update({ ...structure, [key]: { ...structure[key], operationName: event.target.value || null } })
              }
            />
          </ExploreQueryField>
          <ExploreQueryField label={t('exploreTrace.structure.status')}>
            <Select
              aria-label={`${key.toUpperCase()} ${t('exploreTrace.structure.status')}`}
              value={structure[key].status ?? ''}
              options={[
                { value: '', label: t('exploreTrace.structure.anyStatus') },
                ...(['ERROR', 'OK', 'UNSET'] as const).map(value => ({ value, label: value }))
              ]}
              onChange={value => update({ ...structure, [key]: { ...structure[key], status: value || null } })}
            />
          </ExploreQueryField>
        </div>
      ))}
      <ExploreQueryField label={t('exploreTrace.structure.relation')}>
        <Select
          aria-label={t('exploreTrace.structure.relation')}
          value={structure.relation}
          options={(['both', 'either', 'direct', 'upstream'] as const).map(value => ({
            value,
            label: t(`exploreTrace.structure.${value}`)
          }))}
          onChange={relation => update({ ...structure, relation })}
        />
      </ExploreQueryField>
      {conflicting && (
        <p role="alert">
          {t('exploreTrace.structure.conflict')}{' '}
          <Button type="link" onClick={() => clearTraceFilters(updateField)}>
            {t('exploreTrace.structure.clearFilters')}
          </Button>
        </p>
      )}
      {errors.traceStructure && <p role="alert">{t(`exploreTrace.structure.${errors.traceStructure}`)}</p>}
    </div>
  );
}

function clearTraceFilters(updateField: ExploreSubmissionViewModel['updateField']) {
  for (const field of [
    'serviceName',
    'serviceNamespace',
    'environment',
    'instance',
    'endpoint',
    'query',
    'traceId',
    'resourceFilter',
    'attributeFilter',
    'minDurationMs',
    'maxDurationMs',
    'spanScope'
  ] as const)
    updateField({ field, value: '' });
  updateField({ field: 'sort', value: 'newest' });
  updateField({ field: 'errorOnly', value: false });
  updateField({ field: 'hideInternal', value: false });
}
