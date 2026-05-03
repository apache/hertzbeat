'use client';

import React from 'react';
import { EntityDefinitionWorkspaceSurface } from './entity-definition-workspace-surface';
import type { EntityDefinitionActivity, EntityDefinitionWorkspaceTemplate } from '@/lib/types';

type EntityImportSurfaceProps = {
  activities: EntityDefinitionActivity[];
  templates: EntityDefinitionWorkspaceTemplate[];
};

export function EntityImportSurface({ activities, templates }: EntityImportSurfaceProps) {
  return <EntityDefinitionWorkspaceSurface mode="import" activities={activities} templates={templates} />;
}
