import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  AlertSurfaceActionButton,
  AlertSurfaceActionLink,
  AlertSurfacePanel,
  AlertSurfaceTable,
  AlertSurfaceTableHead,
  AlertSurfaceTableShell,
  AlertSurfaceValuePill
} from './alert-surface-primitives';

describe('alert surface primitives', () => {
  it('own the cold alert surface chrome without workbench primitive fallbacks', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-surface-primitives.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <div>
        <AlertSurfacePanel>panel</AlertSurfacePanel>
        <AlertSurfaceTableShell>
          <AlertSurfaceTable>
            <AlertSurfaceTableHead>
              <tr>
                <th>Rule name</th>
              </tr>
            </AlertSurfaceTableHead>
            <tbody>
              <tr>
                <td>body</td>
              </tr>
            </tbody>
          </AlertSurfaceTable>
        </AlertSurfaceTableShell>
        <AlertSurfaceActionButton>Search</AlertSurfaceActionButton>
        <AlertSurfaceActionLink href="/alert/silence">View</AlertSurfaceActionLink>
        <AlertSurfaceValuePill>One-time silence</AlertSurfaceValuePill>
      </div>
    );

    expect(html).toContain('data-alert-surface-panel-owner="cold-panel"');
    expect(html).toContain('data-alert-surface-table-shell-owner="cold-dense-table"');
    expect(html).toContain('data-alert-surface-action-owner="cold-action"');
    expect(html).toContain('data-alert-surface-value-pill-owner="cold-value"');
    expect(html).toContain('rounded-[4px]');
    expect(html).toContain('rounded-[3px]');
    expect(html).toContain('h-8');
    expect(html).toContain('overflow-x-auto');
    expect(source).not.toContain("from '../workbench/primitives'");
    expect(source).not.toContain('WorkbenchTableFrame');
    expect(source).not.toContain('WorkbenchToolbarAction');
    expect(source).not.toContain('WorkbenchValuePill');
    expect(source).not.toContain('rounded-[6px]');
  });
});
