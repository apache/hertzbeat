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
