/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { BulletinActionCapabilities } from '../model/bulletin-action-capability';

export type BulletinAccessRetirement = {
  clearDeleteBatchSelection: () => void;
  retireDelete: () => void;
  retireSave: () => void;
  retireWriteDraft: () => void;
};

export function applyBulletinCapabilityLoss(
  previous: BulletinActionCapabilities,
  current: BulletinActionCapabilities,
  retirement: BulletinAccessRetirement
) {
  if (previous.canWrite && !current.canWrite) {
    retirement.retireWriteDraft();
    retirement.retireSave();
    retirement.retireDelete();
    retirement.clearDeleteBatchSelection();
    return;
  }
  if (previous.canDelete && !current.canDelete) {
    retirement.retireDelete();
    retirement.clearDeleteBatchSelection();
  }
}
