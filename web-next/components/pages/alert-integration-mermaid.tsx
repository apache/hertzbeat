import React from 'react';
import { translateAlertIntegration } from '../../lib/alert-integration/view-model';

type FlowEdge = {
  source: string;
  target: string;
};

function readFlowNode(value: string) {
  const normalized = value.trim();
  const bracketed = normalized.match(/^([A-Za-z0-9_-]+)\s*\[([^\]]+)]$/);
  if (bracketed) {
    return { id: bracketed[1], label: bracketed[2].trim(), declared: true };
  }
  const bare = normalized.match(/^([A-Za-z0-9_-]+)$/);
  return bare ? { id: bare[1], label: bare[1], declared: false } : null;
}

export function parseAlertIntegrationFlow(source: string): FlowEdge[] {
  const labels = new Map<string, string>();
  const pendingEdges: Array<{ sourceId: string; targetId: string }> = [];

  for (const line of source.split(/\r?\n/)) {
    const normalized = line.trim();
    if (!normalized || /^(graph|flowchart)\s+/i.test(normalized)) continue;
    const edge = normalized.match(/^(.+?)\s*-{1,2}>\s*(.+)$/);
    if (!edge) continue;
    const sourceNode = readFlowNode(edge[1]);
    const targetNode = readFlowNode(edge[2]);
    if (!sourceNode || !targetNode) continue;
    const sourceId = sourceNode.id.toLowerCase();
    const targetId = targetNode.id.toLowerCase();
    if (sourceNode.declared || !labels.has(sourceId)) labels.set(sourceId, sourceNode.label);
    if (targetNode.declared || !labels.has(targetId)) labels.set(targetId, targetNode.label);
    pendingEdges.push({ sourceId, targetId });
  }

  return pendingEdges.map(edge => ({
    source: labels.get(edge.sourceId) || edge.sourceId,
    target: labels.get(edge.targetId) || edge.targetId
  }));
}

export function AlertIntegrationMermaid({ source }: { source: string }) {
  const edges = parseAlertIntegrationFlow(source);
  const hasStructuredFlow = edges.length > 0;

  return (
    <figure
      data-alert-integration-mermaid={hasStructuredFlow ? 'structured-flow' : 'source-fallback'}
      data-alert-integration-diagram-runtime="semantic-html"
      className="my-3 mb-4 overflow-hidden rounded-[4px] border border-[#303743] bg-[#101217]"
      aria-label={translateAlertIntegration('alert.integration.diagram.aria')}
    >
      {hasStructuredFlow ? (
        <ol className="divide-y divide-[#252b34]" data-alert-integration-mermaid-flow="edge-list">
          {edges.map((edge, index) => (
            <li
              key={`${edge.source}-${edge.target}-${index}`}
              className="grid gap-1 px-4 py-3 sm:grid-cols-2 sm:gap-4"
              data-alert-integration-mermaid-edge={`${index + 1}`}
            >
              <span className="text-[12px] font-semibold text-[#eef2f7]">{edge.source}</span>
              <span className="text-[12px] text-[#a9b0bb]">{edge.target}</span>
            </li>
          ))}
        </ol>
      ) : (
        <pre
          className="max-w-full overflow-x-auto px-4 py-3.5 text-[12px] leading-5 text-[#a9b0bb]"
          data-alert-integration-mermaid-source="plain-text"
        >
          {source.trim()}
        </pre>
      )}
    </figure>
  );
}
