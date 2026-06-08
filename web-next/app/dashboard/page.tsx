import React from 'react';
import DashboardDraftWorkspace from './dashboard-draft-workspace';
import type { SearchParamsRecord } from '../../lib/dashboard/navigation';

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = await searchParams;
  return <DashboardDraftWorkspace initialContext={resolvedSearchParams || {}} />;
}
