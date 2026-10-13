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

import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { TraceStructureAnalysis } from '../model/explore-trace-structure-analysis';
import { traceFlowLayout } from '../model/explore-trace-flow-layout';
import styles from './explore-trace-population.module.css';

export function ExploreTraceFlowMap({ edges }: { edges: TraceStructureAnalysis['edges'] }) {
  const { t } = useTranslation();
  const marker = useId().replaceAll(':', '');
  const layout = traceFlowLayout(edges);
  const width = Math.max(520, layout.services.length * 180);
  const x = (name: string) => 90 + layout.services.indexOf(name) * 180;
  return (
    <>
      <div className={styles.flowMapScroll}>
        <svg
          className={styles.flowMap}
          viewBox={`0 0 ${width} 210`}
          width={width}
          height={210}
          role="img"
          aria-label={t('exploreTrace.structure.flowMapLabel')}
        >
          <defs>
            <marker
              id={marker}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>
          {layout.edges.map((edge, index) => {
            const start = x(edge.sourceService),
              end = x(edge.targetService);
            const bend = Math.max(24, Math.abs(end - start) / 5) + index * 5;
            const path = `M ${start + (end > start ? 65 : -65)} 110 Q ${(start + end) / 2} ${110 - bend} ${end + (end > start ? -65 : 65)} 110`;
            return (
              <path
                key={`${edge.sourceService}:${edge.targetService}`}
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                markerEnd={`url(#${marker})`}
              >
                <title>{`${edge.sourceService} → ${edge.targetService}: ${edge.spanCount}`}</title>
              </path>
            );
          })}
          {layout.services.map(service => (
            <g key={service}>
              <rect
                x={x(service) - 65}
                y="91"
                width="130"
                height="38"
                rx="4"
                fill="var(--hb-bg-raised)"
                stroke="var(--hb-border-subtle)"
              />
              <text x={x(service)} y="115" textAnchor="middle" fill="var(--hb-text-primary)" fontSize="12">
                <title>{service}</title>
                {service.length > 17 ? `${service.slice(0, 16)}…` : service}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {layout.limited && <p className={styles.hint}>{t('exploreTrace.structure.flowMapLimited')}</p>}
    </>
  );
}
