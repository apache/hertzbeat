/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
