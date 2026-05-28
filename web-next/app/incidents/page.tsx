import React from 'react';
import IncidentsPage from './incidents-page';
import { readIncidentWorkbenchQuery, type IncidentWorkbenchSearchParams } from '../../lib/incidents-surface/controller';

export default async function IncidentsRoutePage({
  searchParams
}: {
  searchParams?: Promise<IncidentWorkbenchSearchParams>;
} = {}) {
  const resolvedSearchParams = await searchParams;
  const initialQuery = readIncidentWorkbenchQuery(resolvedSearchParams);
  return <IncidentsPage initialQuery={initialQuery} />;
}
