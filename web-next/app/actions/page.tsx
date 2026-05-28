import React from 'react';
import ActionsPage from './actions-page';
import { readActionsSuggestionContext, type ActionsSearchParams } from '../../lib/actions-surface/query-state';

export default async function ActionsRoutePage({
  searchParams
}: {
  searchParams?: Promise<ActionsSearchParams>;
} = {}) {
  const resolvedSearchParams = await searchParams;
  const suggestionContext = readActionsSuggestionContext(resolvedSearchParams);
  return <ActionsPage suggestionContext={suggestionContext} />;
}
