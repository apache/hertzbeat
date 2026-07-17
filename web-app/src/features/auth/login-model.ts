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

import { SessionRequestError } from '@/core/auth/session-api';

export function loginErrorMessageKey(error: unknown) {
  if (!(error instanceof SessionRequestError)) return 'common.routeError.description';
  if (error.kind === 'invalid-credentials') return 'auth.invalidCredentials';
  if (error.kind === 'unavailable') return 'common.unavailable';
  return 'common.routeError.description';
}
