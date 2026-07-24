/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import { BLOCK_TYPES, SOURCE_KINDS } from '../model/instrumentation-v2-contract';
import { capability, component, explicitHttps, key, signalValues, text } from './instrumentation-v2-schema-parts';

const identifier = z.string().regex(/^[a-z0-9_]{1,64}$/);
const references = z.array(identifier).min(1).max(32).refine(unique);
const sourceSchema = z
  .object({
    id: identifier,
    labelKey: key,
    descriptionKey: key,
    iconKey: z.string().regex(/^[a-z0-9_-]{1,64}$/),
    groupIds: references,
    support: z.enum(['supported', 'preview', 'unsupported']),
    sourceKind: z.enum(SOURCE_KINDS).optional(),
    recipeIds: z.array(identifier).max(32).refine(unique),
    signals: signalValues(capability),
    documentationUrl: explicitHttps.optional()
  })
  .strict()
  .superRefine((value, context) => {
    const capabilities = Object.values(value.signals);
    const unsupported = value.support === 'unsupported';
    const valid = unsupported
      ? !value.sourceKind && value.recipeIds.length === 0 && capabilities.every(item => item === 'unsupported')
      : Boolean(value.sourceKind) && value.recipeIds.length > 0;
    if (!valid) context.addIssue({ code: 'custom', message: 'source entry is inconsistent' });
  });

export const catalogSchema = z
  .object({
    schemaVersion: z.literal(2),
    groups: z.array(z.object({ id: identifier, labelKey: key }).strict()).max(16),
    sources: z.array(sourceSchema).max(256),
    recipes: z
      .array(
        z
          .object({
            id: identifier,
            kind: z.enum(SOURCE_KINDS),
            labelKey: key,
            preview: z.boolean(),
            language: text.optional(),
            framework: text.optional(),
            method: text.optional(),
            environments: z.array(text),
            platforms: z.array(text),
            signals: signalValues(capability),
            components: z.array(component),
            blocksPreview: z.array(z.enum(BLOCK_TYPES))
          })
          .strict()
      )
      .max(64)
  })
  .strict()
  .superRefine((value, context) => {
    const groupIds = new Set(value.groups.map(group => group.id));
    const recipes = new Map(value.recipes.map(recipe => [recipe.id, recipe]));
    if (groupIds.size !== value.groups.length)
      context.addIssue({ code: 'custom', message: 'group IDs must be unique' });
    if (value.sources.some(source => source.groupIds.some(groupId => !groupIds.has(groupId)))) {
      context.addIssue({ code: 'custom', message: 'source group reference is unknown' });
    }
    if (new Set(value.sources.map(source => source.id)).size !== value.sources.length) {
      context.addIssue({ code: 'custom', message: 'source IDs must be unique' });
    }
    if (new Set(value.recipes.map(recipe => recipe.id)).size !== value.recipes.length) {
      context.addIssue({ code: 'custom', message: 'recipe IDs must be unique' });
    }
    if (
      value.sources.some(source =>
        source.recipeIds.some(recipeId => {
          const recipe = recipes.get(recipeId);
          return !recipe || recipe.kind !== source.sourceKind;
        })
      )
    ) {
      context.addIssue({ code: 'custom', message: 'source recipe reference is invalid' });
    }
  });

function unique(values: string[]) {
  return new Set(values).size === values.length;
}
