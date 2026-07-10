import React from 'react';

import EntityDetailPage from './entity-detail-page';
import {
  readEntityDetailCreatedResult,
  readEntityDetailRouteContext,
  readEntityDetailUpdatedResult,
  type EntityDetailSearchParams
} from '../../../lib/entity-detail/query-state';

export default async function EntityDetailRoutePage({
  params,
  searchParams
}: {
  params: Promise<{ entityId: string }>;
  searchParams?: Promise<EntityDetailSearchParams>;
}) {
  const { entityId } = await params;
  const resolvedSearchParams = await searchParams;
  const routeContext = readEntityDetailRouteContext(resolvedSearchParams);
  const createdResult = readEntityDetailCreatedResult(resolvedSearchParams);
  const updatedResult = readEntityDetailUpdatedResult(resolvedSearchParams);
  return <EntityDetailPage entityId={entityId} routeContext={routeContext} createdResult={createdResult} updatedResult={updatedResult} />;
}
