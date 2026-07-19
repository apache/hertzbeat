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

import { useCallback, useEffect, useRef, useState } from 'react';

type FavoriteSource = { token: number } | undefined;
export type FavoritePendingExpectation = { sourceToken: number; metricKey: string; desired: boolean };

/** Keeps an acknowledged favorite write visibly locked until canonical evidence converges. */
export function useMonitorFavoritePendingEvidence(
  currentSource: React.MutableRefObject<FavoriteSource>,
  canonicalFavorites: string[] | undefined,
  metricKey: string
) {
  const reference = useRef<FavoritePendingExpectation | undefined>(undefined);
  const [pending, setPending] = useState<FavoritePendingExpectation | undefined>(undefined);
  const wait = useCallback((expectation: FavoritePendingExpectation) => {
    reference.current = expectation;
    setPending(expectation);
  }, []);

  useEffect(() => {
    const source = currentSource.current;
    const expectation = reference.current;
    if (
      expectation &&
      source?.token === expectation.sourceToken &&
      canonicalFavorites !== undefined &&
      canonicalFavorites.includes(expectation.metricKey) === expectation.desired
    ) {
      reference.current = undefined;
      setPending(current => (current?.sourceToken === expectation.sourceToken ? undefined : current));
    }
  }, [canonicalFavorites, currentSource]);

  const active = Boolean(
    pending && pending.sourceToken === currentSource.current?.token && pending.metricKey === metricKey
  );
  return { active, reference, wait };
}
