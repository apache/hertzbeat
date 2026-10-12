/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
