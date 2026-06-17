'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { ArrowLeft, Eye, Inbox, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { HzConfirmDialog, HzPaginationBar } from '@hertzbeat/ui';
import { AlertNoticeConsoleShell, type AlertNoticeConsoleTabKey } from '../../../components/pages/alert-notice-console-shell';
import { ClientWorkbench } from '../../../components/workbench/client-workbench';
import { useI18n } from '../../../components/providers/i18n-provider';
import { AlertNoticeReceiverFields } from '../../../components/pages/alert-notice-receiver-fields';
import { AlertNoticeRuleFields } from '../../../components/pages/alert-notice-rule-fields';
import { AlertNoticeTemplateFields } from '../../../components/pages/alert-notice-template-fields';
import { Button } from '../../../components/ui/button';
import { SearchRow } from '../../../components/ui/search-row';
import { Select } from '../../../components/ui/select';
import { OverlayDialog } from '../../../components/workbench/overlay-dialog';
import {
  AlertSurfaceTable,
  AlertSurfaceTableHead,
  AlertSurfaceTableShell,
  AlertSurfaceValuePill
} from '../../../components/pages/alert-surface-primitives';
import { api } from '../../../lib/alert-api-facade';
import { buildNoticeListUrl, buildNoticeRuleDisplayNames, buildNoticeRuleDraft, buildNoticeTemplateListUrl, loadAlertNoticeDataFromFacade, type NoticeReceiverDraft, type NoticeRuleDraft, type NoticeTemplateDraft } from '../../../lib/alert-notice/controller';
import type { AlertNoticeRouteState } from '../../../lib/alert-notice/query-state';
import { buildAlertNoticeEvidenceContext, buildNoticeReceiverDraft, buildNoticeTemplateDraft, getAlertNoticeProductCopy, validateNoticeReceiverDraft, validateNoticeRuleDraft, validateNoticeTemplateDraft } from '../../../lib/alert-notice/view-model';
import { DEFAULT_ALERT_LABEL_OPTIONS, loadAlertLabelOptionsFromFacade, type AlertLabelOptions } from '../../../lib/alert-label-options';
import { hzOpsCatalogVisual } from '../../../lib/hz-ops-visual';
import { formatTime } from '../../../lib/format';
import type { NoticeReceiver, NoticeRule, NoticeTemplate, PageResult } from '../../../lib/types';

type NoticePageData = {
  receivers: PageResult<NoticeReceiver>;
  receiverOptions: PageResult<NoticeReceiver>;
  rules: PageResult<NoticeRule>;
  templates: PageResult<NoticeTemplate>;
  templateOptions: PageResult<NoticeTemplate>;
  labelOptions: AlertLabelOptions;
};

type NoticeDeleteRequest = {
  kind: 'receiver' | 'rule' | 'template';
  id: number;
};

const NOTICE_PAGE_SIZE_OPTIONS = [8, 15, 25];
type Translator = ReturnType<typeof useI18n>['t'];
const coldNoticeVisual = hzOpsCatalogVisual;
const coldToolbarClass = 'flex flex-wrap items-center gap-2 border-b border-[#252b34] bg-[#0b0c0e] px-3 py-2';
const coldSelectClass =
  'h-8 w-[132px] rounded-[3px] border border-[#2b3039] bg-[#101217] px-2 text-[12px] font-semibold text-[#eef2f7] outline-none focus:border-[#4e74f8]';
const coldTableShellClass = 'rounded-[4px] border border-[#252b34] bg-[#0b0c0e]';
const coldTextPrimaryClass = 'text-[#f2f5f8]';
const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';
const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';
const coldCommandButtonClass = `${coldButtonClassName} w-[124px] min-w-[124px]`;
const coldPrimaryCommandButtonClass = `${coldPrimaryButtonClassName} w-[124px] min-w-[124px]`;
const coldIconButtonClass =
  'h-8 w-8 min-w-0 rounded-[3px] border-[#2b3039] bg-[#101217] text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';
const ALERT_NOTICE_SETTLED_CACHE_TTL_MS = 10_000;
const EMPTY_ALERT_NOTICE_ROUTE_STATE: AlertNoticeRouteState = {
  signal: null,
  signalContext: {}
};

function isApiMessageBusinessError(error: unknown) {
  return typeof error === 'object' && error !== null && typeof (error as { code?: unknown }).code === 'number';
}

function clampNoticePageIndexAfterDelete(pageIndex: number, pageSize: number, totalElements: number, deleteCount = 1) {
  const safePageSize = Math.max(1, pageSize);
  const nextTotal = Math.max(0, totalElements - deleteCount);
  const lastPageIndex = Math.max(0, Math.ceil(nextTotal / safePageSize) - 1);
  return Math.min(pageIndex, lastPageIndex);
}

const NOTICE_TYPE_LABEL_KEYS: Record<string, string> = {
  '0': 'alert.notice.type.sms',
  '1': 'alert.notice.type.email',
  '2': 'alert.notice.type.url',
  '3': 'alert.notice.type.wechat',
  '4': 'alert.notice.type.WeCom-robot',
  '5': 'alert.notice.type.ding',
  '6': 'alert.notice.type.fei-shu',
  '7': 'alert.notice.type.telegram-bot',
  '8': 'alert.notice.type.slack',
  '9': 'alert.notice.type.discord',
  '10': 'alert.notice.type.WeComApp',
  '11': 'alert.notice.type.smn',
  '12': 'alert.notice.type.serverchan',
  '13': 'alert.notice.type.gotify',
  '14': 'alert.notice.type.lark-app'
};

const NOTICE_TEMPLATE_TYPE_LABEL_KEYS: Record<string, string> = {
  ...NOTICE_TYPE_LABEL_KEYS,
  '7': 'alert.notice.type.telegram'
};

function getNoticeTypeLabel(type: number | string | null | undefined, t: Translator, emptyValue: string) {
  if (type == null) return emptyValue;
  const normalized = String(type).trim();
  if (!normalized) return emptyValue;
  const key = NOTICE_TYPE_LABEL_KEYS[normalized];
  return key ? t(key) : normalized;
}

function getNoticeTemplateTypeLabel(type: number | string | null | undefined, t: Translator, emptyValue: string) {
  if (type == null) return emptyValue;
  const normalized = String(type).trim();
  if (!normalized) return emptyValue;
  const key = NOTICE_TEMPLATE_TYPE_LABEL_KEYS[normalized];
  return key ? t(key) : normalized;
}

function formatReceiverSettingValue(value: string | null | undefined, emptyValue: string) {
  return value?.trim() || emptyValue;
}

function formatReceiverSettingParts(
  values: Array<string | number | null | undefined>,
  emptyValue: string
) {
  const text = values.map(value => String(value ?? '').trim()).filter(Boolean).join(' / ');
  return text || emptyValue;
}

function getReceiverSetting(receiver: NoticeReceiver, emptyValue: string) {
  const type = String(receiver.type ?? '');
  switch (type) {
    case '0':
      return formatReceiverSettingValue(receiver.phone, emptyValue);
    case '1':
      return formatReceiverSettingValue(receiver.email, emptyValue);
    case '2':
      return formatReceiverSettingValue(receiver.hookUrl, emptyValue);
    case '3':
    case '4':
      return formatReceiverSettingValue(receiver.wechatId, emptyValue);
    case '5':
      return formatReceiverSettingValue(receiver.accessToken, emptyValue);
    case '6':
      return formatReceiverSettingParts([receiver.wechatId, receiver.accessToken], emptyValue);
    case '7':
      return formatReceiverSettingParts([receiver.tgBotToken, receiver.tgUserId], emptyValue);
    case '8':
      return formatReceiverSettingValue(receiver.slackWebHookUrl, emptyValue);
    case '9':
      return formatReceiverSettingParts([receiver.discordChannelId, receiver.discordBotToken], emptyValue);
    case '10':
      return formatReceiverSettingParts([receiver.corpId, receiver.agentId, receiver.appSecret], emptyValue);
    case '11':
      return formatReceiverSettingValue(receiver.smnAk, emptyValue);
    case '12':
      return formatReceiverSettingValue(receiver.serverChanToken, emptyValue);
    case '13':
      return formatReceiverSettingValue(receiver.gotifyToken, emptyValue);
    case '14':
      return formatReceiverSettingValue(receiver.appId, emptyValue);
    default:
      return formatReceiverSettingParts([receiver.email, receiver.phone, receiver.hookUrl], emptyValue);
  }
}

function formatNoticeRuleReceivers(receiverNames: string[] | null | undefined, fallback: string) {
  const text = (receiverNames || []).map(name => name.trim()).filter(Boolean).join(',');
  return text || fallback;
}

