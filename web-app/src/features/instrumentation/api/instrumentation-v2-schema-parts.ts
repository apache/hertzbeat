/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import { BLOCK_TYPES } from '../model/instrumentation-v2-contract';

export const text = z.string().min(1);
export const key = z.string().regex(/^[a-z0-9_.]{1,160}$/);
export const timestamp = z.number().int().positive();
export const capability = z.enum(['supported', 'preview', 'unsupported']);
export const profileError = z.enum([
  'intake_profile_not_advertised',
  'intake_profile_advertisement_invalid',
  'intake_profile_unavailable',
  'intake_profile_discovery_unavailable'
]);
export const explicitHttps = z.string().superRefine((value, context) => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      context.addIssue({
        code: 'custom',
        message: 'URL must be explicit HTTPS without credentials, query, or fragment'
      });
    }
  } catch {
    context.addIssue({ code: 'custom', message: 'URL is invalid' });
  }
});
export const signalValues = <T extends z.ZodType>(value: T) =>
  z.object({ metrics: value, logs: value, traces: value }).strict();
export const service = z
  .object({
    name: text,
    namespace: text,
    environment: text,
    serviceInstanceId: text.optional(),
    endpoint: text.optional()
  })
  .strict();
export const component = z
  .object({
    name: text,
    sourceUrl: explicitHttps,
    version: text.nullable(),
    versionPolicy: z.enum(['pinned', 'language_specific']),
    license: text,
    installationLocationKey: key,
    official: z.literal(true),
    bundledWithHertzBeat: z.literal(false),
    dependencies: z.array(
      z.object({
        name: text,
        sourceUrl: explicitHttps,
        version: text,
        license: text,
        purposeKey: key,
        official: z.literal(true),
        bundledWithHertzBeat: z.literal(false)
      })
    ),
    artifacts: z.array(
      z.object({
        name: text,
        downloadUrl: explicitHttps,
        algorithm: text,
        digest: text,
        provenanceUrl: explicitHttps
      })
    )
  })
  .strict();
export const guideBlock = z
  .object({
    id: text,
    type: z.enum(BLOCK_TYPES),
    titleKey: key,
    bodyKey: key.optional(),
    executionLocationKey: key,
    language: text.optional(),
    content: text.optional(),
    href: explicitHttps.optional(),
    placeholders: z.array(z.literal('authorizationToken'))
  })
  .strict()
  .superRefine(validateGuideBlock);

type GuideBlock = z.infer<typeof guideBlock>;

function validateGuideBlock(value: GuideBlock, context: z.RefinementCtx) {
  const copyable = ['command', 'code', 'environment', 'download'].includes(value.type);
  const validContent =
    copyable === Boolean(value.content) && !(copyable && value.bodyKey) && !(!copyable && value.content);
  if (!validContent) context.addIssue({ code: 'custom', message: 'guide block content does not match type' });
  if (['note', 'warning', 'check'].includes(value.type) && !value.bodyKey) {
    context.addIssue({ code: 'custom', message: 'explanatory block requires body key' });
  }
  if (value.type === 'link' && !value.href) context.addIssue({ code: 'custom', message: 'link block requires href' });
  if (!hasValidSecretMarker(value)) {
    context.addIssue({ code: 'custom', message: 'secret marker is missing' });
  }
}

function hasValidSecretMarker(value: GuideBlock) {
  return !value.placeholders.includes('authorizationToken') || Boolean(value.content?.includes('${HERTZBEAT_TOKEN}'));
}
