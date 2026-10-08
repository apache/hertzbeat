/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { UndoOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import type { TFunction } from 'i18next';

import type { LogQueryBuilderViewModel } from '../model/explore-log-builder-model';
import type { ExploreQuery } from '../model/explore-model';
import { hasUnappliedExploreDraft } from '../model/explore-saved-query-view-model';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import styles from './explore-query-bar.module.css';

export function ExploreQueryActions({
  query,
  submission,
  editor,
  t,
  compactReset = false,
  runDisabled = false
}: {
  query: ExploreQuery;
  submission: ExploreSubmissionViewModel;
  editor: LogQueryBuilderViewModel;
  refresh: () => Promise<void>;
  t: TFunction;
  compactReset?: boolean;
  runDisabled?: boolean;
  refreshFirst?: boolean;
}) {
  const resetAvailable = hasUnappliedExploreDraft(query, submission.draft) || !editor.valid;
  const reset = () => {
    editor.reset();
    submission.resetDraft();
  };
  return (
    <div className={styles.commandActions} data-log-query-actions={compactReset || undefined}>
      {compactReset && resetAvailable && (
        <Tooltip title={t('explore.resetChanges')}>
          <Button
            type="text"
            aria-label={t('explore.resetChanges')}
            icon={<UndoOutlined aria-hidden />}
            onClick={reset}
          />
        </Tooltip>
      )}
      <Button
        className={styles.run ?? ''}
        type="primary"
        htmlType="submit"
        autoInsertSpace={false}
        disabled={runDisabled}
      >
        {t('common.query')}
      </Button>
      {!compactReset && resetAvailable && (
        <Button type="text" onClick={reset}>
          {t('explore.resetChanges')}
        </Button>
      )}
    </div>
  );
}
