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
import type { validateMetricPlan } from '@/platform/perses';
import styles from './explore-metric-plan-editor.module.css';

export function MetricPlanIssues({ issues }: { issues: ReturnType<typeof validateMetricPlan> }) {
  const { t } = useTranslation();
  return issues.map((issue, index) => (
    <div
      role="alert"
      tabIndex={-1}
      data-metric-issue-ref={issue.row}
      data-metric-issue-field={issue.reason}
      className={styles.issue}
      key={`${issue.row}-${issue.reason}-${index}`}
    >
      {issue.row}: {t(`explore.metricComposition.errors.${issue.reason}`, { reference: issue.reference })}
    </div>
  ));
}
