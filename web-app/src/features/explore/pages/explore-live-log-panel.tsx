/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useTranslation } from 'react-i18next';
import { useLiveLogController } from '../controller/use-live-log-controller';
import { availableLogColumns } from '../model/explore-log-columns';
import { useLogView } from '../controller/use-log-view';
import { buildExplorePath, mergeExploreQuery, type LogExploreQuery } from '../model/explore-model';
import type { LogInspectorFilterControls } from '../model/explore-log-inspector-filter';
import { LogStreamResult } from '../components/log-stream-result';
import { ExploreLogResultOptions } from '../components/explore-log-result-options';
import styles from '../components/explore-live-log.module.css';
import { LogViewNotice } from '../components/explore-log-view-notice';
export function LiveLogPanel(
  props: LogInspectorFilterControls & { query: LogExploreQuery; openPath: (path: string) => void }
) {
  const { t } = useTranslation();
  const { query, openPath } = props;
  const copyLabels = {
    copyOptions: t('explore.logCopy.copyOptions'),
    copied: t('explore.logCopy.copied'),
    menu: t('explore.logCopy.menu'),
    copyTimestamp: t('explore.logCopy.copyTimestamp'),
    copyTimestampDescription: t('explore.logCopy.copyTimestampDescription'),
    copyMessage: t('explore.logCopy.copyMessage'),
    copyMessageDescription: t('explore.logCopy.copyMessageDescription'),
    copyJson: t('explore.logCopy.copyJson'),
    copyJsonDescription: t('explore.logCopy.copyJsonDescription')
  };
  const live = useLiveLogController(query);
  const display = useLogView(query, logView => openPath(buildExplorePath(mergeExploreQuery(query, { logView }))));
  return (
    <>
      <LogViewNotice display={display} />
      <div className={styles.controls}>
        <ExploreLogResultOptions
          logColumns={display.logColumns}
          availableColumns={availableLogColumns(live.rows)}
          query={query}
          preferences={display.preferences}
          onPreferencesChange={display.onPreferencesChange}
          t={t}
        />
      </div>
      <LogStreamResult
        {...props}
        query={query}
        t={t}
        navigate={openPath}
        stream={live}
        logDisplay={{
          ...display.preferences,
          copyLabels,
          onShowTimeChange: showTime => display.onPreferencesChange({ ...display.preferences, showTime }),
          onShowContentChange: showContent => display.onPreferencesChange({ ...display.preferences, showContent })
        }}
        logColumns={display.logColumns}
        evidenceIdentity={live.evidenceIdentity}
      />
    </>
  );
}
