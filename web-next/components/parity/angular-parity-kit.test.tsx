import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ParityActionRow,
  ParityAppHeader,
  ParityAppShellFrame,
  ParityAuthShell,
  ParityDialogActions,
  ParityFormStack,
  ParityOperatorLayout,
  ParityPlaceholderShell,
  ParityPublicShell,
  ParitySectionHeader,
  ParitySettingsConsoleShell,
  ParityTableShell,
  ParityToolbarRow
} from './angular-parity-kit';

describe('angular parity kit', () => {
  it('renders a shared section header with dense Angular-style action posture', () => {
    const html = renderToStaticMarkup(
      <ParitySectionHeader
        kicker="Monitor"
        title="Monitor Center"
        subtitle="Angular-aligned workbench header"
        actions={
          <ParityActionRow>
            <button>Add</button>
            <button>Refresh</button>
          </ParityActionRow>
        }
      />
    );

    expect(html).toContain('data-parity-section-header="true"');
    expect(html).toContain('Monitor Center');
    expect(html).toContain('Angular-aligned workbench header');
    expect(html).toContain('Add');
    expect(html).toContain('Refresh');
  });

  it('renders shared table and dialog action shells for future page reuse', () => {
    const tableHtml = renderToStaticMarkup(
      <ParityTableShell title="Monitor Table" subtitle="Reusable dense table wrapper" actions={<button>Export</button>}>
        <table>
          <tbody>
            <tr>
              <td>website</td>
            </tr>
          </tbody>
        </table>
      </ParityTableShell>
    );
    const dialogActionsHtml = renderToStaticMarkup(
      <ParityDialogActions>
        <button>Cancel</button>
        <button>Save</button>
      </ParityDialogActions>
    );

    expect(tableHtml).toContain('data-parity-table-shell="true"');
    expect(tableHtml).toContain('Monitor Table');
    expect(tableHtml).toContain('Reusable dense table wrapper');
    expect(tableHtml).toContain('Export');
    expect(tableHtml).toContain('website');
    expect(dialogActionsHtml).toContain('data-parity-dialog-actions="true"');
    expect(dialogActionsHtml).toContain('Cancel');
    expect(dialogActionsHtml).toContain('Save');
  });

  it('renders a split operator layout with a dense toolbar row and right rail shell', () => {
    const html = renderToStaticMarkup(
      <ParityOperatorLayout
        toolbar={
          <ParityToolbarRow>
            <button>Refresh</button>
            <label>
              Scope
              <select>
                <option>All</option>
              </select>
            </label>
          </ParityToolbarRow>
        }
        main={<section>Primary operator desk</section>}
        rail={<section>Reference rail</section>}
      />
    );

    expect(html).toContain('data-parity-operator-layout="true"');
    expect(html).toContain('data-parity-toolbar-row="true"');
    expect(html).toContain('data-parity-operator-surface="true"');
    expect(html).toContain('data-parity-operator-main="true"');
    expect(html).toContain('data-parity-operator-rail="true"');
    expect(html).toContain('Refresh');
    expect(html).toContain('Scope');
    expect(html).toContain('Reference rail');
    expect(html).toContain('rounded-[10px]');
    expect(html).toContain('xl:grid-cols-[minmax(0,1fr)_minmax(288px,320px)]');
  });

  it('renders a reusable form stack for Angular-style editor spacing', () => {
    const html = renderToStaticMarkup(
      <ParityFormStack title="Monitor Form" description="Reusable editor shell" actions={<button>Reset</button>}>
        <label>
          Name
          <input defaultValue="website" />
        </label>
        <label>
          Type
          <select>
            <option>HTTP</option>
          </select>
        </label>
      </ParityFormStack>
    );

    expect(html).toContain('data-parity-form-stack="true"');
    expect(html).toContain('Monitor Form');
    expect(html).toContain('Reusable editor shell');
    expect(html).toContain('Reset');
    expect(html).toContain('Name');
    expect(html).toContain('Type');
  });

  it('exposes shared app, placeholder, auth, public, and settings-shell owners for future page rewrites', () => {
    const html = renderToStaticMarkup(
      <ParityAppShellFrame>
        <ParityAppHeader
          kicker="Workbench"
          title="Parity Foundation"
          subtitle="Shared app header"
          actions={<button>Review</button>}
        />
        <ParityPlaceholderShell
          title="Coming soon"
          subtitle="Shared placeholder shell"
          actions={<button>Track</button>}
        >
          Placeholder copy
        </ParityPlaceholderShell>
      </ParityAppShellFrame>
    );

    expect(html).toContain('data-parity-app-shell="true"');
    expect(html).toContain('data-parity-app-header="true"');
    expect(html).toContain('data-parity-placeholder-shell="true"');
    expect(html).toContain('Parity Foundation');
    expect(html).toContain('Coming soon');
    expect(html).toContain('Track');
    expect(typeof ParityAuthShell).toBe('function');
    expect(typeof ParityPublicShell).toBe('function');
    expect(typeof ParitySettingsConsoleShell).toBe('function');
  });
});
