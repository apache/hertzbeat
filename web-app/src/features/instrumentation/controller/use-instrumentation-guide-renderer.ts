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

import { renderInstrumentationGuide } from '../api/instrumentation-api';
import type { GuideRenderRequest, GuideRenderResponse } from '../model/instrumentation-contract';

type GuideRenderState =
  | { status: 'idle' }
  | { status: 'rendering' }
  | { status: 'ready'; guide: GuideRenderResponse }
  | { status: 'error'; error: Error };

interface GuideRenderOwner {
  controller: AbortController;
  promise: Promise<GuideRenderResponse>;
}

class GuideRenderOwnerRetiredError extends Error {
  constructor() {
    super('Instrumentation guide render owner was retired');
    this.name = 'GuideRenderOwnerRetiredError';
  }
}

/** Owns one render command so obsolete responses cannot publish guide state. */
export function useInstrumentationGuideRenderer() {
  const [state, setState] = useState<GuideRenderState>({ status: 'idle' });
  const ownerSequence = useRef(0);
  const pendingOwner = useRef<GuideRenderOwner | undefined>(undefined);
  const mounted = useRef(true);

  const retire = useCallback((publishIdle: boolean) => {
    ownerSequence.current += 1;
    pendingOwner.current?.controller.abort();
    pendingOwner.current = undefined;
    if (publishIdle && mounted.current) setState({ status: 'idle' });
  }, []);

  const reset = useCallback(() => retire(true), [retire]);
  const render = useCallback((request: GuideRenderRequest) => {
    if (pendingOwner.current) return pendingOwner.current.promise;

    const id = ownerSequence.current + 1;
    ownerSequence.current = id;
    const controller = new AbortController();
    setState({ status: 'rendering' });

    const isCurrentOwner = () => mounted.current && ownerSequence.current === id;
    const promise = Promise.resolve()
      .then(() => {
        if (!isCurrentOwner()) throw new GuideRenderOwnerRetiredError();
        return renderInstrumentationGuide(request, controller.signal);
      })
      .then(
        guide => {
          if (!isCurrentOwner()) throw new GuideRenderOwnerRetiredError();
          pendingOwner.current = undefined;
          setState({ status: 'ready', guide });
          return guide;
        },
        reason => {
          if (!isCurrentOwner() || controller.signal.aborted) throw new GuideRenderOwnerRetiredError();
          pendingOwner.current = undefined;
          setState({ status: 'error', error: asError(reason) });
          throw reason;
        }
      );
    pendingOwner.current = { controller, promise };
    return promise;
  }, []);

  useEffect(
    () => () => {
      mounted.current = false;
      retire(false);
    },
    [retire]
  );

  return { state, render, reset };
}

function asError(reason: unknown) {
  return reason instanceof Error ? reason : new Error('Instrumentation guide rendering failed');
}
