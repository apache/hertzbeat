import { useTraceSpanFilters } from '../controller/use-trace-span-filters';
/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Drawer } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import type { TFunction } from 'i18next';

import type { useExplorePageController } from '../controller/use-explore-page-controller';
import { traceBackgroundPath, traceSiblingPaths } from '../model/explore-detail-workspace-model';
import styles from '../components/explore-trace-drawer.module.css';
import { ExploreFocusedTracePage } from './explore-focused-investigation';

export function ExploreTraceDrawer({
  controller,
  t
}: {
  controller: ReturnType<typeof useExplorePageController>;
  t: TFunction;
}) {
  const spanFilters = useTraceSpanFilters(controller);
  const query = controller.focusedQuery;
  if (query.signal !== 'traces') return null;
  const siblings = traceSiblingPaths(controller.query, query, controller.result);
  return (
    <Drawer
      open
      closable={{ placement: 'end' }}
      rootClassName={styles.drawer ?? ''}
      title={t('exploreTrace.detail')}
      width="min(1280px, calc(100vw - 32px))"
      styles={{ body: { padding: 20 }, mask: { opacity: 0.2 }, wrapper: { maxWidth: '100vw' } }}
      onClose={() => controller.openPath(traceBackgroundPath(query))}
      footer={
        <div className={styles.footer}>
          <Button
            icon={<LeftOutlined />}
            disabled={!siblings.previous}
            onClick={() => siblings.previous && controller.openPath(siblings.previous)}
          >
            {t('exploreInvestigation.trace.previous')}
          </Button>
          <Button
            icon={<RightOutlined />}
            disabled={!siblings.next}
            onClick={() => siblings.next && controller.openPath(siblings.next)}
          >
            {t('exploreInvestigation.trace.next')}
          </Button>
        </div>
      }
    >
      <ExploreFocusedTracePage
        embedded
        {...spanFilters}
        query={query}
        t={t}
        updateQuery={controller.updateQuery}
        time={controller.time}
        openPath={controller.openPath}
      />
    </Drawer>
  );
}
