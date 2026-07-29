/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { buildSignalHandoffPath } from '@/shared/query-context/query-context-model';

import {
  canonicalServiceIdentity,
  type CatalogResponse,
  type DetectionRequest,
  type QueryJumpContext,
  type Recipe,
  type RenderRequest,
  type Selection,
  type ServiceIdentity,
  type Signal,
  type SourceKind
} from './instrumentation-v2-contract';

export type InstrumentationDraft = Omit<Selection, 'sourceKind'> & {
  sourceKind?: SourceKind | undefined;
  sourceId?: string | undefined;
  intakeProfileId: string;
  service: ServiceIdentity;
};
export type ApplicationQuestion = 'framework' | 'method' | 'environment' | 'platform';
export type InstrumentationStage = 'source' | 'configure';
export const INSTRUMENTATION_STAGES: InstrumentationStage[] = ['source', 'configure'];

export function previousInstrumentationStage(stage: InstrumentationStage): InstrumentationStage {
  const index = INSTRUMENTATION_STAGES.indexOf(stage);
  return INSTRUMENTATION_STAGES[Math.max(0, index - 1)]!;
}
// Platform affects generated commands, but it is configuration rather than a
// source-discovery question. It is selected inline on the Configure screen.
export const APPLICATION_QUESTIONS: ApplicationQuestion[] = ['framework', 'method', 'environment'];
const RECIPE_DIMENSIONS = ['language', 'framework', 'method', 'environment', 'platform'] as const;

export const emptyDraft = (): InstrumentationDraft => ({
  intakeProfileId: '',
  service: { name: '', namespace: 'default', environment: 'default' }
});

export function selectSource(
  catalog: CatalogResponse,
  sourceId: string,
  service: ServiceIdentity = emptyDraft().service
): InstrumentationDraft {
  const source = catalog.sources.find(item => item.id === sourceId);
  if (!source?.sourceKind || source.support === 'unsupported') {
    throw new Error('Instrumentation source is unavailable');
  }
  const draft = { ...emptyDraft(), service, sourceId, sourceKind: source.sourceKind };
  const recipes = sourceRecipes(catalog, draft);
  if (source.sourceKind !== 'application') return { ...draft, ...selectionFromRecipe(recipes[0]) };
  return hydrateApplicationDraft(draft, recipes);
}

export function applicationQuestionOptions(
  catalog: CatalogResponse,
  draft: InstrumentationDraft,
  field: ApplicationQuestion
) {
  const index = APPLICATION_QUESTIONS.indexOf(field);
  const candidates = sourceRecipes(catalog, draft).filter(recipe =>
    APPLICATION_QUESTIONS.slice(0, index).every(parent => recipeHas(recipe, parent, draft[parent]))
  );
  return unique(candidates.flatMap(recipe => recipeValues(recipe, field)));
}

export function answerApplicationQuestion(
  draft: InstrumentationDraft,
  catalog: CatalogResponse,
  field: ApplicationQuestion,
  value: string
) {
  if (!applicationQuestionOptions(catalog, draft, field).includes(value)) {
    throw new Error('Application answer is not available');
  }
  const index = APPLICATION_QUESTIONS.indexOf(field);
  const next = { ...draft, [field]: value };
  delete next.recipeId;
  for (const dependent of APPLICATION_QUESTIONS.slice(index + 1)) delete next[dependent];
  return hydrateApplicationDraft(next, sourceRecipes(catalog, next));
}

export function previousApplicationSelection(draft: InstrumentationDraft, catalog: CatalogResponse) {
  if (!draft.sourceId || draft.sourceKind !== 'application') return clearSourceSelection(draft);

  // The draft stores the resolved selection, not a second navigation history.
  // Replaying only user-visible choices keeps Back deterministic when the
  // catalog auto-fills single-option dimensions between two questions.
  let rebuilt = selectSource(catalog, draft.sourceId);
  const answers: Array<{ field: ApplicationQuestion; value: string }> = [];
  for (const field of APPLICATION_QUESTIONS) {
    const value = draft[field];
    const options = applicationQuestionOptions(catalog, rebuilt, field);
    if (options.length <= 1 || !value || !options.includes(value)) continue;
    answers.push({ field, value });
    rebuilt = answerApplicationQuestion(rebuilt, catalog, field, value);
  }
  if (answers.length === 0) return clearSourceSelection(draft);

  rebuilt = selectSource(catalog, draft.sourceId);
  for (const answer of answers.slice(0, -1)) {
    rebuilt = answerApplicationQuestion(rebuilt, catalog, answer.field, answer.value);
  }
  return preserveOnboardingContext(rebuilt, draft);
}

export function buildRenderRequest(draft: InstrumentationDraft): RenderRequest {
  validateDraft(draft);
  return {
    schemaVersion: 2,
    ...copySelection(draft),
    intakeProfileId: draft.intakeProfileId,
    service: canonicalServiceIdentity(draft.service)
  };
}

export function buildDetectionRequest(draft: InstrumentationDraft, startedAt: number): DetectionRequest {
  return { ...buildRenderRequest(draft), startedAt };
}

