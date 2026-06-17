import React from 'react';

import EntityListPage from './entity-list-page';
import { readEntityListQueryState, type EntityListSearchParams } from '../../lib/entity-manage/query-state';

export default async function EntitiesRoutePage({
  searchParams
}: {
  searchParams?: Promise<EntityListSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const initialQuery = readEntityListQueryState(resolvedSearchParams);
  return <EntityListPage initialQuery={initialQuery} />;
}
