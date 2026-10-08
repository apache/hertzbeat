/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import { Select } from 'antd';
import type { LogAnalysisState } from '@/platform/perses';
import type { ExactTimeWindow } from '@/shared/query-context';
import { ExploreLogComparisonFacetWindow } from './explore-log-comparison-windows';
import styles from './explore-log-comparison-editor.module.css';
// eslint-disable-next-line complexity -- selector and source-specific state hints belong together.
export function ExploreLogFacetSourceControls({
  current,
  source,
  window,
  timeZone,
  draftSyntax,
  targets,
  targetSyntax,
  onTarget,
  t
}: {
  current: LogAnalysisState['comparison'];
  source: string;
  window: ExactTimeWindow | undefined;
  timeZone: string | undefined;
  draftSyntax: string | undefined;
  targets?: { value: string; label: string }[] | undefined;
  targetSyntax?: string | undefined;
  onTarget: (source: string) => void;
  t: TFunction;
}) {
  if (!current && !targets?.length) return null;
  const options = targets ?? [
    { value: 'a', label: 'a' },
    { value: 'b', label: 'b' }
  ];
  return (
    <>
      <label className={styles.target}>
        {t('explore.logComparison.facetTarget')}{' '}
        <Select<string>
          aria-label={t('explore.logComparison.facetTarget')}
          value={source}
          onChange={value => onTarget(value)}
          options={options}
        />
      </label>
      {(targetSyntax ?? (source === 'a' ? draftSyntax : current?.searchSyntax)) !== 'structured-v1' && (
        <p>{t('explore.logComparison.structuredFacets')}</p>
      )}
      {window && !targets?.length && (source === 'a' || source === 'b') && (
        <ExploreLogComparisonFacetWindow window={window} source={source} timeZone={timeZone} t={t} />
      )}
    </>
  );
}
