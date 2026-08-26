/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { AccessTokenGenerationDraft } from '@/shared/access-token/access-token-generation-model';

import type { InstrumentationConfigurePhase } from '../model/instrumentation-guided-flow';
import type { IntakeProfilesResponse, ServiceIdentity } from '../model/instrumentation-v2-contract';

export type ConfigureStepProps = {
  phase: InstrumentationConfigurePhase;
  profiles: IntakeProfilesResponse;
  profileId: string;
  service: ServiceIdentity;
  platform?: string | undefined;
  platformOptions: string[];
  canRender: boolean;
  rendering: boolean;
  renderError: boolean;
  token: string;
  tokenDraft?: AccessTokenGenerationDraft | undefined;
  tokenGenerating: boolean;
  tokenError: boolean;
  tokenAcknowledgementRequired: boolean;
  requiresToken: boolean;
  canGenerateToken: boolean;
  onProfile: (intakeProfileId: string) => void;
  onService: (patch: Partial<ServiceIdentity>) => void;
  onPlatform: (platform: string) => void;
  onToken: (token: string) => void;
  onRender: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onOpenToken: () => void;
  onCloseToken: () => void;
  onTokenDraft: (draft: AccessTokenGenerationDraft) => void;
  onGenerateToken: () => void;
  onAcknowledgeToken: () => void;
};
