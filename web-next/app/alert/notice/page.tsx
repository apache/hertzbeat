'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Inbox, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { AlertNoticeConsoleShell, type AlertNoticeConsoleTabKey } from '../../../components/pages/alert-notice-console-shell';
import { ClientWorkbench } from '../../../components/workbench/client-workbench';
import { useI18n } from '../../../components/providers/i18n-provider';
import { AlertNoticeReceiverFields } from '../../../components/pages/alert-notice-receiver-fields';
import { AlertNoticeRuleFields } from '../../../components/pages/alert-notice-rule-fields';
import { AlertNoticeTemplateFields } from '../../../components/pages/alert-notice-template-fields';
import { Button } from '../../../components/ui/button';
import { ColdConfirmDialog } from '../../../components/ui/cold-confirm-dialog';
import { SearchRow } from '../../../components/ui/search-row';
import { Select } from '../../../components/ui/select';
import { OverlayDialog } from '../../../components/workbench/overlay-dialog';
import {
  AlertSurfaceTable,
  AlertSurfaceTableHead,
  AlertSurfaceTableShell,
  AlertSurfaceValuePill
} from '../../../components/pages/alert-surface-primitives';
import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '../../../lib/api-client';
import { buildNoticeRuleDraft, createNoticeReceiver, createNoticeRule, createNoticeTemplate, deleteNoticeReceiver, deleteNoticeRule, deleteNoticeTemplate, loadAlertNoticeData, loadNoticeReceiverDetail, loadNoticeRuleDetail, loadNoticeTemplateDetail, sendNoticeReceiverTest, updateNoticeReceiver, updateNoticeRule, updateNoticeTemplate, type NoticeReceiverDraft, type NoticeRuleDraft, type NoticeTemplateDraft } from '../../../lib/alert-notice/controller';
import { buildAlertNoticeEvidenceContext, buildNoticeReceiverDraft, buildNoticeTemplateDraft, getAlertNoticeProductCopy, validateNoticeReceiverDraft, validateNoticeRuleDraft, validateNoticeTemplateDraft } from '../../../lib/alert-notice/view-model';
import { DEFAULT_ALERT_LABEL_OPTIONS, loadAlertLabelOptions, type AlertLabelOptions } from '../../../lib/alert-label-options';
import { coldOpsCatalogVisual } from '../../../lib/cold-ops-visual';
import { formatTime } from '../../../lib/format';
import { readSignalRouteContext } from '../../../lib/signal-route-context';
import type { NoticeReceiver, NoticeRule, NoticeTemplate, PageResult } from '../../../lib/types';

type NoticePageData = {
  receivers: PageResult<NoticeReceiver>;
  receiverOptions: PageResult<NoticeReceiver>;
  rules: PageResult<NoticeRule>;
  templates: PageResult<NoticeTemplate>;
  labelOptions: AlertLabelOptions;
};

type NoticeDeleteRequest = {
  kind: 'receiver' | 'rule' | 'template';
  id: number;
};

const NOTICE_PAGE_SIZE_OPTIONS = [8, 15, 25];
type Translator = ReturnType<typeof useI18n>['t'];
const coldNoticeVisual = coldOpsCatalogVisual;
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

function getNoticeTypeLabel(type: number | string | null | undefined, t: Translator) {
  if (type == null) return '-';
  const normalized = String(type).trim();
  const key = NOTICE_TYPE_LABEL_KEYS[normalized];
  return key ? t(key) : normalized;
}

