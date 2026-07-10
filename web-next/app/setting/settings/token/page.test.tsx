// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../../test/i18n-test-helper';

(globalThis as { React?: typeof React }).React = React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    tokens: [
      {
        id: 1,
        name: 'OTLP ingestion',
        tokenMask: 'hb_xxx',
        tokenScope: 'otlp-ingest',
        workspaceId: 'default',
        creator: 'admin',
        gmtCreate: '2026-04-10T08:00:00Z',
        expireTime: '2026-04-11T08:00:00Z',
        lastUsedTime: '2026-04-10T10:00:00Z'
      },
      {
        id: 2,
        name: 'Expired token',
        tokenMask: 'hb_yyy',
        tokenScope: 'api-admin',
        workspaceId: 'default',
        creator: 'ops',
        gmtCreate: '2026-04-01T08:00:00Z',
        expireTime: '2026-04-02T08:00:00Z',
        lastUsedTime: null
      },
      {
        id: 3,
        name: 'Never expires',
        tokenMask: 'hb_zzz',
        tokenScope: 'readonly-query',
        workspaceId: 'team-a',
        creator: 'admin',
        gmtCreate: '2026-04-12T08:00:00Z',
        expireTime: null,
        lastUsedTime: null
      }
    ]
  }
}));

const apiMessageGet = vi.hoisted(() => vi.fn());
const apiGet = vi.hoisted(() => vi.fn());
const apiPost = vi.hoisted(() => vi.fn());
const apiDelete = vi.hoisted(() => vi.fn());
const loadTokenData = vi.hoisted(() => vi.fn());
const generateTokenValue = vi.hoisted(() => vi.fn());
const deleteTokenById = vi.hoisted(() => vi.fn());

vi.mock('../../../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN'
    })
  })
}));

vi.mock('../../../../components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load
  }: {
    children: (data: unknown) => React.ReactNode;
    load: () => Promise<unknown>;
  }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true">{children(mockState.renderData)}</div>;
  }
}));

vi.mock('../../../../components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../../../../components/workbench/overlay-dialog', () => ({
  OverlayDialog: ({
    open,
    title,
    footer,
    children,
    maxWidthClassName,
    maskClosable,
    overlayProps
  }: {
    open: boolean;
    title: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
    maxWidthClassName?: string;
    maskClosable?: boolean;
    overlayProps?: React.HTMLAttributes<HTMLDivElement>;
  }) => (
    <section
      data-overlay-dialog="true"
      data-open={open ? 'true' : 'false'}
      data-overlay-dialog-title={title}
      data-overlay-dialog-max-width={maxWidthClassName}
      data-overlay-dialog-mask-closable={maskClosable === false ? 'false' : undefined}
      {...overlayProps}
    >
      <header>{title}</header>
      <div>{children}</div>
      <footer>{footer}</footer>
    </section>
  )
}));

vi.mock('../../../../components/settings/settings-console-shell', () => ({
  SettingsConsoleTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-settings-console-title="true">{children}</div>
  )
}));

vi.mock('../../../../components/settings/settings-form', () => ({
  SettingsFormFeedback: ({ children, tone = 'info', ...props }: any) => (
    <div data-settings-form-feedback="hertzbeat-ui-settings-feedback" data-settings-form-feedback-tone={tone} {...props}>
      {children}
    </div>
  )
}));

vi.mock('../../../../components/settings/settings-dialog-form', () => ({
  SettingsDialogForm: ({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement>) => (
    <form data-settings-dialog-form="true" {...props}>{children}</form>
  ),
  SettingsDialogActionHelp: ({ id, label, body, impact }: any) => (
    <span data-settings-dialog-action-help={id} aria-label={label}>
      <span>{body}</span>
      <span>{impact}</span>
    </span>
  ),
  SettingsDialogField: ({
    label,
    children,
    help,
    required,
    requirement,
    inputMode
  }: {
    label: string;
    children: React.ReactNode;
    help?: { label: string; body: React.ReactNode; impact?: React.ReactNode };
    required?: boolean;
    requirement?: { tone: string; label: string };
    inputMode?: { mode: string; label: string };
  }) => (
    <label data-settings-dialog-field={label} data-settings-dialog-field-layout="vertical">
      <span>{label}</span>
      {help ? (
        <span data-settings-dialog-field-help="hertzbeat-ui-field-tooltip" aria-label={help.label}>
          <span>{help.body}</span>
          <span>{help.impact}</span>
        </span>
      ) : null}
      {required ? (
        <span data-settings-dialog-field-required="true">*</span>
      ) : null}
      {requirement ? (
        <span data-settings-dialog-field-requirement={requirement.tone}>{requirement.label}</span>
      ) : null}
      {inputMode ? (
        <span data-settings-dialog-field-input-mode={inputMode.mode}>{inputMode.label}</span>
      ) : null}
      <div>{children}</div>
    </label>
  ),
  SettingsDialogInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  SettingsDialogSelect: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props}>{children}</select>
  ),
  SettingsDialogFooter: ({ children }: { children: React.ReactNode }) => <div data-settings-dialog-footer="true">{children}</div>
}));

