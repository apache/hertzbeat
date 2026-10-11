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

import type { ExploreQuery } from '../model/explore-model';
import { exploreInvestigationRoute } from '../model/explore-investigation-model';
import styles from './explore-workflow-guide.module.css';

export function ExploreWorkflowGuide({ query, t }: { query: ExploreQuery; t: TFunction }) {
  const route = exploreInvestigationRoute(query);
  if (route.kind === 'trace' || route.kind === 'log') return null;
  return (
    <details className={styles.guide} key={query.signal}>
      <summary>{t('explore.workflowGuide.summary')}</summary>
      <p className={styles.states}>{t('explore.description')}</p>
      <ol className={styles.steps}>
        <li>{t(`explore.novice.${query.signal}.query`)}</li>
        <li>{t(`explore.novice.${query.signal}.inspect`)}</li>
        <li>{t('explore.workflowGuide.save')}</li>
      </ol>
      <p className={styles.states}>{t(`explore.novice.${query.signal}.meaning`)}</p>
      {query.signal === 'logs' && <p className={styles.states}>{t('explore.workflowGuide.logs.bodySearch')}</p>}
      <p className={styles.states}>{t('explore.workflowGuide.states')}</p>
    </details>
  );
}
