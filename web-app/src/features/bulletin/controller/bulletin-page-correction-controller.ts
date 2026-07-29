/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef } from 'react';

import {
  bulletinPageIndexCorrection,
  writeBulletinQuery,
  type BulletinPageEvidence,
  type BulletinQuery
} from '../model/bulletin-model';

export function useBulletinPageCorrection(
  query: BulletinQuery,
  page: BulletinPageEvidence | undefined,
  replacePageIndex: (pageIndex: number) => void
) {
  const correction = bulletinPageIndexCorrection(query, page);
  const correctionKey = correction === undefined ? undefined : `${writeBulletinQuery(query).toString()}=>${correction}`;
  const appliedCorrection = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (correctionKey === undefined || correction === undefined) {
      appliedCorrection.current = undefined;
      return;
    }
    if (appliedCorrection.current === correctionKey) return;
    appliedCorrection.current = correctionKey;
    replacePageIndex(correction);
  }, [correction, correctionKey, replacePageIndex]);
}