function getReceiverSetting(receiver: NoticeReceiver) {
  const type = String(receiver.type ?? '');
  switch (type) {
    case '0':
      return receiver.phone?.trim() || '-';
    case '1':
      return receiver.email?.trim() || '-';
    case '2':
      return receiver.hookUrl?.trim() || '-';
    case '3':
    case '4':
      return receiver.wechatId?.trim() || '-';
    case '5':
      return receiver.accessToken?.trim() || '-';
    case '6':
      return receiver.wechatId?.trim() || receiver.accessToken?.trim() || '-';
    case '7':
      return [receiver.tgBotToken?.trim(), receiver.tgUserId?.trim()].filter(Boolean).join(' / ') || '-';
    case '8':
      return receiver.slackWebHookUrl?.trim() || '-';
    case '9':
      return [receiver.discordChannelId?.trim(), receiver.discordBotToken?.trim()].filter(Boolean).join(' / ') || '-';
    case '10':
      return [receiver.corpId?.trim(), receiver.agentId != null ? String(receiver.agentId).trim() : '', receiver.appSecret?.trim()]
        .filter(Boolean)
        .join(' / ') || '-';
    case '11':
      return receiver.smnAk?.trim() || '-';
    case '12':
      return receiver.serverChanToken?.trim() || '-';
    case '13':
      return receiver.gotifyToken?.trim() || '-';
    case '14':
      return receiver.appId?.trim() || '-';
    default:
      return receiver.email?.trim() || receiver.phone?.trim() || receiver.hookUrl?.trim() || '-';
  }
}

