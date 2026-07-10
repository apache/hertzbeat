import React from 'react';

import { readSettingStatusMode, type SettingStatusSearchParams } from '@/lib/setting-status/query-state';
import SettingStatusPage from './setting-status-page';

type SettingStatusRoutePageProps = {
  searchParams?: Promise<SettingStatusSearchParams>;
};

export default async function SettingStatusRoutePage({ searchParams }: SettingStatusRoutePageProps) {
  const resolvedSearchParams = await searchParams;
  return <SettingStatusPage initialMode={readSettingStatusMode(resolvedSearchParams)} />;
}
