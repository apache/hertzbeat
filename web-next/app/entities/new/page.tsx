import React from 'react';

import EntityNewPage from './entity-new-page';
import { readEntityNewDraftSeed, type EntityNewSearchParams } from '../../../lib/entity-editor/query-state';

export default async function EntityNewRoutePage({
  searchParams
}: {
  searchParams?: Promise<EntityNewSearchParams>;
} = {}) {
  const resolvedSearchParams = await searchParams;
  const initialSeed = readEntityNewDraftSeed(resolvedSearchParams);
  return <EntityNewPage initialSeed={initialSeed} />;
}
