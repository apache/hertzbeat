/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useState } from 'react';

const WIDE_INSPECTOR_MIN_WIDTH = 1200;
const COMPACT_INSPECTOR_QUERY = `(max-width: ${WIDE_INSPECTOR_MIN_WIDTH - 1}px)`;

export function useCompactTopologyInspector() {
  const [compact, setCompact] = useState(readCompactInspector);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(COMPACT_INSPECTOR_QUERY);
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return compact;
}

function readCompactInspector() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(COMPACT_INSPECTOR_QUERY).matches
  );
}
