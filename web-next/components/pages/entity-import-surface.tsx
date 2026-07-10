'use client';

import React from 'react';
import { EntityDefinitionWorkspaceSurface } from './entity-definition-workspace-surface';
import type { SignalRouteContext } from '@/lib/signal-route-context';
import type { EntityDefinitionActivity, EntityDefinitionWorkspaceTemplate } from '@/lib/types';

type EntityImportSurfaceProps = {
  activities: EntityDefinitionActivity[];
  initialMessage?: string | null;
  initialMessageTone?: 'success' | 'error';
  routeContext?: SignalRouteContext;
  templates: EntityDefinitionWorkspaceTemplate[];
};

export function EntityImportSurface({
  activities,
  initialMessage = null,
  initialMessageTone = 'error',
  routeContext,
  templates
}: EntityImportSurfaceProps) {
  return (
    <EntityDefinitionWorkspaceSurface
      mode="import"
      activities={activities}
      initialMessage={initialMessage}
      initialMessageTone={initialMessageTone}
      routeContext={routeContext}
      templates={templates}
    />
  );
}
