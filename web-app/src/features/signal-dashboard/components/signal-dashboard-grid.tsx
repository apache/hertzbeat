/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import ReactGridLayout, { noCompactor, useContainerWidth, type Layout } from 'react-grid-layout';
import type { RefObject } from 'react';
import { useState } from 'react';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { DashboardViewProps } from '../model/signal-dashboard-view-model';
import { projectDashboardItems, updateDashboardLayout } from '../model/signal-dashboard-authoring';
import { SignalDashboardPanel } from './signal-dashboard-panel';
import styles from './signal-dashboard.module.css';

type Props = DashboardViewProps & { select: (id: string) => void; selected: string | undefined };
export function SignalDashboardGrid(props: Props) {
  const { state, actions } = props;
  const { t } = useTranslation();
  const { width, containerRef } = useContainerWidth({ initialWidth: 960 });
  const [invalidLayout, setInvalidLayout] = useState(false);
  const items = state.document!.spec.layouts[0].spec.items;
  const editable = !!state.editor && state.editor.mode !== 'upgrade' && !state.busy;
  const narrow = width < 640;
  const layout = nativeLayout(items, narrow, editable);
  const apply = (next: Layout) => {
    try {
      actions.update(
        updateDashboardLayout(
          state.document!,
          next.map(item => ({
            x: item.x,
            y: item.y,
            width: item.w,
            height: item.h,
            content: { $ref: '#/spec/panels/' + item.i }
          }))
        )
      );
      setInvalidLayout(false);
    } catch {
      setInvalidLayout(true);
    }
  };
  return (
    <div ref={containerRef as RefObject<HTMLDivElement>} className={styles.grid}>
      {invalidLayout && (
        <Typography.Paragraph role="alert" type="danger">
          {t('signalDashboard.invalidLayout')}
        </Typography.Paragraph>
      )}
      <ReactGridLayout
        width={width}
        layout={layout}
        gridConfig={{ cols: 24, rowHeight: 30, margin: [12, 12], containerPadding: [0, 0] }}
        compactor={noCompactor}
        dragConfig={{ enabled: editable && !narrow, handle: '[data-dashboard-drag-handle]', cancel: 'button,a' }}
        resizeConfig={{ enabled: editable && !narrow, handles: ['se'] }}
        onDragStop={apply}
        onResizeStop={apply}
      >
        {layout.map(item => (
          <div key={item.i} className={styles.panel}>
            <SignalDashboardPanel {...props} panelId={item.i} />
          </div>
        ))}
      </ReactGridLayout>
    </div>
  );
}

function nativeLayout(items: Parameters<typeof projectDashboardItems>[0], narrow: boolean, editable: boolean): Layout {
  return projectDashboardItems(items, narrow).map(item => ({
    i: item.content.$ref.slice('#/spec/panels/'.length),
    x: item.x,
    y: item.y,
    w: item.width,
    h: item.height,
    minW: 1,
    maxW: 24,
    minH: 1,
    maxH: 100,
    static: !editable || narrow
  }));
}
