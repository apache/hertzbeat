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

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useStringQueryDraft } from './use-string-query-draft';

describe('useStringQueryDraft', () => {
  it('shows canonical navigation immediately and binds later edits to the new source', () => {
    const { result, rerender } = renderHook(
      ({ source, canonicalValue }) => useStringQueryDraft(source, canonicalValue),
      { initialProps: { source: 'search=alpha', canonicalValue: 'alpha' } }
    );

    act(() => result.current.setValue('unsubmitted alpha'));
    expect(result.current.value).toBe('unsubmitted alpha');

    rerender({ source: 'search=beta', canonicalValue: 'beta' });
    expect(result.current.value).toBe('beta');

    act(() => result.current.setValue('unsubmitted beta'));
    expect(result.current.value).toBe('unsubmitted beta');

    rerender({ source: 'search=beta', canonicalValue: 'updated canonical beta' });
    expect(result.current.value).toBe('unsubmitted beta');

    rerender({ source: 'search=alpha', canonicalValue: 'alpha' });
    expect(result.current.value).toBe('alpha');
  });

  it('does not revive an old draft after visiting another source without editing', () => {
    const { result, rerender } = renderHook(
      ({ source, canonicalValue }) => useStringQueryDraft(source, canonicalValue),
      { initialProps: { source: 'search=alpha', canonicalValue: 'alpha' } }
    );

    act(() => result.current.setValue('stale alpha draft'));
    rerender({ source: 'search=beta', canonicalValue: 'beta' });
    expect(result.current.value).toBe('beta');

    rerender({ source: 'search=alpha', canonicalValue: 'alpha' });
    expect(result.current.value).toBe('alpha');
  });
});
