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

import { z } from 'zod';

import { MonitorContractError, type MonitorAppHierarchyNode } from '../model/monitor-contract';
import { javaByteSchema, nonEmptyStringSchema, nullableStringSchema } from './monitor-read-schema-primitives';

type WireHierarchyNode = {
  category?: string | null | undefined;
  value: string;
  label?: string | null | undefined;
  isLeaf?: boolean | undefined;
  hide?: boolean | null | undefined;
  type?: number | null | undefined;
  unit?: string | null | undefined;
  children?: WireHierarchyNode[] | null | undefined;
};

const hierarchyNodeSchema: z.ZodType<WireHierarchyNode> = z.lazy(() =>
  z.object({
    category: nullableStringSchema.optional(),
    value: nonEmptyStringSchema,
    label: nullableStringSchema.optional(),
    isLeaf: z.boolean().optional(),
    hide: z.boolean().nullable().optional(),
    type: javaByteSchema.nullable().optional(),
    unit: nullableStringSchema.optional(),
    children: z.array(hierarchyNodeSchema).nullable().optional()
  })
);

const appHierarchySchema = z.array(hierarchyNodeSchema).length(1);
const appHierarchyCatalogSchema = z.array(hierarchyNodeSchema);

function normalizeHierarchyNode(node: WireHierarchyNode): MonitorAppHierarchyNode {
  return {
    category: node.category ?? null,
    value: node.value,
    label: node.label ?? null,
    isLeaf: node.isLeaf ?? false,
    hide: node.hide ?? null,
    type: node.type ?? null,
    unit: node.unit ?? null,
    children: (node.children ?? []).map(normalizeHierarchyNode)
  };
}

export function parseMonitorAppHierarchy(value: unknown, requestedApp: string): MonitorAppHierarchyNode {
  const result = appHierarchySchema.safeParse(value);
  if (!result.success) throw new MonitorContractError();
  const [wireRoot] = result.data;
  if (!wireRoot) throw new MonitorContractError();
  const root = normalizeHierarchyNode(wireRoot);
  if (root.value !== requestedApp) throw new MonitorContractError();
  return root;
}

export function parseMonitorAppHierarchyCatalog(value: unknown): MonitorAppHierarchyNode[] {
  const result = appHierarchyCatalogSchema.safeParse(value);
  if (!result.success) throw new MonitorContractError();
  const roots = result.data.map(normalizeHierarchyNode);
  const identities = new Set<string>();
  for (const root of roots) {
    if (identities.has(root.value)) throw new MonitorContractError();
    identities.add(root.value);
  }
  return roots;
}
