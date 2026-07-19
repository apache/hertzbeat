/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
  const root = normalizeHierarchyNode(result.data[0]!);
  if (root.value !== requestedApp) throw new MonitorContractError();
  return root;
}
