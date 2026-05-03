'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { PublicStatusShell } from '../../components/pages/public-status-shell';
import { useI18n } from '../../components/providers/i18n-provider';
import { ClientWorkbench } from '../../components/workbench/client-workbench';
import { apiMessageGet } from '../../lib/api-client';
import { formatTime } from '../../lib/format';
import { loadStatusPageData, loadStatusPageIncidentFeed } from '../../lib/status-center/controller';
import {
  statusIncidentPublicStartAtLabel,
  statusIncidentPublicUpdateAtLabel,
  statusPageLabel,
  statusPublicPoweredByLabel,
  statusPublicThirtyDayLabel,
  statusPublicTodayLabel,
  statusPublicToComponentLabel,
  statusPublicToIncidentLabel,
  statusPublicYearLabel,
  statusPublicUptimeLabel
} from '../../lib/status-center/display';
import { buildStatusBrand, buildStatusComponentHistoryRows, buildStatusIncidentCards, clampStatusIncidentYear } from '../../lib/status-center/view-model';
import type { StatusPageComponent, StatusPageIncident, StatusPageOrg } from '../../lib/types';

type StatusPageData = {
  org: StatusPageOrg;
  components: StatusPageComponent[];
  incidents: StatusPageIncident[];
  incidentsError?: string | null;
};

function StatusPublicSurface({ data }: { data: StatusPageData }) {
  const { t, locale, locales, setLocale } = useI18n();
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [mode, setMode] = useState<'component' | 'incident'>('component');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [incidentReloadToken, setIncidentReloadToken] = useState(0);
  const [incidentFeed, setIncidentFeed] = useState(data.incidents);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [incidentError, setIncidentError] = useState<string | null>(data.incidentsError ?? null);

  const brand = useMemo(() => buildStatusBrand(data.org, t, formatTime), [data.org, t]);
  const componentCards = useMemo(() => buildStatusComponentHistoryRows(data.components, t, formatTime), [data.components, t]);
  const incidentCards = useMemo(() => buildStatusIncidentCards(incidentFeed, t, formatTime), [incidentFeed, t]);

  useEffect(() => {
    let active = true;

    if (selectedYear === currentYear && incidentReloadToken === 0) {
      setIncidentFeed(data.incidents);
      setIncidentLoading(false);
      setIncidentError(data.incidentsError ?? null);
      return () => {
        active = false;
      };
    }

    setIncidentLoading(true);
    setIncidentError(null);

    loadStatusPageIncidentFeed(apiMessageGet, {
      selectedYear,
      currentYear,
      reloadToken: incidentReloadToken,
      initialIncidents: data.incidents
    })
      .then(result => {
        if (!active) return;
        setIncidentFeed(result);
      })
      .catch(error => {
        if (!active) return;
        setIncidentError(error instanceof Error ? error.message : t('common.load-failed'));
      })
      .finally(() => {
        if (active) {
          setIncidentLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentYear, data.incidents, data.incidentsError, incidentReloadToken, selectedYear, t]);

  return (
    <PublicStatusShell
      pageLabel={statusPageLabel(t)}
      mode={mode}
      onModeChange={setMode}
      brand={brand}
      locale={locale}
      locales={locales}
      onSelectLocale={setLocale}
      componentCards={componentCards}
      componentEmptyTitle={t('status.components.empty.title')}
      componentEmptyCopy={t('status.components.empty.copy')}
      componentWindowStartLabel={statusPublicTodayLabel(t)}
      componentWindowEndLabel={statusPublicThirtyDayLabel(t)}
      incidentTitle={statusPublicToIncidentLabel(t)}
      incidentCards={incidentCards}
      incidentLoading={incidentLoading}
      incidentError={incidentError}
      incidentEmptyTitle={t('status.incidents.empty.title')}
      incidentEmptyCopy={t('status.incidents.empty.copy')}
      loadingTitle={t('common.loading')}
      loadFailedTitle={t('common.load-failed')}
      selectedYear={selectedYear}
      currentYear={currentYear}
      onSelectedYearChange={nextYear => setSelectedYear(clampStatusIncidentYear(nextYear, currentYear))}
      onRefreshIncidents={() => setIncidentReloadToken(value => value + 1)}
      yearLabel={statusPublicYearLabel(t)}
      refreshLabel={t('common.refresh')}
      incidentStartLabel={statusIncidentPublicStartAtLabel(t)}
      incidentUpdateLabel={statusIncidentPublicUpdateAtLabel(t)}
      poweredByLabel={statusPublicPoweredByLabel(t)}
      toIncidentLabel={statusPublicToIncidentLabel(t)}
      toComponentLabel={statusPublicToComponentLabel(t)}
      uptimeLabel={statusPublicUptimeLabel(t)}
    />
  );
}

export default function StatusPage() {
  const { t } = useI18n();
  const load = React.useCallback(async (): Promise<StatusPageData> => {
    return loadStatusPageData(apiMessageGet);
  }, []);

  return (
    <ClientWorkbench load={load} loadingCopy={t('status.loading')}>
      {data => <StatusPublicSurface data={data as StatusPageData} />}
    </ClientWorkbench>
  );
}
