/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Drawer, Grid } from 'antd';
import { useEffect, useRef, type ReactNode } from 'react';
import styles from './explore-log-transactions.module.css';
import frameStyles from './explore-log-transaction-frame.module.css';
export function TransactionRailFrame({
  label,
  onClose,
  children
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const narrow = Grid.useBreakpoint().md === false;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!narrow) ref.current?.focus();
  }, [narrow]);
  if (narrow)
    return (
      <Drawer
        open
        title={
          <span className={frameStyles.identity} title={label}>
            {label}
          </span>
        }
        width="100%"
        onClose={onClose}
        styles={{ body: { padding: 'var(--hb-space-3)' } }}
      >
        <div className={frameStyles.detail}>{children}</div>
      </Drawer>
    );
  return (
    <aside
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="false"
      aria-label={label}
      className={styles.rail}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      {children}
    </aside>
  );
}
