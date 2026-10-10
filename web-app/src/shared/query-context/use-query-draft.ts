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

import { useCallback, useState } from 'react';

type SourceScopedValue<T> = {
  source: string;
  value: T;
};

/** Retires local state when its canonical URL source changes. */
export function useSourceScopedValue<T>(source: string, canonicalValue: T) {
  const [scopedValue, setScopedValue] = useState<SourceScopedValue<T>>({ source, value: canonicalValue });

  if (scopedValue.source !== source) {
    // Retire the previous source during render so navigation commits only the
    // canonical value and an old draft cannot flash or reappear on back/forward.
    setScopedValue({ source, value: canonicalValue });
  }

  const value = scopedValue.source === source ? scopedValue.value : canonicalValue;

  const setValue = useCallback(
    (nextValue: T) => {
      setScopedValue({ source, value: nextValue });
    },
    [source]
  );

  return { value, setValue };
}

export function useQueryDraft<T>(source: string, canonicalValue: T) {
  return useSourceScopedValue(source, canonicalValue);
}

export function useStringQueryDraft(source: string, canonicalValue: string) {
  return useQueryDraft(source, canonicalValue);
}
