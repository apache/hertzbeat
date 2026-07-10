import React from 'react';

export default function Loading() {
  return (
    <main
      data-app-route-loading="quiet-route-pending"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Opening workbench"
      className="min-h-[calc(100vh-56px)] bg-[#07090b] px-6 py-5"
    >
      <div className="h-px w-full overflow-hidden bg-[#11161d]">
        <div
          data-app-route-loading-indicator="true"
          className="h-px w-1/3 animate-pulse bg-[#8fb3ff]"
        />
      </div>
      <div
        data-app-route-loading-shell="operator-compact"
        className="mt-6 max-w-[720px] border-l border-[var(--ops-border-color)] pl-4"
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">
          Opening workbench
        </div>
        <div className="mt-2 max-w-[520px] text-[13px] leading-5 text-[var(--ops-text-secondary)]">
          Loading route state, navigation context, and live backend evidence.
        </div>
        <div
          data-app-route-loading-skeleton="true"
          className="mt-5 grid max-w-[560px] gap-2"
          aria-hidden="true"
        >
          <div className="h-2 w-full bg-[var(--ops-surface-raised)]" />
          <div className="h-2 w-4/5 bg-[var(--ops-surface-raised)]" />
          <div className="h-2 w-2/3 bg-[var(--ops-surface-raised)]" />
        </div>
      </div>
    </main>
  );
}
