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

import type { TFunction } from 'i18next';
import type { ExploreSubmissionViewModel, LogExploreSubmissionDraft } from '../model/explore-submission-model';
import { TextAreaField } from './explore-log-query-fields';
import styles from './explore-log-query-builder.module.css';

export function LogFilterCode({
  draft,
  t,
  updateField,
  hasLosslessError
}: Pick<ExploreSubmissionViewModel, 'updateField'> & {
  draft: LogExploreSubmissionDraft;
  t: TFunction;
  hasLosslessError: boolean;
}) {
  return (
    <div className={styles.codeGrid} data-log-filter-code>
      <TextAreaField
        label={t('explore.logQueryBuilder.resourceCode')}
        placeholder={t('explore.logQueryBuilder.resourceCodeExample')}
        value={draft.resourceFilter}
        invalid={false}
        onChange={value => updateField({ field: 'resourceFilter', value })}
      />
      <TextAreaField
        label={t('explore.logQueryBuilder.attributeCode')}
        placeholder={t('explore.logQueryBuilder.attributeCodeExample')}
        value={draft.attributeFilter}
        invalid={false}
        onChange={value => updateField({ field: 'attributeFilter', value })}
      />
      <p>{t('explore.logQueryBuilder.grammarHelp')}</p>
      {hasLosslessError && <p role="status">{t('explore.logQueryBuilder.losslessError')}</p>}
    </div>
  );
}
