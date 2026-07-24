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

export function recipeDimensions(recipes: Recipe[]) {
  return {
    languages: unique(recipes.map(item => item.language)),
    frameworks: unique(recipes.map(item => item.framework)),
    methods: unique(recipes.map(item => item.method)),
    environments: unique(recipes.flatMap(item => item.environments)),
    platforms: unique(recipes.flatMap(item => item.platforms))
  };
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
