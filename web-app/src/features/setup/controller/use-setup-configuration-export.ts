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

import { useCallback, useRef, useState } from 'react';

import { exportSetupConfiguration } from '../api/setup-api';
import type { SetupApplyMode, SetupPhase } from '../model/setup-contract';
import {
  createExportRequest,
  type SetupConfigurationDraft,
  type SetupExportFormat
} from '../model/setup-configuration';
import type { SetupRequestFailure } from '../model/setup-configuration-state';
import type { SetupConfigurationAcknowledgement } from '../model/setup-responses';
import { downloadSetupArtifact } from './setup-download';
import { classifySetupRequestFailure } from './setup-request-failure';
import type { SetupWriteBoundary } from './use-setup-write-boundary';

export function useSetupConfigurationExport(
  acknowledgement: SetupConfigurationAcknowledgement | null,
  draft: SetupConfigurationDraft,
  expectedPhase: SetupPhase,
  applyMode: SetupApplyMode,
  startWrite: SetupWriteBoundary
) {
  const [exporting, setExporting] = useState(false);
  const [exportFailure, setExportFailure] = useState<SetupRequestFailure | null>(null);
  const exportPending = useRef(false);
  const canExport = acknowledgement?.state === 'awaiting_external_apply' && acknowledgement.exportAvailable;
  const exportConfiguration = useCallback(
    async (format: SetupExportFormat) => {
      if (!canExport || exporting || exportPending.current) return;
      const write = startWrite();
      exportPending.current = true;
      setExporting(true);
      setExportFailure(null);
      try {
        const artifact = await exportSetupConfiguration(
          createExportRequest(format, expectedPhase, applyMode, draft),
          write.signal
        );
        if (!write.signal.aborted) downloadSetupArtifact(artifact);
      } catch (error) {
        if (!write.signal.aborted) setExportFailure(classifySetupRequestFailure(error));
      } finally {
        write.release();
        exportPending.current = false;
        if (!write.signal.aborted) setExporting(false);
      }
    },
    [applyMode, canExport, draft, expectedPhase, exporting, startWrite]
  );
  return { canExport, exporting, exportFailure, exportConfiguration };
}
