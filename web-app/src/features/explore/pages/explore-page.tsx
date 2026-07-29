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

import { useTranslation } from 'react-i18next';

import { ExploreQueryBar } from '../components/explore-query-bar';
import { ExploreWorkbench } from '../components/explore-workbench';
import { useExplorePageController } from '../controller/use-explore-page-controller';
import styles from './explore-page.module.css';
import { ExploreResultPanel } from './explore-result-panel';

export function ExplorePage() {
  const { t } = useTranslation();
  const controller = useExplorePageController();
  return (
    <div className={styles.page}>
      <ExploreWorkbench
        query={controller.query}
        t={t}
        updateQuery={controller.updateQuery}
        refresh={controller.refresh}
        time={controller.time}
      />
      <ExploreQueryBar
        query={controller.query}
        t={t}
        updateQuery={controller.updateManualQuery}
        submission={controller.submission}
      />
      <ExploreResultPanel
        query={controller.query}
        result={controller.result}
        retry={controller.refresh}
        openPath={controller.openPath}
      />
    </div>
  );
}
