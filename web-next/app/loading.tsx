import React from 'react';

export default function Loading() {
  return (
    <main
      data-app-route-loading="quiet-route-pending"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Route pending"
      className="min-h-[calc(100vh-56px)] bg-[#07090b]"
    >
      <div className="h-px w-full overflow-hidden bg-[#11161d]">
        <div
          data-app-route-loading-indicator="true"
          className="h-px w-1/3 animate-pulse bg-[#8fb3ff]"
        />
      </div>
    </main>
  );
}
