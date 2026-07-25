/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useAuthoritativePageSelection } from '@/shared/table-selection';

import { writeAlertGroupQuery, type AlertGroupQuery } from '../model/alert-group-model';
import type { AlertGroupListState } from '../model/alert-group-state';

export function useAlertGroupSelection(query: AlertGroupQuery, list: AlertGroupListState) {
  return useAuthoritativePageSelection(writeAlertGroupQuery(query).toString(), list);
}
