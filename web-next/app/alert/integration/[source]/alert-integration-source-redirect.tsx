'use client';

import React from 'react';
import { useEffect } from 'react';

export function AlertIntegrationSourceRedirect({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);

  return (
    <section
      data-alert-integration-canonical-redirect="pending"
      className="min-h-[260px]"
    />
  );
}
