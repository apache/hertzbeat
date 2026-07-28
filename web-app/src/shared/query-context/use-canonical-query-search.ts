/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect } from 'react';

type SetSearchParams = (search: string, options: { replace: boolean }) => void;

export function useCanonicalQuerySearch(
  currentSearch: string,
  canonicalSearch: string,
  setSearchParams: SetSearchParams
) {
  useEffect(() => {
    if (currentSearch !== canonicalSearch) setSearchParams(canonicalSearch, { replace: true });
  }, [canonicalSearch, currentSearch, setSearchParams]);
}
