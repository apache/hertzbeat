/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Popover, Space, Tag, Typography } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import type { CollectorRuntimeReport, CollectorRuntimeSourceReport } from '../model/collector-runtime-report-model';

import styles from './collector-runtime-report-facts.module.css';

export function CollectorRuntimeReportFacts({ report }: { report: CollectorRuntimeReport | null }) {
  const { t } = useTranslation();
  if (!report) return <Tag>{t('collectors.runtime.report.notReported')}</Tag>;
  const sourceCounts = countSources(report.sources);
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
      {report.sources.length > 0 && (
        <>
          <Typography.Text type="secondary">
            {t('collectors.runtime.report.sourceSummary', {
              count: report.sources.length,
              active: sourceCounts.ACTIVE,
              desired: sourceCounts.DESIRED,
              rejected: sourceCounts.REJECTED
            })}
          </Typography.Text>
          <Popover
            destroyOnHidden
            placement="bottomRight"
            trigger="click"
            content={
              <div
                className={styles.sourceList}
                role="list"
                aria-label={t('collectors.runtime.report.sourceListLabel')}
              >
                {report.sources.map(source => (
                  <div className={styles.sourceListItem} key={`${source.type}:${source.name}`} role="listitem">
                    <Typography.Text type="secondary">{sourceFact(source, t)}</Typography.Text>
                  </div>
                ))}
              </div>
            }
          >
            <Button type="link" size="small">
              {t('collectors.runtime.report.viewSources', { count: report.sources.length })}
            </Button>
          </Popover>
        </>
      )}
    </Space>
  );
}

function countSources(sources: CollectorRuntimeSourceReport[]) {
  const counts: Record<CollectorRuntimeSourceReport['state'], number> = { ACTIVE: 0, DESIRED: 0, REJECTED: 0 };
  for (const source of sources) counts[source.state] += 1;
  return counts;
}

function sourceFact(source: CollectorRuntimeSourceReport, t: TFunction) {
  return t('collectors.runtime.report.source', {
    type: t(`collectors.runtime.report.sourceType.${source.type}`),
    name: source.name,
    state: t(`collectors.runtime.report.sourceState.${source.state}`),
    revision: source.revision
  });
}

function formatReportTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(Date.parse(value));
}
