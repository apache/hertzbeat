import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AlertRuleQuickDialog } from './alert-rule-quick-dialog';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const buildAlertRuleWorkspaceHref = vi.hoisted(() =>
  vi.fn((mode: string, query: any, group: any) =>
    `/alert/${mode}?entityId=${query.entityId}&groupId=${group?.id ?? 'missing'}&serviceName=${group?.commonLabels?.service ?? 'missing'}`
  )
);

vi.mock('../ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../workbench/overlay-dialog', () => ({
  OverlayDialog: ({ open, title, kicker, footer, children }: any) =>
    open ? (
      <div data-overlay-dialog="true">
        <div>{kicker}</div>
        <div>{title}</div>
        <div>{children}</div>
        <div>{footer}</div>
      </div>
    ) : null
}));

vi.mock('./alert-silence-authoring-fields', () => ({
  AlertSilenceAuthoringFields: ({ mode }: any) => <div data-alert-silence-authoring-fields={mode}>silence-fields</div>
}));

vi.mock('./alert-inhibit-authoring-fields', () => ({
  AlertInhibitAuthoringFields: ({ mode }: any) => <div data-alert-inhibit-authoring-fields={mode}>inhibit-fields</div>
}));

vi.mock('../../lib/alert-manage/view-model', () => ({
  buildAlertRulePreviewLabelsFromText: (text: string) => (text ? [{ key: 'service', value: 'checkout' }] : []),
  buildAlertRuleQuickDialogModel: () => ({
    title: 'Create silence rule',
    summary: 'Checkout API',
    entityTitle: 'Checkout API',
    authoringTitle: 'Prefilled from the selected alert group',
    authoringCopy: 'Visible labels were copied into the quick rule draft.',
    warning: 'Warnings stay visible before entering the full workspace.',
    silenceDraft: {
      name: 'weekday',
      enable: true,
      matchAll: false,
      type: '0',
      labelsText: 'service:checkout',
      daysText: '',
      periodStart: '2026-04-20T09:00',
      periodEnd: '2026-04-20T18:00'
    },
    inhibitDraft: null
  }),
  buildAlertRuleWorkspaceHref,
  clearAlertInhibitEqualLabels: (draft: any) => draft,
  clearAlertInhibitTarget: (draft: any) => draft,
  copyAlertInhibitSourceToTarget: (draft: any) => draft,
  dropSeverityFromAlertInhibitTarget: (draft: any) => draft
}));

describe('AlertRuleQuickDialog', () => {
  const t = createTranslatorMock({
    overrides: {
      'alert.center.open-full-workspace': 'Open full workspace'
    }
  });

  it('renders the shared quick-dialog context, warning shell, and workspace action posture', () => {
    const group = {
      id: 7,
      commonLabels: { service: 'checkout' }
    } as any;
    const query = { entityId: '42' } as any;

    const html = renderToStaticMarkup(
      <AlertRuleQuickDialog
        t={t}
        mode="silence"
        group={group}
        query={query}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('data-overlay-dialog="true"');
    expect(html).toContain('data-alert-rule-dialog="silence"');
    expect(html).toContain('Create silence rule');
    expect(html).toContain('Checkout API');
    expect(html).toContain('Warnings stay visible before entering the full workspace.');
    expect(html).toContain('href="/alert/silence?entityId=42&amp;groupId=7&amp;serviceName=checkout"');
    expect(html).toContain('data-alert-rule-dialog-command-action="cancel"');
    expect(html).toContain('data-alert-rule-dialog-command-action="full-workspace"');
    expect(html).toContain('data-alert-rule-dialog-full-workspace="silence"');
    expect(html).toContain('Open full workspace');
    expect(html).not.toContain('data-alert-rule-dialog-command-action="submit"');
    expect(html.indexOf('data-alert-rule-dialog-command-action="cancel"')).toBeLessThan(
      html.indexOf('data-alert-rule-dialog-command-action="full-workspace"')
    );
    expect(html).toContain('data-alert-silence-authoring-fields="dialog"');
    expect(buildAlertRuleWorkspaceHref).toHaveBeenCalledWith('silence', query, group);
  });

  it('keeps quick create footer commands stable when inline save is enabled', () => {
    const group = {
      id: 7,
      commonLabels: { service: 'checkout' }
    } as any;
    const query = { entityId: '42' } as any;

    const html = renderToStaticMarkup(
      <AlertRuleQuickDialog
        t={t}
        mode="silence"
        group={group}
        query={query}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-rule-dialog-command-action="cancel"');
    expect(html).toContain('data-alert-rule-dialog-command-action="full-workspace"');
    expect(html).toContain('data-alert-rule-dialog-command-action="submit"');
    expect(html).toContain('data-alert-rule-dialog-submit="silence"');
    expect(html).toContain('data-alert-rule-dialog-submit-owner="alert-center-quick-dialog"');
    expect(html.indexOf('data-alert-rule-dialog-command-action="cancel"')).toBeLessThan(
      html.indexOf('data-alert-rule-dialog-command-action="full-workspace"')
    );
    expect(html.indexOf('data-alert-rule-dialog-command-action="full-workspace"')).toBeLessThan(
      html.indexOf('data-alert-rule-dialog-command-action="submit"')
    );
  });
});
