/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import ReactGridLayout, { useContainerWidth, verticalCompactor, type Layout } from 'react-grid-layout';
import type { ReactNode, RefObject } from 'react';

import type { MonitorMetricWorkbenchController } from '../model/monitor-detail-model';
import {
  mergeMonitorMetricLayout,
  mergeMonitorMetricGridChange,
  monitorMetricLayoutViewport,
  projectMonitorMetricLayout,
  type MonitorMetricLayoutActions,
  type MonitorMetricLayoutItem,
  type MonitorMetricLayoutState
} from '../model/monitor-metric-layout-model';
import workbenchStyles from './monitor-metric-workbench.module.css';
import styles from './monitor-metric-layout.module.css';

type RealtimeGroup = MonitorMetricWorkbenchController['state']['realtimeGroups'][number];
type RealtimeLayoutProps = {
  state: MonitorMetricLayoutState;
  actions: MonitorMetricLayoutActions;
  groups: RealtimeGroup[];
  renderGroup: (group: RealtimeGroup, item: MonitorMetricLayoutItem) => ReactNode;
};

export function MonitorRealtimeLayoutGrid({ state, actions, groups, renderGroup }: RealtimeLayoutProps) {
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 960 });
  const model = realtimeLayoutModel(state, groups, width);
  if (!mounted) {
    return (
      <div ref={containerRef} className={workbenchStyles.realtimeGrid}>
        {groups.map(group => (
          <div key={group.group}>{renderGroup(group, model.byGroup.get(group.group)!)}</div>
        ))}
      </div>
    );
  }
  return (
    <RealtimeGrid
      containerRef={containerRef}
      width={width}
      model={model}
      state={state}
      actions={actions}
      groups={groups}
      renderGroup={renderGroup}
    />
  );
}

function realtimeLayoutModel(state: MonitorMetricLayoutState, groups: RealtimeGroup[], width: number) {
  const viewport = monitorMetricLayoutViewport(width);
  const groupNames = new Set(groups.map(group => group.group));
  const canonical = mergeMonitorMetricLayout(
    { ...state.layout, application: '', revision: state.revision },
    groups.map(group => group.group)
  ).items.filter(item => groupNames.has(item.group));
  const layoutViewport = state.layout.mode === 'custom' && viewport === 'tablet' ? 'desktop' : viewport;
  const projected = projectMonitorMetricLayout(canonical, layoutViewport);
  const editable = state.editing && layoutViewport === 'desktop';
  return {
    viewport,
    layoutViewport,
    projected,
    editable,
    byGroup: new Map(projected.map(item => [item.group, item]))
  };
}

function RealtimeGrid({
  containerRef,
  width,
  model,
  state,
  actions,
  groups,
  renderGroup
}: RealtimeLayoutProps & {
  containerRef: RefObject<HTMLDivElement | null>;
  width: number;
  model: ReturnType<typeof realtimeLayoutModel>;
}) {
  return (
    <div ref={containerRef} className={styles.realtimeLayoutHost} data-layout-viewport={model.viewport}>
      <ReactGridLayout
        width={width}
        layout={toGridLayout(model.projected, model.editable)}
        gridConfig={{
          cols: columnsFor(model.layoutViewport),
          rowHeight: 22,
          margin: [12, 12],
          containerPadding: [0, 0]
        }}
        dragConfig={{ enabled: model.editable, handle: '[data-layout-panel-header]', cancel: 'button, a' }}
        resizeConfig={{ enabled: model.editable, handles: ['se'] }}
        compactor={verticalCompactor}
        onDragStop={layout => applyGridChange(layout, state, actions)}
        onResizeStop={layout => applyGridChange(layout, state, actions)}
      >
        {groups.map(group => {
          const item = model.byGroup.get(group.group);
          if (!item) return null;
          return (
            <div
              key={group.group}
              className={state.editing ? styles.realtimeLayoutItemEditing : styles.realtimeLayoutItem}
              data-layout-group={group.group}
            >
              {renderGroup(group, item)}
            </div>
          );
        })}
      </ReactGridLayout>
    </div>
  );
}

function toGridLayout(items: MonitorMetricLayoutItem[], editable: boolean): Layout {
  return items.map(item => ({
    i: item.group,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: 4,
    minH: item.collapsed ? 4 : 8,
    maxW: 12,
    maxH: 24,
    static: !editable
  }));
}

function applyGridChange(layout: Layout, state: MonitorMetricLayoutState, actions: MonitorMetricLayoutActions) {
  if (!state.editing) return;
  actions.changeItems(
    mergeMonitorMetricGridChange(
      state.layout.items,
      layout.map(item => ({ group: item.i, x: item.x, y: item.y, w: item.w, h: item.h }))
    )
  );
}

function columnsFor(viewport: ReturnType<typeof monitorMetricLayoutViewport>) {
  if (viewport === 'desktop') return 12;
  if (viewport === 'tablet') return 6;
  return 1;
}