vi.mock('@hertzbeat/ui', () => ({
  HzConfirmDialog: ({
    open,
    title,
    children,
    cancelLabel,
    confirmLabel,
    confirmDisabled,
    cancelButtonProps,
    confirmButtonProps,
    onClose,
    onConfirm,
    ...props
  }: any) =>
    open ? (
      <section data-hz-ui="confirm-dialog" {...props}>
        <h2>{title}</h2>
        <div>{children}</div>
        <button type="button" onClick={onClose} {...cancelButtonProps}>{cancelLabel}</button>
        <button type="button" disabled={confirmDisabled} onClick={onConfirm} {...confirmButtonProps}>{confirmLabel}</button>
      </section>
    ) : null,
  HzInlineFeedback: ({ title, description, ...props }: any) => (
    <div data-hz-ui="inline-feedback" {...props}>
      {title}
      {description}
    </div>
  )
}));

vi.mock('../../../../lib/api-client', () => ({
  apiDelete,
  apiGet,
  apiMessageGet,
  apiPost
}));

vi.mock('../../../../lib/setting-token/controller', () => ({
  TOKEN_SCOPES: ['api-admin', 'otlp-ingest', 'readonly-query'],
  deleteTokenById,
  generateTokenValue,
  loadTokenData,
  normalizeTokenScope: (scope: string | null | undefined) => (
    ['api-admin', 'otlp-ingest', 'readonly-query'].includes(String(scope).trim().toLowerCase())
      ? String(scope).trim().toLowerCase()
      : 'api-admin'
  )
}));

vi.mock('../../../../lib/setting-token/view-model', () => ({
  buildTokenExpirationOptions: () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    return [
      { value: '-1', label: t('setting.token.expiration.never') },
      { value: '604800', label: t('setting.token.expiration.7d') },
      { value: '2592000', label: t('setting.token.expiration.30d') },
      { value: '7776000', label: t('setting.token.expiration.90d') },
      { value: '15552000', label: t('setting.token.expiration.180d') },
      { value: '31536000', label: t('setting.token.expiration.365d') }
    ];
  },
  isExpired: (token: { expireTime?: string | null }) => token.expireTime === '2026-04-02T08:00:00Z'
}));

