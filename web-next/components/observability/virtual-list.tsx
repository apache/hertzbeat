'use client';

import * as React from 'react';
import { Virtuoso, type FollowOutput, type ListRange, type VirtuosoHandle } from 'react-virtuoso';
import { cn } from '../../lib/utils';

export type VirtualListProps<T> = {
  data: T[];
  className?: string;
  height?: number | string;
  listRef?: React.Ref<VirtuosoHandle>;
  scrollerRef?: (ref: HTMLElement | null | Window) => void;
  computeItemKey?: (index: number, item: T) => React.Key;
  followOutput?: FollowOutput;
  atBottomStateChange?: (atBottom: boolean) => void;
  rangeChanged?: (range: ListRange) => void;
  defaultItemHeight?: number;
  itemContent: (index: number, item: T) => React.ReactNode;
};

export function VirtualList<T>({
  data,
  className,
  height = 480,
  listRef,
  scrollerRef,
  computeItemKey,
  followOutput,
  atBottomStateChange,
  rangeChanged,
  defaultItemHeight,
  itemContent
}: VirtualListProps<T>) {
  return (
    <div className={cn('overflow-hidden rounded-[6px] border border-[hsl(var(--border))] bg-[hsl(var(--card))]', className)}>
      <Virtuoso
        ref={listRef}
        data={data}
        style={{ height }}
        scrollerRef={scrollerRef}
        computeItemKey={computeItemKey}
        followOutput={followOutput}
        atBottomStateChange={atBottomStateChange}
        rangeChanged={rangeChanged}
        defaultItemHeight={defaultItemHeight}
        itemContent={(index, item) => <div className="border-t border-[hsl(var(--border))] first:border-t-0">{itemContent(index, item)}</div>}
      />
    </div>
  );
}
