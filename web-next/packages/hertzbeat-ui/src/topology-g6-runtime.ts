'use client';

let topologyG6RuntimePreload: Promise<void> | undefined;

export function preloadHzTopologyG6Runtime() {
  if (typeof window === 'undefined') return undefined;
  if (!topologyG6RuntimePreload) {
    topologyG6RuntimePreload = import('@antv/g6')
      .then(() => undefined)
      .catch(() => {
        topologyG6RuntimePreload = undefined;
      });
  }
  return topologyG6RuntimePreload;
}
