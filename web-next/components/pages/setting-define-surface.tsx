'use client';

import React from 'react';
import { Database, Eye, FileText, Inbox, Moon, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { ColdCodeEditor } from '../ui/cold-code-editor';
import { SearchRow } from '../ui/search-row';
import { coldOpsCatalogVisual } from '../../lib/cold-ops-visual';
import { buildDefineRows, buildPreviewRows } from '../../lib/setting-define/view-model';
import type { SettingDefinePageData } from '../../lib/setting-define/controller';
import type { AlertDefine } from '../../lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type SettingDefineSurfaceProps = {
  t: Translator;
  data: SettingDefinePageData;
  search: string;
  selectedDefine: AlertDefine | null;
  editorValue: string;
  yamlLabel: string | null;
  darkMode: boolean;
  isEditing: boolean;
  formatTime: (value?: number | string | null) => string;
  message?: string | null;
  preview?: unknown;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onSelectDefine: (define: AlertDefine) => void;
  onNew: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
  onToggleDarkMode: (checked: boolean) => void;
  onPreview: () => void;
  onEditorValueChange: (value: string) => void;
};

const coldDefineVisual = coldOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-[#f8fafc]';

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-[#f8fafc]';

const coldPanelClassName = 'rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]';
const coldPanelHeaderClassName = 'border-b border-[#252b34] bg-[#101217] px-4 py-3';
const coldPanelBodyClassName = 'p-4';

function applyParams(copy: string, params?: Record<string, string | number | null | undefined>) {
  if (!params) return copy;
  return Object.entries(params).reduce((next, [key, value]) => {
    return next.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value ?? ''));
  }, copy);
}

function hasHan(copy: string) {
  return /[\u4e00-\u9fff]/.test(copy);
}

function resolveCopy(
  t: Translator,
  key: string,
  fallback: string,
  params?: Record<string, string | number | null | undefined>
) {
  const translated = t(key, params);
  const copy = translated && translated !== key && (!hasHan(fallback) || hasHan(translated)) ? translated : fallback;
  return applyParams(copy, params);
}

function normalizeDefineTitle(copy: string) {
  return copy === '监控模版' || copy === '监控模板' ? '定义' : copy;
}

function normalizeNewDefineCopy(copy: string) {
  return copy === '新增监控类型' ? '新增类型' : copy;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold tracking-[0.12em] text-[#858d9a]">{children}</div>;
}

function EmptyDefineList({ title, copy }: { title: string; copy: string }) {
  return (
    <div
      data-setting-define-empty-state="cold-list-empty"
      className="flex min-h-[220px] flex-col items-center justify-center rounded-[4px] border border-dashed border-[#303743] bg-[#0b0c0e] px-5 py-8 text-center"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]">
        <Inbox className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="mt-4 text-[13px] font-semibold text-[#eef2f7]">{title}</div>
      <div className="mt-2 max-w-[220px] text-[12px] leading-5 text-[#858d9a]">{copy}</div>
    </div>
  );
}

