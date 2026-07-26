/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, List, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { EntityNoiseControlRule, EntityNoiseControlSummary } from '../model/entity-contract';
import styles from './entity-view.module.css';

export function EntityNoiseControlEvidence({ summary }: { summary: EntityNoiseControlSummary }) {
  const { t } = useTranslation();
  const rules = [...summary.activeSilences, ...summary.matchingInhibits];
  return (
    <section className={styles.section} aria-label={t('entity.noiseControls.title')}>
      <Typography.Title level={4}>{t('entity.noiseControls.title')}</Typography.Title>
      <Typography.Paragraph type="secondary">
        {t('entity.noiseControls.summary', {
          silenceCount: summary.activeSilenceCount,
          inhibitCount: summary.matchingInhibitCount
        })}
      </Typography.Paragraph>
      {summary.possibleAlertSuppression ? (
        <Alert showIcon type="warning" message={t('entity.noiseControls.possibleSuppression')} />
      ) : null}
      {rules.length > 0 ? (
        <List size="small" dataSource={rules} renderItem={rule => <NoiseControlRuleItem rule={rule} />} />
      ) : (
        <Typography.Text type="secondary">{t('entity.noiseControls.none')}</Typography.Text>
      )}
    </section>
  );
}

function NoiseControlRuleItem({ rule }: { rule: EntityNoiseControlRule }) {
  const { t } = useTranslation();
  return (
    <List.Item>
      <Space wrap>
        <Tag>{t(`entity.noiseControls.types.${rule.type}`)}</Tag>
        <strong>{rule.name}</strong>
        {rule.global ? (
          <Tag>{t('entity.noiseControls.global')}</Tag>
        ) : (
          rule.matchedLabels.map(label => <Tag key={label}>{label}</Tag>)
        )}
      </Space>
    </List.Item>
  );
}