function NoticePagination({
  t,
  pageIndex,
  pageSize,
  totalElements,
  visibleCount,
  testIdPrefix,
  onPageIndexChange,
  onPageSizeChange
}: {
  t: Translator;
  pageIndex: number;
  pageSize: number;
  totalElements: number;
  visibleCount: number;
  testIdPrefix: string;
  onPageIndexChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalElements / Math.max(1, pageSize)));
  const currentPageIndex = Math.min(Math.max(0, pageIndex), totalPages - 1);
  const currentPage = currentPageIndex + 1;
  const pageStart = totalElements === 0 || visibleCount === 0 ? 0 : currentPageIndex * pageSize + 1;
  const pageEnd = totalElements === 0 ? 0 : Math.min(totalElements, currentPageIndex * pageSize + visibleCount);
  const paginationSummary = t('alert.notice.pagination.summary', {
    page: currentPage,
    totalPages,
    from: pageStart,
    to: pageEnd,
    total: totalElements
  });

  function handlePageJumpChange(value: string) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return;
    onPageIndexChange(Math.min(Math.max(parsed, 1), totalPages) - 1);
  }

  return (
    <div
      data-alert-notice-pagination="hertzbeat-ui-dense-pagination"
      data-alert-notice-pagination-owner="hertzbeat-ui-pagination-bar"
    >
      <HzPaginationBar
        summary={paginationSummary}
        pageSizeLabel={t('alert.notice.pagination.page-size')}
        pageSizeValue={String(pageSize)}
        pageSizeOptions={NOTICE_PAGE_SIZE_OPTIONS.map(option => ({ value: String(option), label: String(option) }))}
        pageJumpLabel={t('alert.notice.pagination.page')}
        pageJumpValue={String(currentPage)}
        pageJumpMax={totalPages}
        previousLabel={t('common.previous-page')}
        nextLabel={t('common.next-page')}
        previousDisabled={currentPageIndex <= 0}
        nextDisabled={currentPage >= totalPages}
        onPrevious={() => onPageIndexChange(Math.max(0, currentPageIndex - 1))}
        onNext={() => onPageIndexChange(Math.min(totalPages - 1, currentPageIndex + 1))}
        onPageSizeChange={value => onPageSizeChange(Math.max(1, Number.parseInt(value, 10) || pageSize))}
        onPageJumpChange={handlePageJumpChange}
        pageJumpInputProps={
          {
            'data-alert-notice-pagination-page-jump-owner': 'hertzbeat-ui-input',
            'data-alert-notice-pagination-page-jump-scope': testIdPrefix
          } as React.ComponentProps<typeof HzPaginationBar>['pageJumpInputProps']
        }
        pageSizeSelectProps={
          {
            'data-alert-notice-pagination-page-size-owner': 'hertzbeat-ui-select',
            'data-alert-notice-pagination-page-size-scope': testIdPrefix
          } as React.ComponentProps<typeof HzPaginationBar>['pageSizeSelectProps']
        }
        className="border-x-0"
      />
    </div>
  );
}

function NoticeTableEmptyRow({
  t,
  colSpan,
  prefix
}: {
  t: Translator;
  colSpan: number;
  prefix: 'receiver' | 'rule' | 'template';
}) {
  return (
    <tr data-alert-notice-empty-row="true" data-alert-notice-receiver-empty-state={prefix === 'receiver' ? 'hertzbeat-ui-empty-state' : undefined} className="bg-[#0b0c0e]">
      <td
        colSpan={colSpan}
        className="h-[360px] px-3 pt-[54px] text-center align-top text-[#8f99ab]"
      >
        <div className="inline-flex flex-col items-center gap-2.5">
          <span
            data-alert-notice-receiver-empty-icon={prefix === 'receiver' ? 'hertzbeat-ui-empty-icon' : undefined}
            className="inline-flex h-10 w-12 items-center justify-center rounded-[4px] border border-[#2b3039] bg-[#101217] text-[#7e8494]"
          >
            <Inbox className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="text-[14px]">{t('common.no-data')}</div>
        </div>
      </td>
    </tr>
  );
}

function NoticeTableSwitch({
  checked,
  field,
  label,
  pending,
  onChange
}: {
  checked: boolean;
  field: 'filter-all' | 'enable';
  label: string;
  pending?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-alert-notice-rule-table-switch={field}
      data-alert-notice-rule-table-switch-update="angular-edit-notify"
      data-alert-notice-rule-table-switch-update-owner="route-action-feedback-contract"
      data-state={checked ? 'checked' : 'unchecked'}
      disabled={pending}
      onClick={() => onChange(!checked)}
      className="inline-flex h-6 w-11 items-center rounded-[3px] border border-[#394150] bg-[#0d0f14] p-0.5 transition hover:border-[#4e74f8] focus-visible:border-[#4e74f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.14)] disabled:cursor-not-allowed disabled:opacity-55 data-[state=checked]:border-[#4e74f8] data-[state=checked]:bg-[#182238]"
    >
      <span
        aria-hidden="true"
        className={`h-4 w-4 rounded-[2px] bg-[#dbe4f0] shadow transition ${checked ? 'translate-x-[19px]' : 'translate-x-0'}`}
      />
    </button>
  );
}

