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

import { useState } from 'react';
import { Button, Dropdown, Tag } from 'antd';
import type { TFunction } from 'i18next';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import { parseLogCalculatedV2, removeCalculatedField } from '../model/explore-log-calculated-v2';
import type { LogCalculatedV2 } from '../model/explore-log-calculated-v2';
import type { LogFacetField } from '../model/explore-log-facets';
import { appendStructuredClause } from '../model/explore-log-structured-facet-action';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';
import { DEFAULT_LOG_ANALYSIS } from '@/platform/perses';
import { calculatedGroupByAnalysis } from '../model/explore-log-calculated-group-action';
import { ExploreLogCalculatedV2Editor } from './explore-log-calculated-v2-editor';
import type { ValidateCalculatedFields } from '../model/explore-calculated-validation-contract';
import styles from './explore-log-calculated-v2-chips.module.css';

type Props = {
  submission: ExploreSubmissionViewModel;
  t: TFunction;
  validate: ValidateCalculatedFields;
  sources?: LogFacetField[];
};
export function ExploreLogCalculatedV2Chips({ submission, t, validate, sources = [] }: Props) {
  const [editingId, setEditingId] = useState<string>();
  const [blocked, setBlocked] = useState(false);
  const [groupBlocked, setGroupBlocked] = useState(false);
  const draft = submission.draft;
  if (draft.signal !== 'logs' || draft.logCalculatedV2 === undefined) return null;
  const state = parseLogCalculatedV2(draft.logCalculatedV2);
  if (!state) return <p role="alert">{t('explore.logCalculatedV2.invalid')}</p>;
  const remove = (id: string) => {
    const next = removeCalculatedField(draft.logCalculatedV2, id, draft.query, draft.logSort, draft.logAnalysis);
    if (next.blocked) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    submission.updateField({ field: 'logCalculatedV2', value: next.raw });
    if (next.raw === undefined) submission.updateField({ field: 'searchSyntax', value: 'structured-v1' });
  };
  const filter = (name: string) => filterCalculated(submission, draft.query, name);
  const group = (name: string) => {
    setGroupBlocked(!groupCalculated(submission, draft.logAnalysis, name));
  };
  return (
    <div data-calculated-draft-chips>
      <div className={styles.row}>
        <span className={styles.label}>{t('explore.logCalculatedV2.fields')}</span>
        <CalculatedChipList
          fields={state.fields}
          t={t}
          filter={filter}
          group={group}
          edit={setEditingId}
          remove={remove}
        />
      </div>
      {blocked && <p role="alert">{t('explore.logCalculatedV2.dependency')}</p>}
      {groupBlocked && <p role="alert">{t('explore.logCalculatedV2.groupUnavailable')}</p>}
      {editingId && (
        <ExploreLogCalculatedV2Editor
          key={editingId}
          editingId={editingId}
          raw={draft.logCalculatedV2}
          search={draft.query}
          sort={draft.logSort}
          analysis={draft.logAnalysis}
          sources={sources}
          validate={validate}
          t={t}
          onClose={() => setEditingId(undefined)}
          onApply={raw => submission.updateField({ field: 'logCalculatedV2', value: raw })}
        />
      )}
    </div>
  );
}

function groupCalculated(submission: ExploreSubmissionViewModel, raw: string | undefined, name: string) {
  const current = readLogAnalysisDraft(raw) ?? DEFAULT_LOG_ANALYSIS;
  const next = calculatedGroupByAnalysis(current, name);
  if (!next) return false;
  submission.updateField({ field: 'logAnalysis', value: JSON.stringify(next) });
  submission.submit();
  return true;
}

function CalculatedChipList({
  fields,
  t,
  filter,
  group,
  edit,
  remove
}: {
  fields: LogCalculatedV2['fields'];
  t: TFunction;
  filter: (name: string) => void;
  group: (name: string) => void;
  edit: (id: string) => void;
  remove: (id: string) => void;
}) {
  return (
    <div className={styles.tags}>
      {fields.flatMap(field => {
        const names = field.kind === 'formula' ? [field.name] : field.captures.map(capture => capture.name);
        return names.map(name => (
          <CalculatedChip
            key={name}
            name={name}
            field={field}
            t={t}
            filter={filter}
            group={group}
            edit={edit}
            remove={remove}
          />
        ));
      })}
    </div>
  );
}

function filterCalculated(submission: ExploreSubmissionViewModel, query: string, name: string) {
  submission.updateField({ field: 'query', value: appendStructuredClause(query, `#${name}:*`) });
  submission.submit();
}

function CalculatedChip({
  name,
  field,
  t,
  filter,
  group,
  edit,
  remove
}: {
  name: string;
  field: LogCalculatedV2['fields'][number];
  t: TFunction;
  filter: (name: string) => void;
  group: (name: string) => void;
  edit: (id: string) => void;
  remove: (id: string) => void;
}) {
  return (
    <Tag
      closable
      className={styles.tag ?? ''}
      onClose={event => {
        event.stopPropagation();
        event.preventDefault();
        remove(field.id);
      }}
    >
      <Dropdown
        autoFocus
        trigger={['click']}
        menu={{
          items: [
            { key: 'filter', label: t('explore.logCalculatedV2.filterBy') },
            { key: 'group', label: t('explore.logCalculatedV2.groupBy') },
            { key: 'edit', label: t('common.edit') },
            { key: 'delete', label: t('common.delete') }
          ],
          onClick: ({ key }) => {
            if (key === 'filter') filter(name);
            if (key === 'group') group(name);
            if (key === 'edit') edit(field.id);
            if (key === 'delete') remove(field.id);
          }
        }}
      >
        <Button type="text" className={styles.tagAction ?? ''} aria-label={`#${name}`}>
          #{name}
        </Button>
      </Dropdown>
    </Tag>
  );
}
