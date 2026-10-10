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

import type { KeyboardEvent } from 'react';
import type { SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
export function dismissViews(event: KeyboardEvent<HTMLElement>, model: SavedQueriesViewModel) {
  if (event.key !== 'Escape' || !model.open || event.defaultPrevented) return;
  const target = event.target;
  if (!(target instanceof HTMLElement) || !event.currentTarget.contains(target)) return;
  if (target.closest('[role="combobox"][aria-expanded="true"]')) return;
  event.preventDefault();
  event.stopPropagation();
  model.setOpen(false);
  document.getElementById('explore-logs-views-trigger')?.focus();
}