export function materializeBlock(content: string, placeholders: string[], token: string) {
  if (!placeholders.includes('authorizationToken')) return content;
  const value = token.trim();
  if (!/^[A-Za-z0-9._~-]{8,4096}$/.test(value)) throw new Error('Token is invalid');
  return content.replaceAll('${HERTZBEAT_TOKEN}', value);
}

export function buildQueryJump(signal: Signal, context: QueryJumpContext) {
  return buildSignalHandoffPath(
    signal,
    {
      serviceName: context.serviceName,
      serviceNamespace: context.serviceNamespace,
      environment: context.environment,
      intakeProfileId: context.intakeProfileId,
      collectorId: context.collectorId,
      instance: context.serviceInstanceId,
      endpoint: context.endpoint
    },
    { from: context.startedAt, to: context.detectedAt }
  );
}

export function draftReady(draft: InstrumentationDraft) {
  try {
    validateDraft(draft);
    return true;
  } catch {
    return false;
  }
}

function validateDraft(
  draft: InstrumentationDraft
): asserts draft is InstrumentationDraft & { sourceKind: SourceKind; recipeId: string } {
  if (
    !draft.intakeProfileId ||
    !draft.service.name.trim() ||
    !draft.service.namespace.trim() ||
    !draft.service.environment.trim()
  ) {
    throw new Error('Instrumentation context is incomplete');
  }
  if (!draft.sourceKind || !draft.recipeId) throw new Error('Instrumentation selection is required');
  if (draft.sourceKind === 'application' && (!draft.environment || !draft.platform)) {
    throw new Error('Application configuration is incomplete');
  }
}

export function selectedRecipePlatforms(catalog: CatalogResponse, draft: InstrumentationDraft) {
  if (!draft.recipeId) return [];
  return catalog.recipes.find(recipe => recipe.id === draft.recipeId)?.platforms ?? [];
}

function selectionFromRecipe(recipe?: Recipe): Partial<Selection> {
  if (!recipe) return {};
  return {
    recipeId: recipe.id,
    ...(recipe.language ? { language: recipe.language } : {}),
    ...(recipe.framework ? { framework: recipe.framework } : {}),
    ...(recipe.method ? { method: recipe.method } : {}),
    ...(recipe.environments[0] ? { environment: recipe.environments[0] } : {}),
    ...(recipe.platforms[0] ? { platform: recipe.platforms[0] } : {})
  };
}

function copySelection(value: Selection): Selection {
  return {
    sourceKind: value.sourceKind,
    ...(value.recipeId ? { recipeId: value.recipeId } : {}),
    ...(value.language ? { language: value.language } : {}),
    ...(value.framework ? { framework: value.framework } : {}),
    ...(value.method ? { method: value.method } : {}),
    ...(value.environment ? { environment: value.environment } : {}),
    ...(value.platform ? { platform: value.platform } : {})
  };
}

function unique(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function sourceRecipes(catalog: CatalogResponse, draft: InstrumentationDraft) {
  const recipeIds = catalog.sources.find(source => source.id === draft.sourceId)?.recipeIds ?? [];
  return catalog.recipes.filter(recipe => recipeIds.includes(recipe.id) && recipe.kind === draft.sourceKind);
}

function clearSourceSelection(draft: InstrumentationDraft) {
  return preserveOnboardingContext(emptyDraft(), draft);
}

function preserveOnboardingContext(selection: InstrumentationDraft, draft: InstrumentationDraft) {
  return {
    ...selection,
    intakeProfileId: draft.intakeProfileId,
    service: draft.service
  };
}

function hydrateApplicationDraft(draft: InstrumentationDraft, recipes: Recipe[]) {
  let next = { ...draft };
  for (const field of RECIPE_DIMENSIONS) {
    if (next[field]) continue;
    const candidates = recipes.filter(recipe =>
      RECIPE_DIMENSIONS.every(parent => !next[parent] || recipeHas(recipe, parent, next[parent]))
    );
    const values = unique(candidates.flatMap(recipe => recipeValues(recipe, field)));
    if (values.length === 1) next = { ...next, [field]: values[0] };
  }
  const matches = recipes.filter(recipe =>
    RECIPE_DIMENSIONS.every(field => !next[field] || recipeHas(recipe, field, next[field]))
  );
  const hasUnresolvedChoice = APPLICATION_QUESTIONS.some(
    field => !next[field] && unique(matches.flatMap(recipe => recipeValues(recipe, field))).length > 1
  );
  if (matches.length === 1 && !hasUnresolvedChoice) return { ...next, recipeId: matches[0]!.id };
  return next;
}

function recipeValues(recipe: Recipe, field: ApplicationQuestion | 'language'): string[] {
  if (field === 'environment') return recipe.environments;
  if (field === 'platform') return recipe.platforms;
  const value = recipe[field];
  return value ? [value] : [];
}

function recipeHas(recipe: Recipe, field: ApplicationQuestion | 'language', value: string | undefined) {
  return Boolean(value && recipeValues(recipe, field).includes(value));
}
