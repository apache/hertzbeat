import React from 'react';

import EntityEditPage from './entity-edit-page';

export default async function EntityEditRoutePage({ params }: { params: Promise<{ entityId: string }> }) {
  const { entityId } = await params;
  return <EntityEditPage entityId={entityId} />;
}
