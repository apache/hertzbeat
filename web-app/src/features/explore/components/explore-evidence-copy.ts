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

import { useEffect, useRef, useState } from 'react';

type CopyStatus = 'idle' | 'copied' | 'failed';
type CopyAnnouncement = { status: CopyStatus; owner: string; sequence: number };
const COPY_STATUS_DURATION_MS = 4_000;

export function useEvidenceCopy(text: string) {
  const [announcement, setAnnouncement] = useState<CopyAnnouncement>({ status: 'idle', owner: '', sequence: 0 });
  const timer = useRef<number | undefined>(undefined);
  const mounted = useRef(false);
  const request = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current += 1;
      window.clearTimeout(timer.current);
    };
  }, [text]);

  const announce = (status: Exclude<CopyStatus, 'idle'>) => {
    window.clearTimeout(timer.current);
    setAnnouncement(current => ({ status, owner: text, sequence: current.sequence + 1 }));
    timer.current = window.setTimeout(
      () => setAnnouncement(current => (current.owner === text ? { ...current, status: 'idle' } : current)),
      COPY_STATUS_DURATION_MS
    );
  };

  const copy = async () => {
    const currentRequest = ++request.current;
    try {
      await navigator.clipboard.writeText(text);
      if (mounted.current && request.current === currentRequest) announce('copied');
    } catch {
      if (mounted.current && request.current === currentRequest) announce('failed');
    }
  };
  return { copy, sequence: announcement.sequence, status: announcement.owner === text ? announcement.status : 'idle' };
}
