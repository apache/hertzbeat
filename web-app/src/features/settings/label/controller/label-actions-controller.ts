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

import { useNotification, type OpenNotificationParams } from '@refinedev/core';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { buildLabelDisplayName, buildLabelMonitorPath, type LabelRecord } from '../model/label-model';

export function useLabelActionsController() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notification = useNotification();
  const copyLabel = useCallback(async (record: LabelRecord) => {
    try {
      await navigator.clipboard.writeText(buildLabelDisplayName(record));
      notification.open?.(notice(t('labels.copySuccess'), 'success'));
    } catch {
      notification.open?.(notice(t('labels.copyFailed'), 'error'));
    }
  }, [notification, t]);

  const inspectLabel = useCallback((record: LabelRecord) => {
    void navigate(buildLabelMonitorPath(record));
  }, [navigate]);

  return { copyLabel, inspectLabel };
}

function notice(message: string, type: OpenNotificationParams['type']): OpenNotificationParams {
  return { message, type };
}
