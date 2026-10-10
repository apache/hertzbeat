/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
  await alertApiRequest(async () => {
    await apiMessagePost(shellAlertMuteEndpoint, { mute: muted });
  });
}
