import React from 'react';

import EntityImportPage from './entity-import-page';
import { createCompatSearchParamReader } from '../../../lib/compat/search-params';
import { readEntityDetailRouteContext, type EntityDetailSearchParams } from '../../../lib/entity-detail/query-state';

export default async function EntityImportRoutePage({
  searchParams
}: {
  searchParams?: Promise<EntityDetailSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const routeContext = readEntityDetailRouteContext(resolvedSearchParams);
  const reader = createCompatSearchParamReader(resolvedSearchParams);
  return (
    <EntityImportPage
      deletedEntity={reader.get('deletedEntity')}
      deleteResult={reader.get('deleteResult') === 'success' ? 'success' : null}
      routeContext={routeContext}
    />
  );
}
