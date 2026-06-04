'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { HzConfirmDialog, HzInlineFeedback } from '@hertzbeat/ui';
import { ClientWorkbench } from '../../../../components/workbench/client-workbench';
import { useI18n } from '../../../../components/providers/i18n-provider';
import { OverlayDialog } from '../../../../components/workbench/overlay-dialog';
import { SettingsConsoleTitle } from '../../../../components/settings/settings-console-shell';
import {
  SettingsDialogField,
  SettingsDialogFooter,
  SettingsDialogForm,
  SettingsDialogInput,
  SettingsDialogSelect
} from '../../../../components/settings/settings-dialog-form';
import { Button } from '../../../../components/ui/button';
import { hzOpsCatalogVisual } from '../../../../lib/hz-ops-visual';
import { apiDelete, apiGet, apiMessageGet } from '../../../../lib/api-client';
import { deleteTokenById, generateTokenValue, loadTokenData } from '../../../../lib/setting-token/controller';
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
  const [generatedToken, setGeneratedToken] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AuthToken | null>(null);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionTone, setActionTone] = useState<'success' | 'warning' | 'error' | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const settingTokenCacheKey = useMemo(() => ['setting-token', '/account/token', reloadVersion].join(':'), [reloadVersion]);
  const emptyValue = t('common.none');
  const expireOptions = useMemo(() => buildTokenExpirationOptions(t), [t]);

  const load = useCallback(async (): Promise<TokenData> => {
    void reloadVersion;
    return loadTokenData(apiMessageGet);
  }, [reloadVersion]);

  async function copyGeneratedToken() {
    if (!generatedToken) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedToken);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = generatedToken;
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!success) {
          throw new Error(t('common.notify.copy-fail'));
        }
      }
      setActionMessage(t('common.notify.copy-success'));
      setActionTone('success');
    } catch {
      setActionMessage(t('common.notify.copy-fail'));
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
      const token = await generateTokenValue(apiGet, name, expireSeconds, t('settings.token.generate-fail'));
      setGeneratedToken(token);
      setResultDialogOpen(true);
      setTokenName('');
      setExpireSeconds('-1');
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
      await deleteTokenById(apiDelete, target.id, t('common.notify.delete-fail'));
      setActionMessage(t('common.notify.delete-success'));
      setActionTone('success');
      setReloadVersion(version => version + 1);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : t('common.notify.delete-fail'));
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
                className="rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
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
                    <Button
                      type="button"
                      variant="default"
                      className={coldPrimaryButtonClassName}
                      disabled={generating}
                      data-setting-token-generate-trigger="angular-generate-token-modal"
                      onClick={() => {
                        setActionMessage(null);
                        setActionTone(null);
                        setTokenName('');
                        setExpireSeconds('-1');
                        setGenerateDialogOpen(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('settings.token.generate')}
                    </Button>
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
                <HzInlineFeedback
                  tone={actionTone === 'success' ? 'success' : actionTone === 'warning' ? 'warning' : 'critical'}
                  title={actionMessage}
                  variant="embedded"
                  data-setting-token-action-feedback="angular-token-notify"
                  data-setting-token-action-feedback-owner="hertzbeat-ui-inline-feedback"
                />
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
                className="rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
              >
                <div className="border-b border-[#2b3039] px-4 py-3">
                  <p className="text-[12px] leading-5 text-[#98a2b3]">{t('settings.token.desc')}</p>
                </div>
                <div className="overflow-x-auto">
                  <table data-setting-token-table="hertzbeat-ui-token-table" className="w-full min-w-[860px] border-collapse text-left text-[12px]">
                    <thead>
                      <tr>
                        <th className={tokenHeaderCellClassName}>{t('settings.token.name')}</th>
                        <th className={tokenHeaderCellClassName}>{t('settings.token.value')}</th>
                        <th className={tokenHeaderCellClassName}>{t('settings.token.creator')}</th>
                        <th className={tokenHeaderCellClassName}>{t('settings.token.create-time')}</th>
                        <th className={tokenHeaderCellClassName}>{t('settings.token.expire-time')}</th>
                        <th className={tokenHeaderCellClassName}>{t('settings.token.last-used')}</th>
                        <th className={tokenHeaderCellClassName}>{t('common.edit')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.length === 0 ? (
                        <tr>
                          <td
                            data-setting-token-empty-state="hertzbeat-ui-table-empty"
                            colSpan={7}
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
                              <td className="border-b border-[#2b3039] bg-[#0b0c0e] px-3 py-3">
                                <button
                                  type="button"
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
                                  {t('common.button.delete')}
                                </button>
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
                  <Button type="button" variant="default" className={coldSecondaryButtonClassName} onClick={() => setGenerateDialogOpen(false)}>
                    {t('common.button.cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className={coldPrimaryButtonClassName}
                    disabled={generating || tokenName.trim().length === 0}
                    data-setting-token-generate-submit="angular-generate-token"
                    onClick={() => void generateToken()}
                  >
                    {generating ? t('common.saving') : t('settings.token.generate')}
                  </Button>
                </SettingsDialogFooter>
              }
            >
              <SettingsDialogForm
                data-setting-token-generate-form="angular-generate-token-modal"
                data-setting-token-generate-form-layout="angular-vertical-form"
              >
                <SettingsDialogField label={t('settings.token.name')} required layout="vertical">
                  <SettingsDialogInput
                    value={tokenName}
                    placeholder={t('settings.token.name-placeholder')}
                    onChange={event => setTokenName(event.target.value)}
                  />
                </SettingsDialogField>
                <SettingsDialogField label={t('settings.token.expire-time')} layout="vertical">
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
                  <Button type="button" variant="default" className={coldPrimaryButtonClassName} onClick={closeGeneratedTokenDialog}>
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
                    data-setting-token-copy-action="angular-copy-token"
                    onClick={() => void copyGeneratedToken()}
                  >
                    {t('common.button.copy')}
                  </Button>
                </div>
                <code
                  data-setting-token-generated-value="masked-only-after-generation"
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
              confirmLabel={deleting ? t('common.saving') : t('common.button.delete')}
              confirmDisabled={deleting}
              onClose={() => setDeleteTarget(null)}
              onConfirm={() => void confirmDeleteToken()}
              data-setting-token-delete-confirm-dialog="angular-modal-confirm"
              data-setting-token-delete-confirm-target={deleteTarget ? resolveTokenName(deleteTarget, emptyValue) : ''}
              cancelButtonProps={{
                'data-setting-token-delete-confirm-cancel': 'angular-modal-confirm'
              }}
              confirmButtonProps={{
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
