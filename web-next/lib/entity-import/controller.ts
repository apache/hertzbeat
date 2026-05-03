import type {
  EntityDefinitionActivity,
  EntityDefinitionFormat,
  EntityDefinitionRequest,
  EntityDefinitionWorkspaceTemplate,
  EntityDto
} from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiPoster = <T>(url: string, body: EntityDefinitionRequest) => Promise<T>;

function isRecoverableImportLoadError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes('404') || error.message.includes('ECONNRESET') || error.message.includes('socket hang up');
}

async function loadImportTemplates(apiGet: ApiGetter) {
  try {
    return await apiGet<EntityDefinitionWorkspaceTemplate[]>('/entities/definition/templates?limit=8');
  } catch (error) {
    if (isRecoverableImportLoadError(error)) {
      return [];
    }
    throw error;
  }
}

async function loadImportActivities(apiGet: ApiGetter) {
  try {
    return await apiGet<EntityDefinitionActivity[]>('/entities/definition-activities?limit=8');
  } catch (error) {
    if (isRecoverableImportLoadError(error)) {
      return [];
    }
    throw error;
  }
}

export async function loadImportData(apiGet: ApiGetter) {
  const [templates, activities] = await Promise.all([
    loadImportTemplates(apiGet),
    loadImportActivities(apiGet)
  ]);

  return { templates, activities };
}

export function buildDefinitionRequest(content: string, format: EntityDefinitionFormat): EntityDefinitionRequest {
  return { content, format };
}

export async function parseDefinitionBundle(apiPost: ApiPoster, content: string, format: EntityDefinitionFormat) {
  return apiPost<EntityDto[]>('/entities/definition/bundle/parse', buildDefinitionRequest(content, format));
}

export async function createDefinitionBundle(apiPost: ApiPoster, content: string, format: EntityDefinitionFormat) {
  return apiPost<number[]>('/entities/definition/bundle', buildDefinitionRequest(content, format));
}
