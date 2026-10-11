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

import { useEffect, useRef, useState } from 'react';

/** A pending view-switch confirmation consumes Escape before the enclosing views rail. */
export function useSavedViewConfirmation() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const trigger = triggerRef.current;
      const popupId = trigger?.getAttribute('aria-describedby');
      const popup = popupId ? document.getElementById(popupId) : null;
      const target = event.target;
      if (!(target instanceof Node) || (!trigger?.contains(target) && !popup?.contains(target))) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      trigger?.focus();
    };
    document.addEventListener('keydown', dismiss, true);
    return () => document.removeEventListener('keydown', dismiss, true);
  }, [open]);
  return { open, setOpen, triggerRef };
}
