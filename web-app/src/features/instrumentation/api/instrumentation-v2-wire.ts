/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { z } from 'zod';

import type {
  CatalogResponse,
  DetectionResponse,
  IntakeProfilesResponse,
  RenderResponse
} from '../model/instrumentation-v2-contract';
import { catalogSchema, detectionSchema, intakeProfilesSchema, renderSchema } from './instrumentation-v2-schema';

export class InstrumentationContractError extends Error {
  constructor(label: string, cause?: unknown) {
    super(`${label} did not match instrumentation schema v2`, cause === undefined ? undefined : { cause });
    this.name = 'InstrumentationContractError';
  }
}

export const parseCatalogResponse = (value: unknown): CatalogResponse => parse(catalogSchema, value, 'catalog');
export const parseIntakeProfilesResponse = (value: unknown): IntakeProfilesResponse =>
  parse(intakeProfilesSchema, value, 'intake profiles');
export const parseRenderResponse = (value: unknown): RenderResponse => parse(renderSchema, value, 'render');
export const parseDetectionResponse = (value: unknown): DetectionResponse => parse(detectionSchema, value, 'detection');

function parse<T extends z.ZodType>(schema: T, value: unknown, label: string): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new InstrumentationContractError(label, result.error);
}