describe('setting token page', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    mockState.lastLoad = null;
    apiDelete.mockReset();
    apiGet.mockReset();
    apiPost.mockReset();
    apiMessageGet.mockReset().mockResolvedValue(mockState.renderData.tokens);
    generateTokenValue.mockReset();
    deleteTokenById.mockReset();
    loadTokenData.mockReset().mockImplementation(async apiGetFn => {
      const tokens = await apiGetFn('/account/token');
      return { tokens };
    });
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    root = null;
    container?.remove();
    container = null;
  });

  function setControlledInputValue(input: HTMLInputElement, value: string) {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('renders the cold settings token console with counts and the token table', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const { default: SettingTokenPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingTokenPage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-settings-console-title="true"');
    expect(html).toContain('data-setting-token-surface="otlp-hertzbeat-ui-token-console"');
    expect(html).toContain('data-setting-token-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-setting-token-layout-contract="full-width-admin-no-rail"');
    expect(html).toContain('data-setting-token-generate-dialog-layout-contract="angular-vertical-form"');
    expect(html).toContain('data-setting-token-generated-dialog-width-contract="angular-width-50-percent"');
    expect(html).toContain('data-setting-token-generated-dialog-mask-contract="angular-mask-closable-false"');
    expect(html).toContain('data-setting-token-header="hertzbeat-ui-compact-header"');
    expect(html).toContain('data-setting-token-command-row="standard-equal-buttons"');
    expect(html).toContain('data-setting-token-command-action="generate-open"');
    expect(html).toContain('data-setting-token-command-action="row-delete"');
    expect(html).toContain('data-setting-token-command-action="generate-cancel"');
    expect(html).toContain('data-setting-token-command-action="generate-submit"');
    expect(html).toContain('data-setting-token-command-action="generated-close"');
    expect(html).toContain('data-setting-token-command-action="copy-generated"');
    expect(html).toContain('data-setting-token-generate-trigger="angular-generate-token-modal"');
    expect(html).toContain('data-setting-token-action-help="generate"');
    expect(html).toContain('data-setting-token-row-action-help="row-delete"');
    expect(html).toContain('data-setting-token-action-help="row-delete"');
    expect(html).toContain('data-setting-token-action-help-trigger="hertzbeat-ui-action-help"');
    expect(html).toContain('data-setting-token-action-help-style="icon-after-action"');
    expect(html).toContain('data-setting-token-action-help-visual="circle-help-icon"');
    expect(html).toContain('data-setting-token-action-help-tooltip="generate"');
    expect(html).toContain('data-setting-token-action-help-tooltip="row-delete"');
    expect((html.match(/data-setting-token-action-help-trigger="hertzbeat-ui-action-help"/g) ?? []).length).toBe(4);
    expect((html.match(/lucide-circle-help/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(html).not.toContain('<span aria-hidden="true">?</span>');
    expect(html).toContain('data-setting-token-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-setting-token-strip="hertzbeat-ui-token-strip"');
    expect(html).toContain('data-setting-token-strip-style="hertzbeat-ui-inline-counts"');
    expect(html).toContain('data-setting-token-table-panel="hertzbeat-ui-dense-table"');
    expect(html).toContain('data-setting-token-table="hertzbeat-ui-token-table"');
    expect(html).toContain('data-setting-token-action-column="sticky-visible"');
    expect(html).toContain('data-setting-token-action-column-owner="hertzbeat-ui-token-table"');
    expect(html).toContain('data-setting-token-row-action="hertzbeat-ui-row-action"');
    expect(html).toContain('data-setting-token-delete-confirm="angular-modal-confirm"');
    expect(html).toContain('data-setting-token-delete-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-setting-token-delete-confirm-state="closed"');
    expect(html).toContain('data-setting-token-delete-confirm-trigger="angular-modal-confirm"');
    expect(html).toContain('data-setting-token-load-failure-contract="angular-load-failed-retry"');
    expect(html).toContain('data-setting-token-load-failure-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-setting-token-header-nesting-contract="flat-inside-settings-console-content"');
    expect(html).toContain('data-setting-token-table-nesting-contract="flat-inside-settings-console-content"');
    expect(html).toContain('class="p-0"');
    expect(html).toContain('class="border-0 bg-transparent shadow-none"');
    expect(html).toContain(t('settings.token'));
    expect(html).toContain(t('settings.token.console.kicker'));
    expect(html).toContain(t('settings.token.console.title'));
    expect(html).toContain(t('settings.token.console.copy'));
    expect(html).toContain(t('settings.token.generate'));
    expect(html).toContain(t('settings.token.action.generate.help'));
    expect(html).toContain(t('settings.token.action.generate.impact'));
    expect(html).toContain(t('settings.token.action.row-delete.help'));
    expect(html).toContain(t('settings.token.action.row-delete.impact'));
    expect(html).toContain(t('settings.token.console.result.total'));
    expect(html).toContain(t('settings.token.console.result.active'));
    expect(html).toContain(t('settings.token.console.result.expired'));
    expect(html).toContain(t('settings.token.name'));
    expect(html).toContain(t('settings.token.scope'));
    expect(html).toContain(t('settings.token.scope.otlp-ingest'));
    expect(html).toContain(t('settings.token.scope.api-admin'));
    expect(html).toContain(t('settings.token.scope.readonly-query'));
    expect(html).toContain(t('settings.token.workspace-id'));
    expect(html).toContain(t('settings.token.value'));
    expect(html).toContain(t('settings.token.creator'));
    expect(html).toContain(t('settings.token.create-time'));
    expect(html).toContain(t('settings.token.expire-time'));
    expect(html).toContain(t('settings.token.last-used'));
    expect(html).toContain(t('common.edit'));
    expect(html).toContain(t('settings.token.revoke-action'));
    expect(html).toContain(`aria-label="${t('settings.token.delete-action', { name: 'OTLP ingestion' })}"`);
    expect(html).toContain(`aria-label="${t('settings.token.delete-action', { name: 'Expired token' })}"`);
    expect(html).not.toContain(t('common.button.delete'));
    expect(html).toContain(t('settings.token.expire.never'));
    expect(html).toContain('OTLP ingestion');
    expect(html).toContain('Expired token');
    expect(html).toContain('team-a');
    expect(html).toContain('hb_xxx');
    expect(html).toContain('hb_yyy');
    expect(html).not.toContain('data-setting-token-surface="angular-token-console"');
    expect(html).not.toContain('data-setting-token-summary-rail=');
    expect(html).not.toContain('data-setting-token-header="angular-token-header"');
    expect(html).not.toContain('data-setting-token-strip-style="angular-inline-counts"');
    expect(html).not.toContain('data-setting-token-table-panel="angular-token-table-panel"');
    expect(html).not.toContain('data-setting-token-table="angular-token-table"');
    expect(html).not.toContain('data-workbench-page="true"');
    expect(html).not.toContain('data-stage-section=');
    expect(html).not.toContain('API Keys');
    expect(html).not.toContain('Generate token');
    expect(html).not.toContain('Token management');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/account/token');
  });

  it('guards token generation and deletion with novice-safe confirmation paths', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    generateTokenValue.mockResolvedValueOnce('hb_full_token_only_once');
    deleteTokenById.mockResolvedValueOnce(undefined);
    const { default: SettingTokenPage } = await import('./page');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<SettingTokenPage />);
      await Promise.resolve();
    });

    const trigger = container.querySelector<HTMLButtonElement>('[data-setting-token-command-action="generate-open"]');
    expect(trigger).not.toBeNull();
    await act(async () => {
      trigger?.click();
      await Promise.resolve();
    });

    const generateDialog = container.querySelector<HTMLElement>(
      'section[data-overlay-dialog="true"][data-setting-token-generate-dialog-layout-contract="angular-vertical-form"]'
    );
    expect(generateDialog?.getAttribute('data-open')).toBe('true');
    expect(generateDialog?.textContent).toContain(t('settings.token.generate-warning'));

    const emptySubmit = generateDialog?.querySelector<HTMLButtonElement>('[data-setting-token-command-action="generate-submit"]');
    expect(emptySubmit?.disabled).toBe(true);
    await act(async () => {
      emptySubmit?.click();
      await Promise.resolve();
    });
    expect(generateTokenValue).not.toHaveBeenCalled();

    const nameInput = Array.from(generateDialog?.querySelectorAll<HTMLInputElement>('input') ?? []).find(
      input => input.placeholder === t('settings.token.name-placeholder')
    );
    expect(nameInput).not.toBeUndefined();
    await act(async () => {
      setControlledInputValue(nameInput as HTMLInputElement, '  novice token  ');
      await Promise.resolve();
    });

    const readySubmit = generateDialog?.querySelector<HTMLButtonElement>('[data-setting-token-command-action="generate-submit"]');
    expect(readySubmit?.disabled).toBe(false);
    await act(async () => {
      readySubmit?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(generateTokenValue).toHaveBeenCalledWith(
      apiPost,
      'novice token',
      '-1',
      t('settings.token.generate-fail'),
      {
        scope: 'api-admin',
        workspaceId: 'default'
      }
    );
    expect(generateDialog?.getAttribute('data-open')).toBe('false');
    const generatedDialog = container.querySelector<HTMLElement>(
      'section[data-overlay-dialog="true"][data-setting-token-generated-dialog-width-contract="angular-width-50-percent"]'
    );
    expect(generatedDialog?.getAttribute('data-open')).toBe('true');
    expect(generatedDialog?.getAttribute('data-setting-token-generated-dialog-mask-contract')).toBe('angular-mask-closable-false');
    expect(generatedDialog?.textContent).toContain(t('settings.token.notice'));
    expect(generatedDialog?.textContent).toContain('hb_full_token_only_once');
    expect(generatedDialog?.querySelector('[data-setting-token-generated-value-fallback="select-on-copy-fail"]')).not.toBeNull();
    expect(generatedDialog?.querySelector('[data-setting-token-command-action="copy-generated"]')).not.toBeNull();
    expect(generatedDialog?.querySelector('[data-setting-token-command-action="generated-close"]')).not.toBeNull();

    const deleteTrigger = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-setting-token-command-action="row-delete"]')).find(
      button => button.getAttribute('aria-label') === t('settings.token.delete-action', { name: 'OTLP ingestion' })
    );
    expect(deleteTrigger).not.toBeUndefined();
    await act(async () => {
      deleteTrigger?.click();
      await Promise.resolve();
    });

    const deleteDialog = container.querySelector<HTMLElement>('[data-setting-token-delete-confirm-dialog="angular-modal-confirm"]');
    expect(deleteDialog?.getAttribute('data-setting-token-delete-confirm-target')).toBe('OTLP ingestion');
    expect(deleteDialog?.textContent).toContain(t('settings.token.delete-confirm-content', { name: 'OTLP ingestion' }));
    expect(deleteDialog?.querySelector('[data-setting-token-command-action="delete-cancel"]')).not.toBeNull();
    expect(deleteDialog?.querySelector('[data-setting-token-command-action="delete-confirm"]')).not.toBeNull();

    await act(async () => {
      deleteDialog?.querySelector<HTMLButtonElement>('[data-setting-token-command-action="delete-cancel"]')?.click();
      await Promise.resolve();
    });
    expect(deleteTokenById).not.toHaveBeenCalled();
    expect(container.querySelector('[data-setting-token-delete-confirm-dialog="angular-modal-confirm"]')).toBeNull();

    await act(async () => {
      deleteTrigger?.click();
      await Promise.resolve();
    });
    const confirmDeleteDialog = container.querySelector<HTMLElement>('[data-setting-token-delete-confirm-dialog="angular-modal-confirm"]');
    await act(async () => {
      confirmDeleteDialog?.querySelector<HTMLButtonElement>('[data-setting-token-command-action="delete-confirm"]')?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(deleteTokenById).toHaveBeenCalledWith(apiDelete, 1, t('settings.token.revoke-fail'));
    expect(container.querySelector('[data-setting-token-action-feedback="angular-token-notify"]')?.textContent).toContain(
      t('settings.token.revoke-success')
    );
  });

  it('keeps the token route on the settings owner instead of observability workbench primitives', () => {
    const source = readFileSync(resolve(__dirname, 'setting-token-page.tsx'), 'utf8');

    expect(source).toContain('hzOpsCatalogVisual');
    expect(source).toContain('data-setting-token-surface="otlp-hertzbeat-ui-token-console"');
    expect(source).toContain('data-setting-token-style-baseline={coldTokenVisual.canvasName}');
    expect(source).toContain('data-setting-token-layout-contract="full-width-admin-no-rail"');
    expect(source).toContain('data-setting-token-header="hertzbeat-ui-compact-header"');
    expect(source).toContain('data-setting-token-header-nesting-contract="flat-inside-settings-console-content"');
    expect(source).toContain('className="p-0"');
    expect(source).toContain('data-setting-token-command-row="standard-equal-buttons"');
    expect(source).toContain('data-setting-token-generate-trigger="angular-generate-token-modal"');
    expect(source).toContain('function tokenActionHelp');
    expect(source).toContain('function TokenActionHelp');
    expect(source).toContain("tokenActionHelp(t, 'generate')");
    expect(source).toContain('data-setting-token-action-help={id}');
    expect(source).toContain('data-setting-token-row-action-help="row-delete"');
    expect(source).toContain("tokenActionHelp(t, 'row-delete')");
    expect(source).toContain('data-setting-token-action-help-style="icon-after-action"');
    expect(source).toContain('data-setting-token-action-help-visual="circle-help-icon"');
    expect(source).toContain('data-setting-token-action-help-tooltip={id}');
    expect(source).toContain("import { CircleHelp, Plus, Trash2 } from 'lucide-react'");
    expect(source).toContain('<CircleHelp aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.8} />');
    expect(source).toContain('SettingsDialogActionHelp');
    expect(source).toContain('id="token-generate-submit"');
    expect(source).not.toContain('<span aria-hidden="true">?</span>');
    expect(source).toContain('data-setting-token-generate-form="angular-generate-token-modal"');
    expect(source).toContain('data-setting-token-generate-dialog-layout-contract="angular-vertical-form"');
    expect(source).toContain('data-setting-token-generate-form-layout="angular-vertical-form"');
    expect(source).toContain('data-setting-token-generate-warning="visible-before-generation"');
    expect(source).toContain('tokenFieldHelp');
    expect(source).toContain('readRequestedTokenScope');
    expect(source).toContain('normalizeTokenScope(readRequestedTokenScope())');
    expect(source).toContain("setTokenScope(requestedTokenScope)");
    expect(source).toContain("setWorkspaceId('default')");
    expect(source).toContain('scope: tokenScope');
    expect(source).toContain('workspaceId');
    expect(source).toContain("tokenFieldHelp(t, 'scope', t('settings.token.scope'))");
    expect(source).toContain("tokenFieldHelp(t, 'workspace-id', t('settings.token.workspace-id'))");
    expect(source).toContain("t('settings.token.field.help-aria'");
    expect(source.match(/requirement=\{\{/g) || []).toHaveLength(4);
    expect(source).toContain("tone: 'required'");
    expect(source).toContain("label: t('settings.form.field.requirement.required')");
    expect(source).toContain("tone: 'optional'");
    expect(source).toContain("label: t('settings.form.field.requirement.optional')");
    expect(source).toContain("mode: 'manual'");
    expect(source).toContain("label: t('settings.form.field.input-mode.manual')");
    expect(source).toContain("mode: 'selection'");
    expect(source).toContain("label: t('settings.form.field.input-mode.selection')");
    expect(source).toContain('layout="vertical"');
    expect(source).toContain('data-setting-token-generate-submit="angular-generate-token"');
    expect(source).toContain('data-setting-token-generated-dialog-width-contract="angular-width-50-percent"');
    expect(source).toContain('data-setting-token-generated-dialog-mask-contract="angular-mask-closable-false"');
    expect(source).toContain('md:w-[50vw] md:max-w-[50vw]');
    expect(source).toContain('maskClosable={false}');
    expect(source).toContain('data-setting-token-generated-dialog="angular-token-display-once"');
    expect(source).toContain('data-setting-token-copy-action="angular-copy-token"');
    expect(source).toContain('const generatedTokenRef = useRef<HTMLElement>(null)');
    expect(source).toContain('function selectGeneratedTokenValue()');
    expect(source).toContain('range.selectNodeContents(element)');
    expect(source).toContain('selection.addRange(range)');
    expect(source).toContain("setActionMessage(t('settings.token.copy-fallback'))");
    expect(source).toContain('data-setting-token-generated-value-fallback="select-on-copy-fail"');
    expect(source).toContain('tabIndex={-1}');
    expect(source).toContain('SettingsFormFeedback');
    expect(source).toContain("tone={actionTone === 'success' ? 'success' : actionTone === 'warning' ? 'info' : 'error'}");
    expect(source).toContain('data-setting-token-action-feedback="angular-token-notify"');
    expect(source).toContain('data-setting-token-action-feedback-owner="hertzbeat-ui-settings-feedback"');
    expect(source).toContain('data-setting-token-delete-confirm="angular-modal-confirm"');
    expect(source).toContain('data-setting-token-delete-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain("data-setting-token-delete-confirm-state={deleteTarget ? 'open' : 'closed'}");
    expect(source).toContain('data-setting-token-delete-confirm-trigger="angular-modal-confirm"');
    expect(source).toContain('data-setting-token-delete-confirm-dialog="angular-modal-confirm"');
    expect(source).toContain("'data-setting-token-command-action': 'delete-cancel'");
    expect(source).toContain("'data-setting-token-command-action': 'delete-confirm'");
    expect(source).toContain('data-setting-token-delete-confirm-ok');
    expect(source).toContain('data-setting-token-delete-confirm-cancel');
    expect(source).toContain('renderError={(message, retry) =>');
    expect(source).toContain('data-setting-token-load-failure="angular-load-failed-retry"');
    expect(source).toContain('data-setting-token-load-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-setting-token-load-failure-contract="angular-load-failed-retry"');
    expect(source).toContain('data-setting-token-load-failure-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-setting-token-load-failure-feedback="angular-load-failed-retry"');
    expect(source).toContain('data-setting-token-load-retry="angular-load-tokens-retry"');
    expect(source).toContain("t('settings.token.load-fail-title')");
    expect(source).toContain("t('settings.token.load-fail')");
    expect(source).toContain("t('common.button.retry')");
    expect(source).toContain('deleteTokenById(apiDelete');
    expect(source).toContain('generateTokenValue(apiPost');
    expect(source).toContain('buildTokenExpirationOptions(t)');
    expect(source).toContain('data-setting-token-admin-layout="full-width-admin-list"');
    expect(source).toContain('data-setting-token-table="hertzbeat-ui-token-table"');
    expect(source).toContain('const tokenActionHeaderCellClassName');
    expect(source).toContain('const tokenActionBodyCellClassName');
    expect(source).toContain('data-setting-token-action-column="sticky-visible"');
    expect(source).toContain('data-setting-token-action-column-owner="hertzbeat-ui-token-table"');
    expect(source).toContain('sticky right-0 z-10');
    expect(source).toContain('data-setting-token-table-nesting-contract="flat-inside-settings-console-content"');
    expect(source).toContain('className="border-0 bg-transparent shadow-none"');
    expect(source).toContain('data-setting-token-strip-style="hertzbeat-ui-inline-counts"');
    expect(source).toContain('SettingsConsoleTitle');
    expect(source).not.toContain('data-setting-token-summary-rail');
    expect(source).not.toContain('angular-token-console');
    expect(source).not.toContain('angular-token-header');
    expect(source).not.toContain('angular-inline-counts');
    expect(source).not.toContain('angular-token-table-panel');
    expect(source).not.toContain('angular-token-table');
    expect(source).not.toContain('@/components/observability');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('SummaryMetricGrid');
    expect(source).not.toContain('StageSection');
  });

  it('renders localized empty fallbacks for blank token table cells', async () => {
    const previousRenderData = mockState.renderData;
    mockState.renderData = {
      tokens: [
        {
          id: 9,
          name: ' ',
          tokenMask: '',
          creator: null,
          gmtCreate: '',
          expireTime: null,
          lastUsedTime: null
        }
      ]
    } as any;

    try {
      const { default: SettingTokenPage } = await import('./page');
      const html = renderToStaticMarkup(<SettingTokenPage />);
      const t = createTranslatorMock({ locale: 'zh-CN' });

      expect(html).toContain('data-setting-token-table="hertzbeat-ui-token-table"');
      expect(html).toContain(t('common.none'));
      expect(html).toContain(t('settings.token.expire.never'));
      expect(html).not.toContain('<td class="border-b border-r border-[#2b3039] bg-[#0b0c0e] px-3 py-3 text-[#d0d5dd] last:border-r-0">-</td>');
      expect(html).not.toContain('<code class="rounded-[3px] border border-[#2b3039] bg-[#101217] px-1.5 py-0.5 text-[12px] text-[#c8d2df]">-</code>');
    } finally {
      mockState.renderData = previousRenderData;
    }
  });

  it('keeps token settings remounts on a short settled cache window and refreshes after generation', () => {
    const source = readFileSync(resolve(__dirname, 'setting-token-page.tsx'), 'utf8');

    expect(source).toContain('SETTING_TOKEN_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain("['setting-token', '/account/token', reloadVersion].join(':')");
    expect(source).toContain('void reloadVersion');
    expect(source).toContain('[reloadVersion]');
    expect(source).toContain('loadTokenData(apiMessageGet)');
    expect(source).toContain('setReloadVersion(version => version + 1)');
    expect(source).toContain('cacheKey={settingTokenCacheKey}');
    expect(source).toContain('cacheSettledTtlMs={SETTING_TOKEN_SETTLED_CACHE_TTL_MS}');
    expect(source).not.toContain('fake');
  });
});
