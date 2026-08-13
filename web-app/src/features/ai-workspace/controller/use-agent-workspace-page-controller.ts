/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { useSession } from '@/core/auth/session-context';

import { deriveAgentTargetFromLocation } from '../model/agent-workspace-context';
import { useAgentProviderController } from './use-agent-provider-controller';
import { useAgentWorkspaceController } from './use-agent-workspace-controller';

export function useAgentWorkspacePageController() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const { session } = useSession();
  const [providersOpen, setProvidersOpen] = useState(false);
  const isAdmin = session?.roles.includes('ADMIN') ?? false;
  const workspace = useAgentWorkspaceController({
    target: deriveAgentTargetFromLocation(location),
    language: i18n.resolvedLanguage
  });
  const providers = useAgentProviderController(isAdmin && providersOpen);
  return {
    workspace,
    providers,
    providersOpen,
    isAdmin,
    openProviders: () => setProvidersOpen(true),
    closeProviders: () => setProvidersOpen(false)
  };
}