export default function AlertNoticePage({ initialRouteState }: { initialRouteState?: AlertNoticeRouteState } = {}) {
  const { t, locale } = useI18n();
  const alertNoticeRouteState = initialRouteState ?? EMPTY_ALERT_NOTICE_ROUTE_STATE;
  const { signal, signalContext } = alertNoticeRouteState;
  const noticeEvidenceContext = useMemo(
    () => buildAlertNoticeEvidenceContext(signal, signalContext, t),
    [signal, signalContext, t]
  );
  const [editingReceiver, setEditingReceiver] = useState(false);
  const [receiverDraft, setReceiverDraft] = useState<NoticeReceiverDraft>(() => buildNoticeReceiverDraft(null));
  const [selectedReceiverId, setSelectedReceiverId] = useState<number | null>(null);
  const [receiverSearchDraft, setReceiverSearchDraft] = useState('');
  const [receiverSearch, setReceiverSearch] = useState('');
  const [receiverPageIndex, setReceiverPageIndex] = useState(0);
  const [receiverPageSize, setReceiverPageSize] = useState(8);
  const [savingReceiver, setSavingReceiver] = useState(false);
  const [testingReceiver, setTestingReceiver] = useState(false);
  const [receiverMessage, setReceiverMessage] = useState<string | null>(null);
  const [receiverError, setReceiverError] = useState<string | null>(null);
  const [receiverErrorDetail, setReceiverErrorDetail] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [templateDraft, setTemplateDraft] = useState<NoticeTemplateDraft>(() => buildNoticeTemplateDraft(null));
  const [templateReadOnly, setTemplateReadOnly] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateErrorDetail, setTemplateErrorDetail] = useState<string | null>(null);
  const [templateSearchDraft, setTemplateSearchDraft] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [templatePresetFilter, setTemplatePresetFilter] = useState(true);
  const [templatePageIndex, setTemplatePageIndex] = useState(0);
  const [templatePageSize, setTemplatePageSize] = useState(8);
  const [selectedTab, setSelectedTab] = useState<AlertNoticeConsoleTabKey>(() => noticeEvidenceContext ? 'rule' : 'receiver');
  const [editingRule, setEditingRule] = useState(false);
  const [ruleDraft, setRuleDraft] = useState<NoticeRuleDraft>(() => buildNoticeRuleDraft(null));
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);
  const [ruleSearchDraft, setRuleSearchDraft] = useState('');
  const [ruleSearch, setRuleSearch] = useState('');
  const [rulePageIndex, setRulePageIndex] = useState(0);
  const [rulePageSize, setRulePageSize] = useState(8);
  const [savingRule, setSavingRule] = useState(false);
  const [ruleMessage, setRuleMessage] = useState<string | null>(null);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [ruleErrorDetail, setRuleErrorDetail] = useState<string | null>(null);
  const [ruleSwitchPending, setRuleSwitchPending] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [deleteRequest, setDeleteRequest] = useState<NoticeDeleteRequest | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const alertNoticeReceiverListUrl = useMemo(() => buildNoticeListUrl('/notice/receivers', { search: receiverSearch, pageIndex: receiverPageIndex, pageSize: receiverPageSize }), [receiverPageIndex, receiverPageSize, receiverSearch]);
  const alertNoticeRuleListUrl = useMemo(() => buildNoticeListUrl('/notice/rules', { search: ruleSearch, pageIndex: rulePageIndex, pageSize: rulePageSize }), [rulePageIndex, rulePageSize, ruleSearch]);
  const alertNoticeTemplateListUrl = useMemo(
    () => buildNoticeTemplateListUrl({ search: templateSearch, preset: templatePresetFilter, pageIndex: templatePageIndex, pageSize: templatePageSize }),
    [templatePageIndex, templatePageSize, templatePresetFilter, templateSearch]
  );
  const alertNoticeLoadQuery = useMemo(
    () => ({
      receivers: {
        search: receiverSearch,
        pageIndex: receiverPageIndex,
        pageSize: receiverPageSize
      },
      rules: {
        search: ruleSearch,
        pageIndex: rulePageIndex,
        pageSize: rulePageSize
      },
      templates: {
        search: templateSearch,
        preset: templatePresetFilter,
        pageIndex: templatePageIndex,
        pageSize: templatePageSize
      }
    }),
    [receiverPageIndex, receiverPageSize, receiverSearch, rulePageIndex, rulePageSize, ruleSearch, templatePageIndex, templatePageSize, templatePresetFilter, templateSearch]
  );
  const alertNoticeCacheKey = useMemo(
    () => ['alert-notice', alertNoticeReceiverListUrl, alertNoticeRuleListUrl, alertNoticeTemplateListUrl, refreshTick].join('|'),
    [alertNoticeReceiverListUrl, alertNoticeRuleListUrl, alertNoticeTemplateListUrl, refreshTick]
  );

  const load = useCallback(async (): Promise<NoticePageData> => {
    void refreshTick;
    const [noticeData, labelOptions] = await Promise.all([
      loadAlertNoticeDataFromFacade(
        {
          receivers: api.alertNotice.receivers.list,
          rules: api.alertNotice.rules.list,
          receiverOptions: api.alertNotice.receivers.options,
          templates: api.alertNotice.templates.list,
          templateOptions: api.alertNotice.templates.options
        },
        alertNoticeLoadQuery
      ),
      loadAlertLabelOptionsFromFacade(api.alertLabels.list).catch(() => DEFAULT_ALERT_LABEL_OPTIONS)
    ]);
    return { ...noticeData, labelOptions };
  }, [alertNoticeLoadQuery, refreshTick]);

  const productCopy = getAlertNoticeProductCopy(t);
  const emptyValue = t('common.none');

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('alert.notice.loading')}
      cacheKey={alertNoticeCacheKey}
      cacheSettledTtlMs={ALERT_NOTICE_SETTLED_CACHE_TTL_MS}
    >
      {data => {
        const selectedReceiver = data.receivers.content.find(item => item.id === selectedReceiverId) ?? data.receivers.content[0] ?? null;
        const selectedRule = data.rules.content.find(item => item.id === selectedRuleId) ?? data.rules.content[0] ?? null;
        const labelOptions = data.labelOptions ?? DEFAULT_ALERT_LABEL_OPTIONS;
        const selectedTemplate =
          data.templates.content.find(item => item.id === selectedTemplateId) ??
          data.templates.content.find(item => !item.preset) ??
          data.templates.content[0] ??
          null;
        const selectedTemplateIsCustom = selectedTemplate ? !selectedTemplate.preset : false;
        const templateTotalElements = data.templates.totalElements ?? data.templates.content.length;
        const normalizedTemplatePageIndex = data.templates.pageIndex ?? templatePageIndex;
        const templateVisibleRows = data.templates.content;
        const receiverOptionRows = data.receiverOptions?.content?.length ? data.receiverOptions.content : data.receivers.content;
        const receiverOptions = receiverOptionRows.map(receiver => ({
          value: String(receiver.id),
          label: `${receiver.name || productCopy.receiverFallback}-${getNoticeTypeLabel(receiver.type, t, emptyValue)}`,
          type: receiver.type
        }));
        const templateOptions = [
          { value: '-1', label: t('alert.notice.template.preset.true') },
          ...(data.templateOptions?.content ?? data.templates.content)
            .filter(template => template.id != null)
            .map(template => ({
              value: String(template.id),
              label: template.name || productCopy.templateFallback,
              type: template.type
            }))
        ];
        const receiverTotal = data.receivers.totalElements ?? data.receivers.content.length;
        const ruleTotal = data.rules.totalElements ?? data.rules.content.length;
        const templateTotal = data.templates.totalElements ?? data.templates.content.length;

        async function handleNewReceiver() {
          setSelectedTab('receiver');
          setReceiverDraft(buildNoticeReceiverDraft(null));
          setReceiverMessage(null);
          setReceiverError(null);
          setReceiverErrorDetail(null);
          setEditingReceiver(true);
        }

        async function handleEditReceiver(receiver = selectedReceiver) {
          if (!receiver?.id) return;
          try {
            setSelectedTab('receiver');
            setSelectedReceiverId(receiver.id);
            const detail = await api.alertNotice.receivers.detail(receiver.id);
            setReceiverDraft(buildNoticeReceiverDraft(detail));
            setReceiverMessage(null);
            setReceiverError(null);
            setReceiverErrorDetail(null);
            setEditingReceiver(true);
          } catch (error) {
            setReceiverError(error instanceof Error ? error.message : t('common.notify.edit-fail'));
            setReceiverErrorDetail(null);
          }
        }

        async function handleSaveReceiver() {
          const isEdit = Boolean(receiverDraft.id);
          const validationError = validateNoticeReceiverDraft(receiverDraft, t);
          if (validationError) {
            setReceiverMessage(null);
            setReceiverError(validationError);
            setReceiverErrorDetail(null);
            return;
          }
          setSavingReceiver(true);
          setReceiverMessage(null);
          setReceiverError(null);
          setReceiverErrorDetail(null);
          try {
            if (receiverDraft.id) {
              await api.alertNotice.receivers.update(receiverDraft);
            } else {
              await api.alertNotice.receivers.create(receiverDraft);
            }
            setReceiverMessage([t(isEdit ? 'common.notify.edit-success' : 'common.notify.new-success'), t('alert.notice.receiver.next')].join(' '));
            setEditingReceiver(false);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setReceiverError(t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'));
            setReceiverErrorDetail(error instanceof Error ? error.message : null);
            if (!isApiMessageBusinessError(error)) {
              setEditingReceiver(false);
            }
          } finally {
            setSavingReceiver(false);
          }
        }

        async function handleDeleteReceiver() {
          if (!selectedReceiver?.id) return;
          await handleDeleteReceiverById(selectedReceiver.id);
        }

        async function handleDeleteReceiverById(receiverId: number) {
          setDeleteRequest({ kind: 'receiver', id: receiverId });
        }

        async function handleConfirmedDelete() {
          const request = deleteRequest;
          if (!request) return;
          setDeletePending(true);
          try {
            if (request.kind === 'receiver') {
              await api.alertNotice.receivers.delete(request.id);
              setSelectedReceiverId(null);
              setReceiverPageIndex(pageIndex => clampNoticePageIndexAfterDelete(pageIndex, receiverPageSize, receiverTotal, 1));
              setReceiverMessage(t('common.notify.delete-success'));
              setReceiverError(null);
              setReceiverErrorDetail(null);
              setEditingReceiver(false);
            } else if (request.kind === 'template') {
              await api.alertNotice.templates.delete(request.id);
              setSelectedTemplateId(null);
              setTemplatePageIndex(pageIndex => clampNoticePageIndexAfterDelete(pageIndex, templatePageSize, templateTotal, 1));
              setTemplateMessage(t('common.notify.delete-success'));
              setTemplateError(null);
              setTemplateErrorDetail(null);
              setTemplateReadOnly(false);
              setEditingTemplate(false);
            } else {
              await api.alertNotice.rules.delete(request.id);
              setSelectedRuleId(null);
              setRulePageIndex(pageIndex => clampNoticePageIndexAfterDelete(pageIndex, rulePageSize, ruleTotal, 1));
              setRuleMessage(t('common.notify.delete-success'));
              setRuleError(null);
              setRuleErrorDetail(null);
              setEditingRule(false);
            }
            setDeleteRequest(null);
            setRefreshTick(value => value + 1);
          } catch (error) {
            const fallback = error instanceof Error ? error.message : t('common.notify.delete-fail');
            if (request.kind === 'receiver') {
              setReceiverError(fallback);
              setReceiverErrorDetail(null);
            } else if (request.kind === 'template') {
              setTemplateError(fallback);
              setTemplateErrorDetail(null);
            } else {
              setRuleError(fallback);
              setRuleErrorDetail(null);
            }
          } finally {
            setDeletePending(false);
          }
        }

        async function handleTestSend() {
          setTestingReceiver(true);
          setReceiverMessage(null);
          setReceiverError(null);
          setReceiverErrorDetail(null);
          try {
            await api.alertNotice.receivers.sendTest(receiverDraft);
            setReceiverMessage(t('alert.notice.send-test.notify.success'));
            setReceiverError(null);
            setReceiverErrorDetail(null);
          } catch (error) {
            setReceiverMessage(null);
            setReceiverError(error instanceof Error ? error.message : t('alert.notice.send-test.notify.failed'));
            setReceiverErrorDetail(null);
          } finally {
            setTestingReceiver(false);
          }
        }

        async function handleNewTemplate() {
          setSelectedTab('template');
          setTemplateDraft(buildNoticeTemplateDraft(null));
          setTemplateReadOnly(false);
          setTemplateMessage(null);
          setTemplateError(null);
          setTemplateErrorDetail(null);
          setEditingTemplate(true);
        }

        async function handleEditTemplate(template = selectedTemplate) {
          if (!template?.id || template.preset) return;
          try {
            setSelectedTab('template');
            setSelectedTemplateId(template.id);
            setTemplateReadOnly(false);
            const detail = await api.alertNotice.templates.detail(template.id);
            setTemplateDraft(buildNoticeTemplateDraft(detail));
            setTemplateMessage(null);
            setTemplateError(null);
            setTemplateErrorDetail(null);
            setEditingTemplate(true);
          } catch (error) {
            setTemplateError(error instanceof Error ? error.message : t('common.notify.edit-fail'));
            setTemplateErrorDetail(null);
          }
        }

        async function handleViewTemplate(template: NoticeTemplate) {
          const templateId = typeof template.id === 'number' && Number.isFinite(template.id) ? template.id : null;
          const rowDraft = buildNoticeTemplateDraft(template);
          setSelectedTab('template');
          setSelectedTemplateId(templateId);
          setTemplateReadOnly(true);
          setTemplateDraft(rowDraft);
          setTemplateMessage(null);
          setTemplateError(null);
          setTemplateErrorDetail(null);
          setEditingTemplate(true);

          if (templateId == null) return;

          try {
            const detail = await api.alertNotice.templates.detail(templateId);
            setTemplateDraft(buildNoticeTemplateDraft(detail));
          } catch (error) {
            setTemplateError(null);
            setTemplateErrorDetail(null);
          }
        }

        async function handleSaveTemplate() {
          const isEdit = Boolean(templateDraft.id);
          const validationError = validateNoticeTemplateDraft(templateDraft, t);
          if (validationError) {
            setTemplateMessage(null);
            setTemplateError(validationError);
            setTemplateErrorDetail(null);
            return;
          }
          setSavingTemplate(true);
          setTemplateMessage(null);
          setTemplateError(null);
          setTemplateErrorDetail(null);
          try {
            if (templateDraft.id) {
              await api.alertNotice.templates.update(templateDraft);
            } else {
              await api.alertNotice.templates.create(templateDraft);
            }
            setTemplateMessage(t(isEdit ? 'common.notify.edit-success' : 'common.notify.new-success'));
            setEditingTemplate(false);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setTemplateError(t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'));
            setTemplateErrorDetail(error instanceof Error ? error.message : null);
          } finally {
            setSavingTemplate(false);
          }
        }

        async function handleDeleteTemplate() {
          if (!selectedTemplate?.id || selectedTemplate.preset) return;
          await handleDeleteTemplateById(selectedTemplate.id);
        }

        async function handleDeleteTemplateById(templateId: number) {
          setDeleteRequest({ kind: 'template', id: templateId });
        }

        function commitTemplateSearch() {
          setTemplateSearch(templateSearchDraft);
          setTemplatePageIndex(0);
        }

        function resetTemplateSearch() {
          setTemplateSearchDraft('');
          setTemplateSearch('');
          setTemplatePageIndex(0);
        }

        async function handleNewRule() {
          setSelectedTab('rule');
          setRuleDraft(buildNoticeRuleDraft(null, noticeEvidenceContext?.ruleDraftPatch));
          setRuleMessage(null);
          setRuleError(null);
          setRuleErrorDetail(null);
          setEditingRule(true);
        }

        async function handleEditRule(rule = selectedRule) {
          const ruleId = rule?.id;
          if (!ruleId) return;
          try {
            setSelectedTab('rule');
            setSelectedRuleId(ruleId);
            const detail = await api.alertNotice.rules.detail(ruleId);
            setRuleDraft(buildNoticeRuleDraft(detail));
            setRuleMessage(null);
            setRuleError(null);
            setRuleErrorDetail(null);
            setEditingRule(true);
          } catch (error) {
            setRuleError(error instanceof Error ? error.message : t('common.notify.edit-fail'));
            setRuleErrorDetail(null);
          }
        }

        async function handleSaveRule() {
          const isEdit = Boolean(ruleDraft.id);
          const validationError = validateNoticeRuleDraft(ruleDraft, t);
          if (validationError) {
            setRuleMessage(null);
            setRuleError(validationError);
            setRuleErrorDetail(null);
            return;
          }
          setSavingRule(true);
          setRuleMessage(null);
          setRuleError(null);
          setRuleErrorDetail(null);
          try {
            const displayNames = buildNoticeRuleDisplayNames(ruleDraft, receiverOptions, templateOptions);
            if (ruleDraft.id) {
              await api.alertNotice.rules.update(ruleDraft, displayNames);
            } else {
              await api.alertNotice.rules.create(ruleDraft, displayNames);
            }
            setRuleMessage(t(isEdit ? 'common.notify.edit-success' : 'common.notify.new-success'));
            setEditingRule(false);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setRuleError(t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'));
            setRuleErrorDetail(error instanceof Error ? error.message : null);
          } finally {
            setSavingRule(false);
          }
        }

        async function handleDeleteRule() {
          if (!selectedRule?.id) return;
          await handleDeleteRuleById(selectedRule.id);
        }

        async function handleDeleteRuleById(ruleId: number) {
          setDeleteRequest({ kind: 'rule', id: ruleId });
        }

        async function handleToggleRuleSwitch(rule: NoticeRule, field: 'filterAll' | 'enable', checked: boolean) {
          if (!rule.id) return;
          const pendingKey = `${rule.id}:${field}`;
          setRuleSwitchPending(pendingKey);
          setRuleMessage(null);
          setRuleError(null);
          setRuleErrorDetail(null);
          try {
            await api.alertNotice.rules.update(
              buildNoticeRuleDraft({ ...rule, [field]: checked }),
              {
                receiverName: rule.receiverName ?? [],
                templateName: rule.templateId ? rule.templateName ?? null : null
              }
            );
            setRuleMessage(t('common.notify.edit-success'));
            setRefreshTick(value => value + 1);
          } catch (error) {
            setRuleError(error instanceof Error ? error.message : t('common.notify.edit-fail'));
            setRuleErrorDetail(null);
          } finally {
            setRuleSwitchPending(current => (current === pendingKey ? null : current));
          }
        }

        function commitReceiverSearch() {
          setReceiverSearch(receiverSearchDraft.trim());
          setReceiverPageIndex(0);
        }

        function resetReceiverSearch() {
          setReceiverSearchDraft('');
          setReceiverSearch('');
          setReceiverPageIndex(0);
        }

        function commitRuleSearch() {
          setRuleSearch(ruleSearchDraft.trim());
          setRulePageIndex(0);
        }

        function resetRuleSearch() {
          setRuleSearchDraft('');
          setRuleSearch('');
          setRulePageIndex(0);
        }

        const receiverPanel = (
          <div data-alert-notice-receiver-panel="true">
            <div
              data-alert-notice-receiver-toolbar="hertzbeat-ui-query-toolbar"
              data-alert-notice-receiver-toolbar-layout="compact-inline-actions-query"
              className={coldToolbarClass}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  data-alert-notice-receiver-sync="angular-load-table"
                  data-alert-notice-receiver-sync-owner="route-refresh-contract"
                  className={coldIconButtonClass}
                  size="icon"
                  variant="default"
                  onClick={() => setRefreshTick(value => value + 1)}
                  title={t('common.refresh')}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{t('common.refresh')}</span>
                </Button>
                <Button data-testid="notice-receiver-new" className={coldPrimaryCommandButtonClass} size="sm" variant="default" onClick={() => void handleNewReceiver()}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t('alert.notice.receiver.new')}
                </Button>
                <Button
                  data-alert-notice-receiver-bulk-menu="hertzbeat-ui-more"
                  data-testid="notice-receiver-delete"
                  className={coldIconButtonClass}
                  size="icon"
                  variant="default"
                  onClick={() => void handleDeleteReceiver()}
                  disabled={!selectedReceiver}
                  title={t('common.button.delete')}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{t('common.button.delete')}</span>
                </Button>
              </div>
                <SearchRow
                  data-alert-notice-receiver-search="shared-compact"
                  data-alert-notice-receiver-search-submit="angular-enter-and-clear"
                  data-alert-notice-receiver-search-submit-owner="hertzbeat-ui-search-row"
                className="mb-0"
                value={receiverSearchDraft}
                placeholder={t('alert.notice.receiver.people.name')}
                searchLabel={t('common.search')}
                clearLabel={t('common.clear')}
                onValueChange={setReceiverSearchDraft}
                onSearch={commitReceiverSearch}
                onClear={receiverSearchDraft || receiverSearch ? resetReceiverSearch : undefined}
              />
            </div>
            <AlertSurfaceTableShell data-alert-notice-receiver-table-shell="hertzbeat-ui-dense-table" className={coldTableShellClass}>
              <AlertSurfaceTable className="min-w-[1240px] text-center">
                <AlertSurfaceTableHead className="text-center text-[13px] normal-case tracking-normal">
                  <tr>
                    <th className="w-[15%] px-3 py-3 text-center">{t('alert.notice.receiver.people')}</th>
                    <th className="w-[15%] px-3 py-3 text-center">{t('alert.notice.receiver.type')}</th>
                    <th className="w-[25%] px-3 py-3 text-center">{t('alert.notice.receiver.setting')}</th>
                    <th className="w-[15%] px-3 py-3 text-center">{t('common.edit-time')}</th>
                    <th className="w-[15%] px-3 py-3 text-center">{t('common.edit')}</th>
                  </tr>
                </AlertSurfaceTableHead>
                <tbody>
                  {data.receivers.content.length > 0 ? data.receivers.content.map(receiver => (
                    <tr
                      key={receiver.id}
                      data-alert-notice-receiver-row={String(receiver.id)}
                      className="border-t border-[#252b34] hover:bg-[#101217]"
                      onClick={() => setSelectedReceiverId(receiver.id)}
                    >
                      <td className={`px-3 py-3 text-center font-medium ${coldTextPrimaryClass}`}>{receiver.name || t('alert.notice.receiver.people')}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex justify-center">
                          <AlertSurfaceValuePill>{getNoticeTypeLabel(receiver.type, t, emptyValue)}</AlertSurfaceValuePill>
                        </div>
                      </td>
                      <td className="max-w-[340px] truncate px-3 py-3 text-center" title={getReceiverSetting(receiver, emptyValue)}>{getReceiverSetting(receiver, emptyValue)}</td>
                      <td className="px-3 py-3 text-center">{formatTime(receiver.gmtUpdate || receiver.gmtCreate || null)}</td>
                      <td className="px-3 py-3 text-center" onClick={event => event.stopPropagation()}>
                        <div className="flex justify-center gap-2">
                          <Button
                            data-alert-notice-receiver-edit-detail="angular-detail-fetch"
                            data-alert-notice-receiver-edit-detail-owner="route-detail-fetch-contract"
                            className={coldIconButtonClass}
                            size="icon"
                            variant="default"
                            onClick={() => void handleEditReceiver(receiver)}
                            title={t('alert.notice.receiver.edit')}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">{t('alert.notice.receiver.edit')}</span>
                          </Button>
                          <Button
                            className={coldIconButtonClass}
                            size="icon"
                            variant="default"
                            onClick={() => void handleDeleteReceiverById(receiver.id)}
                            title={t('alert.notice.receiver.delete')}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">{t('alert.notice.receiver.delete')}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <NoticeTableEmptyRow t={t} colSpan={5} prefix="receiver" />
                  )}
                </tbody>
              </AlertSurfaceTable>
            </AlertSurfaceTableShell>
            {(data.receivers.totalElements || 0) > 0 ? (
              <NoticePagination
                t={t}
                pageIndex={receiverPageIndex}
                pageSize={receiverPageSize}
                totalElements={data.receivers.totalElements || 0}
                visibleCount={data.receivers.content.length}
                testIdPrefix="notice-receiver"
                onPageIndexChange={setReceiverPageIndex}
                onPageSizeChange={nextPageSize => {
                  setReceiverPageSize(nextPageSize);
                  setReceiverPageIndex(0);
                }}
              />
            ) : null}
            {!editingReceiver && receiverMessage ? <div className="px-3 py-2 text-sm text-emerald-300">{receiverMessage}</div> : null}
            {!editingReceiver && receiverError ? (
              <div
                role="alert"
                data-alert-notice-receiver-save-failure={receiverErrorDetail ? 'angular-notify-title-detail' : undefined}
                data-alert-notice-receiver-save-failure-owner={receiverErrorDetail ? 'route-action-feedback-contract' : undefined}
                data-alert-notice-receiver-save-failure-title={receiverErrorDetail ? receiverError : undefined}
                data-alert-notice-receiver-save-failure-detail={receiverErrorDetail ?? undefined}
                className="px-3 py-2 text-sm text-rose-300"
              >
                <span>{receiverError}</span>
                {receiverErrorDetail ? <span className="mt-1 block text-rose-200">{receiverErrorDetail}</span> : null}
              </div>
            ) : null}
          </div>
        );

        const rulePanel = (
          <div
            data-alert-notice-rule-panel="true"
            data-alert-notice-rule-template-display="angular-template-id-fallback"
            data-alert-notice-rule-template-display-owner="route-table-contract"
            data-alert-notice-rule-receiver-display="angular-array-interpolation"
            data-alert-notice-rule-receiver-display-owner="route-table-contract"
          >
            <div
              data-alert-notice-rule-toolbar="hertzbeat-ui-query-toolbar"
              data-alert-notice-rule-toolbar-layout="compact-inline-actions-query"
              className={coldToolbarClass}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  data-alert-notice-rule-sync="angular-load-table"
                  data-alert-notice-rule-sync-owner="route-refresh-contract"
                  className={coldIconButtonClass}
                  size="icon"
                  variant="default"
                  onClick={() => setRefreshTick(value => value + 1)}
                  title={t('common.refresh')}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{t('common.refresh')}</span>
                </Button>
                <Button className={coldPrimaryCommandButtonClass} variant="default" size="sm" onClick={() => void handleNewRule()}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t('alert.notice.rule.new')}
                </Button>
                <Button className={coldIconButtonClass} variant="default" size="icon" onClick={() => void handleDeleteRule()} disabled={!selectedRule} title={t('common.button.delete')}>
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{t('common.button.delete')}</span>
                </Button>
              </div>
                <SearchRow
                  data-alert-notice-rule-search="shared-compact"
                  data-alert-notice-rule-search-submit="angular-enter-and-clear"
                  data-alert-notice-rule-search-submit-owner="hertzbeat-ui-search-row"
                className="mb-0"
                value={ruleSearchDraft}
                placeholder={t('alert.notice.rule.name')}
                searchLabel={t('common.search')}
                clearLabel={t('common.clear')}
                onValueChange={setRuleSearchDraft}
                onSearch={commitRuleSearch}
                onClear={ruleSearchDraft || ruleSearch ? resetRuleSearch : undefined}
              />
            </div>
            <AlertSurfaceTableShell data-alert-notice-rule-table-shell="hertzbeat-ui-dense-table" className={coldTableShellClass}>
              <AlertSurfaceTable className="min-w-[1240px] text-center">
                <AlertSurfaceTableHead className="text-center text-[13px] normal-case tracking-normal">
                  <tr>
                    <th className="px-3 py-3 text-center">{t('alert.notice.rule.name')}</th>
                    <th className="px-3 py-3 text-center">{t('alert.notice.receiver.people')}</th>
                    <th className="px-3 py-3 text-center">{t('alert.notice.template.name')}</th>
                    <th className="px-3 py-3 text-center">{t('alert.notice.rule.all')}</th>
                    <th className="px-3 py-3 text-center">{t('common.enable')}</th>
                    <th className="px-3 py-3 text-center">{t('common.edit-time')}</th>
                    <th className="px-3 py-3 text-center">{t('common.edit')}</th>
                  </tr>
                </AlertSurfaceTableHead>
                <tbody>
                  {data.rules.content.length > 0 ? data.rules.content.map(rule => (
                    <tr
                      key={rule.id}
                      data-alert-notice-rule-row={String(rule.id)}
                      className="border-t border-[#252b34] hover:bg-[#101217]"
                      onClick={() => setSelectedRuleId(rule.id)}
                    >
                      <td className={`px-3 py-3 text-center font-medium ${coldTextPrimaryClass}`}>{rule.name || t('alert.notice.rule')}</td>
                      <td className="px-3 py-3 text-center">{formatNoticeRuleReceivers(rule.receiverName, productCopy.ruleNoReceiver)}</td>
                      <td className="px-3 py-3 text-center">{rule.templateId ? rule.templateName || t('alert.notice.template.preset.true') : t('alert.notice.template.preset.true')}</td>
                      <td className="px-3 py-3 text-center" onClick={event => event.stopPropagation()}>
                        <NoticeTableSwitch
                          field="filter-all"
                          checked={Boolean(rule.filterAll)}
                          pending={ruleSwitchPending === `${rule.id}:filterAll`}
                          label={t('alert.notice.rule.all')}
                          onChange={checked => void handleToggleRuleSwitch(rule, 'filterAll', checked)}
                        />
                      </td>
                      <td className="px-3 py-3 text-center" onClick={event => event.stopPropagation()}>
                        <NoticeTableSwitch
                          field="enable"
                          checked={Boolean(rule.enable)}
                          pending={ruleSwitchPending === `${rule.id}:enable`}
                          label={t('common.enable')}
                          onChange={checked => void handleToggleRuleSwitch(rule, 'enable', checked)}
                        />
                      </td>
                      <td className="px-3 py-3 text-center">{formatTime(rule.gmtUpdate || rule.gmtCreate || null)}</td>
                      <td className="px-3 py-3 text-center" onClick={event => event.stopPropagation()}>
                        <div className="flex justify-center gap-2">
                          <Button
                            className={coldIconButtonClass}
                            size="icon"
                            variant="default"
                            data-alert-notice-rule-edit-detail="angular-detail-fetch"
                            data-alert-notice-rule-edit-detail-owner="route-detail-fetch-contract"
                            onClick={() => void handleEditRule(rule)}
                            title={t('alert.notice.rule.edit')}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">{t('alert.notice.rule.edit')}</span>
                          </Button>
                          <Button className={coldIconButtonClass} size="icon" variant="default" onClick={() => void handleDeleteRuleById(rule.id)} title={t('alert.notice.rule.delete')}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">{t('alert.notice.rule.delete')}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <NoticeTableEmptyRow t={t} colSpan={7} prefix="rule" />
                  )}
                </tbody>
              </AlertSurfaceTable>
            </AlertSurfaceTableShell>
            {(data.rules.totalElements || 0) > 0 ? (
              <NoticePagination
                t={t}
                pageIndex={rulePageIndex}
                pageSize={rulePageSize}
                totalElements={data.rules.totalElements || 0}
                visibleCount={data.rules.content.length}
                testIdPrefix="notice-rule"
                onPageIndexChange={setRulePageIndex}
                onPageSizeChange={nextPageSize => {
                  setRulePageSize(nextPageSize);
                  setRulePageIndex(0);
                }}
              />
            ) : null}
            {ruleMessage ? <div className="px-3 py-2 text-sm text-emerald-300">{ruleMessage}</div> : null}
            {!editingRule && ruleError ? (
              <div role="alert" className="px-3 py-2 text-sm text-rose-300">{ruleError}</div>
            ) : null}
          </div>
        );

        const templatePanel = (
          <div
            data-alert-notice-template-panel="true"
            data-alert-notice-template-query-owner="backend-paginated"
            data-alert-notice-template-query-url={alertNoticeTemplateListUrl}
            data-alert-notice-template-telegram-label="angular-template-telegram"
            data-alert-notice-template-telegram-label-owner="route-i18n-contract"
          >
            <div
              data-alert-notice-template-toolbar="hertzbeat-ui-query-toolbar"
              data-alert-notice-template-toolbar-layout="compact-inline-actions-query"
              className={coldToolbarClass}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  data-alert-notice-template-sync="angular-load-table"
                  data-alert-notice-template-sync-owner="route-refresh-contract"
                  className={coldIconButtonClass}
                  size="icon"
                  variant="default"
                  onClick={() => setRefreshTick(value => value + 1)}
                  title={t('common.refresh')}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{t('common.refresh')}</span>
                </Button>
                <Button className={coldPrimaryCommandButtonClass} variant="default" size="sm" onClick={() => void handleNewTemplate()}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t('alert.notice.template.new')}
                </Button>
                <Button className={coldIconButtonClass} variant="default" size="icon" onClick={() => void handleDeleteTemplate()} disabled={!selectedTemplateIsCustom} title={t('common.button.delete')}>
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{t('common.button.delete')}</span>
                </Button>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Select
                  data-alert-notice-template-preset-filter="hertzbeat-ui-select"
                  data-alert-notice-template-preset-query="server-param"
                  aria-label={t('monitor.status')}
                  value={templatePresetFilter ? 'true' : 'false'}
                  onChange={event => {
                    setTemplatePresetFilter(event.target.value === 'true');
                    setTemplatePageIndex(0);
                  }}
                  containerClassName="w-[132px]"
                  className={coldSelectClass}
                >
                  <option value="true">{t('alert.notice.template.preset.true')}</option>
                  <option value="false">{t('alert.notice.template.preset.false')}</option>
                </Select>
                <SearchRow
                  data-alert-notice-template-search="shared-compact"
                  data-alert-notice-template-search-submit="angular-enter-and-clear"
                  data-alert-notice-template-search-submit-owner="hertzbeat-ui-search-row"
                  className="mb-0"
                  value={templateSearchDraft}
                  placeholder={t('alert.notice.template.name')}
                  searchLabel={t('common.search')}
                  clearLabel={t('common.clear')}
                  onValueChange={setTemplateSearchDraft}
                  onSearch={commitTemplateSearch}
                  onClear={templateSearchDraft || templateSearch ? resetTemplateSearch : undefined}
                />
              </div>
            </div>
            <AlertSurfaceTableShell data-alert-notice-template-table-shell="hertzbeat-ui-dense-table" className={coldTableShellClass}>
              <AlertSurfaceTable className="min-w-[1240px] text-center">
                <AlertSurfaceTableHead className="text-center text-[13px] normal-case tracking-normal">
                  <tr>
                    <th className="px-3 py-3 text-center">{t('alert.notice.template.name')}</th>
                    <th className="px-3 py-3 text-center">{t('alert.notice.template.type')}</th>
                    <th className="px-3 py-3 text-center">{t('alert.notice.template.preset')}</th>
                    <th className="px-3 py-3 text-center">{t('common.edit-time')}</th>
                    <th className="px-3 py-3 text-center">{t('common.edit')}</th>
                  </tr>
                </AlertSurfaceTableHead>
                <tbody>
                  {templateVisibleRows.length > 0 ? templateVisibleRows.map((template, index) => (
                    <tr
                      key={String(template.id ?? template.name ?? index)}
                      data-alert-notice-template-row={String(template.id ?? template.name ?? index)}
                      className="border-t border-[#252b34] hover:bg-[#101217]"
                      onClick={() => setSelectedTemplateId(typeof template.id === 'number' ? template.id : null)}
                    >
                      <td className={`px-3 py-3 text-center font-medium ${coldTextPrimaryClass}`}>{template.name || t('alert.notice.template')}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex justify-center">
                          <AlertSurfaceValuePill>{getNoticeTemplateTypeLabel(template.type, t, emptyValue)}</AlertSurfaceValuePill>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex justify-center">
                          <AlertSurfaceValuePill>{template.preset ? t('alert.notice.template.preset.true') : t('alert.notice.template.preset.false')}</AlertSurfaceValuePill>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">{formatTime(template.gmtUpdate || template.gmtCreate || null)}</td>
                      <td className="px-3 py-3 text-center" onClick={event => event.stopPropagation()}>
                        <div className="flex justify-center gap-2">
                          {template.preset ? (
                            <Button
                              data-alert-notice-template-view-trigger="hertzbeat-ui-modal-viewer-trigger"
                              className={coldIconButtonClass}
                              size="icon"
                              variant="default"
                              onClick={() => void handleViewTemplate(template)}
                              title={t('alert.notice.template.show')}
                            >
                              <Eye className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">{t('alert.notice.template.show')}</span>
                            </Button>
                          ) : (
                            <>
                              <Button
                                data-alert-notice-template-edit-detail="angular-detail-fetch"
                                data-alert-notice-template-edit-detail-owner="route-detail-fetch-contract"
                                className={coldIconButtonClass}
                                size="icon"
                                variant="default"
                                onClick={() => void handleEditTemplate(template)}
                                title={t('alert.notice.template.edit')}
                              >
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                                <span className="sr-only">{t('alert.notice.template.edit')}</span>
                              </Button>
                              <Button className={coldIconButtonClass} size="icon" variant="default" onClick={() => void handleDeleteTemplateById(template.id)} title={t('alert.notice.template.delete')}>
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                <span className="sr-only">{t('alert.notice.template.delete')}</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <NoticeTableEmptyRow t={t} colSpan={5} prefix="template" />
                  )}
                </tbody>
              </AlertSurfaceTable>
            </AlertSurfaceTableShell>
            {templateTotalElements > 0 ? (
              <NoticePagination
                t={t}
                pageIndex={normalizedTemplatePageIndex}
                pageSize={templatePageSize}
                totalElements={templateTotalElements}
                visibleCount={templateVisibleRows.length}
                testIdPrefix="notice-template"
                onPageIndexChange={setTemplatePageIndex}
                onPageSizeChange={nextPageSize => {
                  setTemplatePageSize(nextPageSize);
                  setTemplatePageIndex(0);
                }}
              />
            ) : null}
            {templateMessage ? <div className="px-3 py-2 text-sm text-emerald-300">{templateMessage}</div> : null}
            {!editingTemplate && templateError ? (
              <div role="alert" className="px-3 py-2 text-sm text-rose-300">{templateError}</div>
            ) : null}
          </div>
        );

        const receiverEditorDialog = (
          <OverlayDialog
            open={editingReceiver}
            title={receiverDraft.id ? t('alert.notice.receiver.edit') : t('alert.notice.receiver.new')}
            kicker={t('menu.alert.dispatch')}
            onClose={() => setEditingReceiver(false)}
            maxWidthClassName="max-w-4xl"
            footer={
              <div className="flex flex-wrap justify-end gap-2">
                <Button data-testid="notice-receiver-cancel" className={coldButtonClassName} size="sm" variant="default" onClick={() => setEditingReceiver(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  data-testid="notice-receiver-test"
                  data-alert-notice-receiver-test-loading={testingReceiver ? 'true' : 'false'}
                  data-alert-notice-receiver-test-validation="angular-backend-owned"
                  data-alert-notice-receiver-test-validation-owner="route-mutation-contract"
                  aria-busy={testingReceiver}
                  className={coldButtonClassName}
                  size="sm"
                  variant="default"
                  onClick={() => void handleTestSend()}
                  disabled={testingReceiver || savingReceiver}
                >
                  {t('alert.notice.send-test')}
                </Button>
                <Button data-testid="notice-receiver-save" className={coldPrimaryButtonClassName} size="sm" variant="default" onClick={() => void handleSaveReceiver()} disabled={savingReceiver}>
                  {savingReceiver ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            }
          >
            <div data-alert-notice-receiver-editor-dialog="hertzbeat-ui-modal-editor" className="space-y-3">
              <div
                data-alert-notice-save-feedback="angular-new-edit-notify"
                data-alert-notice-save-feedback-owner="route-action-feedback-contract"
                data-alert-notice-receiver-success-next="angular-policy-next"
                data-alert-notice-receiver-success-next-owner="route-action-feedback-contract"
                data-alert-notice-receiver-save-failure-close="angular-transport-error-close"
                data-alert-notice-receiver-save-failure-close-owner="route-action-feedback-contract"
                className="hidden"
                aria-hidden="true"
              />
              {editingReceiver && receiverError ? (
                <div
                  role="alert"
                  data-alert-notice-receiver-validation="hertzbeat-ui-validation-feedback"
                  data-alert-notice-receiver-save-failure={receiverErrorDetail ? 'angular-notify-title-detail' : undefined}
                  data-alert-notice-receiver-save-failure-owner={receiverErrorDetail ? 'route-action-feedback-contract' : undefined}
                  data-alert-notice-receiver-save-failure-title={receiverErrorDetail ? receiverError : undefined}
                  data-alert-notice-receiver-save-failure-detail={receiverErrorDetail ?? undefined}
                  className="rounded-[3px] border border-[#6f3141] bg-[#1b1014] px-3 py-2 text-[12px] font-semibold leading-5 text-[#ffb4c1]"
                >
                  <span>{receiverError}</span>
                  {receiverErrorDetail ? <span className="mt-1 block font-medium text-[#ffccd5]">{receiverErrorDetail}</span> : null}
                </div>
              ) : null}
              {editingReceiver && receiverMessage ? (
                <div
                  role="status"
                  data-alert-notice-receiver-test-feedback="hertzbeat-ui-test-feedback"
                  className="rounded-[3px] border border-[#24563d] bg-[#0d1a14] px-3 py-2 text-[12px] font-semibold leading-5 text-[#9be8bd]"
                >
                  {receiverMessage}
                </div>
              ) : null}
              {noticeEvidenceContext?.receiverTestPreview ? (
                <div
                  data-alert-notice-receiver-test-preview="signal-route"
                  data-alert-notice-receiver-test-preview-owner="signal-alert-handoff"
                  data-alert-notice-receiver-test-preview-signal={noticeEvidenceContext.signal}
                  data-alert-notice-receiver-test-preview-labels="provided-labels"
                  className="rounded-[3px] border border-[#26303d] bg-[#080a0e] px-3 py-2"
                >
                  <p className="text-[12px] font-semibold text-[#eef2f7]">{noticeEvidenceContext.receiverTestPreview.title}</p>
                  <p className="mt-1 text-[12px] leading-5 text-[#9099a7]">{noticeEvidenceContext.receiverTestPreview.copy}</p>
                  <code
                    data-alert-notice-receiver-test-preview-labels-text="signal-route"
                    className="mt-2 block whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-[#aab4c3]"
                  >
                    {noticeEvidenceContext.receiverTestPreview.labelsText}
                  </code>
                  <div
                    data-alert-notice-receiver-test-preview-payload="sample-alert"
                    data-alert-notice-receiver-test-preview-payload-owner="signal-alert-handoff"
                    className="mt-3 rounded-[3px] border border-[#202a36] bg-[#0c1016] p-2.5"
                  >
                    <p className="text-[11px] font-semibold uppercase text-[#8e99aa]">
                      {noticeEvidenceContext.receiverTestPreview.payloadTitle}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[#9099a7]">
                      {noticeEvidenceContext.receiverTestPreview.payloadCopy}
                    </p>
                    <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {noticeEvidenceContext.receiverTestPreview.payloadRows.map(row => (
                        <div
                          key={row.key}
                          data-alert-notice-receiver-test-preview-payload-row={row.key}
                          className="grid grid-cols-[92px_minmax(0,1fr)] gap-2 text-[11px] leading-5"
                        >
                          <dt className="font-semibold text-[#7f8999]">{row.label}</dt>
                          <dd className="min-w-0 truncate text-[#d6deea]" title={row.value}>{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p
                      data-alert-notice-receiver-test-preview-payload-message="sample-rendered"
                      className="mt-2 rounded-[3px] border border-[#26303d] bg-[#080a0e] px-2 py-1.5 text-[11px] leading-5 text-[#cbd5e1]"
                    >
                      {noticeEvidenceContext.receiverTestPreview.payloadMessage}
                    </p>
                  </div>
                </div>
              ) : null}
              <AlertNoticeReceiverFields
                t={t}
                draft={receiverDraft}
                productCopy={productCopy}
                onDraftChange={setReceiverDraft}
              />
            </div>
          </OverlayDialog>
        );

        const ruleEditorDialog = (
          <OverlayDialog
            open={editingRule}
            title={ruleDraft.id ? t('alert.notice.rule.edit') : t('alert.notice.rule.new')}
            kicker={t('menu.alert.dispatch')}
            onClose={() => setEditingRule(false)}
            maxWidthClassName="max-w-4xl"
            footer={
              <div className="flex flex-wrap justify-end gap-2">
                {noticeEvidenceContext?.returnHref ? (
                  <a
                    data-alert-notice-rule-editor-return="evidence-context"
                    href={noticeEvidenceContext.returnHref}
                    className="inline-flex h-8 items-center gap-1 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('alert.rule.evidence.return')}
                  </a>
                ) : null}
                <Button className={coldButtonClassName} size="sm" variant="default" onClick={() => setEditingRule(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  className={coldPrimaryButtonClassName}
                  size="sm"
                  variant="default"
                  data-alert-notice-rule-save-loading="angular-nz-ok-loading"
                  data-alert-notice-rule-save-loading-owner="route-modal-ok-contract"
                  data-alert-notice-rule-save-loading-state={savingRule ? 'true' : 'false'}
                  aria-busy={savingRule}
                  onClick={() => void handleSaveRule()}
                  disabled={savingRule}
                >
                  {savingRule ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            }
          >
            <div
              data-alert-notice-rule-editor-dialog="hertzbeat-ui-modal-editor"
              data-alert-notice-rule-display-names="angular-save-payload"
              data-alert-notice-rule-display-names-owner="route-payload-contract"
              data-alert-notice-rule-edit-display-names="angular-detail-options"
              data-alert-notice-rule-edit-display-names-owner="route-payload-contract"
              data-alert-notice-save-feedback="angular-new-edit-notify"
              data-alert-notice-save-feedback-owner="route-action-feedback-contract"
              className="space-y-3"
            >
              {editingRule && ruleError ? (
                <div
                  role="alert"
                  data-alert-notice-rule-validation="hertzbeat-ui-validation-feedback"
                  data-alert-notice-rule-save-failure={ruleErrorDetail ? 'angular-notify-title-detail' : undefined}
                  data-alert-notice-rule-save-failure-owner={ruleErrorDetail ? 'route-action-feedback-contract' : undefined}
                  data-alert-notice-rule-save-failure-title={ruleErrorDetail ? ruleError : undefined}
                  data-alert-notice-rule-save-failure-detail={ruleErrorDetail ?? undefined}
                  className="rounded-[3px] border border-[#6f3141] bg-[#1b1014] px-3 py-2 text-[12px] font-semibold leading-5 text-[#ffb4c1]"
                >
                  <span>{ruleError}</span>
                  {ruleErrorDetail ? <span className="mt-1 block font-medium text-[#ffccd5]">{ruleErrorDetail}</span> : null}
                </div>
              ) : null}
              <AlertNoticeRuleFields
                t={t}
                draft={ruleDraft}
                receiverIdsPlaceholder={productCopy.receiverIdsPlaceholder}
                templateIdPlaceholder={productCopy.templateIdPlaceholder}
                labelsPlaceholder={productCopy.labelsPlaceholder}
                daysPlaceholder={productCopy.daysPlaceholder}
                receiverOptions={receiverOptions}
                templateOptions={templateOptions}
                labelOptions={labelOptions}
                sourceLabelsText={noticeEvidenceContext?.labelsText}
                sourceSignal={noticeEvidenceContext?.signal}
                onDraftChange={setRuleDraft}
              />
            </div>
          </OverlayDialog>
        );

        const templateEditorDialog = (
          <OverlayDialog
            open={editingTemplate}
            title={templateReadOnly ? t('alert.notice.template.content') : templateDraft.id ? t('alert.notice.template.edit') : t('alert.notice.template.new')}
            kicker={t('menu.alert.dispatch')}
            onClose={() => {
              setEditingTemplate(false);
              setTemplateReadOnly(false);
            }}
            maxWidthClassName="max-w-4xl"
            footer={
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  className={coldButtonClassName}
                  size="sm"
                  variant="default"
                  data-alert-notice-template-viewer-return={templateReadOnly ? 'angular-cancel-return' : undefined}
                  data-alert-notice-template-viewer-return-owner={templateReadOnly ? 'route-modal-footer-contract' : undefined}
                  onClick={() => {
                    setEditingTemplate(false);
                    setTemplateReadOnly(false);
                  }}
                >
                  {templateReadOnly ? t('common.button.return') : t('common.cancel')}
                </Button>
                {!templateReadOnly ? (
                  <Button className={coldPrimaryButtonClassName} size="sm" variant="default" onClick={() => void handleSaveTemplate()} disabled={savingTemplate}>
                    {savingTemplate ? t('common.saving') : t('common.save')}
                  </Button>
                ) : null}
              </div>
            }
          >
            {templateReadOnly ? (
              <div
                data-alert-notice-template-viewer-dialog="hertzbeat-ui-modal-viewer"
                data-alert-notice-template-viewer-ok="none"
                data-alert-notice-template-viewer-ok-owner="route-modal-footer-contract"
                className="space-y-3"
              >
                <AlertNoticeTemplateFields t={t} draft={templateDraft} readOnly={templateReadOnly} onDraftChange={setTemplateDraft} />
              </div>
            ) : (
              <div
                data-alert-notice-template-editor-dialog="hertzbeat-ui-modal-editor"
                data-alert-notice-save-feedback="angular-new-edit-notify"
                data-alert-notice-save-feedback-owner="route-action-feedback-contract"
                className="space-y-3"
              >
                {editingTemplate && templateError ? (
                  <div
                  role="alert"
                  data-alert-notice-template-validation="hertzbeat-ui-validation-feedback"
                  data-alert-notice-template-save-failure={templateErrorDetail ? 'angular-notify-title-detail' : undefined}
                  data-alert-notice-template-save-failure-owner={templateErrorDetail ? 'route-action-feedback-contract' : undefined}
                  data-alert-notice-template-save-failure-title={templateErrorDetail ? templateError : undefined}
                  data-alert-notice-template-save-failure-detail={templateErrorDetail ?? undefined}
                  className="rounded-[3px] border border-[#6f3141] bg-[#1b1014] px-3 py-2 text-[12px] font-semibold leading-5 text-[#ffb4c1]"
                >
                  <span>{templateError}</span>
                  {templateErrorDetail ? <span className="mt-1 block font-medium text-[#ffccd5]">{templateErrorDetail}</span> : null}
                </div>
                ) : null}
                <AlertNoticeTemplateFields t={t} draft={templateDraft} readOnly={templateReadOnly} onDraftChange={setTemplateDraft} />
              </div>
            )}
          </OverlayDialog>
        );

        return (
          <>
            <div
              data-alert-notice-surface="otlp-hertzbeat-ui-notice-console"
              data-alert-notice-style-baseline={coldNoticeVisual.canvasName}
              data-alert-notice-edit-load-feedback="angular-edit-fail"
              data-alert-notice-edit-load-feedback-owner="route-action-feedback-contract"
              className={coldNoticeVisual.canvas.root}
              style={coldNoticeVisual.canvas.backgroundStyle}
            >
              <section className={coldNoticeVisual.layout.pageSection}>
                <div className="mx-auto max-w-[1480px]">
                  <div className="mb-5">
                    <section
                      data-alert-notice-header="hertzbeat-ui-compact-header"
                      data-alert-notice-admin-layout="full-width-admin-list"
                      className={coldNoticeVisual.panel.hero}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-5">
                        <div className="min-w-[260px] flex-1">
                          <h1 className="text-[30px] font-semibold leading-tight text-[#f5f7fb]">{t('menu.alert.dispatch')}</h1>
                          <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                            {t('alert.notice.copy')}
                          </p>
                          <div data-alert-notice-command-bar="standard-equal-buttons" className={coldNoticeVisual.button.row}>
                            <Button size="sm" className={coldCommandButtonClass} variant="default" onClick={() => setRefreshTick(value => value + 1)}>
                              {t('common.refresh')}
                            </Button>
                            <Button size="sm" className={coldCommandButtonClass} variant="default" onClick={() => void handleNewReceiver()}>
                              {t('alert.notice.receiver.new')}
                            </Button>
                            <Button size="sm" className={coldPrimaryCommandButtonClass} variant="default" onClick={() => void handleNewRule()}>
                              {t('alert.notice.rule.new')}
                            </Button>
                          </div>
                        </div>
                        <div
                          data-alert-notice-inline-metrics="hertzbeat-ui-inline-counts"
                          className="flex min-w-[280px] flex-wrap justify-end gap-2"
                        >
                          {[
                            { label: t('alert.notice.receiver'), value: receiverTotal },
                            { label: t('alert.notice.rule'), value: ruleTotal },
                            { label: t('alert.notice.template'), value: templateTotal }
                          ].map(item => (
                            <div
                              key={item.label}
                              className="grid h-8 min-w-[112px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[3px] border border-[#2b3039] bg-[#101217] px-2.5"
                            >
                              <span className="truncate text-[12px] font-semibold text-[#8f99ab]">{item.label}</span>
                              <span className="text-[13px] font-semibold text-[#f2f5f8]">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  </div>
                  <AlertNoticeConsoleShell
                    t={t}
                    selectedTab={selectedTab}
                    onSelectTab={setSelectedTab}
                    receiverContent={receiverPanel}
                    ruleContent={rulePanel}
                    templateContent={templatePanel}
                  />
                  {noticeEvidenceContext ? (
                    <section
                      data-alert-notice-evidence-context="signal-route"
                      data-alert-notice-evidence-signal={noticeEvidenceContext.signal}
                      data-alert-notice-prefill-labels={noticeEvidenceContext.labelsText}
                      className="mt-5 rounded-[4px] border border-[#27303c] bg-[#0b0f15] px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.24)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-[#eef2f7]">{noticeEvidenceContext.title}</p>
                          <p className="mt-1 max-w-[820px] text-[12px] leading-5 text-[#9099a7]">{noticeEvidenceContext.copy}</p>
                        </div>
                        {noticeEvidenceContext.returnHref ? (
                          <a
                            data-alert-notice-evidence-return="true"
                            href={noticeEvidenceContext.returnHref}
                            className="inline-flex h-8 items-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white"
                          >
                            {t('alert.rule.evidence.return')}
                          </a>
                        ) : null}
                      </div>
                      <div
                        data-alert-notice-evidence-labels="generated-labels"
                        className="mt-3 rounded-[3px] border border-[#222a34] bg-[#080a0e] px-3 py-2 font-mono text-[11px] leading-5 text-[#9aa5b5]"
                      >
                        {noticeEvidenceContext.labelsText || emptyValue}
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-5">
                        {noticeEvidenceContext.rows.map(row => (
                          <div key={`${row.label}-${row.value}`} className="min-w-0 rounded-[3px] border border-[#222a34] bg-[#101217] px-3 py-2">
                            <p className="text-[11px] font-semibold text-[#788292]">{row.label}</p>
                            <p className="mt-1 truncate text-[13px] font-semibold text-[#eef2f7]" title={row.value}>{row.value}</p>
                            <p className="mt-1 truncate text-[11px] text-[#778091]" title={row.meta}>{row.meta}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              </section>
            </div>
            {receiverEditorDialog}
            {ruleEditorDialog}
            {templateEditorDialog}
            <div
              data-alert-delete-confirm={deleteRequest ? 'open' : 'closed'}
              data-alert-notice-delete-confirm="angular-modal-confirm"
              data-alert-notice-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
              data-alert-notice-delete-page-clamp="angular-update-page-index"
              data-alert-notice-delete-page-clamp-owner="route-state-contract"
              data-alert-notice-delete-feedback="angular-delete-notify"
              data-alert-notice-delete-feedback-owner="route-action-feedback-contract"
            >
              <HzConfirmDialog
                open={Boolean(deleteRequest)}
                tone="critical"
                kicker={t('common.confirm.operation')}
                title={t('common.confirm.delete')}
                confirmLabel={t('common.button.ok')}
                cancelLabel={t('common.button.cancel')}
                confirmDisabled={deletePending}
                onClose={deletePending ? undefined : () => setDeleteRequest(null)}
                onConfirm={() => void handleConfirmedDelete()}
                data-alert-notice-delete-confirm-dialog="angular-modal-confirm"
                confirmButtonProps={
                  {
                    'data-alert-notice-delete-confirm-ok': 'angular-modal-confirm'
                  } as React.ComponentProps<typeof HzConfirmDialog>['confirmButtonProps']
                }
                cancelButtonProps={
                  {
                    disabled: deletePending,
                    'data-alert-notice-delete-confirm-cancel': 'angular-modal-confirm'
                  } as React.ComponentProps<typeof HzConfirmDialog>['cancelButtonProps']
                }
              >
                <p data-alert-notice-delete-confirm-copy="angular-modal-confirm">
                  {deleteRequest?.kind === 'receiver'
                    ? t('alert.notice.delete.confirm.receiver')
                    : deleteRequest?.kind === 'template'
                      ? t('alert.notice.delete.confirm.template')
                      : t('alert.notice.delete.confirm.rule')}
                </p>
              </HzConfirmDialog>
            </div>
          </>
        )
      }}
    </ClientWorkbench>
  );
}
