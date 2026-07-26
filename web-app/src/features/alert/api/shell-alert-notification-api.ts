/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import { apiMessageGet, apiMessagePost } from '@/core/http/api-message';

import { AlertContractError } from '../model/alert-model';
import { alertApiRequest } from './alert-api-failure';

const shellAlertMuteEndpoint = '/api/config/mute';
const shellAlertMuteSchema = z.object({ mute: z.boolean() }).passthrough();

export async function loadShellAlertMute(signal?: AbortSignal) {
  return alertApiRequest(async () => {
    const result = shellAlertMuteSchema.safeParse(
      await (signal ? apiMessageGet(shellAlertMuteEndpoint, { signal }) : apiMessageGet(shellAlertMuteEndpoint))
    );
    if (!result.success) throw new AlertContractError('Alert mute config is invalid');
    return { muted: result.data.mute };
  }, signal);
}

export async function saveShellAlertMute(muted: boolean) {
  return alertApiRequest(async () => {
    await apiMessagePost(shellAlertMuteEndpoint, { mute: muted });
    return { muted };
  });
}
