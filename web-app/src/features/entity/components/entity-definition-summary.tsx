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

import { Collapse, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { EditableEntityDto } from '../model/entity-editor-contract';
import { localizeEntityCode } from '../model/entity-display';

export function EntityDefinitionSummary({
  resource,
  messageNamespace
}: {
  resource: EditableEntityDto;
  messageNamespace: 'entity.import' | 'entity.definition';
}) {
  const { t } = useTranslation();
  return (
    <Space direction="vertical" size={2}>
      <Space wrap>
        <strong>{resource.entity.displayName || resource.entity.name}</strong>
        <Tag>{localizeEntityCode(t, 'type', resource.entity.type)}</Tag>
      </Space>
      <Collapse
        ghost
        size="small"
        items={[
          {
            key: 'details',
            label: t(`${messageNamespace}.details`),
            children: <DefinitionTechnicalDetails resource={resource} messageNamespace={messageNamespace} />
          }
        ]}
      />
    </Space>
  );
}

function DefinitionTechnicalDetails({
  resource,
  messageNamespace
}: {
  resource: EditableEntityDto;
  messageNamespace: 'entity.import' | 'entity.definition';
}) {
  const { t } = useTranslation();
  const entries = [
    ['owner', resource.entity.owner],
    ['environment', resource.entity.environment],
    ['namespace', resource.entity.namespace],
    ['source', resource.entity.source]
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  return (
    <Space direction="vertical" size={2}>
      {entries.map(([key, value]) => (
        <Typography.Text key={key}>{`${t(`${messageNamespace}.fields.${key}`)}: ${value}`}</Typography.Text>
      ))}
      <Typography.Text type="secondary">
        {t(`${messageNamespace}.associationSummary`, {
          identities: resource.identities?.length ?? 0,
          monitors: resource.monitorBinds?.length ?? 0,
          relations: resource.relations?.length ?? 0
        })}
      </Typography.Text>
    </Space>
  );
}