function NoticePagination({
  t,
  pageIndex,
  pageSize,
  totalElements,
  testIdPrefix,
  onPageIndexChange,
  onPageSizeChange
}: {
  t: Translator;
  pageIndex: number;
  pageSize: number;
  totalElements: number;
  testIdPrefix: string;
  onPageIndexChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalElements / Math.max(1, pageSize)));
  const pageNumbers = Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index);

  return (
    <div
      data-alert-notice-pagination="cold-dense-pagination"
      className="flex flex-wrap items-center justify-end gap-2 border-t border-[#252b34] bg-[#0b0c0e] px-3 py-2 text-xs text-[#8f99ab]"
    >
      <span>{`${t('common.total')} ${totalElements}`}</span>
      <Button
        data-testid={`${testIdPrefix}-previous`}
        size="icon"
        variant="subtle"
        disabled={pageIndex <= 0}
        onClick={() => onPageIndexChange(Math.max(0, pageIndex - 1))}
        title={t('common.previous')}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{t('common.previous')}</span>
      </Button>
      {pageNumbers.map(pageNumber => (
        <Button
          key={pageNumber}
          data-testid={`${testIdPrefix}-page-${pageNumber + 1}`}
          size="icon"
          variant={pageNumber === pageIndex ? 'primary' : 'subtle'}
          onClick={() => onPageIndexChange(pageNumber)}
          aria-current={pageNumber === pageIndex ? 'page' : undefined}
        >
          {pageNumber + 1}
        </Button>
      ))}
      <Button
        data-testid={`${testIdPrefix}-next`}
        size="icon"
        variant="subtle"
        disabled={pageIndex >= totalPages - 1}
        onClick={() => onPageIndexChange(Math.min(totalPages - 1, pageIndex + 1))}
        title={t('common.next')}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{t('common.next')}</span>
      </Button>
      <Select
        data-testid={`${testIdPrefix}-page-size`}
        value={String(pageSize)}
        onChange={event => onPageSizeChange(Math.max(1, Number.parseInt(event.target.value, 10) || pageSize))}
        containerClassName="w-[96px]"
        className="h-8 min-w-0 text-[#eef2f7]"
      >
        {NOTICE_PAGE_SIZE_OPTIONS.map(option => (
          <option key={option} value={option}>
            {t('alert.notice.page-size', { count: option })}
          </option>
        ))}
      </Select>
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
    <tr data-alert-notice-empty-row="true" data-alert-notice-receiver-empty-state={prefix === 'receiver' ? 'cold-empty-state' : undefined} className="bg-[#0b0c0e]">
      <td
        colSpan={colSpan}
        className="h-[360px] px-3 pt-[54px] text-center align-top text-[#8f99ab]"
      >
        <div className="inline-flex flex-col items-center gap-2.5">
          <span
            data-alert-notice-receiver-empty-icon={prefix === 'receiver' ? 'cold-empty-icon' : undefined}
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

export default function AlertNoticePage() {
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const signal = searchParams.get('signal');
  const signalContext = useMemo(() => readSignalRouteContext(searchParams), [searchParams]);
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
  const [receiverMessage, setReceiverMessage] = useState<string | null>(null);
  const [receiverError, setReceiverError] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [templateDraft, setTemplateDraft] = useState<NoticeTemplateDraft>(() => buildNoticeTemplateDraft(null));
  const [templateReadOnly, setTemplateReadOnly] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
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
  const [ruleSwitchPending, setRuleSwitchPending] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [deleteRequest, setDeleteRequest] = useState<NoticeDeleteRequest | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const load = useCallback(async (): Promise<NoticePageData> => {
    const [noticeData, labelOptions] = await Promise.all([
      loadAlertNoticeData(apiMessageGet, {
        receivers: {
          search: receiverSearch,
          pageIndex: receiverPageIndex,
          pageSize: receiverPageSize
        },
        rules: {
          search: ruleSearch,
          pageIndex: rulePageIndex,
          pageSize: rulePageSize
        }
      }),
      loadAlertLabelOptions(apiMessageGet).catch(() => DEFAULT_ALERT_LABEL_OPTIONS)
    ]);
    return { ...noticeData, labelOptions };
  }, [receiverPageIndex, receiverPageSize, receiverSearch, rulePageIndex, rulePageSize, ruleSearch]);

  const productCopy = getAlertNoticeProductCopy(locale);

  return (
    <ClientWorkbench key={refreshTick} load={load} loadingCopy={t('alert.notice.loading')}>
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
        const templateSearchNeedle = templateSearch.trim().toLowerCase();
        const filteredTemplates = data.templates.content.filter(template => {
          if (Boolean(template.preset) !== templatePresetFilter) {
            return false;
          }
          if (!templateSearchNeedle) {
            return true;
          }
          return (template.name || '').toLowerCase().includes(templateSearchNeedle);
        });
        const templateTotalElements = filteredTemplates.length;
        const templateMaxPageIndex = Math.max(0, Math.ceil(templateTotalElements / Math.max(1, templatePageSize)) - 1);
        const normalizedTemplatePageIndex = Math.min(templatePageIndex, templateMaxPageIndex);
        const templateVisibleRows = filteredTemplates.slice(
          normalizedTemplatePageIndex * templatePageSize,
          normalizedTemplatePageIndex * templatePageSize + templatePageSize
        );
        const receiverOptionRows = data.receiverOptions?.content?.length ? data.receiverOptions.content : data.receivers.content;
        const receiverOptions = receiverOptionRows.map(receiver => ({
          value: String(receiver.id),
          label: `${receiver.name || productCopy.receiverFallback}-${getNoticeTypeLabel(receiver.type, t)}`,
          type: receiver.type
        }));
        const templateOptions = [
          { value: '-1', label: t('alert.notice.template.preset.true') },
          ...data.templates.content
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
          setEditingReceiver(true);
        }

        async function handleEditReceiver() {
          if (!selectedReceiver?.id) return;
          try {
            setSelectedTab('receiver');
            const detail = await loadNoticeReceiverDetail(apiMessageGet, selectedReceiver.id);
            setReceiverDraft(buildNoticeReceiverDraft(detail));
            setReceiverMessage(null);
            setReceiverError(null);
            setEditingReceiver(true);
          } catch (error) {
            setReceiverError(error instanceof Error ? error.message : t('common.load-failed'));
          }
        }

        async function handleSaveReceiver() {
          const validationError = validateNoticeReceiverDraft(receiverDraft, t);
          if (validationError) {
            setReceiverMessage(null);
            setReceiverError(validationError);
            return;
          }
          setSavingReceiver(true);
          setReceiverMessage(null);
          setReceiverError(null);
          try {
            if (receiverDraft.id) {
              await updateNoticeReceiver(apiMessagePut as any, receiverDraft);
            } else {
              await createNoticeReceiver(apiMessagePost as any, receiverDraft);
            }
            setReceiverMessage(t('common.save-success'));
            setEditingReceiver(false);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setReceiverError(error instanceof Error ? error.message : t('common.save-failed'));
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
              await deleteNoticeReceiver(apiMessageDelete as any, request.id);
              setSelectedReceiverId(null);
              setReceiverMessage(t('common.delete-success'));
              setReceiverError(null);
              setEditingReceiver(false);
            } else if (request.kind === 'template') {
              await deleteNoticeTemplate(apiMessageDelete as any, request.id);
              setSelectedTemplateId(null);
              setTemplateMessage(t('common.delete-success'));
              setTemplateError(null);
              setTemplateReadOnly(false);
              setEditingTemplate(false);
            } else {
              await deleteNoticeRule(apiMessageDelete as any, request.id);
              setSelectedRuleId(null);
              setRuleMessage(t('common.delete-success'));
              setRuleError(null);
              setEditingRule(false);
            }
            setDeleteRequest(null);
            setRefreshTick(value => value + 1);
          } catch (error) {
            const fallback = error instanceof Error ? error.message : t('common.delete-failed');
            if (request.kind === 'receiver') {
              setReceiverError(fallback);
            } else if (request.kind === 'template') {
              setTemplateError(fallback);
            } else {
              setRuleError(fallback);
            }
          } finally {
            setDeletePending(false);
          }
        }

        async function handleTestSend() {
          const validationError = validateNoticeReceiverDraft(receiverDraft, t);
          if (validationError) {
            setReceiverMessage(null);
            setReceiverError(validationError);
            return;
          }
          try {
            await sendNoticeReceiverTest(apiMessagePost as any, receiverDraft);
            setReceiverMessage(t('alert.notice.send-test.notify.success'));
            setReceiverError(null);
          } catch (error) {
            setReceiverError(error instanceof Error ? error.message : t('alert.notice.send-test.notify.failed'));
          }
        }

        async function handleNewTemplate() {
          setSelectedTab('template');
          setTemplateDraft(buildNoticeTemplateDraft(null));
          setTemplateReadOnly(false);
          setTemplateMessage(null);
          setTemplateError(null);
          setEditingTemplate(true);
        }

        async function handleEditTemplate(template = selectedTemplate) {
          if (!template?.id || template.preset) return;
          try {
            setSelectedTab('template');
            setSelectedTemplateId(template.id);
            setTemplateReadOnly(false);
            const detail = await loadNoticeTemplateDetail(apiMessageGet, template.id);
            setTemplateDraft(buildNoticeTemplateDraft(detail));
            setTemplateMessage(null);
            setTemplateError(null);
            setEditingTemplate(true);
          } catch (error) {
            setTemplateError(error instanceof Error ? error.message : t('common.load-failed'));
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
          setEditingTemplate(true);

          if (templateId == null) return;

          try {
            const detail = await loadNoticeTemplateDetail(apiMessageGet, templateId);
            setTemplateDraft(buildNoticeTemplateDraft(detail));
          } catch (error) {
            setTemplateError(null);
          }
        }

        async function handleSaveTemplate() {
          const validationError = validateNoticeTemplateDraft(templateDraft, t);
          if (validationError) {
            setTemplateMessage(null);
            setTemplateError(validationError);
            return;
          }
          setSavingTemplate(true);
          setTemplateMessage(null);
          setTemplateError(null);
          try {
            if (templateDraft.id) {
              await updateNoticeTemplate(apiMessagePut as any, templateDraft);
            } else {
              await createNoticeTemplate(apiMessagePost as any, templateDraft);
            }
            setTemplateMessage(t('common.save-success'));
            setEditingTemplate(false);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setTemplateError(error instanceof Error ? error.message : t('common.save-failed'));
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
          setEditingRule(true);
        }

        async function handleEditRule(rule = selectedRule) {
          const ruleId = rule?.id;
          if (!ruleId) return;
          try {
            setSelectedTab('rule');
            setSelectedRuleId(ruleId);
            const detail = await loadNoticeRuleDetail(apiMessageGet, ruleId);
            setRuleDraft(buildNoticeRuleDraft(detail));
            setRuleMessage(null);
            setRuleError(null);
            setEditingRule(true);
          } catch (error) {
            setRuleError(error instanceof Error ? error.message : t('common.load-failed'));
          }
        }

        async function handleSaveRule() {
          const validationError = validateNoticeRuleDraft(ruleDraft, t);
          if (validationError) {
            setRuleMessage(null);
            setRuleError(validationError);
            return;
          }
          setSavingRule(true);
          setRuleMessage(null);
          setRuleError(null);
          try {
            if (ruleDraft.id) {
              await updateNoticeRule(apiMessagePut as any, ruleDraft);
            } else {
              await createNoticeRule(apiMessagePost as any, ruleDraft);
            }
            setRuleMessage(t('common.save-success'));
            setEditingRule(false);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setRuleError(error instanceof Error ? error.message : t('common.save-failed'));
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
          setRuleError(null);
          try {
            await updateNoticeRule(apiMessagePut as any, buildNoticeRuleDraft({ ...rule, [field]: checked }));
            setRefreshTick(value => value + 1);
          } catch (error) {
            setRuleError(error instanceof Error ? error.message : t('common.save-failed'));
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
              data-alert-notice-receiver-toolbar="cold-query-toolbar"
              data-alert-notice-receiver-toolbar-layout="compact-inline-actions-query"
              className={coldToolbarClass}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Button className={coldIconButtonClass} size="icon" variant="default" onClick={() => setRefreshTick(value => value + 1)} title={t('common.refresh')}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{t('common.refresh')}</span>
                </Button>
                <Button data-testid="notice-receiver-new" className={coldPrimaryCommandButtonClass} size="sm" variant="default" onClick={() => void handleNewReceiver()}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t('alert.notice.receiver.new')}
                </Button>
                <Button
                  data-alert-notice-receiver-bulk-menu="cold-more"
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
            <AlertSurfaceTableShell data-alert-notice-receiver-table-shell="cold-dense-table" className={coldTableShellClass}>
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
                          <AlertSurfaceValuePill>{getNoticeTypeLabel(receiver.type, t)}</AlertSurfaceValuePill>
                        </div>
                      </td>
                      <td className="max-w-[340px] truncate px-3 py-3 text-center" title={getReceiverSetting(receiver)}>{getReceiverSetting(receiver)}</td>
                      <td className="px-3 py-3 text-center">{formatTime(receiver.gmtUpdate || receiver.gmtCreate || null)}</td>
                      <td className="px-3 py-3 text-center" onClick={event => event.stopPropagation()}>
                        <div className="flex justify-center gap-2">
                          <Button
                            className={coldIconButtonClass}
                            size="icon"
                            variant="default"
                            onClick={() => {
                              setSelectedReceiverId(receiver.id);
                              setReceiverDraft(buildNoticeReceiverDraft(receiver));
                              setReceiverMessage(null);
                              setReceiverError(null);
                              setEditingReceiver(true);
                            }}
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
                testIdPrefix="notice-receiver"
                onPageIndexChange={setReceiverPageIndex}
                onPageSizeChange={nextPageSize => {
                  setReceiverPageSize(nextPageSize);
                  setReceiverPageIndex(0);
                }}
              />
            ) : null}
            {receiverMessage ? <div className="px-3 py-2 text-sm text-emerald-300">{receiverMessage}</div> : null}
            {!editingReceiver && receiverError ? (
              <div role="alert" className="px-3 py-2 text-sm text-rose-300">{receiverError}</div>
            ) : null}
          </div>
        );

        const rulePanel = (
          <div data-alert-notice-rule-panel="true">
            <div
              data-alert-notice-rule-toolbar="cold-query-toolbar"
              data-alert-notice-rule-toolbar-layout="compact-inline-actions-query"
              className={coldToolbarClass}
            >
              <div className="flex flex-wrap items-center gap-2">
                  <Button className={coldIconButtonClass} size="icon" variant="default" onClick={() => setRefreshTick(value => value + 1)} title={t('common.refresh')}>
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
            <AlertSurfaceTableShell data-alert-notice-rule-table-shell="cold-dense-table" className={coldTableShellClass}>
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
                      <td className="px-3 py-3 text-center">{rule.receiverName?.join(', ') || '-'}</td>
                      <td className="px-3 py-3 text-center">{rule.templateName || t('alert.notice.template.preset.true')}</td>
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
          <div data-alert-notice-template-panel="true">
            <div
              data-alert-notice-template-toolbar="cold-query-toolbar"
              data-alert-notice-template-toolbar-layout="compact-inline-actions-query"
              className={coldToolbarClass}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Button className={coldIconButtonClass} size="icon" variant="default" onClick={() => setRefreshTick(value => value + 1)} title={t('common.refresh')}>
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
                  data-alert-notice-template-preset-filter="cold-select"
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
            <AlertSurfaceTableShell data-alert-notice-template-table-shell="cold-dense-table" className={coldTableShellClass}>
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
                          <AlertSurfaceValuePill>{getNoticeTypeLabel(template.type, t)}</AlertSurfaceValuePill>
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
                              data-alert-notice-template-view-trigger="cold-modal-viewer-trigger"
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
                <Button data-testid="notice-receiver-test" className={coldButtonClassName} size="sm" variant="default" onClick={() => void handleTestSend()}>
                  {t('alert.notice.send-test')}
                </Button>
                <Button data-testid="notice-receiver-save" className={coldPrimaryButtonClassName} size="sm" variant="default" onClick={() => void handleSaveReceiver()} disabled={savingReceiver}>
                  {savingReceiver ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            }
          >
            <div data-alert-notice-receiver-editor-dialog="cold-modal-editor" className="space-y-3">
              {editingReceiver && receiverError ? (
                <div
                  role="alert"
                  data-alert-notice-receiver-validation="cold-validation-feedback"
                  className="rounded-[3px] border border-[#6f3141] bg-[#1b1014] px-3 py-2 text-[12px] font-semibold leading-5 text-[#ffb4c1]"
                >
                  {receiverError}
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
                <Button className={coldPrimaryButtonClassName} size="sm" variant="default" onClick={() => void handleSaveRule()} disabled={savingRule}>
                  {savingRule ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            }
          >
            <div data-alert-notice-rule-editor-dialog="cold-modal-editor" className="space-y-3">
              {editingRule && ruleError ? (
                <div
                  role="alert"
                  data-alert-notice-rule-validation="cold-validation-feedback"
                  className="rounded-[3px] border border-[#6f3141] bg-[#1b1014] px-3 py-2 text-[12px] font-semibold leading-5 text-[#ffb4c1]"
                >
                  {ruleError}
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
                  onClick={() => {
                    setEditingTemplate(false);
                    setTemplateReadOnly(false);
                  }}
                >
                  {t('common.cancel')}
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
              <div data-alert-notice-template-viewer-dialog="cold-modal-viewer" className="space-y-3">
                <AlertNoticeTemplateFields t={t} draft={templateDraft} readOnly={templateReadOnly} onDraftChange={setTemplateDraft} />
              </div>
            ) : (
              <div data-alert-notice-template-editor-dialog="cold-modal-editor" className="space-y-3">
                {editingTemplate && templateError ? (
                  <div
                    role="alert"
                    data-alert-notice-template-validation="cold-validation-feedback"
                    className="rounded-[3px] border border-[#6f3141] bg-[#1b1014] px-3 py-2 text-[12px] font-semibold leading-5 text-[#ffb4c1]"
                  >
                    {templateError}
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
              data-alert-notice-surface="otlp-cold-notice-console"
              data-alert-notice-style-baseline={coldNoticeVisual.canvasName}
              className={coldNoticeVisual.canvas.root}
              style={coldNoticeVisual.canvas.backgroundStyle}
            >
              <section className={coldNoticeVisual.layout.pageSection}>
                <div className="mx-auto max-w-[1480px]">
                  <div className="mb-5">
                    <section
                      data-alert-notice-header="cold-compact-header"
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
                          data-alert-notice-inline-metrics="cold-inline-counts"
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
                      <div className="mt-3 rounded-[3px] border border-[#222a34] bg-[#080a0e] px-3 py-2 font-mono text-[11px] leading-5 text-[#9aa5b5]">
                        {noticeEvidenceContext.labelsText || '-'}
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
            <div data-alert-delete-confirm={deleteRequest ? 'open' : 'closed'}>
              <ColdConfirmDialog
                open={Boolean(deleteRequest)}
                title={t('common.confirm.delete')}
                copy={
                  deleteRequest?.kind === 'receiver'
                    ? t('alert.notice.delete.confirm.receiver')
                    : deleteRequest?.kind === 'template'
                      ? t('alert.notice.delete.confirm.template')
                      : t('alert.notice.delete.confirm.rule')
                }
                confirmLabel={t('common.button.ok')}
                cancelLabel={t('common.button.cancel')}
                pending={deletePending}
                onCancel={() => setDeleteRequest(null)}
                onConfirm={() => void handleConfirmedDelete()}
              />
            </div>
          </>
        )
      }}
    </ClientWorkbench>
  );
}
