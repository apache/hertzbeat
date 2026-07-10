// @vitest-environment jsdom

import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { StatusSettingSurface } from './status-setting-surface';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let interactionContainer: HTMLDivElement | null = null;
let interactionRoot: Root | null = null;

afterEach(() => {
  if (interactionRoot) {
    act(() => {
      interactionRoot?.unmount();
    });
  }
  interactionContainer?.remove();
  interactionContainer = null;
  interactionRoot = null;
});

function buildStatusSettingSurfaceProps(
  t: ReturnType<typeof createTranslatorMock>,
  overrides: Partial<React.ComponentProps<typeof StatusSettingSurface>> = {}
): React.ComponentProps<typeof StatusSettingSurface> {
  return {
    t,
    data: {
      org: { id: 1, name: 'HB Status', description: 'Service health', state: 0 },
      components: [{ id: 1, name: 'API', description: 'public api', state: 0 }],
      incidents: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 }
    },
    mode: 'component',
    editingOrg: false,
    orgDraft: { name: 'HB Status', state: '0', description: 'Service health', home: '', feedback: '', logo: '', color: '' },
    savingOrg: false,
    orgMessage: null,
    orgError: null,
    editingComponent: false,
    componentDraft: { name: '', description: '', labelsText: '', method: '1', configState: '0', state: '0' },
    savingComponent: false,
    componentMessage: null,
    componentError: null,
    selectedComponentId: null,
    editingIncident: false,
    incidentDraft: { name: '', state: '0', componentIdsText: '', message: '' },
    savingIncident: false,
    incidentMessage: null,
    incidentError: null,
    selectedIncidentId: null,
    incidentSearchInput: '',
    formatTime: () => '-',
    publicStatusHref: '/status',
    onEditOrg: () => {},
    onModeChange: () => {},
    onNewComponent: () => {},
    onEditComponent: () => {},
    onDeleteComponent: () => {},
    onNewIncident: () => {},
    onEditIncident: () => {},
    onDeleteIncident: () => {},
    onOrgDraftChange: () => {},
    onSaveOrg: () => {},
    onCancelOrg: () => {},
    onComponentDraftChange: () => {},
    onSaveComponent: () => {},
    onCancelComponent: () => {},
    onSelectComponent: () => {},
    onIncidentDraftChange: () => {},
    onSaveIncident: () => {},
    onCancelIncident: () => {},
    onSelectIncident: () => {},
    onIncidentSearchInputChange: () => {},
    onCommitIncidentSearch: () => {},
    onResetIncidentSearch: () => {},
    onIncidentPageIndexChange: () => {},
    onIncidentPageSizeChange: () => {},
    onIncidentPrevious: () => {},
    onIncidentNext: () => {},
    ...overrides
  };
}

