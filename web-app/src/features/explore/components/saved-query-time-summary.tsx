/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useTranslation } from 'react-i18next';
import type { ExploreQuery } from '../model/explore-query';
import { savedQueryWindowLabel } from '../model/explore-saved-query-view-model';
export function SavedQueryTimeSummary({ query }: { query: ExploreQuery }) {
  const { t } = useTranslation();
  if (query.signal === 'logs' && query.live)
    return <span title={t('explore.liveFlow.incoming')}>{t('explore.liveFlow.incomingHint')}</span>;
  return (
    <>
      {t(query.start == null ? 'exploreSaved.relative' : 'exploreSaved.absolute', {
        range: t(`explore.timeRanges.${query.timeRange}`),
        window: savedQueryWindowLabel(query),
        zone: query.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
      })}
    </>
  );
}
