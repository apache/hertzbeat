/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
