/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button, Dropdown, Tooltip } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { ExploreQuery } from '../model/explore-query';
import { buildExploreSharePath } from '../model/explore-share-link';
import { useEvidenceCopy } from './explore-evidence-copy';

type Props = { query: ExploreQuery; timeWindow: ExactTimeWindow | undefined; timeZone: string; dirty: boolean };
export function ExploreShareAction({ query, timeWindow, timeZone, dirty }: Props) {
  const { t } = useTranslation();
  const exact = buildExploreSharePath(query, 'exact', timeWindow, timeZone);
  const relative = buildExploreSharePath(query, 'relative', timeWindow, timeZone);
  const exactCopy = useEvidenceCopy(exact ? new URL(exact, window.location.origin).href : '');
  const relativeCopy = useEvidenceCopy(relative ? new URL(relative, window.location.origin).href : '');
  const [selected, setSelected] = useState('exact');
  const status = selected === 'exact' ? exactCopy.status : relativeCopy.status;
  return (
    <>
      <Tooltip title={t(shareHint(Boolean(exact || relative), dirty))}>
        <span>
          <Dropdown
            menu={{
              items: [
                { key: 'exact', label: t('explore.share.exact'), disabled: !exact },
                {
                  key: 'relative',
                  label: t(query.signal === 'logs' && query.live ? 'explore.share.live' : 'explore.share.relative'),
                  disabled: !relative
                }
              ],
              onClick: ({ key }) => {
                setSelected(key);
                if (key === 'exact' && exact) void exactCopy.copy();
                if (key === 'relative' && relative) void relativeCopy.copy();
              }
            }}
            trigger={['click']}
            disabled={!exact && !relative}
          >
            <Button disabled={!exact && !relative}>{t('explore.share.action')}</Button>
          </Dropdown>
        </span>
      </Tooltip>
      {status !== 'idle' && (
        <span role="status">{t(status === 'copied' ? 'explore.share.success' : 'explore.share.failure')}</span>
      )}
    </>
  );
}

function shareHint(available: boolean, dirty: boolean) {
  if (!available) return 'explore.share.unavailable';
  return dirty ? 'explore.share.applied' : 'explore.share.permission';
}