export function SettingDefineSurface({
  t,
  data,
  search,
  selectedDefine,
  editorValue,
  yamlLabel,
  darkMode,
  isEditing,
  formatTime,
  message,
  preview,
  onSearchChange,
  onSearch,
  onSelectDefine,
  onNew,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  onToggleDarkMode,
  onPreview,
  onEditorValueChange
}: SettingDefineSurfaceProps) {
  const items = data.list.content ?? [];
  const defineRows = buildDefineRows(items, t, formatTime);
  const previewRows = buildPreviewRows(selectedDefine, t);
  const defineTitle = normalizeDefineTitle(resolveCopy(t, 'menu.advanced.define', '定义'));
  const newDefineLabel = normalizeNewDefineCopy(resolveCopy(t, 'define.new', '新增类型'));
  const searchLabel = resolveCopy(t, 'common.search', '搜索');
  const selectedName = selectedDefine?.name || resolveCopy(t, 'setting.define.item.fallback', '未命名定义');
  const editorTitle = yamlLabel || selectedDefine?.name || defineTitle;
  const deleteLabel = resolveCopy(t, 'define.delete', '删除 {{app}}', { app: selectedName });

  return (
    <div
      data-setting-define-surface="otlp-cold-define-console"
      data-setting-define-style-baseline={coldDefineVisual.canvasName}
      className={coldDefineVisual.canvas.root}
      style={coldDefineVisual.canvas.backgroundStyle}
    >
      <section className={coldDefineVisual.layout.pageSection}>
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-5">
            <div data-setting-define-header="cold-compact-header" className={coldDefineVisual.panel.hero}>
              <div className="max-w-[860px]">
                <h1 className="text-[30px] font-semibold leading-tight text-[#f5f7fb]">{defineTitle}</h1>
                <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                  {resolveCopy(t, 'setting.define.subtitle', '管理监控类型定义、数据源和规则 YAML。')}
                </p>
                <div data-setting-define-command-row="standard-equal-buttons" className={coldDefineVisual.button.row}>
                  <Button size="sm" variant="default" className={coldPrimaryButtonClassName} onClick={onNew}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {newDefineLabel}
                  </Button>
                  {selectedDefine ? (
                    <Button size="sm" variant="default" className={coldButtonClassName} onClick={onEdit}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      {resolveCopy(t, 'common.button.edit', '编辑')}
                    </Button>
                  ) : null}
                  {isEditing ? (
                    <Button size="sm" variant="default" className={coldButtonClassName} onClick={onCancel}>
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      {resolveCopy(t, 'common.button.cancel', '取消')}
                    </Button>
                  ) : null}
                  {isEditing ? (
                    <Button size="sm" variant="default" className={coldPrimaryButtonClassName} onClick={onSave}>
                      <Save className="h-3.5 w-3.5" aria-hidden="true" />
                      {resolveCopy(t, 'define.save-apply', '保存并应用')}
                    </Button>
                  ) : null}
                  {selectedDefine ? (
                    <Button size="sm" variant="default" className={coldButtonClassName} onClick={onDelete}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {deleteLabel}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div data-setting-define-workspace="cold-define-workspace" className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside data-setting-define-menu="cold-static-list" className="min-w-0">
              <SearchRow
                data-setting-define-toolbar="cold-search-row"
                data-setting-define-search-owner="shared-search-row"
                className="mb-3"
                inputWidthClassName="w-[180px]"
                value={search}
                placeholder={searchLabel}
                searchLabel={searchLabel}
                onValueChange={onSearchChange}
                onSearch={onSearch}
              />

              <div data-setting-define-menu-shell="cold-dense-list" className={coldPanelClassName}>
                <div className={coldPanelHeaderClassName}>
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-[#eef2f7]">
                    <FileText className="h-3.5 w-3.5 text-[#858d9a]" aria-hidden="true" />
                    {defineTitle}
                  </div>
                  <div className="mt-1 text-[11px] text-[#858d9a]">{items.length} / {data.list.totalElements || 0}</div>
                </div>
                <div className="space-y-2 p-2">
                  {defineRows.length > 0 ? (
                    defineRows.map((row, index) => {
                      const original = items[index];
                      const active = Boolean(selectedDefine && selectedDefine.id === original.id);
                      return (
                        <button
                          key={row.key}
                          type="button"
                          data-setting-define-menu-item={row.key}
                          className={`w-full rounded-[3px] border px-3 py-2.5 text-left transition ${
                            active
                              ? 'border-[#4e74f8] bg-[#121a2a] text-[#eef2f7]'
                              : 'border-[#2b3039] bg-[#101217] text-[#a9b0bb] hover:border-[#3f4654] hover:bg-[#151820]'
                          }`}
                          onClick={() => onSelectDefine(original)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate text-[13px] font-semibold text-[#eef2f7]">{row.title}</span>
                            <span className="shrink-0 rounded-[3px] border border-[#303743] bg-[#0b0c0e] px-1.5 py-0.5 text-[10px] text-[#858d9a]">
                              #{row.key}
                            </span>
                          </div>
                          <div className="mt-1 truncate text-[12px] leading-5 text-[#a9b0bb]">{row.copy}</div>
                          <div className="mt-2 truncate text-[10px] font-semibold tracking-[0.12em] text-[#858d9a]">{row.meta}</div>
                        </button>
                      );
                    })
                  ) : (
                    <EmptyDefineList
                      title={resolveCopy(t, 'setting.define.empty.title', '暂无定义')}
                      copy={resolveCopy(t, 'setting.define.empty.copy', '请先新增监控类型定义。')}
                    />
                  )}
                </div>
              </div>
            </aside>

            <section data-setting-define-editor="cold-settings-form" className="min-w-0 space-y-5">
              <div data-setting-define-editor-shell="cold-yaml-editor" className={coldPanelClassName}>
                <div className={`${coldPanelHeaderClassName} flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-[#858d9a]" aria-hidden="true" />
                      <h2 className="truncate text-[13px] font-semibold text-[#eef2f7]">{editorTitle}</h2>
                    </div>
                    <div className="mt-1 truncate text-[12px] text-[#858d9a]">{previewRows[0]?.meta || '-'}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {yamlLabel ? (
                      <span
                        data-setting-define-current-yaml="true"
                        className="inline-flex h-8 items-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#a9b0bb]"
                      >
                        {yamlLabel}
                      </span>
                    ) : null}
                    <Checkbox
                      data-setting-define-theme-toggle="cold-theme-toggle"
                      checked={darkMode}
                      onChange={event => onToggleDarkMode(event.target.checked)}
                      containerClassName="h-8 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[#a9b0bb]"
                      label={
                        <>
                          <Moon className="h-3.5 w-3.5 text-[#858d9a]" aria-hidden="true" />
                          <span>{resolveCopy(t, 'common.dark-mode', '深色模式')}</span>
                        </>
                      }
                    />
                  </div>
                </div>
                <div className={coldPanelBodyClassName}>
                  <ColdCodeEditor
                    data-setting-define-editor-field="cold-code-editor"
                    data-setting-define-code-editor="definition-yaml"
                    className={darkMode ? 'bg-[#0d1117]' : undefined}
                    value={editorValue}
                    language="yaml"
                    minHeight="360px"
                    ariaLabel={editorTitle}
                    onChange={onEditorValueChange}
                    readOnly={!isEditing}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="default" className={coldButtonClassName} onClick={onPreview} disabled={!selectedDefine}>
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      {resolveCopy(t, 'setting.define.preview.action', '预览查询')}
                    </Button>
                    {message ? <p className="text-[12px] leading-5 text-[#a9b0bb]">{message}</p> : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div data-setting-define-preview-panel="cold-preview-panel" className={coldPanelClassName}>
                  <div className={coldPanelHeaderClassName}>
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-[#eef2f7]">
                      <Eye className="h-3.5 w-3.5 text-[#858d9a]" aria-hidden="true" />
                      {resolveCopy(t, 'setting.define.preview.title', '定义预览')}
                    </div>
                  </div>
                  <div className={coldPanelBodyClassName}>
                    <div className="divide-y divide-[#252b34]">
                      {previewRows.map(row => (
                        <div key={`${row.title}-${row.meta}`} className="py-2 first:pt-0 last:pb-0">
                          <div className="text-[13px] font-semibold text-[#eef2f7]">{row.title}</div>
                          <div className="mt-1 break-words text-[12px] leading-5 text-[#a9b0bb]">{row.copy}</div>
                          <div className="mt-1 text-[10px] font-semibold tracking-[0.12em] text-[#858d9a]">{row.meta}</div>
                        </div>
                      ))}
                    </div>
                    {preview ? (
                      <pre className="mt-3 max-h-[260px] overflow-auto rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-[12px] leading-5 text-[#a9b0bb]">
                        {JSON.stringify(preview, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                </div>

                <div data-setting-define-datasource-panel="cold-datasource-panel" className={coldPanelClassName}>
                  <div className={coldPanelHeaderClassName}>
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-[#eef2f7]">
                      <Database className="h-3.5 w-3.5 text-[#858d9a]" aria-hidden="true" />
                      {resolveCopy(t, 'setting.define.datasource.title', '数据源状态')}
                    </div>
                  </div>
                  <div className={coldPanelBodyClassName}>
                    <FieldLabel>{resolveCopy(t, 'common.current-view', '当前视图')}</FieldLabel>
                    <pre className="mt-3 max-h-[260px] overflow-auto rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-[12px] leading-5 text-[#a9b0bb]">
                      {JSON.stringify(data.datasourceStatus.data || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