describe('status setting surface', () => {
  it('labels status org and dialog fields for assistive technology', () => {
    const t = createTranslatorMock({
      locale: 'zh-CN'
    });

    const componentHtml = renderToStaticMarkup(
      <StatusSettingSurface
        {...buildStatusSettingSurfaceProps(t, {
          editingComponent: true,
          componentError: t('setting.status.validation.component-name')
        })}
      />
    );

    expect(componentHtml).toContain('name="status_org_name"');
    expect(componentHtml).toContain(`aria-label="${t('setting.status.org.name')}"`);
    expect(componentHtml).toContain('data-status-setting-field-input="org-name"');
    expect(componentHtml).toContain(`aria-label="${t('common.dialog.close')}"`);
    expect(componentHtml).not.toContain('aria-label="Close dialog"');
    expect(componentHtml).toContain('name="status_component_name"');
    expect(componentHtml).toContain(`aria-label="${t('setting.status.components.name')}"`);
    expect(componentHtml).toContain('data-status-dialog-input="component-name"');
    expect(componentHtml).toContain('name="status_component_description"');
    expect(componentHtml).toContain('data-status-dialog-input="component-description"');
    expect(componentHtml).toContain(`aria-label="${t('setting.status.component.description')}"`);
    expect(componentHtml).not.toContain(`aria-label="${t('setting.status.org.description')}" name="status_component_description"`);

    const incidentHtml = renderToStaticMarkup(
      <StatusSettingSurface
        {...buildStatusSettingSurfaceProps(t, {
          mode: 'incident',
          editingIncident: true,
          incidentError: t('setting.status.validation.incident-name')
        })}
      />
    );

    expect(incidentHtml).toContain(`aria-label="${t('common.dialog.close')}"`);
    expect(incidentHtml).not.toContain('aria-label="Close dialog"');
    expect(incidentHtml).toContain('name="status_incident_name"');
    expect(incidentHtml).toContain(`aria-label="${t('setting.status.incidents.name')}"`);
    expect(incidentHtml).toContain('data-status-dialog-input="incident-name"');
    expect(incidentHtml).toContain('name="status_incident_message"');
    expect(incidentHtml).toContain(`aria-label="${t('setting.status.incidents.message')}"`);
    expect(incidentHtml).toContain('data-status-dialog-input="incident-message"');
    expect(incidentHtml).toContain('data-status-command-action="incident-cancel"');
    expect(incidentHtml).toContain('data-status-command-action="incident-save"');
  }, 15000);

  it('moves focus to the first invalid component and incident fields', async () => {
    const t = createTranslatorMock({
      locale: 'zh-CN'
    });

    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <StatusSettingSurface
          {...buildStatusSettingSurfaceProps(t, {
            editingComponent: true,
            componentError: t('setting.status.validation.component-name')
          })}
        />
      );
      await new Promise(resolve => window.setTimeout(resolve, 50));
    });

    expect(document.activeElement).toBe(interactionContainer.querySelector('[name="status_component_name"]'));

    await act(async () => {
      interactionRoot?.render(
        <StatusSettingSurface
          {...buildStatusSettingSurfaceProps(t, {
            mode: 'incident',
            editingIncident: true,
            incidentError: t('setting.status.validation.incident-name')
          })}
        />
      );
      await new Promise(resolve => window.setTimeout(resolve, 50));
    });

    expect(document.activeElement).toBe(interactionContainer.querySelector('[name="status_incident_name"]'));
  }, 15000);

  it('guards novice incident updates and deletion behind row selection, menu, and confirmation', () => {
    const t = createTranslatorMock();
    const incident = {
      id: 2,
      name: 'Checkout degradation',
      state: 1,
      contents: [{ id: 20, message: 'Payment latency is elevated', state: 1, createTime: '2026-07-08T10:00:00Z' }],
      components: [{ id: 1, name: 'API' }],
      startTime: '2026-07-08T10:00:00Z'
    };
    const onSelectIncident = vi.fn();
    const onEditIncident = vi.fn();
    const onDeleteIncident = vi.fn();

    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    act(() => {
      interactionRoot?.render(
        <StatusSettingSurface
          {...buildStatusSettingSurfaceProps(t, {
            mode: 'incident',
            data: {
              org: { id: 1, name: 'HB Status', description: 'Service health', state: 0 },
              components: [{ id: 1, name: 'API', description: 'public api', state: 0 }],
              incidents: { content: [incident], totalElements: 1, pageIndex: 0, pageSize: 8 }
            },
            onSelectIncident,
            onEditIncident,
            onDeleteIncident
          })}
        />
      );
    });

    const row = interactionContainer.querySelector('[data-status-incident-row="2"]') as HTMLElement;
    const updateButton = row.querySelector('[data-status-command-action="incident-row-update"]') as HTMLButtonElement;
    act(() => {
      updateButton.click();
    });

    expect(onSelectIncident).toHaveBeenCalledWith(2);
    expect(onEditIncident).toHaveBeenCalledWith(incident);

    const menuTrigger = interactionContainer.querySelector(
      '[data-status-command-action="incident-row-more"]'
    ) as HTMLButtonElement;
    act(() => {
      menuTrigger.click();
    });

    expect(
      interactionContainer
        .querySelector('[data-status-incident-delete-menu-panel="incident-2"]')
        ?.getAttribute('data-status-row-delete-menu-panel-open')
    ).toBe('true');

    const deleteTrigger = interactionContainer.querySelector(
      '[data-status-command-action="incident-row-delete"]'
    ) as HTMLButtonElement;
    act(() => {
      deleteTrigger.click();
    });

    expect(interactionContainer.querySelector('[data-status-delete-confirm-state="open"]')).toBeTruthy();
    expect(interactionContainer.textContent).toContain('Checkout degradation');
    expect(onDeleteIncident).not.toHaveBeenCalled();

    act(() => {
      (interactionContainer.querySelector('[data-status-command-action="delete-cancel"]') as HTMLButtonElement).click();
    });
    expect(interactionContainer.querySelector('[data-status-delete-confirm-state="closed"]')).toBeTruthy();
    expect(onDeleteIncident).not.toHaveBeenCalled();

    act(() => {
      menuTrigger.click();
    });
    act(() => {
      (interactionContainer.querySelector('[data-status-command-action="incident-row-delete"]') as HTMLButtonElement).click();
    });
    act(() => {
      (interactionContainer.querySelector('[data-status-command-action="delete-confirm"]') as HTMLButtonElement).click();
    });

    expect(onDeleteIncident).toHaveBeenCalledTimes(1);
    expect(onDeleteIncident).toHaveBeenCalledWith(incident);
  });

  it('renders the cold-matte status page org form, tabs, toolbar, and component table', () => {
    const t = createTranslatorMock({
      locale: 'zh-CN'
    });

    const html = renderToStaticMarkup(
      <StatusSettingSurface
        t={t}
        data={{
          org: { id: 1, name: 'HB Status', description: 'Service health', state: 0, home: 'https://hb.dev', feedback: 'mailto:ops@hb.dev' },
          components: [{ id: 1, name: 'API', description: 'public api', state: 0, method: 1, labels: { source: 'codex-smoke' }, gmtUpdate: 1712730000000 }],
          incidents: {
            content: [{ id: 2, name: 'Incident A', state: 1, components: [{ id: 1 }], contents: [{ message: 'Investigating', state: 1, timestamp: 10 }], pageIndex: 0 }],
            totalElements: 17,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        mode="component"
        editingOrg
        orgDraft={{ name: 'HB Status', state: '0', description: 'Service health', home: 'https://hb.dev', feedback: 'mailto:ops@hb.dev', logo: '', color: '' }}
        savingOrg={false}
        orgMessage={null}
        orgError={null}
        editingComponent
        componentDraft={{ name: 'API', description: 'public api', labelsText: 'env:prod', method: '1', configState: '0', state: '0' }}
        savingComponent={false}
        componentMessage={null}
        componentError={t('status.component.notify.need-org')}
        selectedComponentId={1}
        editingIncident={false}
        incidentDraft={{ name: '', state: '0', componentIdsText: '', message: '' }}
        savingIncident={false}
        incidentMessage={null}
        incidentError={null}
        selectedIncidentId={2}
        incidentSearchInput=""
        formatTime={() => '2026-04-10 18:00:00'}
        publicStatusHref="/status"
        onEditOrg={() => {}}
        onModeChange={() => {}}
        onNewComponent={() => {}}
        onEditComponent={() => {}}
        onDeleteComponent={() => {}}
        onNewIncident={() => {}}
        onEditIncident={() => {}}
        onDeleteIncident={() => {}}
        onOrgDraftChange={() => {}}
        onSaveOrg={() => {}}
        onCancelOrg={() => {}}
        onComponentDraftChange={() => {}}
        onSaveComponent={() => {}}
        onCancelComponent={() => {}}
        onSelectComponent={() => {}}
        onIncidentDraftChange={() => {}}
        onSaveIncident={() => {}}
        onCancelIncident={() => {}}
        onSelectIncident={() => {}}
        onIncidentSearchInputChange={() => {}}
        onCommitIncidentSearch={() => {}}
        onResetIncidentSearch={() => {}}
        onIncidentPageIndexChange={() => {}}
        onIncidentPageSizeChange={() => {}}
        onIncidentPrevious={() => {}}
        onIncidentNext={() => {}}
      />
    );

    expect(html).toContain('data-status-setting-surface="otlp-hertzbeat-ui-status-console"');
    expect(html).toContain('data-status-setting-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-status-setting-mutation-feedback="angular-notify-keys"');
    expect(html).toContain('data-status-setting-mutation-feedback-owner="route-action-feedback-contract"');
    expect(html).toContain('data-status-header="hertzbeat-ui-compact-header"');
    expect(html).toContain('data-status-header-nesting-contract="flat-page-introduction"');
    expect(html).toContain('class="p-0"');
    expect(html).toContain('data-status-command-row="standard-equal-buttons"');
    expect(html).toContain('data-status-command-action="page-refresh"');
    expect(html).toContain('data-status-command-action="org-save"');
    expect(html).toContain('data-status-command-action="tab-component"');
    expect(html).toContain('data-status-command-action="tab-incident"');
    expect(html).toContain('data-status-command-action="component-refresh"');
    expect(html).toContain('data-status-command-action="component-new"');
    expect(html).toContain('data-status-command-action="component-public"');
    expect(html).toContain('data-status-command-action="incident-refresh"');
    expect(html).toContain('data-status-command-action="incident-new"');
    expect(html).toContain('data-status-command-action="incident-public"');
    expect(html.match(/data-status-action-help-style="icon-after-action"/g) || []).toHaveLength(7);
    expect(html).not.toContain('data-status-action-help-style="literal-question-after-action"');
    expect(html).toContain('data-status-help-style="icon-after-action"');
    expect(html).toContain('data-status-help-visual="circle-help-icon"');
    expect(html).toContain('data-status-help-icon="lucide-circle-help"');
    [
      'page-refresh',
      'component-refresh',
      'component-new',
      'component-public',
      'incident-refresh',
      'incident-new',
      'incident-public'
    ].forEach(actionId => {
      expect(html).toContain(`data-status-action-help="${actionId}"`);
      expect(html).toContain(`data-status-action-help-tooltip="${actionId}"`);
    });
    expect(html).toContain(t('setting.status.action.refresh.help'));
    expect(html).toContain(t('setting.status.action.public.help'));
    expect(html).toContain(t('setting.status.components.action.refresh.help'));
    expect(html).toContain(t('setting.status.components.action.new.help'));
    expect(html).toContain(t('setting.status.incidents.action.refresh.help'));
    expect(html).toContain(t('setting.status.incidents.action.new.help'));
    expect(html).not.toContain('data-status-header-public-link');
    expect(html).toContain('data-status-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-status-org-form="hertzbeat-ui-settings-form"');
    expect(html.match(/data-status-setting-field-help-trigger="hertzbeat-ui-field-help"/g) || []).toHaveLength(6);
    expect(html.match(/data-status-setting-field-help-style="icon-after-label"/g) || []).toHaveLength(6);
    expect(html.match(/data-status-setting-field-help-visual="circle-help-icon"/g) || []).toHaveLength(6);
    expect(html.match(/data-status-setting-field-help-icon="lucide-circle-help"/g) || []).toHaveLength(6);
    expect(html).not.toContain('data-status-setting-field-help-style="literal-question-after-label"');
    expect(html.match(/data-status-setting-field-requirement-badge="required"/g) || []).toHaveLength(5);
    expect(html.match(/data-status-setting-field-requirement-badge="optional"/g) || []).toHaveLength(1);
    expect(html.match(/data-status-setting-field-input-mode-badge="manual"/g) || []).toHaveLength(6);
    expect(html.match(/data-status-setting-field-input-mode="manual"/g) || []).toHaveLength(6);
    expect(html.match(/data-status-setting-field-requirement="required"/g) || []).toHaveLength(5);
    expect(html.match(/data-status-setting-field-requirement="optional"/g) || []).toHaveLength(1);
    [
      'org-name',
      'org-description',
      'org-home',
      'org-logo',
      'org-feedback',
      'org-color'
    ].forEach(fieldKey => {
      expect(html).toContain(`data-status-setting-field-help-key="${fieldKey}"`);
      expect(html).toContain('data-status-setting-field-help-placement="inline-label"');
    });
    expect(html).toContain('data-status-tabs="hertzbeat-ui-segmented-tabs"');
    expect(html).toContain('data-status-tab-refresh-contract="angular-nz-tab-click-load"');
    expect(html).toContain('data-status-tab-refresh-owner="route-refresh-contract"');
    expect(html).toContain('data-status-tab-refresh-mode="component"');
    expect(html).toContain('data-status-tab-refresh-mode="incident"');
    expect(html).toContain('data-status-component-toolbar="hertzbeat-ui-table-toolbar"');
    expect(html).toContain('data-status-component-refresh-contract="angular-sync-component"');
    expect(html).toContain('data-status-component-refresh-owner="route-refresh-contract"');
    expect(html).toContain('data-status-public-link-contract="angular-tab-toolbar-conditional"');
    expect(html).toContain('data-status-public-link-owner="status-tab-toolbar"');
    expect(html).toContain('data-status-public-link-mode="component"');
    expect(html).toContain('data-status-public-link-mode="incident"');
    expect(html).toContain('data-status-incident-search-owner="shared-search-row"');
    expect(html).toContain('data-status-incident-refresh-contract="angular-sync-incidence"');
    expect(html).toContain('data-status-incident-refresh-owner="route-refresh-contract"');
    expect(html).toContain('data-status-incident-pagination="hertzbeat-ui-dense-pagination"');
    expect(html).toContain('data-status-incident-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(html).toContain('data-status-incident-pagination-contract="angular-search-pagination"');
    expect(html).toContain('data-hz-ui="pagination-bar"');
    expect(html).toContain('data-hz-pagination-page-size="select-menu"');
    expect(html).toContain('data-hz-pagination-page-jump="number-input"');
    expect(html).toContain('data-status-incident-pagination-page-size-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-status-incident-pagination-page-jump-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-hz-search-input="fixed-width-direct"');
    expect(html).toContain('data-hz-search-chrome="no-extra-input-shell"');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).toContain('data-status-component-table-shell="hertzbeat-ui-dense-table"');
    expect(html).toContain('data-status-component-table="hertzbeat-ui-component-table"');
    expect(html).toContain('data-status-component-row-actions="hertzbeat-ui-icon-actions"');
    expect(html).toContain('data-status-command-action="component-row-edit"');
    expect(html).toContain('data-status-command-action="component-row-more"');
    expect(html).toContain('data-status-command-action="component-row-delete"');
    expect(html).toContain('data-status-row-action-help="component-edit"');
    expect(html).toContain('data-status-row-action-help="component-delete"');
    expect(html).toContain('data-status-row-action-help-tooltip="component-edit"');
    expect(html).toContain('data-status-row-action-help-tooltip="component-delete"');
    expect(html).toContain('data-status-row-action-help-style="icon-after-action"');
    expect(html).not.toContain('data-status-row-action-help-style="literal-question-after-action"');
    expect(html).toContain(t('setting.status.components.row-edit.help'));
    expect(html).toContain(t('setting.status.components.row-delete.help'));
    expect(html).toContain('data-status-command-action="incident-row-update"');
    expect(html).toContain('data-status-command-action="incident-row-more"');
    expect(html).toContain('data-status-command-action="incident-row-delete"');
    expect(html).toContain('data-status-row-delete-menu-contract="angular-ellipsis-dropdown-delete"');
    expect(html).toContain('data-status-component-delete-menu-contract="angular-ellipsis-dropdown-delete"');
    expect(html).toContain('data-status-incident-delete-menu-contract="angular-ellipsis-dropdown-delete"');
    expect(html).toContain('data-status-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"');
    expect(html).not.toContain('data-status-summary-rail=');
    expect(html).toContain(t('setting.status.title'));
    expect(html).toContain(t('setting.status.org.name'));
    expect(html).toContain(t('setting.status.org.description'));
    expect(html).toContain(t('setting.status.org.home'));
    expect(html).toContain(t('setting.status.org.logo'));
    expect(html).toContain(t('setting.status.org.feedback'));
    expect(html).toContain(t('setting.status.org.color'));
    expect(html).toContain(t('setting.status.org.name.help'));
    expect(html).toContain(t('setting.status.org.name.impact'));
    expect(html).toContain(t('setting.status.org.description.help'));
    expect(html).toContain(t('setting.status.org.description.impact'));
    expect(html).toContain(t('setting.status.org.home.help'));
    expect(html).toContain(t('setting.status.org.home.impact'));
    expect(html).toContain(t('setting.status.org.logo.help'));
    expect(html).toContain(t('setting.status.org.logo.impact'));
    expect(html).toContain(t('setting.status.org.feedback.help'));
    expect(html).toContain(t('setting.status.org.feedback.impact'));
    expect(html).toContain(t('setting.status.org.color.help'));
    expect(html).toContain(t('setting.status.org.color.impact'));
    expect(html).toContain(t('setting.status.components.tab'));
    expect(html).toContain(t('setting.status.incidents.tab'));
    expect(html).toContain('HB Status');
    expect(html).toContain('/status');
    expect(html).toContain(t('setting.status.component.description.placeholder'));
    expect(html).toContain('data-status-component-dialog-feedback="error"');
    expect(html).toContain('data-status-dialog-feedback-owner="route-action-feedback-contract"');
    expect(html).toContain(t('status.component.notify.need-org'));
    expect(html.match(/data-status-dialog-field-help-trigger="hertzbeat-ui-field-help"/g) || []).toHaveLength(5);
    expect(html.match(/data-status-dialog-field-help-style="icon-after-label"/g) || []).toHaveLength(5);
    expect(html.match(/data-status-dialog-field-help-visual="circle-help-icon"/g) || []).toHaveLength(5);
    expect(html.match(/data-status-dialog-field-help-icon="lucide-circle-help"/g) || []).toHaveLength(5);
    expect(html).not.toContain('data-status-dialog-field-help-style="literal-question-after-label"');
    expect(html).not.toContain('<span aria-hidden="true">?</span>');
    expect(html.match(/aria-describedby="status-dialog-field-help-/g) || []).toHaveLength(5);
    expect(html.match(/id="status-dialog-field-help-/g) || []).toHaveLength(5);
    expect(html.match(/data-status-dialog-required-mark="hertzbeat-ui-required"/g) || []).toHaveLength(4);
    expect(html.match(/data-status-dialog-field-requirement="required"/g) || []).toHaveLength(4);
    expect(html.match(/data-status-dialog-field-requirement="optional"/g) || []).toHaveLength(1);
    expect(html.match(/data-status-dialog-field-input-mode="manual"/g) || []).toHaveLength(3);
    expect(html.match(/data-status-dialog-field-input-mode="selection"/g) || []).toHaveLength(2);
    [
      'component-name',
      'component-method',
      'component-state',
      'component-labels',
      'component-description'
    ].forEach(fieldKey => {
      expect(html).toContain(`data-status-dialog-field-help-key="${fieldKey}"`);
    });
    expect(html).toContain('data-status-component-choice-control="method"');
    expect(html).toContain('data-status-component-choice-control="state"');
    expect(html).toContain('data-status-component-choice-owner="hertzbeat-ui-radio-button-group"');
    expect(html).toContain('data-hz-radio-button-option="0"');
    expect(html).toContain('data-hz-radio-button-option="1"');
    expect(html).toContain('data-hz-radio-button-option="2"');
    expect(html).toContain(t('setting.status.components.name.help'));
    expect(html).toContain(t('setting.status.components.method.help'));
    expect(html).toContain(t('setting.status.components.state.help'));
    expect(html).toContain(t('setting.status.components.labels.help'));
    expect(html).toContain(t('setting.status.component.description.help'));
    expect(html).toContain(t('setting.status.components.new'));
    expect(html).toContain(t('setting.status.components.state'));
    expect(html).toContain(t('setting.status.components.method'));
    expect(html).toContain(t('setting.status.components.labels'));
    expect(html).toContain(t('common.edit-time'));
    expect(html).toContain(t('common.edit'));
    expect(html).toContain('API');
    expect(html).toContain(t('status.component.state.0'));
    expect(html).toContain(t('setting.status.components.method.1'));
    expect(html).toContain('source:codex-smoke');
    expect(html).toContain(t('common.button.ok'));
    expect(html).toContain('data-status-command-action="component-cancel"');
    expect(html).toContain('data-status-command-action="component-save"');
  }, 15000);

  it('hides the public status link until Angular statusOrg id and name are both available', () => {
    const t = createTranslatorMock({
      locale: 'zh-CN'
    });

    const html = renderToStaticMarkup(
      <StatusSettingSurface
        t={t}
        data={{
          org: { name: 'HB Status', description: 'Service health', state: 0 },
          components: [],
          incidents: {
            content: [],
            totalElements: 0,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        mode="incident"
        editingOrg={false}
        orgDraft={{ name: 'HB Status', state: '0', description: 'Service health', home: '', feedback: '', logo: '', color: '' }}
        savingOrg={false}
        orgMessage={null}
        orgError={null}
        editingComponent={false}
        componentDraft={{ name: '', description: '', labelsText: '', method: '1', configState: '0', state: '0' }}
        savingComponent={false}
        componentMessage={null}
        componentError={null}
        selectedComponentId={null}
        editingIncident={false}
        incidentDraft={{ name: '', state: '0', componentIdsText: '', message: '' }}
        savingIncident={false}
        incidentMessage={null}
        incidentError={null}
        selectedIncidentId={null}
        incidentSearchInput=""
        formatTime={() => '2026-04-10 18:00:00'}
        publicStatusHref="/status"
        onEditOrg={() => {}}
        onModeChange={() => {}}
        onNewComponent={() => {}}
        onEditComponent={() => {}}
        onDeleteComponent={() => {}}
        onNewIncident={() => {}}
        onEditIncident={() => {}}
        onDeleteIncident={() => {}}
        onOrgDraftChange={() => {}}
        onSaveOrg={() => {}}
        onCancelOrg={() => {}}
        onComponentDraftChange={() => {}}
        onSaveComponent={() => {}}
        onCancelComponent={() => {}}
        onSelectComponent={() => {}}
        onIncidentDraftChange={() => {}}
        onSaveIncident={() => {}}
        onCancelIncident={() => {}}
        onSelectIncident={() => {}}
        onIncidentSearchInputChange={() => {}}
        onCommitIncidentSearch={() => {}}
        onResetIncidentSearch={() => {}}
        onIncidentPageIndexChange={() => {}}
        onIncidentPageSizeChange={() => {}}
        onIncidentPrevious={() => {}}
        onIncidentNext={() => {}}
      />
    );

    expect(html).not.toContain('data-status-public-link-contract="angular-tab-toolbar-conditional"');
    expect(html).not.toContain('href="/status"');
  }, 15000);

  it('blocks new incidents with an inline prerequisite when the org profile is not saved yet', () => {
    const t = createTranslatorMock({
      locale: 'zh-CN'
    });

    const html = renderToStaticMarkup(
      <StatusSettingSurface
        t={t}
        data={{
          org: { name: '', description: '', state: 0 },
          components: [],
          incidents: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 }
        }}
        mode="incident"
        editingOrg
        orgDraft={{ name: '', state: '0', description: '', home: '', feedback: '', logo: '', color: '' }}
        savingOrg={false}
        orgMessage={null}
        orgError={null}
        editingComponent={false}
        componentDraft={{ name: '', description: '', labelsText: '', method: '1', configState: '0', state: '0' }}
        savingComponent={false}
        componentMessage={null}
        componentError={null}
        selectedComponentId={null}
        editingIncident={false}
        incidentDraft={{ name: '', state: '0', componentIdsText: '', message: '' }}
        savingIncident={false}
        incidentMessage={null}
        incidentError={null}
        selectedIncidentId={null}
        incidentSearchInput=""
        formatTime={() => '-'}
        publicStatusHref="/status"
        onEditOrg={() => {}}
        onModeChange={() => {}}
        onNewComponent={() => {}}
        onEditComponent={() => {}}
        onDeleteComponent={() => {}}
        onNewIncident={() => {}}
        onEditIncident={() => {}}
        onDeleteIncident={() => {}}
        onOrgDraftChange={() => {}}
        onSaveOrg={() => {}}
        onCancelOrg={() => {}}
        onComponentDraftChange={() => {}}
        onSaveComponent={() => {}}
        onCancelComponent={() => {}}
        onSelectComponent={() => {}}
        onIncidentDraftChange={() => {}}
        onSaveIncident={() => {}}
        onCancelIncident={() => {}}
        onSelectIncident={() => {}}
        onIncidentSearchInputChange={() => {}}
        onCommitIncidentSearch={() => {}}
        onResetIncidentSearch={() => {}}
        onIncidentPageIndexChange={() => {}}
        onIncidentPageSizeChange={() => {}}
        onIncidentPrevious={() => {}}
        onIncidentNext={() => {}}
      />
    );

    expect(html).toContain('data-status-incident-prerequisite="true"');
    expect(html).toContain('data-status-incident-prerequisite-state="missing-org"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain(t('setting.status.incidents.prerequisite.org'));
    expect(html).toMatch(/<button(?=[^>]*disabled="")(?=[^>]*data-status-incident-new-state="blocked")(?=[^>]*aria-describedby="status-incident-prerequisite")/);
  }, 15000);

  it('blocks new incidents with an inline prerequisite when no status component exists yet', () => {
    const t = createTranslatorMock({
      locale: 'zh-CN'
    });

    const html = renderToStaticMarkup(
      <StatusSettingSurface
        t={t}
        data={{
          org: { id: 1, name: 'HB Status', description: 'Service health', state: 0 },
          components: [],
          incidents: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 }
        }}
        mode="incident"
        editingOrg={false}
        orgDraft={{ name: 'HB Status', state: '0', description: 'Service health', home: '', feedback: '', logo: '', color: '' }}
        savingOrg={false}
        orgMessage={null}
        orgError={null}
        editingComponent={false}
        componentDraft={{ name: '', description: '', labelsText: '', method: '1', configState: '0', state: '0' }}
        savingComponent={false}
        componentMessage={null}
        componentError={null}
        selectedComponentId={null}
        editingIncident={false}
        incidentDraft={{ name: '', state: '0', componentIdsText: '', message: '' }}
        savingIncident={false}
        incidentMessage={null}
        incidentError={null}
        selectedIncidentId={null}
        incidentSearchInput=""
        formatTime={() => '-'}
        publicStatusHref="/status"
        onEditOrg={() => {}}
        onModeChange={() => {}}
        onNewComponent={() => {}}
        onEditComponent={() => {}}
        onDeleteComponent={() => {}}
        onNewIncident={() => {}}
        onEditIncident={() => {}}
        onDeleteIncident={() => {}}
        onOrgDraftChange={() => {}}
        onSaveOrg={() => {}}
        onCancelOrg={() => {}}
        onComponentDraftChange={() => {}}
        onSaveComponent={() => {}}
        onCancelComponent={() => {}}
        onSelectComponent={() => {}}
        onIncidentDraftChange={() => {}}
        onSaveIncident={() => {}}
        onCancelIncident={() => {}}
        onSelectIncident={() => {}}
        onIncidentSearchInputChange={() => {}}
        onCommitIncidentSearch={() => {}}
        onResetIncidentSearch={() => {}}
        onIncidentPageIndexChange={() => {}}
        onIncidentPageSizeChange={() => {}}
        onIncidentPrevious={() => {}}
        onIncidentNext={() => {}}
      />
    );

    expect(html).toContain('data-status-incident-prerequisite-state="missing-component"');
    expect(html).toContain(t('setting.status.incidents.prerequisite.components'));
    expect(html).toMatch(/<button(?=[^>]*disabled="")(?=[^>]*data-status-incident-new-state="blocked")/);
  }, 15000);

  it('renders localized table empty-cell fallbacks for missing status setting row facts', () => {
    const t = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'common.none': 'empty-status-value'
      }
    });

    const html = renderToStaticMarkup(
      <StatusSettingSurface
        t={t}
        data={{
          org: { id: 1, name: 'HB Status', description: 'Service health', state: 0, home: 'https://hb.dev', feedback: 'mailto:ops@hb.dev' },
          components: [{ id: 1, name: '', description: '', state: 0, method: 1, labels: {}, gmtUpdate: 1712730000000 }],
          incidents: {
            content: [{ id: 2, name: '', state: 1, components: [], contents: [], pageIndex: 0 }],
            totalElements: 1,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        mode="component"
        editingOrg={false}
        orgDraft={{ name: 'HB Status', state: '0', description: 'Service health', home: 'https://hb.dev', feedback: 'mailto:ops@hb.dev', logo: '', color: '' }}
        savingOrg={false}
        orgMessage={null}
        orgError={null}
        editingComponent={false}
        componentDraft={{ name: '', description: '', labelsText: '', method: '1', configState: '0', state: '0' }}
        savingComponent={false}
        componentMessage={null}
        componentError={null}
        selectedComponentId={1}
        editingIncident={false}
        incidentDraft={{ name: '', state: '0', componentIdsText: '', message: '' }}
        savingIncident={false}
        incidentMessage={null}
        incidentError={null}
        selectedIncidentId={2}
        incidentSearchInput=""
        formatTime={() => '2026-04-10 18:00:00'}
        publicStatusHref="/status"
        onEditOrg={() => {}}
        onModeChange={() => {}}
        onNewComponent={() => {}}
        onEditComponent={() => {}}
        onDeleteComponent={() => {}}
        onNewIncident={() => {}}
        onEditIncident={() => {}}
        onDeleteIncident={() => {}}
        onOrgDraftChange={() => {}}
        onSaveOrg={() => {}}
        onCancelOrg={() => {}}
        onComponentDraftChange={() => {}}
        onSaveComponent={() => {}}
        onCancelComponent={() => {}}
        onSelectComponent={() => {}}
        onIncidentDraftChange={() => {}}
        onSaveIncident={() => {}}
        onCancelIncident={() => {}}
        onSelectIncident={() => {}}
        onIncidentSearchInputChange={() => {}}
        onCommitIncidentSearch={() => {}}
        onResetIncidentSearch={() => {}}
        onIncidentPageIndexChange={() => {}}
        onIncidentPageSizeChange={() => {}}
        onIncidentPrevious={() => {}}
        onIncidentNext={() => {}}
      />
    );

    expect(html).toContain('data-status-component-row="1"');
    expect(html).toContain('data-status-incident-row="2"');
    expect((html.match(/empty-status-value/g) ?? []).length).toBeGreaterThanOrEqual(5);
  }, 15000);

  it('renders Angular-style incident edit history in descending order with shared ownership', () => {
    const t = createTranslatorMock({
      locale: 'zh-CN'
    });

    const html = renderToStaticMarkup(
      <StatusSettingSurface
        t={t}
        data={{
          org: { id: 1, name: 'HB Status', description: 'Service health', state: 0 },
          components: [{ id: 1, name: 'API', description: 'public api', state: 0 }],
          incidents: {
            content: [{ id: 2, name: 'Incident A', state: 2, components: [{ id: 1 }], contents: [], pageIndex: 0 }],
            totalElements: 1,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        mode="incident"
        editingOrg={false}
        orgDraft={{ name: 'HB Status', state: '0', description: 'Service health', home: '', feedback: '', logo: '', color: '' }}
        savingOrg={false}
        orgMessage={null}
        orgError={null}
        editingComponent={false}
        componentDraft={{ name: '', description: '', labelsText: '', method: '1', configState: '0', state: '0' }}
        savingComponent={false}
        componentMessage={null}
        componentError={null}
        selectedComponentId={1}
        editingIncident
        incidentDraft={{
          id: 2,
          name: 'Incident A',
          state: '2',
          componentIdsText: '1',
          message: 'Monitoring mitigation',
          existingContents: [
            { message: 'Monitoring mitigation after checkout rollback', state: 2, timestamp: 30 },
            { message: 'Investigating payment latency', state: 1, timestamp: 10 }
          ]
        }}
        savingIncident={false}
        incidentMessage={null}
        incidentError={t('status.component.notify.need-org')}
        selectedIncidentId={2}
        incidentSearchInput=""
        formatTime={value => (value === 30 ? '2026-05-26 03:30:00' : '2026-05-26 03:12:00')}
        publicStatusHref="/status"
        onEditOrg={() => {}}
        onModeChange={() => {}}
        onNewComponent={() => {}}
        onEditComponent={() => {}}
        onDeleteComponent={() => {}}
        onNewIncident={() => {}}
        onEditIncident={() => {}}
        onDeleteIncident={() => {}}
        onOrgDraftChange={() => {}}
        onSaveOrg={() => {}}
        onCancelOrg={() => {}}
        onComponentDraftChange={() => {}}
        onSaveComponent={() => {}}
        onCancelComponent={() => {}}
        onSelectComponent={() => {}}
        onIncidentDraftChange={() => {}}
        onSaveIncident={() => {}}
        onCancelIncident={() => {}}
        onSelectIncident={() => {}}
        onIncidentSearchInputChange={() => {}}
        onCommitIncidentSearch={() => {}}
        onResetIncidentSearch={() => {}}
        onIncidentPageIndexChange={() => {}}
        onIncidentPageSizeChange={() => {}}
        onIncidentPrevious={() => {}}
        onIncidentNext={() => {}}
      />
    );

    expect(html).toContain('data-status-incident-history-contract="angular-collapse-desc"');
    expect(html).toContain('data-status-incident-history-owner="hertzbeat-ui-status-incident-history"');
    expect(html).toContain('data-status-incident-failure-close-contract="angular-cancel-on-api-failure"');
    expect(html).toContain('data-status-incident-failure-close-owner="status-route-action-feedback"');
    expect(html).toContain('data-status-incident-dialog-feedback="error"');
    expect(html).toContain('data-status-dialog-feedback-owner="route-action-feedback-contract"');
    expect(html).toContain(t('status.component.notify.need-org'));
    expect(html).toContain('data-hz-ui="status-incident-history"');
    expect(html).toContain('data-hz-status-incident-history-row="30"');
    expect(html).toContain('data-hz-status-incident-history-row="10"');
    expect(html.indexOf('Monitoring mitigation after checkout rollback')).toBeLessThan(html.indexOf('Investigating payment latency'));
    expect(html).toContain('data-status-incident-message-input="angular-textarea"');
    expect(html).toContain('data-status-incident-message-input-owner="hertzbeat-ui-textarea"');
    expect(html).toContain('data-status-incident-message-placeholder-contract="angular-state-placeholder"');
    expect(html).toContain('data-status-incident-message-placeholder="status.incident.message.tip.2"');
    expect(html).toContain('data-hz-ui="textarea"');
    expect(html).toContain(t('status.incident.message.tip.2'));
    expect(html.match(/data-status-dialog-field-help-trigger="hertzbeat-ui-field-help"/g) || []).toHaveLength(4);
    expect(html.match(/aria-describedby="status-dialog-field-help-/g) || []).toHaveLength(4);
    expect(html.match(/id="status-dialog-field-help-/g) || []).toHaveLength(4);
    expect(html.match(/data-status-dialog-required-mark="hertzbeat-ui-required"/g) || []).toHaveLength(4);
    expect(html.match(/data-status-dialog-field-requirement="required"/g) || []).toHaveLength(4);
    expect(html.match(/data-status-dialog-field-input-mode="manual"/g) || []).toHaveLength(2);
    expect(html.match(/data-status-dialog-field-input-mode="selection"/g) || []).toHaveLength(2);
    [
      'incident-name',
      'incident-state',
      'incident-components',
      'incident-message'
    ].forEach(fieldKey => {
      expect(html).toContain(`data-status-dialog-field-help-key="${fieldKey}"`);
    });
    expect(html).toContain(t('setting.status.incidents.name.help'));
    expect(html).toContain(t('setting.status.incidents.state.help'));
    expect(html).toContain(t('setting.status.incidents.components.help'));
    expect(html).toContain(t('setting.status.incidents.message.help'));
    expect(html).toContain('data-status-incident-component-picker="angular-checkbox-group"');
    expect(html).toContain('data-status-incident-component-picker-owner="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-status-incident-component-option="1"');
    expect(html).toContain('data-hz-ui="checkbox"');
    expect(html).toContain('data-status-incident-state-control="angular-radio-buttons"');
    expect(html).toContain('data-status-incident-state-owner="hertzbeat-ui-radio-button-group"');
    expect(html).toContain('data-hz-ui="radio-button-group"');
    expect(html).toContain('data-hz-radio-button-option="2"');
    expect(html).toContain('data-hz-radio-button-checked="true"');
    expect(html).toContain(t('status.incident.history'));
    expect(html).toContain(t('status.incident.state.2'));
    expect(html).toContain(t('status.incident.state.1'));
    expect(html).toContain('data-status-incident-row-actions="hertzbeat-ui-icon-actions"');
    expect(html).toContain('data-status-row-action-help="incident-update"');
    expect(html).toContain('data-status-row-action-help="incident-delete"');
    expect(html).toContain('data-status-row-action-help-tooltip="incident-update"');
    expect(html).toContain('data-status-row-action-help-tooltip="incident-delete"');
    expect(html).toContain('data-status-row-action-help-style="icon-after-action"');
    expect(html).not.toContain('data-status-row-action-help-style="literal-question-after-action"');
    expect(html).toContain(t('setting.status.incidents.row-update.help'));
    expect(html).toContain(t('setting.status.incidents.row-delete.help'));
  }, 15000);

  it('uses the shared cold visual owner instead of Workbench or alert primitives', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/status-setting-surface.tsx'), 'utf8');

    expect(source).toContain('hzOpsCatalogVisual');
    expect(source).toContain('const hasOrgDraftValue = Boolean(');
    expect(source).toContain('const orgValues = hasOrgDraftValue');
    expect(source).toContain('description: orgDraft.description');
    expect(source).toContain("description: statusOrg.description || ''");
    expect(source).not.toContain('description: orgDraft.description || statusOrg.description ||');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain('data-status-incident-search-owner="shared-search-row"');
    expect(source).toContain('inputWidthClassName="w-[320px]"');
    expect(source).toContain('data-status-setting-surface="otlp-hertzbeat-ui-status-console"');
    expect(source).toContain('data-status-setting-style-baseline={coldStatusVisual.canvasName}');
    expect(source).toContain('data-status-setting-mutation-feedback="angular-notify-keys"');
    expect(source).toContain('data-status-setting-mutation-feedback-owner="route-action-feedback-contract"');
    expect(source).toContain('data-status-header-nesting-contract="flat-page-introduction"');
    expect(source).toContain('className="p-0"');
    expect(source).not.toContain('className={coldStatusVisual.panel.hero}');
    expect(source).toContain('data-status-admin-layout="full-width-admin-list"');
    expect(source).toContain('data-status-org-form="hertzbeat-ui-settings-form"');
    expect(source).toContain('data-status-setting-field-help-trigger="hertzbeat-ui-field-help"');
    expect(source).toContain('data-status-setting-field-help-placement="inline-label"');
    expect(source).toContain('data-status-setting-field-help-style="icon-after-label"');
    expect(source).toContain('data-status-setting-field-help-visual="circle-help-icon"');
    expect(source).toContain('data-status-setting-field-help-icon="lucide-circle-help"');
    expect(source).not.toContain('data-status-setting-field-help-style="literal-question-after-label"');
    expect(source).toContain('data-status-setting-field-requirement-badge={required ?');
    expect(source).toContain('data-status-setting-field-input-mode-badge="manual"');
    expect(source).toContain('data-status-setting-field-input-mode="manual"');
    expect(source).toContain('data-status-setting-field-requirement={required ?');
    expect(source).toContain('data-status-dialog-field-help-trigger="hertzbeat-ui-field-help"');
    expect(source).toContain('data-status-dialog-field-help-placement="inline-label"');
    expect(source).toContain('data-status-dialog-field-help-style="icon-after-label"');
    expect(source).toContain('data-status-dialog-field-help-visual="circle-help-icon"');
    expect(source).toContain('data-status-dialog-field-help-icon="lucide-circle-help"');
    expect(source).not.toContain('data-status-dialog-field-help-style="literal-question-after-label"');
    expect(source).not.toContain('<span aria-hidden="true">?</span>');
    expect(source).toContain('CircleHelp');
    expect(source).not.toContain('HelpCircle');
    expect(source).toContain('data-status-help-style={helpStyle}');
    expect(source).toContain('data-status-help-visual={helpVisual}');
    expect(source).toContain('data-status-help-icon="lucide-circle-help"');
    expect(source).toContain('group-focus-within/help:block');
    expect(source).toContain('data-status-dialog-required-mark="hertzbeat-ui-required"');
    expect(source).toContain('data-status-dialog-field-input-mode={inputMode}');
    expect(source).toContain('data-status-dialog-field-requirement={required ?');
    expect(source).toContain("'data-status-row-action-help': id");
    expect(source).toContain("'data-status-row-action-help-tooltip': id");
    expect(source).toContain("'data-status-action-help-style': helpStyle");
    expect(source).toContain("'data-status-row-action-help-style': helpStyle");
    expect(source).not.toContain("'data-status-action-help-style': 'literal-question-after-action'");
    expect(source).not.toContain("'data-status-row-action-help-style': 'literal-question-after-action'");
    expect(source).toContain("scope=\"toolbar\"");
    expect(source).toContain('data-status-component-choice-control={owner}');
    expect(source).toContain('data-status-component-choice-owner="hertzbeat-ui-radio-button-group"');
    expect(source).not.toContain("placeholder={t('setting.status.component.method.placeholder')}");
    expect(source).not.toContain("placeholder={t('setting.status.component.state.placeholder')}");
    expect(source).toContain('data-status-tab-refresh-contract="angular-nz-tab-click-load"');
    expect(source).toContain('data-status-tab-refresh-owner="route-refresh-contract"');
    expect(source).toContain('data-status-tab-refresh-mode={mode}');
    expect(source).toContain('data-status-component-refresh-contract="angular-sync-component"');
    expect(source).toContain('data-status-component-refresh-owner="route-refresh-contract"');
    expect(source).toContain('data-status-incident-refresh-contract="angular-sync-incidence"');
    expect(source).toContain('data-status-incident-refresh-owner="route-refresh-contract"');
    expect(source).toContain("onClick={() => onModeChange('incident')}");
    expect(source).toContain('const hasPublicStatusLink = statusOrg.id != null && statusOrg.name != null');
    expect(source).toContain('data-status-public-link-contract="angular-tab-toolbar-conditional"');
    expect(source).toContain('data-status-public-link-owner="status-tab-toolbar"');
    expect(source).toContain('data-status-public-link-mode="component"');
    expect(source).toContain('data-status-public-link-mode="incident"');
    expect(source).toContain('data-status-incident-pagination="hertzbeat-ui-dense-pagination"');
    expect(source).toContain('data-status-incident-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(source).toContain('data-status-incident-pagination-contract="angular-search-pagination"');
    expect(source).toContain('pageSizeOptions={[8, 15, 25].map(value => ({ value: String(value), label: String(value) }))}');
    expect(source).toContain('data-status-incident-pagination-page-size-owner');
    expect(source).toContain('data-status-incident-pagination-page-jump-owner');
    expect(source).toContain('data-status-component-table-shell="hertzbeat-ui-dense-table"');
    expect(source).toContain('data-status-component-table="hertzbeat-ui-component-table"');
    expect(source).toContain("import { HzCheckbox, HzConfirmDialog, HzPaginationBar, HzRadioButtonGroup, HzStatusIncidentHistory, HzTableRowActionButton, HzTextarea } from '@hertzbeat/ui'");
    expect(source).toContain('MoreHorizontal');
    expect(source).toContain('const [openRowActionMenuId, setOpenRowActionMenuId] = React.useState<string | null>(null)');
    expect(source).toContain('data-status-row-delete-menu-contract="angular-ellipsis-dropdown-delete"');
    expect(source).toContain('data-status-component-delete-menu-contract="angular-ellipsis-dropdown-delete"');
    expect(source).toContain('data-status-incident-delete-menu-contract="angular-ellipsis-dropdown-delete"');
    expect(source).toContain('data-status-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"');
    expect(source).toContain('HzTableRowActionButton');
    expect(source).toContain('data-status-incident-history-contract="angular-collapse-desc"');
    expect(source).toContain('data-status-incident-history-owner="hertzbeat-ui-status-incident-history"');
    expect(source).toContain('data-status-incident-failure-close-contract');
    expect(source).toContain('angular-cancel-on-api-failure');
    expect(source).toContain('data-status-incident-failure-close-owner');
    expect(source).toContain('data-status-incident-state-control="angular-radio-buttons"');
    expect(source).toContain('data-status-incident-state-owner="hertzbeat-ui-radio-button-group"');
    expect(source).toContain('data-status-incident-component-picker="angular-checkbox-group"');
    expect(source).toContain('data-status-incident-component-picker-owner="hertzbeat-ui-checkbox"');
    expect(source).toContain('data-status-incident-component-option={componentId}');
    expect(source).toContain('data-status-incident-message-input="angular-textarea"');
    expect(source).toContain('data-status-incident-message-input-owner="hertzbeat-ui-textarea"');
    expect(source).toContain('data-status-incident-message-placeholder-contract="angular-state-placeholder"');
    expect(source).toContain('data-status-incident-message-placeholder={incidentMessagePlaceholderKey(incidentDraft.state)}');
    expect(source).toContain('data-status-component-delete-confirm-trigger="angular-modal-confirm"');
    expect(source).toContain('data-status-component-delete-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('data-status-incident-delete-confirm-trigger="angular-modal-confirm"');
    expect(source).toContain('data-status-incident-delete-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('data-status-delete-confirm="angular-modal-confirm"');
    expect(source).toContain('data-status-delete-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('data-status-delete-confirm-state={deleteDialog ? \'open\' : \'closed\'}');
    expect(source).toContain('data-status-delete-confirm-dialog="angular-modal-confirm"');
    expect(source).toContain('data-status-delete-confirm-ok');
    expect(source).toContain('data-status-delete-confirm-cancel');
    expect(source).toContain('data-status-delete-confirm-kind');
    expect(source).toContain("t('setting.status.subtitle')");
    expect(source).toContain("t('setting.status.org.title')");
    expect(source).toContain("t('setting.status.org.copy')");
    expect(source).toContain("t('setting.status.delete.component.title')");
    expect(source).toContain("t('setting.status.delete.incident.title')");
    expect(source).toContain("t('setting.status.delete.confirm')");
    expect(source).toContain("t('common.no-data')");
    expect(source).toContain("t('common.button.cancel')");
    expect(source).not.toContain('\u786e\u8ba4\u5220\u9664\u7ec4\u4ef6');
    expect(source).not.toContain('\u786e\u8ba4\u5220\u9664\u7ef4\u62a4\u4e8b\u4ef6');
    expect(source).not.toContain('\u786e\u8ba4\u5220\u9664');
    expect(source).not.toContain('\u53d6\u6d88');
    expect(source).not.toContain('\u6682\u65e0\u6570\u636e');
    expect(source).not.toContain('\u7ba1\u7406\u516c\u5f00\u72b6\u6001\u9875\u7684\u7ec4\u7ec7\u6863\u6848');
    expect(source).not.toContain('\u7ec4\u7ec7\u6863\u6848');
    expect(source).not.toContain('\u516c\u5f00\u72b6\u6001\u9875\u5c55\u793a\u7684\u7ec4\u7ec7\u4fe1\u606f\u548c\u53cd\u9988\u5165\u53e3\u3002');
    expect(source).not.toContain('data-status-summary-rail');
    expect(source).not.toContain('coldStatusVisual.layout.heroGrid');
    expect(source).not.toContain('coldStatusVisual.layout.railGrid');
    expect(source).not.toContain('coldStatusVisual.signal.band');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('alert-surface-primitives');
    expect(source).not.toContain('data-status-setting-route="angular-status-page"');
    expect(source).not.toContain('data-status-org-form="angular-vertical-form"');
    expect(source).not.toContain('data-status-component-table-shell="angular-table"');
    expect(source).not.toContain('data-status-component-table="angular-nz-table"');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('SelectableEvidenceList');
    expect(source).not.toContain('ToolbarField');
    expect(source).not.toContain('ToolbarInput');
    expect(source).not.toContain('ToolbarRow');
    expect(source).not.toContain('coldStatusVisual.search.row');
    expect(source).not.toContain('coldStatusVisual.search.input');
    expect(source).not.toContain('data-cold-search-input-shell');
    expect(source).not.toContain('RowList');
    expect(source).not.toContain('buildStatusFacts');
    expect(source).not.toContain('buildStatusOrgOverviewRows');
    expect(source).not.toContain('buildStatusComponentEvidenceRows');
    expect(source).not.toContain('border-[hsl(var(--input))]');
    expect(source).not.toContain('bg-[hsl(var(--secondary)/0.7)]');
    expect(source).not.toContain('text-[hsl(var(--foreground))]');
    expect(source).not.toContain('focus-visible:border-[hsl(var(--ring)/0.34)]');
    expect(source).not.toContain('focus-visible:bg-[hsl(var(--card))]');
    expect(source).not.toContain('focus-visible:ring-[hsl(var(--ring)/0.12)]');
    expect(source).not.toContain('border-white/8');
    expect(source).not.toContain('border-white/10');
    expect(source).not.toContain('bg-white/[0.03]');
    expect(source).not.toContain('text-white/52');
    expect(source).not.toContain('rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-3');

    expect(source).toContain('border-[#2b3039]');
    expect(source).toContain('text-[#a9b0bb]');
    expect(source).toContain('text-[#858d9a]');
  });

  it('explains filtered empty incidents instead of using the generic table empty copy', () => {
    const t = createTranslatorMock({
      locale: 'zh-CN'
    });

    const html = renderToStaticMarkup(
      <StatusSettingSurface
        t={t}
        data={{
          org: { id: 1, name: 'HB Status', description: 'Service health', state: 0 },
          components: [],
          incidents: {
            content: [],
            totalElements: 0,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        mode="incident"
        editingOrg={false}
        orgDraft={{ name: 'HB Status', state: '0', description: 'Service health', home: '', feedback: '', logo: '', color: '' }}
        savingOrg={false}
        orgMessage={null}
        orgError={null}
        editingComponent={false}
        componentDraft={{ name: '', description: '', labelsText: '', method: '1', configState: '0', state: '0' }}
        savingComponent={false}
        componentMessage={null}
        componentError={null}
        selectedComponentId={null}
        editingIncident={false}
        incidentDraft={{ name: '', state: '0', componentIdsText: '', message: '' }}
        savingIncident={false}
        incidentMessage={null}
        incidentError={null}
        selectedIncidentId={null}
        incidentSearchInput="codex-no-incident-1574"
        formatTime={() => '2026-04-10 18:00:00'}
        publicStatusHref="/status"
        onEditOrg={() => {}}
        onModeChange={() => {}}
        onNewComponent={() => {}}
        onEditComponent={() => {}}
        onDeleteComponent={() => {}}
        onNewIncident={() => {}}
        onEditIncident={() => {}}
        onDeleteIncident={() => {}}
        onOrgDraftChange={() => {}}
        onSaveOrg={() => {}}
        onCancelOrg={() => {}}
        onComponentDraftChange={() => {}}
        onSaveComponent={() => {}}
        onCancelComponent={() => {}}
        onSelectComponent={() => {}}
        onIncidentDraftChange={() => {}}
        onSaveIncident={() => {}}
        onCancelIncident={() => {}}
        onSelectIncident={() => {}}
        onIncidentSearchInputChange={() => {}}
        onCommitIncidentSearch={() => {}}
        onResetIncidentSearch={() => {}}
        onIncidentPageIndexChange={() => {}}
        onIncidentPageSizeChange={() => {}}
        onIncidentPrevious={() => {}}
        onIncidentNext={() => {}}
      />
    );

    const incidentTable = html.match(/<table data-status-incident-table="hertzbeat-ui-incident-table"[\s\S]*?<\/table>/)?.[0] || '';

    expect(incidentTable).toContain('data-status-empty-row="hertzbeat-ui-table-empty"');
    expect(incidentTable).toContain('data-status-empty-title="filtered-incident"');
    expect(incidentTable).toContain('data-status-empty-copy="filtered-incident"');
    expect(incidentTable).toContain(t('setting.status.incidents.empty.filtered.title'));
    expect(incidentTable).toContain(t('setting.status.incidents.empty.filtered.copy'));
    expect(incidentTable).not.toContain(`>${t('common.no-data')}</div>`);
  });
});
