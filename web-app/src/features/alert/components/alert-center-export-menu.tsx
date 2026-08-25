/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { DownOutlined, DownloadOutlined } from '@ant-design/icons';
import { Button, DatePicker, Dropdown, Form, Modal, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AlertCenterExportRange } from '../model/alert-center-export-scope';
import styles from '../shared/alert-center.module.css';

type ExportScope = 'selected' | 'timeRange' | 'filtered' | 'all';
type DateRangeValue = [Dayjs | null, Dayjs | null] | null;

export function AlertCenterExportMenu({
  busy,
  exporting,
  exportAll,
  exportFiltered,
  exportSelected,
  exportTimeRange,
  selectedGroups
}: {
  busy: boolean;
  exporting: boolean;
  exportAll: () => unknown;
  exportFiltered: () => unknown;
  exportSelected: () => unknown;
  exportTimeRange: (range: AlertCenterExportRange) => Promise<boolean>;
  selectedGroups: readonly unknown[];
}) {
  const { t } = useTranslation();
  const [timeRangeOpen, setTimeRangeOpen] = useState(false);
  const disabled = busy || exporting;

  const chooseScope = (scope: string) => {
    if (scope === 'selected' && selectedGroups.length > 0) void exportSelected();
    if (scope === 'filtered') void exportFiltered();
    if (scope === 'all') void exportAll();
    if (scope === 'timeRange') setTimeRangeOpen(true);
  };

  return (
    <>
      <Dropdown
        disabled={disabled}
        trigger={['click']}
        menu={{
          items: exportScopes.map(scope => ({
            key: scope,
            label: t(`alert.export.${scope}`),
            disabled: scope === 'selected' && selectedGroups.length === 0
          })),
          onClick: ({ key }) => chooseScope(key)
        }}
      >
        <Button
          aria-label={t('alert.export.label')}
          className={styles.exportButton ?? ''}
          disabled={busy}
          loading={exporting}
          icon={<DownloadOutlined aria-hidden />}
        >
          {t('alert.export.label')}
          <DownOutlined aria-hidden className={styles.exportChevron} />
        </Button>
      </Dropdown>
      <AlertCenterExportRangeDialog
        open={timeRangeOpen}
        exporting={exporting}
        exportTimeRange={exportTimeRange}
        close={() => setTimeRangeOpen(false)}
      />
    </>
  );
}

function AlertCenterExportRangeDialog({
  close,
  exporting,
  exportTimeRange,
  open
}: {
  close: () => void;
  exporting: boolean;
  exportTimeRange: (range: AlertCenterExportRange) => Promise<boolean>;
  open: boolean;
}) {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<DateRangeValue>(null);
  const exportRange = async () => {
    const [start, end] = timeRange ?? [];
    if (!start || !end) return;
    const complete = await exportTimeRange({
      start: start.format('YYYY-MM-DD HH:mm:ss'),
      end: end.format('YYYY-MM-DD HH:mm:ss')
    });
    if (complete) close();
  };
  return (
    <Modal
      destroyOnHidden
      open={open}
      title={t('alert.export.timeRangeTitle')}
      okText={t('alert.export.confirm')}
      cancelText={t('common.cancel')}
      confirmLoading={exporting}
      okButtonProps={{ disabled: !timeRange?.[0] || !timeRange[1] }}
      onCancel={close}
      onOk={() => void exportRange()}
    >
      <Form className={styles.exportRangeForm} layout="vertical">
        <Form.Item label={t('alert.export.updatedTime')}>
          <DatePicker.RangePicker
            className={styles.exportRangePicker ?? ''}
            disabled={exporting}
            format="YYYY-MM-DD HH:mm:ss"
            showTime={{ format: 'HH:mm:ss' }}
            value={timeRange}
            onChange={range => setTimeRange(range)}
          />
        </Form.Item>
        <Typography.Text type="secondary">{t('alert.export.timeRangeHelp')}</Typography.Text>
      </Form>
    </Modal>
  );
}

const exportScopes: ExportScope[] = ['selected', 'timeRange', 'filtered', 'all'];
