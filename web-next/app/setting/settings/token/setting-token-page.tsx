'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { CircleHelp, Plus, Trash2 } from 'lucide-react';
import { HzConfirmDialog, HzInlineFeedback } from '@hertzbeat/ui';
import { ClientWorkbench } from '../../../../components/workbench/client-workbench';
import { useI18n } from '../../../../components/providers/i18n-provider';
import { OverlayDialog } from '../../../../components/workbench/overlay-dialog';
import { SettingsConsoleTitle } from '../../../../components/settings/settings-console-shell';
import { SettingsFormFeedback } from '../../../../components/settings/settings-form';
import {
  SettingsDialogActionHelp,
  SettingsDialogField,
  SettingsDialogFooter,
  SettingsDialogForm,
  SettingsDialogInput,
  SettingsDialogSelect
} from '../../../../components/settings/settings-dialog-form';
import { Button } from '../../../../components/ui/button';
import { hzOpsCatalogVisual } from '../../../../lib/hz-ops-visual';
import { apiDelete, apiMessageGet, apiPost } from '../../../../lib/api-client';
import {
  TOKEN_SCOPES,
  deleteTokenById,
  generateTokenValue,
  loadTokenData,
  normalizeTokenScope,
  type TokenScope
} from '../../../../lib/setting-token/controller';
import { buildTokenExpirationOptions, isExpired } from '../../../../lib/setting-token/view-model';
import type { AuthToken } from '../../../../lib/types';

type TokenData = {
  tokens: AuthToken[];
};

