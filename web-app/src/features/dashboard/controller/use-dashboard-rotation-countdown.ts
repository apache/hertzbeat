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

import { useCallback, useEffect, useRef, useState } from 'react';
const DASHBOARD_ROTATION_MS = 8000;
export function useDashboardRotationCountdown(enabled: boolean, cycle: () => void) {
  const remaining = useRef(DASHBOARD_ROTATION_MS);
  const last = useRef(0);
  const [remainingMs, setRemainingMs] = useState(DASHBOARD_ROTATION_MS);
  const reset = useCallback(() => {
    remaining.current = DASHBOARD_ROTATION_MS;
    last.current = Date.now();
    setRemainingMs(DASHBOARD_ROTATION_MS);
  }, []);
  useEffect(() => {
    if (!enabled) {
      setRemainingMs(remaining.current);
      return;
    }
    last.current = Date.now();
    const tick = () => {
      const now = Date.now();
      remaining.current = Math.max(0, remaining.current - (now - last.current));
      last.current = now;
      if (remaining.current === 0) {
        remaining.current = DASHBOARD_ROTATION_MS;
        cycle();
      }
      setRemainingMs(remaining.current);
    };
    const timer = window.setInterval(tick, 100);
    return () => {
      window.clearInterval(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - last.current));
    };
  }, [enabled, cycle]);
  return { remainingMs, reset };
}
