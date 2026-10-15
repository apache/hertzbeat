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

import isEqual from 'lodash/isEqual';
import { parseHertzBeatDashboardDocument, type HertzBeatDashboardDocument } from '@/platform/perses';

type GridItems = HertzBeatDashboardDocument['spec']['layouts'][0]['spec']['items'];

export function blankDashboard(key: string, title: string): HertzBeatDashboardDocument {
  return parseHertzBeatDashboardDocument({
    kind: 'Dashboard',
    metadata: { name: key, project: 'hertzbeat' },
    spec: {
      display: { name: title },
      duration: '30m',
      variables: [],
      panels: {},
      layouts: [{ kind: 'Grid', spec: { items: [] } }]
    }
  });
}

export function copyDashboard(
  document: HertzBeatDashboardDocument,
  key: string,
  title: string
): HertzBeatDashboardDocument {
  return parseHertzBeatDashboardDocument({
    ...document,
    metadata: { ...document.metadata, name: key },
    spec: {
      ...document.spec,
      display: { ...document.spec.display, name: title.length <= 255 ? title : document.spec.display.name }
    }
  });
}

export function appendDashboardPanel(
  document: HertzBeatDashboardDocument,
  incoming: HertzBeatDashboardDocument,
  id: string,
  sourceId: string
): HertzBeatDashboardDocument {
  const source = parseHertzBeatDashboardDocument(incoming);
  if (!Object.hasOwn(source.spec.panels, sourceId) || Object.hasOwn(document.spec.panels, id))
    throw new Error('Invalid panel identity');
  const sourceItem = source.spec.layouts[0].spec.items.find(item => item.content.$ref === '#/spec/panels/' + sourceId);
  if (!sourceItem) throw new Error('Missing panel layout');
  const next = structuredClone(document);
  for (const variable of source.spec.variables) {
    const existing = next.spec.variables.find(item => item.spec.name === variable.spec.name);
    if (existing && !isEqual(existing, variable)) throw new Error('Conflicting variable definition');
    if (!existing) next.spec.variables.push(variable);
  }
  next.spec.panels[id] = source.spec.panels[sourceId]!;
  const items = next.spec.layouts[0].spec.items;
  items.push({
    x: 0,
    y: Math.max(0, ...items.map(item => item.y + item.height)),
    width: 24,
    height: sourceItem.height,
    content: { $ref: '#/spec/panels/' + id }
  });
  return parseHertzBeatDashboardDocument(next);
}

export function updateDashboardLayout(
  document: HertzBeatDashboardDocument,
  items: GridItems
): HertzBeatDashboardDocument {
  return parseHertzBeatDashboardDocument({
    ...document,
    spec: { ...document.spec, layouts: [{ kind: 'Grid', spec: { items } }] }
  });
}

export function removeDashboardPanel(document: HertzBeatDashboardDocument, id: string): HertzBeatDashboardDocument {
  const next = structuredClone(document);
  delete next.spec.panels[id];
  next.spec.layouts[0].spec.items = next.spec.layouts[0].spec.items.filter(
    item => item.content.$ref !== '#/spec/panels/' + id
  );
  return next;
}

export function projectDashboardItems(items: GridItems, narrow: boolean): GridItems {
  if (!narrow) return items;
  let y = 0;
  return items.map(item => {
    const projected = { ...item, x: 0, y, width: 24 };
    y += item.height;
    return projected;
  });
}
