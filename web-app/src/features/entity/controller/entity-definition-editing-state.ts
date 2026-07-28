/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { Dispatch, SetStateAction } from 'react';

import type {
  EntityDefinitionDraft,
  EntityDefinitionFailure,
  EntityDefinitionFormat
} from '../model/entity-definition-model';

export type EntityDefinitionEditingSession = {
  edited: { source: string; draft: EntityDefinitionDraft } | undefined;
  failure: EntityDefinitionFailure | undefined;
  refreshFailure: EntityDefinitionFailure | undefined;
  saved: boolean;
  previewing: boolean;
  saving: boolean;
  refreshing: boolean;
};

export type EntityDefinitionEditingLocks = {
  revision: number;
  // The generation that acquired a lock is the only generation allowed to release it.
  preview: number | undefined;
  save: number | undefined;
  refresh: number | undefined;
};

export type EntityDefinitionEditingOptions = {
  id: number | undefined;
  format: EntityDefinitionFormat;
  canonical: string | undefined;
  setFormat: (format: EntityDefinitionFormat) => void;
  refreshAfterSave: (id: number) => Promise<unknown>;
  refetchCanonical: () => Promise<unknown>;
};

export type EntityDefinitionEditingRuntime = {
  options: EntityDefinitionEditingOptions;
  state: EntityDefinitionEditingSession;
  source: string;
  draft: EntityDefinitionDraft | undefined;
  patch: (patch: Partial<EntityDefinitionEditingSession>) => void;
  locks: EntityDefinitionEditingLocks;
  write: {
    admit: () => number | undefined;
    current: (owner: number) => boolean;
  };
};

export const initialEntityDefinitionEditingSession: EntityDefinitionEditingSession = {
  edited: undefined,
  failure: undefined,
  refreshFailure: undefined,
  saved: false,
  previewing: false,
  saving: false,
  refreshing: false
};

export function retireEntityDefinitionEditing(
  locks: EntityDefinitionEditingLocks,
  setState: Dispatch<SetStateAction<EntityDefinitionEditingSession>>
) {
  locks.revision += 1;
  locks.preview = undefined;
  locks.save = undefined;
  locks.refresh = undefined;
  setState(initialEntityDefinitionEditingSession);
}
