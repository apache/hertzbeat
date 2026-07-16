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

import { ApiMessageError } from '@/core/http/api-message';

const STATUS_ORG_NOT_FOUND_CODE = 15;
const STATUS_ORG_NOT_FOUND_MESSAGE = 'Status Page Organization Not Found';

export function isStatusOrgNotFound(error: unknown) {
  return error instanceof ApiMessageError
    && error.code === STATUS_ORG_NOT_FOUND_CODE
    && error.status === 200
    && error.message === STATUS_ORG_NOT_FOUND_MESSAGE;
}
