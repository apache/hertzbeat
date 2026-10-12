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

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import type { DashboardPanelRuntimeProps } from '../model/dashboard-panel-runtime-model';
export function DashboardPanelActions({
  actions,
  loading,
  failed
}: {
  actions: NonNullable<DashboardPanelRuntimeProps['actions']>;
  loading: boolean;
  failed: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <Button size="small" onClick={loading ? actions.cancel : actions.retry}>
        {t(loading ? 'common.cancel' : failed || actions.cancelled ? 'signalDashboard.retryPanel' : 'common.refresh')}
      </Button>
    </div>
  );
}
