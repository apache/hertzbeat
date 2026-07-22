/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import { safeRedirectTarget } from './navigation';
import {
  sessionLockMarkerLimits,
  sessionLockMarkerVersion,
  type SessionLockMarker,
  type SessionLockMarkerRead
} from './session-lock-model';

export const sessionLockStorageKey = 'hertzbeat.session-lock';

const markerSchema: z.ZodType<SessionLockMarker> = z
  .object({
    version: z.literal(sessionLockMarkerVersion),
    username: z
      .string()
      .max(sessionLockMarkerLimits.identity)
      .refine(value => value.trim().length > 0),
    workspaceId: z
      .string()
      .max(sessionLockMarkerLimits.identity)
      .refine(value => value.trim().length > 0),
    returnTo: z
      .string()
      .max(sessionLockMarkerLimits.returnTo)
      .refine(value => safeRedirectTarget(value) === value)
  })
  .strict();

export function readSessionLockMarker(): SessionLockMarkerRead {
  const storage = browserSessionStorage();
  if (!storage) return { kind: 'invalid' };
  try {
    const value = storage.getItem(sessionLockStorageKey);
    if (value === null) return { kind: 'absent' };
    const parsed = markerSchema.safeParse(JSON.parse(value) as unknown);
    return parsed.success ? { kind: 'valid', marker: parsed.data } : { kind: 'invalid' };
  } catch {
    return { kind: 'invalid' };
  }
}

export function persistSessionLockMarker(marker: SessionLockMarker | null) {
  const storage = browserSessionStorage();
  const parsed = markerSchema.safeParse(marker);
  if (!storage || !parsed.success) return false;
  try {
    storage.setItem(sessionLockStorageKey, JSON.stringify(parsed.data));
    return true;
  } catch {
    return false;
  }
}

export function clearSessionLockMarker() {
  const storage = browserSessionStorage();
  if (!storage) return false;
  try {
    storage.removeItem(sessionLockStorageKey);
    return true;
  } catch {
    return false;
  }
}

function browserSessionStorage() {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
