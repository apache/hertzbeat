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

import { Select } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  defaultMonitorDetailRefreshSeconds,
  monitorDetailRefreshChoices,
  type MonitorDetailRefreshChoice,
  type MonitorDetailRefreshSeconds
} from '../model/monitor-detail-model';

export function MonitorRefreshSelect({
  value,
  onChange
}: {
  value: MonitorDetailRefreshSeconds;
  onChange: (value: MonitorDetailRefreshChoice) => void;
}) {
  const { t } = useTranslation();
  return (
    <Select<MonitorDetailRefreshSeconds>
      aria-label={t('monitorMetrics.autoRefresh.label')}
      value={value}
      onChange={selected => {
        if (selected !== defaultMonitorDetailRefreshSeconds) onChange(selected);
      }}
      options={refreshOptions(value, t)}
    />
  );
}

function refreshOptions(selected: MonitorDetailRefreshSeconds, t: ReturnType<typeof useTranslation>['t']) {
  const choices = monitorDetailRefreshChoices.map(value => ({
    value,
    label: value === 0 ? t('monitorMetrics.autoRefresh.off') : t('monitorMetrics.autoRefresh.seconds', { count: value })
  }));
  if (selected !== defaultMonitorDetailRefreshSeconds) return choices;
  return [
    {
      value: defaultMonitorDetailRefreshSeconds,
      label: t('monitorMetrics.autoRefresh.seconds', { count: defaultMonitorDetailRefreshSeconds }),
      disabled: true
    },
    ...choices
  ];
}
