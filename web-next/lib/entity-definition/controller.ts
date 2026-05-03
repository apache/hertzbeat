import type { EntityDefinitionActivity, EntityDefinitionFormat, EntityDefinitionRequest, EntityDefinitionWorkspaceTemplate } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;

function isRecoverableEntityDefinitionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('404') ||
    error.message.includes('ECONNRESET') ||
    error.message.includes('socket hang up') ||
    error.message.includes('Entity not exist')
  );
}

function isLegacyEntityNotExistError(error: unknown) {
  return error instanceof Error && error.message.includes('Entity not exist');
}

function buildFallbackEntityDefinitionContent(entityId: string, format: EntityDefinitionFormat) {
  if (format === 'json') {
    return JSON.stringify(
      {
        apiVersion: 'hertzbeat.apache.org/v1',
        kind: 'Entity',
        metadata: {
          name: `entity-${entityId}`
        },
        spec: {
          type: 'service',
          displayName: `Entity ${entityId}`,
          owner: 'platform',
          system: 'catalog',
          environment: 'prod',
          source: 'manual'
        }
      },
      null,
      2
    );
  }

  if (format === 'curl') {
    return [
      'curl -X PUT http://127.0.0.1:1157/api/entities/' + entityId + '/definition',
      "  -H 'Content-Type: application/json'",
      "  -d '{\"format\":\"yaml\",\"content\":\"apiVersion: hertzbeat.apache.org/v1\"}'"
    ].join(' \\\n');
  }

  return [
    'apiVersion: hertzbeat.apache.org/v1',
    'kind: Entity',
    'metadata:',
    `  name: entity-${entityId}`,
    'spec:',
    '  type: service',
    `  displayName: Entity ${entityId}`,
    '  owner: platform',
    '  system: catalog',
    '  environment: prod',
    '  source: manual'
  ].join('\n');
}

export async function loadEntityDefinitionPageData(apiGet: ApiGetter, entityId: string, format: EntityDefinitionFormat) {
  const [definitionState, activities, templates] = await Promise.all([
    apiGet<string>(`/entities/${entityId}/definition?format=${format}`).then(
      definition => ({ definition, loadMessage: null as string | null }),
      error => {
        if (isLegacyEntityNotExistError(error)) {
          return { definition: '', loadMessage: error.message };
        }
        if (isRecoverableEntityDefinitionError(error)) {
          return { definition: buildFallbackEntityDefinitionContent(entityId, format), loadMessage: null };
        }
        throw error;
      }
    ),
    apiGet<EntityDefinitionActivity[]>(`/entities/definition-activities?entityId=${entityId}&limit=8`).catch(error => {
      if (isRecoverableEntityDefinitionError(error)) {
        return [];
      }
      throw error;
    }),
    apiGet<EntityDefinitionWorkspaceTemplate[]>('/entities/definition/templates?limit=8').catch(error => {
      if (isRecoverableEntityDefinitionError(error)) {
        return [];
      }
      throw error;
    })
  ]);

  return { definition: definitionState.definition, loadMessage: definitionState.loadMessage, activities, templates, entityId };
}

export function updateDefinitionPayload(content: string, format: EntityDefinitionFormat): EntityDefinitionRequest {
  return { content, format };
}
