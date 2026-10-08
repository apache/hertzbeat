/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
export function traceFlowLayout<Edge extends { sourceService: string; targetService: string }>(edges: Edge[]) {
  const visible = edges.slice(0, 20);
  const names = [...new Set(visible.flatMap(edge => [edge.sourceService, edge.targetService]))];
  const included = new Set(names.slice(0, 12));
  const shown = visible.filter(edge => included.has(edge.sourceService) && included.has(edge.targetService));
  const services = [...included].sort((a, b) => a.localeCompare(b));
  // Move a parent before its observed child. Cycles retain a stable bounded order.
  for (let pass = 0; pass < services.length; pass++) {
    let moved = false;
    for (const edge of shown) {
      const source = services.indexOf(edge.sourceService);
      const target = services.indexOf(edge.targetService);
      if (source > target) {
        services.splice(source, 1);
        services.splice(target, 0, edge.sourceService);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return { services, edges: shown, limited: shown.length < edges.length || services.length < names.length };
}
