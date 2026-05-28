import type { EntityDefinitionActivity, EntityDefinitionFormat, EntityDefinitionRequest, EntityDefinitionWorkspaceTemplate } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;
type EntityDefinitionReaders = {
  definition: (entityId: string, format: EntityDefinitionFormat) => Promise<string>;
  activities: (entityId: string, limit?: number) => Promise<EntityDefinitionActivity[]>;
  templates: (limit?: number) => Promise<EntityDefinitionWorkspaceTemplate[]>;
};

export function buildEntityDefinitionUrl(entityId: string, format: EntityDefinitionFormat) {
  return `/entities/${entityId}/definition?format=${format}`;
}

export function buildEntityDefinitionActivitiesUrl(entityId: string, limit = 8) {
  const params = new URLSearchParams({ entityId, limit: String(limit) });
  return `/entities/definition-activities?${params.toString()}`;
}

export function buildEntityDefinitionTemplatesUrl(limit = 8) {
  const params = new URLSearchParams({ limit: String(limit) });
  return `/entities/definition/templates?${params.toString()}`;
}

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
    apiGet<string>(buildEntityDefinitionUrl(entityId, format)).then(
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
    apiGet<EntityDefinitionActivity[]>(buildEntityDefinitionActivitiesUrl(entityId)).catch(error => {
      if (isRecoverableEntityDefinitionError(error)) {
        return [];
      }
      throw error;
    }),
    apiGet<EntityDefinitionWorkspaceTemplate[]>(buildEntityDefinitionTemplatesUrl()).catch(error => {
      if (isRecoverableEntityDefinitionError(error)) {
        return [];
      }
      throw error;
    })
  ]);

  return { definition: definitionState.definition, loadMessage: definitionState.loadMessage, activities, templates, entityId };
}

export async function loadEntityDefinitionPageDataFromFacade(
  readers: EntityDefinitionReaders,
  entityId: string,
  format: EntityDefinitionFormat
) {
  const [definitionState, activities, templates] = await Promise.all([
    readers.definition(entityId, format).then(
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
    readers.activities(entityId, 8).catch(error => {
      if (isRecoverableEntityDefinitionError(error)) {
        return [];
      }
      throw error;
    }),
    readers.templates(8).catch(error => {
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
