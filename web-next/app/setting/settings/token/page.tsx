'use client';

import React, { useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ClientWorkbench } from '../../../../components/workbench/client-workbench';
import { useI18n } from '../../../../components/providers/i18n-provider';
import { SettingsConsoleTitle } from '../../../../components/settings/settings-console-shell';
import { Button } from '../../../../components/ui/button';
import { coldOpsCatalogVisual } from '../../../../lib/cold-ops-visual';
import { apiMessageGet } from '../../../../lib/api-client';
import { loadTokenData } from '../../../../lib/setting-token/controller';
import { isExpired } from '../../../../lib/setting-token/view-model';
import type { AuthToken } from '../../../../lib/types';

type TokenData = {
  tokens: AuthToken[];
};

const coldTokenVisual = coldOpsCatalogVisual;

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-[#f8fafc]';

const tokenHeaderCellClassName =
  'border-b border-r border-[#2b3039] bg-[#101217] px-3 py-2.5 text-[11px] font-semibold text-[#8d95a5] last:border-r-0';

const tokenBodyCellClassName = 'border-b border-r border-[#2b3039] bg-[#0b0c0e] px-3 py-3 text-[#d0d5dd] last:border-r-0';

function formatTokenDate(value?: string | number | null) {
  if (value == null || value === '') return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function resolveTokenName(token: AuthToken) {
  return token.name || token.tokenMask || '-';
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

  const load = useCallback(async (): Promise<TokenData> => {
    return loadTokenData(apiMessageGet);
  }, []);

  return (
    <ClientWorkbench load={load} loadingCopy="正在加载令牌管理。">
      {data => {
        const tokens = data.tokens || [];
        const counts = buildTokenCounts(tokens);

        return (
          <div
            data-setting-token-surface="otlp-cold-token-console"
            data-setting-token-style-baseline={coldTokenVisual.canvasName}
            data-setting-token-layout-contract="full-width-admin-no-rail"
            className="space-y-4"
          >
            <SettingsConsoleTitle>{t('settings.token')}</SettingsConsoleTitle>

            <div data-setting-token-admin-layout="full-width-admin-list" className="space-y-4">
              <section
                data-setting-token-header="cold-compact-header"
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
                    <Button type="button" variant="default" className={coldPrimaryButtonClassName}>
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('settings.token.generate')}
                    </Button>
                  </div>
                </div>
                <div
                  data-setting-token-strip="cold-token-strip"
                  data-setting-token-strip-style="cold-inline-counts"
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

              <section
                data-setting-token-table-panel="cold-dense-table"
                className="rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
              >
                <div className="border-b border-[#2b3039] px-4 py-3">
                  <p className="text-[12px] leading-5 text-[#98a2b3]">{t('settings.token.desc')}</p>
                </div>
                <div className="overflow-x-auto">
                  <table data-setting-token-table="cold-token-table" className="w-full min-w-[860px] border-collapse text-left text-[12px]">
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
                            data-setting-token-empty-state="cold-table-empty"
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
                              <td className={tokenBodyCellClassName}>{resolveTokenName(token)}</td>
                              <td className={tokenBodyCellClassName}>
                                <code className="rounded-[3px] border border-[#2b3039] bg-[#101217] px-1.5 py-0.5 text-[12px] text-[#c8d2df]">
                                  {token.tokenMask || '-'}
                                </code>
                              </td>
                              <td className={tokenBodyCellClassName}>{token.creator || '-'}</td>
                              <td className={tokenBodyCellClassName}>{formatTokenDate(token.gmtCreate)}</td>
                              <td className={tokenBodyCellClassName}>
                                {token.expireTime ? (
                                  <span className={expired ? 'text-[#fda29b]' : undefined}>{formatTokenDate(token.expireTime)}</span>
                                ) : (
                                  <span className="rounded-[3px] border border-[rgba(34,197,94,0.28)] bg-[rgba(22,163,74,0.12)] px-2 py-1 text-[12px] text-[#d7f5df]">
                                    {t('settings.token.expire.never')}
                                  </span>
                                )}
                              </td>
                              <td className={tokenBodyCellClassName}>{formatTokenDate(token.lastUsedTime)}</td>
                              <td className="border-b border-[#2b3039] bg-[#0b0c0e] px-3 py-3">
                                <button
                                  type="button"
                                  data-setting-token-row-action="cold-row-action"
                                  className="inline-flex h-8 min-w-[96px] items-center justify-center gap-1 whitespace-nowrap rounded-[3px] border border-[#3a2c31] bg-[#151014] px-2 text-[12px] font-semibold text-[#fca5a5] hover:border-[#7f1d1d] hover:bg-[#1f1115] hover:text-[#fecaca]"
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
          </div>
        );
      }}
    </ClientWorkbench>
  );
}
