/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useState } from 'react';
import type { TFunction } from 'i18next';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import { ExploreMetricPlanEditor, type MetricPlanEditorProps } from './explore-metric-plan-editor';
import styles from './explore-metric-query-disclosure.module.css';

export function ExploreMetricQueryDisclosure({
  submission,
  metricEditor,
  t
}: {
  submission: ExploreSubmissionViewModel;
  metricEditor: MetricPlanEditorProps;
  t: TFunction;
}) {
  const { errors } = submission;
  const [disclosure, setDisclosure] = useState({ errors, open: true });
  if (errors !== disclosure.errors) {
    setDisclosure({ errors, open: Object.keys(errors).length > 0 || disclosure.open });
  }
  return (
    <details
      className={styles.disclosure}
      open={disclosure.open}
      onToggle={event => setDisclosure({ errors, open: event.currentTarget.open })}
    >
      <summary>{t('explore.metricComposition.editor')}</summary>
      <ExploreMetricPlanEditor {...metricEditor} />
    </details>
  );
}
