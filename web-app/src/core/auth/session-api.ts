/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { apiFetch } from '@/core/http/http-client';

export type UiSession = {
  authenticated: boolean;
  username: string | null;
  roles: string[];
  workspaceId: string | null;
  expiresAt: string | null;
};

type ApiMessage<T> = {
  code: number;
  msg?: string;
  data: T;
};

export function getSession() {
  return sessionRequest('/api/ui/session');
}

async function sessionRequest(path: string, init?: RequestInit) {
  const response = await apiFetch(path, init);
  if (!response.ok) throw new Error(`Session request failed with status ${response.status}`);
  const message = (await response.json()) as ApiMessage<UiSession>;
  if (message.code !== 0) throw new Error(message.msg ?? 'Session request failed');
  return message.data;
}
