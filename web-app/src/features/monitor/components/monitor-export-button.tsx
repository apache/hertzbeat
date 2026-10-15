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

import { Button, Dropdown } from 'antd';
import { useTranslation } from 'react-i18next';

import { monitorExportFormats, type MonitorExportFormat } from '../model/monitor-export-model';

export function MonitorExportButton({
  label,
  disabled,
  onExport
}: {
  label: string;
  disabled: boolean;
  onExport: (format: MonitorExportFormat) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  return (
    <Dropdown
      menu={{
        items: monitorExportFormats.map(format => ({
          key: format,
          label: t(`monitor.export.format.${format.toLowerCase()}`)
        })),
        onClick: item => {
          const format = monitorExportFormats.find(candidate => candidate === item.key);
          if (format) void onExport(format);
        }
      }}
      trigger={['click']}
      disabled={disabled}
    >
      <Button disabled={disabled}>{label}</Button>
    </Dropdown>
  );
}
