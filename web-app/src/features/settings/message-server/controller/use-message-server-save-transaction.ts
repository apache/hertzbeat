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

import { useMutation } from '@tanstack/react-query';
import { useRef } from 'react';

import { classifyMessageServerReadError } from '../api/message-server-api';

export type MessageServerSaveNotifications = {
  invalid: () => void;
  success: () => void;
  failure: (key: string) => void;
};

type SaveTransactionOptions<Draft, Evidence> = {
  draft: Draft | null;
  validate: (draft: Draft) => string[];
  write: (draft: Draft) => Promise<unknown>;
  reread: () => Promise<{ data: Evidence | undefined; error: unknown }>;
  converged: (draft: Draft, evidence: Evidence) => boolean;
  close: () => void;
  accept: (evidence: Evidence) => void;
  notifications: MessageServerSaveNotifications;
};

export function useMessageServerSaveTransaction<Draft, Evidence>(options: SaveTransactionOptions<Draft, Evidence>) {
  // React Query pending state updates after the event. The ref is the same-tick
  // transaction gate for submit, close, and draft mutation handlers.
  const locked = useRef(false);
  const mutation = useMutation({
    mutationFn: async (draft: Draft) => {
      await options.write(draft);
      const proof = await options.reread();
      if (proof.error) throw new AuthoritativeReadError(proof.error);
      if (!proof.data || !options.converged(draft, proof.data)) throw new AuthoritativeReadError(undefined, true);
      return proof.data;
    }
  });
  const submit = async () => {
    const draft = options.draft;
    if (!draft || options.validate(draft).length > 0) {
      options.notifications.invalid();
      return;
    }
    if (locked.current) return;
    locked.current = true;
    try {
      const evidence = await mutation.mutateAsync(draft);
      options.accept(evidence);
      options.notifications.success();
    } catch (error) {
      options.notifications.failure(mutationErrorKey(error));
    } finally {
      locked.current = false;
    }
  };
  const close = () => {
    if (!locked.current) options.close();
  };
  return { submit, close, saving: mutation.isPending, isLocked: () => locked.current };
}

class AuthoritativeReadError extends Error {
  constructor(
    readonly reason: unknown,
    readonly missing = false
  ) {
    super('Authoritative message server reread failed');
    this.name = 'AuthoritativeReadError';
  }
}

function mutationErrorKey(error: unknown) {
  if (!(error instanceof AuthoritativeReadError)) return 'messageServer.saveFailed';
  if (error.missing) return 'messageServer.saveNotConverged';
  return `messageServer.read.${classifyMessageServerReadError(error.reason)}`;
}
