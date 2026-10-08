/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useEffect, useState } from 'react';
import { logFacetValueSearchSchema } from '../model/explore-log-facets';

export function useLogFacetSearch(owner: string) {
  const [draft, setDraft] = useState({ owner, text: '' });
  const [settled, setSettled] = useState(draft);
  if (draft.owner !== owner) {
    setDraft({ owner, text: '' });
    setSettled({ owner, text: '' });
  }
  const valueSearch = draft.owner === owner ? draft.text : '';
  const applied = settled.owner === owner ? settled.text : '';
  useEffect(() => {
    const timer = setTimeout(() => setSettled({ owner, text: valueSearch }), 300);
    return () => clearTimeout(timer);
  }, [owner, valueSearch]);
  const valid = logFacetValueSearchSchema.safeParse(valueSearch).success;
  return {
    valueSearch,
    onValueSearchChange: (text: string) => setDraft({ owner, text }),
    pending: !valid ? ('unavailable' as const) : valueSearch !== applied ? ('loading' as const) : undefined
  };
}
