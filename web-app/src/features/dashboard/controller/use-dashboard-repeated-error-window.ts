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

import { useState } from 'react';
import type { RepeatedErrorGroup } from '../model/dashboard-repeated-errors';
export function useDashboardRepeatedErrorWindow(end: number, scopeKey: string) {
  const [rankPaused, updatePaused] = useState(false);
  const [rankInteracting, updateInteracting] = useState(false);
  const [selected, updateSelected] = useState<RepeatedErrorGroup | null>(null);
  const [frozenEnd, setFrozenEnd] = useState(end);
  const frozen = rankPaused || rankInteracting || selected !== null;
  const capture = () => {
    if (!frozen) setFrozenEnd(end);
  };
  const setRankPaused = (value: boolean) => {
    if (value) capture();
    updatePaused(value);
  };
  const setRankInteracting = (value: boolean) => {
    if (value) capture();
    updateInteracting(value);
  };
  const setSelected = (value: RepeatedErrorGroup | null) => {
    if (value) capture();
    updateSelected(value);
  };
  const [priorScope, setPriorScope] = useState(scopeKey);
  if (priorScope !== scopeKey) {
    setPriorScope(scopeKey);
    setSelected(null);
    setFrozenEnd(end);
  }
  const rankEnd = frozen ? frozenEnd : end;
  return {
    rankEnd,
    selected,
    setSelected,
    rankPaused,
    setRankPaused,
    setRankInteracting,
    refresh: () => {
      if (!selected) setFrozenEnd(Date.now());
    }
  };
}
