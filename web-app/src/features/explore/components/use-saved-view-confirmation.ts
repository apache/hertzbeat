/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useEffect, useRef, useState } from 'react';

/** A pending view-switch confirmation consumes Escape before the enclosing views rail. */
export function useSavedViewConfirmation() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const trigger = triggerRef.current;
      const popupId = trigger?.getAttribute('aria-describedby');
      const popup = popupId ? document.getElementById(popupId) : null;
      const target = event.target;
      if (!(target instanceof Node) || (!trigger?.contains(target) && !popup?.contains(target))) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      trigger?.focus();
    };
    document.addEventListener('keydown', dismiss, true);
    return () => document.removeEventListener('keydown', dismiss, true);
  }, [open]);
  return { open, setOpen, triggerRef };
}
