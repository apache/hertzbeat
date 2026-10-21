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

import type { LogScopeSuggestions } from '../model/explore-log-scope-suggestions';
import type { TFunction } from 'i18next';
import type { ExploreSubmissionViewModel, LogExploreSubmissionDraft } from '../model/explore-submission-model';
import type { LogQueryBuilderViewModel } from '../model/explore-log-builder-model';
import { BuilderConditions } from './explore-log-query-conditions';
import { LogScopeFields, VisibilityFilters } from './explore-log-scope-fields';
import { LogFilterCode } from './explore-log-filter-code';
import styles from './explore-log-query-builder.module.css';

export type LogQueryEditorMode = 'builder' | 'code';
type Props = Pick<ExploreSubmissionViewModel, 'updateField'> & {
  draft: LogExploreSubmissionDraft;
  mode: LogQueryEditorMode;
  t: TFunction;
  editor: LogQueryBuilderViewModel;
  suggestions?: LogScopeSuggestions | undefined;
};
export function ExploreLogQueryBuilder({ draft, mode, t, updateField, editor, suggestions }: Props) {
  const { rows, lossless, valid, add, update, remove } = editor;
  return (
    <div className={styles.workspace}>
      {mode === 'builder' && !valid && (
        <p className={styles.validation} role="alert">
          {t('explore.perses.invalidBuilder')}
        </p>
      )}
      <LogScopeFields draft={draft} t={t} updateField={updateField} suggestions={suggestions} />

      {mode === 'builder' ? (
        <BuilderConditions
          rows={rows}
          t={t}
          add={add}
          update={update}
          remove={remove}
          emptyFooter={<VisibilityFilters compact draft={draft} t={t} updateField={updateField} />}
        />
      ) : (
        <LogFilterCode draft={draft} t={t} updateField={updateField} hasLosslessError={!lossless} />
      )}

      {(mode === 'code' || rows.length > 0) && <VisibilityFilters draft={draft} t={t} updateField={updateField} />}
    </div>
  );
}
