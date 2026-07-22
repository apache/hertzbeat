/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { buildAlertIntegrationPath } from '@/shared/navigation/app-paths';
import { settingsPaths } from '@/shared/settings/settings-routes';

import {
  alertIntegrationSources,
  buildAlertIngressContract,
  resolveAlertIntegrationSource,
  type AlertIntegrationCopyState,
  type AlertIntegrationSourceId
} from '../model/alert-integration-model';

export function useAlertIntegrationController() {
  const navigate = useNavigate();
  const sourceId = useParams<{ source: string }>().source ?? '';
  const source = resolveAlertIntegrationSource(sourceId);
  const contract = source ? buildAlertIngressContract(window.location.origin, source.id) : undefined;
  const [copyState, setCopyState] = useState<AlertIntegrationCopyState>(null);
  const copy = async (kind: 'endpoint' | 'authorization', value?: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyState({ target: kind, outcome: 'copied' });
    } catch {
      setCopyState({ target: kind, outcome: 'failed' });
    }
  };
  return {
    source,
    sources: alertIntegrationSources,
    contract,
    copyState,
    tokenSettingsPath: settingsPaths.tokens,
    actions: {
      selectSource: (next: AlertIntegrationSourceId) => {
        setCopyState(null);
        void navigate(buildAlertIntegrationPath(next));
      },
      openTokenSettings: () => navigate(settingsPaths.tokens),
      copyEndpoint: () => copy('endpoint', contract?.endpoint),
      copyAuthorizationHeader: () => copy('authorization', contract?.authorizationHeader)
    }
  };
}
