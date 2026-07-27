/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { CollectorRuntimeReport } from '../model/collector-runtime-report-model';

export function CollectorRuntimeReportFacts({ report }: { report: CollectorRuntimeReport | null }) {
  const { t } = useTranslation();
  if (!report) return <Tag>{t('collectors.runtime.report.notReported')}</Tag>;
  return (
    <Space direction="vertical" size={0}>
      <Tag>{t(`collectors.runtime.report.state.${report.state}`)}</Tag>
      <Typography.Text type="secondary">
        {t('collectors.runtime.report.revisions', {
          desiredRevision: report.desiredRevision,
          activeRevision: report.activeRevision
        })}
      </Typography.Text>
      <Typography.Text type="secondary">
        {t('collectors.runtime.report.reportedAt', { time: formatReportTime(report.reportedAt) })}
      </Typography.Text>
      {report.failureCode !== 'NONE' && (
        <Typography.Text type="secondary">
          {t('collectors.runtime.report.failure', { failureCode: report.failureCode })}
        </Typography.Text>
      )}
    </Space>
  );
}

function formatReportTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(Date.parse(value));
}
