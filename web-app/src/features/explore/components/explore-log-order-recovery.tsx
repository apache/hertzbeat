/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import type { ExploreQuery } from '../model/explore-query';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import { validLogSort } from '../model/explore-log-order';
import { logOrderControls } from '../model/explore-log-order-controls';
import { ExploreLogOrderControls } from './explore-log-order';
export function ExploreLogOrderRecovery({
  query,
  submission,
  t
}: {
  query: ExploreQuery;
  submission: ExploreSubmissionViewModel;
  t: TFunction;
}) {
  if (query.signal !== 'logs' || validLogSort(query.logSort, query.sort)) return null;
  return (
    <div role="alert">
      <p>{t('explore.logSort.invalid')}</p>
      <ExploreLogOrderControls query={query} controls={logOrderControls(query, submission)} t={t} />
    </div>
  );
}
