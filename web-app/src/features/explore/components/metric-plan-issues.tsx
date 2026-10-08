/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
