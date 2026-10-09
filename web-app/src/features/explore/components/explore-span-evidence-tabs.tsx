/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import type { HertzBeatTraceGanttQueryOutcome } from '@/platform/perses';
import type { SpanFilterControls } from '../model/explore-span-filter';
import { SpanSearchFields } from './explore-span-fields';
import { SpanRelationships } from './explore-span-relationships';
import { SpanEvents } from './explore-span-events';

type Span = NonNullable<Extract<HertzBeatTraceGanttQueryOutcome, { state: 'ready' }>['data']['spans']>[number];
type Props = SpanFilterControls & {
  span: Span;
  spans: Span[];
  onSelect: (id: string | undefined) => void;
  logsDisabled?: boolean | undefined;
};

export function SpanEvidenceTabs(props: Props) {
  const { t } = useTranslation();
  return (
    <Tabs
      size="small"
      items={[
        {
          key: 'fields',
          label: t('exploreInvestigation.trace.fields'),
          children: (
            <SpanSearchFields
              span={props.span}
              onAddSpanFilter={props.onAddSpanFilter}
              onApplySpanFilters={props.onApplySpanFilters}
              spanFilterDisabledReason={props.spanFilterDisabledReason}
              spanFilterPending={props.spanFilterPending}
            />
          )
        },
        {
          key: 'relationships',
          label: t('exploreInvestigation.trace.relationships.tab'),
          children: (
            <SpanRelationships
              disabled={props.logsDisabled}
              span={props.span}
              spans={props.spans}
              onSelect={props.onSelect}
            />
          )
        },
        {
          key: 'events',
          label: t('exploreInvestigation.trace.eventDetails.tab', { count: props.span.events?.length ?? 0 }),
          children: <SpanEvents key={props.span.spanId} events={props.span.events} />
        }
      ]}
    />
  );
}
