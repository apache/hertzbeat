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

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { OperationalPage, OperationalPageHeader } from '@/shared/operational-page';

import { DashboardStart } from '../components/dashboard-start';
import { DashboardActivity } from '../components/dashboard-activity';
import styles from '../components/dashboard-activity.module.css';
import { useDashboardStartController } from '../controller/use-dashboard-start-controller';

export function DashboardPage() {
  const { t } = useTranslation();
  const start = useDashboardStartController();
  return (
    <OperationalPage>
      <OperationalPageHeader
        title={t(start.activity.firstUse ? 'dashboard.start.title' : 'dashboard.daily.title')}
        description={t(start.activity.firstUse ? 'dashboard.start.description' : 'dashboard.daily.description')}
        actions={<Link to={start.savedQueriesTarget}>{t('exploreSaved.directory')}</Link>}
      />
      {start.activity.firstUse ? (
        <>
          <Link to={start.activity.targets.signals}>{t('dashboard.daily.openSignals')}</Link>
          <DashboardStart {...start} />
        </>
      ) : (
        <>
          <DashboardActivity activity={start.activity} />
          <details className={styles.intake}>
            <summary>{t('dashboard.daily.addData')}</summary>
            <DashboardStart {...start} />
          </details>
        </>
      )}
    </OperationalPage>
  );
}
