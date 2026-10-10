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

import { useEffect, useRef } from 'react';

/** Runs one deferred UI action when its owner approaches the viewport and keeps a non-observer fallback possible. */
export function useActivateWhenVisible<T extends Element>(
  enabled: boolean,
  activate: () => void,
  rootMargin = '200px 0px'
) {
  const target = useRef<T>(null);
  useEffect(() => {
    if (!enabled || !target.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        activate();
      },
      { rootMargin }
    );
    observer.observe(target.current);
    return () => observer.disconnect();
  }, [activate, enabled, rootMargin]);
  return target;
}
