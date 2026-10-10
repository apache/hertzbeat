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

export function focusTraceInspector(inspector: HTMLElement) {
  const workspace = inspector.closest('[data-trace-presentation="drawer"]');
  if (!workspace) {
    inspector.focus();
    return;
  }
  inspector.focus({ preventScroll: true });
  const header = inspector.querySelector('header');
  const body = inspector.closest('.ant-drawer-body');
  const context = workspace.querySelector('[data-trace-detail-context]');
  if (!header || !body || !context) return;
  const target = header.getBoundingClientRect();
  const viewport = body.getBoundingClientRect();
  const top = Math.max(viewport.top, context.getBoundingClientRect().bottom);
  if (target.top < top || target.bottom > viewport.bottom) {
    header.scrollIntoView({ block: 'nearest' });
  }
}
