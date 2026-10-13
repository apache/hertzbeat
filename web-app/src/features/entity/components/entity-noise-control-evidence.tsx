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

import { Alert, Button, List, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalSection } from '@/shared/operational-page';

import type { EntityNoiseControlRule, EntityNoiseControlSummary } from '../model/entity-contract';
import type { EntityNoiseControlType } from '../model/entity-view-model';

export function EntityNoiseControlEvidence({
  summary,
  manage
}: {
  summary: EntityNoiseControlSummary;
  manage: (ruleType: EntityNoiseControlType) => void;
}) {
  const { t } = useTranslation();
  const rules = [...summary.activeSilences, ...summary.matchingInhibits];
  return (
    <OperationalSection
      title={t('entity.noiseControls.title')}
      description={t('entity.noiseControls.summary', {
        silenceCount: summary.activeSilenceCount,
        inhibitCount: summary.matchingInhibitCount
      })}
      actions={
        <Space>
          <Button size="small" onClick={() => manage('silence')}>
            {t('entity.noiseControls.manageSilences')}
          </Button>
          <Button size="small" onClick={() => manage('inhibit')}>
            {t('entity.noiseControls.manageInhibits')}
          </Button>
        </Space>
      }
    >
      {summary.possibleAlertSuppression ? (
        <Alert showIcon type="warning" message={t('entity.noiseControls.possibleSuppression')} />
      ) : null}
      {rules.length > 0 ? (
        <List size="small" dataSource={rules} renderItem={rule => <NoiseControlRuleItem rule={rule} />} />
      ) : (
        <Typography.Text type="secondary">{t('entity.noiseControls.none')}</Typography.Text>
      )}
    </OperationalSection>
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
