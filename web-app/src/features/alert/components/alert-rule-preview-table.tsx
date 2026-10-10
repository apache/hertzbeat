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

import { Alert, Table } from 'antd';
import { useTranslation } from 'react-i18next';

import styles from '../shared/alert-rule-editor.module.css';
import {
  alertRulePreviewColumns,
  alertRulePreviewHasPresentationTruncation,
  alertRulePreviewPageSize,
  formatAlertRulePreviewValue,
  type AlertRulePreview,
  type AlertRulePreviewRow
} from '../model/alert-rule-model';

type PreviewTableRow = { key: string; values: AlertRulePreviewRow };

export function AlertRulePreviewTable({ evidence }: { evidence: AlertRulePreview }) {
  const { t } = useTranslation();
  const rows = evidence.rows.map((values, index) => ({ key: String(index), values }));
  const columns = alertRulePreviewColumns(evidence.rows);
  return (
    <div className={styles.previewEvidence}>
      {alertRulePreviewHasPresentationTruncation(evidence) ? (
        <Alert type="warning" showIcon message={t('alertRules.previewTruncated')} />
      ) : null}
      <Table<PreviewTableRow>
        size="small"
        pagination={
          rows.length > alertRulePreviewPageSize
            ? { pageSize: alertRulePreviewPageSize, showSizeChanger: false }
            : false
        }
        dataSource={rows}
        rowKey="key"
        scroll={{ x: 'max-content' }}
        columns={columns.map(column => ({
          key: column,
          title: column,
          render: (_value, row) => formatAlertRulePreviewValue(row.values[column])
        }))}
      />
    </div>
  );
}
