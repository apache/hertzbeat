import React from 'react';

import EntityDefinitionPage from './entity-definition-page';

export default async function EntityDefinitionRoutePage({ params }: { params: Promise<{ entityId: string }> }) {
  const { entityId } = await params;
  return <EntityDefinitionPage entityId={entityId} />;
}
