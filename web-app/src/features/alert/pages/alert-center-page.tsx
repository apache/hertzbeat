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

import { Button, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { AlertManagementNav } from '../components/alert-management-nav';
import styles from '../shared/alert-center.module.css';
import { AlertCenterResults } from '../components/alert-center-results';
import { AlertCenterRecovery } from '../components/alert-center-recovery';
import { AlertCenterSummary } from '../components/alert-center-summary';
import { AlertCenterToolbar } from '../components/alert-center-toolbar';
import { useAlertCenterController } from '../controller/use-alert-center-controller';

export function AlertCenterPage() {
  const { t } = useTranslation();
  const controller = useAlertCenterController();
  const { command, draft, list, query, recovery, refreshing, summary } = controller.state;
  const busy = command !== 'idle' || recovery !== null;

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('alert.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('alert.description')}</Typography.Text>
        </div>
        <Button
          onClick={() => {
            void controller.manageRules();
          }}
        >
          {t('alertRules.manage')}
        </Button>
      </header>
      <AlertManagementNav />
      <AlertCenterToolbar
        disabled={busy}
        draft={draft}
        query={query}
        refreshing={refreshing}
        onDraftChange={controller.setDraft}
        onSubmit={controller.submitFilters}
        onStatusChange={controller.changeStatus}
        onSeverityChange={controller.changeSeverity}
        onRefresh={controller.refresh}
      />
      <AlertCenterSummary state={summary} retry={controller.retrySummary} />
      <AlertCenterRecovery recovery={recovery} retrying={command === 'recovering'} retry={controller.retryDelete} />
      <AlertCenterResults
        busy={busy}
        state={list}
        pageIndex={query.pageIndex}
        pageSize={query.pageSize}
        onPageChange={controller.changePage}
        onRemove={controller.remove}
        retry={controller.retryList}
      />
    </div>
  );
}
