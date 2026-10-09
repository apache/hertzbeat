/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button } from 'antd';
import type { ReactNode, ComponentProps } from 'react';
import { ExploreTimeControl } from './explore-time-control';
import { ExploreAutoRefresh } from './explore-auto-refresh';
import styles from './explore-signal-time-toolbar.module.css';
export function ExploreSignalTimeToolbar(
  props: ComponentProps<typeof ExploreTimeControl> & {
    refresh: () => Promise<void>;
    mode?: ReactNode;
    capability?: 'polling' | 'log_history' | 'log_stream';
  }
) {
  const { query, time, t, mode, refresh } = props;
  const live = props.capability === 'log_stream';
  return (
    <div className={styles.toolbar} data-signal-time-toolbar>
      {!live && <ExploreTimeControl {...props} />}
      <div className={styles.actions}>
        {mode}
        {(props.capability ?? 'polling') === 'polling' && <ExploreAutoRefresh query={query} time={time} t={t} />}
        <Button
          disabled={Boolean(live)}
          {...(live ? { title: t('explore.liveFlow.incomingHint') } : {})}
          autoInsertSpace={false}
          onClick={() => void refresh()}
        >
          {t('common.refresh')}
        </Button>
      </div>
    </div>
  );
}
