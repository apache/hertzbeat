import React from 'react';

import EntityEditPage from './entity-edit-page';
import { readEntityDetailRouteContext, type EntityDetailSearchParams } from '../../../../lib/entity-detail/query-state';

export default async function EntityEditRoutePage({
  params,
  searchParams
}: {
  params: Promise<{ entityId: string }>;
  searchParams?: Promise<EntityDetailSearchParams>;
}) {
  const { entityId } = await params;
  const resolvedSearchParams = await searchParams;
  const routeContext = readEntityDetailRouteContext(resolvedSearchParams);
  return <EntityEditPage entityId={entityId} routeContext={routeContext} />;
}