const coldTokenVisual = hzOpsCatalogVisual;
const SETTING_TOKEN_SETTLED_CACHE_TTL_MS = 10_000;

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-[#f8fafc]';

const coldSecondaryButtonClassName =
  'h-8 min-w-[96px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151923] hover:text-[#f8fafc]';

const tokenHeaderCellClassName =
  'border-b border-r border-[#2b3039] bg-[#101217] px-3 py-2.5 text-[11px] font-semibold text-[#8d95a5] last:border-r-0';

const tokenBodyCellClassName = 'border-b border-r border-[#2b3039] bg-[#0b0c0e] px-3 py-3 text-[#d0d5dd] last:border-r-0';

const tokenActionHeaderCellClassName =
  'sticky right-0 z-10 border-b border-l border-[#2b3039] bg-[#101217] px-3 py-2.5 text-[11px] font-semibold text-[#8d95a5] shadow-[-12px_0_18px_rgba(0,0,0,0.28)]';

const tokenActionBodyCellClassName =
  'sticky right-0 z-10 border-b border-l border-[#2b3039] bg-[#0b0c0e] px-3 py-3 shadow-[-12px_0_18px_rgba(0,0,0,0.28)]';

type TokenTranslator = (key: string, vars?: Record<string, string>) => string;

type TokenActionHelpCopy = {
  label: string;
  body: string;
  impact: string;
};

function tokenActionHelp(t: TokenTranslator, actionKey: string): TokenActionHelpCopy {
  const actionLabel = t(`settings.token.action.${actionKey}.label`);
  return {
    label: t('settings.token.action.help-aria', { action: actionLabel }),
    body: t(`settings.token.action.${actionKey}.help`),
    impact: t(`settings.token.action.${actionKey}.impact`)
  };
}

function tokenFieldHelp(t: TokenTranslator, fieldKey: string, label: string) {
  return {
    label: t('settings.token.field.help-aria', { field: label }),
    body: t(`settings.token.field.${fieldKey}.help`),
    impact: t(`settings.token.field.${fieldKey}.impact`)
  };
}

function TokenActionHelp({
  id,
  label,
  body,
  impact
}: TokenActionHelpCopy & {
  id: string;
}) {
  const tooltipId = `setting-token-action-help-${id}`;
  return (
    <span data-setting-token-action-help={id} className="group/help relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        data-setting-token-action-help-trigger="hertzbeat-ui-action-help"
        data-setting-token-action-help-style="icon-after-action"
        data-setting-token-action-help-visual="circle-help-icon"
        className="inline-flex h-4 w-4 items-center justify-center border-0 bg-transparent text-[#8da2ff] transition hover:text-[#f5f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <CircleHelp aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        data-setting-token-action-help-tooltip={id}
        className="pointer-events-none absolute right-0 top-6 z-30 hidden w-[300px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover/help:block group-focus-within/help:block"
      >
        <span className="block text-[11px] leading-4 text-[#dbe4f0]">{body}</span>
        <span className="mt-2 block border-t border-[#2b3039] pt-2 text-[11px] leading-4 text-[#98a2b3]">{impact}</span>
      </span>
    </span>
  );
}

function formatTokenCell(value: string | number | null | undefined, fallback: string) {
  const normalized = value == null ? '' : String(value).trim();
  return normalized || fallback;
}

function formatTokenDate(value: string | number | null | undefined, fallback: string) {
  const normalized = formatTokenCell(value, '');
  if (!normalized) return fallback;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return normalized;

  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function resolveTokenName(token: AuthToken, fallback: string) {
  return formatTokenCell(token.name, '') || formatTokenCell(token.tokenMask, '') || fallback;
}

function readRequestedTokenScope() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('scope') || params.get('tokenScope');
}

function buildTokenScopeOptions(t: TokenTranslator) {
  return TOKEN_SCOPES.map(scope => ({
    value: scope,
    label: t(`settings.token.scope.${scope}`)
  }));
}

function formatTokenScope(scope: string | null | undefined, t: TokenTranslator) {
  return t(`settings.token.scope.${normalizeTokenScope(scope)}`);
}

function buildTokenCounts(tokens: AuthToken[]) {
  const expired = tokens.filter(token => isExpired(token)).length;
  return {
    total: tokens.length,
    active: tokens.length - expired,
    expired
  };
}

export default function SettingTokenPage() {
  const { t } = useI18n();
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [expireSeconds, setExpireSeconds] = useState('-1');
  const requestedTokenScope = useMemo(() => normalizeTokenScope(readRequestedTokenScope()), []);
  const [tokenScope, setTokenScope] = useState<TokenScope>(requestedTokenScope);
  const [workspaceId, setWorkspaceId] = useState('default');
  const [generatedToken, setGeneratedToken] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AuthToken | null>(null);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionTone, setActionTone] = useState<'success' | 'warning' | 'error' | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const generatedTokenRef = useRef<HTMLElement>(null);
  const settingTokenCacheKey = useMemo(() => ['setting-token', '/account/token', reloadVersion].join(':'), [reloadVersion]);
  const emptyValue = t('common.none');
  const expireOptions = useMemo(() => buildTokenExpirationOptions(t), [t]);
  const scopeOptions = useMemo(() => buildTokenScopeOptions(t), [t]);
  const rowDeleteHelp = tokenActionHelp(t, 'row-delete');

  const load = useCallback(async (): Promise<TokenData> => {
    void reloadVersion;
    return loadTokenData(apiMessageGet);
  }, [reloadVersion]);

  function selectGeneratedTokenValue() {
    if (typeof window === 'undefined') return false;

    const element = generatedTokenRef.current;
    const selection = window.getSelection?.();
    if (!element || !selection) return false;

    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    element.focus({ preventScroll: true });
    return true;
  }

  async function copyGeneratedToken() {
    if (!generatedToken) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedToken);
      } else {
        const selected = selectGeneratedTokenValue();
        const success = typeof document !== 'undefined' && typeof document.execCommand === 'function' && document.execCommand('copy');
        if (!selected || !success) {
          throw new Error(t('common.notify.copy-fail'));
        }
      }
      setActionMessage(t('common.notify.copy-success'));
      setActionTone('success');
    } catch {
      selectGeneratedTokenValue();
      setActionMessage(t('settings.token.copy-fallback'));
      setActionTone('warning');
    }
  }

  async function generateToken() {
    const name = tokenName.trim();
    if (!name) return;

    setGenerating(true);
    setActionMessage(null);
    setActionTone(null);
    setGenerateDialogOpen(false);
    try {
      const token = await generateTokenValue(apiPost, name, expireSeconds, t('settings.token.generate-fail'), {
        scope: tokenScope,
        workspaceId
      });
      setGeneratedToken(token);
      setResultDialogOpen(true);
      setTokenName('');
      setExpireSeconds('-1');
      setTokenScope(requestedTokenScope);
      setWorkspaceId('default');
      setReloadVersion(version => version + 1);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : t('settings.token.generate-fail'));
      setActionTone('warning');
    } finally {
      setGenerating(false);
    }
  }

  function closeGeneratedTokenDialog() {
    setResultDialogOpen(false);
    setGeneratedToken('');
  }

  async function confirmDeleteToken() {
    if (!deleteTarget) return;

    const target = deleteTarget;
    setDeleting(true);
    setDeleteTarget(null);
    setActionMessage(null);
    setActionTone(null);
    try {
      await deleteTokenById(apiDelete, target.id, t('settings.token.revoke-fail'));
      setActionMessage(t('settings.token.revoke-success'));
      setActionTone('success');
      setReloadVersion(version => version + 1);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : t('settings.token.revoke-fail'));
      setActionTone('error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('setting.token.loading')}
      cacheKey={settingTokenCacheKey}
      cacheSettledTtlMs={SETTING_TOKEN_SETTLED_CACHE_TTL_MS}
      renderError={(message, retry) => (
        <section
          data-setting-token-load-failure="angular-load-failed-retry"
          data-setting-token-load-failure-owner="hertzbeat-ui-inline-feedback"
          className="space-y-3 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
        >
          <HzInlineFeedback
            tone="warning"
            title={t('settings.token.load-fail-title')}
            description={message || t('settings.token.load-fail')}
            variant="embedded"
            data-setting-token-load-failure-feedback="angular-load-failed-retry"
            data-setting-token-load-failure-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <Button
            type="button"
            variant="default"
            className={coldSecondaryButtonClassName}
            data-setting-token-load-retry="angular-load-tokens-retry"
            onClick={retry}
          >
            {t('common.button.retry')}
          </Button>
        </section>
      )}
    >
      {data => {
        const tokens = data.tokens || [];
        const counts = buildTokenCounts(tokens);

        return (
          <div
            data-setting-token-surface="otlp-hertzbeat-ui-token-console"
            data-setting-token-style-baseline={coldTokenVisual.canvasName}
            data-setting-token-layout-contract="full-width-admin-no-rail"
            data-setting-token-generate-dialog-layout-contract="angular-vertical-form"
            data-setting-token-generated-dialog-width-contract="angular-width-50-percent"
            data-setting-token-generated-dialog-mask-contract="angular-mask-closable-false"
            className="space-y-4"
          >
            <SettingsConsoleTitle>{t('settings.token')}</SettingsConsoleTitle>

            <div data-setting-token-admin-layout="full-width-admin-list" className="space-y-4">
              <section
                data-setting-token-header="hertzbeat-ui-compact-header"
                data-setting-token-header-nesting-contract="flat-inside-settings-console-content"
                className="p-0"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-[#8d95a5]">{t('settings.token.console.kicker')}</div>
                    <h2 className="mt-2 text-[18px] font-semibold leading-6 text-[#f5f7fb]">
                      {t('settings.token.console.title')}
                    </h2>
                    <p className="mt-2 max-w-[680px] text-[12px] leading-5 text-[#98a2b3]">
                      {t('settings.token.console.copy')}
                    </p>
                  </div>
                  <div data-setting-token-command-row="standard-equal-buttons" className="flex shrink-0 flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <Button
                        type="button"
                        variant="default"
                        className={coldPrimaryButtonClassName}
                        disabled={generating}
                        data-setting-token-command-action="generate-open"
                        data-setting-token-generate-trigger="angular-generate-token-modal"
                        onClick={() => {
                          setActionMessage(null);
                          setActionTone(null);
                          setTokenName('');
                          setExpireSeconds('-1');
                          setTokenScope(requestedTokenScope);
                          setWorkspaceId('default');
                          setGenerateDialogOpen(true);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('settings.token.generate')}
                      </Button>
                      <TokenActionHelp id="generate" {...tokenActionHelp(t, 'generate')} />
                    </span>
                  </div>
                </div>
                <div
                  data-setting-token-strip="hertzbeat-ui-token-strip"
                  data-setting-token-strip-style="hertzbeat-ui-inline-counts"
                  className="mt-4 grid gap-2 md:grid-cols-3"
                >
                  {[
                    [t('settings.token.console.result.total'), counts.total],
                    [t('settings.token.console.result.active'), counts.active],
                    [t('settings.token.console.result.expired'), counts.expired]
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex min-h-9 items-center justify-between rounded-[3px] border border-[#2b3039] bg-[#101217] px-3">
                      <span className="text-[12px] font-semibold text-[#8d95a5]">{label}</span>
                      <span className="text-[15px] font-semibold text-[#dbe4f0]">{value}</span>
                    </div>
                  ))}
                </div>
              </section>

              {actionMessage ? (
                <SettingsFormFeedback
                  tone={actionTone === 'success' ? 'success' : actionTone === 'warning' ? 'info' : 'error'}
                  data-setting-token-action-feedback="angular-token-notify"
                  data-setting-token-action-feedback-owner="hertzbeat-ui-settings-feedback"
                >
                  {actionMessage}
                </SettingsFormFeedback>
              ) : null}

              <div
                data-setting-token-delete-confirm="angular-modal-confirm"
                data-setting-token-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
                data-setting-token-delete-confirm-state={deleteTarget ? 'open' : 'closed'}
                className="sr-only"
              />
              <div
                data-setting-token-load-failure-contract="angular-load-failed-retry"
                data-setting-token-load-failure-contract-owner="hertzbeat-ui-inline-feedback"
                className="sr-only"
              />

              <section
                data-setting-token-table-panel="hertzbeat-ui-dense-table"
                data-setting-token-table-nesting-contract="flat-inside-settings-console-content"
                className="border-0 bg-transparent shadow-none"
              >
                <div className="border-b border-[#2b3039] px-4 py-3">
                  <p className="text-[12px] leading-5 text-[#98a2b3]">{t('settings.token.desc')}</p>
                </div>
                <div className="overflow-x-auto">
                  <table data-setting-token-table="hertzbeat-ui-token-table" className="w-full min-w-[1040px] border-collapse text-left text-[12px]">
                    <thead>
                      <tr>
                        <th className={tokenHeaderCellClassName}>{t('settings.token.name')}</th>
                        <th className={tokenHeaderCellClassName}>{t('settings.token.scope')}</th>
                        <th className={tokenHeaderCellClassName}>{t('settings.token.workspace-id')}</th>
                        <th className={tokenHeaderCellClassName}>{t('settings.token.value')}</th>
                        <th className={tokenHeaderCellClassName}>{t('settings.token.creator')}</th>
                        <th className={tokenHeaderCellClassName}>{t('settings.token.create-time')}</th>
                        <th className={tokenHeaderCellClassName}>{t('settings.token.expire-time')}</th>
                        <th className={tokenHeaderCellClassName}>{t('settings.token.last-used')}</th>
                        <th
                          className={tokenActionHeaderCellClassName}
                          data-setting-token-action-column="sticky-visible"
                          data-setting-token-action-column-owner="hertzbeat-ui-token-table"
                        >
                          {t('common.edit')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.length === 0 ? (
                        <tr>
                          <td
                            data-setting-token-empty-state="hertzbeat-ui-table-empty"
                            colSpan={9}
                            className="bg-[#0b0c0e] px-3 py-10 text-center text-[12px] text-[#8d95a5]"
                          >
                            {t('settings.token.empty')}
                          </td>
                        </tr>
                      ) : (
                        tokens.map(token => {
                          const expired = isExpired(token);

                          return (
                            <tr key={token.id}>
                              <td className={tokenBodyCellClassName}>{resolveTokenName(token, emptyValue)}</td>
                              <td className={tokenBodyCellClassName}>
                                <span className="rounded-[3px] border border-[#2b3039] bg-[#101217] px-1.5 py-0.5 text-[12px] text-[#c8d2df]">
                                  {formatTokenScope(token.tokenScope, t)}
                                </span>
                              </td>
                              <td className={tokenBodyCellClassName}>{formatTokenCell(token.workspaceId, emptyValue)}</td>
                              <td className={tokenBodyCellClassName}>
                                <code className="rounded-[3px] border border-[#2b3039] bg-[#101217] px-1.5 py-0.5 text-[12px] text-[#c8d2df]">
                                  {formatTokenCell(token.tokenMask, emptyValue)}
                                </code>
                              </td>
                              <td className={tokenBodyCellClassName}>{formatTokenCell(token.creator, emptyValue)}</td>
                              <td className={tokenBodyCellClassName}>{formatTokenDate(token.gmtCreate, emptyValue)}</td>
                              <td className={tokenBodyCellClassName}>
                                {token.expireTime ? (
                                  <span className={expired ? 'text-[#fda29b]' : undefined}>{formatTokenDate(token.expireTime, emptyValue)}</span>
                                ) : (
                                  <span className="rounded-[3px] border border-[rgba(34,197,94,0.28)] bg-[rgba(22,163,74,0.12)] px-2 py-1 text-[12px] text-[#d7f5df]">
                                    {t('settings.token.expire.never')}
                                  </span>
                                )}
                              </td>
                              <td className={tokenBodyCellClassName}>{formatTokenDate(token.lastUsedTime, emptyValue)}</td>
                              <td
                                className={tokenActionBodyCellClassName}
                                data-setting-token-action-column="sticky-visible"
                                data-setting-token-action-column-owner="hertzbeat-ui-token-table"
                              >
                                <span data-setting-token-row-action-help="row-delete" className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    data-setting-token-command-action="row-delete"
                                    data-setting-token-row-action="hertzbeat-ui-row-action"
                                    data-setting-token-delete-confirm-trigger="angular-modal-confirm"
                                    data-setting-token-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
                                    aria-label={t('settings.token.delete-action', {
                                      name: resolveTokenName(token, emptyValue)
                                    })}
                                    className="inline-flex h-8 min-w-[96px] items-center justify-center gap-1 whitespace-nowrap rounded-[3px] border border-[#3a2c31] bg-[#151014] px-2 text-[12px] font-semibold text-[#fca5a5] hover:border-[#7f1d1d] hover:bg-[#1f1115] hover:text-[#fecaca]"
                                    disabled={deleting}
                                    onClick={() => {
                                      setActionMessage(null);
                                      setActionTone(null);
                                      setDeleteTarget(token);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    {t('settings.token.revoke-action')}
                                  </button>
                                  <TokenActionHelp id="row-delete" {...rowDeleteHelp} />
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <OverlayDialog
              open={generateDialogOpen}
              title={t('settings.token.generate-title')}
              onClose={() => setGenerateDialogOpen(false)}
              maxWidthClassName="max-w-xl"
              overlayProps={{
                'data-setting-token-generate-dialog-layout-contract': 'angular-vertical-form'
              }}
              footer={
                <SettingsDialogFooter>
                  <Button
                    type="button"
                    variant="default"
                    className={coldSecondaryButtonClassName}
                    data-setting-token-command-action="generate-cancel"
                    onClick={() => setGenerateDialogOpen(false)}
                  >
                    {t('common.button.cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className={coldPrimaryButtonClassName}
                    disabled={generating || tokenName.trim().length === 0}
                    data-setting-token-command-action="generate-submit"
                    data-setting-token-generate-submit="angular-generate-token"
                    onClick={() => void generateToken()}
                  >
                    {generating ? t('common.saving') : t('settings.token.generate')}
                  </Button>
                  <SettingsDialogActionHelp id="token-generate-submit" {...tokenActionHelp(t, 'generate')} />
                </SettingsDialogFooter>
              }
            >
              <SettingsDialogForm
                data-setting-token-generate-form="angular-generate-token-modal"
                data-setting-token-generate-form-layout="angular-vertical-form"
              >
                <HzInlineFeedback
                  tone="warning"
                  title={t('settings.token.generate-warning')}
                  description={t('settings.token.generate-warning.copy')}
                  variant="embedded"
                  data-setting-token-generate-warning="visible-before-generation"
                />
                <SettingsDialogField
                  label={t('settings.token.name')}
                  help={tokenFieldHelp(t, 'name', t('settings.token.name'))}
                  requirement={{
                    tone: 'required',
                    label: t('settings.form.field.requirement.required')
                  }}
                  inputMode={{
                    mode: 'manual',
                    label: t('settings.form.field.input-mode.manual')
                  }}
                  required
                  layout="vertical"
                >
                  <SettingsDialogInput
                    value={tokenName}
                    placeholder={t('settings.token.name-placeholder')}
                    onChange={event => setTokenName(event.target.value)}
                  />
                </SettingsDialogField>
                <SettingsDialogField
                  label={t('settings.token.scope')}
                  help={tokenFieldHelp(t, 'scope', t('settings.token.scope'))}
                  requirement={{
                    tone: 'required',
                    label: t('settings.form.field.requirement.required')
                  }}
                  inputMode={{
                    mode: 'selection',
                    label: t('settings.form.field.input-mode.selection')
                  }}
                  required
                  layout="vertical"
                >
                  <SettingsDialogSelect value={tokenScope} onChange={event => setTokenScope(normalizeTokenScope(event.target.value))}>
                    {scopeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SettingsDialogSelect>
                </SettingsDialogField>
                <SettingsDialogField
                  label={t('settings.token.workspace-id')}
                  help={tokenFieldHelp(t, 'workspace-id', t('settings.token.workspace-id'))}
                  requirement={{
                    tone: 'optional',
                    label: t('settings.form.field.requirement.optional')
                  }}
                  inputMode={{
                    mode: 'manual',
                    label: t('settings.form.field.input-mode.manual')
                  }}
                  layout="vertical"
                >
                  <SettingsDialogInput
                    value={workspaceId}
                    placeholder={t('settings.token.workspace-id-placeholder')}
                    onChange={event => setWorkspaceId(event.target.value)}
                  />
                </SettingsDialogField>
                <SettingsDialogField
                  label={t('settings.token.expire-time')}
                  help={tokenFieldHelp(t, 'expire-time', t('settings.token.expire-time'))}
                  requirement={{
                    tone: 'required',
                    label: t('settings.form.field.requirement.required')
                  }}
                  inputMode={{
                    mode: 'selection',
                    label: t('settings.form.field.input-mode.selection')
                  }}
                  layout="vertical"
                >
                  <SettingsDialogSelect value={expireSeconds} onChange={event => setExpireSeconds(event.target.value)}>
                    {expireOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SettingsDialogSelect>
                </SettingsDialogField>
              </SettingsDialogForm>
            </OverlayDialog>

            <OverlayDialog
              open={resultDialogOpen}
              title={t('settings.token.generated-title')}
              onClose={closeGeneratedTokenDialog}
              maxWidthClassName="w-[min(92vw,640px)] md:w-[50vw] md:max-w-[50vw]"
              maskClosable={false}
              overlayProps={{
                'data-setting-token-generated-dialog-width-contract': 'angular-width-50-percent',
                'data-setting-token-generated-dialog-mask-contract': 'angular-mask-closable-false'
              }}
              footer={
                <SettingsDialogFooter>
                  <Button
                    type="button"
                    variant="default"
                    className={coldPrimaryButtonClassName}
                    data-setting-token-command-action="generated-close"
                    onClick={closeGeneratedTokenDialog}
                  >
                    {t('common.button.confirm')}
                  </Button>
                </SettingsDialogFooter>
              }
            >
              <div className="space-y-3" data-setting-token-generated-dialog="angular-token-display-once">
                <HzInlineFeedback
                  tone="warning"
                  title={t('settings.token.notice')}
                  variant="embedded"
                  data-setting-token-generated-notice="visible-once"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="default"
                    className={coldPrimaryButtonClassName}
                    data-setting-token-command-action="copy-generated"
                    data-setting-token-copy-action="angular-copy-token"
                    onClick={() => void copyGeneratedToken()}
                  >
                    {t('common.button.copy')}
                  </Button>
                </div>
                <code
                  ref={generatedTokenRef}
                  tabIndex={-1}
                  data-setting-token-generated-value="masked-only-after-generation"
                  data-setting-token-generated-value-fallback="select-on-copy-fail"
                  className="block max-h-48 overflow-auto rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 py-2 text-[12px] leading-5 text-[#dbe4f0]"
                >
                  {generatedToken}
                </code>
              </div>
            </OverlayDialog>

            <HzConfirmDialog
              open={Boolean(deleteTarget)}
              tone="critical"
              title={t('settings.token.delete-confirm')}
              cancelLabel={t('common.button.cancel')}
              confirmLabel={deleting ? t('common.saving') : t('settings.token.revoke-action')}
              confirmDisabled={deleting}
              onClose={() => setDeleteTarget(null)}
              onConfirm={() => void confirmDeleteToken()}
              data-setting-token-delete-confirm-dialog="angular-modal-confirm"
              data-setting-token-delete-confirm-target={deleteTarget ? resolveTokenName(deleteTarget, emptyValue) : ''}
              cancelButtonProps={{
                'data-setting-token-command-action': 'delete-cancel',
                'data-setting-token-delete-confirm-cancel': 'angular-modal-confirm'
              }}
              confirmButtonProps={{
                'data-setting-token-command-action': 'delete-confirm',
                'data-setting-token-delete-confirm-ok': 'angular-modal-confirm'
              }}
            >
              <p data-setting-token-delete-confirm-copy="angular-modal-confirm">
                {t('settings.token.delete-confirm-content', {
                  name: deleteTarget ? resolveTokenName(deleteTarget, emptyValue) : ''
                })}
              </p>
            </HzConfirmDialog>
          </div>
        );
      }}
    </ClientWorkbench>
  );
}
