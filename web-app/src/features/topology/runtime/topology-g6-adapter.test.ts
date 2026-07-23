/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { externalPresentation, interaction } from '../components/topology-canvas-test-fixtures';
import { topologyG6Data, topologyG6ElementOptions } from './topology-g6-adapter';

describe('topology G6 external targets', () => {
  it('renders a stable collision-safe target and directed edge for external topology evidence', () => {
    const presentation = externalPresentation();
    const first = topologyG6Data(presentation, interaction({ kind: 'edge', edgeId: 'edge-external' }));
    const second = topologyG6Data(presentation, interaction({ kind: 'edge', edgeId: 'edge-external' }));
    const realIds = new Set(presentation.graph.nodes.map(node => node.id));
    const external = first.nodes?.find(node => node.data?.externalTarget === true);

    expect(external).toMatchObject({
      data: { edgeId: 'edge-external', externalTarget: true },
      states: ['selected'],
      style: { labelText: 'payments.example' }
    });
    expect(realIds.has(String(external?.id))).toBe(false);
    expect(second.nodes?.find(node => node.data?.externalTarget === true)?.id).toBe(external?.id);
    expect(first.edges).toEqual([
      expect.objectContaining({
        id: 'edge-external',
        source: 'node-a',
        target: external?.id,
        states: ['selected']
      })
    ]);
  });

  it('avoids edge IDs when allocating external targets and keeps every canvas edge directed', () => {
    const presentation = externalPresentation();
    const source = presentation.graph.nodes[0];
    const collision = presentation.graph.nodes[1];
    const externalEdge = presentation.graph.edges[0];
    if (!source || !collision || !externalEdge) throw new Error('The external topology fixture is incomplete.');
    const edgeCollision = {
      ...presentation,
      graph: {
        nodes: [source, { ...collision, id: 'node-b' }],
        edges: [
          {
            ...externalEdge,
            id: 'external-target:edge-external',
            targetNodeId: 'node-b',
            targetEntityId: collision.entityId,
            targetRef: null
          },
          externalEdge
        ]
      }
    };
    const data = topologyG6Data(edgeCollision, interaction());
    const external = data.nodes?.find(node => node.data?.externalTarget === true);

    expect(external?.id).not.toBe('external-target:edge-external');
    expect(topologyG6ElementOptions(palette).edge).toMatchObject({ style: { endArrow: true } });
  });
});

const palette = {
  border: '#d9d9d9',
  hover: '#1677ff',
  nodeFill: '#ffffff',
  selected: '#1677ff',
  text: '#000000'
};
