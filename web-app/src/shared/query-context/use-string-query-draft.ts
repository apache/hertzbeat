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

import { useCallback, useEffect, useState } from 'react';

type StringQueryDraft = {
  source: string;
  value: string;
};

/** Keeps unsubmitted text local while treating a changed URL source as authoritative. */
export function useStringQueryDraft(source: string, canonicalValue: string) {
  const [draft, setDraft] = useState<StringQueryDraft>({ source, value: canonicalValue });

  // Derivation makes back/forward navigation visible without waiting for an effect or updating during render.
  const value = draft.source === source ? draft.value : canonicalValue;

  useEffect(() => {
    // Once navigation commits, discard the previous source so its abandoned draft cannot reappear on a later visit.
    // The rendered value already comes from canonicalValue, so this cleanup cannot expose the abandoned draft.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(current => current.source === source ? current : { source, value: canonicalValue });
  }, [canonicalValue, source]);

  const setValue = useCallback((nextValue: string) => {
    setDraft({ source, value: nextValue });
  }, [source]);

  return { value, setValue };
}
