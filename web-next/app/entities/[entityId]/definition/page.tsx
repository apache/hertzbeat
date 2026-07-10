import React from 'react';

import EntityDefinitionPage from './entity-definition-page';
import { readEntityDetailRouteContext, type EntityDetailSearchParams } from '../../../../lib/entity-detail/query-state';

export default async function EntityDefinitionRoutePage({
  params,
  searchParams
}: {
  params: Promise<{ entityId: string }>;
  searchParams?: Promise<EntityDetailSearchParams>;
}) {
  const { entityId } = await params;
  const resolvedSearchParams = await searchParams;
  const routeContext = readEntityDetailRouteContext(resolvedSearchParams);
  return <EntityDefinitionPage entityId={entityId} routeContext={routeContext} />;
}
