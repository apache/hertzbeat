/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
