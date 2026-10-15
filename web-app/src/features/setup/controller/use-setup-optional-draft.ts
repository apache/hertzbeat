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

import { useCallback, useRef, useState } from 'react';

import { clearOptionalMailSecret, createOptionalDraft, type SetupOptionalDraft } from '../model/setup-optional';

export function useSetupOptionalDraft() {
  const [draft, setDraft] = useState(createOptionalDraft);
  const draftRef = useRef(draft);
  const updateDraft = useCallback((patch: Partial<SetupOptionalDraft>) => {
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    setDraft(next);
  }, []);
  const clearMailSecret = useCallback(() => {
    const next = clearOptionalMailSecret(draftRef.current);
    draftRef.current = next;
    setDraft(next);
  }, []);
  return { clearMailSecret, draft, draftRef, updateDraft };
}
