/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { INSTRUMENTATION_SCHEMA_VERSION } from '../model/instrumentation-contract';
import type { InstrumentationFlowDraft } from '../model/instrumentation-flow';
import { buildDetectionRequest } from '../model/instrumentation-requests';
import { useInstrumentationDetectionController } from './use-instrumentation-detection-controller';

type ContractErrorHandler = (error: unknown) => Promise<boolean>;

/** Binds detection polling and navigation to the complete setup identity. */
export function useInstrumentationPageDetection(
  draft: InstrumentationFlowDraft,
  handleContractError: ContractErrorHandler
) {
  const createRequest = useCallback((startedAt: number) => buildDetectionRequest(draft, startedAt), [draft]);
  const requestIdentity = useMemo(() => detectionRequestIdentity(draft), [draft]);
  const navigate = useNavigate();
  const openPath = useCallback(
    (path: string) => {
      void navigate(path);
    },
    [navigate]
  );
  return useInstrumentationDetectionController(createRequest, handleContractError, openPath, requestIdentity);
}

function detectionRequestIdentity(draft: InstrumentationFlowDraft) {
  const selection = draft.selection;
  return JSON.stringify([
    INSTRUMENTATION_SCHEMA_VERSION,
    selection?.language,
    selection?.framework,
    selection?.method,
    draft.environment,
    draft.platform,
    draft.collectorId,
    draft.serviceName,
    draft.serviceNamespace,
    draft.serviceEnvironment,
    draft.serviceInstanceId,
    draft.endpoint
  ]);
}
