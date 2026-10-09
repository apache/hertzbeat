/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ComponentProps, ReactNode } from 'react';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import type { ExploreTimeControl } from './explore-time-control';
import { ExploreAdvancedFilters, ExploreGuidedFilters } from './explore-advanced-filters';
import styles from './explore-metric-query-controls.module.css';
import { ExploreQueryRow } from './explore-query-row';

export function ExploreMetricQueryControls(
  props: ComponentProps<typeof ExploreTimeControl> &
    Pick<ExploreSubmissionViewModel, 'draft' | 'updateField'> & { actions?: ReactNode }
) {
  const { draft, updateField, t } = props;
  return (
    <div className={styles.commonControls} data-hb-operational-command-bar>
      <ExploreQueryRow className={styles.scopeRow}>
        <span className={styles.globalScope} data-metric-global-scope>
          {t('explore.metricComposition.globalScope')}
        </span>
        <ExploreGuidedFilters draft={draft} errors={{}} updateField={updateField} t={t} metricRows />
        <ExploreAdvancedFilters draft={draft} errors={{}} updateField={updateField} t={t} metricRows />
        <div className={styles.executionActions}>{props.actions}</div>
      </ExploreQueryRow>
    </div>
  );
}
