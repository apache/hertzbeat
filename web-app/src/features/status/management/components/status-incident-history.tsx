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

import { List } from 'antd';
import { useTranslation } from 'react-i18next';

import type { StatusIncidentContent } from '../model/status-management-contract';
import { incidentStateKey } from '../model/status-management-model';

interface StatusIncidentHistoryProps {
  contents: StatusIncidentContent[];
}

export function StatusIncidentHistory({ contents }: StatusIncidentHistoryProps) {
  const { t } = useTranslation();
  // Incident data is parent-owned; sort a copy so rendering cannot mutate it.
  const newestFirst = [...contents].sort((left, right) => right.timestamp - left.timestamp);

  return (
    <List
      size="small"
      header={t('statusManagement.updateHistory')}
      dataSource={newestFirst}
      renderItem={item => (
        <List.Item extra={new Date(item.timestamp).toLocaleString()}>
          <List.Item.Meta title={t(incidentStateKey(item.state))} description={item.message} />
        </List.Item>
      )}
    />
  );
}
