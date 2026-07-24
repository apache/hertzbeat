/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { buildSignalHandoffPath } from '@/shared/query-context/query-context-model';

import type {
  CatalogResponse,
  DetectionRequest,
  QueryJumpContext,
  Recipe,
  RenderRequest,
  Selection,
  ServiceIdentity,
  Signal
} from './instrumentation-v2-contract';

export type InstrumentationDraft = Selection & {
  intakeProfileId: string;
  service: ServiceIdentity;
};
export type ApplicationQuestion = 'language' | 'framework' | 'method' | 'environment' | 'platform';
export type InstrumentationStage = 'source' | 'context' | 'install' | 'detect';
export const INSTRUMENTATION_STAGES: InstrumentationStage[] = ['source', 'context', 'install', 'detect'];

export function previousInstrumentationStage(stage: InstrumentationStage): InstrumentationStage {
  const index = INSTRUMENTATION_STAGES.indexOf(stage);
  return INSTRUMENTATION_STAGES[Math.max(0, index - 1)]!;
}
export const APPLICATION_QUESTIONS: ApplicationQuestion[] = [
  'language',
  'framework',
  'method',
  'environment',
  'platform'
];

export const emptyDraft = (): InstrumentationDraft => ({
  sourceKind: 'quick_start',
  intakeProfileId: '',
  service: { name: '', namespace: '', environment: '' }
});

export function selectSource(catalog: CatalogResponse, kind: Selection['sourceKind']): InstrumentationDraft {
  const recipes = catalog.recipes.filter(recipe => recipe.kind === kind);
  const recipe = kind === 'application' ? undefined : recipes[0];
  return { ...emptyDraft(), sourceKind: kind, ...selectionFromRecipe(recipe) };
}

export function selectRecipe(draft: InstrumentationDraft, recipe: Recipe): InstrumentationDraft {
  if (recipe.kind !== draft.sourceKind) throw new Error('Recipe does not match source');
  return { ...draft, ...selectionFromRecipe(recipe) };
}

export function applicationQuestionOptions(
  catalog: CatalogResponse,
  draft: InstrumentationDraft,
  field: ApplicationQuestion
) {
  const index = APPLICATION_QUESTIONS.indexOf(field);
  const candidates = applicationRecipes(catalog).filter(recipe =>
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
  if (APPLICATION_QUESTIONS.some(answer => !next[answer])) return next;
  const recipe = applicationRecipes(catalog).find(candidate =>
    APPLICATION_QUESTIONS.every(answer => recipeHas(candidate, answer, next[answer]))
  );
  if (!recipe) throw new Error('Application recipe did not resolve');
  return { ...next, recipeId: recipe.id };
}

export function buildRenderRequest(draft: InstrumentationDraft): RenderRequest {
  validateDraft(draft);
  return { schemaVersion: 2, ...copySelection(draft), intakeProfileId: draft.intakeProfileId, service: draft.service };
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

function validateDraft(draft: InstrumentationDraft) {
  if (
    !draft.intakeProfileId ||
    !draft.service.name.trim() ||
    !draft.service.namespace.trim() ||
    !draft.service.environment.trim()
  ) {
    throw new Error('Instrumentation context is incomplete');
  }
  if (!draft.recipeId) throw new Error('Instrumentation recipe is required');
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

function applicationRecipes(catalog: CatalogResponse) {
  return catalog.recipes.filter(recipe => recipe.kind === 'application');
}

function recipeValues(recipe: Recipe, field: ApplicationQuestion): string[] {
  if (field === 'environment') return recipe.environments;
  if (field === 'platform') return recipe.platforms;
  const value = recipe[field];
  return value ? [value] : [];
}

function recipeHas(recipe: Recipe, field: ApplicationQuestion, value: string | undefined) {
  return Boolean(value && recipeValues(recipe, field).includes(value));
}
