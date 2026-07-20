/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { BulletinDependencyProof } from '../model/bulletin-dependency-proof';
import { validateBulletinDraft, type BulletinDraft } from '../model/bulletin-model';

type BulletinValidationProof = Pick<
  BulletinDependencyProof,
  'fieldSelection' | 'kind' | 'metrics' | 'monitorSelection' | 'monitors'
>;

export function getValidBulletinDraft(
  draft: BulletinDraft | null,
  dependencies: BulletinValidationProof,
  onInvalid: () => void
) {
  if (!draft || dependencies.kind !== 'ready') return null;
  const invalid =
    dependencies.monitorSelection !== 'valid' ||
    dependencies.fieldSelection !== 'valid' ||
    validateBulletinDraft(draft, dependencies.monitors, dependencies.metrics).length > 0;
  if (!invalid) return draft;
  onInvalid();
  return null;
}
