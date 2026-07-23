/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import { EntityContractError } from '../model/entity-contract';
import {
  entityCriticalities,
  entityStatuses,
  entityTypes,
  type EditableEntityDto,
  type EntityCatalogSuggestions
} from '../model/entity-editor-contract';

const optionalText = z.string().nullish();
const stringList = z.array(z.string()).nullish();
const opaqueObject = z.object({}).passthrough();
const entityChildBase = {
  id: z.number().int().positive().safe().nullish(),
  entityId: z.number().int().positive().safe().nullish(),
  creator: optionalText,
  modifier: optionalText,
  gmtCreate: optionalText,
  gmtUpdate: optionalText
};
const identitySchema = z
  .object({
    ...entityChildBase,
    identityType: optionalText,
    identityKey: optionalText,
    identityValue: optionalText,
    normalizedValue: optionalText,
    priority: z.number().int().nullish(),
    primaryIdentity: z.boolean().optional()
  })
  .passthrough();
const monitorBindSchema = z
  .object({
    ...entityChildBase,
    monitorId: z.number().int().positive().safe().nullish(),
    bindType: optionalText,
    bindSource: optionalText,
    status: optionalText,
    score: z.number().int().nullish(),
    matchContext: z.record(z.string(), z.array(z.string())).nullish()
  })
  .passthrough();
const relationSchema = z
  .object({
    ...entityChildBase,
    sourceEntityId: z.number().int().positive().safe().nullish(),
    targetEntityId: z.number().int().positive().safe().nullish(),
    targetRef: optionalText,
    relationType: optionalText,
    relationSource: optionalText,
    status: optionalText,
    score: z.number().int().nullish(),
    description: optionalText,
    attributes: z.record(z.string(), z.string()).nullish()
  })
  .passthrough();
const editableEntityInfoSchema = z
  .object({
    id: z.number().int().positive().safe().optional(),
    type: z.enum(entityTypes),
    name: z.string().trim().min(1),
    displayName: optionalText,
    subtype: optionalText,
    namespace: optionalText,
    environment: optionalText,
    status: z.enum(entityStatuses).nullish(),
    criticality: z.enum(entityCriticalities).nullish(),
    owner: optionalText,
    additionalOwners: z.array(opaqueObject).nullish(),
    runbook: optionalText,
    lifecycle: optionalText,
    tier: optionalText,
    system: optionalText,
    componentOf: stringList,
    components: stringList,
    implementedBy: stringList,
    apiInterface: z.unknown().optional(),
    inheritFrom: optionalText,
    languages: stringList,
    links: z.array(opaqueObject).nullish(),
    contacts: z.array(opaqueObject).nullish(),
    integrations: z.unknown().optional(),
    extensions: z.unknown().optional(),
    hertzbeat: z.unknown().optional(),
    source: optionalText,
    description: optionalText,
    labels: z.record(z.string(), z.string()).nullish(),
    tags: stringList,
    workspaceId: optionalText,
    creator: optionalText,
    modifier: optionalText,
    gmtCreate: optionalText,
    gmtUpdate: optionalText
  })
  .passthrough();

const editableEntityDtoSchema = z.object({
  entity: editableEntityInfoSchema,
  identities: z.array(identitySchema).nullable(),
  monitorBinds: z.array(monitorBindSchema).nullable(),
  relations: z.array(relationSchema).nullable()
});

const suggestionsSchema = z.object({
  owners: z.array(z.string()),
  namespaces: z.array(z.string()),
  environments: z.array(z.string()),
  systems: z.array(z.string()),
  lifecycles: z.array(z.string()),
  tiers: z.array(z.string()),
  inheritFromRefs: z.array(z.string()),
  entityRefs: z.array(z.string()),
  languages: z.array(z.string()),
  linkProviders: z.array(z.string())
});

export function parseEditableEntityDto(value: unknown): EditableEntityDto {
  const result = editableEntityDtoSchema.safeParse(value);
  if (!result.success) throw new EntityContractError('Editable entity response is invalid');
  return result.data as EditableEntityDto;
}

export function parseEntityCatalogSuggestions(value: unknown): EntityCatalogSuggestions {
  const result = suggestionsSchema.safeParse(value);
  if (!result.success) throw new EntityContractError('Entity suggestions response is invalid');
  return result.data;
}

export function parseCreatedEntityId(value: unknown) {
  const result = z.number().int().positive().safe().safeParse(value);
  if (!result.success) throw new EntityContractError('Created entity id is invalid');
  return result.data;
}
