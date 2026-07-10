'use client';

import * as React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { LineChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { EditorState, type Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { clsx, type ClassValue } from 'clsx';
import { basicSetup } from 'codemirror';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  ExternalLink,
  LockKeyhole,
  Minus,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  Star,
  Trash2,
  UserRound,
  X
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

echarts.use([
  LineChart,
  CanvasRenderer,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent
]);

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { HzSourceDocShell } from './source-doc-shell';
export type { HzSourceDocShellProps, HzSourceDocShellSource } from './source-doc-shell';

export const hertzBeatUiContract = {
  packageName: '@hertzbeat/ui',
  visualOwner: 'hertzbeat-native-operator-ui',
  radius: {
    panel: '4px',
    control: '3px'
  },
  density: 'operator-compact',
  antiPattern: 'marketing-card-grid'
} as const;

export const hertzBeatUiControlBaseline = {
  heightPx: 32,
  heightClassName: 'h-8',
  buttonHeightPx: 28,
  buttonHeightClassName: 'h-7',
  buttonHeightsPx: { xs: 24, sm: 28, md: 32, lg: 40, icon: 28 },
  defaultButtonSize: 'sm',
  fieldEdge: 'lined',
  fieldEdgeClassName: 'border',
  fieldEdgeToken: '--hz-ui-line-soft',
  buttonTiers: ['flat-neutral', 'solid-primary', 'solid-danger'],
  componentScope: ['HzAiChatModalSurface', 'HzAboutModalSurface', 'HzPassportLoginActionFrame', 'HzPassportLoginNotice', 'HzPassportLoginValidationNotice', 'HzPassportSessionClearFrame', 'HzPassportLockSurface', 'HzSourceDocShell', 'HzButton', 'HzButtonIcon', 'HzButtonLink', 'HzHeaderIconButton', 'HzHeaderMenuAction', 'HzHeaderRealtimeNotice', 'HzLocaleMenuOption', 'HzUserMenuAction', 'HzActionGroup', 'HzAssistiveMarker', 'HzChipGroup', 'HzCollapsibleSection', 'HzControlStack', 'HzDataCellStack', 'HzDetailAside', 'HzDetailBodyStack', 'HzDialogBodyLayout', 'HzDialogEventNotice', 'HzDialogEventText', 'HzDialogMetaItem', 'HzDisabledActionShell', 'HzFileInput', 'HzIconLink', 'HzInput', 'HzQueryActionGroup', 'HzQueryStatusSelect', 'HzQueryTokenField', 'HzSearchFieldFrame', 'HzSearchFieldIcon', 'HzSelect', 'HzNumberStepper', 'HzCheckbox', 'HzSwitch', 'HzUnderlineToggle', 'HzInlineContextMark', 'HzMonitorBreadcrumb', 'HzMonitorIncrementalLoadFooter', 'HzPanelSection', 'HzPanelSurface', 'HzPanelTitleLabel', 'HzScrollViewport', 'HzLogStreamLiveRow', 'HzSignalSummaryItem', 'HzSignalSummaryStrip', 'HzSignalWorkbenchShell', 'HzStateNotice', 'HzStatusBadge', 'HzTableRowActionButton', 'HzTrendBar', 'HzTrendFrame', 'HzWorkbenchHeaderCopy', 'HzWorkbenchLayout'],
  exemptPatterns: ['tab-switches', 'menu-options', 'chart-hotspots', 'inline-remove-icons']
} as const;

export type HzAiChatPreviewMessage = {
  role: 'user' | 'assistant' | 'system';
  label: React.ReactNode;
  content: React.ReactNode;
};

export type HzAiChatConversationStatus = 'loading' | 'ready' | 'empty' | 'error';
export type HzAiChatMessageStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';
export type HzAiChatNewConversationStatus = 'idle' | 'creating' | 'error';
export type HzAiChatDeleteConversationStatus = 'idle' | 'confirming' | 'deleting' | 'error';
export type HzAiChatSendStatus = 'idle' | 'sending' | 'error';
export type HzAiChatConfigStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'saved' | 'error';
export type HzAiChatScheduleStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'saving' | 'error';
export type HzAiChatScheduleDeleteStatus = 'idle' | 'confirming' | 'deleting' | 'error';

export type HzAiChatProviderOption = {
  value: string;
  label: React.ReactNode;
  defaultBaseUrl?: string;
  defaultModel?: string;
};

export type HzAiChatProviderConfigValue = {
  code: string;
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type HzAiChatScheduleRow = {
  id: string | number;
  sopName: React.ReactNode;
  cronExpression: string;
  enabled: boolean;
};

export type HzAiChatScheduleSkillOption = {
  value: string;
  label: React.ReactNode;
};

export type HzAiChatScheduleDraft = {
  sopName: string;
  cronExpression: string;
  enabled?: boolean;
};

export type HzAiChatConversationPreview = {
  id: string | number;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  active?: boolean;
};

export type HzAiChatModalSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  conversationsTitle: React.ReactNode;
  newChatLabel: React.ReactNode;
  newChatStatus?: HzAiChatNewConversationStatus;
  deleteLabel?: string;
  deleteConfirmLabel?: React.ReactNode;
  deleteCancelLabel?: React.ReactNode;
  deleteStatus?: HzAiChatDeleteConversationStatus;
  deleteConversationId?: HzAiChatConversationPreview['id'] | null;
  welcomeTitle: React.ReactNode;
  welcomeDescription: React.ReactNode;
  inputPlaceholder: string;
  inputReadOnly?: boolean;
  inputValue?: string;
  inputHint?: React.ReactNode;
  closeLabel: string;
  sendLabel?: string;
  sendStatus?: HzAiChatSendStatus;
  streamingLabel?: React.ReactNode;
  configOpen?: boolean;
  configTitle?: React.ReactNode;
  configDescription?: React.ReactNode;
  configStatus?: HzAiChatConfigStatus;
  configStatusLabel?: React.ReactNode;
  configTriggerLabel?: React.ReactNode;
  configProviderLabel?: React.ReactNode;
  configProviderHelp?: React.ReactNode;
  configApiKeyLabel?: React.ReactNode;
  configApiKeyHelp?: React.ReactNode;
  configBaseUrlLabel?: React.ReactNode;
  configBaseUrlHelp?: React.ReactNode;
  configModelLabel?: React.ReactNode;
  configModelHelp?: React.ReactNode;
  configResetLabel?: React.ReactNode;
  configSaveLabel?: React.ReactNode;
  configCancelLabel?: React.ReactNode;
  configProviderOptions?: HzAiChatProviderOption[];
  configValue?: HzAiChatProviderConfigValue;
  scheduleOpen?: boolean;
  scheduleStatus?: HzAiChatScheduleStatus;
  scheduleStatusLabel?: React.ReactNode;
  scheduleTriggerLabel?: React.ReactNode;
  scheduleTitle?: React.ReactNode;
  scheduleConfiguredTitle?: React.ReactNode;
  scheduleCreateTitle?: React.ReactNode;
  scheduleAddTitle?: React.ReactNode;
  scheduleSkillLabel?: React.ReactNode;
  scheduleSkillSelectLabel?: React.ReactNode;
  scheduleSkillPlaceholder?: React.ReactNode;
  scheduleCronLabel?: React.ReactNode;
  scheduleCronHelp?: React.ReactNode;
  scheduleCronCommonLabel?: React.ReactNode;
  scheduleCronMondayLabel?: React.ReactNode;
  scheduleStatusColumnLabel?: React.ReactNode;
  scheduleActionLabel?: React.ReactNode;
  scheduleEnabledLabel?: React.ReactNode;
  scheduleDisabledLabel?: React.ReactNode;
  scheduleEditLabel?: React.ReactNode;
  scheduleDeleteLabel?: React.ReactNode;
  scheduleDeleteConfirmLabel?: React.ReactNode;
  scheduleDeleteCancelLabel?: React.ReactNode;
  scheduleDeleteStatus?: HzAiChatScheduleDeleteStatus;
  scheduleDeleteScheduleId?: HzAiChatScheduleRow['id'] | null;
  scheduleSaveLabel?: React.ReactNode;
  scheduleCancelLabel?: React.ReactNode;
  scheduleCreateLabel?: React.ReactNode;
  scheduleRows?: HzAiChatScheduleRow[];
  scheduleSkills?: HzAiChatScheduleSkillOption[];
  scheduleDraft?: HzAiChatScheduleDraft;
  scheduleEditDraft?: (HzAiChatScheduleDraft & { id: string | number }) | null;
  initialMessageLabel?: React.ReactNode;
  initialMessage?: string;
  previewMessages?: HzAiChatPreviewMessage[];
  conversationMessages?: HzAiChatPreviewMessage[];
  messageStatus?: HzAiChatMessageStatus;
  messageStatusLabel?: React.ReactNode;
  conversations?: HzAiChatConversationPreview[];
  conversationStatus?: HzAiChatConversationStatus;
  conversationStatusLabel?: React.ReactNode;
  onNewConversation?: () => void;
  onConversationSelect?: (id: HzAiChatConversationPreview['id']) => void;
  onConversationDeleteRequest?: (id: HzAiChatConversationPreview['id']) => void;
  onConversationDeleteCancel?: () => void;
  onConversationDeleteConfirm?: (id: HzAiChatConversationPreview['id']) => void;
  onInputChange?: (value: string) => void;
  onSendMessage?: () => void;
  onConfigOpen?: () => void;
  onConfigClose?: () => void;
  onConfigSave?: () => void;
  onConfigResetDefaults?: () => void;
  onConfigChange?: (value: HzAiChatProviderConfigValue) => void;
  onScheduleOpen?: () => void;
  onScheduleClose?: () => void;
  onScheduleDraftChange?: (value: HzAiChatScheduleDraft) => void;
  onScheduleCreate?: () => void;
  onScheduleToggle?: (id: HzAiChatScheduleRow['id'], enabled: boolean) => void;
  onScheduleEditStart?: (row: HzAiChatScheduleRow) => void;
  onScheduleEditCancel?: () => void;
  onScheduleEditChange?: (value: HzAiChatScheduleDraft & { id: string | number }) => void;
  onScheduleUpdate?: () => void;
  onScheduleDelete?: (id: HzAiChatScheduleRow['id']) => void;
  onScheduleDeleteRequest?: (id: HzAiChatScheduleRow['id']) => void;
  onScheduleDeleteCancel?: () => void;
  onScheduleDeleteConfirm?: () => void;
  onClose?: () => void;
};

export const HzAiChatModalSurface = React.forwardRef<HTMLDivElement, HzAiChatModalSurfaceProps>(
  (
    {
      className,
      title,
      subtitle,
      conversationsTitle,
      newChatLabel,
      newChatStatus = 'idle',
      deleteLabel = 'Delete conversation',
      deleteConfirmLabel = 'Delete',
      deleteCancelLabel = 'Cancel',
      deleteStatus = 'idle',
      deleteConversationId = null,
      welcomeTitle,
      welcomeDescription,
      inputPlaceholder,
      inputReadOnly,
      inputValue = '',
      inputHint,
      closeLabel,
      sendLabel,
      sendStatus = 'idle',
      streamingLabel = 'Typing...',
      configOpen = false,
      configTitle = 'AI Provider Configuration',
      configDescription,
      configStatus = 'idle',
      configStatusLabel,
      configTriggerLabel = 'Modify API key',
      configProviderLabel = 'AI Provider',
      configProviderHelp,
      configApiKeyLabel = 'API Key',
      configApiKeyHelp,
      configBaseUrlLabel = 'Base URL',
      configBaseUrlHelp,
      configModelLabel = 'Model',
      configModelHelp,
      configResetLabel = 'Reset defaults',
      configSaveLabel = 'Save',
      configCancelLabel = 'Cancel',
      configProviderOptions = [],
      configValue = { code: '', apiKey: '', baseUrl: '', model: '' },
      scheduleOpen = false,
      scheduleStatus = 'idle',
      scheduleStatusLabel,
      scheduleTriggerLabel = 'Schedule',
      scheduleTitle = 'Schedule Configuration',
      scheduleConfiguredTitle = 'Configured Schedules',
      scheduleCreateTitle = 'Create Schedule',
      scheduleAddTitle = 'Add New Task',
      scheduleSkillLabel = 'Skill',
      scheduleSkillSelectLabel = 'Select Skill',
      scheduleSkillPlaceholder = 'Select skill to execute',
      scheduleCronLabel = 'Execution Time (Cron Expression)',
      scheduleCronHelp = 'Format: seconds minutes hours day month week',
      scheduleCronCommonLabel = 'Common: daily 9am',
      scheduleCronMondayLabel = 'Monday 9am',
      scheduleStatusColumnLabel = 'Status',
      scheduleActionLabel = 'Action',
      scheduleEnabledLabel = 'Enabled',
      scheduleDisabledLabel = 'Disabled',
      scheduleEditLabel = 'Edit',
      scheduleDeleteLabel = 'Delete',
      scheduleDeleteConfirmLabel = 'Delete',
      scheduleDeleteCancelLabel = 'Cancel',
      scheduleDeleteStatus = 'idle',
      scheduleDeleteScheduleId = null,
      scheduleSaveLabel = 'Save',
      scheduleCancelLabel = 'Cancel',
      scheduleCreateLabel = 'Create Schedule',
      scheduleRows = [],
      scheduleSkills = [],
      scheduleDraft = { sopName: '', cronExpression: '', enabled: true },
      scheduleEditDraft = null,
      initialMessageLabel = 'Initial prompt',
      initialMessage,
      previewMessages = [],
      conversationMessages,
      messageStatus = 'idle',
      messageStatusLabel,
      conversations,
      conversationStatus = 'ready',
      conversationStatusLabel,
      onNewConversation,
      onConversationSelect,
      onConversationDeleteRequest,
      onConversationDeleteCancel,
      onConversationDeleteConfirm,
      onInputChange,
      onSendMessage,
      onConfigOpen,
      onConfigClose,
      onConfigSave,
      onConfigResetDefaults,
      onConfigChange,
      onScheduleOpen,
      onScheduleClose,
      onScheduleDraftChange,
      onScheduleCreate,
      onScheduleToggle,
      onScheduleEditStart,
      onScheduleEditCancel,
      onScheduleEditChange,
      onScheduleUpdate,
      onScheduleDelete,
      onScheduleDeleteRequest,
      onScheduleDeleteCancel,
      onScheduleDeleteConfirm,
      onClose,
      ...props
    },
    ref
  ) => {
    const conversationRows =
      conversations && conversations.length > 0
        ? conversations
        : [
            {
              id: 'preview',
              title: initialMessage || welcomeTitle,
              subtitle,
              active: true
            }
          ];
    const conversationCount = conversations?.length ?? 0;
    const messageRows = conversationMessages && conversationMessages.length > 0 ? conversationMessages : previewMessages;
    const messageCount = conversationMessages?.length ?? previewMessages.length;
    const inputIsReadOnly = inputReadOnly ?? !onInputChange;
    const sendDisabled = sendStatus === 'sending' || !inputValue.trim();

    return (
      <div
        ref={ref}
        className={cn('fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 text-[#e8edf5]', className)}
        data-hz-ui="ai-chat-modal-surface"
        data-hz-ai-chat-owner="hertzbeat-ui-ai-chat-modal"
        data-hz-ai-chat-density="operator-compact"
        data-hz-ai-chat-style="angular-modal-parity"
        data-hz-ai-chat-initial-message-contract={initialMessage ? 'angular-open-modal-initial-message' : 'angular-empty-modal'}
        data-hz-ai-chat-config-save-lifecycle="angular-validate-save-close-refresh"
        data-hz-ai-chat-conversation-action-lifecycle="angular-create-select-delete-fallback"
        data-hz-ai-chat-schedule-action-lifecycle="angular-load-create-toggle-revert-confirm-update-delete"
        data-hz-ai-chat-stream-history-lifecycle="angular-push-user-placeholder-sse-skill-report-refresh"
        role="dialog"
        aria-modal="true"
        {...props}
      >
        <div className="grid h-[80vh] w-[min(90vw,1180px)] min-w-0 overflow-hidden rounded-[8px] border border-[#252b35] bg-[#080b10] shadow-[0_22px_70px_rgba(0,0,0,0.42)] lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden min-w-0 border-r border-[#252b35] bg-[#0b0f16] p-3 lg:block" data-hz-ai-chat-sidebar="conversation-list">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7f8a9d]">{conversationsTitle}</p>
              <button
                type="button"
                className="inline-flex h-7 items-center justify-center rounded-[3px] border border-[#303846] px-2 text-[12px] font-medium text-[#dce7f7] transition hover:bg-[#151b25]"
                data-hz-ai-chat-new-chat="shared"
                data-hz-ai-chat-new-chat-status={newChatStatus}
                aria-busy={newChatStatus === 'creating' ? 'true' : undefined}
                disabled={newChatStatus === 'creating'}
                onClick={onNewConversation}
              >
                {newChatLabel}
              </button>
            </div>
            <div
              className="mt-3 space-y-2"
              data-hz-ai-chat-conversation-status={conversationStatus}
              data-hz-ai-chat-conversation-count={conversationCount}
              data-hz-ai-chat-conversation-action-lifecycle="angular-create-select-delete-fallback"
            >
              {conversationStatusLabel ? (
                <p className="rounded-[4px] border border-[#252b35] bg-[#0d121a] px-3 py-2 text-[11px] leading-4 text-[#9ca7ba]">
                  {conversationStatusLabel}
                </p>
              ) : null}
              {conversationRows.map((conversation, index) => (
                <div
                  key={conversation.id}
                  className={cn(
                    'block w-full rounded-[4px] border px-3 py-2 text-left transition hover:border-[#3e4b60] hover:bg-[#151b25]',
                    conversation.active || index === 0
                      ? 'border-[#31415a] bg-[#111722]'
                      : 'border-[#252b35] bg-[#0d121a]'
                  )}
                  data-hz-ai-chat-conversation-row="shared"
                  data-hz-ai-chat-conversation-active={conversation.active || index === 0 ? 'true' : 'false'}
                  data-hz-ai-chat-conversation-delete-status={
                    String(deleteConversationId) === String(conversation.id) ? deleteStatus : 'idle'
                  }
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      data-hz-ai-chat-conversation-select="shared"
                      onClick={() => onConversationSelect?.(conversation.id)}
                    >
                      <p className="truncate text-[12px] font-medium text-[#edf4ff]">{conversation.title}</p>
                      {conversation.subtitle ? <p className="mt-1 truncate text-[11px] text-[#7f8a9d]">{conversation.subtitle}</p> : null}
                    </button>
                    {onConversationDeleteRequest ? (
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] text-[#7f8a9d] transition hover:bg-[#202938] hover:text-[#f4f7fb]"
                        aria-label={deleteLabel}
                        data-hz-ai-chat-conversation-delete="shared"
                        onClick={() => onConversationDeleteRequest(conversation.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : null}
                  </div>
                  {String(deleteConversationId) === String(conversation.id) ? (
                    <div
                      className="mt-2 flex items-center justify-end gap-2 border-t border-[#252b35] pt-2"
                      data-hz-ai-chat-conversation-delete-confirm="shared"
                    >
                      <button
                        type="button"
                        className="rounded-[3px] px-2 py-1 text-[11px] text-[#9ca7ba] hover:bg-[#151b25]"
                        data-hz-ai-chat-conversation-delete-cancel="shared"
                        onClick={onConversationDeleteCancel}
                      >
                        {deleteCancelLabel}
                      </button>
                      <button
                        type="button"
                        className="rounded-[3px] border border-[#6e2c32] bg-[#2a1116] px-2 py-1 text-[11px] font-semibold text-[#ffb4bd] disabled:opacity-60"
                        data-hz-ai-chat-conversation-delete-submit="shared"
                        disabled={deleteStatus === 'deleting'}
                        aria-busy={deleteStatus === 'deleting' ? 'true' : undefined}
                        onClick={() => onConversationDeleteConfirm?.(conversation.id)}
                      >
                        {deleteConfirmLabel}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </aside>
        <section className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto]" data-hz-ai-chat-main="message-flow">
          <header className="flex min-w-0 items-start justify-between gap-3 border-b border-[#252b35] px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-[16px] font-semibold text-[#f4f7fb]">{title}</h2>
              {subtitle ? <p className="mt-1 truncate text-[12px] text-[#7f8a9d]">{subtitle}</p> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {onScheduleOpen ? (
                <button
                  type="button"
                  className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[#303846] px-2 text-[12px] font-medium text-[#dce7f7] transition hover:bg-[#151b25]"
                  data-hz-ai-chat-schedule-open="shared"
                  onClick={onScheduleOpen}
                >
                  <CalendarDays size={13} />
                  {scheduleTriggerLabel}
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-[3px] text-[#9ca7ba] transition hover:bg-[#151b25] hover:text-[#f4f7fb]"
                aria-label={closeLabel}
                onClick={onClose}
                data-hz-ai-chat-close="shared"
              >
                <X size={15} />
              </button>
            </div>
          </header>
          <div className="hb-scrollbar min-h-0 overflow-auto px-4 py-4" data-hz-ai-chat-message-scroll="shared">
            <div className="rounded-[4px] border border-[#252b35] bg-[#0d121a] px-4 py-3" data-hz-ai-chat-welcome="shared">
              <p className="text-[14px] font-semibold text-[#f4f7fb]">{welcomeTitle}</p>
              <p className="mt-2 text-[12px] leading-5 text-[#9ca7ba]">{welcomeDescription}</p>
            </div>
            {initialMessage ? (
              <div
                className="mt-3 rounded-[4px] border border-[#31415a] bg-[#101a28] px-4 py-3"
                data-hz-ai-chat-initial-message="true"
                data-hz-ai-chat-initial-message-source="angular-open-modal"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8ea4c5]">{initialMessageLabel}</p>
                <p className="mt-1 text-[13px] leading-5 text-[#edf4ff]">{initialMessage}</p>
              </div>
            ) : null}
            {configOpen ? (
              <div
                className="mt-3 rounded-[4px] border border-[#31415a] bg-[#0b111a] px-4 py-3 shadow-[0_16px_36px_rgba(0,0,0,0.26)]"
                data-hz-ai-chat-config-panel="shared"
                data-hz-ai-chat-config-owner="hertzbeat-ui-ai-chat-config"
                data-hz-ai-chat-config-status={configStatus}
                data-hz-ai-chat-config-save-lifecycle="angular-validate-save-close-refresh"
                data-hz-ai-chat-config-required-fields="api-key-provider-base-url-model"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#f4f7fb]">{configTitle}</p>
                    {configDescription ? <p className="mt-1 text-[12px] leading-5 text-[#9ca7ba]">{configDescription}</p> : null}
                    {configStatusLabel ? (
                      <p className="mt-2 text-[11px] leading-4 text-[#8ea4c5]" data-hz-ai-chat-config-status-label="shared">
                        {configStatusLabel}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] text-[#9ca7ba] transition hover:bg-[#151b25] hover:text-[#f4f7fb]"
                    aria-label={String(configCancelLabel)}
                    data-hz-ai-chat-config-cancel="shared"
                    onClick={onConfigClose}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8ea4c5]">
                    <span>{configProviderLabel}</span>
                    <select
                      className="mt-1 h-8 w-full rounded-[3px] border border-[#303846] bg-[#080b10] px-2 text-[12px] font-medium normal-case tracking-normal text-[#f4f7fb] outline-none"
                      value={configValue.code}
                      disabled={configStatus === 'loading' || configStatus === 'saving'}
                      data-hz-ai-chat-config-provider="shared"
                      onChange={event => onConfigChange?.({ ...configValue, code: event.target.value })}
                    >
                      {configProviderOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {configProviderHelp ? <span className="mt-1 block text-[11px] font-normal normal-case leading-4 tracking-normal text-[#7f8a9d]">{configProviderHelp}</span> : null}
                  </label>
                  <label className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8ea4c5]">
                    <span>{configApiKeyLabel}</span>
                    <input
                      className="mt-1 h-8 w-full rounded-[3px] border border-[#303846] bg-[#080b10] px-2 text-[12px] font-medium normal-case tracking-normal text-[#f4f7fb] outline-none placeholder:text-[#596579]"
                      type="password"
                      value={configValue.apiKey}
                      disabled={configStatus === 'loading' || configStatus === 'saving'}
                      placeholder="sk-..."
                      data-hz-ai-chat-config-api-key="shared"
                      onChange={event => onConfigChange?.({ ...configValue, apiKey: event.target.value })}
                    />
                    {configApiKeyHelp ? <span className="mt-1 block text-[11px] font-normal normal-case leading-4 tracking-normal text-[#7f8a9d]">{configApiKeyHelp}</span> : null}
                  </label>
                  <label className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8ea4c5]">
                    <span>{configBaseUrlLabel}</span>
                    <input
                      className="mt-1 h-8 w-full rounded-[3px] border border-[#303846] bg-[#080b10] px-2 text-[12px] font-medium normal-case tracking-normal text-[#f4f7fb] outline-none placeholder:text-[#596579]"
                      value={configValue.baseUrl}
                      disabled={configStatus === 'loading' || configStatus === 'saving'}
                      placeholder="https://api.openai.com/v1"
                      data-hz-ai-chat-config-base-url="shared"
                      onChange={event => onConfigChange?.({ ...configValue, baseUrl: event.target.value })}
                    />
                    {configBaseUrlHelp ? <span className="mt-1 block text-[11px] font-normal normal-case leading-4 tracking-normal text-[#7f8a9d]">{configBaseUrlHelp}</span> : null}
                  </label>
                  <label className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8ea4c5]">
                    <span>{configModelLabel}</span>
                    <input
                      className="mt-1 h-8 w-full rounded-[3px] border border-[#303846] bg-[#080b10] px-2 text-[12px] font-medium normal-case tracking-normal text-[#f4f7fb] outline-none placeholder:text-[#596579]"
                      value={configValue.model}
                      disabled={configStatus === 'loading' || configStatus === 'saving'}
                      placeholder="gpt-4"
                      data-hz-ai-chat-config-model="shared"
                      onChange={event => onConfigChange?.({ ...configValue, model: event.target.value })}
                    />
                    {configModelHelp ? <span className="mt-1 block text-[11px] font-normal normal-case leading-4 tracking-normal text-[#7f8a9d]">{configModelHelp}</span> : null}
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-[#252b35] pt-3">
                  <button
                    type="button"
                    className="inline-flex h-7 items-center rounded-[3px] px-2 text-[11px] font-medium text-[#9ca7ba] transition hover:bg-[#151b25] hover:text-[#f4f7fb]"
                    disabled={configStatus === 'loading' || configStatus === 'saving'}
                    data-hz-ai-chat-config-reset="shared"
                    onClick={onConfigResetDefaults}
                  >
                    {configResetLabel}
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-7 items-center rounded-[3px] px-2 text-[11px] font-medium text-[#9ca7ba] transition hover:bg-[#151b25] hover:text-[#f4f7fb]"
                    data-hz-ai-chat-config-cancel-button="shared"
                    onClick={onConfigClose}
                  >
                    {configCancelLabel}
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-7 items-center rounded-[3px] border border-[#375b9a] bg-[#142647] px-3 text-[11px] font-semibold text-[#dce7f7] transition hover:bg-[#18305b] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={configStatus === 'loading' || configStatus === 'saving'}
                    aria-busy={configStatus === 'saving' ? 'true' : undefined}
                    data-hz-ai-chat-config-save="shared"
                    onClick={onConfigSave}
                  >
                    {configSaveLabel}
                  </button>
                </div>
              </div>
            ) : null}
            {scheduleOpen ? (
              <div
                className="mt-3 rounded-[4px] border border-[#31415a] bg-[#0b111a] px-4 py-3 shadow-[0_16px_36px_rgba(0,0,0,0.26)]"
                data-hz-ai-chat-schedule-panel="shared"
                data-hz-ai-chat-schedule-owner="hertzbeat-ui-ai-chat-schedule"
                data-hz-ai-chat-schedule-status={scheduleStatus}
                data-hz-ai-chat-schedule-action-lifecycle="angular-load-create-toggle-revert-confirm-update-delete"
                data-hz-ai-chat-schedule-required-fields="sop-name-cron-expression"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#f4f7fb]">{scheduleTitle}</p>
                    {scheduleStatusLabel ? (
                      <p className="mt-1 text-[11px] leading-4 text-[#8ea4c5]" data-hz-ai-chat-schedule-status-label="shared">
                        {scheduleStatusLabel}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] text-[#9ca7ba] transition hover:bg-[#151b25] hover:text-[#f4f7fb]"
                    aria-label={String(scheduleCancelLabel)}
                    data-hz-ai-chat-schedule-close="shared"
                    onClick={onScheduleClose}
                  >
                    <X size={14} />
                  </button>
                </div>
                {scheduleRows.length > 0 ? (
                  <div className="mt-3" data-hz-ai-chat-schedule-list="shared" data-hz-ai-chat-schedule-count={scheduleRows.length}>
                    <p className="text-[12px] font-semibold text-[#dce7f7]">{scheduleConfiguredTitle}</p>
                    <div className="mt-2 overflow-hidden rounded-[4px] border border-[#252b35]">
                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_86px_170px] border-b border-[#252b35] bg-[#101722] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8ea4c5]">
                        <span>{scheduleSkillLabel}</span>
                        <span>{scheduleCronLabel}</span>
                        <span>{scheduleStatusColumnLabel}</span>
                        <span className="text-right">{scheduleActionLabel}</span>
                      </div>
                      {scheduleRows.map(row => (
                        <div
                          key={row.id}
                          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_86px_170px] items-center gap-2 border-b border-[#252b35] px-3 py-2 text-[12px] last:border-b-0"
                          data-hz-ai-chat-schedule-row="shared"
                          data-hz-ai-chat-schedule-enabled={row.enabled ? 'true' : 'false'}
                          data-hz-ai-chat-schedule-delete-status={
                            String(scheduleDeleteScheduleId) === String(row.id) ? scheduleDeleteStatus : 'idle'
                          }
                        >
                          <span className="truncate text-[#edf4ff]">{row.sopName}</span>
                          <code className="truncate rounded-[3px] bg-[#080b10] px-1.5 py-1 text-[11px] text-[#9ca7ba]">{row.cronExpression}</code>
                          <label className="inline-flex items-center gap-1.5 text-[11px] text-[#9ca7ba]">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 accent-[#4c7dff]"
                              checked={row.enabled}
                              disabled={scheduleStatus === 'saving' || scheduleStatus === 'loading'}
                              data-hz-ai-chat-schedule-toggle="shared"
                              onChange={event => onScheduleToggle?.(row.id, event.target.checked)}
                            />
                            {row.enabled ? scheduleEnabledLabel : scheduleDisabledLabel}
                          </label>
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-[3px] text-[#9ca7ba] hover:bg-[#151b25] hover:text-[#f4f7fb]"
                              aria-label={String(scheduleEditLabel)}
                              data-hz-ai-chat-schedule-edit="shared"
                              onClick={() => onScheduleEditStart?.(row)}
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-[3px] text-[#9ca7ba] hover:bg-[#2a1116] hover:text-[#ffb4bd]"
                              aria-label={String(scheduleDeleteLabel)}
                              data-hz-ai-chat-schedule-delete="shared"
                              onClick={() => (onScheduleDeleteRequest ? onScheduleDeleteRequest(row.id) : onScheduleDelete?.(row.id))}
                            >
                              <Trash2 size={12} />
                            </button>
                            {String(scheduleDeleteScheduleId) === String(row.id) ? (
                              <div className="flex items-center gap-1" data-hz-ai-chat-schedule-delete-confirm="shared">
                                <button
                                  type="button"
                                  className="h-6 rounded-[3px] px-1.5 text-[10px] text-[#9ca7ba] hover:bg-[#151b25]"
                                  data-hz-ai-chat-schedule-delete-cancel="shared"
                                  onClick={onScheduleDeleteCancel}
                                >
                                  {scheduleDeleteCancelLabel}
                                </button>
                                <button
                                  type="button"
                                  className="h-6 rounded-[3px] border border-[#5f2530] bg-[#2a1116] px-1.5 text-[10px] font-semibold text-[#ffb4bd] disabled:opacity-60"
                                  disabled={scheduleDeleteStatus === 'deleting'}
                                  aria-busy={scheduleDeleteStatus === 'deleting' ? 'true' : undefined}
                                  data-hz-ai-chat-schedule-delete-submit="shared"
                                  onClick={onScheduleDeleteConfirm}
                                >
                                  {scheduleDeleteConfirmLabel}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {scheduleEditDraft ? (
                  <div className="mt-3 border-t border-[#252b35] pt-3" data-hz-ai-chat-schedule-edit-form="shared">
                    <p className="text-[12px] font-semibold text-[#dce7f7]">{scheduleEditLabel}</p>
                    <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_160px]">
                      <input
                        className="h-8 rounded-[3px] border border-[#303846] bg-[#080b10] px-2 text-[12px] text-[#7f8a9d] outline-none"
                        value={scheduleEditDraft.sopName}
                        disabled
                        data-hz-ai-chat-schedule-edit-skill="shared"
                      />
                      <input
                        className="h-8 rounded-[3px] border border-[#303846] bg-[#080b10] px-2 text-[12px] text-[#f4f7fb] outline-none"
                        value={scheduleEditDraft.cronExpression}
                        placeholder="0 0 9 * * ?"
                        data-hz-ai-chat-schedule-edit-cron="shared"
                        onChange={event => onScheduleEditChange?.({ ...scheduleEditDraft, cronExpression: event.target.value })}
                      />
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <button type="button" className="h-7 rounded-[3px] px-2 text-[11px] text-[#9ca7ba] hover:bg-[#151b25]" data-hz-ai-chat-schedule-edit-cancel="shared" onClick={onScheduleEditCancel}>
                        {scheduleCancelLabel}
                      </button>
                      <button
                        type="button"
                        className="h-7 rounded-[3px] border border-[#375b9a] bg-[#142647] px-3 text-[11px] font-semibold text-[#dce7f7] disabled:opacity-60"
                        disabled={!scheduleEditDraft.cronExpression.trim() || scheduleStatus === 'saving'}
                        data-hz-ai-chat-schedule-edit-save="shared"
                        onClick={onScheduleUpdate}
                      >
                        {scheduleSaveLabel}
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="mt-3 border-t border-[#252b35] pt-3" data-hz-ai-chat-schedule-create-form="shared">
                  <p className="text-[12px] font-semibold text-[#dce7f7]">{scheduleRows.length > 0 ? scheduleAddTitle : scheduleCreateTitle}</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_160px]">
                    <label className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8ea4c5]">
                      <span>{scheduleSkillSelectLabel}</span>
                      <select
                        className="mt-1 h-8 w-full rounded-[3px] border border-[#303846] bg-[#080b10] px-2 text-[12px] font-medium normal-case tracking-normal text-[#f4f7fb] outline-none"
                        value={scheduleDraft.sopName}
                        disabled={scheduleStatus === 'loading' || scheduleStatus === 'saving'}
                        data-hz-ai-chat-schedule-skill="shared"
                        onChange={event => onScheduleDraftChange?.({ ...scheduleDraft, sopName: event.target.value })}
                      >
                        <option value="">{scheduleSkillPlaceholder}</option>
                        {scheduleSkills.map(skill => (
                          <option key={skill.value} value={skill.value}>
                            {skill.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8ea4c5]">
                      <span>{scheduleCronLabel}</span>
                      <input
                        className="mt-1 h-8 w-full rounded-[3px] border border-[#303846] bg-[#080b10] px-2 text-[12px] font-medium normal-case tracking-normal text-[#f4f7fb] outline-none"
                        value={scheduleDraft.cronExpression}
                        placeholder="0 0 9 * * ?"
                        disabled={scheduleStatus === 'loading' || scheduleStatus === 'saving'}
                        data-hz-ai-chat-schedule-cron="shared"
                        onChange={event => onScheduleDraftChange?.({ ...scheduleDraft, cronExpression: event.target.value })}
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-[#7f8a9d]" data-hz-ai-chat-schedule-cron-help="shared">
                    {scheduleCronHelp} · {scheduleCronCommonLabel} <code>0 0 9 * * ?</code> · {scheduleCronMondayLabel}{' '}
                    <code>0 0 9 ? * MON</code>
                  </p>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[#375b9a] bg-[#142647] px-3 text-[11px] font-semibold text-[#dce7f7] transition hover:bg-[#18305b] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!scheduleDraft.sopName || !scheduleDraft.cronExpression || scheduleStatus === 'loading' || scheduleStatus === 'saving'}
                      aria-busy={scheduleStatus === 'saving' ? 'true' : undefined}
                      data-hz-ai-chat-schedule-create="shared"
                      onClick={onScheduleCreate}
                    >
                      <Plus size={12} />
                      {scheduleCreateLabel}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            <div
              className="mt-3 space-y-3"
              data-hz-ai-chat-message-status={messageStatus}
              data-hz-ai-chat-message-count={messageCount}
              data-hz-ai-chat-stream-history-lifecycle="angular-push-user-placeholder-sse-skill-report-refresh"
            >
              {messageStatusLabel ? (
                <p className="rounded-[4px] border border-[#252b35] bg-[#0d121a] px-4 py-2 text-[11px] leading-4 text-[#9ca7ba]">
                  {messageStatusLabel}
                </p>
              ) : null}
            {messageRows.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  'rounded-[4px] border px-4 py-3',
                  message.role === 'user' ? 'border-[#31415a] bg-[#101a28]' : 'border-[#252b35] bg-[#10141b]'
                )}
                data-hz-ai-chat-message-row="shared"
                data-hz-ai-chat-preview-message={message.role}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8ea4c5]">{message.label}</p>
                {message.role === 'assistant' && (message.content === '' || message.content === null || message.content === undefined) ? (
                  <p
                    className="mt-1 text-[13px] leading-5 text-[#9ca7ba]"
                    data-hz-ai-chat-streaming-indicator="shared"
                    data-hz-ai-chat-streaming-status={sendStatus === 'sending' ? 'typing' : 'empty'}
                  >
                    {streamingLabel}
                  </p>
                ) : (
                  <p className="mt-1 text-[13px] leading-5 text-[#dce7f7]">{message.content}</p>
                )}
              </div>
            ))}
            </div>
          </div>
          <footer className="border-t border-[#252b35] bg-[#0b0f16] px-4 py-3">
            <div
              className="flex h-9 min-w-0 items-center rounded-[4px] border border-[#303846] bg-[#080b10]"
              data-hz-ai-chat-input-shell="shared"
              data-hz-ai-chat-input-mode={inputIsReadOnly ? 'readonly' : 'editable'}
              data-hz-ai-chat-send-lifecycle="angular-push-user-placeholder-sse"
            >
              <input
                className="min-w-0 flex-1 bg-transparent px-3 text-[13px] text-[#f4f7fb] outline-none placeholder:text-[#7f8a9d]"
                placeholder={inputPlaceholder}
                readOnly={inputIsReadOnly}
                disabled={sendStatus === 'sending'}
                value={inputValue}
                data-hz-ai-chat-input="shared"
                onChange={event => onInputChange?.(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    if (!sendDisabled) {
                      onSendMessage?.();
                    }
                  }
                }}
              />
              <button
                type="button"
                className="inline-flex h-full w-10 items-center justify-center border-l border-[#303846] text-[#9ca7ba] transition hover:bg-[#151b25] hover:text-[#f4f7fb] disabled:cursor-not-allowed disabled:opacity-45"
                data-hz-ai-chat-send="shared"
                data-hz-ai-chat-send-status={sendStatus}
                aria-label={sendLabel || inputPlaceholder}
                aria-busy={sendStatus === 'sending' ? 'true' : undefined}
                disabled={sendDisabled}
                onClick={onSendMessage}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              {inputHint ? <p className="text-[11px] text-[#7f8a9d]">{inputHint}</p> : <span />}
              {onConfigOpen ? (
                <button
                  type="button"
                  className="inline-flex h-6 items-center gap-1 rounded-[3px] px-1.5 text-[11px] font-medium text-[#8ea4c5] transition hover:bg-[#151b25] hover:text-[#f4f7fb]"
                  data-hz-ai-chat-config-open="shared"
                  onClick={onConfigOpen}
                >
                  <Settings size={12} />
                  {configTriggerLabel}
                </button>
              ) : null}
            </div>
          </footer>
        </section>
      </div>
    </div>
    );
  }
);

HzAiChatModalSurface.displayName = 'HzAiChatModalSurface';

export const hertzBeatUiScrollbarBaseline = {
  owner: 'hertzbeat-ui-scrollbar',
  className: 'hb-scrollbar',
  widthPx: 7,
  heightPx: 7,
  thumbTone: 'dark-neutral',
  trackTone: 'transparent',
  webKitThumbBorderPx: 1
} as const;

export type HzScrollViewportProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'log-stream';
};

export const HzScrollViewport = React.forwardRef<HTMLDivElement, HzScrollViewportProps>(
  ({ className, variant = 'default', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(variant === 'log-stream' ? 'hb-scrollbar max-h-[620px] overflow-auto' : 'hb-scrollbar overflow-auto', className)}
      data-hz-ui="scroll-viewport"
      data-hz-scroll-viewport-owner="hertzbeat-ui-scroll-viewport"
      data-hz-scroll-viewport-variant={variant}
      {...props}
    >
      {children}
    </div>
  )
);

HzScrollViewport.displayName = 'HzScrollViewport';

export type HzLogStreamLiveRowProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export const HzLogStreamLiveRow = React.forwardRef<HTMLButtonElement, HzLogStreamLiveRowProps>(
  ({ className, selected = false, children, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'grid w-full grid-cols-[58px_minmax(0,112px)_minmax(0,1fr)] items-center gap-3 px-4 text-left transition-colors hover:bg-[#10141b] sm:grid-cols-[64px_156px_minmax(0,1fr)_180px] lg:grid-cols-[72px_176px_minmax(0,1fr)_220px]',
        selected ? 'bg-[#111927]' : 'bg-transparent',
        className
      )}
      data-hz-ui="log-stream-live-row"
      data-hz-log-stream-row-owner="hertzbeat-ui-log-stream-row"
      data-hz-log-stream-row-variant="compact-live-row"
      data-hz-log-stream-row-selected={selected ? 'true' : 'false'}
      {...props}
    >
      {children}
    </button>
  )
);

HzLogStreamLiveRow.displayName = 'HzLogStreamLiveRow';

export type HzDetailAsideProps = React.HTMLAttributes<HTMLElement> & {
  variant?: 'signal-detail-rail';
};

export const HzDetailAside = React.forwardRef<HTMLElement, HzDetailAsideProps>(
  ({ className, variant = 'signal-detail-rail', children, ...props }, ref) => (
    <aside
      ref={ref}
      className={cn('border-l border-[#252b35] bg-[#0b0e13] px-4 py-4', className)}
      data-hz-ui="detail-aside"
      data-hz-detail-aside-owner="hertzbeat-ui-detail-aside"
      data-hz-detail-aside-variant={variant}
      {...props}
    >
      {children}
    </aside>
  )
);

HzDetailAside.displayName = 'HzDetailAside';

export type HzDetailBodyStackProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'selected-detail';
};

export const HzDetailBodyStack = React.forwardRef<HTMLDivElement, HzDetailBodyStackProps>(
  ({ className, variant = 'selected-detail', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('mt-4 space-y-2', className)}
      data-hz-ui="detail-body-stack"
      data-hz-detail-body-stack-owner="hertzbeat-ui-detail-body-stack"
      data-hz-detail-body-stack-variant={variant}
      {...props}
    >
      {children}
    </div>
  )
);

HzDetailBodyStack.displayName = 'HzDetailBodyStack';

export type HzWorkbenchHeaderCopyProps = React.HTMLAttributes<HTMLDivElement> & {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  copy?: React.ReactNode;
  density?: 'standard' | 'compact';
};

export const HzWorkbenchHeaderCopy = React.forwardRef<HTMLDivElement, HzWorkbenchHeaderCopyProps>(
  ({ className, eyebrow, title, copy, children, density = 'standard', ...props }, ref) => (
    <div
      ref={ref}
      className={cn('min-w-0', className)}
      data-hz-ui="workbench-header-copy"
      data-hz-workbench-header-copy-owner="hertzbeat-ui-workbench-header-copy"
      data-hz-workbench-header-copy-density={density}
      {...props}
    >
      {eyebrow ? (
        <p className="mb-2 text-[12px] font-semibold tracking-[0.08em] text-[#8792a5]" data-hz-workbench-header-copy-eyebrow="true">
          {eyebrow}
        </p>
      ) : null}
      <h1
        className={cn(
          'font-semibold tracking-normal text-[#f4f7fb]',
          density === 'compact' ? 'text-[26px]' : 'text-[30px]'
        )}
        data-hz-workbench-header-copy-title="true"
      >
        {title}
      </h1>
      {copy ? (
        <p className="mt-3 max-w-[820px] text-[13px] leading-6 text-[#9ca7ba]" data-hz-workbench-header-copy-body="true">
          {copy}
        </p>
      ) : null}
      {children}
    </div>
  )
);

HzWorkbenchHeaderCopy.displayName = 'HzWorkbenchHeaderCopy';

export type HzSignalWorkbenchShellLayout = 'default' | 'metrics-workbench' | 'topology-workbench';

const signalWorkbenchShellLayoutClassNames: Record<HzSignalWorkbenchShellLayout, string | null> = {
  default: null,
  'metrics-workbench': 'flex flex-col gap-3 px-3 pb-3 pt-0',
  'topology-workbench': [
    'flex flex-col bg-[#07090b]',
    '[&_[data-hz-ui=panel-surface]]:rounded-none',
    '[&_[data-hz-ui=panel-surface]]:border-x-0',
    '[&_[data-hz-ui=panel-surface]]:border-t-0',
    '[&_[data-hz-ui=panel-surface]]:border-[#242a33]',
    '[&_[data-hz-ui=panel-surface]]:bg-[#07090b]',
    '[&_[data-hz-ui=panel-surface]]:shadow-none',
    '[&_[data-hz-ui=data-table]]:rounded-none',
    '[&_[data-hz-ui=data-table]]:shadow-none'
  ].join(' ')
};

const signalWorkbenchShellContentClassNames: Record<HzSignalWorkbenchShellLayout, string> = {
  default: 'mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-6 py-6',
  'metrics-workbench': 'contents',
  'topology-workbench': 'flex w-full min-w-0 flex-col gap-0 px-4 pb-4 pt-3 xl:px-5'
};

export type HzSignalWorkbenchShellProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType<any>;
  contentClassName?: string;
  layout?: HzSignalWorkbenchShellLayout;
  contentLayout?: HzSignalWorkbenchShellLayout;
};

export const HzSignalWorkbenchShell = React.forwardRef<HTMLElement, HzSignalWorkbenchShellProps>(
  ({ as: Component = 'main', className, contentClassName, layout = 'default', contentLayout, children, ...props }, ref) => {
    const resolvedContentLayout = contentLayout ?? layout;

    return (
      <Component
        ref={ref}
        className={cn(
          'min-h-[calc(100vh-56px)] bg-[#07090b] text-[#e8edf5]',
          signalWorkbenchShellLayoutClassNames[layout],
          className
        )}
        data-hz-ui="signal-workbench-shell"
        data-hz-signal-workbench-shell-owner="hertzbeat-ui-signal-workbench-shell"
        data-hz-signal-workbench-shell-layout={layout}
        {...props}
      >
        <div
          className={cn(signalWorkbenchShellContentClassNames[resolvedContentLayout], contentClassName)}
          data-hz-signal-workbench-shell-content="true"
          data-hz-signal-workbench-shell-content-owner="hertzbeat-ui-signal-workbench-shell"
          data-hz-signal-workbench-shell-content-layout={resolvedContentLayout}
        >
          {children}
        </div>
      </Component>
    );
  }
);

HzSignalWorkbenchShell.displayName = 'HzSignalWorkbenchShell';

export type HzSearchFieldFrameProps = React.HTMLAttributes<HTMLDivElement> & {
  icon?: React.ReactNode;
  width?: 'default' | 'metrics-query' | 'metrics-inventory' | 'log-query';
};

const searchFieldFrameWidthClassName: Record<NonNullable<HzSearchFieldFrameProps['width']>, string> = {
  default: 'min-w-[280px] max-w-[420px] flex-1',
  'metrics-query': 'min-w-[320px] max-w-[560px] flex-1',
  'metrics-inventory': 'min-w-[260px] max-w-[420px] flex-1',
  'log-query': 'min-w-[320px] max-w-[560px] flex-1'
};

export const HzSearchFieldFrame = React.forwardRef<HTMLDivElement, HzSearchFieldFrameProps>(
  ({ className, icon, width = 'default', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative', searchFieldFrameWidthClassName[width], className)}
      data-hz-ui="search-field-frame"
      data-hz-search-field-frame-owner="hertzbeat-ui-search-field-frame"
      data-hz-search-field-frame-width={width}
      {...props}
    >
      {icon ? (
        <span
          className="pointer-events-none absolute left-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-[#7d8798]"
          data-hz-search-field-frame-icon="true"
        >
          {icon}
        </span>
      ) : null}
      {children}
    </div>
  )
);

HzSearchFieldFrame.displayName = 'HzSearchFieldFrame';

export type HzSearchFieldIconSize = 'md';

const searchFieldIconSizeClassName: Record<HzSearchFieldIconSize, string> = {
  md: 'h-4 w-4'
};

export type HzSearchFieldIconProps = React.SVGProps<SVGSVGElement> & {
  icon: React.ElementType<React.SVGProps<SVGSVGElement>>;
  size?: HzSearchFieldIconSize;
};

export function HzSearchFieldIcon({ className, icon: Icon, size = 'md', ...props }: HzSearchFieldIconProps) {
  return (
    <Icon
      aria-hidden="true"
      className={cn(searchFieldIconSizeClassName[size], className)}
      data-hz-ui="search-field-icon"
      data-hz-search-field-icon-owner="hertzbeat-ui-search-field-icon"
      data-hz-search-field-icon-size={size}
      {...props}
    />
  );
}

export const hertzBeatUiFoundationGuide = {
  foundationStatus: 'ready',
  visualLanguage: 'dense-dark-operator-console',
  tokenGroups: [
    {
      id: 'canvas',
      label: 'Canvas and surfaces',
      tokens: ['--hz-ui-canvas', '--hz-ui-surface', '--hz-ui-surface-soft', '--hz-ui-surface-raised', '--hz-ui-surface-graphite']
    },
    {
      id: 'boundary',
      label: 'Soft boundaries',
      tokens: ['--hz-ui-line-strong', '--hz-ui-line', '--hz-ui-line-soft', '--hz-ui-line-faint']
    },
    {
      id: 'interaction',
      label: 'Interaction states',
      tokens: ['--hz-ui-control', '--hz-ui-active', '--hz-ui-active-soft', '--hz-ui-accent', '--hz-ui-accent-muted', '--hz-ui-action-primary']
    },
    {
      id: 'scrollbar',
      label: 'Thin scrollbars',
      tokens: ['--hz-ui-scrollbar-size', '--hz-ui-scrollbar-thumb', '--hz-ui-scrollbar-thumb-hover']
    }
  ],
  forbiddenPatterns: [
    {
      id: 'nested-card-shells',
      label: 'Nested card shells',
      replacement: 'Use full-width bands, rails, and fine-line sections inside one workbench surface.'
    },
    {
      id: 'marketing-card-grid',
      label: 'Marketing card grid',
      replacement: 'Use tables, grouped lists, and evidence rows for operator scanning.'
    },
    {
      id: 'oversized-rounded-panels',
      label: 'Oversized rounded panels',
      replacement: 'Keep shell radius at 4px or less and reserve larger radius for none of the core workbench chrome.'
    },
    {
      id: 'gradient-orb-backgrounds',
      label: 'Gradient orb backgrounds',
      replacement: 'Use surface depth, thin dividers, and state color only where it carries data.'
    }
  ],
  componentUsage: [
    {
      component: 'HzExplorerFrame',
      use: 'Page shell with compact density, skip link, responsive grid, and named workbench landmarks.'
    },
    {
      component: 'HzFilterWorkbench',
      use: 'Filter rail for quick facets, builder clauses, saved views, group-by, and query plan context.'
    },
    {
      component: 'HzDataTable',
      use: 'Dense result lists with clickable rows, status badges, field actions, and drawer handoff.'
    },
    {
      component: 'HzMonitorFilterBar',
      use: 'Monitor list filter row with shared search, type/status menus, and apply/reset actions.'
    },
    {
      component: 'HzPaginationBar',
      use: 'Compact list footer with shared page summary, page-size menu, and previous/next navigation controls.'
    },
    {
      component: 'HzConfirmDialog',
      use: 'Controlled confirmation dialog shell for destructive or guarded monitor actions.'
    },
    {
      component: 'HzWorkbenchSurface',
      use: 'Shared shell for dense business detail cards with compact heading, actions, selected state, and body rhythm.'
    },
    {
      component: 'HzMonitorBasicCard',
      use: 'Realtime monitor basic summary card shell with shared heading chrome and compact edit affordance.'
    },
    {
      component: 'HzMonitorBasicSummary',
      use: 'Realtime monitor basic name, status, facts, labels, annotations, and meta rows inside the shared card shell.'
    },
    {
      component: 'HzMonitorMetricCard',
      use: 'Realtime monitor metric table card with shared card chrome, table density, and inline loading/error/empty states.'
    },
    {
      component: 'HzMonitorFullscreenFrame',
      use: 'Monitor detail fullscreen overlay and heading chrome with shared compact actions instead of page-local modal shells.'
    },
    {
      component: 'HzMonitorStatGrid',
      use: 'Monitor detail compact stat grid for selected history/metric context, replacing old observability stat bridges.'
    },
    {
      component: 'HzMonitorSignalBars',
      use: 'Monitor detail compact signal/value bars with shared graphite tone and no page-local rounded pill chrome.'
    },
    {
      component: 'HzInlineContextMark',
      use: 'Compact breadcrumb/context marker that uses the same underline language as top-level monitor switches, without chip or card chrome.'
    },
    {
      component: 'HzMonitorDetailConsoleShell',
      use: 'Monitor detail outer shell with shared tight first-viewport spacing, graphite tone, and no page-local wrapper chrome.'
    },
    {
      component: 'HzMonitorDetailWorkbenchFrame',
      use: 'Monitor detail tab workbench frame with shared tabset spacing and body ownership.'
    },
    {
      component: 'HzMonitorDetailTabs',
      use: 'Monitor detail tab bar with optional toolbar slot, keyboard navigation, and shared compact tab chrome.'
    },
    {
      component: 'HzMonitorDetailTabLabel',
      use: 'Monitor detail tab label/icon composition with shared underline-tab typography and icon sizing.'
    },
    {
      component: 'HzMonitorDetailStage',
      use: 'Monitor detail section shell with shared flat dividers, title rhythm, and tight realtime spacing.'
    },
    {
      component: 'HzMonitorDetailTabSequence',
      use: 'Monitor detail tab content rhythm wrapper with shared tight spacing and no page-local card stack.'
    },
    {
      component: 'HzMonitorDetailTabPanel',
      use: 'Monitor detail tabpanel body shell with shared ARIA, spacing, and tab-content surface ownership.'
    },
    {
      component: 'HzMonitorRefreshToolbar',
      use: 'Monitor detail refresh and signal handoff toolbar with one compact shared control row instead of page-local stacked cards.'
    },
    {
      component: 'HzMonitorRealtimeToolbar',
      use: 'Realtime monitor metric fact and action toolbar with shared compact action density for table cards and detail panels.'
    },
    {
      component: 'HzMonitorRealtimeInspector',
      use: 'Realtime monitor selected-row summary and detail inspector with shared flat chrome and row metadata density.'
    },
    {
      component: 'HzMonitorRealtimeRowNavigator',
      use: 'Realtime monitor selected-row previous/next navigation with shared compact action chrome.'
    },
    {
      component: 'HzMonitorRowNavigator',
      use: 'Generic monitor previous/next navigation row for history points, series, and realtime rows with shared compact action chrome.'
    },
    {
      component: 'HzMonitorControlBand',
      use: 'Flat monitor control band for compare scopes, chart scopes, and grouped actions without page-local card or border chrome.'
    },
    {
      component: 'HzTimeRangeToolbar',
      use: 'Compact time-range toolbar for monitor history charts with shared select, refresh, reset, and apply controls.'
    },
    {
      component: 'HzSelectableRows',
      use: 'Monitor history point, series, and compare evidence rows with shared left-rail selection instead of page-local row chrome.'
    },
    {
      component: 'HzDetailRows',
      use: 'Monitor history summary and selected-point evidence rows with shared flat row chrome instead of old observability detail rows.'
    },
    {
      component: 'HzUnderlineToggle',
      use: 'Compact bottom-underline toggle for monitor history ranges, modes, chart series, and compare scope; replaces pill/chip chrome.'
    },
    {
      component: 'HzMonitorEditorForm',
      use: 'Monitor new/edit linear form shell with shared width, rhythm, and bottom action placement.'
    },
    {
      component: 'HzMonitorEditorHeader',
      use: 'Monitor new/edit top title chrome for linear forms without page-local facts or mode strips.'
    },
    {
      component: 'HzMonitorEditorActionBar',
      use: 'Monitor new/edit bottom action dock with shared centered button ownership, mutation feedback, and validation posture.'
    },
    {
      component: 'HzMonitorEditorFieldGrid',
      use: 'Monitor new/edit field grid density for paired form controls without page-local Tailwind layout ownership.'
    },
    {
      component: 'HzMonitorEditorSection',
      use: 'Monitor new/edit form section shell with compact heading, copy, and field body rhythm.'
    },
    {
      component: 'HzKeyValueEditor',
      use: 'Compact key/value row editor for labels, annotations, and metadata without page-local row chrome.'
    },
    {
      component: 'HzField',
      use: 'Compact monitor editor field wrapper for shared label, input, and select density.'
    },
    {
      component: 'HzTextarea',
      use: 'Shared multiline editor control for monitor descriptions and operator notes.'
    },
    {
      component: 'HzCheckbox',
      use: 'Shared compact checkbox control for boolean monitor params and guarded editor toggles.'
    },
    {
      component: 'HzFileInput',
      use: 'Shared hidden native file input for import actions; visual triggers stay in shared toolbar/action primitives.'
    },
    {
      component: 'HzNumberStepper',
      use: 'Shared compact stepper control for monitor intervals and numeric params.'
    },
    {
      component: 'HzCodeEditorFrame',
      use: 'Shared compact ownership frame for code editor runtimes in monitor forms and template workflows.'
    },
    {
      component: 'HzCodeEditor',
      use: 'Shared CodeMirror runtime with the HertzBeat editor frame, hidden value support, and language extensions.'
    },
    {
      component: 'HzTraceWaterfall',
      use: 'Global-scale span timeline with selectable rows, event markers, hierarchy, and parent connectors.'
    },
    {
      component: 'HzTopologyWorkbenchFrame',
      use: 'Topology route shell with shared compact dark surface, text color, and page-level ownership markers.'
    },
    {
      component: 'HzTopologyWorkbenchHeader',
      use: 'Topology title, copy, scope summary, and source strip header with shared compact dark chrome.'
    },
    {
      component: 'HzTopologyWorkbenchGrid',
      use: 'Topology graph workbench layout that owns the canvas and companion rail columns.'
    },
    {
      component: 'HzTopologyWorkbenchSlot',
      use: 'Topology workbench grid child wrapper for canvas and companion ownership without page-local slot chrome.'
    },
    {
      component: 'HzTopologyCanvas',
      use: 'Topology graph surface shell with shared compact dark canvas ownership, layout mode, and interaction mode markers.'
    },
    {
      component: 'HzTopologyCanvasAnnotation',
      use: 'Topology canvas status overlay for layout, depth, and selected-scope context without page-local annotation chrome.'
    },
    {
      component: 'HzTopologyGraphLayer',
      use: 'Topology SVG edge layer with shared absolute canvas positioning and graph-layer ownership markers.'
    },
    {
      component: 'HzTopologyFocusTrail',
      use: 'Focused topology breadcrumb trail with active filters, hidden-count context, and exit-focus action.'
    },
    {
      component: 'HzTopologyGroupPanel',
      use: 'Large topology grouping summary with collapsed cluster counts, worst health, and shared graph actions.'
    },
    {
      component: 'HzTopologyPathSummary',
      use: 'Selected topology path summary with source/target direction, RED facts, evidence badges, and drilldown actions.'
    },
    {
      component: 'HzTopologyScopeBar',
      use: 'Compact topology scope summary for time range, environment, and refresh actions.'
    },
    {
      component: 'HzTopologyToolbar',
      use: 'Topology workbench filter/action toolbar with shared compact dark controls and current-scope summary.'
    },
    {
      component: 'HzTopologyCompanionRail',
      use: 'Topology side companion rail that owns compact spacing for legends, RED tables, timelines, and evidence drawers.'
    },
    {
      component: 'HzTopologyCompanionSection',
      use: 'Anchorable topology companion rail section for legend, RED table, timeline, and drawer evidence blocks.'
    },
    {
      component: 'HzTopologyCompanionJumpList',
      use: 'Compact anchored topology companion navigation for graph-first right-rail evidence sections.'
    },
    {
      component: 'HzTopologyEmptyState',
      use: 'Topology canvas empty/degraded evidence state with shared compact dark chrome and explicit source/time scope.'
    },
    {
      component: 'HzTopologyLoadingState',
      use: 'Topology canvas loading evidence state with shared compact skeleton chrome and explicit source/time scope.'
    },
    {
      component: 'HzTopologyMetricTable',
      use: 'RED-ranked topology edge companion table for large graphs, keyboard access, and drawer handoff.'
    },
    {
      component: 'HzTopologyNode',
      use: 'Typed topology graph node with shared health, focus, evidence, and RED metric ownership.'
    },
    {
      component: 'HzTopologyEdge',
      use: 'Directional topology relationship edge with shared traffic, health, focus, evidence, and drilldown ownership.'
    },
    {
      component: 'HzTopologyHoverTooltip',
      use: 'Compact topology hover evidence tooltip for node/edge source, target, RED, last-seen, and sample trace context.'
    },
    {
      component: 'HzTopologyLegend',
      use: 'Compact topology legend for health, source kind, edge confidence, and stale evidence semantics.'
    },
    {
      component: 'HzTopologyDetailDrawer',
      use: 'Topology node/edge evidence drawer with stable fact rows and cross-signal handoff actions.'
    },
    {
      component: 'HzTopologyEvidenceList',
      use: 'Compact topology evidence list for incoming fault context and impact timeline rows.'
    },
    {
      component: 'HzTopologyFilterStrip',
      use: 'Compact topology source, focus, and view-mode filter strip with shared active-state ownership.'
    },
    {
      component: 'HzTopologyActionLink',
      use: 'Standalone topology investigation action link for alert impact, focus, and drilldown closure actions.'
    },
    {
      component: 'HzChartSurface',
      use: 'Shared chart shell for business-owned ECharts panels, preserving compact headings, actions, and evidence footers.'
    },
    {
      component: 'HzMetricTimeSeriesPanel',
      use: 'Reusable ECharts-backed metric history panel for monitor detail and UI Lab demos.'
    },
    {
      component: 'HzActionWorkbench',
      use: 'Automation entry workbench for guarded suggestions, adapter boundaries, checklist rails, and evidence handoffs.'
    },
    {
      component: 'HzMonitorHistoryChartGrid',
      use: 'Monitor history chart grid chrome with shared density, spacing, and ownership markers.'
    },
    {
      component: 'HzMonitorHistoryChartCard',
      use: 'Monitor history chart card wrapper around metric time-series panels with shared selection and keyboard behavior.'
    },
    {
      component: 'HzMutationBar',
      use: 'Dirty/save/failure states, validation evidence, dangerous confirmation, and inline feedback.'
    },
    {
      component: 'HzYamlWorkspace',
      use: 'Template YML editing surface with grouped template rail, schema feedback, and operator actions.'
    }
  ],
  stopCriteria: [
    'M1 trace completeness demo and contracts are present.',
    'M2 chart interactions cover crosshair, legend, bucket selection, and time-window handoff.',
    'M3 mutation primitives cover validation, dirty/save/failure, toast, confirmation, and batch actions.',
    'M4 density and accessibility protect landmarks, skip link, compact layout, and constrained viewports.',
    'M5 guide readiness keeps tokens, forbidden patterns, component usage, and stop criteria in code.'
  ]
} as const;

export function HzFoundationGuide({
  guide = hertzBeatUiFoundationGuide,
  className
}: {
  guide?: typeof hertzBeatUiFoundationGuide;
  className?: string;
}) {
  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-foundation-status={guide.foundationStatus}
      data-hz-ui="foundation-guide"
    >
      <header className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold text-[#f3f6fb]">Foundation readiness</h2>
          <p className="mt-0.5 truncate text-[11px] text-[#727b8c]">{guide.visualLanguage}</p>
        </div>
        <span className="shrink-0 border border-[var(--hz-ui-line-soft)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#9cc9aa]">
          {guide.foundationStatus}
        </span>
      </header>
      <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 border-b border-[var(--hz-ui-line-faint)] px-3 py-3 lg:border-r" data-hz-foundation-section="tokens">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#727b8c]">Tokens</div>
          <div className="mt-2 grid gap-2">
            {guide.tokenGroups.map(group => (
              <div key={group.id} className="grid min-w-0 grid-cols-[112px_minmax(0,1fr)] gap-2 text-[11px]">
                <span className="truncate font-semibold text-[#cbd5e1]">{group.label}</span>
                <span className="flex min-w-0 flex-wrap gap-1">
                  {group.tokens.map(token => (
                    <code key={token} className="border border-[var(--hz-ui-line-faint)] bg-[var(--hz-ui-canvas)] px-1.5 py-0.5 text-[10px] text-[#8f99ab]" data-hz-foundation-token={token}>
                      {token}
                    </code>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0 border-b border-[var(--hz-ui-line-faint)] px-3 py-3" data-hz-foundation-section="forbidden-patterns">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#727b8c]">Forbidden patterns</div>
          <div className="mt-2 grid gap-1.5">
            {guide.forbiddenPatterns.map(pattern => (
              <div key={pattern.id} className="grid min-w-0 grid-cols-[128px_minmax(0,1fr)] gap-2 text-[11px]" data-hz-forbidden-pattern={pattern.id}>
                <span className="truncate font-mono text-[#efd29b]">{pattern.id}</span>
                <span className="min-w-0 truncate text-[#8f99ab]">{pattern.replacement}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0 border-b border-[var(--hz-ui-line-faint)] px-3 py-3 lg:border-b-0 lg:border-r" data-hz-foundation-section="component-usage">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#727b8c]">Component usage</div>
          <div className="mt-2 grid gap-1.5">
            {guide.componentUsage.map(item => (
              <div key={item.component} className="grid min-w-0 grid-cols-[126px_minmax(0,1fr)] gap-2 text-[11px]" data-hz-component-usage={item.component}>
                <span className="truncate font-mono text-[#dbe4f0]">{item.component}</span>
                <span className="min-w-0 truncate text-[#8f99ab]">{item.use}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0 px-3 py-3" data-hz-foundation-section="stop-criteria">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#727b8c]">Stop criteria</div>
          <div className="mt-2 grid gap-1.5">
            {guide.stopCriteria.map((item, index) => (
              <div key={item} className="grid min-w-0 grid-cols-[28px_minmax(0,1fr)] gap-2 text-[11px]" data-hz-stop-criterion={`M${index + 1}`}>
                <span className="font-mono text-[#9cc9aa]">M{index + 1}</span>
                <span className="min-w-0 truncate text-[#8f99ab]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export type HzStatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'critical';

const toneClassName: Record<HzStatusTone, string> = {
  neutral: 'border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-surface-soft)] text-[#cbd5e1]',
  info: 'border-[var(--hz-ui-accent-muted)] bg-[var(--hz-ui-active-soft)] text-[#d8e4ff]',
  success: 'border-[#24533a] bg-[#101914] text-[#bde8cb]',
  warning: 'border-[#5b4527] bg-[#18150f] text-[#efd29b]',
  critical: 'border-[#5d3037] bg-[#1a1013] text-[#f0a7b2]'
};

const statusBadgeSizeClassName = {
  xs: 'h-5 min-h-5 px-1.5 text-[11px] leading-4',
  sm: 'min-h-6 px-2 text-[11px] leading-5',
  md: 'h-8 min-h-8 gap-2 px-3 text-[12px] leading-5'
} as const;

const chartToneColor: Record<HzStatusTone, { stroke: string; fill: string; soft: string }> = {
  neutral: { stroke: '#7e8494', fill: '#687083', soft: 'rgba(126,132,148,0.18)' },
  info: { stroke: '#7c93db', fill: '#52679d', soft: 'rgba(124,147,219,0.2)' },
  success: { stroke: '#5f9f75', fill: '#4f8c64', soft: 'rgba(95,159,117,0.22)' },
  warning: { stroke: '#c69b58', fill: '#9d7a42', soft: 'rgba(198,155,88,0.22)' },
  critical: { stroke: '#c76671', fill: '#a74f5a', soft: 'rgba(199,102,113,0.22)' }
};

const controlFocusClassName =
  'focus-visible:border-[var(--hz-ui-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hz-ui-active-soft)]';

function stringifyNode(value: React.ReactNode, fallback: string) {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return fallback;
}

function splitYamlEditorLines(code: string) {
  return code.length ? code.split('\n') : [''];
}

function getYamlIndentSpaces(line: string) {
  return line.match(/^\s*/)?.[0].replace(/\t/g, '  ').length || 0;
}

function renderYamlEditorLine(line: string) {
  const tokenMatch = line.match(/^(\s*)(-\s*)?([^:#\n]+:)(.*)$/);
  if (!tokenMatch) {
    return (
      <span className="text-[#dbe4f0]" data-hz-yaml-token="plain">
        {line || '\u00a0'}
      </span>
    );
  }
  const [, indent, dash, key, value] = tokenMatch;
  return (
    <>
      {indent ? <span>{indent}</span> : null}
      {dash ? (
        <span className="text-[#7c93db]" data-hz-yaml-token="dash">
          {dash}
        </span>
      ) : null}
      <span className="text-[#9cc9aa]" data-hz-yaml-token="key">
        {key}
      </span>
      {value ? (
        <span className="text-[#cbd5e1]" data-hz-yaml-token="value">
          {value}
        </span>
      ) : null}
    </>
  );
}

function clampRangePercent(value: number, min: number, max: number) {
  const range = Math.max(1, max - min);
  return Math.min(100, Math.max(0, ((value - min) / range) * 100));
}

function formatTraceRatio(value: number) {
  return value.toFixed(3);
}

export type HzButtonIntent = 'secondary' | 'primary' | 'ghost' | 'danger';
export type HzButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

const buttonIntentClassName: Record<HzButtonIntent, string> = {
  secondary:
    'border-transparent bg-[var(--hz-ui-control)] text-[#dbe4f0] hover:bg-[var(--hz-ui-surface-soft)] hover:text-white',
  primary:
    'border-transparent bg-[var(--hz-ui-action-primary)] text-white hover:bg-[var(--hz-ui-action-primary-hover)]',
  ghost:
    'border-transparent bg-[var(--hz-ui-control)] text-[#98a2b3] hover:bg-[var(--hz-ui-surface-soft)] hover:text-white',
  danger:
    'border-transparent bg-[var(--hz-ui-action-danger)] text-[#ffe3e8] hover:bg-[var(--hz-ui-action-danger-hover)] hover:text-white'
};

const buttonIntentEdge: Record<HzButtonIntent, 'flat' | 'solid'> = {
  secondary: 'flat',
  primary: 'solid',
  ghost: 'flat',
  danger: 'solid'
};

const buttonIntentTier: Record<HzButtonIntent, 'flat-neutral' | 'solid-primary' | 'solid-danger'> = {
  secondary: 'flat-neutral',
  primary: 'solid-primary',
  ghost: 'flat-neutral',
  danger: 'solid-danger'
};

const buttonSizeClassName: Record<HzButtonSize, string> = {
  xs: 'h-6 min-w-0 px-1.5 text-[10px]',
  sm: 'h-7 min-w-0 px-2 text-[11px]',
  md: 'h-8 min-w-0 px-3 text-[12px]',
  lg: 'h-10 min-w-0 px-4 text-[13px]',
  icon: 'h-7 w-7 min-w-0 px-0 text-[12px]'
};

const buttonSizeHeight: Record<HzButtonSize, string> = {
  xs: '24',
  sm: '28',
  md: '32',
  lg: '40',
  icon: '28'
};

export type HzButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  intent?: HzButtonIntent;
  layout?: 'default' | 'full';
  size?: HzButtonSize;
};

export const HzButton = React.forwardRef<HTMLButtonElement, HzButtonProps>(
  ({ className, intent = 'secondary', layout = 'default', size = 'sm', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[3px] border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45',
        controlFocusClassName,
        buttonIntentClassName[intent],
        buttonSizeClassName[size],
        layout === 'full' ? 'w-full px-2' : null,
        className
      )}
      data-hz-ui="button"
      data-hz-control-height={buttonSizeHeight[size]}
      data-hz-control-edge={buttonIntentEdge[intent]}
      data-hz-button-tier={buttonIntentTier[intent]}
      data-hz-button-layout={layout}
      {...props}
    />
  )
);

HzButton.displayName = 'HzButton';

export type HzButtonIconSize = 'md';

const buttonIconSizeClassName: Record<HzButtonIconSize, string> = {
  md: 'h-4 w-4'
};

export type HzButtonIconProps = React.SVGProps<SVGSVGElement> & {
  icon: React.ElementType<React.SVGProps<SVGSVGElement>>;
  size?: HzButtonIconSize;
};

export function HzButtonIcon({ className, icon: Icon, size = 'md', ...props }: HzButtonIconProps) {
  return (
    <Icon
      aria-hidden="true"
      className={cn(buttonIconSizeClassName[size], className)}
      data-hz-ui="button-icon"
      data-hz-button-icon-owner="hertzbeat-ui-button-icon"
      data-hz-button-icon-size={size}
      {...props}
    />
  );
}

export type HzTableRowActionButtonProps = HzButtonProps & {
  width?: 'default' | 'root-span';
};

const tableRowActionButtonWidthClassName: Record<NonNullable<HzTableRowActionButtonProps['width']>, string | null> = {
  default: null,
  'root-span': 'max-w-[240px]'
};

export const HzTableRowActionButton = React.forwardRef<HTMLButtonElement, HzTableRowActionButtonProps>(
  ({ width = 'default', className, intent = 'ghost', size = 'xs', ...props }, ref) => (
    <HzButton
      ref={ref}
      intent={intent}
      size={size}
      className={cn(tableRowActionButtonWidthClassName[width], 'justify-start truncate font-semibold', className)}
      data-hz-table-row-action-owner="hertzbeat-ui-table-row-action-button"
      data-hz-table-row-action-width={width}
      {...props}
    />
  )
);

HzTableRowActionButton.displayName = 'HzTableRowActionButton';

export type HzDisabledActionShellLayout = 'inline' | 'full';

const disabledActionShellLayoutClassNames: Record<HzDisabledActionShellLayout, string> = {
  inline: 'inline-flex',
  full: 'inline-flex w-full'
};

export type HzDisabledActionShellProps = React.HTMLAttributes<HTMLSpanElement> & {
  layout?: HzDisabledActionShellLayout;
};

export const HzDisabledActionShell = React.forwardRef<HTMLSpanElement, HzDisabledActionShellProps>(
  ({ className, layout = 'inline', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(disabledActionShellLayoutClassNames[layout], className)}
      data-hz-ui="disabled-action-shell"
      data-hz-disabled-action-shell-owner="hertzbeat-ui-disabled-action-shell"
      data-hz-disabled-action-shell-layout={layout}
      {...props}
    />
  )
);

HzDisabledActionShell.displayName = 'HzDisabledActionShell';

export type HzButtonLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  component?: React.ElementType<any>;
  intent?: HzButtonIntent;
  layout?: 'default' | 'full';
  size?: Exclude<HzButtonSize, 'icon'>;
};

export const HzButtonLink = React.forwardRef<HTMLAnchorElement, HzButtonLinkProps>(
  ({ className, component: Component = 'a', intent = 'secondary', layout = 'default', size = 'sm', children, ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[3px] border font-semibold transition-colors aria-disabled:pointer-events-none aria-disabled:opacity-45',
        controlFocusClassName,
        buttonIntentClassName[intent],
        buttonSizeClassName[size],
        layout === 'full' ? 'w-full px-2' : null,
        className
      )}
      data-hz-ui="button-link"
      data-hz-control-height={buttonSizeHeight[size]}
      data-hz-control-edge={buttonIntentEdge[intent]}
      data-hz-button-tier={buttonIntentTier[intent]}
      data-hz-button-link-layout={layout}
      {...props}
    >
      {children}
    </Component>
  )
);

HzButtonLink.displayName = 'HzButtonLink';

export type HzPanelSurfaceProps = React.HTMLAttributes<HTMLElement> & {
  clip?: boolean;
  padding?: 'none' | 'query' | 'header' | 'chart' | 'chart-inner' | 'view-switch';
  selected?: boolean;
  stickiness?: 'none' | 'top-4';
  variant?: 'default' | 'chart-inner' | 'view-switch';
};

export const HzPanelSurface = React.forwardRef<HTMLElement, HzPanelSurfaceProps>(
  ({ className, clip = false, padding = 'none', selected = false, stickiness = 'none', variant = 'default', ...props }, ref) => (
    <section
      ref={ref}
      className={cn(
        'min-w-0 rounded-[4px] border bg-[#0d1015] shadow-[0_18px_60px_rgba(0,0,0,0.28)]',
        selected ? 'border-[var(--hz-ui-accent-muted)]' : 'border-[#252b35]',
        clip ? 'overflow-hidden' : null,
        variant === 'chart-inner' ? 'bg-[#10141b] shadow-none' : null,
        variant === 'view-switch' ? 'bg-[#0f131a] shadow-none' : null,
        stickiness === 'top-4' ? 'xl:sticky xl:top-4 xl:self-start' : null,
        padding === 'header' ? 'px-5 py-4' : null,
        padding === 'chart' ? 'px-4 py-4' : null,
        padding === 'chart-inner' ? 'px-3 py-3' : null,
        padding === 'query' ? 'px-4 py-3' : null,
        padding === 'view-switch' ? 'px-3 py-3' : null,
        className
      )}
      data-hz-ui="panel-surface"
      data-hz-panel-surface-owner="hertzbeat-ui-panel-surface"
      data-hz-panel-surface-density="operator-compact"
      data-hz-panel-surface-clip={clip ? 'true' : 'false'}
      data-hz-panel-surface-padding={padding}
      data-hz-panel-surface-selected={selected ? 'true' : 'false'}
      data-hz-panel-surface-stickiness={stickiness}
      data-hz-panel-surface-variant={variant}
      {...props}
    />
  )
);

HzPanelSurface.displayName = 'HzPanelSurface';

export type HzPanelSectionProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: 'summary';
  divider?: 'none' | 'top' | 'bottom';
  spacing?: 'none' | 'stack-2';
};

export const HzPanelSection = React.forwardRef<HTMLDivElement, HzPanelSectionProps>(
  ({ className, padding = 'summary', divider = 'bottom', spacing = 'none', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        divider === 'top' ? 'border-t border-[#252b35]' : null,
        divider === 'bottom' ? 'border-b border-[#252b35]' : null,
        padding === 'summary' ? 'px-4 py-3' : null,
        spacing === 'stack-2' ? 'space-y-2' : null,
        className
      )}
      data-hz-ui="panel-section"
      data-hz-panel-section-owner="hertzbeat-ui-panel-section"
      data-hz-panel-section-density="operator-compact"
      data-hz-panel-section-padding={padding}
      data-hz-panel-section-divider={divider}
      data-hz-panel-section-spacing={spacing}
      {...props}
    />
  )
);

HzPanelSection.displayName = 'HzPanelSection';

export type HzPanelHeaderProps = Omit<React.HTMLAttributes<HTMLElement>, 'title'> & {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  chrome?: 'default' | 'transparent' | 'transparent-topless' | 'transparent-framed';
};

export const HzPanelHeader = React.forwardRef<HTMLElement, HzPanelHeaderProps>(
  ({ eyebrow, title, subtitle, meta, actions, chrome = 'default', className, ...props }, ref) => (
    <header
      ref={ref}
      className={cn(
        'flex min-h-11 min-w-0 items-center justify-between gap-3 border-b border-[#252b35] px-4 py-2.5',
        chrome === 'transparent' ? 'bg-transparent' : null,
        chrome === 'transparent-topless' ? 'border-x-0 border-t-0 bg-transparent' : null,
        chrome === 'transparent-framed' ? 'border-x-0 border-b border-t border-[var(--hz-ui-line-soft)] bg-transparent' : null,
        className
      )}
      data-hz-ui="panel-header"
      data-hz-panel-header-owner="hertzbeat-ui-panel-header"
      data-hz-panel-header-density="operator-compact"
      data-hz-panel-header-chrome={chrome}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1 truncate text-[11px] font-semibold text-[#8792a5]" data-hz-panel-header-eyebrow="true">
            {eyebrow}
          </div>
        ) : null}
        <div
          className={cn(
            'flex min-w-0 items-center gap-2 font-semibold',
            eyebrow ? 'text-[14px] text-[#f0f4fa]' : 'text-[12px] text-[#8792a5]'
          )}
          data-hz-panel-header-title="true"
        >
          {title}
        </div>
        {subtitle ? <div className="mt-0.5 truncate text-[11px] text-[#5f6979]" data-hz-panel-header-subtitle="true">{subtitle}</div> : null}
      </div>
      {meta || actions ? (
        <div className="ml-auto flex shrink-0 items-center gap-2" data-hz-panel-header-actions="true">
          {meta}
          {actions}
        </div>
      ) : null}
    </header>
  )
);

HzPanelHeader.displayName = 'HzPanelHeader';

export type HzPanelTitleLabelProps = React.HTMLAttributes<HTMLSpanElement> & {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export const HzPanelTitleLabel = React.forwardRef<HTMLSpanElement, HzPanelTitleLabelProps>(
  ({ icon: Icon, children, className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('inline-flex min-w-0 items-center gap-2 text-[12px] font-semibold text-[#c6cfdd]', className)}
      data-hz-ui="panel-title-label"
      data-hz-panel-title-label-owner="hertzbeat-ui-panel-title-label"
      data-hz-panel-title-label-density="operator-compact"
      {...props}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" data-hz-panel-title-label-icon="true" /> : null}
      <span className="min-w-0 truncate" data-hz-panel-title-label-text="true">{children}</span>
    </span>
  )
);

HzPanelTitleLabel.displayName = 'HzPanelTitleLabel';

export type HzTrendFrameProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'compact-bars';
};

export const HzTrendFrame = React.forwardRef<HTMLDivElement, HzTrendFrameProps>(
  ({ className, variant = 'compact-bars', ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex h-16 items-end gap-1.5', className)}
      data-hz-ui="trend-frame"
      data-hz-trend-frame-owner="hertzbeat-ui-trend-frame"
      data-hz-trend-frame-density="operator-compact"
      data-hz-trend-frame-variant={variant}
      {...props}
    />
  )
);

HzTrendFrame.displayName = 'HzTrendFrame';

export type HzTrendBarProps = React.HTMLAttributes<HTMLSpanElement> & {
  heightPct: number;
};

export const HzTrendBar = React.forwardRef<HTMLSpanElement, HzTrendBarProps>(
  ({ className, heightPct, style, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('min-w-0 flex-1 rounded-t-[3px] border border-[#2f3b4d] bg-[#182232]', className)}
      style={{ ...style, height: `${heightPct}%` }}
      data-hz-ui="trend-bar"
      data-hz-trend-bar-owner="hertzbeat-ui-trend-bar"
      data-hz-trend-bar-density="operator-compact"
      data-hz-trend-bar-height-pct={String(heightPct)}
      {...props}
    />
  )
);

HzTrendBar.displayName = 'HzTrendBar';

export type HzIconButtonProps = Omit<HzButtonProps, 'size'> & {
  label: string;
};

export const HzIconButton = React.forwardRef<HTMLButtonElement, HzIconButtonProps>(
  ({ label, children, ...props }, ref) => (
    <HzButton ref={ref} size="icon" aria-label={label} title={label} {...props}>
      {children}
      <span className="sr-only">{label}</span>
    </HzButton>
  )
);

HzIconButton.displayName = 'HzIconButton';

export type HzHeaderIconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  state?: 'active' | 'inactive';
};

export const HzHeaderIconButton = React.forwardRef<HTMLButtonElement, HzHeaderIconButtonProps>(
  ({ label, state = 'inactive', children, className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-[2px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.35)] hover:text-[hsl(var(--foreground))]',
        controlFocusClassName,
        className
      )}
      aria-label={label}
      data-hz-ui="header-icon-button"
      data-hz-header-icon-button-owner="hertzbeat-ui-header-icon-button"
      data-hz-header-icon-button-density="angular-header-item"
      data-hz-header-icon-button-state={state}
      {...props}
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  )
);

HzHeaderIconButton.displayName = 'HzHeaderIconButton';

export type HzHeaderMenuActionProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: React.ReactNode;
  state?: 'active' | 'inactive';
};

export const HzHeaderMenuAction = React.forwardRef<HTMLButtonElement, HzHeaderMenuActionProps>(
  ({ label, state = 'inactive', children, className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'flex w-full items-center gap-2 rounded-[2px] px-2.5 py-2 text-left text-[12px] text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.5)]',
        controlFocusClassName,
        className
      )}
      data-hz-ui="header-menu-action"
      data-hz-header-menu-action-owner="hertzbeat-ui-header-menu-action"
      data-hz-header-menu-action-density="angular-header-menu-item"
      data-hz-header-menu-action-state={state}
      {...props}
    >
      {children}
      <span>{label}</span>
    </button>
  )
);

HzHeaderMenuAction.displayName = 'HzHeaderMenuAction';

export type HzLocaleMenuOptionProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  abbr: React.ReactNode;
  label: React.ReactNode;
  selected?: boolean;
  indicatorClassName?: string;
};

export const HzLocaleMenuOption = React.forwardRef<HTMLButtonElement, HzLocaleMenuOptionProps>(
  ({ abbr, label, selected = false, indicatorClassName, className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'flex w-full items-center gap-2 rounded-[2px] px-2.5 py-2 text-left text-[12px] text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.5)]',
        controlFocusClassName,
        className
      )}
      data-hz-ui="locale-menu-option"
      data-hz-locale-menu-option-owner="hertzbeat-ui-locale-menu-option"
      data-hz-locale-menu-option-density="angular-header-locale-item"
      data-hz-locale-menu-option-selected={selected ? 'true' : 'false'}
      aria-current={selected ? 'true' : undefined}
      {...props}
    >
      <span className="inline-flex min-w-5 items-center justify-center text-[14px] leading-none" data-hz-locale-menu-option-abbr="shared">
        {abbr}
      </span>
      <span className="flex-1">{label}</span>
      {selected ? (
        <span className={cn('text-[11px] text-[hsl(var(--muted-foreground))]', indicatorClassName)} data-hz-locale-menu-option-indicator="selected">
          ✓
        </span>
      ) : null}
    </button>
  )
);

HzLocaleMenuOption.displayName = 'HzLocaleMenuOption';

export type HzUserMenuActionProps = React.HTMLAttributes<HTMLElement> & {
  component?: React.ElementType<any>;
  href?: string;
  item: 'setting' | 'logout' | 'about';
  label: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
};

export const HzUserMenuAction = React.forwardRef<HTMLElement, HzUserMenuActionProps>(
  ({ component: Component = 'button', item, label, children, className, type = 'button', ...props }, ref) => {
    const typeProps = Component === 'button' ? { type } : {};

    return (
      <Component
        ref={ref}
        className={cn(
          'flex w-full items-center gap-2 rounded-[2px] px-2.5 py-2 text-left text-[12px] text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.5)]',
          controlFocusClassName,
          className
        )}
        data-hz-ui="user-menu-action"
        data-hz-user-menu-action-owner="hertzbeat-ui-user-menu-action"
        data-hz-user-menu-action-density="angular-user-menu-item"
        data-hz-user-menu-action-item={item}
        {...typeProps}
        {...props}
      >
        {children}
        <span>{label}</span>
      </Component>
    );
  }
);

HzUserMenuAction.displayName = 'HzUserMenuAction';

export type HzHeaderRealtimeNoticeProps = React.HTMLAttributes<HTMLDivElement> & {
  status: 'connecting' | 'live' | 'idle' | 'error' | 'unsupported';
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
};

export const HzHeaderRealtimeNotice = React.forwardRef<HTMLDivElement, HzHeaderRealtimeNoticeProps>(
  ({ status, title, description, meta, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[3px] border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.28)] px-3 py-2 text-left',
        className
      )}
      data-hz-ui="header-realtime-notice"
      data-hz-header-realtime-notice-owner="hertzbeat-ui-header-realtime-notice"
      data-hz-header-realtime-notice-density="angular-notice-sse"
      data-hz-header-realtime-notice-status={status}
      {...props}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            'mt-1 inline-flex h-2 w-2 shrink-0 rounded-full',
            status === 'live' ? 'bg-emerald-400' : status === 'error' ? 'bg-[hsl(var(--destructive))]' : 'bg-[hsl(var(--muted-foreground))]'
          )}
          data-hz-header-realtime-notice-indicator="shared"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold leading-4 text-[hsl(var(--foreground))]" data-hz-header-realtime-notice-title="shared">
            {title}
          </span>
          {description ? (
            <span className="mt-0.5 block truncate text-[11px] leading-4 text-[hsl(var(--muted-foreground))]" data-hz-header-realtime-notice-description="shared">
              {description}
            </span>
          ) : null}
          {meta ? (
            <span className="mt-1 block text-[10px] font-medium uppercase leading-3 tracking-[0.12em] text-[hsl(var(--muted-foreground))]" data-hz-header-realtime-notice-meta="shared">
              {meta}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  )
);

HzHeaderRealtimeNotice.displayName = 'HzHeaderRealtimeNotice';

export type HzAboutModalLink = {
  href: string;
  label: React.ReactNode;
};

export type HzAboutModalSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  open?: boolean;
  title: React.ReactNode;
  points: React.ReactNode[];
  help: React.ReactNode;
  version: React.ReactNode;
  releaseHref: string;
  copyright: React.ReactNode;
  notShowLabel: React.ReactNode;
  notShowChecked?: boolean;
  closeLabel: string;
  closable?: boolean;
  communityLinks: HzAboutModalLink[];
  onClose?: () => void;
  onNotShowChange?: (checked: boolean) => void;
};

export const HzAboutModalSurface = React.forwardRef<HTMLDivElement, HzAboutModalSurfaceProps>(
  (
    {
      className,
      open = true,
      title,
      points,
      help,
      version,
      releaseHref,
      copyright,
      notShowLabel,
      notShowChecked = false,
      closeLabel,
      closable = false,
      communityLinks,
      onClose,
      onNotShowChange,
      ...props
    },
    ref
  ) => {
    if (!open) return null;

    return (
      <div
        ref={ref}
        className={cn('fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 py-10', className)}
        role="dialog"
        aria-modal="true"
        data-hz-ui="about-modal-surface"
        data-hz-about-modal-owner="hertzbeat-ui-about-modal"
        data-hz-about-modal-density="angular-about-modal"
        data-hz-about-modal-open="true"
        data-hz-about-modal-closable={String(closable)}
        data-hz-about-modal-cancel="angular-on-cancel"
        onMouseDown={event => {
          if (event.target === event.currentTarget) {
            onClose?.();
          }
        }}
        {...props}
      >
        <div className="w-full max-w-[720px] rounded-[4px] border border-[var(--hz-ui-line-soft)] bg-[#10141b] px-6 py-5 text-center shadow-[0_20px_60px_rgba(0,0,0,.34)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1" data-hz-about-modal-brand="apache-hertzbeat">
              <div className="text-[18px] font-bold text-[#f4f7fb]">Apache HertzBeat™</div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7f8ca3]">observability platform</div>
            </div>
            {closable ? (
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-[2px] text-[#8792a5] transition hover:bg-[#1a202c] hover:text-[#f4f7fb]"
                aria-label={closeLabel}
                onClick={onClose}
                data-hz-about-modal-close="shared"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <div className="mt-4 text-[13px] font-bold text-[#e7edf7]" data-hz-about-modal-title="shared">
            {title}
          </div>
          <div className="mt-3 space-y-1.5 text-left text-[12px] leading-5 text-[#c6cfdd]" data-hz-about-modal-points="shared">
            {points.map((point, index) => (
              <div key={index} className="flex items-start gap-2" data-hz-about-modal-point={String(index + 1)}>
                <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-[var(--hz-ui-accent)]" aria-hidden="true" />
                <span>{point}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-[12px] text-[#aab5c6]" data-hz-about-modal-help="shared">
            {help}
          </div>
          <a
            href={releaseHref}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex text-[14px] font-bold text-[var(--hz-ui-accent)] hover:underline"
            data-hz-about-modal-release="shared"
          >
            Apache HertzBeat™ {version}
          </a>
          <div className="mt-3 text-[12px] text-[#8792a5]" data-hz-about-modal-copyright="shared">
            {copyright}
          </div>
          <label className="mt-4 inline-flex items-center gap-2 text-[13px] text-[#8792a5]" data-hz-about-modal-not-show="shared">
            <input
              type="checkbox"
              className="h-4 w-4 rounded-[2px] border border-[var(--hz-ui-line-soft)] bg-[#0d1015]"
              checked={notShowChecked}
              onChange={event => onNotShowChange?.(event.currentTarget.checked)}
            />
            <span>{notShowLabel}</span>
          </label>
          <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-2 border-t border-[var(--hz-ui-line-soft)] pt-4 text-[12px] font-bold">
            {communityLinks.map(link => (
              <a
                key={`${link.href}-${link.label}`}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-[#c6cfdd] hover:text-[var(--hz-ui-accent)]"
                data-hz-about-modal-community-link="shared"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

HzAboutModalSurface.displayName = 'HzAboutModalSurface';

export type HzPassportLoginNoticeProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  copy: React.ReactNode;
  href: string;
  tone?: 'warning';
};

export const HzPassportLoginNotice = React.forwardRef<HTMLAnchorElement, HzPassportLoginNoticeProps>(
  ({ copy, href, tone = 'warning', className, target = '_blank', rel = 'noreferrer', ...props }, ref) => (
    <a
      ref={ref}
      className={cn(
        'flex items-start gap-3 rounded-[6px] border border-[rgba(216,111,91,0.28)] bg-[var(--ops-surface-elevated)] px-4 py-3 text-sm text-[var(--ops-text-secondary)] transition-colors hover:border-[var(--ops-primary)] hover:text-[var(--ops-text-primary)]',
        className
      )}
      href={href}
      target={target}
      rel={rel}
      data-hz-ui="passport-login-notice"
      data-hz-passport-login-notice-owner="hertzbeat-ui-passport-login-notice"
      data-hz-passport-login-notice-density="angular-warning-alert"
      data-hz-passport-login-notice-tone={tone}
      data-hz-passport-login-notice-link="account-modify"
      {...props}
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--ops-primary)]" aria-hidden="true" />
      <span data-hz-passport-login-notice-copy="shared">{copy}</span>
      <ExternalLink size={13} className="mt-0.5 shrink-0 text-[var(--ops-primary)]" aria-hidden="true" data-hz-passport-login-notice-external="shared" />
    </a>
  )
);

HzPassportLoginNotice.displayName = 'HzPassportLoginNotice';

export type HzPassportLoginValidationNoticeProps = React.HTMLAttributes<HTMLDivElement> & {
  copy: React.ReactNode;
  title?: React.ReactNode;
  tone?: 'danger';
};

export const HzPassportLoginValidationNotice = React.forwardRef<HTMLDivElement, HzPassportLoginValidationNoticeProps>(
  ({ copy, title, tone = 'danger', className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-start gap-3 rounded-[6px] border border-[rgba(216,91,91,0.34)] bg-[rgba(216,91,91,0.08)] px-4 py-3 text-sm text-[var(--ops-text-primary)]',
        className
      )}
      role="alert"
      data-hz-ui="passport-login-validation-notice"
      data-hz-passport-login-validation-owner="hertzbeat-ui-passport-login-validation"
      data-hz-passport-login-validation-density="angular-error-alert"
      data-hz-passport-login-validation-tone={tone}
      {...props}
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[rgb(216,91,91)]" aria-hidden="true" />
      <span className="min-w-0">
        {title ? (
          <span className="mr-1 font-semibold text-white" data-hz-passport-login-validation-title="shared">
            {title}
          </span>
        ) : null}
        {title ? ' ' : null}
        <span data-hz-passport-login-validation-copy="shared">{copy}</span>
      </span>
    </div>
  )
);

HzPassportLoginValidationNotice.displayName = 'HzPassportLoginValidationNotice';

export type HzPassportLoginActionFrameProps = React.HTMLAttributes<HTMLDivElement>;

export const HzPassportLoginActionFrame = React.forwardRef<HTMLDivElement, HzPassportLoginActionFrameProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('min-w-0', className)}
      data-hz-ui="passport-login-action-frame"
      data-hz-passport-login-action-owner="hertzbeat-ui-passport-login-action"
      data-hz-passport-login-submit-lifecycle="angular-required-default-warning-session-bootstrap-redirect"
      data-hz-passport-login-required-fields="identifier-credential"
      data-hz-passport-login-required-mode="angular-required-no-trim"
      data-hz-passport-login-default-password="angular-first-submit-warning"
      data-hz-passport-login-default-password-lifecycle="angular-sticky-until-submit"
      data-hz-passport-login-token-boundary="bff-cookie-no-localstorage"
      data-hz-passport-login-session-bootstrap="angular-startup-load-after-success"
      data-hz-passport-login-session-user-name="angular-raw-identifier"
      data-hz-passport-login-startup-failure="angular-exception-500"
      data-hz-passport-login-redirect="angular-referrer-non-passport-fallback"
      data-hz-passport-login-redirect-fallback="angular-root-fallback"
      data-hz-passport-login-remember-default="true"
      {...props}
    >
      {children}
    </div>
  )
);

HzPassportLoginActionFrame.displayName = 'HzPassportLoginActionFrame';

export type HzPassportSessionClearLifecycle = 'clear-on-entry' | 'preserve-on-lock';

export type HzPassportSessionClearFrameProps = React.HTMLAttributes<HTMLDivElement> & {
  lifecycle?: HzPassportSessionClearLifecycle;
};

export const HzPassportSessionClearFrame = React.forwardRef<HTMLDivElement, HzPassportSessionClearFrameProps>(
  ({ className, children, lifecycle = 'clear-on-entry', ...props }, ref) => {
    const preservesLockSession = lifecycle === 'preserve-on-lock';

    return (
      <div
        ref={ref}
        className={className}
        data-hz-ui="passport-session-clear-frame"
        data-hz-passport-session-clear-owner="hertzbeat-ui-passport-session-clear"
        data-hz-passport-session-clear-lifecycle={preservesLockSession ? 'angular-lock-preserve-session' : 'angular-token-service-clear-on-passport-entry'}
        data-hz-passport-session-clear-scope={preservesLockSession ? 'client-marker-user-snapshot-preserved' : 'client-marker-user-snapshot'}
        data-hz-passport-session-clear-boundary={preservesLockSession ? 'no-session-clear-on-lock' : 'no-api-logout-on-entry'}
        {...props}
      >
        {children}
      </div>
    );
  }
);

HzPassportSessionClearFrame.displayName = 'HzPassportSessionClearFrame';

export type HzPassportLockSurfaceProps = React.FormHTMLAttributes<HTMLFormElement> & {
  title: React.ReactNode;
  passwordLabel: string;
  passwordPlaceholder: string;
  buttonLabel: React.ReactNode;
  password: string;
  avatarSrc?: string | null;
  avatarAlt?: string;
  error?: React.ReactNode;
  disabled?: boolean;
  onPasswordChange?: (value: string) => void;
};

export const HzPassportLockSurface = React.forwardRef<HTMLFormElement, HzPassportLockSurfaceProps>(
  ({ title, passwordLabel, passwordPlaceholder, buttonLabel, password, avatarSrc, avatarAlt = 'User avatar', error, disabled, onPasswordChange, className, onSubmit, ...props }, ref) => (
    <form
      ref={ref}
      onSubmit={onSubmit}
      className={cn('relative mx-auto mt-20 min-h-[220px] max-w-[320px] rounded-[4px] border border-[hsl(var(--border))] bg-[#101217] px-6 pb-8 pt-14 shadow-none', className)}
      role="form"
      data-hz-ui="passport-lock-surface"
      data-hz-passport-lock-owner="hertzbeat-ui-passport-lock"
      data-hz-passport-lock-density="angular-lock-card"
      data-hz-passport-lock-submit-lifecycle="angular-mark-dirty-required-then-dashboard"
      data-hz-passport-lock-required-fields="password"
      data-hz-passport-lock-required-mode="angular-required-no-trim"
      data-hz-passport-lock-redirect="angular-dashboard-next-overview"
      data-hz-passport-lock-submit-disabled="angular-invalid-disabled"
      {...props}
    >
      <div
        className="absolute left-1/2 top-0 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/75 text-[#101217] shadow-none"
        data-hz-passport-lock-avatar="angular-floating"
        data-hz-passport-lock-avatar-source={avatarSrc ? 'settings-user-avatar' : 'fallback-user-icon'}
      >
        {avatarSrc ? (
          React.createElement('img', {
            src: avatarSrc,
            alt: avatarAlt,
            className: 'h-full w-full rounded-full object-cover',
            'data-hz-passport-lock-avatar-img': 'settings-user-avatar'
          })
        ) : (
          <UserRound size={28} aria-hidden="true" />
        )}
      </div>
      <div className="text-center text-[16px] font-semibold text-[hsl(var(--foreground))]" data-hz-passport-lock-title="shared">
        {title}
      </div>
      <label className="mt-6 block" data-hz-passport-lock-password-field="shared">
        <span className="sr-only">{passwordLabel}</span>
        <span className="relative block">
          <LockKeyhole
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
            aria-hidden="true"
          />
          <input
            type="password"
            value={password}
            onChange={event => onPasswordChange?.(event.currentTarget.value)}
            placeholder={passwordPlaceholder}
            className="h-9 w-full rounded-[3px] border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-10 pr-3 text-[13px] text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[var(--hz-ui-accent)]"
            data-hz-passport-lock-password-input="shared"
          />
        </span>
      </label>
      {error ? (
        <div className="mt-3 rounded-[3px] border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2 text-[12px] text-[hsl(var(--destructive))]" data-hz-passport-lock-error="shared">
          {error}
        </div>
      ) : null}
      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex h-8 min-w-[76px] items-center justify-center rounded-[3px] bg-[var(--hz-ui-accent)] px-3 text-[12px] font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-45"
          data-hz-passport-lock-submit="shared"
          data-hz-passport-lock-submit-state={disabled ? 'disabled' : 'ready'}
        >
          {buttonLabel}
        </button>
      </div>
    </form>
  )
);

HzPassportLockSurface.displayName = 'HzPassportLockSurface';

export type HzActionGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  density?: 'compact-icons' | 'inline';
  layout?: 'center' | 'default' | 'end-wrap' | 'full-end' | 'grid-2' | 'inline-wrap' | 'split' | 'stack' | 'start';
};

export const HzActionGroup = React.forwardRef<HTMLDivElement, HzActionGroupProps>(
  ({ className, density = 'inline', layout = 'default', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'inline-flex min-w-0 items-center',
        density === 'compact-icons' ? 'flex-nowrap gap-1.5' : 'flex-wrap gap-2',
        layout === 'end-wrap' ? 'ml-auto justify-end' : null,
        layout === 'full-end' ? 'w-full justify-end' : null,
        layout === 'grid-2' ? 'grid w-full grid-cols-2 gap-2' : null,
        layout === 'center' ? 'justify-center' : null,
        layout === 'inline-wrap' ? 'w-full flex-wrap' : null,
        layout === 'split' ? 'w-full justify-between' : null,
        layout === 'stack' ? 'flex-col items-start' : null,
        layout === 'start' ? 'justify-start' : null,
        className
      )}
      data-hz-ui="action-group"
      data-hz-action-group-owner="hertzbeat-ui-action-group"
      data-hz-action-group-density={density}
      data-hz-action-group-layout={layout}
      {...props}
    >
      {children}
    </div>
  )
);

HzActionGroup.displayName = 'HzActionGroup';

export type HzQueryActionGroupProps = HzActionGroupProps & {
  kind?: 'run-reset';
};

export const HzQueryActionGroup = React.forwardRef<HTMLDivElement, HzQueryActionGroupProps>(
  ({ kind = 'run-reset', children, ...props }, ref) => (
    <HzActionGroup
      ref={ref}
      data-hz-query-action-group-owner="hertzbeat-ui-query-action-group"
      data-hz-query-action-group-kind={kind}
      {...props}
    >
      {children}
    </HzActionGroup>
  )
);

HzQueryActionGroup.displayName = 'HzQueryActionGroup';

export type HzChipGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: 'start' | 'end';
  boundary?: 'none' | 'top';
  density?: 'inline' | 'compact';
  spacing?: 'none' | 'top-3';
};

const chipGroupSpacingClassName = {
  none: null,
  'top-3': 'mt-3'
} as const;

export const HzChipGroup = React.forwardRef<HTMLDivElement, HzChipGroupProps>(
  ({ align = 'start', boundary = 'none', className, density = 'inline', spacing = 'none', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex min-w-0 flex-wrap items-center',
        density === 'compact' ? 'gap-1.5' : 'gap-2',
        align === 'end' ? 'justify-end' : null,
        boundary === 'top' ? 'border-x-0 border-y-0 border-t border-[var(--hz-ui-line-soft)] p-2' : null,
        chipGroupSpacingClassName[spacing],
        className
      )}
      data-hz-ui="chip-group"
      data-hz-chip-group-owner="hertzbeat-ui-toolbar-chips"
      data-hz-chip-group-align={align}
      data-hz-chip-group-density={density}
      data-hz-chip-group-boundary={boundary}
      data-hz-chip-group-spacing={spacing}
      {...props}
    >
      {children}
    </div>
  )
);

HzChipGroup.displayName = 'HzChipGroup';

export type HzDialogBodyLayoutProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'stack' | 'split-detail' | 'waterfall-detail' | 'side-stack';
};

const dialogBodyLayoutVariantClassName: Record<NonNullable<HzDialogBodyLayoutProps['variant']>, string> = {
  stack: 'gap-4',
  'side-stack': 'gap-3',
  'split-detail': 'gap-4 xl:grid-cols-[minmax(0,1fr)_300px]',
  'waterfall-detail': 'gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]'
};

export const HzDialogBodyLayout = React.forwardRef<HTMLDivElement, HzDialogBodyLayoutProps>(
  ({ className, variant = 'stack', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('grid min-w-0', dialogBodyLayoutVariantClassName[variant], className)}
      data-hz-ui="dialog-body-layout"
      data-hz-dialog-body-layout-owner="hertzbeat-ui-dialog-body-layout"
      data-hz-dialog-body-layout-variant={variant}
      {...props}
    >
      {children}
    </div>
  )
);

HzDialogBodyLayout.displayName = 'HzDialogBodyLayout';

export type HzWorkbenchLayoutProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType<any>;
  variant?: 'stack' | 'table-detail' | 'header-actions' | 'header-toolbar-slot' | 'time-toolbar' | 'summary-trend' | 'detail-stack' | 'detail-footer' | 'view-switch' | 'stream-stage' | 'chart-stack' | 'metrics-chart-toolbar' | 'metrics-header' | 'metrics-series-only' | 'metrics-series-detail';
};

const workbenchLayoutVariantClassName: Record<NonNullable<HzWorkbenchLayoutProps['variant']>, string> = {
  'chart-stack': 'items-start gap-3',
  'detail-footer': 'gap-2 border-t border-[#252b35] px-4 py-4',
  'detail-stack': 'gap-3 px-4 py-4',
  'header-actions': 'gap-4 2xl:grid-cols-[minmax(280px,1fr)_auto] 2xl:items-start',
  'header-toolbar-slot': 'justify-end xl:justify-self-end',
  'metrics-chart-toolbar': 'mb-3 gap-2 text-[12px] text-[#8792a5] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center',
  'metrics-header': 'gap-3 2xl:grid-cols-[minmax(280px,1fr)_minmax(780px,auto)] 2xl:items-start',
  'metrics-series-detail': 'items-start gap-4 xl:grid-cols-[minmax(0,1fr)_440px]',
  'metrics-series-only': 'items-start gap-4',
  'summary-trend': 'gap-3 lg:grid-cols-[repeat(4,minmax(0,160px))_minmax(0,1fr)]',
  stack: 'gap-4',
  'stream-stage': 'min-h-[520px] lg:grid-cols-[minmax(0,1fr)_320px]',
  'table-detail': 'gap-4 2xl:grid-cols-[minmax(0,1fr)_330px]',
  'time-toolbar': 'ml-auto w-full max-w-[1120px] justify-end gap-2 xl:w-auto',
  'view-switch': 'gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'
};

export const HzWorkbenchLayout = React.forwardRef<HTMLElement, HzWorkbenchLayoutProps>(
  ({ as: Component = 'section', className, variant = 'stack', children, ...props }, ref) => (
    <Component
      ref={ref}
      className={cn('grid min-w-0', workbenchLayoutVariantClassName[variant], className)}
      data-hz-ui="workbench-layout"
      data-hz-workbench-layout-owner="hertzbeat-ui-workbench-layout"
      data-hz-workbench-layout-variant={variant}
      {...props}
    >
      {children}
    </Component>
  )
);

HzWorkbenchLayout.displayName = 'HzWorkbenchLayout';

export type HzControlStackProps = React.HTMLAttributes<HTMLDivElement> & {
  layout?: 'stack' | 'inline-wrap' | 'end-inline';
  spacing?: 'none' | 'top-2';
};

const controlStackSpacingClassName = {
  none: null,
  'top-2': 'mt-2'
} as const;

export function HzControlStack({ className, children, layout = 'stack', spacing = 'none', ...props }: HzControlStackProps) {
  return (
    <div
      className={cn(
        layout === 'inline-wrap'
          ? 'flex min-w-0 flex-wrap items-center gap-2'
          : layout === 'end-inline'
            ? 'flex max-w-full justify-end'
            : 'grid min-w-0 gap-2',
        controlStackSpacingClassName[spacing],
        className
      )}
      data-hz-ui="control-stack"
      data-hz-control-stack-owner="hertzbeat-ui-control-stack"
      data-hz-control-stack-layout={layout}
      data-hz-control-stack-spacing={spacing}
      {...props}
    >
      {children}
    </div>
  );
}

export type HzMonitorFullscreenFrameProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> & {
  title: React.ReactNode;
  kicker?: React.ReactNode;
  closeLabel: React.ReactNode;
  onClose: () => void;
  panelClassName?: string;
  bodyClassName?: string;
  closeButtonProps?: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>;
};

export const HzMonitorFullscreenFrame = React.forwardRef<HTMLDivElement, HzMonitorFullscreenFrameProps>(
  ({ title, kicker, closeLabel, onClose, children, className, panelClassName, bodyClassName, closeButtonProps, ...props }, ref) => {
    const titleLabel = stringifyNode(title, 'Monitor fullscreen');

    return (
      <div
        {...props}
        className={cn('fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,7,10,0.88)] p-4', className)}
        role={props.role ?? 'dialog'}
        aria-modal={props['aria-modal'] ?? true}
        aria-label={props['aria-label'] ?? titleLabel}
        data-hz-ui="monitor-fullscreen-frame"
      >
        <div
          ref={ref}
          tabIndex={-1}
          className={cn(
            'hb-scrollbar max-h-[92vh] w-full max-w-6xl overflow-auto rounded-[3px] border border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-surface)] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.45)] outline-none',
            panelClassName
          )}
          data-hz-monitor-fullscreen-panel="true"
        >
          <header
            className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-[var(--hz-ui-line-soft)] pb-3"
            data-hz-monitor-fullscreen-header="true"
          >
            <div className="min-w-0">
              {kicker ? (
                <div className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">
                  {kicker}
                </div>
              ) : null}
              <div className={cn('truncate text-[14px] font-semibold leading-5 text-[#f5f7fb]', kicker ? 'mt-1' : null)}>
                {title}
              </div>
            </div>
            <HzButton
              size="sm"
              intent="ghost"
              onClick={onClose}
              data-hz-monitor-fullscreen-close="true"
              {...closeButtonProps}
            >
              {closeLabel}
            </HzButton>
          </header>
          <div className={cn('pt-3', bodyClassName)} data-hz-monitor-fullscreen-body="true">
            {children}
          </div>
        </div>
      </div>
    );
  }
);

HzMonitorFullscreenFrame.displayName = 'HzMonitorFullscreenFrame';

export type HzMonitorMetricFavoriteActionProps = Omit<HzIconButtonProps, 'label' | 'children'> & {
  active?: boolean;
  label: string;
};

export const HzMonitorMetricFavoriteAction = React.forwardRef<HTMLButtonElement, HzMonitorMetricFavoriteActionProps>(
  ({ active = false, label, className, type = 'button', ...props }, ref) => (
    <HzIconButton
      ref={ref}
      type={type}
      label={label}
      intent="ghost"
      aria-pressed={active}
      data-hz-ui="monitor-metric-favorite-action"
      data-hz-monitor-favorite-active={active ? 'true' : 'false'}
      className={cn(
        'border-transparent text-[#7e8494] hover:border-[var(--hz-ui-line-strong)] hover:text-[#f3f6fb]',
        active ? 'text-[#f2c66d] hover:text-[#f7d987]' : null,
        className
      )}
      {...props}
    >
      <Star size={14} fill={active ? 'currentColor' : 'none'} />
    </HzIconButton>
  )
);

HzMonitorMetricFavoriteAction.displayName = 'HzMonitorMetricFavoriteAction';

export type HzUnderlineToggleProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  selectionAttrName?: string;
};

export const HzUnderlineToggle = React.forwardRef<HTMLButtonElement, HzUnderlineToggleProps>(
  ({ className, selected = false, selectionAttrName = 'data-selected', type = 'button', children, ...props }, ref) => {
    const selectedAttribute = selectionAttrName ? { [selectionAttrName]: selected ? 'true' : 'false' } : {};

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'relative inline-flex h-7 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap border-0 bg-transparent px-0.5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45',
          controlFocusClassName,
          selected
            ? 'text-[#f5f7fb] after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-[var(--hz-ui-accent)]'
            : 'text-[#98a2b3] hover:text-white',
          className
        )}
        data-hz-ui="underline-toggle"
        data-hz-control-height="28"
        data-hz-control-edge="bottom-underline"
        data-hz-underline-toggle-owner="hertzbeat-ui-underline-toggle"
        {...selectedAttribute}
        {...props}
      >
        {children}
      </button>
    );
  }
);

HzUnderlineToggle.displayName = 'HzUnderlineToggle';

export type HzInlineContextMarkProps = React.HTMLAttributes<HTMLElement> & {
  component?: React.ElementType<any>;
  href?: string;
  active?: boolean;
  placement?: 'inline' | 'breadcrumb';
};

export const HzInlineContextMark = React.forwardRef<HTMLElement, HzInlineContextMarkProps>(
  ({ className, component: Component = 'span', active = true, placement = 'inline', children, ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(
        'relative inline-flex h-7 max-w-[220px] min-w-0 items-center truncate border-0 bg-transparent px-0.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hz-ui-active-soft)]',
        active
          ? 'text-[#f5f7fb] after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-[var(--hz-ui-accent)]'
          : 'text-[#98a2b3] hover:text-white',
        placement === 'breadcrumb' ? 'ml-1' : null,
        className
      )}
      data-hz-ui="inline-context-mark"
      data-hz-control-height="28"
      data-hz-control-edge="bottom-underline"
      data-hz-inline-context-mark-owner="hertzbeat-ui-inline-context-mark"
      data-hz-inline-context-mark-active={active ? 'true' : 'false'}
      data-hz-inline-context-mark-placement={placement}
      {...props}
    >
      {children}
    </Component>
  )
);

HzInlineContextMark.displayName = 'HzInlineContextMark';

export type HzDialogMetaItemProps = HzInlineContextMarkProps & {
  width?: 'default' | 'trace-id' | 'span-count' | 'duration' | 'service';
};

const dialogMetaItemWidthClassName: Record<NonNullable<HzDialogMetaItemProps['width']>, string> = {
  default: 'max-w-[220px]',
  duration: 'max-w-[160px]',
  service: 'max-w-[260px]',
  'span-count': 'max-w-[180px]',
  'trace-id': 'max-w-[320px] font-mono'
};

export const HzDialogMetaItem = React.forwardRef<HTMLElement, HzDialogMetaItemProps>(
  ({ className, width = 'default', active = false, children, ...props }, ref) => (
    <HzInlineContextMark
      ref={ref}
      active={active}
      className={cn('h-6 text-[11px]', dialogMetaItemWidthClassName[width], className)}
      data-hz-dialog-meta-item-owner="hertzbeat-ui-dialog-meta-item"
      data-hz-dialog-meta-item-width={width}
      {...props}
    >
      {children}
    </HzInlineContextMark>
  )
);

HzDialogMetaItem.displayName = 'HzDialogMetaItem';

export type HzMonitorBreadcrumbProps = React.HTMLAttributes<HTMLElement> & {
  component?: React.ElementType<any>;
};

export const HzMonitorBreadcrumb = React.forwardRef<HTMLElement, HzMonitorBreadcrumbProps>(
  ({ className, component: Component = 'nav', children, ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-2 border-b border-[var(--hz-ui-line-soft)] pb-2 text-[11px] text-[#727b8c]',
        '[&_a]:transition-colors [&_a]:text-[#98a2b3] [&_a:hover]:text-white',
        '[&_span]:text-[#727b8c]',
        className
      )}
      data-hz-ui="monitor-breadcrumb"
      data-hz-monitor-breadcrumb-owner="hertzbeat-ui-monitor-breadcrumb"
      data-hz-monitor-breadcrumb-rhythm="flat-bottom-line"
      {...props}
    >
      {children}
    </Component>
  )
);

HzMonitorBreadcrumb.displayName = 'HzMonitorBreadcrumb';

export function HzMonitorDetailConsoleShell({
  children,
  className,
  ...props
}: {
  children?: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        '-mx-4 space-y-2 px-3 pb-3 pt-0 text-[var(--ops-text-primary)] sm:-mx-6 sm:px-3',
        className
      )}
      data-hz-ui="monitor-detail-console-shell"
      data-monitor-detail-console-shell-owner="hertzbeat-ui-detail-console-shell"
    >
      {children}
    </div>
  );
}

export function HzMonitorDetailWorkbenchFrame({
  tabs,
  children,
  className,
  tabsetClassName,
  tabsetProps,
  ...props
}: {
  tabs: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  tabsetClassName?: string;
  tabsetProps?: React.HTMLAttributes<HTMLDivElement>;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...props}
      className={cn('overflow-visible bg-transparent', className)}
      data-hz-ui="monitor-detail-workbench-frame"
      data-monitor-workbench-stage-owner="hertzbeat-ui-detail-workbench-frame"
      data-monitor-workbench-stage="angular-layout"
      data-monitor-workbench-stage-chrome="angular-tabset-direct"
      data-monitor-workbench-stage-rhythm="direct-tab-body"
    >
      <div
        {...tabsetProps}
        className={cn('pb-2', tabsetClassName, tabsetProps?.className)}
        data-monitor-detail-tabset-type="bottom-underline-switch"
        data-monitor-detail-tabset-owner="hertzbeat-ui-detail-workbench-frame"
      >
        {tabs}
      </div>
      {children}
    </section>
  );
}

export type HzMonitorDetailTabLabelProps = React.HTMLAttributes<HTMLSpanElement> & {
  tabKey: string;
  icon?: React.ElementType<{ className?: string; 'aria-hidden'?: boolean }>;
};

export function HzMonitorDetailTabLabel({
  tabKey,
  icon: Icon,
  children,
  className,
  ...props
}: HzMonitorDetailTabLabelProps) {
  return (
    <span
      {...props}
      className={cn('inline-flex items-center gap-2', className)}
      data-hz-ui="monitor-detail-tab-label"
      data-monitor-detail-tab-label-source="angular-title"
      data-monitor-detail-tab-label={tabKey}
      data-monitor-detail-tab-label-owner="hertzbeat-ui-detail-tab-label"
    >
      {Icon ? (
        <span
          className="inline-flex h-3.5 w-3.5 items-center justify-center"
          data-monitor-detail-tab-icon={tabKey}
          data-monitor-detail-tab-icon-owner="hertzbeat-ui-detail-tab-label"
        >
          <Icon aria-hidden={true} className="h-3.5 w-3.5" />
        </span>
      ) : null}
      <span>{children}</span>
    </span>
  );
}

export type HzIconLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  component?: React.ElementType<any>;
  intent?: HzButtonIntent;
  label: string;
};

export const HzIconLink = React.forwardRef<HTMLAnchorElement, HzIconLinkProps>(
  ({ className, component: Component = 'a', intent = 'ghost', label, children, ...props }, ref) => (
    <Component
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[3px] border font-semibold transition-colors focus-visible:border-[var(--hz-ui-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hz-ui-active-soft)]',
        buttonIntentClassName[intent],
        buttonSizeClassName.icon,
        className
      )}
      data-hz-ui="icon-link"
      data-hz-control-height="28"
      data-hz-control-edge="lined"
      {...props}
    >
      {children}
      <span className="sr-only">{label}</span>
    </Component>
  )
);

HzIconLink.displayName = 'HzIconLink';

const statusBadgeLayoutClassName = {
  default: '',
  'metric-fact': 'h-6 min-w-0 max-w-[180px] gap-1 px-2',
  'zoom-draft': 'h-7 max-w-[340px] gap-1.5 overflow-hidden px-2',
  'context-pill': 'max-w-[220px] gap-2'
} as const;

const statusBadgePartClassName = {
  label: {
    default: '',
    'metric-fact': 'truncate text-[10px] font-semibold text-[#7f8a9d]',
    'zoom-draft': 'shrink-0 text-[#7f8a9d]',
    'context-pill': 'shrink-0 font-semibold text-[#7f8a9d]'
  },
  value: {
    default: '',
    'metric-fact': 'truncate text-[11px] font-semibold text-[#cfd8e6]',
    'zoom-draft': 'min-w-0 truncate',
    'context-pill': 'truncate font-semibold text-[#dbe5f3]'
  }
} as const;

export function HzStatusBadge({
  tone = 'neutral',
  size = 'sm',
  layout = 'default',
  label,
  value,
  valueFont = 'default',
  children,
  className,
  ...props
}: {
  tone?: HzStatusTone;
  size?: keyof typeof statusBadgeSizeClassName;
  layout?: keyof typeof statusBadgeLayoutClassName;
  label?: React.ReactNode;
  value?: React.ReactNode;
  valueFont?: 'default' | 'mono';
  children?: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const hasStructuredContent = label !== undefined || value !== undefined;

  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-[3px] border font-semibold',
        statusBadgeSizeClassName[size],
        statusBadgeLayoutClassName[layout],
        toneClassName[tone],
        className
      )}
      data-hz-ui="status-badge"
      data-hz-status-tone={tone}
      data-hz-status-size={size}
      data-hz-status-badge-layout={layout}
    >
      {hasStructuredContent ? (
        <>
          {label !== undefined ? (
            <span className={statusBadgePartClassName.label[layout]} data-hz-status-badge-part="label">
              {label}
            </span>
          ) : null}
          {value !== undefined ? (
            <span
              className={cn(statusBadgePartClassName.value[layout], valueFont === 'mono' ? 'font-mono' : undefined)}
              data-hz-status-badge-part="value"
            >
              {value}
            </span>
          ) : null}
        </>
      ) : (
        children
      )}
    </span>
  );
}

export type HzLabelColorToken =
  | 'blue'
  | 'green'
  | 'orange'
  | 'purple'
  | 'cyan'
  | 'yellow'
  | 'pink'
  | 'lime'
  | 'red'
  | 'geekblue'
  | 'volcano'
  | 'magenta';

const labelTagColorStyle: Record<HzLabelColorToken, React.CSSProperties> = {
  blue: { backgroundColor: 'rgba(22,119,255,0.14)', borderColor: 'rgba(22,119,255,0.42)', color: '#91caff' },
  green: { backgroundColor: 'rgba(82,196,26,0.14)', borderColor: 'rgba(82,196,26,0.42)', color: '#b7eb8f' },
  orange: { backgroundColor: 'rgba(250,140,22,0.15)', borderColor: 'rgba(250,140,22,0.44)', color: '#ffd591' },
  purple: { backgroundColor: 'rgba(114,46,209,0.16)', borderColor: 'rgba(114,46,209,0.44)', color: '#d3adf7' },
  cyan: { backgroundColor: 'rgba(19,194,194,0.14)', borderColor: 'rgba(19,194,194,0.42)', color: '#87e8de' },
  yellow: { backgroundColor: 'rgba(250,219,20,0.14)', borderColor: 'rgba(250,219,20,0.42)', color: '#fff1b8' },
  pink: { backgroundColor: 'rgba(235,47,150,0.14)', borderColor: 'rgba(235,47,150,0.42)', color: '#ffadd2' },
  lime: { backgroundColor: 'rgba(160,217,17,0.14)', borderColor: 'rgba(160,217,17,0.42)', color: '#eaff8f' },
  red: { backgroundColor: 'rgba(245,34,45,0.14)', borderColor: 'rgba(245,34,45,0.42)', color: '#ffa39e' },
  geekblue: { backgroundColor: 'rgba(47,84,235,0.16)', borderColor: 'rgba(47,84,235,0.44)', color: '#adc6ff' },
  volcano: { backgroundColor: 'rgba(250,84,28,0.15)', borderColor: 'rgba(250,84,28,0.44)', color: '#ffbb96' },
  magenta: { backgroundColor: 'rgba(235,47,150,0.14)', borderColor: 'rgba(235,47,150,0.42)', color: '#ffadd2' }
};

export type HzLabelTagProps = React.HTMLAttributes<HTMLSpanElement> & {
  colorToken?: HzLabelColorToken;
};

export function HzLabelTag({ colorToken = 'blue', className, style, children, ...props }: HzLabelTagProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex max-w-full items-center rounded-[3px] border px-2 py-0.5 text-[12px] font-semibold leading-5',
        className
      )}
      style={{ ...labelTagColorStyle[colorToken], ...style }}
      data-hz-ui="label-tag"
      data-hz-label-tag-owner="hertzbeat-ui-label-tag"
      data-hz-label-color-token={colorToken}
    >
      {children}
    </span>
  );
}

export type HzAttributeDiagnosticRow = {
  key: string;
  label: React.ReactNode;
  value: React.ReactNode;
  meta?: React.ReactNode;
  state: string;
  stateLabel: React.ReactNode;
  tone?: HzStatusTone;
  rowProps?: React.HTMLAttributes<HTMLDivElement> | (React.HTMLAttributes<HTMLDivElement> & HzDataAttributeProps);
  badgeProps?: React.HTMLAttributes<HTMLSpanElement> | (React.HTMLAttributes<HTMLSpanElement> & HzDataAttributeProps);
};

export type HzAttributeDiagnosticsProps = React.HTMLAttributes<HTMLDivElement> & {
  title: React.ReactNode;
  namespaceLabel?: React.ReactNode;
  rows: HzAttributeDiagnosticRow[];
  emptyFallback?: React.ReactNode;
  frame?: 'default' | 'embedded';
};

export function HzAttributeDiagnostics({
  title,
  namespaceLabel,
  rows,
  emptyFallback = null,
  className,
  frame = 'default',
  ...props
}: HzAttributeDiagnosticsProps) {
  if (rows.length === 0) return <>{emptyFallback}</>;

  return (
    <div
      {...props}
      className={cn(
        'rounded-[4px] border border-[#252b35] bg-[#10141b] px-3 py-3',
        frame === 'embedded' ? 'rounded-none border-0 bg-transparent' : null,
        className
      )}
      data-hz-ui="attribute-diagnostics"
      data-hz-attribute-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"
      data-hz-attribute-diagnostics-frame={frame}
      data-hz-attribute-diagnostics-count={rows.length}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[11px] font-semibold text-[#8792a5]">{title}</p>
        {namespaceLabel ? (
          <span className="shrink-0 text-[11px] font-semibold text-[#6d7788]">{namespaceLabel}</span>
        ) : null}
      </div>
      <div className="space-y-2">
        {rows.map(row => (
          <div
            key={row.key}
            {...row.rowProps}
            data-hz-attribute-diagnostic-row="true"
            data-hz-attribute-diagnostic-state={row.state}
            className={cn('grid grid-cols-[minmax(0,1fr)_52px] gap-2 text-[11px]', row.rowProps?.className)}
          >
            <span className="min-w-0">
              <span className="block truncate font-mono font-semibold text-[#e6edf7]">{row.label}</span>
              <span className="block truncate text-[#6d7788]">
                {row.value}
                {row.meta != null && row.meta !== '' ? <> · {row.meta}</> : null}
              </span>
            </span>
            <HzStatusBadge
              {...row.badgeProps}
              tone={row.tone || 'neutral'}
              size="xs"
              data-hz-attribute-diagnostic-badge="true"
              className={cn('justify-center', row.badgeProps?.className)}
            >
              {row.stateLabel}
            </HzStatusBadge>
          </div>
        ))}
      </div>
    </div>
  );
}

export type HzInputInset = 'none' | 'search-icon';
export type HzInputWidth = 'default' | 'metrics-query-expression' | 'metrics-filter-expression' | 'metrics-query-step' | 'metrics-query-limit' | 'metrics-inventory-search' | 'log-query-expression' | 'log-query-token' | 'log-query-body' | 'log-query-filter' | 'metrics-context' | 'metrics-context-compact' | 'metrics-trace-id';

export type HzInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  inset?: HzInputInset;
  width?: HzInputWidth;
};

const hzInputInsetClassName: Record<HzInputInset, string | null> = {
  none: null,
  'search-icon': 'pl-9'
};

const hzInputWidthClassName: Record<HzInputWidth, string | null> = {
  default: null,
  'metrics-query-expression': 'w-full font-mono',
  'metrics-filter-expression': 'w-full font-mono',
  'metrics-query-step': 'w-[116px] font-mono',
  'metrics-query-limit': 'w-[104px] font-mono',
  'metrics-inventory-search': 'w-full',
  'log-query-expression': 'w-full font-mono',
  'log-query-token': 'w-[220px] font-mono',
  'log-query-body': 'min-w-[280px] max-w-[520px] flex-1',
  'log-query-filter': 'min-w-[220px] max-w-[420px] flex-1 font-mono',
  'metrics-context': 'w-[220px]',
  'metrics-context-compact': 'w-[160px]',
  'metrics-trace-id': 'min-w-[220px] max-w-[360px] flex-1 font-mono'
};

export const HzInput = React.forwardRef<HTMLInputElement, HzInputProps>(({ className, inset = 'none', width = 'default', ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-8 w-full min-w-0 rounded-[3px] border border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-control)] px-3 text-[12px] font-semibold text-[#eef2f7] outline-none placeholder:text-[#6f7788]',
      'shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition-colors',
      controlFocusClassName,
      hzInputInsetClassName[inset],
      hzInputWidthClassName[width],
      className
    )}
    data-hz-ui="input"
    data-hz-input-inset={inset}
    data-hz-input-width={width}
    data-hz-control-height="32"
    data-hz-control-edge="lined"
    {...props}
  />
));

HzInput.displayName = 'HzInput';

export type HzQueryTokenFieldWidth = 'trace-id' | 'span-id' | 'root-span' | 'compact';

const queryTokenFieldWidthClassName: Record<HzQueryTokenFieldWidth, string> = {
  'trace-id': 'w-[240px]',
  'span-id': 'w-[220px]',
  'root-span': 'w-[240px]',
  compact: 'w-[180px]'
};

export type HzQueryTokenFieldProps = Omit<HzInputProps, 'width'> & {
  width?: HzQueryTokenFieldWidth;
  fieldClassName?: string;
  fieldProps?: React.HTMLAttributes<HTMLDivElement> & HzDataAttributeProps;
};

export const HzQueryTokenField = React.forwardRef<HTMLInputElement, HzQueryTokenFieldProps>(
  ({ className, fieldClassName, fieldProps, width = 'trace-id', ...props }, ref) => {
    const { className: fieldPropsClassName, ...restFieldProps } = fieldProps || {};

    return (
      <div
        className={cn('min-w-0', queryTokenFieldWidthClassName[width], fieldPropsClassName, fieldClassName)}
        data-hz-ui="query-token-field"
        data-hz-query-token-field-owner="hertzbeat-ui-query-token-field"
        data-hz-query-token-field-width={width}
        {...restFieldProps}
      >
        <HzInput
          ref={ref}
          className={cn('w-full font-mono', className)}
          data-hz-query-token-input="true"
          data-hz-query-token-input-owner="hertzbeat-ui-query-token-field"
          {...props}
        />
      </div>
    );
  }
);

HzQueryTokenField.displayName = 'HzQueryTokenField';

export type HzTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  height?: 'default' | 'tall';
  resize?: 'none' | 'vertical';
  maxCharacterCount?: number;
};

export const HzTextarea = React.forwardRef<HTMLTextAreaElement, HzTextareaProps>(
  ({ className, height = 'default', resize = 'none', maxCharacterCount, value, defaultValue, ...props }, ref) => {
    const currentLength = String(value ?? defaultValue ?? '').length;
    const textarea = (
      <textarea
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        className={cn(
          'min-h-[96px] w-full min-w-0 rounded-[3px] border border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-control)] px-3 py-2 text-[12px] font-semibold leading-5 text-[#eef2f7] outline-none placeholder:text-[#6f7788]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition-colors',
          height === 'tall' ? 'min-h-[120px]' : null,
          resize === 'none' ? 'resize-none' : 'resize-y',
          controlFocusClassName,
          className
        )}
        data-hz-ui="textarea"
        data-hz-textarea-height={height}
        data-hz-textarea-count-input={maxCharacterCount ? 'true' : undefined}
        data-hz-control-height="multiline"
        data-hz-control-edge="lined"
        {...props}
      />
    );

    if (!maxCharacterCount) {
      return textarea;
    }

    return (
      <div
        className="grid gap-1.5"
        data-hz-ui="textarea-count"
        data-hz-textarea-count-owner="hertzbeat-ui-textarea"
        data-hz-textarea-count-max={maxCharacterCount}
      >
        {textarea}
        <div
          className="text-right font-mono text-[10px] font-semibold text-[#778195]"
          data-hz-textarea-count-value={`${currentLength}/${maxCharacterCount}`}
        >
          {currentLength}/{maxCharacterCount}
        </div>
      </div>
    );
  }
);

HzTextarea.displayName = 'HzTextarea';

export type HzCodeEditorFrameProps = {
  title?: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'title'>;

export function HzCodeEditorFrame({
  title,
  meta,
  children,
  className,
  bodyClassName,
  ...props
}: HzCodeEditorFrameProps) {
  return (
    <div
      {...props}
      className={cn('grid min-w-0 overflow-hidden bg-transparent', className)}
      data-hz-ui="code-editor-frame"
    >
      {title || meta ? (
        <div className="grid min-h-8 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border border-b-0 border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-control)] px-2.5">
          {title ? (
            <span className="min-w-0 truncate text-[11px] font-semibold text-[#dbe4f0]" data-hz-code-editor-title="true">
              {title}
            </span>
          ) : (
            <span />
          )}
          {meta ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]" data-hz-code-editor-meta="true">
              {meta}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className={cn('min-w-0 overflow-hidden', bodyClassName)} data-hz-code-editor-body="true">
        {children}
      </div>
    </div>
  );
}

export type HzCodeEditorLanguage = 'yaml' | 'json' | 'html' | 'javascript' | 'shell' | 'text';
export type HzCodeEditorTheme = 'vs' | 'vs-dark';

export type HzCodeEditorProps = Omit<HzCodeEditorFrameProps, 'children' | 'onChange'> & {
  value: string;
  onChange?: (value: string) => void;
  language?: HzCodeEditorLanguage;
  theme?: HzCodeEditorTheme;
  loading?: boolean;
  loadingLabel?: React.ReactNode;
  folding?: boolean;
  automaticLayout?: boolean;
  readOnly?: boolean;
  height?: string;
  minHeight?: string;
  placeholder?: string;
  name?: string;
  ariaLabel?: string;
  editorClassName?: string;
  editorStyle?: React.CSSProperties;
};

const hzCodeEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: '#101217',
    color: '#dbe4f0',
    border: '1px solid #2b3039',
    borderRadius: '3px',
    fontSize: '12px',
    minHeight: 'inherit'
  },
  '&.cm-focused': {
    borderColor: '#4e74f8',
    outline: '2px solid rgba(78,116,248,0.12)'
  },
  '.cm-scroller': {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    lineHeight: '1.6',
    minHeight: 'inherit'
  },
  '.cm-content': {
    padding: '8px 0',
    caretColor: '#f8fafc',
    minHeight: 'inherit'
  },
  '.cm-line': {
    padding: '0 12px'
  },
  '.cm-gutters': {
    backgroundColor: '#0b0c0e',
    borderRight: '1px solid #252b34',
    color: '#6f7787'
  },
  '.cm-activeLine': {
    backgroundColor: '#151b28'
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#151b28',
    color: '#dbe4f0'
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(78,116,248,0.34)'
  },
  '.cm-placeholder': {
    color: '#858d9a'
  }
}, {
  dark: true
});

function getHzCodeEditorLanguageExtension(language: HzCodeEditorLanguage): Extension | null {
  switch (language) {
    case 'yaml':
      return yaml();
    case 'json':
      return json();
    case 'html':
      return html();
    case 'javascript':
      return javascript();
    case 'shell':
    case 'text':
    default:
      return null;
  }
}

export function HzCodeEditor({
  value,
  onChange,
  language = 'text',
  theme = 'vs-dark',
  loading = false,
  loadingLabel = 'Loading editor',
  folding = true,
  automaticLayout = true,
  readOnly = false,
  height,
  minHeight = '220px',
  placeholder,
  name,
  ariaLabel,
  className,
  bodyClassName,
  editorClassName,
  editorStyle,
  ...props
}: HzCodeEditorProps) {
  const extensions = React.useMemo(() => {
    const languageExtension = getHzCodeEditorLanguageExtension(language);
    return [
      basicSetup,
      ...(theme === 'vs-dark' ? [hzCodeEditorTheme] : []),
      EditorView.lineWrapping,
      ...(languageExtension ? [languageExtension] : []),
      ...(readOnly || loading ? [EditorState.readOnly.of(true)] : [])
    ];
  }, [language, loading, readOnly, theme]);

  return (
    <HzCodeEditorFrame {...props} className={className} bodyClassName={bodyClassName}>
      <div
        className={cn('min-w-0 overflow-hidden rounded-[3px]', editorClassName)}
        style={{ minHeight, ...editorStyle }}
        data-hz-code-editor-runtime="codemirror"
        data-hz-code-editor-language={language}
        data-hz-code-editor-theme={theme}
        data-hz-code-editor-loading={loading ? 'true' : 'false'}
        data-hz-code-editor-loading-owner="hz-code-editor"
        data-hz-code-editor-folding={folding ? 'true' : 'false'}
        data-hz-code-editor-automatic-layout={automaticLayout ? 'true' : 'false'}
        data-hz-code-editor-readonly={readOnly || loading ? 'true' : undefined}
        data-hz-code-editor-license="codemirror-mit"
      >
        {loading ? (
          <div
            className="border border-b-0 border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-control)] px-3 py-2 text-[11px] font-semibold text-[#a9b4c4]"
            aria-busy="true"
            data-hz-code-editor-loading-state="angular-nz-code-editor-loading"
            data-hz-code-editor-loading-state-owner="hz-code-editor"
          >
            {loadingLabel}
          </div>
        ) : null}
        {name ? (
          <input
            type="hidden"
            readOnly
            name={name}
            value={value}
            data-hz-code-editor-value="hidden"
            data-hz-hidden-input-control="native-form-value"
          />
        ) : null}
        <CodeMirror
          value={value}
          height={height}
          minHeight={minHeight}
          placeholder={placeholder}
          basicSetup={false}
          theme={theme === 'vs-dark' ? oneDark : 'light'}
          extensions={extensions}
          readOnly={readOnly || loading}
          editable={!readOnly && !loading}
          aria-label={ariaLabel}
          onChange={nextValue => onChange?.(nextValue)}
        />
      </div>
    </HzCodeEditorFrame>
  );
}

export type HzCheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  containerClassName?: string;
  label?: React.ReactNode;
};

export const HzCheckbox = React.forwardRef<HTMLInputElement, HzCheckboxProps>(
  ({ className, containerClassName, label, disabled, ...props }, ref) => (
    <label
      className={cn(
        'inline-flex min-h-8 items-center gap-2 text-[12px] font-semibold text-[#a9b0bb]',
        disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
        containerClassName
      )}
      data-hz-ui="checkbox"
      data-hz-checkbox-click-target="label-shell"
      data-hz-control-height="32"
      data-hz-control-edge="lined"
    >
      <input
        ref={ref}
        type="checkbox"
        disabled={disabled}
        className={cn('peer sr-only', className)}
        data-hz-checkbox-control="native-hidden"
        {...props}
      />
      <span
        className={cn(
          'inline-flex h-4 w-4 shrink-0 items-center justify-center border border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-control)] text-transparent transition-colors',
          'peer-checked:border-[var(--hz-ui-accent-muted)] peer-checked:bg-[rgba(111,139,255,0.16)] peer-checked:text-[#dbe6ff]',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--hz-ui-accent)]'
        )}
        data-hz-checkbox-box="indicator"
        data-hz-control-edge="lined"
        aria-hidden="true"
      >
        <Check size={12} strokeWidth={2.4} />
      </span>
      {label ? <span data-hz-checkbox-label="true">{label}</span> : null}
    </label>
  )
);

HzCheckbox.displayName = 'HzCheckbox';

export type HzSwitchProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  checked: boolean;
  label?: React.ReactNode;
  onCheckedChange?: (checked: boolean) => void;
};

export const HzSwitch = React.forwardRef<HTMLButtonElement, HzSwitchProps>(
  ({ checked, label, disabled, className, onClick, onCheckedChange, ...props }, ref) => (
    <span
      className={cn(
        'inline-flex min-h-8 items-center gap-2 text-[12px] font-semibold text-[#a9b0bb]',
        disabled ? 'cursor-not-allowed opacity-55' : null
      )}
      data-hz-ui="switch"
      data-hz-switch-owner="hertzbeat-ui-switch"
      data-hz-switch-checked={checked ? 'true' : 'false'}
      data-hz-control-height="32"
    >
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-[3px] border transition',
          checked ? 'border-[var(--hz-ui-accent-muted)] bg-[rgba(111,139,255,0.16)]' : 'border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-control)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hz-ui-accent)]',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          className
        )}
        data-hz-switch-control="button"
        data-hz-control-edge="lined"
        onClick={event => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            onCheckedChange?.(!checked);
          }
        }}
        {...props}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 rounded-[2px] bg-[#dbe4f0] shadow transition-transform',
            checked ? 'translate-x-[23px]' : 'translate-x-[3px]'
          )}
          data-hz-switch-thumb="indicator"
          aria-hidden="true"
        />
      </button>
      {label ? <span data-hz-switch-label="true">{label}</span> : null}
    </span>
  )
);

HzSwitch.displayName = 'HzSwitch';

export type HzRadioButtonOption = {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
};

export type HzRadioButtonGroupProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  name: string;
  value: string;
  options: HzRadioButtonOption[];
  onChange?: (value: string) => void;
};

export function HzRadioButtonGroup({
  name,
  value,
  options,
  onChange,
  className,
  ...props
}: HzRadioButtonGroupProps) {
  return (
    <div
      {...props}
      className={cn('flex min-w-0 flex-wrap items-center gap-1.5', className)}
      data-hz-ui="radio-button-group"
      data-hz-radio-button-group-owner="hertzbeat-ui-radio-button-group"
      data-hz-radio-button-group-density="operator-compact"
    >
      {options.map(option => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[3px] border px-2.5 text-[12px] font-semibold transition-colors',
              checked
                ? 'border-[var(--hz-ui-accent-muted)] bg-[rgba(111,139,255,0.16)] text-[#eef2ff]'
                : 'border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-control)] text-[#a9b0bb] hover:border-[var(--hz-ui-accent-muted)] hover:text-[#f5f7fb]'
            )}
            data-hz-radio-button-option={option.value}
            data-hz-radio-button-checked={checked ? 'true' : 'false'}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={event => {
                if (event.currentTarget.checked) onChange?.(option.value);
              }}
              className="peer sr-only"
              data-hz-radio-button-control="native-hidden"
            />
            <span data-hz-radio-button-label="true">{option.label}</span>
            {option.icon ? <span className="inline-flex h-3.5 w-3.5 items-center justify-center" data-hz-radio-button-icon="true">{option.icon}</span> : null}
          </label>
        );
      })}
    </div>
  );
}

export type HzFileInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'children' | 'type' | 'value'>;

export const HzFileInput = React.forwardRef<HTMLInputElement, HzFileInputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="file"
    className={cn('hidden', className)}
    data-hz-ui="file-input"
    data-hz-file-input-control="native-hidden-file"
    {...props}
  />
));

HzFileInput.displayName = 'HzFileInput';

function toHzNumberStepperNumber(value: string | number | undefined, fallback: number) {
  if (value === undefined || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toHzNumberStepperOptionalNumber(value: string | number | undefined) {
  if (value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatHzNumberStepperValue(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}

export interface HzNumberStepperProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
  containerClassName?: string;
  decrementLabel?: string;
  incrementLabel?: string;
  actionDataAttributeName?: string;
}

export const HzNumberStepper = React.forwardRef<HTMLInputElement, HzNumberStepperProps>(
  (
    {
      className,
      containerClassName,
      disabled,
      min,
      max,
      step = 1,
      value,
      onValueChange,
      decrementLabel = 'Decrease',
      incrementLabel = 'Increase',
      actionDataAttributeName,
      ...props
    },
    ref
  ) => {
    const numericStep = Math.max(toHzNumberStepperNumber(step, 1), 1);
    const minValue = toHzNumberStepperOptionalNumber(min);
    const maxValue = toHzNumberStepperOptionalNumber(max);

    function clamp(nextValue: number) {
      if (minValue !== undefined && nextValue < minValue) return minValue;
      if (maxValue !== undefined && nextValue > maxValue) return maxValue;
      return nextValue;
    }

    function shift(direction: 1 | -1) {
      if (disabled) return;
      const fallback = minValue ?? 0;
      const currentValue = toHzNumberStepperNumber(value, fallback);
      onValueChange(formatHzNumberStepperValue(clamp(currentValue + numericStep * direction)));
    }

    return (
      <span
        className={cn(
          'flex h-8 w-full min-w-0 overflow-hidden border border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-control)] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]',
          'focus-within:border-[var(--hz-ui-accent-muted)] focus-within:ring-2 focus-within:ring-[rgba(111,139,255,0.12)]',
          disabled ? 'opacity-55' : '',
          containerClassName
        )}
        data-hz-ui="number-stepper"
        data-hz-control-height="32"
        data-hz-control-edge="lined"
      >
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={value}
          className={cn(
            'min-w-0 flex-1 border-0 bg-transparent px-3 py-1.5 text-[12px] font-semibold text-[#dbe4f0] outline-none placeholder:text-[#6f7788]',
            className
          )}
          onChange={event => onValueChange(event.target.value)}
          data-hz-number-stepper-input="true"
          {...props}
        />
        <span className="flex shrink-0 border-l border-[var(--hz-ui-line-soft)]" data-hz-number-stepper-actions="true">
          <button
            type="button"
            disabled={disabled}
            className="grid h-full w-8 place-items-center text-[#8f99ab] transition-colors hover:bg-[var(--hz-ui-surface-soft)] hover:text-[#f5f7fb] disabled:pointer-events-none"
            onClick={() => shift(-1)}
            data-hz-number-stepper-action="decrement"
            {...(actionDataAttributeName ? { [actionDataAttributeName]: 'decrement' } : {})}
          >
            <Minus size={14} aria-hidden="true" />
            <span className="sr-only">{decrementLabel}</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            className="grid h-full w-8 place-items-center border-l border-[var(--hz-ui-line-soft)] text-[#8f99ab] transition-colors hover:bg-[var(--hz-ui-surface-soft)] hover:text-[#f5f7fb] disabled:pointer-events-none"
            onClick={() => shift(1)}
            data-hz-number-stepper-action="increment"
            {...(actionDataAttributeName ? { [actionDataAttributeName]: 'increment' } : {})}
          >
            <Plus size={14} aria-hidden="true" />
            <span className="sr-only">{incrementLabel}</span>
          </button>
        </span>
      </span>
    );
  }
);

HzNumberStepper.displayName = 'HzNumberStepper';

export type HzKeyValueRow = {
  key: string;
  value: string;
};

export type HzConfigurableFieldRow = Record<string, string>;

export type HzConfigurableFieldColumn = {
  key: string;
  placeholder?: string;
  inputProps?: Omit<HzInputProps, 'value' | 'onChange' | 'placeholder'> & HzDataAttributeProps;
  className?: string;
};

export type HzKeyValueEditorProps = {
  title?: React.ReactNode;
  rows: HzKeyValueRow[];
  onChange?: (rows: HzKeyValueRow[]) => void;
  addLabel: React.ReactNode;
  removeLabel: React.ReactNode;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  rowClassName?: string;
  keyInputProps?: Omit<HzInputProps, 'value' | 'onChange' | 'placeholder'> & HzDataAttributeProps;
  valueInputProps?: Omit<HzInputProps, 'value' | 'onChange' | 'placeholder'> & HzDataAttributeProps;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onChange' | 'title'>;

function ensureHzKeyValueRows(rows: HzKeyValueRow[]) {
  return rows.length > 0 ? rows : [{ key: '', value: '' }];
}

function updateHzKeyValueRow(rows: HzKeyValueRow[], index: number, patch: Partial<HzKeyValueRow>) {
  return rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row));
}

function removeHzKeyValueRow(rows: HzKeyValueRow[], index: number) {
  return rows.length === 1 ? [{ key: '', value: '' }] : rows.filter((_, rowIndex) => rowIndex !== index);
}

export function HzKeyValueEditor({
  title,
  rows,
  onChange,
  addLabel,
  removeLabel,
  keyPlaceholder,
  valuePlaceholder,
  className,
  rowClassName,
  keyInputProps,
  valueInputProps,
  ...props
}: HzKeyValueEditorProps) {
  const nextRows = ensureHzKeyValueRows(rows);

  return (
    <div {...props} className={cn('grid gap-3', className)} data-hz-ui="key-value-editor">
      {title ? <div className="text-[10px] uppercase tracking-[0.14em] text-[#727b8c]">{title}</div> : null}
      <div className="grid gap-2" data-hz-key-value-rows="true">
        {nextRows.map((row, index) => (
          <div
            key={`${index}-${row.key}`}
            className={cn('grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]', rowClassName)}
            data-hz-key-value-row={index}
          >
            <HzInput
              {...keyInputProps}
              value={row.key}
              placeholder={keyPlaceholder}
              onChange={event => onChange?.(updateHzKeyValueRow(nextRows, index, { key: event.target.value }))}
              data-hz-key-value-input="key"
            />
            <HzInput
              {...valueInputProps}
              value={row.value}
              placeholder={valuePlaceholder}
              onChange={event => onChange?.(updateHzKeyValueRow(nextRows, index, { value: event.target.value }))}
              data-hz-key-value-input="value"
            />
            <HzButton
              type="button"
              size="sm"
              intent="ghost"
              onClick={() => onChange?.(removeHzKeyValueRow(nextRows, index))}
              data-hz-key-value-action="remove"
              data-hz-key-value-action-visibility="inline"
            >
              {removeLabel}
            </HzButton>
          </div>
        ))}
      </div>
      <div
        className="border-t border-[var(--hz-ui-line-faint)] pt-2"
        data-hz-key-value-footer="action-row"
      >
        <HzButton
          type="button"
          size="sm"
          intent="secondary"
          className="w-full justify-start border-[var(--hz-ui-accent-muted)] text-[#dbe4f0]"
          onClick={() => onChange?.([...nextRows, { key: '', value: '' }])}
          data-hz-key-value-action="add"
          data-hz-key-value-action-visibility="emphasized"
          data-hz-key-value-action-layout="footer-command"
        >
          {addLabel}
        </HzButton>
      </div>
    </div>
  );
}

export type HzConfigurableFieldEditorProps = {
  rows: HzConfigurableFieldRow[];
  columns: HzConfigurableFieldColumn[];
  onChange?: (rows: HzConfigurableFieldRow[]) => void;
  addLabel: React.ReactNode;
  removeLabel: React.ReactNode;
  rowClassName?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onChange'>;

function ensureHzConfigurableFieldRows(rows: HzConfigurableFieldRow[]) {
  return rows.length > 0 ? rows : [{}];
}

function updateHzConfigurableFieldRow(
  rows: HzConfigurableFieldRow[],
  index: number,
  key: string,
  value: string
) {
  return rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row));
}

function removeHzConfigurableFieldRow(rows: HzConfigurableFieldRow[], index: number) {
  return rows.length === 1 ? [{}] : rows.filter((_, rowIndex) => rowIndex !== index);
}

export function HzConfigurableFieldEditor({
  rows,
  columns,
  onChange,
  addLabel,
  removeLabel,
  className,
  rowClassName,
  ...props
}: HzConfigurableFieldEditorProps) {
  const nextRows = ensureHzConfigurableFieldRows(rows);
  const columnTrack = `minmax(0,1fr) ${columns.slice(1).map(column => column.className ?? 'minmax(0,1fr)').join(' ')} auto`;

  return (
    <div {...props} className={cn('grid gap-3', className)} data-hz-ui="configurable-field-editor">
      <div className="grid gap-2" data-hz-configurable-field-rows="true">
        {nextRows.map((row, index) => (
          <div
            key={`${index}-${columns.map(column => row[column.key] ?? '').join('|')}`}
            className={cn('grid gap-2 md:grid-cols-[var(--hz-configurable-field-columns)]', rowClassName)}
            style={{ '--hz-configurable-field-columns': columnTrack } as React.CSSProperties}
            data-hz-configurable-field-row={index}
          >
            {columns.map(column => (
              <HzInput
                key={column.key}
                {...column.inputProps}
                value={row[column.key] ?? ''}
                placeholder={column.placeholder}
                onChange={event => onChange?.(updateHzConfigurableFieldRow(nextRows, index, column.key, event.target.value))}
                data-hz-configurable-field-input={column.key}
              />
            ))}
            <HzButton
              type="button"
              size="sm"
              intent="ghost"
              onClick={() => onChange?.(removeHzConfigurableFieldRow(nextRows, index))}
              data-hz-configurable-field-action="remove"
              data-hz-configurable-field-action-visibility="inline"
            >
              {removeLabel}
            </HzButton>
          </div>
        ))}
      </div>
      <div
        className="border-t border-[var(--hz-ui-line-faint)] pt-2"
        data-hz-configurable-field-footer="action-row"
      >
        <HzButton
          type="button"
          size="sm"
          intent="secondary"
          className="w-full justify-start border-[var(--hz-ui-accent-muted)] text-[#dbe4f0]"
          onClick={() => onChange?.([...nextRows, {}])}
          data-hz-configurable-field-action="add"
          data-hz-configurable-field-action-visibility="emphasized"
          data-hz-configurable-field-action-layout="footer-command"
        >
          {addLabel}
        </HzButton>
      </div>
    </div>
  );
}

export type HzSelectOption = {
  value: string;
  label: string;
};

export type HzSelectSize = 'default' | 'sm';
export type HzSelectWidth = 'default' | 'metrics-aggregation' | 'metrics-temporal-aggregation' | 'metrics-group-by' | 'metrics-inventory-sort' | 'log-severity' | 'trace-span-scope';
export type HzSelectTriggerTone = 'default' | 'signal-query';

export type HzSelectProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onChange' | 'defaultValue'> & {
  [key: `data-${string}`]: string | number | boolean | undefined;
  options: HzSelectOption[];
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  name?: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  placeholder?: string;
  size?: HzSelectSize;
  triggerClassName?: string;
  triggerTone?: HzSelectTriggerTone;
  width?: HzSelectWidth;
  optionDataAttributes?: (option: HzSelectOption) => Record<string, string | undefined>;
};

const hzSelectWidthClassName: Record<HzSelectWidth, string | null> = {
  default: null,
  'metrics-aggregation': 'w-[124px]',
  'metrics-temporal-aggregation': 'w-[156px]',
  'metrics-group-by': 'w-[132px]',
  'metrics-inventory-sort': 'w-[152px]',
  'log-severity': 'w-[132px]',
  'trace-span-scope': 'w-[152px]'
};

const hzSelectTriggerToneClassName: Record<HzSelectTriggerTone, string | null> = {
  default: null,
  'signal-query': 'text-[#d5dce8]'
};

const hzSelectSizeClassName: Record<HzSelectSize, string | null> = {
  default: null,
  sm: 'h-7 text-[11px]'
};

export const HzSelect = React.forwardRef<HTMLDivElement, HzSelectProps>(
  (
    {
      className,
      options,
      value,
      defaultValue,
      disabled,
      name,
      onChange,
      placeholder,
      size = 'default',
      triggerClassName,
      triggerTone = 'default',
      width = 'default',
      optionDataAttributes,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const resolvedValue = String(value ?? defaultValue ?? options[0]?.value ?? '');
    const handleChange = (nextValue: string) => {
      if (disabled) return;
      onChange?.({
        currentTarget: { name, value: nextValue },
        target: { name, value: nextValue }
      } as unknown as React.ChangeEvent<HTMLSelectElement>);
    };

    return (
      <div
        ref={ref}
        className={cn('min-w-0', hzSelectWidthClassName[width], className)}
        data-hz-ui="select"
        data-hz-select-size={size}
        data-hz-select-width={width}
        data-hz-select-trigger-tone={triggerTone}
        {...props}
      >
        {name ? <input type="hidden" name={name} value={resolvedValue} readOnly /> : null}
        <HzSelectMenu
          className="w-full"
          disabled={disabled}
          label={ariaLabel}
          options={options}
          placeholder={placeholder}
          value={resolvedValue}
          triggerClassName={cn(hzSelectSizeClassName[size], hzSelectTriggerToneClassName[triggerTone], triggerClassName)}
          optionDataAttributes={optionDataAttributes}
          onChange={handleChange}
        />
      </div>
    );
  }
);

HzSelect.displayName = 'HzSelect';

export type HzQueryStatusSelectWidth = 'status' | 'compact';

const queryStatusSelectWidthClassName: Record<HzQueryStatusSelectWidth, string> = {
  status: 'w-[120px]',
  compact: 'w-[132px]'
};

export type HzQueryStatusSelectProps = Omit<HzSelectProps, 'width'> & {
  width?: HzQueryStatusSelectWidth;
};

export const HzQueryStatusSelect = React.forwardRef<HTMLDivElement, HzQueryStatusSelectProps>(
  ({ className, triggerClassName, width = 'status', ...props }, ref) => (
    <HzSelect
      ref={ref}
      className={cn(queryStatusSelectWidthClassName[width], className)}
      triggerClassName={cn('h-8 min-w-0 text-[#d5dce8]', triggerClassName)}
      data-hz-query-status-select-owner="hertzbeat-ui-query-status-select"
      data-hz-query-status-select-width={width}
      {...props}
    />
  )
);

HzQueryStatusSelect.displayName = 'HzQueryStatusSelect';

export type HzTimeRangeToolbarValue = {
  timeRange?: string;
  from?: string;
  to?: string;
  start?: string;
  end?: string;
  refresh?: string;
  live?: string;
  tz?: string;
  timezone?: string;
};

export type HzTimeRangeRecentRange = {
  id: string;
  label: string;
  timeRange?: string;
  from?: string;
  to?: string;
  start?: string;
  end?: string;
  refresh?: string;
  live?: string;
  tz?: string;
  timezone?: string;
};

export type HzTimeRangeCustomRange = HzTimeRangeRecentRange;

export type HzTimeRangeToolbarLabels = Partial<{
  preset: string;
  start: string;
  end: string;
  from: string;
  to: string;
  absoluteTitle: string;
  quickRanges: string;
  relativeTitle: string;
  recentRanges: string;
  customRange: string;
  customName: string;
  saveCustomRange: string;
  deleteCustomRange: string;
  validationValid: string;
  validationInvalid: string;
  year: string;
  month: string;
  weekdays: string[];
  months: string[];
  date: string;
  hour: string;
  minute: string;
  second: string;
  previousMonth: string;
  nextMonth: string;
  previousYears: string;
  nextYears: string;
  decrease: string;
  increase: string;
  clear: string;
  absolutePlaceholder: string;
  refresh: string;
  timezone: string;
  apply: string;
  applyAria: string;
  refreshAction: string;
  reset: string;
  resetAria: string;
}>;

export type HzTimeRangeToolbarProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  value: HzTimeRangeToolbarValue;
  presets?: HzSelectOption[];
  refreshOptions?: HzSelectOption[];
  timezoneOptions?: HzSelectOption[];
  labels?: HzTimeRangeToolbarLabels;
  recentRanges?: HzTimeRangeRecentRange[];
  recentStorageKey?: string;
  maxRecentRanges?: number;
  customRanges?: HzTimeRangeCustomRange[];
  customStorageKey?: string;
  maxCustomRanges?: number;
  onApply?: (value: HzTimeRangeToolbarValue) => void;
  onRefresh?: () => void;
  onReset?: () => void;
  showAbsoluteFields?: boolean;
  absoluteFieldsLayout?: 'stack' | 'inline';
  absoluteInputMode?: 'text' | 'datetime-local';
  timeRangePickerMode?: 'split' | 'single';
  railLayout?: 'wrap' | 'nowrap';
  previewSource?: string;
  timePickerDefaultOpen?: boolean;
  presetSelectProps?: Omit<HzSelectProps, 'defaultValue' | 'onChange' | 'options' | 'value'>;
  presetOptionDataAttribute?: string;
  refreshActionProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
};

const DEFAULT_HZ_TIME_RANGE_PRESETS: HzSelectOption[] = [
  { value: 'last-15m', label: 'Last 15 minutes' },
  { value: 'last-1h', label: 'Last 1 hour' },
  { value: 'last-6h', label: 'Last 6 hours' },
  { value: 'last-24h', label: 'Last 24 hours' }
];

const DEFAULT_HZ_TIME_REFRESH_OPTIONS: HzSelectOption[] = [
  { value: '', label: 'Manual' },
  { value: '10', label: '10s' },
  { value: '30', label: '30s' },
  { value: '60', label: '1m' },
  { value: '300', label: '5m' }
];

const DEFAULT_HZ_TIMEZONE_OPTIONS: HzSelectOption[] = [
  { value: '', label: 'Local' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai' },
  { value: 'UTC', label: 'UTC' }
];

const DEFAULT_HZ_TIME_RANGE_RECENT_STORAGE_KEY = 'hertzbeat.ui.timeRange.recent';
const DEFAULT_HZ_TIME_RANGE_CUSTOM_STORAGE_KEY = 'hertzbeat.ui.timeRange.custom';
const DEFAULT_HZ_TIME_RANGE_RECENT_MAX = 6;
const DEFAULT_HZ_TIME_RANGE_CUSTOM_MAX = 12;

const DEFAULT_HZ_TIME_RANGE_LABELS: Required<HzTimeRangeToolbarLabels> = {
  preset: 'Time range',
  start: 'Start',
  end: 'End',
  from: 'From',
  to: 'To',
  absoluteTitle: 'Absolute time range',
  quickRanges: 'Quick ranges',
  relativeTitle: 'Relative time',
  recentRanges: 'Recent ranges',
  customRange: 'Custom range',
  customName: 'Range name',
  saveCustomRange: 'Save range',
  deleteCustomRange: 'Delete',
  validationValid: 'Valid time expression',
  validationInvalid: 'Invalid time expression',
  year: 'Year',
  month: 'Month',
  weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  date: 'Date',
  hour: 'Hour',
  minute: 'Minute',
  second: 'Second',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  previousYears: 'Previous years',
  nextYears: 'Next years',
  decrease: 'Decrease',
  increase: 'Increase',
  clear: 'Clear',
  absolutePlaceholder: 'Select time',
  refresh: 'Refresh',
  timezone: 'Timezone',
  apply: 'Apply',
  applyAria: 'Apply time range',
  refreshAction: 'Refresh now',
  reset: 'Reset',
  resetAria: 'Reset time range'
};

export type HzTimeRangePreviewHandoffProps = React.HTMLAttributes<HTMLDivElement> & {
  state?: 'idle' | 'preview' | 'applied';
  source?: string;
  from?: string;
  to?: string;
  simulateLabel?: React.ReactNode;
  applyLabel?: React.ReactNode;
  resetLabel?: React.ReactNode;
  applyDisabled?: boolean;
  onSimulate?: () => void;
  onApply?: () => void;
  onReset?: () => void;
};

export function HzTimeRangePreviewHandoff({
  state = 'idle',
  source,
  from,
  to,
  simulateLabel,
  applyLabel = 'Apply',
  resetLabel = 'Reset',
  applyDisabled = false,
  onSimulate,
  onApply,
  onReset,
  className,
  ...props
}: HzTimeRangePreviewHandoffProps) {
  const rangeLabel = from && to ? `${from} - ${to}` : from || to || '';

  return (
    <div
      {...props}
      className={cn(
        'flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--hz-ui-line-soft)] bg-transparent px-0 py-2',
        className
      )}
      data-hz-ui="time-range-preview-handoff"
      data-hz-time-range-preview-handoff-owner="hertzbeat-ui-time-range-preview-handoff"
      data-hz-time-range-preview-handoff-model="chart-datazoom-preview-apply-reset"
      data-hz-time-range-preview-handoff-state={state}
      data-hz-time-range-preview-handoff-source={source}
      data-hz-time-range-preview-handoff-from={from}
      data-hz-time-range-preview-handoff-to={to}
    >
      <div className="min-w-0">
        <div className="truncate font-mono text-[11px] text-[#dbe4f0]" data-hz-time-range-preview-handoff-range="readable">
          {rangeLabel || '-'}
        </div>
      </div>
      <HzActionGroup density="inline" data-hz-time-range-preview-handoff-actions="true">
        {simulateLabel ? (
          <HzButton
            size="sm"
            intent="ghost"
            onClick={onSimulate}
            data-hz-time-range-preview-handoff-action="simulate"
          >
            {simulateLabel}
          </HzButton>
        ) : null}
        <HzButton
          size="sm"
          intent="secondary"
          disabled={applyDisabled}
          onClick={onApply}
          data-hz-time-range-preview-handoff-action="apply"
        >
          {applyLabel}
        </HzButton>
        <HzButton
          size="sm"
          intent="ghost"
          onClick={onReset}
          data-hz-time-range-preview-handoff-action="reset"
        >
          {resetLabel}
        </HzButton>
      </HzActionGroup>
    </div>
  );
}

function normalizeHzTimeRangeToolbarRefresh(value: Pick<HzTimeRangeToolbarValue, 'refresh' | 'live'>) {
  return value.live === 'false' ? '' : value.refresh || '';
}

function resolveHzTimeRangeToolbarLiveDraft(refresh: string) {
  return refresh ? '' : 'false';
}

function formatHzTimeRangeExpressionDraft(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  return /^\d+$/.test(trimmed) ? formatHzTimeRangeAbsoluteDraft(trimmed, { inputMode: 'text' }) : trimmed;
}

function normalizeHzTimeRangeToolbarValue(
  value: HzTimeRangeToolbarValue,
  fallbackTimeRange: string,
  absoluteInputMode: HzTimeRangeToolbarProps['absoluteInputMode'] = 'text'
): Required<HzTimeRangeToolbarValue> {
  return {
    timeRange: value.timeRange || fallbackTimeRange,
    from: formatHzTimeRangeExpressionDraft(value.from),
    to: formatHzTimeRangeExpressionDraft(value.to),
    start: formatHzTimeRangeAbsoluteDraft(value.start, { inputMode: absoluteInputMode }),
    end: formatHzTimeRangeAbsoluteDraft(value.end, { inputMode: absoluteInputMode }),
    refresh: normalizeHzTimeRangeToolbarRefresh(value),
    live: value.live || '',
    tz: value.tz || value.timezone || '',
    timezone: value.timezone || value.tz || ''
  };
}

function stableHzTimeRangeToolbarSignature(
  value: HzTimeRangeToolbarValue,
  fallbackTimeRange: string,
  absoluteInputMode: HzTimeRangeToolbarProps['absoluteInputMode'] = 'text'
) {
  const normalized = normalizeHzTimeRangeToolbarValue(value, fallbackTimeRange, absoluteInputMode);
  return JSON.stringify(normalized);
}

function emitHzTimeRangeToolbarValue(value: Required<HzTimeRangeToolbarValue>): HzTimeRangeToolbarValue {
  const parsedStart = parseHzTimeRangeAbsoluteDraft(value.start);
  const parsedEnd = parseHzTimeRangeAbsoluteDraft(value.end);
  const expressionRangeOwnsValue = Boolean(value.from && value.to);
  const absoluteRangeOwnsValue = Boolean(parsedStart && parsedEnd);
  const manualRefresh = value.live === 'false';

  return {
    timeRange: expressionRangeOwnsValue || absoluteRangeOwnsValue ? undefined : value.timeRange || undefined,
    from: value.from || undefined,
    to: value.to || undefined,
    start: parsedStart,
    end: parsedEnd,
    refresh: manualRefresh ? undefined : value.refresh || undefined,
    live: value.live || undefined,
    tz: value.tz || undefined,
    timezone: value.tz || value.timezone || undefined
  };
}

function getHzTimeRangeRecentRangeId(value: HzTimeRangeToolbarValue) {
  return [
    value.timeRange || '',
    value.from || '',
    value.to || '',
    value.start || '',
    value.end || '',
    value.refresh || '',
    value.live || '',
    value.tz || value.timezone || ''
  ].join('|');
}

function formatHzTimeRangeRecentRangeLabel(value: HzTimeRangeToolbarValue) {
  if (value.from && value.to) return `${value.from} - ${value.to}`;
  if (value.start && value.end) {
    return `${formatHzTimeRangeAbsoluteDraft(value.start)} - ${formatHzTimeRangeAbsoluteDraft(value.end)}`;
  }
  if (value.timeRange) return value.timeRange;
  if (value.from) return value.from;
  if (value.start) return formatHzTimeRangeAbsoluteDraft(value.start);
  return 'Custom time range';
}

function normalizeHzTimeRangeRecentRange(value: HzTimeRangeToolbarValue): HzTimeRangeRecentRange {
  const timezone = value.tz || value.timezone || undefined;
  return {
    id: getHzTimeRangeRecentRangeId(value),
    label: formatHzTimeRangeRecentRangeLabel(value),
    timeRange: value.timeRange,
    from: value.from,
    to: value.to,
    start: value.start,
    end: value.end,
    refresh: value.refresh,
    live: value.live,
    tz: timezone,
    timezone
  };
}

function mergeHzTimeRangeRecentRanges(ranges: HzTimeRangeRecentRange[], maxRecentRanges = DEFAULT_HZ_TIME_RANGE_RECENT_MAX) {
  const seen = new Set<string>();
  const merged: HzTimeRangeRecentRange[] = [];
  ranges.forEach(range => {
    if (!range.id || seen.has(range.id)) return;
    seen.add(range.id);
    merged.push(range);
  });
  return merged.slice(0, Math.max(1, maxRecentRanges));
}

function readHzTimeRangeRecentRanges(recentStorageKey: string | undefined) {
  if (!recentStorageKey || typeof window === 'undefined') return [];
  try {
    const storedValue = window.localStorage.getItem(recentStorageKey);
    if (!storedValue) return [];
    const parsedValue = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue)) return [];
    return parsedValue.filter((range): range is HzTimeRangeRecentRange => {
      if (!range || typeof range !== 'object') return false;
      const item = range as Partial<HzTimeRangeRecentRange>;
      return typeof item.id === 'string' && typeof item.label === 'string';
    });
  } catch {
    return [];
  }
}

function writeHzTimeRangeRecentRanges(recentStorageKey: string | undefined, recentRanges: HzTimeRangeRecentRange[]) {
  if (!recentStorageKey || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(recentStorageKey, JSON.stringify(recentRanges));
  } catch {
    // Storage can be unavailable in private or embedded browsing contexts.
  }
}

function mergeHzTimeRangeCustomRanges(ranges: HzTimeRangeCustomRange[], maxCustomRanges = DEFAULT_HZ_TIME_RANGE_CUSTOM_MAX) {
  return mergeHzTimeRangeRecentRanges(ranges, maxCustomRanges);
}

function readHzTimeRangeCustomRanges(customStorageKey: string | undefined) {
  return readHzTimeRangeRecentRanges(customStorageKey);
}

function writeHzTimeRangeCustomRanges(customStorageKey: string | undefined, customRanges: HzTimeRangeCustomRange[]) {
  if (!customStorageKey || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(customStorageKey, JSON.stringify(customRanges));
  } catch {
    // Storage can be unavailable in private or embedded browsing contexts.
  }
}

function padHzTimeRangePart(value: number, length = 2) {
  return String(value).padStart(length, '0');
}

function formatHzTimeRangeAbsoluteDraft(
  value: string | undefined,
  options: { inputMode?: HzTimeRangeToolbarProps['absoluteInputMode'] } = {}
) {
  if (!value) return '';
  const timestamp = /^\d+$/.test(value) ? Number(value) : Date.parse(value);
  if (!Number.isFinite(timestamp)) return options.inputMode === 'datetime-local' ? value.replace(' ', 'T') : value;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return options.inputMode === 'datetime-local' ? value.replace(' ', 'T') : value;
  const datePart = [
    date.getFullYear(),
    padHzTimeRangePart(date.getMonth() + 1),
    padHzTimeRangePart(date.getDate())
  ].join('-');
  const timePart = [
    padHzTimeRangePart(date.getHours()),
    padHzTimeRangePart(date.getMinutes()),
    padHzTimeRangePart(date.getSeconds())
  ].join(':');
  const milliseconds = date.getMilliseconds();
  const separator = options.inputMode === 'datetime-local' ? 'T' : ' ';
  if (options.inputMode === 'datetime-local') return `${datePart}${separator}${timePart}`;
  return milliseconds > 0
    ? `${datePart}${separator}${timePart}.${padHzTimeRangePart(milliseconds, 3)}`
    : `${datePart}${separator}${timePart}`;
}

function parseHzTimeRangeAbsoluteDraft(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^\d+$/.test(trimmed)) return trimmed;

  const localDateTimeMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,3}))?)?)?$/.exec(trimmed);
  if (localDateTimeMatch) {
    const [, year, month, day, hour = '0', minute = '0', second = '0', millisecond = '0'] = localDateTimeMatch;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number(millisecond.padEnd(3, '0'))
    );
    const timestamp = date.getTime();
    return Number.isFinite(timestamp) ? String(timestamp) : undefined;
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? String(parsed) : undefined;
}

type HzDateTimePickerLabels = Partial<{
  date: string;
  hour: string;
  minute: string;
  second: string;
  clear: string;
  apply: string;
  placeholder: string;
}>;

type HzDateTimePickerProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  value?: string;
  label: string;
  labels?: HzDateTimePickerLabels;
  triggerClassName?: string;
  onChange?: (value: string) => void;
};

const HZ_DATE_TIME_HOURS = Array.from({ length: 24 }, (_, value) => value);
const HZ_DATE_TIME_MINUTE_SECONDS = Array.from({ length: 60 }, (_, value) => value);

function buildHzDateTimeOptions(values: number[]) {
  return values.map(value => {
    const padded = padHzTimeRangePart(value);
    return { value: padded, label: padded };
  });
}

const HZ_DATE_TIME_HOUR_OPTIONS = buildHzDateTimeOptions(HZ_DATE_TIME_HOURS);
const HZ_DATE_TIME_MINUTE_SECOND_OPTIONS = buildHzDateTimeOptions(HZ_DATE_TIME_MINUTE_SECONDS);

function getHzDateTimeToday() {
  const date = new Date();
  return [
    date.getFullYear(),
    padHzTimeRangePart(date.getMonth() + 1),
    padHzTimeRangePart(date.getDate())
  ].join('-');
}

function resolveHzRelativeDateTimeExpression(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || !trimmed.startsWith('now')) return undefined;
  let timestamp = Date.now();
  let cursor = 3;
  while (cursor < trimmed.length) {
    const match = /^([+-])(\d+)(ms|s|m|h|d|w)/.exec(trimmed.slice(cursor));
    if (!match) return undefined;
    const [, sign, amount, unit] = match;
    const numericAmount = Number(amount) * (sign === '-' ? -1 : 1);
    if (unit === 'ms') timestamp += numericAmount;
    if (unit === 's') timestamp += numericAmount * 1000;
    if (unit === 'm') timestamp += numericAmount * 60 * 1000;
    if (unit === 'h') timestamp += numericAmount * 60 * 60 * 1000;
    if (unit === 'd') timestamp += numericAmount * 24 * 60 * 60 * 1000;
    if (unit === 'w') timestamp += numericAmount * 7 * 24 * 60 * 60 * 1000;
    cursor += match[0].length;
  }
  return Number.isFinite(timestamp) ? String(timestamp) : undefined;
}

function splitHzDateTimePickerValue(value: string | undefined) {
  const relativeAnchor = resolveHzRelativeDateTimeExpression(value);
  const normalized = formatHzTimeRangeAbsoluteDraft(relativeAnchor || value, { inputMode: 'datetime-local' });
  const [date = '', time = ''] = normalized.split('T');
  const [, hour = '00', minute = '00', second = '00'] = /^(\d{2}):(\d{2})(?::(\d{2}))?/.exec(time) || [];
  return {
    date,
    hour,
    minute,
    second
  };
}

function composeHzDateTimePickerValue({
  date,
  hour,
  minute,
  second
}: {
  date: string;
  hour: string;
  minute: string;
  second: string;
}) {
  if (!date) return '';
  return `${date}T${hour}:${minute}:${second}`;
}

function formatHzDateTimePickerDisplay(value: string | undefined, placeholder: string) {
  const normalized = formatHzTimeRangeAbsoluteDraft(value, { inputMode: 'datetime-local' });
  return normalized ? normalized.replace('T', ' ') : placeholder;
}

export function HzDateTimePicker({
  value,
  label,
  labels,
  triggerClassName,
  className,
  onChange,
  ...props
}: HzDateTimePickerProps) {
  const resolvedLabels = {
    date: DEFAULT_HZ_TIME_RANGE_LABELS.date,
    hour: DEFAULT_HZ_TIME_RANGE_LABELS.hour,
    minute: DEFAULT_HZ_TIME_RANGE_LABELS.minute,
    second: DEFAULT_HZ_TIME_RANGE_LABELS.second,
    clear: DEFAULT_HZ_TIME_RANGE_LABELS.clear,
    apply: DEFAULT_HZ_TIME_RANGE_LABELS.apply,
    placeholder: DEFAULT_HZ_TIME_RANGE_LABELS.absolutePlaceholder,
    ...labels
  };
  const normalizedValue = formatHzTimeRangeAbsoluteDraft(value, { inputMode: 'datetime-local' });
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(normalizedValue);
  const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties | undefined>(undefined);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const pointerDownInsideRef = React.useRef(false);
  const panelId = React.useId();

  React.useEffect(() => {
    if (!open) setDraft(normalizedValue);
  }, [normalizedValue, open]);

  const updatePanelPosition = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 336;
    const nextPlacement = resolveHzSelectMenuPlacement({
      placement: 'auto',
      triggerTop: rect.top,
      triggerBottom: rect.bottom,
      viewportHeight: window.innerHeight,
      optionCount: 7,
      maxHeight: 220
    });
    setPanelStyle({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      minWidth: Math.max(rect.width, width),
      maxWidth: Math.max(width, window.innerWidth - 16),
      ...(nextPlacement === 'top'
        ? { bottom: Math.max(8, window.innerHeight - rect.top + 4) }
        : { top: Math.min(window.innerHeight - 8, rect.bottom + 4) })
    });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    updatePanelPosition();
  }, [open, updatePanelPosition]);

  const setDraftPart = (part: 'date' | 'hour' | 'minute' | 'second', nextValue: string) => {
    const current = splitHzDateTimePickerValue(draft);
    const next = {
      ...current,
      date: current.date || getHzDateTimeToday(),
      [part]: nextValue
    };
    setDraft(composeHzDateTimePickerValue(next));
  };

  const parts = splitHzDateTimePickerValue(draft);
  const displayValue = formatHzDateTimePickerDisplay(open ? draft : normalizedValue, resolvedLabels.placeholder);
  const empty = !formatHzTimeRangeAbsoluteDraft(open ? draft : normalizedValue, { inputMode: 'datetime-local' });

  return (
    <div
      {...props}
      ref={rootRef}
      className={cn('relative min-w-0', className)}
      data-hz-ui="date-time-picker"
      data-hz-date-time-picker-trigger="button"
      data-hz-date-time-picker-granularity="second"
      data-hz-date-time-picker-pattern="expression-absolute-range"
      onBlur={event => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
        setOpen(false);
      }}
    >
      <input
        type="hidden"
        value={normalizedValue}
        readOnly
        data-hz-date-time-picker-hidden-value="datetime-local"
      />
      <span
        className="sr-only"
        data-hz-date-time-picker-calendar="year-month-day"
        data-hz-date-time-picker-time-unit="second"
      >
        {resolvedLabels.date} {resolvedLabels.hour} {resolvedLabels.minute} {resolvedLabels.second}
      </span>
      <button
        type="button"
        className={cn(
          'grid h-8 w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 border border-[var(--hz-ui-line-soft)] bg-transparent px-2 text-left text-[11px] font-semibold text-[#eef2f7] shadow-none transition-colors hover:border-[var(--hz-ui-accent-muted)] hover:bg-[var(--hz-ui-surface-soft)]',
          controlFocusClassName,
          triggerClassName
        )}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={panelId}
        onClick={() => {
          if (!open) updatePanelPosition();
          setOpen(previous => !previous);
        }}
        data-hz-date-time-picker-trigger="button"
        data-hz-control-height="32"
        data-hz-control-edge="lined"
      >
        <CalendarDays size={12} className="text-[#727b8c]" aria-hidden="true" />
        <span className={cn('truncate', empty ? 'text-[#727b8c]' : '')}>{displayValue}</span>
        <ChevronDown size={12} className={cn('text-[#727b8c] transition-transform', open ? 'rotate-180' : '')} />
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={`${label} picker`}
          className="fixed z-50 grid gap-2 border border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-surface-raised)] p-2 shadow-[0_18px_42px_rgba(0,0,0,0.42)]"
          style={panelStyle}
          data-hz-date-time-picker-panel="calendar-time-second"
          data-hz-date-time-picker-calendar="year-month-day"
          data-hz-date-time-picker-time="hour-minute-second"
        >
          <label className="grid gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">{resolvedLabels.date}</span>
            <input
              type="date"
              value={parts.date}
              onChange={event => setDraftPart('date', event.target.value)}
              className={timeRangeToolbarControlClassName}
              data-hz-date-time-picker-calendar="year-month-day"
            />
          </label>
          <div className="grid grid-cols-3 gap-1.5" data-hz-date-time-picker-time="selector-columns">
            {[
              { unit: 'hour' as const, label: resolvedLabels.hour, value: parts.hour, options: HZ_DATE_TIME_HOUR_OPTIONS },
              { unit: 'minute' as const, label: resolvedLabels.minute, value: parts.minute, options: HZ_DATE_TIME_MINUTE_SECOND_OPTIONS },
              { unit: 'second' as const, label: resolvedLabels.second, value: parts.second, options: HZ_DATE_TIME_MINUTE_SECOND_OPTIONS }
            ].map(item => (
              <label key={item.unit} className="grid min-w-0 gap-1" data-hz-date-time-picker-time-unit={item.unit}>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">{item.label}</span>
                <HzSelectMenu
                  options={item.options}
                  value={item.value}
                  label={item.label}
                  triggerClassName={timeRangeToolbarControlClassName}
                  onChange={nextValue => setDraftPart(item.unit, nextValue)}
                />
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-1.5 border-t border-[var(--hz-ui-line-faint)] pt-2">
            <HzButton type="button" size="sm" intent="ghost" onClick={() => {
              setDraft('');
              onChange?.('');
              setOpen(false);
            }}>
              {resolvedLabels.clear}
            </HzButton>
            <HzButton type="button" size="sm" intent="secondary" onClick={() => {
              onChange?.(draft);
              setOpen(false);
            }}>
              {resolvedLabels.apply}
            </HzButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type HzExpressionTimeRangePickerField = 'start' | 'end';
type HzExpressionTimeRangeCalendarView = 'day' | 'month' | 'year';

type HzExpressionTimeRangePickerProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  timeRange?: string;
  from?: string;
  to?: string;
  start?: string;
  end?: string;
  labels?: Required<HzTimeRangeToolbarLabels>;
  presets?: HzSelectOption[];
  recentRanges?: HzTimeRangeRecentRange[];
  customRanges?: HzTimeRangeCustomRange[];
  customRangeName?: string;
  variant?: 'absolute' | 'single';
  triggerClassName?: string;
  defaultOpen?: boolean;
  defaultCalendarView?: HzExpressionTimeRangeCalendarView;
  onFromChange?: (value: string) => void;
  onToChange?: (value: string) => void;
  onStartChange?: (value: string) => void;
  onEndChange?: (value: string) => void;
  onPresetSelect?: (value: string) => void;
  onRecentRangeSelect?: (range: HzTimeRangeRecentRange) => void;
  onCustomRangeNameChange?: (value: string) => void;
  onCustomRangeSave?: () => void;
  onCustomRangeSelect?: (range: HzTimeRangeCustomRange) => void;
  onCustomRangeDelete?: (range: HzTimeRangeCustomRange) => void;
  onApply?: () => void;
};

const HZ_DATE_TIME_MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const value = String(index + 1);
  return { value, label: padHzTimeRangePart(index + 1) };
});

const HZ_EXPRESSION_TIME_RANGE_YEAR_PAGE_SIZE = 10;
const HZ_EXPRESSION_TIME_RANGE_YEAR_STEP = 10;
const HZ_EXPRESSION_TIME_RANGE_YEAR_MIN = 1970;
const HZ_EXPRESSION_TIME_RANGE_YEAR_MAX = 9999;

function getHzDateTimeParts(value: string | undefined) {
  const parts = splitHzDateTimePickerValue(value);
  const fallbackDate = parts.date || getHzDateTimeToday();
  const [yearPart, monthPart, dayPart] = fallbackDate.split('-');
  const year = Number(yearPart) || new Date().getFullYear();
  const month = Math.max(1, Math.min(12, Number(monthPart) || new Date().getMonth() + 1));
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.max(1, Math.min(daysInMonth, Number(dayPart) || 1));
  return {
    date: `${year}-${padHzTimeRangePart(month)}-${padHzTimeRangePart(day)}`,
    year,
    month,
    day,
    hour: parts.hour || '00',
    minute: parts.minute || '00',
    second: parts.second || '00'
  };
}

function getHzExpressionTimeRangeYearPageStart(year: number) {
  const clampedYear = clampHzExpressionTimeRangeYear(year);
  const decadeStart = Math.floor((clampedYear - 1) / 10) * 10 + 1;
  return clampHzExpressionTimeRangeYearPageStart(decadeStart);
}

function buildHzExpressionTimeRangeYearGrid(pageStart: number) {
  return Array.from({ length: HZ_EXPRESSION_TIME_RANGE_YEAR_PAGE_SIZE }, (_, index) => pageStart + index)
    .filter(year => year >= HZ_EXPRESSION_TIME_RANGE_YEAR_MIN && year <= HZ_EXPRESSION_TIME_RANGE_YEAR_MAX);
}

function clampHzExpressionTimeRangeYear(year: number) {
  if (!Number.isFinite(year)) return new Date().getFullYear();
  return Math.max(HZ_EXPRESSION_TIME_RANGE_YEAR_MIN, Math.min(HZ_EXPRESSION_TIME_RANGE_YEAR_MAX, Math.trunc(year)));
}

function clampHzExpressionTimeRangeYearPageStart(pageStart: number) {
  const maxPageStart = HZ_EXPRESSION_TIME_RANGE_YEAR_MAX - HZ_EXPRESSION_TIME_RANGE_YEAR_PAGE_SIZE + 1;
  return Math.max(HZ_EXPRESSION_TIME_RANGE_YEAR_MIN, Math.min(maxPageStart, Math.trunc(pageStart)));
}

function normalizeHzExpressionTimeRangeUnitInput(value: string, max: number) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '00';
  return padHzTimeRangePart(Math.max(0, Math.min(max, Math.trunc(numericValue))));
}

function formatHzExpressionCalendarMonthTitle(parts: ReturnType<typeof getHzDateTimeParts>, labels: Required<HzTimeRangeToolbarLabels>) {
  return `${labels.months[parts.month - 1] || padHzTimeRangePart(parts.month)} ${parts.year}`;
}

function getHzExpressionCalendarLeadingDays(year: number, month: number) {
  return (new Date(year, month - 1, 1).getDay() + 6) % 7;
}

function composeHzExpressionTimeRangePickerValue({
  year,
  month,
  day,
  hour,
  minute,
  second
}: {
  year: number;
  month: number;
  day: number;
  hour: string;
  minute: string;
  second: string;
}) {
  return composeHzDateTimePickerValue({
    date: `${year}-${padHzTimeRangePart(month)}-${padHzTimeRangePart(day)}`,
    hour,
    minute,
    second
  });
}

function getHzExpressionTimeRangePickerDisplay(value: string | undefined, placeholder: string) {
  return formatHzDateTimePickerDisplay(value, placeholder);
}

function formatHzExpressionTimeRangeText(value: string | undefined, placeholder = '') {
  const trimmed = value?.trim();
  if (!trimmed) return placeholder;
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}T\d{1,2}:\d{1,2}/.test(trimmed)) {
    return formatHzTimeRangeAbsoluteDraft(trimmed, { inputMode: 'text' });
  }
  return trimmed;
}

function resolveHzExpressionTimeRangeValidationState(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return 'empty';
  if (/^\d+$/.test(trimmed)) return 'invalid';
  if (/^now(?:[+-]\d+(?:ms|s|m|h|d|w|M|Q|y)|\/(?:s|m|h|d|w|M|Q|y|fQ|fy))*$/.test(trimmed)) return 'valid';
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[ T]\d{1,2}:\d{1,2}(?::\d{1,2}(?:\.\d{1,3})?)?)?$/.test(trimmed)) return 'valid';
  return 'invalid';
}

function resolveHzExpressionTimeRangePairValidationState(from: string | undefined, to: string | undefined) {
  const fromState = resolveHzExpressionTimeRangeValidationState(from);
  const toState = resolveHzExpressionTimeRangeValidationState(to);
  return fromState === 'invalid' || toState === 'invalid'
    ? 'invalid'
    : fromState === 'empty' || toState === 'empty'
      ? 'empty'
      : 'valid';
}

function resolveHzTimeRangeStoredRangeRouteModel(range: HzTimeRangeRecentRange) {
  if (range.from || range.to) return 'expression-from-to';
  if (range.start || range.end) return 'absolute-start-end';
  if (range.timeRange) return 'quick-relative';
  return 'empty';
}

function getHzExpressionTimeRangeMatchedPresetLabel({
  timeRange,
  from,
  to,
  presets
}: {
  timeRange?: string;
  from?: string;
  to?: string;
  presets: HzSelectOption[];
}) {
  const normalizedTimeRange = timeRange?.trim();
  const normalizedFrom = from?.trim();
  const normalizedTo = to?.trim();
  if (!normalizedTimeRange?.startsWith('last-')) return null;
  if (normalizedTo !== 'now') return null;
  if (normalizedFrom !== `now-${normalizedTimeRange.slice(5)}`) return null;
  return presets.find(option => option.value === normalizedTimeRange)?.label || null;
}

function getHzExpressionTimeRangeDisplay({
  timeRange,
  from,
  to,
  start,
  end,
  presets,
  labels
}: {
  timeRange?: string;
  from?: string;
  to?: string;
  start?: string;
  end?: string;
  presets: HzSelectOption[];
  labels: Required<HzTimeRangeToolbarLabels>;
}) {
  if (from && to) {
    return (
      getHzExpressionTimeRangeMatchedPresetLabel({ timeRange, from, to, presets }) ||
      `${formatHzExpressionTimeRangeText(from)} - ${formatHzExpressionTimeRangeText(to)}`
    );
  }
  if (from) return `${labels.from}: ${formatHzExpressionTimeRangeText(from)}`;
  if (to) return `${labels.to}: ${formatHzExpressionTimeRangeText(to)}`;
  const startLabel = getHzExpressionTimeRangePickerDisplay(start, '');
  const endLabel = getHzExpressionTimeRangePickerDisplay(end, '');
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  if (startLabel) return `${labels.from}: ${startLabel}`;
  if (endLabel) return `${labels.to}: ${endLabel}`;
  return presets.find(option => option.value === timeRange)?.label || labels.absolutePlaceholder;
}

export function HzExpressionTimeRangePicker({
  timeRange,
  from,
  to,
  start,
  end,
  labels,
  presets = DEFAULT_HZ_TIME_RANGE_PRESETS,
  recentRanges = [],
  customRanges = [],
  customRangeName = '',
  variant = 'absolute',
  triggerClassName,
  defaultOpen = false,
  defaultCalendarView = 'day',
  onFromChange,
  onToChange,
  onStartChange,
  onEndChange,
  onPresetSelect,
  onRecentRangeSelect,
  onCustomRangeNameChange,
  onCustomRangeSave,
  onCustomRangeSelect,
  onCustomRangeDelete,
  onApply,
  className,
  ...props
}: HzExpressionTimeRangePickerProps) {
  const resolvedLabels = { ...DEFAULT_HZ_TIME_RANGE_LABELS, ...labels };
  const [open, setOpen] = React.useState(defaultOpen);
  const [activeField, setActiveField] = React.useState<HzExpressionTimeRangePickerField>('start');
  const [calendarView, setCalendarView] = React.useState<HzExpressionTimeRangeCalendarView>(defaultCalendarView);
  const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties | undefined>(undefined);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const pointerDownInsideRef = React.useRef(false);
  const panelId = React.useId();
  const normalizedStart = formatHzTimeRangeAbsoluteDraft(start, { inputMode: 'datetime-local' });
  const normalizedEnd = formatHzTimeRangeAbsoluteDraft(end, { inputMode: 'datetime-local' });
  const fromExpression = from || '';
  const toExpression = to || '';
  const usesExpressionRange = Boolean(fromExpression || toExpression);
  const activeValue = activeField === 'start'
    ? usesExpressionRange ? fromExpression : normalizedStart
    : usesExpressionRange ? toExpression : normalizedEnd;
  const activeParts = getHzDateTimeParts(activeValue);
  const fromValidationState = resolveHzExpressionTimeRangeValidationState(
    usesExpressionRange ? fromExpression : normalizedStart
  );
  const toValidationState = resolveHzExpressionTimeRangeValidationState(
    usesExpressionRange ? toExpression : normalizedEnd
  );
  const rangeValidationState = resolveHzExpressionTimeRangePairValidationState(
    usesExpressionRange ? fromExpression : normalizedStart,
    usesExpressionRange ? toExpression : normalizedEnd
  );
  const rangeCanApply = rangeValidationState !== 'invalid';
  const daysInMonth = new Date(activeParts.year, activeParts.month, 0).getDate();
  const leadingBlankDays = getHzExpressionCalendarLeadingDays(activeParts.year, activeParts.month);
  const [yearPageStart, setYearPageStart] = React.useState(() => getHzExpressionTimeRangeYearPageStart(activeParts.year));
  const yearGrid = buildHzExpressionTimeRangeYearGrid(yearPageStart);
  const calendarMonthTitle = formatHzExpressionCalendarMonthTitle(activeParts, resolvedLabels);
  const calendarYearRange = `${yearPageStart}-${yearPageStart + HZ_EXPRESSION_TIME_RANGE_YEAR_PAGE_SIZE - 1}`;
  const singleRangeDisplay = getHzExpressionTimeRangeDisplay({
    timeRange,
    from: fromExpression,
    to: toExpression,
    start: normalizedStart,
    end: normalizedEnd,
    presets,
    labels: resolvedLabels
  });

  const updatePanelPosition = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(560, window.innerWidth - 16);
    const nextPlacement = resolveHzSelectMenuPlacement({
      placement: 'auto',
      triggerTop: rect.top,
      triggerBottom: rect.bottom,
      viewportHeight: window.innerHeight,
      optionCount: 12,
      maxHeight: 430
    });
    setPanelStyle({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
      ...(nextPlacement === 'top'
        ? { bottom: Math.max(8, window.innerHeight - rect.top + 4) }
        : { top: Math.min(window.innerHeight - 8, rect.bottom + 4) })
    });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    updatePanelPosition();
  }, [open, updatePanelPosition]);

  React.useEffect(() => {
    setYearPageStart(previous => {
      if (activeParts.year >= previous && activeParts.year < previous + HZ_EXPRESSION_TIME_RANGE_YEAR_PAGE_SIZE) return previous;
      return getHzExpressionTimeRangeYearPageStart(activeParts.year);
    });
  }, [activeParts.year]);

  const setActiveValue = (value: string) => {
    if (activeField === 'start') {
      if (usesExpressionRange) {
        onFromChange?.(value);
      } else {
        onStartChange?.(value);
      }
    } else {
      if (usesExpressionRange) {
        onToChange?.(value);
      } else {
        onEndChange?.(value);
      }
    }
  };

  const setActiveParts = (nextParts: Partial<ReturnType<typeof getHzDateTimeParts>>) => {
    const merged = { ...activeParts, ...nextParts };
    const nextDaysInMonth = new Date(merged.year, merged.month, 0).getDate();
    setActiveValue(composeHzExpressionTimeRangePickerValue({ ...merged, day: Math.min(merged.day, nextDaysInMonth) }));
  };

  const setActiveYear = (nextYear: number) => {
    const clampedYear = clampHzExpressionTimeRangeYear(nextYear);
    setYearPageStart(getHzExpressionTimeRangeYearPageStart(clampedYear));
    setActiveParts({ year: clampedYear });
  };

  const moveActiveMonth = (offset: number) => {
    const nextDate = new Date(activeParts.year, activeParts.month - 1 + offset, 1);
    setActiveParts({ year: nextDate.getFullYear(), month: nextDate.getMonth() + 1 });
  };

  const moveActiveYear = (offset: number) => {
    setActiveYear(activeParts.year + offset);
  };

  const openField = (field: HzExpressionTimeRangePickerField) => {
    setActiveField(field);
    setCalendarView('day');
    updatePanelPosition();
    setOpen(true);
  };

  const fieldButtons = [
    {
      field: 'start' as const,
      expressionField: 'from',
      label: resolvedLabels.from,
      aria: resolvedLabels.start,
      value: normalizedStart,
      expression: fromExpression
    },
    {
      field: 'end' as const,
      expressionField: 'to',
      label: resolvedLabels.to,
      aria: resolvedLabels.end,
      value: normalizedEnd,
      expression: toExpression
    }
  ];

  return (
    <div
      {...props}
      ref={rootRef}
      className={cn('relative flex min-w-0 items-end gap-1.5', className)}
      data-hz-ui="expression-time-range-picker"
      data-hz-expression-time-range-picker-layout={variant === 'single' ? 'expression-single-range' : 'expression-absolute-range'}
      data-hz-expression-time-range-picker-panel-width={variant === 'single' ? '560' : undefined}
      data-hz-expression-time-range-picker-panel-tone="graphite-black"
      data-hz-expression-time-range-expression-mode={usesExpressionRange ? 'from-to' : undefined}
      data-hz-expression-time-range-expression-display={usesExpressionRange ? 'raw' : undefined}
      data-hz-expression-time-range-validation-state={rangeValidationState}
      data-hz-time-range-toolbar-absolute-control="expression-time-range-picker"
      data-hz-time-range-toolbar-absolute-input-mode={variant === 'single' ? 'manual-text-with-picker' : 'datetime-local'}
      onPointerDownCapture={() => {
        pointerDownInsideRef.current = true;
        if (typeof window !== 'undefined') {
          window.setTimeout(() => {
            pointerDownInsideRef.current = false;
          }, 0);
        }
      }}
      onBlur={event => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
        if (pointerDownInsideRef.current) return;
        setOpen(false);
      }}
    >
      <input type="hidden" value={normalizedStart} readOnly data-hz-expression-time-range-hidden="from" />
      <input type="hidden" value={normalizedEnd} readOnly data-hz-expression-time-range-hidden="to" />
      {usesExpressionRange ? (
        <>
          <input type="hidden" value={fromExpression} readOnly data-hz-expression-time-range-hidden="from-expression" />
          <input type="hidden" value={toExpression} readOnly data-hz-expression-time-range-hidden="to-expression" />
        </>
      ) : null}
      {variant === 'single' ? (
        <button
          type="button"
          className={cn(
            'grid h-7 w-full min-w-[200px] max-w-[280px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 border border-[var(--hz-ui-line-soft)] bg-transparent px-1.5 text-left text-[10px] font-semibold text-[#eef2f7] shadow-none transition-colors hover:border-[var(--hz-ui-line-strong)] hover:bg-[#11151b]',
            open ? 'border-[var(--hz-ui-line-strong)] bg-[#11151b]' : '',
            controlFocusClassName,
            triggerClassName
          )}
          aria-label={resolvedLabels.preset}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={panelId}
          onClick={() => {
            setActiveField('start');
            setCalendarView('day');
            updatePanelPosition();
            setOpen(previous => !previous);
          }}
          data-hz-expression-time-range-trigger="single-range"
          data-hz-expression-time-range-picker-trigger-width="compact"
          data-hz-control-height="28"
          data-hz-control-edge="lined"
        >
          <CalendarDays size={12} className="text-[#727b8c]" aria-hidden="true" />
          <span className="truncate">{singleRangeDisplay}</span>
          <ChevronDown size={12} className={cn('text-[#727b8c] transition-transform', open ? 'rotate-180' : '')} />
        </button>
      ) : fieldButtons.map(item => {
        const active = activeField === item.field;
        return (
          <label key={item.field} className="grid min-w-[172px] max-w-[190px] flex-[0_0_182px] gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">{item.aria}</span>
            <button
              type="button"
              className={cn(
                'grid h-7 w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 border border-[var(--hz-ui-line-soft)] bg-transparent px-1.5 text-left text-[10px] font-semibold text-[#eef2f7] shadow-none transition-colors hover:border-[var(--hz-ui-line-strong)] hover:bg-[#11151b]',
                active && open ? 'border-[var(--hz-ui-line-strong)] bg-[#11151b]' : '',
                controlFocusClassName,
                triggerClassName
              )}
              aria-label={item.aria}
              aria-expanded={open && active}
              aria-haspopup="dialog"
              aria-controls={panelId}
              onClick={() => openField(item.field)}
              data-hz-expression-time-range-field={item.expressionField}
              data-hz-expression-time-range-active={active && open ? 'true' : 'false'}
              data-hz-control-height="28"
              data-hz-control-edge="lined"
            >
              <CalendarDays size={12} className="text-[#727b8c]" aria-hidden="true" />
              <span className={cn('truncate', item.value ? '' : 'text-[#727b8c]')}>
                {getHzExpressionTimeRangePickerDisplay(item.value, resolvedLabels.absolutePlaceholder)}
              </span>
              <ChevronDown size={12} className={cn('text-[#727b8c] transition-transform', open && active ? 'rotate-180' : '')} />
            </button>
          </label>
        );
      })}
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={resolvedLabels.absoluteTitle}
          className="fixed z-50 grid max-h-[520px] grid-rows-[minmax(0,1fr)_auto] overflow-hidden border border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-surface-graphite)] shadow-[0_18px_42px_rgba(0,0,0,0.46)]"
          style={panelStyle}
          data-hz-expression-time-range-picker-panel="open"
          data-hz-expression-time-range-picker-panel-tone="graphite-black"
          data-hz-expression-time-range-picker-panel-height="bounded-520"
          data-hz-expression-time-range-panel-structure="quick-absolute-recent-custom"
          data-hz-expression-time-range-active-field={activeField === 'start' ? 'from' : 'to'}
        >
          <div className="grid min-h-0 min-w-0 md:grid-cols-[148px_minmax(0,1fr)]">
            <section
              className="grid min-h-0 gap-1.5 overflow-y-auto border-b border-[var(--hz-ui-line-soft)] p-1.5 md:border-b-0 md:border-r"
              data-hz-expression-time-range-quick-ranges="true"
              data-hz-expression-time-range-panel-section="quick-ranges"
              data-hz-expression-time-range-side-rail-scroll="bounded"
            >
              <div className="grid gap-1">
                <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">{resolvedLabels.quickRanges}</div>
                <div className="grid gap-1">
                  {presets.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className="min-h-6 border border-transparent bg-transparent px-1.5 text-left text-[10px] font-semibold text-[#a9b0bb] transition-colors hover:border-[var(--hz-ui-line-soft)] hover:bg-[#11151b] hover:text-[#eef2f7]"
                      onClick={() => onPresetSelect?.(option.value)}
                      data-hz-expression-time-range-quick-range={option.value}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className="grid gap-1 border-t border-[var(--hz-ui-line-soft)] pt-1.5"
                data-hz-expression-time-range-panel-section="recent-ranges"
                data-hz-expression-time-range-recent-ranges={recentRanges.length > 0 ? 'persistent' : 'structural'}
              >
                <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">{resolvedLabels.recentRanges}</div>
                {recentRanges.length > 0 ? (
                  <div className="grid gap-1">
                    {recentRanges.map(range => (
                      <button
                        key={range.id}
                        type="button"
                        className="grid min-h-6 min-w-0 border border-transparent bg-transparent px-1.5 py-0.5 text-left text-[10px] font-semibold text-[#a9b0bb] transition-colors hover:border-[var(--hz-ui-line-soft)] hover:bg-[#11151b] hover:text-[#eef2f7]"
                        onClick={() => onRecentRangeSelect?.(range)}
                        data-hz-expression-time-range-recent-range={range.id}
                        data-hz-expression-time-range-recent-range-entry={range.id}
                        data-hz-expression-time-range-recent-range-owner="hertzbeat-ui-time-foundation-picker"
                        data-hz-expression-time-range-recent-range-route-model={resolveHzTimeRangeStoredRangeRouteModel(range)}
                        data-hz-expression-time-range-recent-range-from={range.from}
                        data-hz-expression-time-range-recent-range-to={range.to}
                        data-hz-expression-time-range-recent-range-start={range.start}
                        data-hz-expression-time-range-recent-range-end={range.end}
                        data-hz-expression-time-range-recent-range-refresh={range.refresh}
                        data-hz-expression-time-range-recent-range-live={range.live}
                        data-hz-expression-time-range-recent-range-timezone={range.tz || range.timezone}
                      >
                        <span className="truncate">{range.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="truncate text-[10px] font-semibold text-[#a9b0bb]">{singleRangeDisplay}</div>
                )}
              </div>
              <div
                className="grid gap-1 border-t border-[var(--hz-ui-line-soft)] pt-1.5"
                data-hz-expression-time-range-panel-section="custom-range"
                data-hz-expression-time-range-custom-range="save-current-range"
                data-hz-expression-time-range-custom-ranges={customRanges.length > 0 ? 'persistent' : 'empty'}
              >
                <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">{resolvedLabels.customRange}</div>
                <label className="grid gap-1">
                  <span className="sr-only">{resolvedLabels.customName}</span>
                  <HzInput
                    type="text"
                    className="h-6 border-[var(--hz-ui-line-soft)] bg-transparent px-1.5 text-[10px]"
                    value={customRangeName}
                    placeholder={resolvedLabels.customName}
                    onChange={event => onCustomRangeNameChange?.(event.target.value)}
                    data-hz-expression-time-range-custom-name-input="true"
                    data-hz-expression-time-range-custom-name-owner="hertzbeat-ui-time-foundation-picker"
                  />
                </label>
                <HzButton
                  type="button"
                  size="sm"
                  intent="ghost"
                  disabled={!rangeCanApply}
                  onClick={() => {
                    if (!rangeCanApply) return;
                    onCustomRangeSave?.();
                  }}
                  data-hz-expression-time-range-custom-save="current-range"
                  data-hz-expression-time-range-custom-save-owner="hertzbeat-ui-time-foundation-picker"
                >
                  {resolvedLabels.saveCustomRange}
                </HzButton>
                {customRanges.length > 0 ? (
                  <div className="grid gap-1">
                    {customRanges.map(range => (
                      <div
                        key={range.id}
                        className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1"
                        data-hz-expression-time-range-custom-range-row={range.id}
                      >
                        <button
                          type="button"
                          className="grid min-h-6 min-w-0 border border-transparent bg-transparent px-1.5 py-0.5 text-left text-[10px] font-semibold text-[#a9b0bb] transition-colors hover:border-[var(--hz-ui-line-soft)] hover:bg-[#11151b] hover:text-[#eef2f7]"
                          onClick={() => onCustomRangeSelect?.(range)}
                          data-hz-expression-time-range-custom-range-entry={range.id}
                          data-hz-expression-time-range-custom-range-owner="hertzbeat-ui-time-foundation-picker"
                          data-hz-expression-time-range-custom-range-route-model={resolveHzTimeRangeStoredRangeRouteModel(range)}
                          data-hz-expression-time-range-custom-range-from={range.from}
                          data-hz-expression-time-range-custom-range-to={range.to}
                          data-hz-expression-time-range-custom-range-start={range.start}
                          data-hz-expression-time-range-custom-range-end={range.end}
                          data-hz-expression-time-range-custom-range-refresh={range.refresh}
                          data-hz-expression-time-range-custom-range-live={range.live}
                          data-hz-expression-time-range-custom-range-timezone={range.tz || range.timezone}
                        >
                          <span className="truncate">{range.label}</span>
                        </button>
                        <HzButton
                          type="button"
                          size="sm"
                          intent="ghost"
                          aria-label={`${resolvedLabels.deleteCustomRange}: ${range.label}`}
                          onPointerDown={event => {
                            event.preventDefault();
                            event.stopPropagation();
                            onCustomRangeDelete?.(range);
                          }}
                          onMouseDown={event => {
                            event.preventDefault();
                            event.stopPropagation();
                            onCustomRangeDelete?.(range);
                          }}
                          onClick={() => onCustomRangeDelete?.(range)}
                          data-hz-expression-time-range-custom-range-delete={range.id}
                          data-hz-expression-time-range-custom-range-delete-owner="hertzbeat-ui-time-foundation-picker"
                          data-hz-expression-time-range-custom-range-delete-label={resolvedLabels.deleteCustomRange}
                        >
                          {resolvedLabels.deleteCustomRange}
                        </HzButton>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
            <section className="grid min-h-0 min-w-0 gap-1.5 overflow-y-auto p-1.5" data-hz-expression-time-range-panel-section="absolute-picker">
              <div className="text-[11px] font-semibold text-[#f3f6fb]">{resolvedLabels.absoluteTitle}</div>
              <div
                className="grid grid-cols-2 gap-1"
                data-hz-expression-time-range-relative-entry="manual-from-to-fields"
                data-hz-expression-time-range-relative-visibility="merged-with-absolute-fields"
                data-hz-expression-time-range-manual-fields-layout="one-line-two-column"
                data-hz-expression-time-range-manual-fields-density="compact"
              >
                {fieldButtons.map(item => (
                  <label
                    key={`panel-${item.field}`}
                    className={cn(
                      'grid h-7 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1 border px-1.5 text-left transition-colors',
                      activeField === item.field
                        ? 'border-[var(--hz-ui-line-strong)] bg-[#11151b]'
                        : 'border-[var(--hz-ui-line-soft)] bg-transparent hover:bg-[#11151b]'
                    )}
                    data-hz-expression-time-range-panel-field={item.expressionField}
                    data-hz-expression-time-range-validation-field={item.expressionField}
                    data-hz-expression-time-range-validation-state={item.field === 'start' ? fromValidationState : toValidationState}
                    data-hz-expression-time-range-manual-field-height="28"
                  >
                    <span className="shrink-0 text-[9px] font-semibold text-[#727b8c]">{item.label}</span>
                    <HzInput
                      type="text"
                      className="h-6 min-w-0 border-0 bg-transparent px-0 font-mono text-[10px] text-[#e5edf7] shadow-none focus-visible:ring-0"
                      value={
                        usesExpressionRange
                          ? formatHzExpressionTimeRangeText(item.expression)
                          : formatHzTimeRangeAbsoluteDraft(item.value, { inputMode: 'text' })
                      }
                      placeholder={resolvedLabels.absolutePlaceholder}
                      onFocus={() => setActiveField(item.field)}
                      onChange={event => {
                        setActiveField(item.field);
                        if (item.field === 'start') {
                          if (usesExpressionRange) {
                            onFromChange?.(event.target.value);
                          } else {
                            onStartChange?.(event.target.value);
                          }
                        } else {
                          if (usesExpressionRange) {
                            onToChange?.(event.target.value);
                          } else {
                            onEndChange?.(event.target.value);
                          }
                        }
                      }}
                      aria-label={item.aria}
                      aria-invalid={(item.field === 'start' ? fromValidationState : toValidationState) === 'invalid' ? true : undefined}
                      data-hz-expression-time-range-manual-input={item.expressionField}
                      data-hz-expression-time-range-manual-input-width="readable-datetime"
                      data-hz-expression-time-range-manual-input-mode="text"
                      data-hz-expression-time-range-manual-input-validation={item.field === 'start' ? fromValidationState : toValidationState}
                    />
                  </label>
                ))}
              </div>
              <div
                className={cn(
                  'border px-1.5 py-1 text-[10px] font-semibold',
                  rangeValidationState === 'invalid'
                    ? 'border-[#7f1d1d] bg-[#1a0c0c] text-[#fca5a5]'
                    : 'border-[var(--hz-ui-line-soft)] bg-[#080b10] text-[#8fa3bd]'
                )}
                data-hz-expression-time-range-validation-owner="hertzbeat-ui-time-foundation-picker"
                data-hz-expression-time-range-validation-state={rangeValidationState}
              >
                {rangeValidationState === 'invalid' ? resolvedLabels.validationInvalid : resolvedLabels.validationValid}
              </div>
              <div
                className="grid gap-1.5 border border-[var(--hz-ui-line-soft)] bg-[#080b10] p-1.5"
                data-hz-expression-calendar="layered"
                data-hz-expression-calendar-owner="hertzbeat-ui-time-foundation-picker"
                data-hz-expression-calendar-value={`${activeParts.year}-${padHzTimeRangePart(activeParts.month)}`}
                data-hz-expression-calendar-layer={calendarView}
              >
                {calendarView === 'day' ? (
                  <>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1">
                      <button
                        type="button"
                        className={cn('inline-flex h-6 w-6 items-center justify-center text-[#a9b0bb] hover:text-white', controlFocusClassName)}
                        aria-label={resolvedLabels.previousMonth}
                        onClick={() => moveActiveMonth(-1)}
                        data-hz-expression-calendar-month-page-action="previous"
                      >
                        <ChevronLeft size={13} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={cn('h-6 min-w-0 truncate text-center text-[13px] font-semibold text-[#e5edf7] hover:text-white', controlFocusClassName)}
                        onClick={() => setCalendarView('month')}
                        data-hz-expression-calendar-layer-action="month"
                        data-hz-expression-calendar-month-title={calendarMonthTitle}
                      >
                        {calendarMonthTitle}
                      </button>
                      <button
                        type="button"
                        className={cn('inline-flex h-6 w-6 items-center justify-center text-[#a9b0bb] hover:text-white', controlFocusClassName)}
                        aria-label={resolvedLabels.nextMonth}
                        onClick={() => moveActiveMonth(1)}
                        data-hz-expression-calendar-month-page-action="next"
                      >
                        <ChevronRight size={13} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-semibold uppercase tracking-[0.08em] text-[#6fa0ff]">
                      {resolvedLabels.weekdays.map(day => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: leadingBlankDays }, (_, index) => (
                        <span key={`blank-${index}`} aria-hidden="true" />
                      ))}
                      {Array.from({ length: daysInMonth }, (_, index) => {
                        const day = index + 1;
                        const selected = day === activeParts.day;
                        const dayValue = `${activeParts.year}-${padHzTimeRangePart(activeParts.month)}-${padHzTimeRangePart(day)}`;
                        return (
                          <button
                            key={day}
                            type="button"
                            className={cn(
                              'h-7 border text-[12px] font-semibold transition-colors',
                              selected
                                ? 'border-transparent bg-[#3f74dc] text-white'
                                : 'border-transparent bg-transparent text-[#c7cad7] hover:bg-[#11151b] hover:text-white'
                            )}
                            aria-label={`Select date ${dayValue}`}
                            onClick={() => setActiveParts({ day })}
                            data-hz-expression-calendar-day="true"
                            data-hz-expression-calendar-day-owner="hertzbeat-ui-time-foundation-picker"
                            data-hz-expression-calendar-day-value={dayValue}
                            data-hz-expression-calendar-day-selected={selected ? 'true' : 'false'}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : null}
                {calendarView === 'month' ? (
                  <>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1">
                      <button
                        type="button"
                        className={cn('inline-flex h-6 w-6 items-center justify-center text-[#a9b0bb] hover:text-white', controlFocusClassName)}
                        aria-label={resolvedLabels.previousYears}
                        onClick={() => moveActiveYear(-1)}
                        data-hz-expression-calendar-year-page-action="previous"
                      >
                        <ChevronLeft size={13} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={cn('h-6 min-w-0 truncate text-center text-[13px] font-semibold text-[#e5edf7] hover:text-white', controlFocusClassName)}
                        onClick={() => setCalendarView('year')}
                        data-hz-expression-calendar-layer-action="year"
                        data-hz-expression-calendar-month-year-title={String(activeParts.year)}
                      >
                        {activeParts.year}
                      </button>
                      <button
                        type="button"
                        className={cn('inline-flex h-6 w-6 items-center justify-center text-[#a9b0bb] hover:text-white', controlFocusClassName)}
                        aria-label={resolvedLabels.nextYears}
                        onClick={() => moveActiveYear(1)}
                        data-hz-expression-calendar-year-page-action="next"
                      >
                        <ChevronRight size={13} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1" data-hz-expression-calendar-month-grid="true">
                      {resolvedLabels.months.map((monthLabel, index) => {
                        const month = index + 1;
                        const selected = month === activeParts.month;
                        return (
                          <button
                            key={monthLabel}
                            type="button"
                            className={cn(
                              'h-8 min-w-0 border px-1 text-[12px] font-semibold transition-colors',
                              selected
                                ? 'border-transparent bg-[#3f74dc] text-white'
                                : 'border-transparent bg-transparent text-[#c7cad7] hover:bg-[#11151b] hover:text-white'
                            )}
                            onClick={() => {
                              setActiveParts({ month });
                              setCalendarView('day');
                            }}
                            data-hz-expression-calendar-month-option={String(month)}
                            data-hz-expression-calendar-month-option-selected={selected ? 'true' : 'false'}
                          >
                            {monthLabel}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : null}
                {calendarView === 'year' ? (
                  <>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1">
                      <button
                        type="button"
                        className={cn('inline-flex h-6 w-6 items-center justify-center text-[#a9b0bb] hover:text-white', controlFocusClassName)}
                        aria-label={resolvedLabels.previousYears}
                        onClick={() => setYearPageStart(previous => clampHzExpressionTimeRangeYearPageStart(previous - HZ_EXPRESSION_TIME_RANGE_YEAR_STEP))}
                        disabled={yearPageStart <= HZ_EXPRESSION_TIME_RANGE_YEAR_MIN}
                        data-hz-expression-calendar-year-page-action="previous"
                      >
                        <ChevronLeft size={13} aria-hidden="true" />
                      </button>
                      <div
                        className="min-w-0 truncate text-center text-[13px] font-semibold text-[#e5edf7]"
                        data-hz-expression-calendar-year-range={calendarYearRange}
                      >
                        {calendarYearRange}
                      </div>
                      <button
                        type="button"
                        className={cn('inline-flex h-6 w-6 items-center justify-center text-[#a9b0bb] hover:text-white', controlFocusClassName)}
                        aria-label={resolvedLabels.nextYears}
                        onClick={() => setYearPageStart(previous => clampHzExpressionTimeRangeYearPageStart(previous + HZ_EXPRESSION_TIME_RANGE_YEAR_STEP))}
                        disabled={yearPageStart >= HZ_EXPRESSION_TIME_RANGE_YEAR_MAX - HZ_EXPRESSION_TIME_RANGE_YEAR_PAGE_SIZE + 1}
                        data-hz-expression-calendar-year-page-action="next"
                      >
                        <ChevronRight size={13} aria-hidden="true" />
                      </button>
                    </div>
                    <div
                      className="grid grid-cols-3 gap-1"
                      data-hz-expression-calendar-year-mode="decade-grid"
                      data-hz-expression-calendar-year-grid="true"
                      data-hz-expression-calendar-year-min={String(HZ_EXPRESSION_TIME_RANGE_YEAR_MIN)}
                      data-hz-expression-calendar-year-max={String(HZ_EXPRESSION_TIME_RANGE_YEAR_MAX)}
                      data-hz-expression-calendar-year-page-size={String(HZ_EXPRESSION_TIME_RANGE_YEAR_PAGE_SIZE)}
                      data-hz-expression-calendar-year-page-step={String(HZ_EXPRESSION_TIME_RANGE_YEAR_STEP)}
                    >
                      {yearGrid.map(year => {
                        const selected = year === activeParts.year;
                        return (
                          <button
                            key={year}
                            type="button"
                            className={cn(
                              'h-8 border px-1 text-[12px] font-semibold transition-colors',
                              selected
                                ? 'border-transparent bg-[#3f74dc] text-white'
                                : 'border-transparent bg-transparent text-[#c7cad7] hover:bg-[#11151b] hover:text-white'
                            )}
                            onClick={() => {
                              setActiveYear(year);
                              setCalendarView('month');
                            }}
                            data-hz-expression-calendar-year-option={String(year)}
                            data-hz-expression-calendar-year-option-owner="hertzbeat-ui-time-foundation-picker"
                            data-hz-expression-calendar-year-option-selected={selected ? 'true' : 'false'}
                          >
                            {year}
                          </button>
                        );
                      })}
                    </div>
                    <label className="grid gap-1">
                      <span className="sr-only">{resolvedLabels.year}</span>
                      <HzInput
                        type="number"
                        min={HZ_EXPRESSION_TIME_RANGE_YEAR_MIN}
                        max={HZ_EXPRESSION_TIME_RANGE_YEAR_MAX}
                        inputMode="numeric"
                        className="h-6 min-w-0 border-[var(--hz-ui-line-soft)] bg-transparent px-1.5 font-mono text-[10px]"
                        value={String(activeParts.year)}
                        aria-label={resolvedLabels.year}
                        onChange={event => {
                          const nextValue = event.target.value.trim();
                          if (!nextValue) return;
                          setActiveYear(Number(nextValue));
                        }}
                        data-hz-expression-calendar-year-input="manual"
                        data-hz-expression-calendar-year-input-owner="hertzbeat-ui-time-foundation-picker"
                      />
                    </label>
                  </>
                ) : null}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { unit: 'hour' as const, label: resolvedLabels.hour, value: activeParts.hour, max: 23 },
                  { unit: 'minute' as const, label: resolvedLabels.minute, value: activeParts.minute, max: 59 },
                  { unit: 'second' as const, label: resolvedLabels.second, value: activeParts.second, max: 59 }
                ].map(item => (
                  <div key={item.unit} className="grid min-w-0 gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]" id={`${panelId}-${item.unit}`}>
                      {item.label}
                    </span>
                    <div
                      className="min-w-0"
                      data-hz-expression-time-stepper={item.unit}
                      data-hz-expression-time-stepper-owner="hertzbeat-ui-time-foundation-picker"
                      data-hz-expression-time-stepper-unit={item.unit}
                      data-hz-expression-time-stepper-value={item.value}
                    >
                      <HzNumberStepper
                        min="0"
                        max={String(item.max)}
                        step="1"
                        inputMode="numeric"
                        containerClassName="h-7 border-[var(--hz-ui-line-soft)] bg-transparent"
                        className="px-1.5 font-mono text-[10px]"
                        value={item.value}
                        aria-label={item.label}
                        aria-labelledby={`${panelId}-${item.unit}`}
                        decrementLabel={`${resolvedLabels.decrease} ${item.label}`}
                        incrementLabel={`${resolvedLabels.increase} ${item.label}`}
                        actionDataAttributeName="data-hz-expression-time-stepper-action"
                        onValueChange={nextValue => {
                          setActiveParts({
                            [item.unit]: normalizeHzExpressionTimeRangeUnitInput(nextValue, item.max)
                          });
                        }}
                        data-hz-expression-time-input={item.unit}
                        data-hz-expression-time-input-owner="hertzbeat-ui-time-foundation-picker"
                        data-hz-expression-time-input-mode="manual-stepper"
                        data-hz-expression-time-input-unit={item.unit}
                        data-hz-expression-time-input-value={item.value}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <div className="flex justify-end gap-1 border-t border-[var(--hz-ui-line-soft)] bg-[#07090d] p-1.5">
            <HzButton
              type="button"
              size="sm"
              intent="ghost"
              onClick={() => setActiveValue('')}
              data-hz-expression-time-range-action="clear"
              data-hz-expression-time-range-action-owner="hertzbeat-ui-time-foundation-picker"
            >
              {resolvedLabels.clear}
            </HzButton>
            <HzButton
              type="button"
              size="sm"
              intent="secondary"
              disabled={!rangeCanApply}
              onClick={() => {
                if (!rangeCanApply) return;
                onApply?.();
                setOpen(false);
              }}
              data-hz-expression-time-range-action="apply"
              data-hz-expression-time-range-apply-owner="hertzbeat-ui-time-foundation-picker"
              data-hz-expression-time-range-apply-state={rangeCanApply ? 'enabled' : 'disabled'}
            >
              {resolvedLabels.applyAria}
            </HzButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const timeRangeToolbarControlClassName =
  'h-7 !rounded-none border-[var(--hz-ui-line-soft)] bg-transparent px-1.5 text-[10px] tracking-[0.02em] !shadow-none hover:border-[var(--hz-ui-accent-muted)] hover:bg-[var(--hz-ui-surface-soft)]';

const timeRangeToolbarButtonClassName =
  'min-w-0 text-[10px] tracking-[0.02em]';

function resolveHzTimeRangeTimezoneOptionValue(option: HzSelectOption) {
  return option.value || 'local';
}

function resolveHzTimeRangeTimezoneOptionMode(option: HzSelectOption) {
  return option.value ? 'named' : 'local';
}

function resolveHzTimeRangeTimezoneOptionRouteKey(option: HzSelectOption) {
  return option.value ? 'timezone' : 'local';
}

export function HzTimeRangeToolbar({
  value,
  presets = DEFAULT_HZ_TIME_RANGE_PRESETS,
  refreshOptions = DEFAULT_HZ_TIME_REFRESH_OPTIONS,
  timezoneOptions = DEFAULT_HZ_TIMEZONE_OPTIONS,
  labels,
  recentRanges = [],
  recentStorageKey = DEFAULT_HZ_TIME_RANGE_RECENT_STORAGE_KEY,
  maxRecentRanges = DEFAULT_HZ_TIME_RANGE_RECENT_MAX,
  customRanges = [],
  customStorageKey = DEFAULT_HZ_TIME_RANGE_CUSTOM_STORAGE_KEY,
  maxCustomRanges = DEFAULT_HZ_TIME_RANGE_CUSTOM_MAX,
  onApply,
  onRefresh,
  onReset,
  showAbsoluteFields,
  absoluteFieldsLayout = 'stack',
  absoluteInputMode = 'text',
  timeRangePickerMode = 'split',
  railLayout = 'wrap',
  previewSource,
  timePickerDefaultOpen,
  presetSelectProps,
  presetOptionDataAttribute,
  refreshActionProps,
  className,
  ...props
}: HzTimeRangeToolbarProps) {
  const resolvedLabels = { ...DEFAULT_HZ_TIME_RANGE_LABELS, ...labels };
  const resolvedPresets = presets.length ? presets : DEFAULT_HZ_TIME_RANGE_PRESETS;
  const fallbackTimeRange = resolvedPresets[0]?.value || '';
  const valueTimeRange = value.timeRange || '';
  const valueFrom = value.from || '';
  const valueTo = value.to || '';
  const valueStart = value.start || '';
  const valueEnd = value.end || '';
  const valueRefresh = value.refresh || '';
  const valueLive = value.live || '';
  const valueTimezone = value.tz || value.timezone || '';
  const appliedValue = React.useMemo(
    () =>
      normalizeHzTimeRangeToolbarValue(
        {
          timeRange: valueTimeRange,
          from: valueFrom,
          to: valueTo,
          start: valueStart,
          end: valueEnd,
          refresh: valueRefresh,
          live: valueLive,
          tz: valueTimezone
        },
        fallbackTimeRange,
        absoluteInputMode
      ),
    [absoluteInputMode, fallbackTimeRange, valueEnd, valueFrom, valueLive, valueRefresh, valueStart, valueTimeRange, valueTimezone, valueTo]
  );
  const appliedSignature = stableHzTimeRangeToolbarSignature(appliedValue, fallbackTimeRange, absoluteInputMode);
  const [draft, setDraft] = React.useState<Required<HzTimeRangeToolbarValue>>(() => appliedValue);
  const [storedRecentRanges, setStoredRecentRanges] = React.useState<HzTimeRangeRecentRange[]>(() =>
    mergeHzTimeRangeRecentRanges(recentRanges, maxRecentRanges)
  );
  const [storedCustomRanges, setStoredCustomRanges] = React.useState<HzTimeRangeCustomRange[]>(() =>
    mergeHzTimeRangeCustomRanges(customRanges, maxCustomRanges)
  );
  const [deletedCustomRangeIds, setDeletedCustomRangeIds] = React.useState<string[]>([]);
  const [customRangeName, setCustomRangeName] = React.useState('');
  const recentRangesSignature = JSON.stringify(recentRanges);
  const customRangesSignature = JSON.stringify(customRanges);
  const deletedCustomRangeIdsSignature = deletedCustomRangeIds.join('|');

  React.useEffect(() => {
    setDraft(appliedValue);
  }, [appliedValue]);

  React.useEffect(() => {
    setStoredRecentRanges(
      mergeHzTimeRangeRecentRanges([...recentRanges, ...readHzTimeRangeRecentRanges(recentStorageKey)], maxRecentRanges)
    );
    // recentRangesSignature keeps inline prop arrays from retriggering this effect on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxRecentRanges, recentRangesSignature, recentStorageKey]);

  React.useEffect(() => {
    const deletedCustomRangeIdSet = new Set(deletedCustomRangeIds);
    setStoredCustomRanges(
      mergeHzTimeRangeCustomRanges([...customRanges, ...readHzTimeRangeCustomRanges(customStorageKey)], maxCustomRanges)
        .filter(range => !deletedCustomRangeIdSet.has(range.id))
    );
    // customRangesSignature keeps inline prop arrays from retriggering this effect on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customRangesSignature, customStorageKey, maxCustomRanges, deletedCustomRangeIdsSignature]);

  const draftSignature = stableHzTimeRangeToolbarSignature(draft, fallbackTimeRange, absoluteInputMode);
  const dirty = draftSignature !== appliedSignature;
  const useSingleTimePicker = absoluteInputMode === 'datetime-local' && timeRangePickerMode === 'single';
  const usesExpressionFromToModel = Boolean(draft.from || draft.to);
  const showAbsolute = Boolean(useSingleTimePicker || showAbsoluteFields || draft.start || draft.end);
  const draftValidationState = usesExpressionFromToModel || showAbsolute
    ? resolveHzExpressionTimeRangePairValidationState(
      usesExpressionFromToModel ? draft.from : draft.start,
      usesExpressionFromToModel ? draft.to : draft.end
    )
    : 'valid';
  const canApplyDraft = draftValidationState !== 'invalid';
  const singleRail = railLayout === 'nowrap';
  const toolbarRefreshInterval = draft.live === 'false' || !draft.refresh ? undefined : draft.refresh;
  const toolbarRefreshMode = toolbarRefreshInterval ? 'auto' : 'manual';
  const toolbarLiveState = toolbarRefreshInterval ? 'running' : 'paused';
  const toolbarTimezoneValue = draft.tz || draft.timezone || '';
  const toolbarTimezoneMode = toolbarTimezoneValue ? 'named' : 'local';
  const toolbarTimezoneRouteKey = toolbarTimezoneValue ? 'timezone' : 'local';
  const toolbarLabelClassName = singleRail
    ? 'sr-only'
    : 'text-[10px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]';
  const compactActionIconSize = 13;
  const getTimezoneOptionDataAttributes = (option: HzSelectOption) => ({
    'data-hz-time-range-toolbar-timezone-option': resolveHzTimeRangeTimezoneOptionValue(option),
    'data-hz-time-range-toolbar-timezone-option-route-key': resolveHzTimeRangeTimezoneOptionRouteKey(option),
    'data-hz-time-range-toolbar-timezone-option-mode': resolveHzTimeRangeTimezoneOptionMode(option)
  });

  const setDraftField = (field: keyof Required<HzTimeRangeToolbarValue>, nextValue: string) => {
    if (field === 'refresh') {
      setDraft(current => ({
        ...current,
        refresh: nextValue,
        live: resolveHzTimeRangeToolbarLiveDraft(nextValue)
      }));
      return;
    }
    setDraft(current => ({ ...current, [field]: nextValue, ...(field === 'tz' ? { timezone: nextValue } : {}) }));
  };

  const persistRecentRange = (nextValue: HzTimeRangeToolbarValue) => {
    const nextRange = normalizeHzTimeRangeRecentRange(nextValue);
    const nextRecentRanges = mergeHzTimeRangeRecentRanges([nextRange, ...storedRecentRanges], maxRecentRanges);
    setStoredRecentRanges(nextRecentRanges);
    writeHzTimeRangeRecentRanges(recentStorageKey, nextRecentRanges);
  };
  const persistCustomRange = () => {
    if (!canApplyDraft) return;
    const nextValue = emitHzTimeRangeToolbarValue(draft);
    const nextRange = {
      ...normalizeHzTimeRangeRecentRange(nextValue),
      label: customRangeName.trim() || formatHzTimeRangeRecentRangeLabel(nextValue)
    };
    const nextCustomRanges = mergeHzTimeRangeCustomRanges([nextRange, ...storedCustomRanges], maxCustomRanges);
    setDeletedCustomRangeIds(current => current.filter(id => id !== nextRange.id));
    setStoredCustomRanges(nextCustomRanges);
    writeHzTimeRangeCustomRanges(customStorageKey, nextCustomRanges);
    setCustomRangeName('');
  };
  const deleteCustomRange = (range: HzTimeRangeCustomRange) => {
    setDeletedCustomRangeIds(current => current.includes(range.id) ? current : [...current, range.id]);
    const nextCustomRanges = storedCustomRanges.filter(item => item.id !== range.id);
    setStoredCustomRanges(nextCustomRanges);
    writeHzTimeRangeCustomRanges(customStorageKey, nextCustomRanges);
  };
  const emitApply = () => {
    const nextValue = emitHzTimeRangeToolbarValue(draft);
    persistRecentRange(nextValue);
    onApply?.(nextValue);
  };
  const emitReset = () => {
    setDraft(appliedValue);
    onReset?.();
  };
  const restoreRecentRange = (range: HzTimeRangeRecentRange) => {
    setDraft(current => ({
      ...current,
      timeRange: range.timeRange || current.timeRange,
      from: range.from || '',
      to: range.to || '',
      start: range.start || '',
      end: range.end || '',
      refresh: range.refresh ?? current.refresh,
      live: range.live ?? current.live,
      tz: range.tz || range.timezone || current.tz,
      timezone: range.timezone || range.tz || current.timezone
    }));
  };
  const restoreCustomRange = (range: HzTimeRangeCustomRange) => restoreRecentRange(range);

  return (
    <div
      {...props}
      className={cn(
        singleRail
          ? 'min-w-0 overflow-x-auto border-b border-[var(--hz-ui-line-soft)] bg-transparent px-0 py-0.5'
          : 'flex min-w-0 flex-wrap items-end gap-1.5 border-b border-[var(--hz-ui-line-soft)] bg-transparent px-0 py-2',
        className
      )}
      data-hz-ui="time-range-toolbar"
      data-hz-time-range-toolbar-owner="hertzbeat-ui-time-range-toolbar"
      data-hz-time-range-toolbar-state={previewSource ? 'preview' : dirty ? 'draft' : 'applied'}
      data-hz-time-range-toolbar-preview-source={previewSource}
      data-hz-time-range-toolbar-refresh-mode={toolbarRefreshMode}
      data-hz-time-range-toolbar-refresh-interval={toolbarRefreshInterval}
      data-hz-time-range-toolbar-live-state={toolbarLiveState}
      data-hz-time-range-toolbar-timezone-mode={toolbarTimezoneMode}
      data-hz-time-range-toolbar-timezone-value={toolbarTimezoneValue || undefined}
      data-hz-time-range-toolbar-timezone-route-key={toolbarTimezoneRouteKey}
      data-hz-time-range-toolbar-card="false"
      data-hz-time-range-toolbar-layout="compact-lined-controls"
      data-hz-time-range-toolbar-density={singleRail ? 'operator-single-row-tight' : 'operator-wrap-compact'}
      data-hz-time-range-toolbar-control-height={singleRail ? '28' : '32'}
      data-hz-time-range-toolbar-action-mode={singleRail ? 'icon-text' : 'text'}
      data-hz-time-range-toolbar-rail-layout={railLayout}
      data-hz-time-range-toolbar-overflow={singleRail ? 'horizontal-scroll' : undefined}
      data-hz-time-range-toolbar-family="signal-handoff-toolbar"
      data-hz-time-range-toolbar-action-family="signal-handoff-toolbar"
      data-hz-time-range-toolbar-select-family="signal-handoff-toolbar"
      data-hz-time-range-toolbar-model={usesExpressionFromToModel ? 'expression-from-to' : undefined}
      data-hz-time-range-toolbar-validation-state={draftValidationState}
      data-hz-time-range-toolbar-recent-ranges={storedRecentRanges.length ? 'persistent' : 'empty'}
      data-hz-time-range-toolbar-recent-storage-key={recentStorageKey}
      data-hz-time-range-toolbar-custom-ranges={storedCustomRanges.length ? 'persistent' : 'empty'}
      data-hz-time-range-toolbar-custom-storage-key={customStorageKey}
      data-hz-time-range-toolbar-time-entry={useSingleTimePicker ? 'single-expression-picker' : 'split-controls'}
      data-hz-time-range-toolbar-preset-placement={useSingleTimePicker ? 'picker-panel' : 'toolbar-select'}
      data-hz-time-range-toolbar-absolute={useSingleTimePicker ? 'picker-panel' : showAbsolute ? 'visible' : undefined}
      data-hz-time-range-toolbar-absolute-layout={useSingleTimePicker ? 'single-picker' : undefined}
    >
      <div
        className={cn(
          singleRail
            ? 'flex min-w-max flex-nowrap items-center gap-0.5'
            : 'flex min-w-0 flex-wrap items-end gap-1.5'
        )}
        data-hz-time-range-toolbar-rail={singleRail ? 'single-line' : 'wrap'}
      >
        {useSingleTimePicker ? (
          <div
            className={cn('grid gap-1', singleRail ? 'min-w-[200px] max-w-[280px] flex-[0_1_280px]' : 'min-w-[260px] max-w-[430px] flex-[0_1_430px]')}
            data-hz-time-range-toolbar-time-entry="single-expression-picker"
            data-hz-time-range-toolbar-preset-placement="picker-panel"
            data-hz-time-range-toolbar-absolute="picker-panel"
            data-hz-time-range-toolbar-absolute-layout="single-picker"
          >
            <span className={toolbarLabelClassName}>{resolvedLabels.preset}</span>
            <HzExpressionTimeRangePicker
              timeRange={draft.timeRange}
              from={draft.from}
              to={draft.to}
              start={draft.start}
              end={draft.end}
              labels={resolvedLabels}
              presets={resolvedPresets}
              recentRanges={storedRecentRanges}
              customRanges={storedCustomRanges}
              customRangeName={customRangeName}
              variant="single"
              triggerClassName={timeRangeToolbarControlClassName}
              defaultOpen={timePickerDefaultOpen}
              onFromChange={nextValue => setDraftField('from', nextValue)}
              onToChange={nextValue => setDraftField('to', nextValue)}
              onStartChange={nextValue => setDraftField('start', nextValue)}
              onEndChange={nextValue => setDraftField('end', nextValue)}
              onPresetSelect={nextValue => setDraft(current => ({ ...current, timeRange: nextValue, from: '', to: '', start: '', end: '' }))}
              onRecentRangeSelect={restoreRecentRange}
              onCustomRangeNameChange={setCustomRangeName}
              onCustomRangeSave={persistCustomRange}
              onCustomRangeSelect={restoreCustomRange}
              onCustomRangeDelete={deleteCustomRange}
              onApply={emitApply}
              data-hz-time-range-toolbar-absolute-control="expression-time-range-picker"
              data-hz-time-range-toolbar-absolute-input-mode="manual-text-with-picker"
            />
          </div>
        ) : (
          <label className="grid min-w-[220px] max-w-[360px] flex-[0_1_360px] gap-1" data-hz-time-range-toolbar-preset-width="compact">
            <span className={toolbarLabelClassName}>{resolvedLabels.preset}</span>
            <HzSelect
              {...presetSelectProps}
              className={cn('min-w-0', presetSelectProps?.className)}
              options={resolvedPresets}
              value={draft.timeRange}
              onChange={event => setDraft(current => ({ ...current, timeRange: event.target.value, from: '', to: '', start: '', end: '' }))}
              aria-label={resolvedLabels.preset}
              triggerClassName={timeRangeToolbarControlClassName}
              data-hz-time-range-toolbar-select-family="signal-handoff-toolbar"
            />
          </label>
        )}
        {presetOptionDataAttribute ? (
          <span className="sr-only" data-hz-time-range-toolbar-options="true">
            {resolvedPresets.map(option => (
              <span key={option.value} {...{ [presetOptionDataAttribute]: option.value }}>
                {option.label}
              </span>
            ))}
          </span>
        ) : null}
        {!useSingleTimePicker && showAbsolute ? (
          <div
            className={cn(
              absoluteFieldsLayout === 'inline'
                ? cn('flex min-w-0 items-end gap-1.5', singleRail ? 'flex-nowrap' : 'flex-wrap')
                : 'grid min-w-0 flex-[1_1_100%] gap-1.5 md:grid-cols-2'
            )}
            data-hz-time-range-toolbar-absolute="visible"
            data-hz-time-range-toolbar-absolute-layout={absoluteFieldsLayout}
          >
            {absoluteInputMode === 'datetime-local' ? (
              <HzExpressionTimeRangePicker
                start={draft.start}
                end={draft.end}
                labels={resolvedLabels}
                presets={resolvedPresets}
                recentRanges={storedRecentRanges}
                customRanges={storedCustomRanges}
                customRangeName={customRangeName}
                triggerClassName={timeRangeToolbarControlClassName}
                defaultOpen={timePickerDefaultOpen}
                onStartChange={nextValue => setDraftField('start', nextValue)}
                onEndChange={nextValue => setDraftField('end', nextValue)}
                onPresetSelect={nextValue => setDraft(current => ({ ...current, timeRange: nextValue, from: '', to: '', start: '', end: '' }))}
                onRecentRangeSelect={restoreRecentRange}
                onCustomRangeNameChange={setCustomRangeName}
                onCustomRangeSave={persistCustomRange}
                onCustomRangeSelect={restoreCustomRange}
                onCustomRangeDelete={deleteCustomRange}
                onApply={emitApply}
                data-hz-time-range-toolbar-absolute-control="expression-time-range-picker"
                data-hz-time-range-toolbar-absolute-input-mode="datetime-local"
              />
            ) : (
              [
                { field: 'start' as const, label: resolvedLabels.start, value: draft.start },
                { field: 'end' as const, label: resolvedLabels.end, value: draft.end }
              ].map(item => (
                <label
                  key={item.field}
                  className={cn(
                    'grid min-w-0 gap-1',
                    absoluteFieldsLayout === 'inline'
                      ? singleRail
                        ? 'min-w-[172px] max-w-[190px] flex-[0_0_182px]'
                        : 'min-w-[150px] max-w-[220px] flex-[0_1_180px]'
                      : undefined
                  )}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">{item.label}</span>
                  <HzInput
                    type="text"
                    className={timeRangeToolbarControlClassName}
                    value={item.value}
                    onChange={event => setDraftField(item.field, event.target.value)}
                    aria-label={item.label}
                    data-hz-time-range-toolbar-absolute-input-mode={absoluteInputMode}
                    data-hz-time-range-toolbar-absolute-control="text-input"
                  />
                </label>
              ))
            )}
          </div>
        ) : null}
        <label className={cn('grid gap-1', singleRail ? 'min-w-[76px]' : 'min-w-[110px]')}>
          <span className={toolbarLabelClassName}>{resolvedLabels.refresh}</span>
          <HzSelect
            className="min-w-0"
            options={refreshOptions}
            value={draft.refresh}
            onChange={event => setDraftField('refresh', event.target.value)}
            aria-label={resolvedLabels.refresh}
            triggerClassName={timeRangeToolbarControlClassName}
            data-hz-time-range-toolbar-select-family="signal-handoff-toolbar"
          />
        </label>
        <label className={cn('grid gap-1', singleRail ? 'min-w-[112px]' : 'min-w-[140px]')}>
          <span className={toolbarLabelClassName}>{resolvedLabels.timezone}</span>
          <HzSelect
            className="min-w-0"
            options={timezoneOptions}
            value={draft.tz}
            onChange={event => setDraftField('tz', event.target.value)}
            aria-label={resolvedLabels.timezone}
            triggerClassName={timeRangeToolbarControlClassName}
            data-hz-time-range-toolbar-select-family="signal-handoff-toolbar"
            data-hz-time-range-toolbar-timezone-control="shared-timezone-select"
            data-hz-time-range-toolbar-timezone-owner="hertzbeat-ui-time-range-toolbar"
            optionDataAttributes={getTimezoneOptionDataAttributes}
          />
          <span className="sr-only" data-hz-time-range-toolbar-timezone-options="local-named">
            {timezoneOptions.map(option => (
              <span key={resolveHzTimeRangeTimezoneOptionValue(option)} {...getTimezoneOptionDataAttributes(option)}>
                {option.label}
              </span>
            ))}
          </span>
        </label>
        <div className={cn('flex min-w-0 items-end justify-end', singleRail ? 'gap-0.5' : 'gap-1.5')}>
          {onRefresh ? (
            singleRail ? (
              <HzButton
                {...refreshActionProps}
                type="button"
                size="sm"
                intent="ghost"
                className={cn(timeRangeToolbarButtonClassName, refreshActionProps?.className)}
                onClick={onRefresh}
                aria-label={resolvedLabels.refreshAction}
                data-hz-time-range-toolbar-action-family="signal-handoff-toolbar"
                data-hz-time-range-toolbar-action="refresh"
              >
                <RefreshCw size={compactActionIconSize} aria-hidden="true" />
                {resolvedLabels.refreshAction}
              </HzButton>
            ) : (
              <HzButton
                {...refreshActionProps}
                type="button"
                size="sm"
                intent="ghost"
                className={cn(timeRangeToolbarButtonClassName, refreshActionProps?.className)}
                onClick={onRefresh}
                aria-label={resolvedLabels.refreshAction}
                data-hz-time-range-toolbar-action-family="signal-handoff-toolbar"
                data-hz-time-range-toolbar-action="refresh"
              >
                {resolvedLabels.refreshAction}
              </HzButton>
            )
          ) : null}
          {singleRail ? (
            <HzButton
              type="button"
              size="sm"
              intent="ghost"
              className={timeRangeToolbarButtonClassName}
              onClick={emitReset}
              aria-label={resolvedLabels.resetAria}
              data-hz-time-range-toolbar-action-family="signal-handoff-toolbar"
              data-hz-time-range-toolbar-action="reset"
            >
              <RotateCcw size={compactActionIconSize} aria-hidden="true" />
              {resolvedLabels.reset}
            </HzButton>
          ) : (
            <HzButton
              type="button"
              size="sm"
              intent="ghost"
              className={timeRangeToolbarButtonClassName}
              onClick={emitReset}
              aria-label={resolvedLabels.resetAria}
              data-hz-time-range-toolbar-action-family="signal-handoff-toolbar"
              data-hz-time-range-toolbar-action="reset"
            >
              {resolvedLabels.reset}
            </HzButton>
          )}
          {singleRail ? (
            <HzButton
              type="button"
              size="sm"
              intent="ghost"
              className={cn(timeRangeToolbarButtonClassName, dirty ? 'text-[#dbe4f0]' : '')}
              disabled={!canApplyDraft}
              onClick={() => {
                if (!canApplyDraft) return;
                emitApply();
              }}
              aria-label={resolvedLabels.applyAria}
              data-hz-time-range-toolbar-action-family="signal-handoff-toolbar"
              data-hz-time-range-toolbar-action="apply"
              data-hz-time-range-toolbar-apply-state={canApplyDraft ? 'enabled' : 'disabled'}
            >
              <Check size={compactActionIconSize} aria-hidden="true" />
              {resolvedLabels.apply}
            </HzButton>
          ) : (
            <HzButton
              type="button"
              size="sm"
              intent="ghost"
              className={cn(timeRangeToolbarButtonClassName, dirty ? 'text-[#dbe4f0]' : '')}
              disabled={!canApplyDraft}
              onClick={() => {
                if (!canApplyDraft) return;
                emitApply();
              }}
              aria-label={resolvedLabels.applyAria}
              data-hz-time-range-toolbar-action-family="signal-handoff-toolbar"
              data-hz-time-range-toolbar-action="apply"
              data-hz-time-range-toolbar-apply-state={canApplyDraft ? 'enabled' : 'disabled'}
            >
              {resolvedLabels.apply}
            </HzButton>
          )}
        </div>
      </div>
    </div>
  );
}

export type HzSelectMenuOption = {
  value: string;
  label: string;
};

export type HzSelectMenuPlacement = 'auto' | 'bottom' | 'top';

export function resolveHzSelectMenuPlacement({
  placement = 'auto',
  triggerTop,
  triggerBottom,
  viewportHeight,
  optionCount,
  optionHeight = 28,
  maxHeight = 240,
  gap = 4
}: {
  placement?: HzSelectMenuPlacement;
  triggerTop: number;
  triggerBottom: number;
  viewportHeight: number;
  optionCount: number;
  optionHeight?: number;
  maxHeight?: number;
  gap?: number;
}) {
  if (placement === 'bottom' || placement === 'top') {
    return placement;
  }
  const listboxHeight = Math.min(maxHeight, Math.max(optionHeight, optionCount * optionHeight + 8));
  const spaceBelow = viewportHeight - triggerBottom;
  const spaceAbove = triggerTop;
  return spaceBelow < listboxHeight + gap && spaceAbove > spaceBelow ? 'top' : 'bottom';
}

export function HzSelectMenu({
  options,
  value,
  onChange,
  placeholder = 'Select',
  className,
  triggerClassName,
  label,
  disabled = false,
  placement = 'auto',
  optionDataAttributes
}: {
  options: HzSelectMenuOption[];
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  label?: string;
  disabled?: boolean;
  placement?: HzSelectMenuPlacement;
  optionDataAttributes?: (option: HzSelectMenuOption) => Record<string, string | undefined>;
}) {
  const [open, setOpen] = React.useState(false);
  const [resolvedPlacement, setResolvedPlacement] = React.useState<'bottom' | 'top'>(
    placement === 'top' ? 'top' : 'bottom'
  );
  const [listboxStyle, setListboxStyle] = React.useState<React.CSSProperties | undefined>(undefined);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const listboxId = React.useId();
  const selected = options.find(option => option.value === value);
  const updatePlacement = React.useCallback(() => {
    if (typeof window === 'undefined') {
      setResolvedPlacement(placement === 'top' ? 'top' : 'bottom');
      return;
    }
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) {
      setResolvedPlacement(placement === 'top' ? 'top' : 'bottom');
      return;
    }
    const nextPlacement = resolveHzSelectMenuPlacement({
      placement,
      triggerTop: rect.top,
      triggerBottom: rect.bottom,
      viewportHeight: window.innerHeight,
      optionCount: options.length
    });
    setResolvedPlacement(nextPlacement);
    setListboxStyle({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
      minWidth: rect.width,
      maxWidth: Math.max(160, window.innerWidth - 16),
      ...(nextPlacement === 'top'
        ? { bottom: Math.max(8, window.innerHeight - rect.top + 4) }
        : { top: Math.min(window.innerHeight - 8, rect.bottom + 4) })
    });
  }, [options.length, placement]);

  React.useEffect(() => {
    if (!open) return;
    updatePlacement();
  }, [open, updatePlacement]);

  return (
    <div
      ref={rootRef}
      className={cn('relative min-w-0', className)}
      data-hz-ui="select-menu"
      onBlur={event => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
        setOpen(false);
      }}
    >
      <button
        type="button"
        disabled={disabled}
        className={cn(
          'grid h-8 w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border border-[var(--hz-ui-line-soft)] bg-transparent px-2.5 text-left text-[11px] font-semibold text-[#eef2f7] shadow-none transition-colors hover:border-[var(--hz-ui-accent-muted)] hover:bg-[var(--hz-ui-surface-soft)] disabled:cursor-not-allowed disabled:opacity-45',
          controlFocusClassName,
          triggerClassName
        )}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => {
          if (!open) {
            updatePlacement();
          }
          setOpen(previous => !previous);
        }}
        data-hz-ui="select-trigger"
        data-hz-control-height="32"
        data-hz-control-edge="lined"
      >
        <span className={cn('truncate', selected ? '' : 'text-[#727b8c]')}>{selected?.label || placeholder}</span>
        <ChevronDown size={12} className={cn('text-[#727b8c] transition-transform', open ? 'rotate-180' : '')} />
      </button>
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className={cn(
            'fixed z-50 max-h-60 w-max overflow-auto border border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-surface-raised)] py-1 shadow-[0_18px_42px_rgba(0,0,0,0.42)]'
          )}
          data-hz-ui="select-listbox"
          data-hz-select-placement={resolvedPlacement}
          style={listboxStyle}
        >
          {options.map(option => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                className={cn(
                  'grid h-7 w-full min-w-[128px] grid-cols-[minmax(0,1fr)_16px] items-center gap-2 px-2.5 text-left text-[11px] transition-colors',
                  active
                    ? 'bg-[var(--hz-ui-active)] text-[#f5f7fb] shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]'
                    : 'text-[#a9b0bb] hover:bg-[var(--hz-ui-surface-soft)] hover:text-[#f5f7fb]'
                )}
                {...optionDataAttributes?.(option)}
                onClick={() => {
                  if (disabled) return;
                  onChange?.(option.value);
                  setOpen(false);
                }}
              >
                <span className="truncate">{option.label}</span>
                {active ? <Check size={11} className="text-[#7c93db]" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export type HzFieldProps = {
  label: React.ReactNode;
  labelMeta?: React.ReactNode;
  hint?: React.ReactNode;
  help?: {
    label: string;
    body: React.ReactNode;
    impact?: React.ReactNode;
  };
  children: React.ReactNode;
  className?: string;
  as?: 'label' | 'div';
  span?: 'auto' | 'wide';
  rhythm?: 'default' | 'section';
} & Omit<React.HTMLAttributes<HTMLElement>, 'children'>;

export function HzField({
  label,
  labelMeta,
  hint,
  help,
  children,
  className,
  as = 'label',
  span = 'auto',
  rhythm = 'default',
  ...props
}: HzFieldProps) {
  const Component = as;
  const helpId = React.useId();
  return (
    <Component
      {...props}
      className={cn('grid min-w-[180px] gap-1.5', span === 'wide' ? 'md:col-span-2' : null, rhythm === 'section' ? 'mt-3' : null, className)}
      data-hz-ui="field"
      data-hz-field-span={span}
      data-hz-field-rhythm={rhythm}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7e8494]">{label}</span>
        {help ? (
          <span
            data-hz-field-help-placement="inline-label"
            className="group relative inline-flex"
          >
            <span
              aria-label={help.label}
              aria-describedby={helpId}
              data-hz-field-help-trigger="hertzbeat-ui-field-help"
              data-hz-field-help-button="icon-after-label"
              data-hz-field-help-visual="circle-help-icon"
              className="inline-flex h-4 w-4 items-center justify-center rounded-[3px] border-0 bg-transparent text-[#8da2ff] transition hover:text-[#f5f7fb] focus:text-[#f5f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
              role="button"
              tabIndex={0}
              title={help.label}
              onClick={event => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onKeyDown={event => {
                event.stopPropagation();
              }}
            >
              <CircleHelp size={12} strokeWidth={2} aria-hidden="true" data-hz-field-help-icon="lucide-circle-help" />
            </span>
            <span
              id={helpId}
              role="tooltip"
              data-hz-field-help="hertzbeat-ui-field-tooltip"
              className="pointer-events-none absolute left-0 top-6 z-20 hidden w-[280px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left normal-case tracking-normal shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover:block group-focus-within:block"
            >
              <span className="block text-[11px] leading-4 text-[#dbe4f0]">{help.body}</span>
              {help.impact ? <span className="mt-2 block border-t border-[#2b3039] pt-2 text-[11px] leading-4 text-[#98a2b3]">{help.impact}</span> : null}
            </span>
          </span>
        ) : null}
        {labelMeta ? <span className="flex min-w-0 items-center gap-1.5">{labelMeta}</span> : null}
      </span>
      {children}
      {hint ? <span className="text-[11px] leading-4 text-[#727b8c]">{hint}</span> : null}
    </Component>
  );
}

export function HzToolbar({
  children,
  className,
  leading,
  trailing
}: {
  children?: React.ReactNode;
  className?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex min-h-11 flex-wrap items-end gap-2 border-y border-[var(--hz-ui-line)] bg-[var(--hz-ui-surface)] px-3 py-2',
        className
      )}
      data-hz-ui="toolbar"
    >
      {leading ? <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">{leading}</div> : children}
      {trailing ? <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">{trailing}</div> : null}
    </div>
  );
}

export function HzMonitorFilterBar({
  searchLabel,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  searchInputProps,
  searchClearLabel,
  onSearchClear,
  searchClearButtonProps,
  labelFilterLabel,
  labelFilterPlaceholder,
  labelFilterValue,
  onLabelFilterChange,
  labelFilterInputProps,
  labelFilterClearLabel,
  onLabelFilterClear,
  labelFilterClearButtonProps,
  typeLabel,
  typeValue,
  typeOptions,
  onTypeChange,
  typeSelectProps,
  typePickerLabel,
  onTypePickerOpen,
  typePickerButtonProps,
  statusLabel,
  statusValue,
  statusOptions,
  onStatusChange,
  statusSelectProps,
  applyLabel,
  clearLabel,
  onApply,
  onClear,
  className,
  applyButtonProps,
  clearButtonProps,
  ...props
}: {
  searchLabel: string;
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange?: (value: string) => void;
  searchInputProps?: Omit<HzInputProps, 'aria-label' | 'onChange' | 'placeholder' | 'value'>;
  searchClearLabel?: string;
  onSearchClear?: () => void;
  searchClearButtonProps?: Omit<HzIconButtonProps, 'label' | 'children' | 'onClick'>;
  labelFilterLabel?: string;
  labelFilterPlaceholder?: string;
  labelFilterValue?: string;
  onLabelFilterChange?: (value: string) => void;
  labelFilterInputProps?: Omit<HzInputProps, 'aria-label' | 'onChange' | 'placeholder' | 'value'>;
  labelFilterClearLabel?: string;
  onLabelFilterClear?: () => void;
  labelFilterClearButtonProps?: Omit<HzIconButtonProps, 'label' | 'children' | 'onClick'>;
  typeLabel: string;
  typeValue: string;
  typeOptions: HzSelectOption[];
  onTypeChange?: (value: string) => void;
  typeSelectProps?: Omit<HzSelectProps, 'value' | 'options' | 'onChange'>;
  typePickerLabel?: React.ReactNode;
  onTypePickerOpen?: () => void;
  typePickerButtonProps?: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>
    | (Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & HzDataAttributeProps);
  statusLabel: string;
  statusValue: string;
  statusOptions: HzSelectOption[];
  onStatusChange?: (value: string) => void;
  statusSelectProps?: Omit<HzSelectProps, 'value' | 'options' | 'onChange'>;
  applyLabel: React.ReactNode;
  clearLabel: React.ReactNode;
  onApply?: () => void;
  onClear?: () => void;
  applyButtonProps?: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>
    | (Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & HzDataAttributeProps);
  clearButtonProps?: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>
    | (Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & HzDataAttributeProps);
} & React.HTMLAttributes<HTMLDivElement>) {
  const typePickerText = typeof typePickerLabel === 'string' ? typePickerLabel : typeLabel;
  const handleEnterSubmit = (
    event: React.KeyboardEvent<HTMLInputElement>,
    existingHandler?: React.KeyboardEventHandler<HTMLInputElement>
  ) => {
    existingHandler?.(event);
    if (event.defaultPrevented || event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    onApply?.();
  };
  const typeSelect = (
    <HzSelect
      {...typeSelectProps}
      aria-label={typeLabel}
      className={cn(onTypePickerOpen ? 'min-w-0 flex-1' : 'w-44', typeSelectProps?.className)}
      options={typeOptions}
      value={typeValue}
      onChange={event => onTypeChange?.(event.target.value)}
      data-hz-monitor-filter-field="type"
    />
  );
  return (
    <div className={cn('min-w-0', className)} data-hz-ui="monitor-filter-bar" {...props}>
      <HzToolbar
        className="border-t-0"
        leading={
          <>
            <div
              className={cn('relative min-w-[260px] flex-[1_1_420px]', searchInputProps?.className)}
              data-hz-monitor-filter-clearable-field="search"
            >
              <HzInput
                {...searchInputProps}
                aria-label={searchLabel}
                className="w-full pr-8"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={event => onSearchChange?.(event.target.value)}
                onKeyDown={event => handleEnterSubmit(event, searchInputProps?.onKeyDown)}
                data-hz-monitor-filter-field="search"
                data-hz-monitor-filter-enter-submit="search"
              />
              {onSearchClear && searchValue ? (
                <HzIconButton
                  {...searchClearButtonProps}
                  type="button"
                  intent="ghost"
                  label={searchClearLabel ?? searchLabel}
                  className={cn('absolute right-0.5 top-0.5 h-7 w-7 text-[#8f99ab]', searchClearButtonProps?.className)}
                  onClick={onSearchClear}
                  data-hz-monitor-filter-clear-action="search"
                >
                  <X size={13} />
                </HzIconButton>
              ) : null}
            </div>
            {labelFilterLabel ? (
              <div
                className={cn('relative min-w-[150px] flex-[0_1_220px]', labelFilterInputProps?.className)}
                data-hz-monitor-filter-clearable-field="labels"
              >
                <HzInput
                  {...labelFilterInputProps}
                  aria-label={labelFilterLabel}
                  className="w-full pr-8"
                  placeholder={labelFilterPlaceholder}
                  value={labelFilterValue ?? ''}
                  onChange={event => onLabelFilterChange?.(event.target.value)}
                  onKeyDown={event => handleEnterSubmit(event, labelFilterInputProps?.onKeyDown)}
                  data-hz-monitor-filter-field="labels"
                  data-hz-monitor-filter-enter-submit="labels"
                />
                {onLabelFilterClear && labelFilterValue ? (
                  <HzIconButton
                    {...labelFilterClearButtonProps}
                    type="button"
                    intent="ghost"
                    label={labelFilterClearLabel ?? labelFilterLabel}
                    className={cn('absolute right-0.5 top-0.5 h-7 w-7 text-[#8f99ab]', labelFilterClearButtonProps?.className)}
                    onClick={onLabelFilterClear}
                    data-hz-monitor-filter-clear-action="labels"
                  >
                    <X size={13} />
                  </HzIconButton>
                ) : null}
              </div>
            ) : null}
            {onTypePickerOpen ? (
              <div className="flex w-60 min-w-0 items-center gap-1" data-hz-monitor-filter-type-picker="available">
                {typeSelect}
                <HzButton
                  type="button"
                  size="icon"
                  intent="ghost"
                  aria-label={typePickerText}
                  title={typePickerText}
                  onClick={onTypePickerOpen}
                  data-hz-monitor-filter-field="type-picker"
                  {...typePickerButtonProps}
                >
                  <ChevronDown size={13} />
                </HzButton>
              </div>
            ) : (
              typeSelect
            )}
            <HzSelect
              {...statusSelectProps}
              aria-label={statusLabel}
              className={cn('w-36', statusSelectProps?.className)}
              options={statusOptions}
              value={statusValue}
              onChange={event => onStatusChange?.(event.target.value)}
              data-hz-monitor-filter-field="status"
            />
          </>
        }
        trailing={
          <>
            <HzButton intent="primary" onClick={onApply} {...applyButtonProps}>
              {applyLabel}
            </HzButton>
            <HzButton intent="ghost" onClick={onClear} {...clearButtonProps}>
              {clearLabel}
            </HzButton>
          </>
        }
      />
    </div>
  );
}

export function HzPage({
  eyebrow,
  title,
  description,
  actions,
  nav,
  rail,
  children,
  className
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  nav?: React.ReactNode;
  rail?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        '-mx-4 -mb-3 -mt-4 min-h-[calc(100vh-64px)] bg-[var(--hz-ui-canvas)] text-[#f2f5f8] sm:-mx-6',
        className
      )}
      data-hz-ui="page"
    >
      <header className="border-b border-[var(--hz-ui-line)] px-6 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            {eyebrow ? <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7e8494]">{eyebrow}</div> : null}
            <h1 className="mt-1 text-[24px] font-semibold leading-tight text-[#f5f7fb]">{title}</h1>
            {description ? <p className="mt-2 max-w-[820px] text-[13px] leading-6 text-[#a9b0bb]">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {nav ? <div className="mt-4">{nav}</div> : null}
      </header>
      <main className={cn('grid gap-0', rail ? 'xl:grid-cols-[minmax(0,1fr)_320px]' : '')}>
        <div className="min-w-0">{children}</div>
        {rail ? <aside className="border-l border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-canvas)] px-4 py-4">{rail}</aside> : null}
      </main>
    </div>
  );
}

export function HzSection({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('border-b border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)} data-hz-ui="section">
      <header className="flex flex-col gap-2 border-b border-[var(--hz-ui-line-soft)] px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-[#f3f6fb]">{title}</h2>
          {description ? <p className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div className={cn('px-4 py-4', bodyClassName)}>{children}</div>
    </section>
  );
}

export type HzTabItem = {
  id: string;
  label: string;
  count?: number;
};

export function HzSegmentedTabs({
  items,
  activeId,
  onSelect,
  className
}: {
  items: HzTabItem[];
  activeId: string;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn('inline-flex max-w-full items-center gap-5 overflow-x-auto', className)}
      data-hz-ui="tabs"
    >
      {items.map(item => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            className={cn(
              'relative inline-flex h-7 items-center justify-center gap-1.5 px-0.5 text-[12px] font-semibold transition-colors',
              active
                ? 'text-[#f5f7fb] after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-[var(--hz-ui-accent)]'
                : 'text-[#98a2b3] hover:text-white'
            )}
            onClick={() => onSelect?.(item.id)}
            data-hz-tab-active={active ? 'true' : 'false'}
          >
            <span>{item.label}</span>
            {typeof item.count === 'number' ? <span className="font-mono text-[10px] text-[#727b8c]">{item.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export type HzMonitorDetailTabItem<T extends string> = {
  key: T;
  label: React.ReactNode;
};

export type HzMonitorDetailTabsProps<T extends string> = Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> & {
  items: Array<HzMonitorDetailTabItem<T>>;
  selectedKey: T;
  onSelect?: (key: T) => void;
  panelIdPrefix?: string;
  ariaLabel?: string;
  extra?: React.ReactNode;
};

export function HzMonitorDetailTabs<T extends string>({
  items,
  selectedKey,
  onSelect,
  panelIdPrefix = 'monitor-detail',
  ariaLabel = 'Tab navigation',
  extra,
  className,
  ...props
}: HzMonitorDetailTabsProps<T>) {
  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % items.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + items.length) % items.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = items.length - 1;
    }

    const nextItem = items[nextIndex];
    if (!nextItem) {
      return;
    }

    onSelect?.(nextItem.key);
    const tabButtons = Array.from(
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[data-monitor-detail-tab-underline="true"]'
      ) ?? []
    );
    tabButtons[nextIndex]?.focus();
  }

  return (
    <div
      {...props}
      className={cn(
        'flex min-w-0 flex-col gap-2 border-b border-[var(--hz-ui-line-soft)] pb-2 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
      data-hz-ui="monitor-detail-tabs"
      data-monitor-detail-tabs-owner="hertzbeat-ui-monitor-detail-tabs"
      data-monitor-detail-tabs-variant="bottom-underline-switch"
      data-monitor-detail-tabs-control-baseline="underline-28"
      data-monitor-detail-tabs-family="top-tab-underline"
      data-monitor-detail-tabs-extra={extra ? 'true' : undefined}
    >
      <div
        className="flex min-w-0 flex-wrap items-center gap-5"
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation="horizontal"
        data-monitor-detail-tab-list-owner="hertzbeat-ui-monitor-detail-tabs"
        data-monitor-detail-tab-list-baseline="underline-28"
      >
        {items.map((item, index) => {
          const selected = item.key === selectedKey;
          return (
            <button
              key={item.key}
              id={`${panelIdPrefix}-tab-${item.key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${panelIdPrefix}-panel-${item.key}`}
              tabIndex={selected ? 0 : -1}
              className={cn(
                'relative inline-flex h-7 min-w-0 items-center justify-center gap-1.5 border-0 bg-transparent px-0.5 text-left text-[12px] font-semibold tracking-[0.02em] transition-colors',
                'focus-visible:border-[var(--hz-ui-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hz-ui-active-soft)]',
                selected
                  ? 'text-[#f5f7fb] after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-[var(--hz-ui-accent)]'
                  : 'text-[#98a2b3] hover:text-white'
              )}
              data-tab={item.key}
              data-selected-tab={selected ? item.key : undefined}
              data-monitor-detail-tab-control-baseline="underline-28"
              data-monitor-detail-tab-underline="true"
              data-monitor-detail-tab-underline-selected={selected ? 'true' : undefined}
              data-monitor-detail-tab-visual-family="top-tab-underline"
              data-hz-control-height="28"
              data-hz-control-edge="bottom-underline"
              onClick={() => onSelect?.(item.key)}
              onKeyDown={event => handleTabKeyDown(event, index)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {extra ? (
        <div className="min-w-0 sm:ml-auto" data-monitor-detail-tabs-extra-slot="true">
          {extra}
        </div>
      ) : null}
    </div>
  );
}

export function HzMonitorDetailTabSequence({
  children,
  className,
  ...props
}: {
  children?: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('grid min-w-0 gap-2', className)}
      data-hz-ui="monitor-detail-tab-sequence"
      data-monitor-detail-tab-sequence-owner="hertzbeat-ui-detail-tab-sequence"
      data-monitor-detail-tab-sequence="shared-tight"
    >
      {children}
    </div>
  );
}

export function HzMonitorDetailTabPanel({
  children,
  className,
  active = true,
  id,
  tabId,
  ...props
}: {
  children?: React.ReactNode;
  className?: string;
  active?: boolean;
  id?: string;
  tabId?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      id={id}
      role="tabpanel"
      aria-labelledby={tabId}
      hidden={!active}
      className={cn('grid min-w-0 gap-2', !active && 'hidden', className)}
      data-hz-ui="monitor-detail-tab-panel"
      data-monitor-console-tab-panel="true"
      data-monitor-console-tab-panel-owner="hertzbeat-ui-detail-tab-panel"
      data-monitor-console-tab-panel-rhythm="shared-tight"
      data-monitor-tab-body-surface="hertzbeat-ui-detail-tab-panel"
    >
      {children}
    </div>
  );
}

export type HzMonitorRefreshToolbarOption = {
  value: string;
  label: React.ReactNode;
};

export type HzMonitorRefreshToolbarSignalLink = {
  id: string;
  href: string;
  label: string;
  icon?: React.ReactNode;
  component?: React.ElementType<any>;
};

export type HzMonitorRefreshToolbarProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  refreshLabel: React.ReactNode;
  refreshActionLabel: string;
  selectedRefresh: string;
  refreshOptions: HzMonitorRefreshToolbarOption[];
  onRefreshChange?: (value: string) => void;
  onRefresh?: () => void;
  refreshIcon?: React.ReactNode;
  signalLinks?: HzMonitorRefreshToolbarSignalLink[];
};

export function HzMonitorRefreshToolbar({
  refreshLabel,
  refreshActionLabel,
  selectedRefresh,
  refreshOptions,
  onRefreshChange,
  onRefresh,
  refreshIcon,
  signalLinks = [],
  className,
  ...props
}: HzMonitorRefreshToolbarProps) {
  return (
    <div
      {...props}
      className={cn('flex min-w-0 flex-wrap items-center justify-end gap-1.5', className)}
      data-hz-ui="monitor-refresh-toolbar"
      data-hz-monitor-refresh-toolbar-layout="single-row-compact"
      data-monitor-refresh-toolbar-owner="hertzbeat-ui-refresh-toolbar"
      data-monitor-refresh-toolbar-density="inline-quiet-controls"
      data-monitor-refresh-control-baseline="control-32-lined"
    >
      {signalLinks.length ? (
        <div
          className="flex min-w-0 flex-wrap items-center gap-1.5"
          data-monitor-signal-handoff="compact-actions"
          data-monitor-signal-handoff-owner="hertzbeat-ui-icon-link-group"
          data-monitor-signal-handoff-source="context-only"
          data-monitor-signal-handoff-control-baseline="button-28-lined"
        >
          {signalLinks.map(link => (
            <HzIconLink
              key={link.id}
              component={link.component}
              href={link.href}
              label={link.label}
              intent="ghost"
              className="h-7 w-auto min-w-0 !rounded-none border-[var(--hz-ui-line-soft)] bg-transparent px-2 text-[11px] tracking-[0.02em] !shadow-none hover:border-[var(--hz-ui-accent-muted)] hover:bg-[var(--hz-ui-surface-soft)]"
              data-monitor-signal-handoff-link={link.id}
              data-monitor-signal-handoff-link-owner="hertzbeat-ui-icon-link"
              data-monitor-signal-handoff-link-control="button-28-lined"
              data-hz-control-height="28"
              data-hz-control-edge="lined"
            >
              {link.icon}
              <span>{link.label}</span>
            </HzIconLink>
          ))}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5" data-hz-monitor-refresh-controls="true">
        <HzStatusBadge
          tone="neutral"
          className="h-8 rounded-none border-[var(--hz-ui-line-soft)] bg-transparent px-2 py-1 font-mono text-[11px] tracking-[0.04em] text-[#7e8494]"
          data-monitor-refresh-badge-variant="quiet"
          data-monitor-refresh-badge-owner="hertzbeat-ui-status-badge"
          data-hz-control-height="32"
          data-hz-control-edge="lined"
        >
          {refreshLabel}
        </HzStatusBadge>
        <HzSelect
          aria-label={String(refreshLabel)}
          data-monitor-refresh-select="true"
          data-monitor-refresh-select-density="quiet"
          data-monitor-refresh-select-owner="hertzbeat-ui-select"
          value={selectedRefresh}
          className="w-[82px]"
          triggerClassName="h-8 !rounded-none border-[var(--hz-ui-line-soft)] bg-transparent px-2 !shadow-none hover:border-[var(--hz-ui-accent-muted)] hover:bg-[var(--hz-ui-surface-soft)]"
          options={refreshOptions.map(option => ({
            value: option.value,
            label: typeof option.label === 'string' ? option.label : String(option.value)
          }))}
          onChange={event => onRefreshChange?.(event.target.value)}
        />
        <span className="sr-only" data-monitor-refresh-options="shared-select-options">
          {refreshOptions.map(option => option.label).join(' ')}
        </span>
        <HzButton
          type="button"
          size="icon"
          intent="ghost"
          aria-label={refreshActionLabel}
          title={refreshActionLabel}
          className="h-7 w-7 min-w-0 !rounded-none border-[var(--hz-ui-line-soft)] bg-transparent px-0 !shadow-none hover:border-[var(--hz-ui-accent-muted)] hover:bg-[var(--hz-ui-surface-soft)]"
          data-monitor-refresh-action-density="quiet"
          data-monitor-refresh-action-owner="hertzbeat-ui-button"
          data-monitor-refresh-command-action="refresh"
          onClick={onRefresh}
        >
          {refreshIcon}
          <span className="sr-only">{refreshActionLabel}</span>
        </HzButton>
      </div>
    </div>
  );
}

export type HzMonitorRealtimeToolbarFact = {
  title: React.ReactNode;
  copy: React.ReactNode;
};

export type HzMonitorRealtimeToolbarModeOption = {
  value: string;
  label: React.ReactNode;
};

export type HzMonitorRealtimeToolbarProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> & {
  facts?: HzMonitorRealtimeToolbarFact[];
  compact?: boolean;
  selectedMode?: string;
  modeOptions?: HzMonitorRealtimeToolbarModeOption[];
  onModeChange?: (value: string) => void;
  refreshLabel?: React.ReactNode;
  onRefresh?: () => void;
  expandLabel?: React.ReactNode;
  onExpand?: () => void;
  showExpand?: boolean;
};

export function HzMonitorRealtimeToolbar({
  facts = [],
  compact = false,
  selectedMode,
  modeOptions = [],
  onModeChange,
  refreshLabel,
  onRefresh,
  expandLabel,
  onExpand,
  showExpand = true,
  className,
  ...props
}: HzMonitorRealtimeToolbarProps) {
  const showModeControls = !compact && modeOptions.length > 0;
  const showRefresh = !compact && Boolean(refreshLabel);
  const showExpandAction = showExpand && Boolean(expandLabel);

  return (
    <div
      {...props}
      className={cn(
        'flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--hz-ui-line-soft)] pb-2',
        className
      )}
      data-hz-ui="monitor-realtime-toolbar"
      data-monitor-realtime-toolbar-owner="hertzbeat-ui-realtime-toolbar"
      data-monitor-realtime-action-band={compact ? 'shared-monitor-data-table' : 'shared-toolbar'}
    >
      <div
        className="flex min-w-0 flex-wrap gap-2"
        data-monitor-realtime-collect-time={compact ? 'true' : undefined}
      >
        {facts.map((fact, index) => (
          <div
            key={index}
            className="border-b border-[var(--hz-ui-line-faint)] px-0 py-1.5 text-[11px] text-[#98a2b3]"
            data-monitor-realtime-toolbar-fact="true"
          >
            <span className="text-[#727b8c]">{fact.title}</span>
            {' · '}
            <span className="font-semibold text-[#dbe4f0]">{fact.copy}</span>
          </div>
        ))}
      </div>
      <div
        className="flex min-w-0 flex-wrap items-center gap-1.5"
        data-monitor-realtime-action-group={compact ? 'shared-metric-extra' : 'shared-toolbar-actions'}
        data-monitor-realtime-action-density="hertzbeat-ui-compact-actions"
      >
        {showModeControls
          ? modeOptions.map(option => (
              <HzButton
                key={option.value}
                size="sm"
                intent={option.value === selectedMode ? 'primary' : 'ghost'}
                onClick={() => onModeChange?.(option.value)}
                data-monitor-realtime-mode-action={option.value}
                data-monitor-realtime-mode-selected={option.value === selectedMode ? 'true' : undefined}
              >
                {option.label}
              </HzButton>
            ))
          : null}
        {showRefresh ? (
          <HzButton
            size="sm"
            intent="ghost"
            onClick={onRefresh}
            data-monitor-realtime-refresh-action="hertzbeat-ui-button"
          >
            {refreshLabel}
          </HzButton>
        ) : null}
        {showExpandAction ? (
          <HzButton
            size="sm"
            intent={compact ? 'ghost' : 'secondary'}
            className={compact ? 'h-7 min-w-0 border-transparent bg-transparent px-1 text-[#727b8c] hover:bg-transparent hover:text-[#dbe4f0]' : undefined}
            onClick={onExpand}
            data-monitor-realtime-expand-action-density={compact ? 'hertzbeat-ui-link-action' : 'hertzbeat-ui-button'}
          >
            {expandLabel}
          </HzButton>
        ) : null}
      </div>
    </div>
  );
}

export type HzMonitorRealtimeInspectorStat = {
  label: React.ReactNode;
  value: React.ReactNode;
};

export type HzMonitorRealtimeInspectorRow = {
  label: React.ReactNode;
  value: React.ReactNode;
  meta?: React.ReactNode;
};

export type HzMonitorRealtimeInspectorProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'summary' | 'details';
  label: React.ReactNode;
  value: React.ReactNode;
  stats?: HzMonitorRealtimeInspectorStat[];
  rows?: HzMonitorRealtimeInspectorRow[];
};

export function HzMonitorRealtimeInspector({
  variant = 'summary',
  label,
  value,
  stats = [],
  rows = [],
  className,
  ...props
}: HzMonitorRealtimeInspectorProps) {
  if (variant === 'summary') {
    return (
      <div
        {...props}
        className={cn(
          'min-w-[160px] border-l border-[var(--hz-ui-line-soft)] pl-3 text-right',
          className
        )}
        data-hz-ui="monitor-realtime-inspector"
        data-monitor-realtime-inspector-owner="hertzbeat-ui-realtime-inspector"
        data-monitor-realtime-inspector-variant="summary"
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">{label}</div>
        <div className="mt-1 truncate text-sm font-semibold text-[#dbe4f0]">{value}</div>
      </div>
    );
  }

  return (
    <div
      {...props}
      className={cn('border-y border-[var(--hz-ui-line-soft)] py-3', className)}
      data-hz-ui="monitor-realtime-inspector"
      data-monitor-realtime-inspector-owner="hertzbeat-ui-realtime-inspector"
      data-monitor-realtime-inspector-variant="details"
    >
      <div className="grid border-b border-[var(--hz-ui-line-soft)] pb-2 sm:grid-cols-3">
        <div className="border-r border-[var(--hz-ui-line-soft)] pr-3 last:border-r-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">{label}</div>
          <div className="mt-1 truncate text-sm font-semibold text-[#dbe4f0]">{value}</div>
        </div>
        {stats.map((stat, index) => (
          <div
            key={index}
            className="border-r border-[var(--hz-ui-line-soft)] px-3 last:border-r-0"
            data-monitor-realtime-inspector-stat="true"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">{stat.label}</div>
            <div className="mt-1 font-mono text-sm font-semibold text-[#dbe4f0]">{stat.value}</div>
          </div>
        ))}
      </div>
      <div className="divide-y divide-[var(--hz-ui-line-faint)]">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid gap-1 py-2.5 text-sm sm:grid-cols-[minmax(0,180px)_1fr] sm:items-start"
            data-monitor-realtime-inspector-row="true"
          >
            <span className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">{row.label}</span>
            <span className="min-w-0 space-y-1 text-[#dbe4f0] sm:text-right">
              <span className="block break-words">{row.value}</span>
              {row.meta ? <span className="block text-[10px] uppercase tracking-[0.12em] text-[#727b8c]">{row.meta}</span> : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type HzMonitorRowNavigatorProps = React.HTMLAttributes<HTMLDivElement> & {
  label: React.ReactNode;
  previousLabel: React.ReactNode;
  nextLabel: React.ReactNode;
  canPrevious?: boolean;
  canNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
};

export function HzMonitorRowNavigator({
  label,
  previousLabel,
  nextLabel,
  canPrevious = false,
  canNext = false,
  onPrevious,
  onNext,
  className,
  ...props
}: HzMonitorRowNavigatorProps) {
  return (
    <div
      data-hz-ui="monitor-row-navigator"
      data-monitor-row-nav-owner="hertzbeat-ui-row-navigator"
      {...props}
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 border-y border-[var(--hz-ui-line-soft)] px-3 py-2 text-xs text-[#8f99ab]',
        className
      )}
    >
      <div className="min-w-0 truncate">{label}</div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <HzButton
          type="button"
          size="sm"
          intent="ghost"
          disabled={!canPrevious}
          onClick={onPrevious}
          data-monitor-row-nav-action="previous"
          data-monitor-realtime-row-nav-action="previous"
        >
          {previousLabel}
        </HzButton>
        <HzButton
          type="button"
          size="sm"
          intent="ghost"
          disabled={!canNext}
          onClick={onNext}
          data-monitor-row-nav-action="next"
          data-monitor-realtime-row-nav-action="next"
        >
          {nextLabel}
        </HzButton>
      </div>
    </div>
  );
}

export type HzMonitorRealtimeRowNavigatorProps = HzMonitorRowNavigatorProps;

export function HzMonitorRealtimeRowNavigator(props: HzMonitorRealtimeRowNavigatorProps) {
  return (
    <HzMonitorRowNavigator
      {...props}
      data-hz-ui="monitor-realtime-row-navigator"
      data-monitor-realtime-row-nav-owner="hertzbeat-ui-row-navigator"
    />
  );
}

export type HzMonitorControlBandProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> & {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  variant?: 'default' | 'embedded';
};

export function HzMonitorControlBand({ title, actions, children, variant = 'default', className, ...props }: HzMonitorControlBandProps) {
  return (
    <div
      data-hz-ui="monitor-control-band"
      data-monitor-control-band-owner="hertzbeat-ui-control-band"
      data-hz-control-band-style="flat-divider"
      data-hz-control-band-variant={variant}
      {...props}
      className={cn(
        'grid min-w-0 gap-2 py-2',
        variant === 'embedded' ? 'border-0 px-0' : 'border-y border-[var(--hz-ui-line-soft)] px-3',
        className
      )}
    >
      {title || actions ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          {title ? <div className="min-w-0 text-[11px] uppercase tracking-[0.16em] text-[#727b8c]">{title}</div> : <span />}
          {actions ? <div className="flex min-w-0 flex-wrap items-center gap-1.5">{actions}</div> : null}
        </div>
      ) : null}
      {children ? <div className="flex min-w-0 flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

export type HzMonitorEvidenceFrameProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'media';
};

export function HzMonitorEvidenceFrame({ children, variant = 'default', className, ...props }: HzMonitorEvidenceFrameProps) {
  return (
    <div
      data-hz-ui="monitor-evidence-frame"
      data-monitor-evidence-frame-owner="hertzbeat-ui-evidence-frame"
      data-hz-evidence-frame-style="flat-divider"
      data-hz-evidence-frame-variant={variant}
      data-hz-evidence-frame-media-target={variant === 'media' ? 'iframe' : undefined}
      {...props}
      className={cn(
        'grid min-w-0 gap-3 border-y border-[var(--hz-ui-line-soft)]',
        variant === 'media' ? 'overflow-hidden py-0 [&_iframe]:h-[720px] [&_iframe]:w-full [&_iframe]:border-0' : 'py-3',
        className
      )}
    >
      {children}
    </div>
  );
}

export type HzDataColumn<Row> = {
  key: string;
  header: React.ReactNode;
  width?: string;
  render: (row: Row) => React.ReactNode;
};

export type HzDataMetaTextProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'meta' | 'unit';
  spacing?: 'none' | 'inline' | 'compact' | 'trend-helper';
  display?: 'inline' | 'block';
  casing?: 'meta' | 'plain';
};

export type HzDataCellTextProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'title' | 'copy' | 'meta' | 'type' | 'timestamp' | 'value' | 'identifier' | 'mono';
  display?: 'inline' | 'block';
  spacing?: 'none' | 'stack-tight' | 'stack';
  width?: 'auto' | 'trace-id';
  tone?: 'default' | 'strong' | 'bright' | 'success' | 'muted';
  weight?: 'variant' | 'semibold';
  font?: 'variant' | 'mono';
  casing?: 'variant' | 'plain';
};

export type HzDataCellStackProps = React.HTMLAttributes<HTMLSpanElement> & {
  display?: 'inline' | 'block';
  width?: 'auto' | 'metrics-entity';
};

export const HzDataCellStack = React.forwardRef<HTMLSpanElement, HzDataCellStackProps>(
  ({ display = 'inline', width = 'auto', className, ...props }, ref) => (
    <span
      ref={ref}
      data-hz-ui="data-cell-stack"
      data-hz-data-cell-stack-owner="hertzbeat-ui-data-cell-stack"
      data-hz-data-cell-stack-display={display}
      data-hz-data-cell-stack-width={width}
      {...props}
      className={cn(
        display === 'block' ? 'block' : null,
        width === 'metrics-entity' ? 'min-w-[140px]' : null,
        className
      )}
    />
  )
);
HzDataCellStack.displayName = 'HzDataCellStack';

export const HzDataCellText = React.forwardRef<HTMLSpanElement, HzDataCellTextProps>(
  ({
    variant = 'copy',
    display = 'inline',
    spacing = 'none',
    width = 'auto',
    tone = 'default',
    weight = 'variant',
    font = 'variant',
    casing = 'variant',
    className,
    ...props
  }, ref) => (
    <span
      ref={ref}
      data-hz-ui="data-cell-text"
      data-hz-data-cell-owner="hertzbeat-ui-data-cell-text"
      data-hz-data-cell-variant={variant}
      data-hz-data-cell-display={display}
      data-hz-data-cell-spacing={spacing}
      data-hz-data-cell-width={width}
      data-hz-data-cell-tone={tone}
      data-hz-data-cell-weight={weight}
      data-hz-data-cell-font={font}
      data-hz-data-cell-casing={casing}
      {...props}
      className={cn(
        'min-w-0 truncate',
        display === 'block' ? 'block' : null,
        spacing === 'stack-tight' ? 'mt-0.5' : null,
        spacing === 'stack' ? 'mt-1' : null,
        width === 'trace-id' ? 'max-w-[220px]' : null,
        variant === 'title' ? cn('text-[13px] font-semibold', tone === 'default' ? 'text-[#f3f6fb]' : null) : null,
        variant === 'copy' ? cn('font-mono text-[11px]', tone === 'default' ? 'text-[#8f99ab]' : null) : null,
        variant === 'meta' ? cn('text-[10px]', casing === 'plain' ? 'normal-case tracking-normal' : 'uppercase tracking-[0.12em]', tone === 'default' ? 'text-[#727b8c]' : null) : null,
        variant === 'type' ? cn('font-mono text-[11px]', casing === 'plain' ? 'normal-case tracking-normal' : 'uppercase tracking-[0.14em]', tone === 'default' ? 'text-[#8f99ab]' : null) : null,
        variant === 'timestamp' ? cn('font-mono text-[11px]', tone === 'default' ? 'text-[#c8d2df]' : null) : null,
        variant === 'value' ? (tone === 'default' ? 'text-[#c8d2df]' : null) : null,
        variant === 'identifier' ? cn('font-mono text-[11px]', tone === 'default' ? 'text-[#8792a5]' : null) : null,
        variant === 'mono' ? cn('font-mono text-[12px]', tone === 'default' ? 'text-[#c8d2df]' : null) : null,
        tone === 'strong' ? 'text-[#dbe5f3]' : null,
        tone === 'bright' ? 'text-[#e6edf7]' : null,
        tone === 'success' ? 'text-[#75c795]' : null,
        tone === 'muted' ? 'text-[#8b94a4]' : null,
        weight === 'semibold' ? 'font-semibold' : null,
        font === 'mono' ? 'font-mono' : null,
        className
      )}
    />
  )
);
HzDataCellText.displayName = 'HzDataCellText';

export const HzDataMetaText = React.forwardRef<HTMLSpanElement, HzDataMetaTextProps>(
  ({ variant = 'meta', spacing = 'none', display = 'inline', casing = 'meta', className, ...props }, ref) => (
    <span
      ref={ref}
      data-hz-ui="data-meta-text"
      data-hz-data-meta-owner="hertzbeat-ui-data-meta-text"
      data-hz-data-meta-variant={variant}
      data-hz-data-meta-spacing={spacing}
      data-hz-data-meta-display={display}
      data-hz-data-meta-casing={casing}
      {...props}
      className={cn(
        'text-[10px] text-[#727b8c]',
        display === 'block' ? 'block' : null,
        casing === 'plain' ? 'normal-case tracking-normal' : null,
        casing === 'meta' && variant === 'meta' ? 'uppercase tracking-[0.12em]' : null,
        casing === 'meta' && variant === 'unit' ? 'tracking-normal' : null,
        spacing === 'inline' ? 'ml-2' : null,
        spacing === 'compact' ? 'ml-1' : null,
        spacing === 'trend-helper' ? 'mt-2 text-[11px] text-[#6d7788]' : null,
        className
      )}
    />
  )
);
HzDataMetaText.displayName = 'HzDataMetaText';

type HzDataTableRowProps = React.HTMLAttributes<HTMLTableRowElement> & {
  [key: `data-${string}`]: string | number | boolean | undefined;
};

export type HzDataTableProps<Row> = Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> & {
  columns: HzDataColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row, index: number) => React.Key;
  getRowProps?: (row: Row, index: number) => HzDataTableRowProps | undefined;
  emptyLabel?: React.ReactNode;
  selectedRowKey?: React.Key;
  onRowClick?: (row: Row, index: number) => void;
  variant?: 'default' | 'embedded';
};

export function HzDataTable<Row>({
  columns,
  rows,
  getRowKey,
  getRowProps,
  emptyLabel = 'No data',
  selectedRowKey,
  onRowClick,
  variant = 'default',
  className,
  ...props
}: HzDataTableProps<Row>) {
  return (
    <div
      {...props}
      className={cn(
        'overflow-x-auto overflow-y-hidden bg-[var(--hz-ui-surface)]',
        variant === 'embedded' ? 'border-0' : 'border-y border-[var(--hz-ui-line)]',
        className
      )}
      data-hz-ui="data-table"
      data-hz-data-table-variant={variant}
    >
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--hz-ui-line)] bg-[var(--hz-ui-surface-soft)]">
            {columns.map(column => (
              <th
                key={column.key}
                className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]"
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, rowIndex) => {
              const rowKey = getRowKey(row, rowIndex);
              const selected = selectedRowKey !== undefined && String(selectedRowKey) === String(rowKey);
              const clickable = Boolean(onRowClick);
              const rowProps = getRowProps?.(row, rowIndex) ?? {};
              const {
                className: rowClassName,
                onClick: rowCustomClick,
                onKeyDown: rowCustomKeyDown,
                tabIndex: rowTabIndex,
                ...rowRestProps
              } = rowProps;
              return (
                <tr
                  key={rowKey}
                  {...rowRestProps}
                  className={cn(
                    'border-b border-[var(--hz-ui-line-faint)] last:border-b-0 hover:bg-[var(--hz-ui-surface-soft)]',
                    clickable ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--hz-ui-active-soft)]' : null,
                    selected ? 'bg-[var(--hz-ui-active)] shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]' : null,
                    rowClassName
                  )}
                  tabIndex={rowTabIndex ?? (clickable ? 0 : undefined)}
                  onClick={
                    clickable || rowCustomClick
                      ? event => {
                          rowCustomClick?.(event);
                          if (event.defaultPrevented) return;
                          const target = event.target;
                          if (target instanceof HTMLElement && target.closest('button,a,input,select,textarea')) return;
                          onRowClick?.(row, rowIndex);
                        }
                      : undefined
                  }
                  onKeyDown={
                    clickable || rowCustomKeyDown
                      ? event => {
                          rowCustomKeyDown?.(event);
                          if (event.defaultPrevented) return;
                          const target = event.target;
                          if (target instanceof HTMLElement && target.closest('button,a,input,select,textarea')) return;
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onRowClick?.(row, rowIndex);
                          }
                        }
                      : undefined
                  }
                  data-hz-row-clickable={clickable ? 'true' : 'false'}
                  data-hz-row-selected={selected ? 'true' : 'false'}
                >
                  {columns.map(column => (
                    <td key={column.key} className="px-3 py-2 align-middle text-[12px] leading-5 text-[#dbe4f0]">
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-[12px] text-[#727b8c]">
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export type HzIncidentWorkbenchTone = Extract<HzStatusTone, 'critical' | 'warning' | 'success' | 'info' | 'neutral'>;

export type HzIncidentWorkbenchMetric = {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: HzIncidentWorkbenchTone;
};

export type HzIncidentWorkbenchIncident = {
  id: string;
  title: React.ReactNode;
  severity: HzIncidentWorkbenchTone;
  severityLabel?: React.ReactNode;
  stage: React.ReactNode;
  service: React.ReactNode;
  owner: React.ReactNode;
  openedAt: React.ReactNode;
  blastRadius: React.ReactNode;
};

export type HzIncidentWorkbenchTimelineItem = {
  id: string;
  title: React.ReactNode;
  copy: React.ReactNode;
  meta: React.ReactNode;
  tone?: HzIncidentWorkbenchTone;
};

export type HzIncidentWorkbenchOwnershipItem = {
  id: string;
  owner: React.ReactNode;
  queue: React.ReactNode;
  copy: React.ReactNode;
  meta: React.ReactNode;
  tone?: HzIncidentWorkbenchTone;
};

export type HzIncidentWorkbenchAction = {
  label: React.ReactNode;
  href: string;
  variant?: 'primary' | 'subtle' | 'default';
};

export type HzIncidentWorkbenchTransitionAction = {
  id: string;
  label: React.ReactNode;
  state: string | number;
  variant?: 'primary' | 'subtle' | 'default' | 'danger';
  disabled?: boolean;
  pending?: boolean;
  onClick?: React.ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
};

export type HzIncidentWorkbenchProps = React.HTMLAttributes<HTMLElement> & {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  sourceLabel: React.ReactNode;
  queryLabel: React.ReactNode;
  metrics: HzIncidentWorkbenchMetric[];
  incidents: HzIncidentWorkbenchIncident[];
  timeline: HzIncidentWorkbenchTimelineItem[];
  ownership: HzIncidentWorkbenchOwnershipItem[];
  actions?: HzIncidentWorkbenchAction[];
  transitionActions?: HzIncidentWorkbenchTransitionAction[];
  transitionLabel?: React.ReactNode;
  selectedIncidentId?: string;
  density?: 'operator-compact';
  emptyLabel?: React.ReactNode;
  labels?: Partial<{
    incident: React.ReactNode;
    severity: React.ReactNode;
    stage: React.ReactNode;
    owner: React.ReactNode;
    impact: React.ReactNode;
    timeline: React.ReactNode;
    ownership: React.ReactNode;
  }>;
};

const incidentWorkbenchActionIntent: Record<NonNullable<HzIncidentWorkbenchAction['variant']>, HzButtonIntent> = {
  default: 'secondary',
  primary: 'primary',
  subtle: 'ghost'
};

const incidentWorkbenchTransitionIntent: Record<NonNullable<HzIncidentWorkbenchTransitionAction['variant']>, HzButtonIntent> = {
  default: 'secondary',
  danger: 'danger',
  primary: 'primary',
  subtle: 'ghost'
};

function mapIncidentStageTone(stage: React.ReactNode): HzIncidentWorkbenchTone {
  const normalized = typeof stage === 'string' ? stage.toLowerCase() : '';
  if (normalized.includes('mitigat') || normalized.includes('monitor')) return 'warning';
  if (normalized.includes('resolved')) return 'success';
  return 'info';
}

export function HzIncidentWorkbench({
  title,
  subtitle,
  sourceLabel,
  queryLabel,
  metrics,
  incidents,
  timeline,
  ownership,
  actions = [],
  transitionActions = [],
  transitionLabel = 'Status transition',
  selectedIncidentId,
  density = 'operator-compact',
  emptyLabel = 'No incidents',
  labels,
  className,
  ...props
}: HzIncidentWorkbenchProps) {
  const resolvedLabels = {
    incident: 'Incident',
    severity: 'Severity',
    stage: 'Stage',
    owner: 'Owner',
    impact: 'Impact',
    timeline: 'Response timeline',
    ownership: 'Ownership',
    ...labels
  };
  const columns: HzDataColumn<HzIncidentWorkbenchIncident>[] = [
    {
      key: 'incident',
      header: resolvedLabels.incident,
      render: incident => (
        <div className="min-w-0 max-w-[320px]" data-hz-incident-cell="title-opened-at">
          <HzDataCellText variant="title" display="block" title={typeof incident.title === 'string' ? incident.title : undefined}>
            {incident.title}
          </HzDataCellText>
          <HzDataMetaText display="block" casing="plain">
            {incident.openedAt}
          </HzDataMetaText>
        </div>
      )
    },
    {
      key: 'severity',
      header: resolvedLabels.severity,
      width: '112px',
      render: incident => <HzStatusBadge tone={incident.severity}>{incident.severityLabel || incident.severity}</HzStatusBadge>
    },
    {
      key: 'stage',
      header: resolvedLabels.stage,
      width: '132px',
      render: incident => <HzStatusBadge tone={mapIncidentStageTone(incident.stage)}>{incident.stage}</HzStatusBadge>
    },
    {
      key: 'owner',
      header: resolvedLabels.owner,
      render: incident => (
        <div className="min-w-0 max-w-[160px]" data-hz-incident-cell="owner-service">
          <HzDataCellText variant="value" display="block" tone="strong" title={typeof incident.owner === 'string' ? incident.owner : undefined}>
            {incident.owner}
          </HzDataCellText>
          <HzDataMetaText display="block" casing="plain">
            {incident.service}
          </HzDataMetaText>
        </div>
      )
    },
    {
      key: 'blast-radius',
      header: resolvedLabels.impact,
      render: incident => (
        <HzDataMetaText display="block" casing="plain">
          {incident.blastRadius}
        </HzDataMetaText>
      )
    }
  ];

  return (
    <section
      {...props}
      className={cn('min-w-0 border border-[var(--hz-ui-line)] bg-[var(--hz-ui-canvas)] text-[#dbe4f0]', className)}
      data-hz-ui="incident-workbench"
      data-hz-incident-workbench-owner="hertzbeat-ui-incident-workbench"
      data-hz-incident-workbench-density={density}
      data-hz-incident-workbench-style="hertzbeat-ui-matte-hard-edge"
      data-hz-incident-workbench-source={String(sourceLabel)}
      data-hz-incident-workbench-query={String(queryLabel)}
    >
      <header
        className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-[var(--hz-ui-line)] bg-[var(--hz-ui-surface)] px-3 py-3"
        data-hz-incident-workbench-region="header"
      >
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">{sourceLabel}</div>
          <h2 className="mt-1 text-[18px] font-semibold leading-6 text-[#f5f7fb]">{title}</h2>
          <p className="mt-1 max-w-[760px] text-[12px] leading-5 text-[#9aa4b5]">{subtitle}</p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2" data-hz-incident-workbench-actions="shared">
          <span className="border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-control)] px-2 py-1 font-mono text-[11px] text-[#9aa4b5]">
            {queryLabel}
          </span>
          {actions.map(action => (
            <HzButtonLink
              key={action.href}
              href={action.href}
              intent={incidentWorkbenchActionIntent[action.variant || 'default']}
              size="sm"
              data-hz-incident-workbench-action={action.variant || 'default'}
            >
              {action.label}
            </HzButtonLink>
          ))}
        </div>
      </header>

      {transitionActions.length > 0 ? (
        <div
          className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--hz-ui-line-soft)] bg-[#0a0d12] px-3 py-2"
          data-hz-incident-transition-actions="shared"
          data-hz-incident-transition-owner="hertzbeat-ui-incident-transition-actions"
          data-hz-incident-transition-density={density}
          data-hz-incident-transition-style="hertzbeat-ui-matte-hard-edge"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">{transitionLabel}</span>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {transitionActions.map(action => (
              <HzButton
                key={action.id}
                intent={incidentWorkbenchTransitionIntent[action.variant || 'default']}
                size="sm"
                disabled={action.disabled || action.pending}
                aria-busy={action.pending ? 'true' : undefined}
                onClick={action.onClick}
                data-hz-incident-transition-action={action.id}
                data-hz-incident-transition-target-state={String(action.state)}
                data-hz-incident-transition-disabled={action.disabled || action.pending ? 'true' : 'false'}
              >
                {action.label}
              </HzButton>
            ))}
          </div>
        </div>
      ) : null}

      <div data-hz-incident-workbench-region="metrics">
        <HzMetricStrip
          items={metrics.map(metric => ({
            label: metric.label,
            value: metric.value,
            hint: metric.hint,
            tone: metric.tone
          }))}
        />
      </div>

      <div className="grid min-w-0 gap-0 xl:grid-cols-[minmax(0,1fr)_320px]" data-hz-incident-workbench-region="body">
        <div className="min-w-0 border-r border-[var(--hz-ui-line-soft)]">
          <HzDataTable
            columns={columns}
            rows={incidents}
            getRowKey={incident => incident.id}
            selectedRowKey={selectedIncidentId}
            emptyLabel={emptyLabel}
            variant="embedded"
            data-hz-incident-workbench-table="shared"
          />
        </div>
        <aside className="min-w-0 bg-[var(--hz-ui-surface)]" data-hz-incident-workbench-rail="timeline-ownership">
          <div className="border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">{resolvedLabels.timeline}</div>
            <div className="mt-2 space-y-2">
              {timeline.map(item => (
                <div key={item.id} className="border-l border-[var(--hz-ui-line-strong)] pl-3" data-hz-incident-timeline-item={item.id}>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 bg-[var(--hz-ui-accent-muted)]" aria-hidden="true" />
                    <span className="text-[12px] font-semibold text-[#eef2f7]">{item.title}</span>
                  </div>
                  <p className="mt-1 text-[12px] leading-5 text-[#9aa4b5]">{item.copy}</p>
                  <div className="mt-1 font-mono text-[11px] text-[#727b8c]">{item.meta}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">{resolvedLabels.ownership}</div>
            <div className="mt-2 space-y-2">
              {ownership.map(item => (
                <div key={item.id} className="border border-[var(--hz-ui-line-soft)] bg-[#08090c] px-2 py-2" data-hz-incident-owner-item={item.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] font-semibold text-[#eef2f7]">{item.owner}</span>
                    <HzStatusBadge tone={item.tone || 'neutral'}>{item.queue}</HzStatusBadge>
                  </div>
                  <p className="mt-1 text-[12px] leading-5 text-[#9aa4b5]">{item.copy}</p>
                  <div className="mt-1 font-mono text-[11px] text-[#727b8c]">{item.meta}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export type HzActionWorkbenchAction = {
  label: React.ReactNode;
  href: string;
  variant?: 'primary' | 'subtle' | 'default';
};

export type HzActionWorkbenchShell = {
  eyebrow: React.ReactNode;
  copy: React.ReactNode;
  chips: React.ReactNode[];
};

export type HzActionWorkbenchAdapterBoundary = {
  state: string;
  label: React.ReactNode;
  copy: React.ReactNode;
  roadmapOnlyLabels: React.ReactNode[];
};

export type HzActionWorkbenchChecklistItem = {
  title: React.ReactNode;
  copy: React.ReactNode;
  tone?: string;
};

export type HzActionWorkbenchSuggestedAction = {
  id: string;
  title: React.ReactNode;
  copy: React.ReactNode;
  displayMeta: React.ReactNode;
  evidence: React.ReactNode;
  evidenceHref: string;
  confirmation: string;
  posture: React.ReactNode;
};

export type HzActionWorkbenchApprovalDraftResult = {
  draftId: React.ReactNode;
  state: React.ReactNode;
  executionState: React.ReactNode;
};

export type HzActionWorkbenchApprovalDraft = {
  state: string;
  adapterOwner: string;
  endpoint: string;
  method: string;
  executionMode: string;
  executionAllowed: boolean;
  title: React.ReactNode;
  copy: React.ReactNode;
  createLabel: React.ReactNode;
  pendingLabel: React.ReactNode;
  successLabel: React.ReactNode;
  failedLabel: React.ReactNode;
  disabledReason: React.ReactNode;
  requestPreview: React.ReactNode;
  status?: 'ready' | 'submitting' | 'created' | 'failed' | 'blocked';
  result?: HzActionWorkbenchApprovalDraftResult;
  error?: React.ReactNode;
  onCreate?: () => void;
};

export type HzActionWorkbenchApprovalDecisionResult = {
  draftId: React.ReactNode;
  decision: React.ReactNode;
  state: React.ReactNode;
  executionState: React.ReactNode;
};

export type HzActionWorkbenchApprovalDecision = {
  state: string;
  status?: 'blocked' | 'ready' | 'submitting' | 'decided' | 'failed';
  adapterOwner: string;
  endpoint: string;
  method: string;
  executionMode: string;
  executionAllowed: boolean;
  managerBacked?: boolean;
  title: React.ReactNode;
  copy: React.ReactNode;
  approveLabel: React.ReactNode;
  rejectLabel: React.ReactNode;
  pendingLabel: React.ReactNode;
  successLabel: React.ReactNode;
  failedLabel: React.ReactNode;
  disabledReason: React.ReactNode;
  requestPreview: React.ReactNode;
  result?: HzActionWorkbenchApprovalDecisionResult;
  error?: React.ReactNode;
  onApprove?: () => void;
  onReject?: () => void;
};

export type HzActionWorkbenchApprovalDraftQueueItem = {
  draftId: React.ReactNode;
  state: React.ReactNode;
  actionId?: React.ReactNode;
  catalogId?: React.ReactNode;
  executionState?: React.ReactNode;
  adapterOwner?: React.ReactNode;
};

export type HzActionWorkbenchApprovalDraftQueue = {
  state: string;
  adapterOwner: string;
  endpoint: string;
  method: string;
  executionMode: string;
  executionAllowed: boolean;
  managerBacked: boolean;
  title: React.ReactNode;
  copy: React.ReactNode;
  loadingLabel: React.ReactNode;
  emptyLabel: React.ReactNode;
  drafts: HzActionWorkbenchApprovalDraftQueueItem[];
};

export type HzActionWorkbenchCatalogItem = {
  catalogId: React.ReactNode;
  name: React.ReactNode;
  risk: React.ReactNode;
  status?: React.ReactNode;
  executionMode?: React.ReactNode;
  adapterOwner?: React.ReactNode;
};

export type HzActionWorkbenchCatalogAdapter = {
  state: string;
  adapterOwner: string;
  endpoint: string;
  method: string;
  executionMode: string;
  executionAllowed: boolean;
  managerBacked: boolean;
  title: React.ReactNode;
  copy: React.ReactNode;
  loadingLabel: React.ReactNode;
  emptyLabel: React.ReactNode;
  items: HzActionWorkbenchCatalogItem[];
};

export type HzActionWorkbenchProps = React.HTMLAttributes<HTMLElement> & {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  sourceLabel: React.ReactNode;
  actions: HzActionWorkbenchAction[];
  shell: HzActionWorkbenchShell;
  adapterBoundary: HzActionWorkbenchAdapterBoundary;
  checklistTitle: React.ReactNode;
  checklist: HzActionWorkbenchChecklistItem[];
  suggestedActions?: HzActionWorkbenchSuggestedAction[];
  catalogAdapter?: HzActionWorkbenchCatalogAdapter;
  approvalDraft?: HzActionWorkbenchApprovalDraft;
  approvalDecision?: HzActionWorkbenchApprovalDecision;
  approvalDraftQueue?: HzActionWorkbenchApprovalDraftQueue;
  suggestedTitle?: React.ReactNode;
  suggestedCopy?: React.ReactNode;
  suggestedEvidenceLabel?: React.ReactNode;
  suggestedConfirmLabel?: React.ReactNode;
  emptyTitle: React.ReactNode;
  emptyCopy: React.ReactNode;
  density?: 'operator-compact';
};

const actionWorkbenchActionIntent: Record<NonNullable<HzActionWorkbenchAction['variant']>, HzButtonIntent> = {
  default: 'secondary',
  primary: 'primary',
  subtle: 'ghost'
};

export function HzActionWorkbench({
  title,
  subtitle,
  sourceLabel,
  actions,
  shell,
  adapterBoundary,
  checklistTitle,
  checklist,
  suggestedActions = [],
  catalogAdapter,
  approvalDraft,
  approvalDecision,
  approvalDraftQueue,
  suggestedTitle = 'Suggested actions',
  suggestedCopy = 'Suggestions require manual confirmation.',
  suggestedEvidenceLabel = 'Evidence',
  suggestedConfirmLabel = 'Manual confirmation',
  emptyTitle,
  emptyCopy,
  density = 'operator-compact',
  className,
  ...props
}: HzActionWorkbenchProps) {
  return (
    <section
      {...props}
      className={cn('min-w-0 border border-[var(--hz-ui-line)] bg-[var(--hz-ui-canvas)] text-[#dbe4f0]', className)}
      data-hz-ui="action-workbench"
      data-hz-action-workbench-owner="hertzbeat-ui-action-workbench"
      data-hz-action-workbench-density={density}
      data-hz-action-workbench-style="hertzbeat-ui-matte-hard-edge"
      data-hz-action-workbench-source={String(sourceLabel)}
      data-hz-action-workbench-adapter-state={adapterBoundary.state}
    >
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-[var(--hz-ui-line)] bg-[var(--hz-ui-surface)] px-3 py-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">{sourceLabel}</div>
          <h2 className="mt-1 text-[18px] font-semibold leading-6 text-[#f5f7fb]">{title}</h2>
          <p className="mt-1 max-w-[760px] text-[12px] leading-5 text-[#9aa4b5]">{subtitle}</p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2" data-hz-action-workbench-actions="shared">
          {actions.map(action => (
            <HzButtonLink
              key={action.href}
              href={action.href}
              intent={actionWorkbenchActionIntent[action.variant || 'default']}
              size="sm"
              data-hz-action-workbench-action={action.variant || 'default'}
            >
              {action.label}
            </HzButtonLink>
          ))}
        </div>
      </header>

      <div className="grid min-w-0 gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="border-b border-r-0 border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] px-3 py-3 lg:border-r" data-actions-shell-panel="hertzbeat-ui-ops-shell-panel">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">{shell.eyebrow}</div>
          <p className="mt-2 max-w-[760px] text-[12px] leading-5 text-[#9aa4b5]">{shell.copy}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {shell.chips.map((chip, index) => (
              <span key={index} className="border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-control)] px-2 py-1 text-[11px] font-semibold text-[#cbd5e1]">
                {chip}
              </span>
            ))}
          </div>
        </section>

        <aside className="border-b border-[var(--hz-ui-line-soft)] bg-[#0a0d12] px-3 py-3" data-actions-launch-checklist="hertzbeat-ui-ops-static-rail">
          <h3 className="text-[12px] font-semibold text-[#f5f7fb]">{checklistTitle}</h3>
          <div className="mt-3 space-y-3">
            {checklist.map(item => (
              <div className="grid grid-cols-[8px_minmax(0,1fr)] gap-2" key={String(item.title)}>
                <span className={cn('mt-1.5 h-1.5 w-1.5', item.tone || 'bg-[var(--hz-ui-accent-muted)]')} aria-hidden="true" />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-[#eef2f7]">{item.title}</div>
                  <div className="mt-0.5 text-[12px] leading-5 text-[#8f99ab]">{item.copy}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="border-b border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] px-3 py-3 lg:col-span-2" data-actions-adapter-boundary={adapterBoundary.state}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">{adapterBoundary.label}</div>
          <p className="mt-2 max-w-[840px] text-[12px] leading-5 text-[#9aa4b5]">{adapterBoundary.copy}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {adapterBoundary.roadmapOnlyLabels.map((label, index) => (
              <span key={index} className="border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-control)] px-2 py-1 text-[11px] font-semibold text-[#cbd5e1]">
                {label}
              </span>
            ))}
          </div>
        </section>

        {suggestedActions.length > 0 ? (
          <section className="border-b border-[var(--hz-ui-line-soft)] bg-[#08090c] px-3 py-3 lg:col-span-2" data-actions-suggested-remediation="alert-context-human-confirmation">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">{suggestedTitle}</div>
            <p className="mt-2 text-[12px] leading-5 text-[#9aa4b5]">{suggestedCopy}</p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {suggestedActions.map(action => (
                <div key={action.id} data-actions-suggested-action={action.id} className="border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7e8494]">{action.displayMeta}</div>
                  <div className="mt-2 text-[13px] font-semibold text-[#eef2f7]">{action.title}</div>
                  <div className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{action.copy}</div>
                  <div className="mt-2 text-[11px] leading-4 text-[#7e8494]">{action.evidence}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <HzButtonLink href={action.evidenceHref} intent="secondary" size="sm" data-actions-suggested-action-evidence={action.id}>
                      {suggestedEvidenceLabel}
                    </HzButtonLink>
                    <HzButton disabled data-actions-suggested-action-confirm={action.confirmation}>
                      {suggestedConfirmLabel}
                    </HzButton>
                  </div>
                  <div className="mt-2 text-[11px] leading-4 text-[#8f99ab]">{action.posture}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {catalogAdapter ? (
          <section
            className="border-b border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] px-3 py-3 lg:col-span-2"
            data-actions-catalog="manual-action-catalog-api"
            data-actions-catalog-state={catalogAdapter.state}
            data-actions-catalog-owner={catalogAdapter.adapterOwner}
            data-actions-catalog-endpoint={catalogAdapter.endpoint}
            data-actions-catalog-method={catalogAdapter.method}
            data-actions-catalog-manager-backed={catalogAdapter.managerBacked ? 'true' : 'false'}
            data-actions-catalog-execution-mode={catalogAdapter.executionMode}
            data-actions-catalog-execution-allowed={catalogAdapter.executionAllowed ? 'true' : 'false'}
            data-actions-catalog-item-count={catalogAdapter.items.length}
          >
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">{catalogAdapter.title}</div>
                <p className="mt-2 max-w-[840px] text-[12px] leading-5 text-[#9aa4b5]">{catalogAdapter.copy}</p>
              </div>
              <span className="border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-control)] px-2 py-1 text-[11px] font-semibold text-[#cbd5e1]">
                {catalogAdapter.state === 'loading' ? catalogAdapter.loadingLabel : catalogAdapter.state}
              </span>
            </div>
            {catalogAdapter.items.length > 0 ? (
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {catalogAdapter.items.map(item => (
                  <div
                    key={String(item.catalogId)}
                    className="border border-[var(--hz-ui-line-soft)] bg-[#0a0d12] px-3 py-3"
                    data-actions-catalog-item={String(item.catalogId)}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7e8494]">{item.risk}</div>
                    <div className="mt-2 text-[13px] font-semibold text-[#eef2f7]">{item.name}</div>
                    <div className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{item.status}</div>
                    <div className="mt-2 text-[11px] leading-4 text-[#7e8494]">{item.executionMode}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 border border-[var(--hz-ui-line-soft)] bg-[#0a0d12] px-3 py-3 text-[12px] leading-5 text-[#8f99ab]" data-actions-catalog-empty="true">
                {catalogAdapter.state === 'loading' ? catalogAdapter.loadingLabel : catalogAdapter.emptyLabel}
              </div>
            )}
          </section>
        ) : null}

        {approvalDraft ? (
          <section
            className="border-b border-[var(--hz-ui-line-soft)] bg-[#0a0d12] px-3 py-3 lg:col-span-2"
            data-actions-approval-draft="manual-approval-draft-api"
            data-actions-approval-draft-state={approvalDraft.state}
            data-actions-approval-draft-status={approvalDraft.status || approvalDraft.state}
            data-actions-approval-draft-owner={approvalDraft.adapterOwner}
            data-actions-approval-draft-endpoint={approvalDraft.endpoint}
            data-actions-approval-draft-method={approvalDraft.method}
            data-actions-approval-draft-execution-mode={approvalDraft.executionMode}
            data-actions-approval-draft-execution-allowed={approvalDraft.executionAllowed ? 'true' : 'false'}
          >
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">{approvalDraft.title}</div>
                <p className="mt-2 max-w-[840px] text-[12px] leading-5 text-[#9aa4b5]">{approvalDraft.copy}</p>
              </div>
              <HzButton
                size="sm"
                disabled={!approvalDraft.onCreate || approvalDraft.state !== 'ready' || approvalDraft.status === 'submitting'}
                onClick={approvalDraft.onCreate}
                data-actions-approval-draft-create={approvalDraft.status || approvalDraft.state}
              >
                {approvalDraft.status === 'submitting' ? approvalDraft.pendingLabel : approvalDraft.createLabel}
              </HzButton>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_240px]">
              <code className="min-w-0 overflow-hidden border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-control)] px-2 py-2 text-[11px] leading-5 text-[#cbd5e1]" data-actions-approval-draft-request="preview">
                {approvalDraft.requestPreview}
              </code>
              <div className="border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] px-2 py-2 text-[11px] leading-5 text-[#8f99ab]">
                {approvalDraft.result ? (
                  <div data-actions-approval-draft-result={String(approvalDraft.result.draftId)}>
                    <div className="font-semibold text-[#dbe4f0]">{approvalDraft.successLabel}</div>
                    <div>{approvalDraft.result.draftId}</div>
                    <div>{approvalDraft.result.state}</div>
                    <div data-actions-approval-draft-execution-state={String(approvalDraft.result.executionState)}>
                      {approvalDraft.result.executionState}
                    </div>
                  </div>
                ) : approvalDraft.status === 'failed' ? (
                  <div data-actions-approval-draft-error="true">
                    <div className="font-semibold text-[#f3b4b4]">{approvalDraft.failedLabel}</div>
                    <div>{approvalDraft.error}</div>
                  </div>
                ) : (
                  <div data-actions-approval-draft-blocked={approvalDraft.state === 'awaiting-context' ? 'true' : 'false'}>
                    {approvalDraft.disabledReason}
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {approvalDraftQueue ? (
          <section
            className="border-b border-[var(--hz-ui-line-soft)] bg-[#08090c] px-3 py-3 lg:col-span-2"
            data-actions-approval-draft-queue="manual-approval-draft-read-api"
            data-actions-approval-draft-queue-state={approvalDraftQueue.state}
            data-actions-approval-draft-queue-owner={approvalDraftQueue.adapterOwner}
            data-actions-approval-draft-queue-endpoint={approvalDraftQueue.endpoint}
            data-actions-approval-draft-queue-method={approvalDraftQueue.method}
            data-actions-approval-draft-queue-manager-backed={approvalDraftQueue.managerBacked ? 'true' : 'false'}
            data-actions-approval-draft-queue-execution-mode={approvalDraftQueue.executionMode}
            data-actions-approval-draft-queue-execution-allowed={approvalDraftQueue.executionAllowed ? 'true' : 'false'}
            data-actions-approval-draft-queue-item-count={approvalDraftQueue.drafts.length}
          >
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">{approvalDraftQueue.title}</div>
                <p className="mt-2 max-w-[840px] text-[12px] leading-5 text-[#9aa4b5]">{approvalDraftQueue.copy}</p>
              </div>
              <span className="border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-control)] px-2 py-1 text-[11px] font-semibold text-[#cbd5e1]">
                {approvalDraftQueue.state === 'loading' ? approvalDraftQueue.loadingLabel : approvalDraftQueue.state}
              </span>
            </div>
            {approvalDraftQueue.drafts.length > 0 ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {approvalDraftQueue.drafts.map(draft => (
                  <div
                    key={String(draft.draftId)}
                    className="border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] px-3 py-3"
                    data-actions-approval-draft-queue-item={String(draft.draftId)}
                    data-actions-approval-draft-queue-item-action-id={String(draft.actionId || '')}
                    data-actions-approval-draft-queue-item-adapter-owner={String(draft.adapterOwner || '')}
                    data-actions-approval-draft-queue-item-catalog-id={String(draft.catalogId || '')}
                    data-actions-approval-draft-queue-item-execution-state={String(draft.executionState || '')}
                    data-actions-approval-draft-queue-item-state={String(draft.state)}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7e8494]">{draft.state}</div>
                    <div className="mt-2 min-w-0 overflow-hidden text-[13px] font-semibold text-[#eef2f7]">{draft.draftId}</div>
                    <div className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{draft.actionId || draft.catalogId}</div>
                    <div className="mt-2 text-[11px] leading-4 text-[#7e8494]">{draft.executionState}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 border border-[var(--hz-ui-line-soft)] bg-[#0a0d12] px-3 py-3 text-[12px] leading-5 text-[#8f99ab]" data-actions-approval-draft-queue-empty="true">
                {approvalDraftQueue.state === 'loading' ? approvalDraftQueue.loadingLabel : approvalDraftQueue.emptyLabel}
              </div>
            )}
          </section>
        ) : null}

        {approvalDecision ? (
          (() => {
            const approvalDecisionLocked = approvalDecision.status === 'submitting' || approvalDecision.status === 'decided' || Boolean(approvalDecision.result);

            return (
          <section
            className="border-b border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] px-3 py-3 lg:col-span-2"
            data-actions-approval-decision="manual-approval-decision-api"
            data-actions-approval-decision-state={approvalDecision.state}
            data-actions-approval-decision-status={approvalDecision.status || approvalDecision.state}
            data-actions-approval-decision-owner={approvalDecision.adapterOwner}
            data-actions-approval-decision-endpoint={approvalDecision.endpoint}
            data-actions-approval-decision-method={approvalDecision.method}
            data-actions-approval-decision-manager-backed={approvalDecision.managerBacked ? 'true' : 'false'}
            data-actions-approval-decision-execution-mode={approvalDecision.executionMode}
            data-actions-approval-decision-execution-allowed={approvalDecision.executionAllowed ? 'true' : 'false'}
          >
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">{approvalDecision.title}</div>
                <p className="mt-2 max-w-[840px] text-[12px] leading-5 text-[#9aa4b5]">{approvalDecision.copy}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <HzButton
                  size="sm"
                  disabled={!approvalDecision.onApprove || approvalDecisionLocked}
                  onClick={approvalDecision.onApprove}
                  data-actions-approval-decision-approve={approvalDecision.status || approvalDecision.state}
                >
                  {approvalDecision.status === 'submitting' ? approvalDecision.pendingLabel : approvalDecision.approveLabel}
                </HzButton>
                <HzButton
                  size="sm"
                  intent="secondary"
                  disabled={!approvalDecision.onReject || approvalDecisionLocked}
                  onClick={approvalDecision.onReject}
                  data-actions-approval-decision-reject={approvalDecision.status || approvalDecision.state}
                >
                  {approvalDecision.rejectLabel}
                </HzButton>
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_260px]">
              <code className="min-w-0 overflow-hidden border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-control)] px-2 py-2 text-[11px] leading-5 text-[#cbd5e1]" data-actions-approval-decision-request="preview">
                {approvalDecision.requestPreview}
              </code>
              <div className="border border-[var(--hz-ui-line-soft)] bg-[#0a0d12] px-2 py-2 text-[11px] leading-5 text-[#8f99ab]">
                {approvalDecision.result ? (
                  <div data-actions-approval-decision-result={String(approvalDecision.result.draftId)}>
                    <div className="font-semibold text-[#dbe4f0]">{approvalDecision.successLabel}</div>
                    <div>{approvalDecision.result.decision}</div>
                    <div>{approvalDecision.result.state}</div>
                    <div data-actions-approval-decision-execution-state={String(approvalDecision.result.executionState)}>
                      {approvalDecision.result.executionState}
                    </div>
                  </div>
                ) : approvalDecision.status === 'failed' ? (
                  <div data-actions-approval-decision-error="true">
                    <div className="font-semibold text-[#f3b4b4]">{approvalDecision.failedLabel}</div>
                    <div>{approvalDecision.error}</div>
                  </div>
                ) : (
                  <div data-actions-approval-decision-blocked={approvalDecision.state === 'awaiting-draft' ? 'true' : 'false'}>
                    {approvalDecision.disabledReason}
                  </div>
                )}
              </div>
            </div>
          </section>
            );
          })()
        ) : null}

        <section className="flex min-h-[180px] items-center justify-center bg-[var(--hz-ui-canvas)] px-3 py-8 lg:col-span-2" data-actions-empty-state="hertzbeat-ui-ops-domain-adapter">
          <div className="max-w-[720px] text-center">
            <h3 className="text-[16px] font-semibold text-[#f5f7fb]">{emptyTitle}</h3>
            <p className="mt-2 text-[12px] leading-5 text-[#9aa4b5]">{emptyCopy}</p>
          </div>
        </section>
      </div>
    </section>
  );
}

export type HzSelectableRow = {
  key: string;
  title: React.ReactNode;
  copy: React.ReactNode;
  meta?: React.ReactNode;
  disabled?: boolean;
};

export type HzSelectableRowsProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> & {
  rows: HzSelectableRow[];
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
  heading?: React.ReactNode;
  emptyFallback?: React.ReactNode;
  selectionAttrName?: string;
  selectable?: boolean;
  rowAttributes?: (row: HzSelectableRow, selected: boolean) => Record<string, string | undefined>;
};

export function HzSelectableRows({
  rows,
  selectedKey,
  onSelect,
  heading,
  emptyFallback = null,
  selectionAttrName = 'data-selected',
  selectable = true,
  rowAttributes,
  className,
  ...props
}: HzSelectableRowsProps) {
  if (rows.length === 0) return <>{emptyFallback}</>;

  return (
    <div
      {...props}
      className={cn('min-w-0 space-y-2', className)}
      data-hz-ui="selectable-rows"
      data-hz-selectable-row-owner="hertzbeat-ui-selectable-rows"
      data-hz-selectable-row-style="left-rail"
    >
      {heading ? (
        <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7e8494]">
          {heading}
        </div>
      ) : null}
      <div className="grid min-w-0 border-y border-[var(--hz-ui-line-soft)]">
        {rows.map(row => {
          const selected = selectedKey != null && String(selectedKey) === String(row.key);
          const selectedAttribute = selectionAttrName ? { [selectionAttrName]: selected ? 'true' : 'false' } : {};
          const extraAttributes = rowAttributes?.(row, selected) || {};
          const rowClassName = cn(
            'grid min-h-9 gap-2 border-b border-[var(--hz-ui-line-faint)] px-3 py-2 text-left text-[12px] transition-colors last:border-b-0 sm:grid-cols-[minmax(0,180px)_1fr] sm:items-start',
            selected
              ? 'bg-[var(--hz-ui-active)] shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]'
              : 'hover:bg-[var(--hz-ui-surface-soft)]',
            selectable && !row.disabled ? 'cursor-pointer' : ''
          );
          const rowBody = (
            <>
              <span className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f99ab]">
                {row.title}
              </span>
              <span className="grid min-w-0 gap-1 text-[#dbe4f0] sm:text-right">
                <span className="min-w-0 truncate">{row.copy}</span>
                {row.meta != null && row.meta !== '' && row.meta !== '-' ? (
                  <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">
                    {row.meta}
                  </span>
                ) : null}
              </span>
            </>
          );

          if (!selectable || !onSelect) {
            return (
              <div
                key={row.key}
                className={rowClassName}
                data-hz-selectable-row="true"
                data-hz-selectable-row-interactive="false"
                {...selectedAttribute}
                {...extraAttributes}
              >
                {rowBody}
              </div>
            );
          }

          return (
            <button
              key={row.key}
              type="button"
              className={cn(rowClassName, 'focus-visible:border-[var(--hz-ui-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--hz-ui-active-soft)]')}
              disabled={row.disabled}
              onClick={() => onSelect(row.key)}
              data-hz-selectable-row="true"
              data-hz-selectable-row-interactive="true"
              {...selectedAttribute}
              {...extraAttributes}
            >
              {rowBody}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type HzDetailRow = {
  key?: string;
  title: React.ReactNode;
  copy: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
};

export type HzDetailRowsProps = React.HTMLAttributes<HTMLDivElement> & {
  rows: HzDetailRow[];
  heading?: React.ReactNode;
  emptyFallback?: React.ReactNode;
  boundary?: 'none' | 'top';
  offset?: 'none' | 'top';
  padding?: 'none' | 'compact-y';
};

export function HzDetailRows({
  rows,
  heading,
  emptyFallback = null,
  boundary = 'none',
  offset = 'none',
  padding = 'none',
  className,
  ...props
}: HzDetailRowsProps) {
  if (rows.length === 0) return <>{emptyFallback}</>;

  return (
    <div
      {...props}
      className={cn(
        'min-w-0 space-y-2',
        offset === 'top' && boundary === 'none' ? 'mt-3' : null,
        boundary === 'top' ? 'mt-3 border-t border-[#252b35] pt-3' : null,
        padding === 'compact-y' ? (boundary === 'top' ? 'pb-2' : 'py-2') : null,
        className
      )}
      data-hz-ui="detail-rows"
      data-hz-detail-rows-owner="hertzbeat-ui-detail-rows"
      data-hz-detail-rows-style="flat-evidence"
      data-hz-detail-rows-boundary={boundary}
      data-hz-detail-rows-offset={offset}
      data-hz-detail-rows-padding={padding}
    >
      {heading ? (
        <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7e8494]">
          {heading}
        </div>
      ) : null}
      <dl className="grid min-w-0 border-y border-[var(--hz-ui-line-soft)]">
        {rows.map((row, index) => (
          <div
            key={row.key ?? `${stringifyNode(row.title, 'row')}-${index}`}
            className={cn(
              'grid min-h-9 gap-2 border-b border-[var(--hz-ui-line-faint)] px-3 py-2 last:border-b-0 sm:items-start',
              row.action ? 'sm:grid-cols-[minmax(0,180px)_1fr_auto]' : 'sm:grid-cols-[minmax(0,180px)_1fr]'
            )}
            data-hz-detail-row="true"
          >
            <dt className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f99ab]">
              {row.title}
            </dt>
            <dd className="grid min-w-0 gap-1 text-[#dbe4f0] sm:text-right">
              <span className="min-w-0 truncate">{row.copy}</span>
              {row.meta != null && row.meta !== '' && row.meta !== '-' ? (
                <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">
                  {row.meta}
                </span>
              ) : null}
            </dd>
            {row.action ? (
              <div
                className="flex min-w-0 justify-end"
                data-hz-detail-row-action-owner="hertzbeat-ui-detail-row-action"
              >
                {row.action}
              </div>
            ) : null}
          </div>
        ))}
      </dl>
    </div>
  );
}

export type HzTimeSeriesPoint = {
  label: string;
  value: number;
};

export type HzTimeSeries = {
  id: string;
  label: React.ReactNode;
  tone?: HzStatusTone;
  points: HzTimeSeriesPoint[];
};

export function HzTimeSeriesChart({
  title,
  unit,
  series,
  height = 152,
  selectedPointId,
  onPointSelect,
  hiddenSeriesIds = [],
  onLegendToggle,
  className
}: {
  title: React.ReactNode;
  unit?: React.ReactNode;
  series: HzTimeSeries[];
  height?: number;
  selectedPointId?: string;
  onPointSelect?: (point: HzTimeSeriesPoint, series: HzTimeSeries) => void;
  hiddenSeriesIds?: string[];
  onLegendToggle?: (series: HzTimeSeries) => void;
  className?: string;
}) {
  const allValues = series.flatMap(item => item.points.map(point => point.value));
  const maxValue = Math.max(1, ...allValues);
  const minValue = Math.min(0, ...allValues);
  const valueRange = Math.max(1, maxValue - minValue);
  const viewBoxWidth = 520;
  const viewBoxHeight = Math.max(120, height);
  const padding = { top: 18, right: 18, bottom: 26, left: 34 };
  const plotWidth = viewBoxWidth - padding.left - padding.right;
  const plotHeight = viewBoxHeight - padding.top - padding.bottom;
  const firstSeries = series[0];
  const xLabels = firstSeries?.points.map(point => point.label) || [];
  const hiddenSeriesSet = new Set(hiddenSeriesIds);

  const getPoint = (point: HzTimeSeriesPoint, index: number, points: HzTimeSeriesPoint[]) => {
    const x = padding.left + (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
    const y = padding.top + (1 - (point.value - minValue) / valueRange) * plotHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };
  const selectedPoint = series.flatMap(item =>
    item.points.map((point, index) => {
      const [x, y] = getPoint(point, index, item.points).split(',').map(Number);
      return {
        id: `${item.id}:${point.label}`,
        point,
        series: item,
        x,
        y
      };
    })
  ).find(item => item.id === selectedPointId && !hiddenSeriesSet.has(item.series.id));

  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="time-series-chart"
      data-hz-chart-kind="time-series"
    >
      <header
        className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2"
      >
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</div>
          {unit ? <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">{unit}</div> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {series.map(item => {
            const tone = item.tone || 'info';
            const hidden = hiddenSeriesSet.has(item.id);
            const legendContent = (
              <>
                <span className="h-1.5 w-4" style={{ backgroundColor: chartToneColor[tone].stroke }} />
                <span className="truncate">{item.label}</span>
              </>
            );
            const legendClassName = cn(
              'inline-flex h-6 min-w-0 items-center gap-1.5 px-0.5 text-[11px] transition-colors',
              hidden ? 'text-[#727b8c] opacity-60' : 'text-[#a9b0bb]',
              onLegendToggle ? 'cursor-pointer border-b border-transparent hover:border-[var(--hz-ui-accent-muted)] hover:text-white focus-visible:border-[var(--hz-ui-accent)] focus-visible:outline-none' : ''
            );
            return onLegendToggle ? (
              <button
                key={item.id}
                type="button"
                className={legendClassName}
                data-hz-chart-legend={item.id}
                data-hz-chart-legend-active={hidden ? 'false' : 'true'}
                aria-label={`Toggle series ${stringifyNode(item.label, item.id)}`}
                aria-pressed={!hidden}
                onClick={() => onLegendToggle(item)}
              >
                {legendContent}
              </button>
            ) : (
              <span
                key={item.id}
                className={legendClassName}
                data-hz-chart-legend={item.id}
                data-hz-chart-legend-active={hidden ? 'false' : 'true'}
              >
                {legendContent}
              </span>
            );
          })}
        </div>
      </header>
      <div className="min-w-0 px-3 py-2">
        <svg
          role="img"
          aria-label={stringifyNode(title, 'Time series chart')}
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="block h-auto w-full overflow-visible"
          preserveAspectRatio="none"
        >
          <g aria-hidden="true">
            {[0, 0.5, 1].map(scale => {
              const y = padding.top + plotHeight * scale;
              const value = maxValue - valueRange * scale;
              return (
                <g key={scale}>
                  <line x1={padding.left} x2={viewBoxWidth - padding.right} y1={y} y2={y} stroke="var(--hz-ui-line-faint)" strokeWidth="1" />
                  <text x={padding.left - 8} y={y + 3} textAnchor="end" className="fill-[#727b8c] text-[10px]">
                    {Math.round(value)}
                  </text>
                </g>
              );
            })}
            {xLabels.map((label, index) => {
              const x = padding.left + (xLabels.length <= 1 ? plotWidth / 2 : (index / (xLabels.length - 1)) * plotWidth);
              return (
                <text key={label} x={x} y={viewBoxHeight - 6} textAnchor="middle" className="fill-[#727b8c] text-[10px]">
                  {label}
                </text>
              );
            })}
          </g>
          {selectedPoint ? (
            <g data-hz-chart-crosshair={selectedPoint.id} aria-hidden="true">
              <line x1={selectedPoint.x} x2={selectedPoint.x} y1={padding.top} y2={viewBoxHeight - padding.bottom} stroke="var(--hz-ui-accent-muted)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1={padding.left} x2={viewBoxWidth - padding.right} y1={selectedPoint.y} y2={selectedPoint.y} stroke="var(--hz-ui-line-soft)" strokeWidth="1" strokeDasharray="4 4" />
            </g>
          ) : null}
          {series.map(item => {
            const tone = item.tone || 'info';
            const points = item.points.map((point, index) => getPoint(point, index, item.points)).join(' ');
            const hidden = hiddenSeriesSet.has(item.id);
            return (
              <g key={item.id} data-hz-series={item.id} data-hz-series-hidden={hidden ? 'true' : 'false'} opacity={hidden ? 0.2 : 1}>
                <polyline points={points} fill="none" stroke={chartToneColor[tone].soft} strokeWidth="8" strokeLinecap="butt" strokeLinejoin="round" />
                <polyline points={points} fill="none" stroke={chartToneColor[tone].stroke} strokeWidth="2" strokeLinecap="butt" strokeLinejoin="round" />
                {item.points.map((point, index) => {
                  const [cx, cy] = getPoint(point, index, item.points).split(',');
                  const pointId = `${item.id}:${point.label}`;
                  const selected = selectedPointId === pointId && !hidden;
                  return (
                    <circle
                      key={`${item.id}-${point.label}`}
                      cx={cx}
                      cy={cy}
                      r={selected ? '4' : '2.2'}
                      fill={chartToneColor[tone].stroke}
                      role={onPointSelect && !hidden ? 'button' : undefined}
                      tabIndex={onPointSelect && !hidden ? 0 : undefined}
                      aria-label={onPointSelect && !hidden ? `Select chart point ${stringifyNode(item.label, item.id)} ${point.label} ${point.value}` : undefined}
                      data-hz-chart-point={pointId}
                      data-hz-chart-point-selected={selected ? 'true' : 'false'}
                      data-hz-chart-point-value={point.value}
                      onClick={() => {
                        if (!hidden) onPointSelect?.(point, item);
                      }}
                      onKeyDown={event => {
                        if (!onPointSelect || hidden) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onPointSelect(point, item);
                        }
                      }}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

export function HzWorkbenchSurface({
  heading,
  actions,
  selected = false,
  children,
  className,
  headerClassName,
  titleWrapClassName,
  titleClassName,
  bodyClassName,
  ...sectionProps
}: {
  heading: React.ReactNode;
  actions?: React.ReactNode;
  selected?: boolean;
  children: React.ReactNode;
  headerClassName?: string;
  titleWrapClassName?: string;
  titleClassName?: string;
  bodyClassName?: string;
} & React.HTMLAttributes<HTMLElement>) {
  const isSimpleHeading = typeof heading === 'string' || typeof heading === 'number';

  return (
    <section
      {...sectionProps}
      className={cn(
        'min-w-0 grid content-start gap-3 rounded-[3px] border bg-[var(--hz-ui-surface-raised)] p-3 transition-colors',
        selected
          ? 'border-[var(--hz-ui-accent-muted)] shadow-[inset_0_1px_0_rgba(124,147,219,0.14)]'
          : 'border-[var(--hz-ui-line-soft)]',
        className
      )}
      data-hz-ui="workbench-surface"
      data-hz-workbench-surface-selected={selected ? 'true' : 'false'}
      aria-selected={sectionProps.role === 'button' ? selected : undefined}
    >
      <header className={cn('flex items-start justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] pb-2', headerClassName)}>
        <div className={cn('min-w-0', titleWrapClassName)}>
          {isSimpleHeading ? (
            <div className={cn('truncate text-[16px] font-semibold leading-6 text-[#f3f6fb]', titleClassName)}>
              {heading}
            </div>
          ) : (
            heading
          )}
        </div>
        {actions ? <div className="flex flex-none items-center gap-2">{actions}</div> : null}
      </header>
      <div className={cn('min-w-0', bodyClassName)} data-hz-workbench-surface-body="true">
        {children}
      </div>
    </section>
  );
}

export type HzChartSurfaceVariant = 'panel' | 'inline';

export function HzChartSurface({
  heading,
  unit,
  selected = false,
  variant = 'panel',
  actions,
  footer,
  children,
  className,
  contentClassName,
  footerClassName,
  ...sectionProps
}: {
  heading: React.ReactNode;
  unit?: React.ReactNode;
  selected?: boolean;
  variant?: HzChartSurfaceVariant;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
  footerClassName?: string;
} & React.HTMLAttributes<HTMLElement>) {
  const inline = variant === 'inline';

  return (
    <section
      {...sectionProps}
      className={cn(
        'grid min-h-[240px] min-w-0 content-start border transition-colors',
        inline
          ? 'gap-0 rounded-none border-x-0 border-y bg-transparent p-0'
          : 'gap-3 rounded-[3px] bg-[var(--hz-ui-surface-raised)] p-3',
        selected
          ? inline
            ? 'border-[var(--hz-ui-accent-muted)] shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]'
            : 'border-[var(--hz-ui-accent-muted)] shadow-[inset_0_1px_0_rgba(124,147,219,0.16)]'
          : 'border-[var(--hz-ui-line-soft)] hover:border-[var(--hz-ui-line-strong)]',
        className
      )}
      data-hz-ui="chart-surface"
      data-hz-chart-surface-selected={selected ? 'true' : 'false'}
      data-hz-chart-surface-variant={variant}
      aria-selected={sectionProps.role === 'button' ? selected : undefined}
    >
      <header className={cn('grid min-h-8 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-[var(--hz-ui-line-soft)]', inline ? 'px-3 py-2' : 'pb-2')}>
        <div className="min-w-0">
          <div className="truncate text-[16px] font-semibold leading-6 text-[#f3f6fb]">{heading}</div>
        </div>
        <div className="flex min-w-0 flex-none items-center gap-2">
          {unit ? <span className="text-[11px] font-semibold text-[#727b8c]">{unit}</span> : null}
          {actions}
        </div>
      </header>
      <div className={cn('min-w-0', contentClassName)} data-hz-chart-surface-body="true">
        {children}
      </div>
      {footer ? (
        <footer className={cn('min-w-0 text-[12px] text-[#727b8c]', inline ? 'border-t border-[var(--hz-ui-line-soft)] px-3 py-2' : '', footerClassName)} data-hz-chart-surface-footer="true">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

export type HzEChartsDataZoomRange = {
  start?: number;
  end?: number;
  startValue?: number | string;
  endValue?: number | string;
};

function readHzDataZoomNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readHzDataZoomValue(value: unknown) {
  return typeof value === 'number' || typeof value === 'string' ? value : undefined;
}

export function HzEChartsPanel({
  option,
  className,
  edge = 'default',
  height = 320,
  onChartClick,
  onDataZoomChange,
  tone = 'operator',
  preserveDataZoom = false,
  ...props
}: {
  option: EChartsOption;
  className?: string;
  edge?: 'default' | 'metrics-chart';
  height?: number;
  onChartClick?: (dataIndex: number) => void;
  onDataZoomChange?: (range: HzEChartsDataZoomRange) => void;
  tone?: 'default' | 'deck' | 'operator';
  preserveDataZoom?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<echarts.ECharts | null>(null);
  const dataZoomInteractionRef = React.useRef(false);
  const markDataZoomInteraction = React.useCallback(() => {
    dataZoomInteractionRef.current = true;
  }, []);

  React.useEffect(() => {
    if (!ref.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current);
    }
    const chart = chartRef.current;

    const handleClick = (params: unknown) => {
      const payload = params as { dataIndex?: unknown };
      if (typeof payload.dataIndex === 'number') {
        onChartClick?.(payload.dataIndex);
      }
    };
    const handleDataZoom = (params: unknown) => {
      if (!dataZoomInteractionRef.current) return;
      const zoomParams = params as { batch?: Array<Record<string, unknown>> } & Record<string, unknown>;
      const payload = Array.isArray(zoomParams.batch) ? zoomParams.batch[0] : zoomParams;
      const range: HzEChartsDataZoomRange = {
        start: readHzDataZoomNumber(payload?.start),
        end: readHzDataZoomNumber(payload?.end),
        startValue: readHzDataZoomValue(payload?.startValue),
        endValue: readHzDataZoomValue(payload?.endValue)
      };
      if (range.start == null && range.end == null && range.startValue == null && range.endValue == null) return;
      onDataZoomChange?.(range);
    };
    chart.on('click', handleClick);
    chart.on('datazoom', handleDataZoom);

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(ref.current);

    return () => {
      resizeObserver.disconnect();
      chart.off('click', handleClick);
      chart.off('datazoom', handleDataZoom);
    };
  }, [onChartClick, onDataZoomChange]);

  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (!preserveDataZoom) {
      chart.setOption(option, { notMerge: true });
      return;
    }

    const previousOption = chart.getOption() as { dataZoom?: Array<Record<string, unknown>> } | undefined;
    const previousDataZoom = Array.isArray(previousOption?.dataZoom) ? previousOption.dataZoom : [];

    chart.setOption(option, {
      notMerge: false,
      lazyUpdate: true,
      replaceMerge: ['xAxis', 'yAxis', 'series']
    });

    previousDataZoom.forEach((zoom, dataZoomIndex) => {
      const start = typeof zoom.start === 'number' ? zoom.start : undefined;
      const end = typeof zoom.end === 'number' ? zoom.end : undefined;
      const startValue = zoom.startValue;
      const endValue = zoom.endValue;
      if (start == null && end == null && startValue == null && endValue == null) return;
      chart.dispatchAction({ type: 'dataZoom', dataZoomIndex, start, end, startValue, endValue });
    });
  }, [option, preserveDataZoom]);

  React.useEffect(
    () => () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    },
    []
  );

  return (
    <div
      {...props}
      className={cn(
        tone === 'deck'
          ? 'overflow-hidden rounded-none border-x-0 border-y border-[var(--ops-border-color)] bg-transparent shadow-none'
          : tone === 'operator'
            ? 'overflow-hidden rounded-none border-x-0 border-y border-[var(--ops-border-color)] bg-transparent shadow-none'
            : 'overflow-hidden rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] shadow-none',
        edge === 'metrics-chart' ? 'border-[#252b35]' : null,
        className
      )}
      data-hz-ui="echarts-panel"
      data-hz-chart-runtime="echarts"
      data-hz-echarts-edge={edge}
      data-hz-echarts-datazoom-feedback={onDataZoomChange ? 'change-callback' : undefined}
      data-hz-echarts-datazoom-event={onDataZoomChange ? 'native-datazoom' : undefined}
      data-hz-echarts-datazoom-preserve={preserveDataZoom ? 'preserved' : 'replace'}
    >
      <div className="pointer-events-none h-px w-full bg-[var(--ops-border-color)]" />
      <div
        className={tone === 'deck' || tone === 'operator' ? 'relative' : undefined}
        ref={ref}
        style={{ height }}
        data-hz-echarts-datazoom-interaction={onDataZoomChange ? 'native-live-drag' : undefined}
        onPointerDownCapture={markDataZoomInteraction}
        onWheelCapture={markDataZoomInteraction}
      />
    </div>
  );
}

export function HzMetricTimeSeriesPanel({
  heading,
  unit,
  selected = false,
  option,
  height = 360,
  footer,
  loading = false,
  loadingLabel = 'Loading',
  error,
  emptyTitle,
  emptyDescription,
  zoomActionLabel,
  zoomActionDisabled = false,
  zoomActionProps,
  onZoomAction,
  onDataZoomChange,
  preserveDataZoom = true,
  actions,
  surfaceVariant = 'panel',
  className,
  surfaceClassName,
  chartClassName,
  surfaceProps
}: {
  heading: React.ReactNode;
  unit?: React.ReactNode;
  selected?: boolean;
  option?: EChartsOption | null;
  height?: number;
  footer?: React.ReactNode;
  loading?: boolean;
  loadingLabel?: React.ReactNode;
  error?: React.ReactNode;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  zoomActionLabel?: React.ReactNode;
  zoomActionDisabled?: boolean;
  zoomActionProps?: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'disabled'>;
  onZoomAction?: () => void;
  onDataZoomChange?: (range: HzEChartsDataZoomRange) => void;
  preserveDataZoom?: boolean;
  actions?: React.ReactNode;
  surfaceVariant?: HzChartSurfaceVariant;
  className?: string;
  surfaceClassName?: string;
  chartClassName?: string;
  surfaceProps?: React.HTMLAttributes<HTMLElement> & HzDataAttributeProps;
}) {
  const zoomAction = zoomActionLabel ? (
    <HzButton
      size="sm"
      intent="ghost"
      {...zoomActionProps}
      disabled={zoomActionDisabled}
      onClick={event => {
        event.stopPropagation();
        onZoomAction?.();
      }}
    >
      {zoomActionLabel}
    </HzButton>
  ) : null;
  const mergedActions = actions || zoomAction ? (
    <div className="flex min-w-0 flex-none items-center gap-1" data-hz-metric-timeseries-actions="true">
      {actions}
      {zoomAction}
    </div>
  ) : null;

  return (
    <div
      className={cn('min-w-0', className)}
      data-hz-ui="metric-time-series-panel"
      data-hz-chart-kind="metric-time-series-echarts"
      data-hz-metric-timeseries-variant={surfaceVariant}
    >
      <HzChartSurface
        {...surfaceProps}
        heading={heading}
        unit={unit}
        selected={selected}
        variant={surfaceVariant}
        actions={mergedActions}
        footer={footer}
        className={surfaceClassName}
      >
        {loading ? (
          <div className="border-y border-[var(--ops-border-color)] px-3 py-12 text-sm text-[var(--ops-text-secondary)]" data-hz-metric-timeseries-state="loading">
            {loadingLabel}
          </div>
        ) : error ? (
          <div className="border-y border-rose-400/20 bg-rose-400/10 px-3 py-12 text-sm text-rose-200" data-hz-metric-timeseries-state="error">
            {error}
          </div>
        ) : option ? (
          <HzEChartsPanel
            option={option}
            height={height}
            className={cn('rounded-none border-x-0 border-y border-[var(--ops-border-color)] bg-transparent', chartClassName)}
            tone="operator"
            preserveDataZoom={preserveDataZoom}
            onDataZoomChange={onDataZoomChange}
          />
        ) : (
          <div className="border-y border-[var(--ops-border-color)] px-3 py-12 text-sm text-[var(--ops-text-secondary)]" data-hz-metric-timeseries-state="empty">
            {emptyTitle ? <div className="font-medium text-[var(--ops-text-primary)]">{emptyTitle}</div> : null}
            {emptyDescription ? <div className="mt-1">{emptyDescription}</div> : null}
          </div>
        )}
      </HzChartSurface>
    </div>
  );
}

type HzMetricTimeSeriesPanelProps = React.ComponentProps<typeof HzMetricTimeSeriesPanel>;

export function HzMonitorHistoryChartGrid({
  children,
  layout = 'auto',
  className,
  ...props
}: {
  children: React.ReactNode;
  layout?: 'auto' | 'single';
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('grid min-w-0 gap-2', layout === 'single' ? 'xl:grid-cols-1' : 'xl:grid-cols-2', className)}
      data-hz-ui="monitor-history-chart-grid"
      data-monitor-history-chart-grid="shared-history-chart-grid"
      data-monitor-history-chart-grid-owner="hertzbeat-ui-history-chart-grid"
      data-monitor-history-chart-grid-layout={layout}
      data-monitor-history-chart-grid-rhythm="shared-tight"
    >
      {children}
    </div>
  );
}

export function HzMonitorHistoryChartCard({
  cardKey,
  selected = false,
  onSelect,
  surfaceProps,
  surfaceClassName,
  chartClassName,
  ...props
}: Omit<HzMetricTimeSeriesPanelProps, 'selected' | 'surfaceProps'> & {
  cardKey: string;
  selected?: boolean;
  onSelect?: () => void;
  surfaceProps?: React.HTMLAttributes<HTMLElement> & HzDataAttributeProps;
}) {
  const handleClick: React.MouseEventHandler<HTMLElement> = event => {
    surfaceProps?.onClick?.(event);
    if (event.defaultPrevented) return;
    onSelect?.();
  };
  const handleKeyDown: React.KeyboardEventHandler<HTMLElement> = event => {
    surfaceProps?.onKeyDown?.(event);
    if (event.defaultPrevented || !onSelect) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSelect();
  };

  return (
    <div
      className="min-w-0"
      data-hz-ui="monitor-history-chart-card"
      data-monitor-history-card-owner="hertzbeat-ui-history-chart-card"
      data-monitor-history-card-key={cardKey}
    >
      <HzMetricTimeSeriesPanel
        {...props}
        selected={selected}
        surfaceVariant="inline"
        surfaceClassName={cn(
          'min-h-[420px] rounded-none border-x-0 border-y border-[var(--hz-ui-line-soft)] bg-transparent',
          surfaceClassName
        )}
        chartClassName={cn('rounded-none border-x-0 border-y-0 bg-transparent', chartClassName)}
        surfaceProps={{
          role: onSelect ? 'button' : surfaceProps?.role,
          tabIndex: onSelect ? 0 : surfaceProps?.tabIndex,
          ...surfaceProps,
          'data-monitor-history-card': cardKey,
          'data-monitor-history-card-source': 'hertzbeat-ui-history-chart',
          'data-monitor-history-card-chrome': 'hertzbeat-ui-history-chart-inline',
          'data-monitor-history-chart-treatment': 'collector-latency-inline',
          'data-monitor-history-card-height': 'content-driven',
          'data-monitor-history-card-selected': selected ? 'true' : 'false',
          onClick: handleClick,
          onKeyDown: handleKeyDown
        }}
      />
    </div>
  );
}

export type HzTimeDistributionSegment = {
  id: string;
  label: React.ReactNode;
  value: number;
  tone?: HzStatusTone;
};

export type HzTimeDistributionBucket = {
  id: string;
  label: React.ReactNode;
  segments: HzTimeDistributionSegment[];
};

export function HzTimeDistributionChart({
  title,
  buckets,
  height = 112,
  selectedBucketId,
  onBucketSelect,
  hiddenSegmentIds = [],
  onLegendToggle,
  className
}: {
  title: React.ReactNode;
  buckets: HzTimeDistributionBucket[];
  height?: number;
  selectedBucketId?: string;
  onBucketSelect?: (bucket: HzTimeDistributionBucket) => void;
  hiddenSegmentIds?: string[];
  onLegendToggle?: (segment: HzTimeDistributionSegment) => void;
  className?: string;
}) {
  const maxTotal = Math.max(1, ...buckets.map(bucket => bucket.segments.reduce((sum, segment) => sum + segment.value, 0)));
  const legend = Array.from(new Map(buckets.flatMap(bucket => bucket.segments.map(segment => [segment.id, segment]))).values());
  const hiddenSegmentSet = new Set(hiddenSegmentIds);

  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="time-distribution-chart"
      data-hz-chart-kind="histogram"
    >
      <header
        className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2"
      >
        <div className="min-w-0 truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {legend.map(segment => {
            const tone = segment.tone || 'neutral';
            const hidden = hiddenSegmentSet.has(segment.id);
            const legendContent = (
              <>
                <span className="h-1.5 w-3" style={{ backgroundColor: chartToneColor[tone].stroke }} />
                <span className="truncate">{segment.label}</span>
              </>
            );
            const legendClassName = cn(
              'inline-flex h-6 min-w-0 items-center gap-1.5 px-0.5 text-[11px] transition-colors',
              hidden ? 'text-[#727b8c] opacity-60' : 'text-[#a9b0bb]',
              onLegendToggle ? 'cursor-pointer border-b border-transparent hover:border-[var(--hz-ui-accent-muted)] hover:text-white focus-visible:border-[var(--hz-ui-accent)] focus-visible:outline-none' : ''
            );
            return onLegendToggle ? (
              <button
                key={segment.id}
                type="button"
                className={legendClassName}
                data-hz-chart-legend={segment.id}
                data-hz-chart-legend-active={hidden ? 'false' : 'true'}
                aria-label={`Toggle segment ${stringifyNode(segment.label, segment.id)}`}
                aria-pressed={!hidden}
                onClick={() => onLegendToggle(segment)}
              >
                {legendContent}
              </button>
            ) : (
              <span
                key={segment.id}
                className={legendClassName}
                data-hz-chart-legend={segment.id}
                data-hz-chart-legend-active={hidden ? 'false' : 'true'}
              >
                {legendContent}
              </span>
            );
          })}
        </div>
      </header>
      <div className="grid min-w-0 gap-2 px-3 py-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, buckets.length)}, minmax(0, 1fr))` }}>
        {buckets.map(bucket => {
          const total = bucket.segments.reduce((sum, segment) => sum + segment.value, 0);
          const selected = selectedBucketId === bucket.id;
          return (
            <button
              key={bucket.id}
              type="button"
              className={cn(
                'grid min-w-0 grid-rows-[minmax(0,1fr)_18px] gap-1 text-left transition-colors',
                onBucketSelect ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hz-ui-active-soft)]' : 'cursor-default',
                selected ? 'bg-[var(--hz-ui-active-soft)] shadow-[inset_0_-2px_0_var(--hz-ui-accent-muted)]' : 'hover:bg-[var(--hz-ui-surface-soft)]'
              )}
              aria-label={onBucketSelect ? `Select time bucket ${stringifyNode(bucket.label, bucket.id)}` : undefined}
              onClick={() => onBucketSelect?.(bucket)}
              data-hz-bucket={bucket.id}
              data-hz-bucket-selected={selected ? 'true' : 'false'}
              data-hz-time-window-label={stringifyNode(bucket.label, bucket.id)}
            >
              <div className="flex min-w-0 items-end justify-center gap-0.5 border-b border-[var(--hz-ui-line-faint)]" style={{ height }}>
                {bucket.segments.map(segment => {
                  const tone = segment.tone || 'neutral';
                  const segmentHeight = Math.max(6, Math.round((segment.value / maxTotal) * height));
                  const hidden = hiddenSegmentSet.has(segment.id);
                  return (
                    <span
                      key={segment.id}
                      title={`${stringifyNode(segment.label, segment.id)} ${segment.value}`}
                      className="block w-full min-w-[3px]"
                      data-hz-segment={segment.id}
                      data-hz-segment-hidden={hidden ? 'true' : 'false'}
                      data-hz-segment-value={segment.value}
                      style={{
                        height: segmentHeight,
                        backgroundColor: chartToneColor[tone].stroke,
                        boxShadow: `0 0 0 1px ${chartToneColor[tone].soft} inset`,
                        opacity: hidden ? 0.2 : 1
                      }}
                    />
                  );
                })}
              </div>
              <div className="grid min-w-0 grid-cols-1 text-center">
                <span className="truncate font-mono text-[10px] text-[#727b8c]">{bucket.label}</span>
                <span className="sr-only">{total}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export type HzStatusTimelineState = {
  id: string;
  label: React.ReactNode;
  tone?: HzStatusTone;
  width?: number;
};

export type HzStatusTimelineRow = {
  id: string;
  label: React.ReactNode;
  states: HzStatusTimelineState[];
};

export type HzStatusIncidentHistoryItem = {
  id: string;
  title: React.ReactNode;
  message: React.ReactNode;
  meta: React.ReactNode;
  stateLabel?: React.ReactNode;
  stateTone?: HzStatusTone;
};

export type HzStatusIncidentHistoryProps = React.HTMLAttributes<HTMLElement> & {
  title: React.ReactNode;
  items: HzStatusIncidentHistoryItem[];
  emptyLabel?: React.ReactNode;
};

export function HzStatusIncidentHistory({
  title,
  items,
  emptyLabel = null,
  className,
  ...props
}: HzStatusIncidentHistoryProps) {
  return (
    <section
      {...props}
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="status-incident-history"
      data-hz-status-incident-history-owner="hertzbeat-ui-status-incident-history"
      data-hz-status-incident-history-contract="angular-collapse-desc"
    >
      <header className="flex min-h-9 items-center justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0 truncate text-[12px] font-semibold text-[#f3f6fb]">{title}</div>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]">history</span>
      </header>
      {items.length > 0 ? (
        <div className="grid min-w-0">
          {items.map((item, index) => {
            const tone = item.stateTone || 'neutral';
            return (
              <details
                key={item.id}
                className="group border-b border-[var(--hz-ui-line-faint)] last:border-b-0"
                open={index === 0}
                data-hz-status-incident-history-row={item.id}
              >
                <summary className="grid min-h-9 cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-[11px] font-semibold text-[#dbe4f0] marker:hidden">
                  <span className="min-w-0 truncate">{item.title}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]">{item.meta}</span>
                </summary>
                <div className="grid gap-2 px-3 pb-3 text-[12px] text-[#cbd5e1]">
                  <p className="m-0 min-w-0 break-words leading-5">{item.message}</p>
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]">{item.meta}</span>
                    {item.stateLabel ? (
                      <span
                        className="inline-flex min-h-5 items-center rounded-[3px] border px-2 text-[10px] font-semibold"
                        data-hz-status-incident-history-state={tone}
                        style={{
                          borderColor: chartToneColor[tone].stroke,
                          backgroundColor: chartToneColor[tone].soft,
                          color: chartToneColor[tone].stroke
                        }}
                      >
                        {item.stateLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      ) : emptyLabel ? (
        <div className="px-3 py-3 text-[12px] text-[#858d9a]">{emptyLabel}</div>
      ) : null}
    </section>
  );
}

export function HzStatusTimeline({
  title,
  rows,
  className
}: {
  title: React.ReactNode;
  rows: HzStatusTimelineRow[];
  className?: string;
}) {
  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="status-timeline"
      data-hz-chart-kind="state-timeline"
    >
      <header className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0 truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</div>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]">state</span>
      </header>
      <div className="grid gap-1 px-3 py-2">
        {rows.map(row => {
          const totalWidth = row.states.reduce((sum, state) => sum + (state.width || 1), 0);
          return (
            <div key={row.id} className="grid min-w-0 grid-cols-[112px_minmax(0,1fr)] items-center gap-2 text-[11px]">
              <span className="min-w-0 truncate text-[#cbd5e1]">{row.label}</span>
              <span className="flex h-6 min-w-0 border border-[var(--hz-ui-line-faint)] bg-[var(--hz-ui-canvas)]">
                {row.states.map(state => {
                  const tone = state.tone || 'neutral';
                  const width = `${Math.max(4, ((state.width || 1) / totalWidth) * 100)}%`;
                  return (
                    <span
                      key={state.id}
                      className="flex min-w-[8px] items-center overflow-hidden border-r border-[var(--hz-ui-canvas)] px-1.5 last:border-r-0"
                      data-hz-state={state.id}
                      data-hz-state-tone={tone}
                      style={{
                        width,
                        backgroundColor: chartToneColor[tone].soft,
                        color: chartToneColor[tone].stroke,
                        boxShadow: `inset 0 0 0 1px ${chartToneColor[tone].soft}`
                      }}
                    >
                      <span className="truncate font-mono text-[10px]">{state.label}</span>
                    </span>
                  );
                })}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export type HzHeatmapCell = {
  id: string;
  label: React.ReactNode;
  value: number;
  tone?: HzStatusTone;
};

export type HzHeatmapBucket = {
  id: string;
  label: React.ReactNode;
  cells: HzHeatmapCell[];
};

export function HzHeatmapChart({
  title,
  buckets,
  className
}: {
  title: React.ReactNode;
  buckets: HzHeatmapBucket[];
  className?: string;
}) {
  const maxValue = Math.max(1, ...buckets.flatMap(bucket => bucket.cells.map(cell => cell.value)));
  const yLabels = buckets[0]?.cells.map(cell => ({ id: cell.id, label: cell.label })) || [];

  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="heatmap-chart"
      data-hz-chart-kind="heatmap"
    >
      <header className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0 truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</div>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]">density</span>
      </header>
      <div className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] gap-2 px-3 py-2">
        <div className="grid gap-1 pt-6">
          {yLabels.map(label => (
            <div key={label.id} className="flex h-6 items-center justify-end truncate font-mono text-[10px] text-[#727b8c]">
              {label.label}
            </div>
          ))}
        </div>
        <div className="grid min-w-0 gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(1, buckets.length)}, minmax(0, 1fr))` }}>
          {buckets.map(bucket => (
            <div key={bucket.id} className="grid min-w-0 gap-1" data-hz-heatmap-bucket={bucket.id}>
              <div className="truncate text-center font-mono text-[10px] text-[#727b8c]">{bucket.label}</div>
              {bucket.cells.map(cell => {
                const tone = cell.tone || 'neutral';
                const opacity = Math.min(0.92, Math.max(0.18, 0.18 + (cell.value / maxValue) * 0.74));
                return (
                  <span
                    key={cell.id}
                    title={`${stringifyNode(cell.label, cell.id)} ${cell.value}`}
                    className="block h-6 min-w-0 border border-[var(--hz-ui-line-faint)]"
                    data-hz-heatmap-cell={`${bucket.id}-${cell.id}`}
                    data-hz-heatmap-value={cell.value}
                    style={{
                      backgroundColor: chartToneColor[tone].stroke,
                      opacity
                    }}
                  >
                    <span className="sr-only">
                      {bucket.label} {cell.label} {cell.value}
                    </span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export type HzLogStreamRow = {
  id: string;
  timestamp: React.ReactNode;
  level: string;
  source: React.ReactNode;
  message: React.ReactNode;
  attributes?: React.ReactNode;
};

function getLogLevelTone(level: string): HzStatusTone {
  const normalized = level.toLowerCase();
  if (normalized === 'error' || normalized === 'fatal') return 'critical';
  if (normalized === 'warn' || normalized === 'warning') return 'warning';
  if (normalized === 'info') return 'info';
  return 'neutral';
}

export function HzLogStream({
  title,
  rows,
  className
}: {
  title: React.ReactNode;
  rows: HzLogStreamRow[];
  className?: string;
}) {
  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="log-stream"
      data-hz-chart-kind="logs"
    >
      <header className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0 truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</div>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]">{rows.length} lines</span>
      </header>
      <div className="grid min-w-0">
        {rows.map(row => {
          const tone = getLogLevelTone(row.level);
          return (
            <div
              key={row.id}
              className="grid min-w-0 grid-cols-[74px_54px_104px_minmax(0,1fr)] items-center gap-2 border-b border-[var(--hz-ui-line-faint)] px-3 py-2 text-[11px] last:border-b-0"
              data-hz-log-row={row.id}
              data-hz-log-level={row.level}
            >
              <span className="font-mono text-[#727b8c]">{row.timestamp}</span>
              <span className="inline-flex h-5 items-center justify-center border px-1.5 font-mono text-[10px]" style={{ borderColor: chartToneColor[tone].soft, color: chartToneColor[tone].stroke }}>
                {row.level}
              </span>
              <span className="min-w-0 truncate text-[#8f99ab]">{row.source}</span>
              <span className="min-w-0 truncate font-mono text-[#dbe4f0]">
                {row.message}
                {row.attributes ? <span className="ml-2 text-[#727b8c]">{row.attributes}</span> : null}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export type HzLogVolumeSegment = {
  id: string;
  label: React.ReactNode;
  value: number;
  tone?: HzStatusTone;
};

export type HzLogVolumeBucket = {
  id: string;
  label: React.ReactNode;
  segments: HzLogVolumeSegment[];
};

export function HzLogVolumeChart({
  title,
  buckets,
  height = 112,
  className
}: {
  title: React.ReactNode;
  buckets: HzLogVolumeBucket[];
  height?: number;
  className?: string;
}) {
  const maxTotal = Math.max(1, ...buckets.map(bucket => bucket.segments.reduce((sum, segment) => sum + segment.value, 0)));
  const legend = Array.from(new Map(buckets.flatMap(bucket => bucket.segments.map(segment => [segment.id, segment]))).values());

  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="log-volume-chart"
      data-hz-chart-kind="log-volume"
    >
      <header className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0 truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {legend.map(segment => {
            const tone = segment.tone || 'neutral';
            return (
              <span key={segment.id} className="inline-flex items-center gap-1.5 text-[11px] text-[#a9b0bb]">
                <span className="h-1.5 w-3" style={{ backgroundColor: chartToneColor[tone].stroke }} />
                <span className="truncate">{segment.label}</span>
              </span>
            );
          })}
        </div>
      </header>
      <div className="grid min-w-0 gap-2 px-3 py-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, buckets.length)}, minmax(0, 1fr))` }}>
        {buckets.map(bucket => {
          const total = bucket.segments.reduce((sum, segment) => sum + segment.value, 0);
          return (
            <div key={bucket.id} className="grid min-w-0 grid-rows-[minmax(0,1fr)_18px] gap-1" data-hz-log-volume-bucket={bucket.id}>
              <div className="flex min-w-0 items-end justify-center gap-0.5 border-b border-[var(--hz-ui-line-faint)]" style={{ height }}>
                {bucket.segments.map(segment => {
                  const tone = segment.tone || getLogLevelTone(String(segment.id));
                  const segmentHeight = Math.max(6, Math.round((segment.value / maxTotal) * height));
                  return (
                    <span
                      key={segment.id}
                      title={`${stringifyNode(segment.label, segment.id)} ${segment.value}`}
                      className="block w-full min-w-[3px]"
                      data-hz-log-volume-segment={segment.id}
                      data-hz-log-volume-value={segment.value}
                      style={{
                        height: segmentHeight,
                        backgroundColor: chartToneColor[tone].stroke,
                        boxShadow: `0 0 0 1px ${chartToneColor[tone].soft} inset`
                      }}
                    />
                  );
                })}
              </div>
              <div className="grid min-w-0 grid-cols-1 text-center">
                <span className="truncate font-mono text-[10px] text-[#727b8c]">{bucket.label}</span>
                <span className="sr-only">{total}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export type HzLogLevelDistributionItem = {
  id: string;
  label: React.ReactNode;
  value: number;
  tone?: HzStatusTone;
};

export function HzLogLevelDistribution({
  title,
  levels,
  className
}: {
  title: React.ReactNode;
  levels: HzLogLevelDistributionItem[];
  className?: string;
}) {
  const maxValue = Math.max(1, ...levels.map(level => level.value));
  const total = levels.reduce((sum, level) => sum + level.value, 0);

  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="log-level-distribution"
      data-hz-chart-kind="log-levels"
    >
      <header className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0 truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</div>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]">{total} lines</span>
      </header>
      <div className="grid gap-2 px-3 py-2">
        {levels.map(level => {
          const tone = level.tone || getLogLevelTone(String(level.id));
          const width = `${Math.max(4, (level.value / maxValue) * 100)}%`;
          return (
            <div key={level.id} className="grid min-w-0 grid-cols-[58px_minmax(0,1fr)_42px] items-center gap-2 text-[11px]" data-hz-log-level-bar={level.id}>
              <span className="truncate font-mono text-[#8f99ab]">{level.label}</span>
              <span className="h-5 min-w-0 border border-[var(--hz-ui-line-faint)] bg-[var(--hz-ui-canvas)]">
                <span
                  className="block h-full"
                  style={{
                    width,
                    backgroundColor: chartToneColor[tone].stroke,
                    boxShadow: `0 0 0 1px ${chartToneColor[tone].soft} inset`
                  }}
                />
              </span>
              <span className="text-right font-mono text-[#cbd5e1]">{level.value}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export type HzTraceSpan = {
  id: string;
  service: React.ReactNode;
  operation: React.ReactNode;
  startMs: number;
  durationMs: number;
  parentId?: string;
  depth?: number;
  selfMs?: number;
  status?: React.ReactNode;
  tone?: HzStatusTone;
};

export type HzTraceEventAttribute = {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: HzStatusTone;
};

export type HzTraceEvent = {
  id: string;
  spanId: string;
  timestampMs: number;
  name: React.ReactNode;
  tone?: HzStatusTone;
  attributes?: HzTraceEventAttribute[];
  meta?: React.ReactNode;
};

export type HzServiceDependencyNode = {
  id: string;
  label: React.ReactNode;
  role?: React.ReactNode;
  value?: React.ReactNode;
  tone?: HzStatusTone;
};

export type HzServiceDependencyEdge = {
  id: string;
  from: string;
  to: string;
  label?: React.ReactNode;
  latencyMs?: number;
  calls?: number;
  errorRate?: number;
  tone?: HzStatusTone;
};

export function HzServiceDependencyGraph({
  title,
  nodes,
  edges,
  className
}: {
  title: React.ReactNode;
  nodes: HzServiceDependencyNode[];
  edges: HzServiceDependencyEdge[];
  className?: string;
}) {
  const nodeToneById = new Map(nodes.map(node => [node.id, node.tone || 'neutral']));

  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="service-dependency-graph"
      data-hz-chart-kind="service-dependency"
    >
      <header className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0 truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</div>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]">
          {nodes.length} services - {edges.length} edges
        </span>
      </header>
      <div className="grid min-w-0 gap-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 border-b border-[var(--hz-ui-line-faint)] lg:border-b-0 lg:border-r lg:border-[var(--hz-ui-line-faint)]">
          {nodes.map(node => {
            const tone = node.tone || 'neutral';
            return (
              <div
                key={node.id}
                className="grid min-h-12 min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-[var(--hz-ui-line-faint)] px-3 py-2 last:border-b-0"
                data-hz-service-node={node.id}
                data-hz-service-node-tone={tone}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0"
                  style={{
                    backgroundColor: chartToneColor[tone].stroke,
                    boxShadow: `0 0 0 3px ${chartToneColor[tone].soft}`
                  }}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold text-[#dbe4f0]">{node.label}</span>
                  {node.role ? <span className="mt-0.5 block truncate font-mono text-[10px] text-[#727b8c]">{node.role}</span> : null}
                </span>
                {node.value ? <span className="shrink-0 font-mono text-[10px] text-[#cbd5e1]">{node.value}</span> : null}
              </div>
            );
          })}
        </div>
        <div className="grid min-w-0">
          {edges.map(edge => {
            const tone = edge.tone || nodeToneById.get(edge.to) || 'info';
            return (
              <div
                key={edge.id}
                className="grid min-h-12 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--hz-ui-line-faint)] px-3 py-2 last:border-b-0"
                data-hz-service-edge={`${edge.from}->${edge.to}`}
                data-hz-service-edge-latency-ms={edge.latencyMs}
                data-hz-service-edge-calls={edge.calls}
                data-hz-service-edge-error-rate={edge.errorRate}
                data-hz-service-edge-tone={tone}
              >
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2 font-mono text-[11px] text-[#dbe4f0]">
                    <span className="truncate text-[#8f99ab]">{edge.from}</span>
                    <span className="h-px w-8 shrink-0" style={{ backgroundColor: chartToneColor[tone].stroke }} aria-hidden="true" />
                    <span className="truncate text-[#8f99ab]">{edge.to}</span>
                  </span>
                  <span className="mt-1 block truncate text-[12px] font-semibold text-[#f3f6fb]">{edge.label || `${edge.from} to ${edge.to}`}</span>
                </span>
                <span className="grid shrink-0 grid-cols-3 gap-3 text-right font-mono text-[10px] text-[#727b8c]">
                  <span>
                    <span className="block text-[#dbe4f0]">{edge.latencyMs ?? '-'}ms</span>
                    latency
                  </span>
                  <span>
                    <span className="block text-[#dbe4f0]">{edge.calls ?? '-'}</span>
                    calls
                  </span>
                  <span>
                    <span className="block" style={{ color: edge.errorRate && edge.errorRate > 0 ? chartToneColor.warning.stroke : '#8f99ab' }}>
                      error {edge.errorRate ?? 0}%
                    </span>
                    rate
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export type HzTopologyMetricRow = {
  id: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  source: React.ReactNode;
  target: React.ReactNode;
  relationType: React.ReactNode;
  sourceKind?: React.ReactNode;
  requestRatePerSecond?: number;
  requestCount?: number;
  errorRate?: number;
  errorCount?: number;
  latencyP95Ms?: number;
  latencyAvgMs?: number;
  evidenceBadges?: React.ReactNode[];
  tone?: HzStatusTone;
};

export type HzTopologyNodeTone = 'success' | 'warning' | 'danger';
export type HzTopologyNodeFocus = 'normal' | 'active' | 'related' | 'dimmed';

export type HzTopologyNodePosition = {
  x: number;
  y: number;
  size: number | string;
};

export type HzTopologyNodeRedMetrics = {
  requestRatePerSecond?: number;
  errorRate?: number;
  latencyP95Ms?: number;
};

export type HzTopologyEdgeTone = 'green' | 'blue' | 'orange' | 'purple' | 'red';
export type HzTopologyEdgeFocus = 'normal' | 'active-path' | 'context-muted';

export type HzTopologyEdgePoint = {
  x: number;
  y: number;
};

export type HzTopologyEdgeRedMetrics = {
  requestRatePerSecond?: number;
  errorRate?: number;
  latencyP95Ms?: number;
};

type HzTopologyEdgeBaseProps = {
  id: string;
  tone?: HzTopologyEdgeTone;
  focus?: HzTopologyEdgeFocus;
  selected?: boolean;
  from: HzTopologyEdgePoint;
  to: HzTopologyEdgePoint;
  relationshipType?: string;
  source?: string;
  evidenceBadges?: string[];
  redMetrics?: HzTopologyEdgeRedMetrics;
};

export type HzTopologyEdgeLineProps = Omit<React.SVGProps<SVGLineElement>, 'id' | 'from' | 'to'> &
  HzTopologyEdgeBaseProps & {
    variant: 'line';
  };

export type HzTopologyEdgeDrilldownProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'id'> &
  HzTopologyEdgeBaseProps & {
    variant: 'drilldown';
  };

export type HzTopologyEdgeProps = HzTopologyEdgeLineProps | HzTopologyEdgeDrilldownProps;

export type HzTopologyLegendItem = {
  id: string;
  label: React.ReactNode;
  value?: React.ReactNode;
  tone?: HzStatusTone;
  pattern?: 'solid' | 'dashed' | 'muted';
  color?: string;
  fill?: string;
  visualSource?: 'hertzbeat-status-token' | 'hertzbeat-interaction-token' | 'hertzbeat-edge-token' | 'lucide-react';
  iconSrc?: string;
  iconAlt?: string;
  iconLibrary?: 'lucide-react';
  iconName?: string;
  iconSource?: 'entity-type-catalog';
};

export type HzTopologyLegendSection = {
  id: string;
  label: React.ReactNode;
  items: HzTopologyLegendItem[];
};

export type HzTopologyLegendBoundary = 'default' | 'framed' | 'flush';

export type HzTopologyLegendDensity = 'default' | 'canvas-dock';

export type HzTopologyLegendProps = React.HTMLAttributes<HTMLElement> & {
  title: React.ReactNode;
  sections: HzTopologyLegendSection[];
  summaryLabel?: React.ReactNode;
  boundary?: HzTopologyLegendBoundary;
  density?: HzTopologyLegendDensity;
};

const topologyLegendBoundaryClassName: Record<HzTopologyLegendBoundary, string> = {
  default: 'border-y border-[var(--hz-ui-line-soft)]',
  framed: 'border border-[var(--hz-ui-line-soft)]',
  flush: 'border-y border-[var(--hz-ui-line-soft)] border-x-0'
};

const topologyLegendVisualSourceLabel: Record<NonNullable<HzTopologyLegendItem['visualSource']>, string> = {
  'hertzbeat-status-token': 'status token',
  'hertzbeat-interaction-token': 'interaction token',
  'hertzbeat-edge-token': 'edge token',
  'lucide-react': 'lucide-react'
};

export type HzTopologyHoverTooltipKind = 'node' | 'edge';
export type HzTopologyHoverTooltipVisibility = 'preview' | 'hover';
export type HzTopologyHoverTooltipTrigger = 'preview' | 'live-edge-hover';
export type HzTopologyHoverTooltipPlacement = 'inline' | 'canvas-top-right' | 'canvas-right-under-toolbar' | 'canvas-anchor';
export type HzTopologyHoverTooltipSize = 'auto' | 'compact' | 'standard';
export type HzTopologyHoverTooltipAnchor = {
  x: number;
  y: number;
  source?: 'g6-pointer' | 'fallback';
};

export type HzTopologyHoverTooltipFact = Omit<React.HTMLAttributes<HTMLDivElement>, 'id'> & {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  meta?: React.ReactNode;
};

export type HzTopologyHoverTooltipMetric = {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: HzStatusTone;
};

export type HzTopologyHoverTooltipProps = React.HTMLAttributes<HTMLElement> & {
  kind: HzTopologyHoverTooltipKind;
  title: React.ReactNode;
  summary?: React.ReactNode;
  facts?: HzTopologyHoverTooltipFact[];
  metrics?: HzTopologyHoverTooltipMetric[];
  evidenceBadges?: string[];
  visibility?: HzTopologyHoverTooltipVisibility;
  trigger?: HzTopologyHoverTooltipTrigger;
  placement?: HzTopologyHoverTooltipPlacement;
  size?: HzTopologyHoverTooltipSize;
  anchor?: HzTopologyHoverTooltipAnchor;
};

export type HzTopologyDetailDrawerFact = {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  meta?: React.ReactNode;
  tone?: HzStatusTone;
  factProps?: React.HTMLAttributes<HTMLDivElement>;
};

export type HzTopologyDetailDrawerAction = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & HzDataAttributeProps & {
  id: string;
  label: React.ReactNode;
  emphasis?: 'primary' | 'neutral';
  copy?: React.ReactNode;
  copyProps?: React.HTMLAttributes<HTMLSpanElement> | (React.HTMLAttributes<HTMLSpanElement> & HzDataAttributeProps);
};

export type HzTopologyDetailDrawerSurface = 'default' | 'framed' | 'flush';
export type HzTopologyDetailDrawerDensity = 'compact' | 'graph-first';

export type HzTopologyDetailDrawerProps = React.HTMLAttributes<HTMLElement> & {
  kind: 'node' | 'edge';
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  boundary?: React.ReactNode;
  boundaryProps?: React.HTMLAttributes<HTMLDivElement>;
  surface?: HzTopologyDetailDrawerSurface;
  density?: HzTopologyDetailDrawerDensity;
  facts?: HzTopologyDetailDrawerFact[];
  actions?: HzTopologyDetailDrawerAction[];
  signalActions?: HzTopologyDetailDrawerAction[];
  signalActionsLabel?: React.ReactNode;
  subjectId?: string;
  sourceId?: string;
  targetId?: string;
  relationType?: string;
  sourceKind?: string;
  entityType?: string;
};

export type HzTopologyEvidenceListKind = 'fault-context' | 'impact-timeline' | 'evidence';

export type HzTopologyEvidenceListItem = Omit<React.HTMLAttributes<HTMLDivElement>, 'id'> & HzDataAttributeProps & {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  meta?: React.ReactNode;
  tone?: HzStatusTone;
};

export type HzTopologyEvidenceListProps = React.HTMLAttributes<HTMLElement> & {
  kind?: HzTopologyEvidenceListKind;
  title: React.ReactNode;
  copy?: React.ReactNode;
  items: HzTopologyEvidenceListItem[];
  boundary?: HzTopologyEvidenceListBoundary;
};

export type HzTopologyEvidenceListBoundary = 'default' | 'flush' | 'toolbar-context' | 'companion-timeline';

const topologyEvidenceListBoundaryClassName: Record<HzTopologyEvidenceListBoundary, string> = {
  default: 'border-y border-[var(--hz-ui-line-soft)]',
  flush: 'border-y border-[var(--hz-ui-line-soft)] border-x-0',
  'toolbar-context': 'border-b border-[var(--hz-ui-line-soft)] border-x-0 border-t-0 px-4 py-3',
  'companion-timeline': 'border border-[var(--hz-ui-line-soft)]'
};

export type HzTopologyFilterStripVariant = 'source-grid' | 'source-rail' | 'view-list';
export type HzTopologyFilterStripBoundary = 'none' | 'section';
export type HzTopologyFilterStripCopyVisibility = 'visible' | 'assistive';

const topologyFilterStripBoundaryClassName: Record<HzTopologyFilterStripBoundary, string> = {
  none: '',
  section: 'border-t border-[var(--hz-ui-line-soft)] px-3 py-2'
};

export type HzTopologyFilterStripItem = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'id'> & {
  id: string;
  label: React.ReactNode;
  copy?: React.ReactNode;
  active?: boolean;
};

export type HzTopologyFilterStripProps = React.HTMLAttributes<HTMLElement> & {
  variant?: HzTopologyFilterStripVariant;
  boundary?: HzTopologyFilterStripBoundary;
  copyVisibility?: HzTopologyFilterStripCopyVisibility;
  items: HzTopologyFilterStripItem[];
};

export type HzTopologyActionLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'id'> & {
  id: string;
  label: React.ReactNode;
  copy?: React.ReactNode;
  emphasis?: 'primary' | 'neutral';
  spacing?: HzTopologyActionLinkSpacing;
};

export type HzTopologyActionLinkSpacing = 'none' | 'inset';

const topologyActionLinkSpacingClassName: Record<HzTopologyActionLinkSpacing, string> = {
  none: '',
  inset: 'mx-3 my-2'
};

export type HzTopologyFocusTrailCrumb = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'id'> & {
  id: string;
  label: React.ReactNode;
  value?: React.ReactNode;
  active?: boolean;
};

export type HzTopologyFocusTrailFilter = Omit<React.HTMLAttributes<HTMLSpanElement>, 'children' | 'id'> & {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
};

export type HzTopologyFocusTrailAction = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & {
  label: React.ReactNode;
};

export type HzTopologyFocusTrailBoundary = 'none' | 'section';
export type HzTopologyFocusTrailDensity = 'compact' | 'rail' | 'graph-dock';
export type HzTopologyFocusTrailMode = 'overview' | 'focused';

const topologyFocusTrailBoundaryClassName: Record<HzTopologyFocusTrailBoundary, string> = {
  none: '',
  section: 'border-t border-[var(--hz-ui-line-soft)] px-3 py-2'
};

export type HzTopologyFocusTrailProps = React.HTMLAttributes<HTMLElement> & {
  label: React.ReactNode;
  crumbs: HzTopologyFocusTrailCrumb[];
  filters?: HzTopologyFocusTrailFilter[];
  hiddenCountLabel?: React.ReactNode;
  hiddenCountProps?: React.HTMLAttributes<HTMLSpanElement>;
  exitAction?: HzTopologyFocusTrailAction;
  boundary?: HzTopologyFocusTrailBoundary;
  density?: HzTopologyFocusTrailDensity;
  focusMode?: HzTopologyFocusTrailMode;
  focusDepth?: string | number;
  focusEntityId?: string;
};

export type HzTopologyGroupPanelTone = HzStatusTone | 'danger';
export type HzTopologyGroupPanelBoundary = 'default' | 'framed' | 'flush' | 'section';

export type HzTopologyGroupPanelItem = Omit<React.HTMLAttributes<HTMLDivElement>, 'id'> & {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  count: number;
  collapsedCount?: number;
  collapsedLabel?: React.ReactNode;
  worstTone?: HzTopologyGroupPanelTone;
  active?: boolean;
  meta?: React.ReactNode;
};

export type HzTopologyGroupPanelAction = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'id'> & {
  id: string;
  label: React.ReactNode;
};

export type HzTopologyGroupPanelProps = React.HTMLAttributes<HTMLElement> & {
  title: React.ReactNode;
  copy?: React.ReactNode;
  groupByLabel: React.ReactNode;
  items: HzTopologyGroupPanelItem[];
  actions?: HzTopologyGroupPanelAction[];
  boundary?: HzTopologyGroupPanelBoundary;
};

const topologyGroupPanelBoundaryClassName: Record<HzTopologyGroupPanelBoundary, string> = {
  default: 'border-y border-[var(--hz-ui-line-soft)]',
  framed: 'border border-[var(--hz-ui-line-soft)]',
  flush: 'border-y border-[var(--hz-ui-line-soft)] border-x-0',
  section: 'border-t border-[var(--hz-ui-line-soft)] px-3 py-2'
};

const topologyGroupPanelToneClassName: Record<HzTopologyGroupPanelTone, string> = {
  neutral: 'border-[#323744] bg-[#181b22] text-[#cbd3df]',
  info: 'border-[#244069] bg-[#101d30] text-[#9ec4ff]',
  success: 'border-[#254634] bg-[#11251b] text-[#9de0b3]',
  warning: 'border-[#5f4a24] bg-[#251c10] text-[#f3c46d]',
  critical: 'border-[#61323a] bg-[#2a1318] text-[#ff9aa9]',
  danger: 'border-[#61323a] bg-[#2a1318] text-[#ff9aa9]'
};

export type HzTopologyPathSummaryEndpoint = {
  label: React.ReactNode;
  value: React.ReactNode;
  meta?: React.ReactNode;
};

export type HzTopologyPathSummaryMetric = {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: HzStatusTone;
};

export type HzTopologyPathSummaryAction = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'id'> & {
  id: string;
  label: React.ReactNode;
};

export type HzTopologyPathSummaryBoundary = 'none' | 'section' | 'framed' | 'flush';
export type HzTopologyPathSummaryInteractionState = 'preview' | 'hovered' | 'selected';

export type HzTopologyPathSummaryProps = React.HTMLAttributes<HTMLElement> & {
  title: React.ReactNode;
  source: HzTopologyPathSummaryEndpoint;
  target: HzTopologyPathSummaryEndpoint;
  relation?: HzTopologyPathSummaryEndpoint;
  directionLabel?: React.ReactNode;
  metrics?: HzTopologyPathSummaryMetric[];
  evidenceBadges?: string[];
  actions?: HzTopologyPathSummaryAction[];
  boundary?: HzTopologyPathSummaryBoundary;
  interactionState?: HzTopologyPathSummaryInteractionState;
  selectedEdgeId?: string;
  hoveredEdgeId?: string;
  sourceId?: string;
  targetId?: string;
  relationType?: string;
  sourceKind?: string;
};

const topologyPathSummaryBoundaryClassName: Record<HzTopologyPathSummaryBoundary, string> = {
  none: '',
  section: 'border-t border-[var(--hz-ui-line-soft)] px-3 py-2',
  framed: 'border border-[var(--hz-ui-line-soft)]',
  flush: 'border-y border-[var(--hz-ui-line-soft)] border-x-0'
};

const topologyPathSummaryMetricClassName: Record<HzStatusTone, string> = {
  neutral: 'border-[#303542] bg-[#151821] text-[#d6d9e2]',
  info: 'border-[#244069] bg-[#101d30] text-[#9ec4ff]',
  success: 'border-[#254634] bg-[#11251b] text-[#9de0b3]',
  warning: 'border-[#5f4a24] bg-[#251c10] text-[#f3c46d]',
  critical: 'border-[#61323a] bg-[#2a1318] text-[#ff9aa9]'
};

export type HzTopologyScopeBarItem = React.HTMLAttributes<HTMLSpanElement> & HzDataAttributeProps & {
  id: string;
  label?: React.ReactNode;
  value: React.ReactNode;
};

export type HzTopologyScopeBarAction = React.ButtonHTMLAttributes<HTMLButtonElement> & HzDataAttributeProps & {
  id: string;
  label: React.ReactNode;
  emphasis?: 'primary' | 'neutral';
};

export type HzTopologyScopeBarBoundary = 'none' | 'section';

const topologyScopeBarBoundaryClassName: Record<HzTopologyScopeBarBoundary, string> = {
  none: '',
  section: 'border-t border-[var(--hz-ui-line-soft)] px-3'
};

export type HzTopologyScopeBarProps = React.HTMLAttributes<HTMLElement> & {
  items: HzTopologyScopeBarItem[];
  actions?: HzTopologyScopeBarAction[];
  boundary?: HzTopologyScopeBarBoundary;
  summaryVisibility?: 'visible' | 'assistive';
  summaryDedupedBy?: string;
};

export type HzTopologyNodeProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & {
  label: React.ReactNode;
  healthLabel?: React.ReactNode;
  healthCopy?: string;
  entityType?: string;
  source?: string;
  health?: string;
  tone?: HzTopologyNodeTone;
  focus?: HzTopologyNodeFocus;
  evidenceBadges?: string[];
  redMetrics?: HzTopologyNodeRedMetrics;
  position?: HzTopologyNodePosition;
  healthMetaProps?: React.HTMLAttributes<HTMLSpanElement>;
};

const topologyNodeToneClassName: Record<HzTopologyNodeTone, string> = {
  success: 'border-[#365a45] bg-[#122017] text-[#d9f7df]',
  warning: 'border-[#786032] bg-[#221b0d] text-[#f6e4b0]',
  danger: 'border-[#80464f] bg-[#241115] text-[#ffd6dc]'
};

const topologyNodeFocusClassName: Record<HzTopologyNodeFocus, string> = {
  normal: '',
  active: 'z-20 ring-2 ring-[#4e74f8] ring-offset-2 ring-offset-[#08090c]',
  related: 'z-10 shadow-[0_18px_54px_rgba(78,116,248,0.22)]',
  dimmed: 'opacity-45'
};

const topologyEdgeToneColor: Record<HzTopologyEdgeTone, string> = {
  green: '#2fa84f',
  blue: '#2f8ed8',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  red: '#ef4444'
};

function formatTopologyNodeMetricAttribute(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : undefined;
}

function topologyEvidenceBadgesAttribute(evidenceBadges: string[] | undefined) {
  return evidenceBadges && evidenceBadges.length > 0 ? evidenceBadges.join(' ') : 'none';
}

function formatTopologyEdgeMetricAttribute(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : undefined;
}

function topologyEdgeCommonAttributes({
  id,
  variant,
  tone,
  focus,
  selected,
  relationshipType,
  source,
  evidenceBadges,
  redMetrics
}: HzTopologyEdgeBaseProps & { variant: HzTopologyEdgeProps['variant']; tone: HzTopologyEdgeTone; focus: HzTopologyEdgeFocus }) {
  return {
    'data-hz-ui': 'topology-edge',
    'data-hz-topology-primitive': 'edge',
    'data-hz-topology-edge-owner': 'hertzbeat-ui-edge',
    'data-hz-topology-edge-id': id,
    'data-hz-topology-edge-variant': variant,
    'data-hz-topology-edge-tone': tone,
    'data-hz-topology-edge-focus': focus,
    'data-hz-topology-edge-selected': selected ? 'true' : 'false',
    'data-hz-topology-edge-relationship-type': relationshipType,
    'data-hz-topology-edge-source': source,
    'data-hz-topology-edge-evidence-badges': topologyEvidenceBadgesAttribute(evidenceBadges),
    'data-hz-topology-edge-badge-owner': 'hertzbeat-ui-edge-badge',
    'data-hz-topology-edge-red-owner': 'hertzbeat-ui-edge-red',
    'data-hz-topology-edge-request-rate': formatTopologyEdgeMetricAttribute(redMetrics?.requestRatePerSecond),
    'data-hz-topology-edge-error-rate': formatTopologyEdgeMetricAttribute(redMetrics?.errorRate),
    'data-hz-topology-edge-latency-p95-ms': formatTopologyEdgeMetricAttribute(redMetrics?.latencyP95Ms)
  };
}

export function HzTopologyEdge({
  id,
  variant,
  tone = 'blue',
  focus = 'normal',
  selected = false,
  from,
  to,
  relationshipType,
  source,
  evidenceBadges = [],
  redMetrics,
  ...props
}: HzTopologyEdgeProps) {
  const color = topologyEdgeToneColor[tone];
  const commonAttributes = topologyEdgeCommonAttributes({
    id,
    variant,
    tone,
    focus,
    selected,
    from,
    to,
    relationshipType,
    source,
    evidenceBadges,
    redMetrics
  });

  if (variant === 'line') {
    const { className, ...lineProps } = props as Omit<HzTopologyEdgeLineProps, keyof HzTopologyEdgeBaseProps | 'variant'>;
    return (
      <line
        {...lineProps}
        {...commonAttributes}
        className={className}
        data-hz-topology-edge-line-owner="hertzbeat-ui-edge-line"
        data-hz-topology-edge-path-owner="hertzbeat-ui-edge-path"
        data-hz-topology-edge-arrow-owner="hertzbeat-ui-edge-arrow"
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={color}
        strokeWidth="0.25"
        strokeLinecap="round"
        opacity={focus === 'context-muted' ? '0.32' : '0.92'}
      />
    );
  }

  const { className, style, ...anchorProps } = props as Omit<HzTopologyEdgeDrilldownProps, keyof HzTopologyEdgeBaseProps | 'variant'>;
  return (
    <a
      {...anchorProps}
      {...commonAttributes}
      className={cn(
        'absolute h-2 w-2 rounded-[2px] border',
        selected ? 'border-[#c8d5ff] shadow-[0_0_0_4px_rgba(78,116,248,0.22)]' : 'border-transparent',
        className
      )}
      data-hz-topology-edge-drilldown-owner="hertzbeat-ui-edge-drilldown"
      data-hz-topology-edge-hit-target-owner="hertzbeat-ui-edge-hit-target"
      style={{
        left: `${(from.x + to.x) / 2}%`,
        top: `${(from.y + to.y) / 2}%`,
        backgroundColor: color,
        transform: 'translate(-50%, -50%)',
        ...style
      }}
    />
  );
}

const topologyHoverTooltipPlacementClassName: Record<HzTopologyHoverTooltipPlacement, string> = {
  inline: '',
  'canvas-top-right': 'absolute right-4 top-4 z-10',
  'canvas-right-under-toolbar': 'absolute right-4 top-[96px] z-10',
  'canvas-anchor': 'absolute z-10'
};

const topologyHoverTooltipSizeClassName: Record<HzTopologyHoverTooltipSize, string> = {
  auto: '',
  compact: 'w-[280px]',
  standard: 'w-[300px]'
};

function topologyHoverTooltipClampSize(size: HzTopologyHoverTooltipSize) {
  if (size === 'standard') return { width: '312px', height: '220px' };
  if (size === 'compact') return { width: '292px', height: '180px' };
  return { width: '300px', height: '200px' };
}

export function HzTopologyHoverTooltip({
  kind,
  title,
  summary,
  facts = [],
  metrics = [],
  evidenceBadges = [],
  visibility = 'preview',
  trigger = 'preview',
  placement = 'inline',
  size = 'auto',
  anchor,
  className,
  style,
  ...props
}: HzTopologyHoverTooltipProps) {
  const anchorClampSize = topologyHoverTooltipClampSize(size);
  const anchorStyle =
    anchor && placement === 'canvas-anchor'
      ? ({
          '--hz-topology-hover-x': `${Math.round(anchor.x)}px`,
          '--hz-topology-hover-y': `${Math.round(anchor.y)}px`,
          '--hz-topology-hover-width': anchorClampSize.width,
          '--hz-topology-hover-height': anchorClampSize.height,
          left: 'clamp(12px,var(--hz-topology-hover-x),calc(100% - var(--hz-topology-hover-width)))',
          top: 'clamp(52px,var(--hz-topology-hover-y),calc(100% - var(--hz-topology-hover-height)))',
          ...style
        } as React.CSSProperties)
      : anchor
        ? ({
            '--hz-topology-hover-x': `${Math.round(anchor.x)}px`,
            '--hz-topology-hover-y': `${Math.round(anchor.y)}px`,
            ...style
          } as React.CSSProperties)
        : style;

  return (
    <section
      {...props}
      role={props.role ?? 'tooltip'}
      style={anchorStyle}
      className={cn(
        'grid min-w-0 gap-2 rounded-[3px] border border-[#252832] bg-[#0d1016]/95 px-3 py-2 text-left shadow-[0_18px_42px_rgba(0,0,0,0.36)]',
        topologyHoverTooltipPlacementClassName[placement],
        topologyHoverTooltipSizeClassName[size],
        visibility === 'hover' ? 'pointer-events-none opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100' : null,
        className
      )}
      data-hz-ui="topology-hover-tooltip"
      data-hz-topology-primitive="hover-tooltip"
      data-hz-topology-hover-kind={kind}
      data-hz-topology-hover-visibility={visibility}
      data-hz-topology-hover-trigger={trigger}
      data-hz-topology-hover-trigger-owner="hertzbeat-ui-hover-trigger"
      data-hz-topology-hover-placement={placement}
      data-hz-topology-hover-size={size}
      data-hz-topology-hover-collision-safe={
        placement === 'canvas-anchor' ? 'cursor-anchor-clamped' : placement === 'canvas-right-under-toolbar' ? 'toolbar' : undefined
      }
      data-hz-topology-hover-offset-owner={placement === 'canvas-right-under-toolbar' ? 'hertzbeat-ui-hover-offset' : undefined}
      data-hz-topology-hover-anchor-owner={anchor ? 'hertzbeat-ui-hover-anchor' : undefined}
      data-hz-topology-hover-anchor-collision-boundary={placement === 'canvas-anchor' ? 'canvas' : undefined}
      data-hz-topology-hover-anchor-source={anchor?.source}
      data-hz-topology-hover-anchor-x={anchor ? Math.round(anchor.x) : undefined}
      data-hz-topology-hover-anchor-y={anchor ? Math.round(anchor.y) : undefined}
      data-hz-topology-hover-surface-owner="hertzbeat-ui-hover-surface"
    >
      <header className="grid min-w-0 gap-0.5" data-hz-topology-hover-header-owner="hertzbeat-ui-hover-header">
        <div
          className="truncate text-[12px] font-semibold text-[#eef2f7]"
          data-hz-topology-hover-title-owner="hertzbeat-ui-hover-title"
        >
          {title}
        </div>
        {summary ? (
          <div
            className="truncate text-[10px] font-medium text-[#8f99ab]"
            data-hz-topology-hover-summary-owner="hertzbeat-ui-hover-summary"
          >
            {summary}
          </div>
        ) : null}
      </header>
      {facts.length > 0 ? (
        <div
          className="grid min-w-0 grid-cols-2 gap-px border border-[var(--hz-ui-line-faint)] bg-[var(--hz-ui-line-faint)]"
          data-hz-topology-hover-fact-grid-owner="hertzbeat-ui-hover-fact-grid"
        >
          {facts.map(fact => {
            const { id, label, value, meta, className: factClassName, ...factProps } = fact;
            return (
              <div
                key={id}
                {...factProps}
                className={cn('grid min-w-0 gap-0.5 bg-[#0b0d12] px-2 py-1.5', factClassName)}
                data-hz-topology-hover-fact={id}
                data-hz-topology-hover-fact-owner="hertzbeat-ui-hover-fact"
              >
                <span
                  className="truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-[#727b8c]"
                  data-hz-topology-hover-fact-label-owner="hertzbeat-ui-hover-fact-label"
                >
                  {label}
                </span>
                <span
                  className="truncate text-[11px] font-semibold text-[#dfe6f2]"
                  data-hz-topology-hover-fact-value-owner="hertzbeat-ui-hover-fact-value"
                >
                  {value}
                </span>
                {meta ? (
                  <span
                    className="truncate font-mono text-[9px] text-[#727b8c]"
                    data-hz-topology-hover-fact-meta-owner="hertzbeat-ui-hover-fact-meta"
                  >
                    {meta}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {metrics.length > 0 ? (
        <div
          className="grid min-w-0 grid-cols-3 gap-px border border-[var(--hz-ui-line-faint)] bg-[var(--hz-ui-line-faint)]"
          data-hz-topology-hover-metric-grid-owner="hertzbeat-ui-hover-metric-grid"
        >
          {metrics.map(metric => {
            const tone = metric.tone ?? 'neutral';
            const toneColor = chartToneColor[tone];
            return (
              <div
                key={metric.id}
                className="grid min-w-0 gap-0.5 bg-[#0b0d12] px-2 py-1.5"
                data-hz-topology-hover-metric={metric.id}
                data-hz-topology-hover-metric-owner="hertzbeat-ui-hover-metric"
                data-hz-topology-hover-metric-tone={tone}
              >
                <span className="flex min-w-0 items-center gap-1">
                  <span
                    className="h-1.5 w-1.5 shrink-0"
                    style={{ backgroundColor: toneColor.stroke }}
                    aria-hidden="true"
                    data-hz-topology-hover-metric-indicator-owner="hertzbeat-ui-hover-metric-indicator"
                  />
                  <span
                    className="truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-[#727b8c]"
                    data-hz-topology-hover-metric-label-owner="hertzbeat-ui-hover-metric-label"
                  >
                    {metric.label}
                  </span>
                </span>
                <span
                  className="truncate text-[11px] font-semibold text-[#dfe6f2]"
                  data-hz-topology-hover-metric-value-owner="hertzbeat-ui-hover-metric-value"
                >
                  {metric.value}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
      {evidenceBadges.length > 0 ? (
        <div className="flex min-w-0 flex-wrap gap-1" data-hz-topology-hover-badge-list-owner="hertzbeat-ui-hover-badge-list">
          {evidenceBadges.map(badge => (
            <span
              key={badge}
              className="inline-flex h-5 items-center border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-control)] px-1.5 font-mono text-[9px] text-[#a9b0bb]"
              data-hz-topology-hover-badge={badge}
              data-hz-topology-hover-badge-owner="hertzbeat-ui-hover-badge"
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function HzTopologyLegend({
  title,
  sections,
  summaryLabel,
  boundary = 'default',
  density = 'default',
  className,
  ...props
}: HzTopologyLegendProps) {
  const isCanvasDock = density === 'canvas-dock';
  const visibleSections = sections.filter(section => section.items.length > 0);

  if (visibleSections.length === 0) {
    return null;
  }

  return (
    <section
      {...props}
      className={cn(
        'min-w-0 bg-[var(--hz-ui-surface)]',
        !isCanvasDock && topologyLegendBoundaryClassName[boundary],
        isCanvasDock && 'max-w-[360px] bg-transparent',
        className
      )}
      data-hz-ui="topology-legend"
      data-hz-topology-primitive="legend"
      data-hz-topology-legend-boundary={boundary}
      data-hz-topology-legend-boundary-owner="hertzbeat-ui-legend-boundary"
      data-hz-topology-legend-density={density}
      data-hz-topology-legend-density-owner="hertzbeat-ui-legend-density"
      data-hz-topology-legend-layout={isCanvasDock ? 'inline-g6-dock' : 'section-list'}
      data-hz-topology-legend-occlusion={isCanvasDock ? 'low' : 'standard'}
      data-hz-topology-legend-border={isCanvasDock ? 'none' : boundary}
      data-hz-topology-legend-summary-visibility={isCanvasDock ? 'hidden' : 'visible'}
    >
      <header
        className={cn(
          'flex items-center justify-between gap-3',
          !isCanvasDock && 'border-b border-[var(--hz-ui-line-soft)]',
          isCanvasDock ? 'min-h-6 px-2 pb-1 pt-0' : 'min-h-9 px-3 py-2'
        )}
        data-hz-topology-legend-header-owner="hertzbeat-ui-legend-header"
      >
        <div
          className={cn(
            'min-w-0 truncate font-semibold text-[#f3f6fb]',
            isCanvasDock ? 'text-[10px]' : 'text-[12px]'
          )}
          data-hz-topology-legend-title-owner="hertzbeat-ui-legend-title"
        >
          {title}
        </div>
        {!isCanvasDock ? (
          <span
            className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]"
            data-hz-topology-legend-summary-owner="hertzbeat-ui-legend-summary"
          >
            {summaryLabel ?? `${visibleSections.length} groups`}
          </span>
        ) : null}
      </header>
      <div
        className={cn(
          'min-w-0',
          isCanvasDock ? 'flex flex-wrap gap-x-3 gap-y-1 px-2 py-1.5' : 'grid divide-y divide-[var(--hz-ui-line-faint)]'
        )}
      >
        {visibleSections.map(section => (
          <div
            key={section.id}
            className={cn(
              'min-w-0',
              isCanvasDock ? 'flex items-center gap-1.5' : 'grid gap-2 px-3 py-2'
            )}
            data-hz-topology-legend-section={section.id}
            data-hz-topology-legend-section-owner="hertzbeat-ui-legend-section"
          >
            <div
              className={cn(
                'truncate text-[10px] font-semibold uppercase text-[#727b8c]',
                isCanvasDock ? 'tracking-normal' : 'tracking-[0.08em]'
              )}
              data-hz-topology-legend-section-label-owner="hertzbeat-ui-legend-section-label"
            >
              {section.label}
            </div>
            <div className={cn(isCanvasDock ? 'flex flex-wrap items-center gap-1.5' : 'grid min-w-0 gap-1.5')}>
              {section.items.map(item => {
                const tone = item.tone ?? 'neutral';
                const pattern = item.pattern ?? 'solid';
                const color = item.color ?? chartToneColor[tone].stroke;
                const fill = item.fill ?? chartToneColor[tone].soft;
                const visualSource =
                  item.visualSource ??
                  (item.id.includes('edge') || pattern !== 'solid'
                    ? 'hertzbeat-edge-token'
                    : item.id.includes('selected')
                      ? 'hertzbeat-interaction-token'
                      : 'hertzbeat-status-token');
                const sourceLabel = topologyLegendVisualSourceLabel[visualSource];
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex min-w-0 items-center text-[11px]',
                      isCanvasDock ? 'min-h-4 gap-1' : 'min-h-5 gap-2'
                    )}
                    data-hz-topology-legend-item={item.id}
                    data-hz-topology-legend-item-owner="hertzbeat-ui-legend-item"
                    data-hz-topology-legend-tone={tone}
                    data-hz-topology-legend-pattern={pattern}
                    data-hz-topology-legend-color={color}
                    data-hz-topology-legend-fill={fill}
                    data-hz-topology-legend-visual-source={visualSource}
                    data-hz-topology-legend-visual-mode="source-backed-text"
                    data-hz-topology-legend-source-label={sourceLabel}
                    data-hz-topology-legend-no-handdrawn-icon="true"
                  >
                    {item.iconSrc ? (
                      <span
                        aria-label={item.iconAlt}
                        role={item.iconAlt ? 'img' : undefined}
                        className={cn(
                          'h-3.5 w-3.5 shrink-0 bg-contain bg-center bg-no-repeat opacity-80',
                          isCanvasDock ? 'mr-1 inline-block' : 'mr-1.5 inline-block'
                        )}
                        style={{ backgroundImage: `url("${item.iconSrc}")` }}
                        data-hz-topology-legend-icon-owner="hertzbeat-ui-legend-source-icon"
                        data-hz-topology-legend-icon-library={item.iconLibrary}
                        data-hz-topology-legend-icon-name={item.iconName}
                        data-hz-topology-legend-icon-source={item.iconSource}
                        data-hz-topology-legend-icon-no-handdrawn="true"
                      />
                    ) : null}
                    <span
                      className="min-w-0 truncate text-[#cbd3df]"
                      data-hz-topology-legend-item-label-owner="hertzbeat-ui-legend-item-label"
                    >
                      {item.label}
                    </span>
                    {item.value ? (
                      <span
                        className={cn(
                          'shrink-0 truncate font-mono text-[10px] text-[#727b8c]',
                          isCanvasDock && 'sr-only'
                        )}
                        data-hz-topology-legend-item-value-owner="hertzbeat-ui-legend-item-value"
                      >
                        {item.value}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function topologyDetailActionClassName(emphasis: HzTopologyDetailDrawerAction['emphasis']) {
  return emphasis === 'primary'
    ? 'border-[#31405c] bg-[#182238] text-[#d8e4ff]'
    : 'border-[#303542] bg-[#151821] text-[#dfe3ec]';
}

const topologyDetailDrawerSurfaceClassName: Record<HzTopologyDetailDrawerSurface, string> = {
  default: 'border border-[#252832]',
  framed: 'border border-[#252832]',
  flush: 'border-y border-x-0 border-[#252832]'
};

function HzTopologyDetailDrawerActionLink({
  action,
  attributeName
}: {
  action: HzTopologyDetailDrawerAction;
  attributeName: 'data-hz-topology-detail-action' | 'data-hz-topology-detail-signal-action';
}) {
  const {
    id,
    label,
    emphasis = 'neutral',
    copy,
    copyProps,
    className,
    ...anchorProps
  } = action;
  const { className: copyClassName, ...copyRestProps } = copyProps ?? {};
  const isSignalAction = attributeName === 'data-hz-topology-detail-signal-action';

  return (
    <>
      <a
        {...anchorProps}
        className={cn(
          'rounded-[3px] border px-3 py-1.5 text-[12px] font-semibold',
          topologyDetailActionClassName(emphasis),
          className
        )}
        data-hz-topology-detail-action-emphasis={emphasis}
        {...(isSignalAction
          ? { 'data-hz-topology-detail-signal-action-link-owner': 'hertzbeat-ui-detail-signal-action-link' }
          : { 'data-hz-topology-detail-action-link-owner': 'hertzbeat-ui-detail-action-link' })}
        {...{ [attributeName]: id }}
      >
        <span
          {...(isSignalAction
            ? { 'data-hz-topology-detail-signal-action-label-owner': 'hertzbeat-ui-detail-signal-action-label' }
            : { 'data-hz-topology-detail-action-label-owner': 'hertzbeat-ui-detail-action-label' })}
        >
          {label}
        </span>
      </a>
      {copy ? (
        <span
          {...copyRestProps}
          className={cn('basis-full text-[11px] leading-5 text-[#8f99ab]', copyClassName)}
          data-hz-topology-detail-action-copy-owner="hertzbeat-ui-detail-action-copy"
        >
          {copy}
        </span>
      ) : null}
    </>
  );
}

export function HzTopologyDetailDrawer({
  kind,
  eyebrow,
  title,
  subtitle,
  boundary,
  boundaryProps,
  surface = 'default',
  facts = [],
  actions = [],
  signalActions = [],
  signalActionsLabel,
  subjectId,
  sourceId,
  targetId,
  relationType,
  sourceKind,
  entityType,
  density = 'compact',
  className,
  ...props
}: HzTopologyDetailDrawerProps) {
  const { className: boundaryClassName, ...boundaryRestProps } = boundaryProps ?? {};
  const graphFirst = density === 'graph-first';
  const scrollResetKey = `${kind}:${subjectId ?? 'none'}:${sourceId ?? 'none'}:${targetId ?? 'none'}:${relationType ?? 'unknown'}:${sourceKind ?? 'unknown'}:${entityType ?? 'unknown'}`;
  const drawerRef = React.useRef<HTMLElement | null>(null);
  const previousScrollResetKeyRef = React.useRef(scrollResetKey);

  React.useEffect(() => {
    const drawer = drawerRef.current;

    if (!drawer || previousScrollResetKeyRef.current === scrollResetKey) {
      return;
    }

    drawer.scrollTop = 0;
    previousScrollResetKeyRef.current = scrollResetKey;
  }, [scrollResetKey]);

  const signalActionGroup =
    signalActions.length > 0 ? (
      <div
        className={cn(
          'grid',
          graphFirst
            ? 'sticky top-0 z-10 -mx-2 mt-2 gap-1 border-y border-[#252832] bg-[#0b0c0f] px-2 py-2'
            : 'mt-3 gap-2'
        )}
        data-hz-topology-detail-actions="signals"
        data-hz-topology-detail-signal-action-group-owner="hertzbeat-ui-detail-signal-action-group"
        data-hz-topology-detail-signal-action-placement={graphFirst ? 'header-dock' : 'footer'}
        data-hz-topology-detail-signal-action-placement-owner="hertzbeat-ui-detail-signal-action-placement"
        data-hz-topology-detail-signal-action-sticky={graphFirst ? 'top-with-header-context' : 'none'}
      >
        {signalActionsLabel ? (
          <div
            className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#727b8c]"
            data-hz-topology-detail-signal-label="signals"
            data-hz-topology-detail-signal-label-owner="hertzbeat-ui-detail-signal-label"
          >
            {signalActionsLabel}
          </div>
        ) : null}
        {signalActions.map(action => (
          <HzTopologyDetailDrawerActionLink key={action.id} action={action} attributeName="data-hz-topology-detail-signal-action" />
        ))}
      </div>
    ) : null;

  return (
    <section
      {...props}
      ref={drawerRef}
      className={cn(
        'min-w-0',
        graphFirst ? 'hb-scrollbar max-h-[560px] overflow-y-auto overscroll-contain bg-[#0b0c0f] p-2 text-[12px]' : 'bg-[#101217] p-3',
        topologyDetailDrawerSurfaceClassName[surface],
        className
      )}
      data-hz-ui="topology-detail-drawer"
      data-hz-topology-primitive="detail-drawer"
      data-hz-topology-detail-kind={kind}
      data-hz-topology-detail-density={density}
      data-hz-topology-detail-density-owner="hertzbeat-ui-detail-density"
      data-hz-topology-detail-visual-weight={graphFirst ? 'low-interruption' : 'balanced'}
      data-hz-topology-detail-visual-weight-owner="hertzbeat-ui-detail-visual-weight"
      data-hz-topology-detail-rail-fit={graphFirst ? 'compact-side-rail' : 'standard'}
      data-hz-topology-detail-rail-fit-owner="hertzbeat-ui-detail-rail-fit"
      data-hz-topology-detail-rail-max-block={graphFirst ? 'bounded-560px' : 'unbounded'}
      data-hz-topology-detail-overflow-policy={graphFirst ? 'internal-scroll' : 'document-flow'}
      data-hz-topology-detail-scroll-reset={graphFirst ? 'identity-change' : 'none'}
      data-hz-topology-detail-scroll-reset-owner="hertzbeat-ui-detail-scroll-reset"
      data-hz-topology-detail-scroll-reset-key={scrollResetKey}
      data-hz-topology-detail-surface={surface}
      data-hz-topology-detail-surface-owner="hertzbeat-ui-detail-surface"
      data-hz-topology-detail-identity-owner="hertzbeat-ui-detail-identity"
      data-hz-topology-detail-subject-id={subjectId ?? 'none'}
      data-hz-topology-detail-source-id={sourceId ?? 'none'}
      data-hz-topology-detail-target-id={targetId ?? 'none'}
      data-hz-topology-detail-relation-type={relationType ?? 'unknown'}
      data-hz-topology-detail-source-kind={sourceKind ?? 'unknown'}
      data-hz-topology-detail-entity-type={entityType ?? 'unknown'}
    >
      <div className="min-w-0" data-hz-topology-detail-header-owner="hertzbeat-ui-detail-header">
        <div
          className={cn('font-semibold tracking-[0.12em] text-[#7e8494]', graphFirst ? 'text-[10px]' : 'text-[12px]')}
          data-hz-topology-detail-eyebrow-owner="hertzbeat-ui-detail-eyebrow"
        >
          {eyebrow}
        </div>
        <div
          className={cn('font-semibold text-[#f5f7fb]', graphFirst ? 'mt-1 text-[13px]' : 'mt-2 text-[15px]')}
          data-hz-topology-detail-title-owner="hertzbeat-ui-detail-title"
        >
          {title}
        </div>
        {subtitle ? (
          <div
            className={cn('mt-1 text-[#8f99ab]', graphFirst ? 'text-[11px]' : 'text-[12px]')}
            data-hz-topology-detail-subtitle-owner="hertzbeat-ui-detail-subtitle"
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      {graphFirst ? signalActionGroup : null}
      {boundary ? (
        <div
          {...boundaryRestProps}
          className={cn(
            'border-l border-[#4b5566] bg-[#0b0c0f] text-[#a9b0bb]',
            graphFirst ? 'mt-2 px-2 py-1 text-[11px] leading-4' : 'mt-3 px-3 py-2 text-[12px] leading-5',
            boundaryClassName
          )}
          data-hz-topology-detail-boundary="context"
          data-hz-topology-detail-boundary-owner="hertzbeat-ui-detail-boundary"
          data-hz-topology-detail-boundary-copy-owner="hertzbeat-ui-detail-boundary-copy"
        >
          {boundary}
        </div>
      ) : null}
      {facts.length > 0 ? (
        <div
          className={cn('grid', graphFirst ? 'mt-2 gap-1' : 'mt-3 gap-2')}
          data-hz-topology-detail-facts={facts.length}
          data-hz-topology-detail-fact-group-owner="hertzbeat-ui-detail-fact-group"
          data-hz-topology-detail-fact-density={graphFirst ? 'compressed' : 'standard'}
        >
          {facts.map(fact => {
            const { className: factClassName, ...factRestProps } = fact.factProps ?? {};
            const tone = fact.tone ?? 'neutral';
            return (
              <div
                key={fact.id}
                {...factRestProps}
                className={cn('border border-[#252832] bg-[#0b0c0f] px-2', graphFirst ? 'py-1' : 'py-2', factClassName)}
                data-hz-topology-detail-fact={fact.id}
                data-hz-topology-detail-fact-owner="hertzbeat-ui-detail-fact"
                data-hz-topology-detail-fact-tone={tone}
              >
                <div
                  className={cn('font-semibold text-[#7e8494]', graphFirst ? 'text-[10px]' : 'text-[11px]')}
                  data-hz-topology-detail-fact-label-owner="hertzbeat-ui-detail-fact-label"
                >
                  {fact.label}
                </div>
                <div
                  className={cn('mt-1 font-semibold text-[#e3e8f0]', graphFirst ? 'text-[11px]' : 'text-[12px]')}
                  data-hz-topology-detail-fact-value-owner="hertzbeat-ui-detail-fact-value"
                >
                  {fact.value}
                </div>
                {fact.meta ? (
                  <div
                    className={cn('mt-1 text-[#8f99ab]', graphFirst ? 'text-[10px]' : 'text-[11px]')}
                    data-hz-topology-detail-fact-meta-owner="hertzbeat-ui-detail-fact-meta"
                  >
                    {fact.meta}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {actions.length > 0 ? (
        <div
          className={cn('flex flex-wrap', graphFirst ? 'mt-2 gap-1' : 'mt-3 gap-2')}
          data-hz-topology-detail-actions="entity-alert"
          data-hz-topology-detail-action-group-owner="hertzbeat-ui-detail-action-group"
        >
          {actions.map(action => (
            <HzTopologyDetailDrawerActionLink key={action.id} action={action} attributeName="data-hz-topology-detail-action" />
          ))}
        </div>
      ) : null}
      {!graphFirst ? signalActionGroup : null}
    </section>
  );
}

export function HzTopologyEvidenceList({
  kind = 'evidence',
  title,
  copy,
  items,
  boundary = 'default',
  className,
  ...props
}: HzTopologyEvidenceListProps) {
  return (
    <section
      {...props}
      className={cn('min-w-0 bg-[var(--hz-ui-surface)]', topologyEvidenceListBoundaryClassName[boundary], className)}
      data-hz-ui="topology-evidence-list"
      data-hz-topology-primitive="evidence-list"
      data-hz-topology-evidence-list-kind={kind}
      data-hz-topology-evidence-list-density="compact"
      data-hz-topology-evidence-list-boundary={boundary}
      data-hz-topology-evidence-list-boundary-owner="hertzbeat-ui-evidence-list-boundary"
    >
      <header
        className="flex min-h-9 items-center justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2"
        data-hz-topology-evidence-header-owner="hertzbeat-ui-evidence-list-header"
      >
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold text-[#f3f6fb]" data-hz-topology-evidence-title-owner="hertzbeat-ui-evidence-list-title">
            {title}
          </div>
          {copy ? (
            <div className="mt-0.5 truncate text-[11px] text-[#8f99ab]" data-hz-topology-evidence-copy-owner="hertzbeat-ui-evidence-list-copy">
              {copy}
            </div>
          ) : null}
        </div>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]" data-hz-topology-evidence-count-owner="hertzbeat-ui-evidence-list-count">
          {items.length}
        </span>
      </header>
      <div className="grid min-w-0 divide-y divide-[var(--hz-ui-line-faint)]" data-hz-topology-evidence-items={items.length}>
        {items.map(item => {
          const {
            id,
            label,
            value,
            meta,
            tone = 'neutral',
            className: itemClassName,
            ...itemProps
          } = item;
          const toneColor = chartToneColor[tone];
          return (
            <div
              key={id}
              {...itemProps}
              className={cn('grid min-h-10 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-3 py-2', itemClassName)}
              data-hz-topology-evidence-item={id}
              data-hz-topology-evidence-item-owner="hertzbeat-ui-evidence-list-item"
              data-hz-topology-evidence-item-tone={tone}
            >
              <span
                className="h-2 w-2 shrink-0"
                style={{ backgroundColor: toneColor.stroke, boxShadow: `0 0 0 3px ${toneColor.soft}` }}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-[#727b8c]"
                    data-hz-topology-evidence-item-label-owner="hertzbeat-ui-evidence-list-item-label"
                  >
                    {label}
                  </span>
                  <span
                    className="min-w-0 truncate text-[12px] font-semibold text-[#e3e8f0]"
                    data-hz-topology-evidence-item-value-owner="hertzbeat-ui-evidence-list-item-value"
                  >
                    {value}
                  </span>
                </span>
                {meta ? (
                  <span
                    className="mt-0.5 block truncate text-[11px] leading-5 text-[#8f99ab]"
                    data-hz-topology-evidence-item-meta-owner="hertzbeat-ui-evidence-list-item-meta"
                  >
                    {meta}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function HzTopologyFilterStrip({
  variant = 'source-grid',
  boundary = 'none',
  copyVisibility = 'visible',
  items,
  className,
  ...props
}: HzTopologyFilterStripProps) {
  const isSourceRail = variant === 'source-rail';
  return (
    <nav
      {...props}
      className={cn(
        isSourceRail ? 'flex min-w-0 flex-wrap items-center gap-1.5' : 'grid min-w-0 gap-2',
        variant === 'source-grid' ? 'md:grid-cols-2 xl:grid-cols-4' : null,
        variant === 'view-list' ? 'grid-cols-1' : null,
        topologyFilterStripBoundaryClassName[boundary],
        className
      )}
      data-hz-ui="topology-filter-strip"
      data-hz-topology-primitive="filter-strip"
      data-hz-topology-filter-strip-density={isSourceRail ? 'compact-rail' : 'compact'}
      data-hz-topology-filter-strip-layout={isSourceRail ? 'single-line-wrap' : undefined}
      data-hz-topology-filter-strip-height-contract={isSourceRail ? 'one-control-row-preferred' : undefined}
      data-hz-topology-filter-strip-variant={variant}
      data-hz-topology-filter-strip-boundary={boundary}
      data-hz-topology-filter-strip-boundary-owner="hertzbeat-ui-filter-strip-boundary"
      data-hz-topology-filter-strip-copy-visibility={copyVisibility}
      data-hz-topology-filter-strip-copy-visibility-owner="hertzbeat-ui-filter-strip-copy-visibility"
    >
      {items.map(item => {
        const {
          id,
          label,
          copy,
          active = false,
          className: itemClassName,
          ...anchorProps
        } = item;
        return (
          <a
            key={id}
            {...anchorProps}
            className={cn(
              isSourceRail
                ? 'inline-flex h-7 min-w-0 max-w-[172px] items-center rounded-[3px] border px-2.5 text-left transition-colors'
                : 'grid min-w-0 gap-1 rounded-[3px] border px-3 py-2 text-left transition-colors',
              active
                ? 'border-[#4e74f8] bg-[#182238]'
                : 'border-[#252832] bg-[#101217] hover:border-[#364052] hover:bg-[#131821]',
              itemClassName
            )}
            data-hz-topology-filter-item={id}
            data-hz-topology-filter-item-owner="hertzbeat-ui-filter-strip-item"
            data-hz-topology-filter-item-active={active ? 'true' : 'false'}
          >
            <span
              className={cn(
                'min-w-0 truncate font-semibold text-[#e3e8f0]',
                isSourceRail ? 'text-[11px]' : 'text-[12px]'
              )}
              data-hz-topology-filter-item-label-owner="hertzbeat-ui-filter-strip-label"
            >
              {label}
            </span>
            {copy ? (
              <span
                className={cn(
                  copyVisibility === 'assistive' ? 'sr-only' : 'min-w-0 text-[11px] leading-5 text-[#8f99ab]'
                )}
                data-hz-topology-filter-item-copy-owner="hertzbeat-ui-filter-strip-copy"
              >
                {copy}
              </span>
            ) : null}
          </a>
        );
      })}
    </nav>
  );
}

export function HzTopologyActionLink({
  id,
  label,
  copy,
  emphasis = 'neutral',
  spacing = 'none',
  className,
  ...props
}: HzTopologyActionLinkProps) {
  return (
    <a
      {...props}
      className={cn(
        'grid min-w-0 gap-1 rounded-[3px] border px-3 py-2 text-[12px] font-semibold transition-colors',
        emphasis === 'primary'
          ? 'border-[#31405c] bg-[#182238] text-[#d8e4ff] hover:border-[#4e74f8] hover:bg-[#1d2941]'
          : 'border-[#252832] bg-[#101217] text-[#dfe3ec] hover:border-[#364052] hover:bg-[#131821]',
        topologyActionLinkSpacingClassName[spacing],
        className
      )}
      data-hz-ui="topology-action-link"
      data-hz-topology-primitive="action-link"
      data-hz-topology-action-link-density="compact"
      data-hz-topology-action-link-spacing={spacing}
      data-hz-topology-action-link-spacing-owner="hertzbeat-ui-action-link-spacing"
      data-hz-topology-action-link={id}
      data-hz-topology-action-link-emphasis={emphasis}
    >
      <span className="min-w-0 truncate" data-hz-topology-action-link-label-owner="hertzbeat-ui-action-link-label">
        {label}
      </span>
      {copy ? (
        <span
          className="min-w-0 text-[11px] font-normal leading-5 text-[#8f99ab]"
          data-hz-topology-action-link-copy-owner="hertzbeat-ui-action-link-copy"
        >
          {copy}
        </span>
      ) : null}
    </a>
  );
}

export function HzTopologyFocusTrail({
  label,
  crumbs,
  filters = [],
  hiddenCountLabel,
  hiddenCountProps,
  exitAction,
  boundary = 'none',
  density = 'compact',
  focusMode = 'overview',
  focusDepth,
  focusEntityId,
  className,
  ...props
}: HzTopologyFocusTrailProps) {
  const { className: hiddenCountClassName, ...hiddenCountRestProps } = hiddenCountProps ?? {};
  const isRail = density === 'rail';
  const isGraphDock = density === 'graph-dock';
  const isLinear = isRail || isGraphDock;
  const chrome = isGraphDock && boundary === 'none' ? 'frameless' : 'surface';

  return (
    <section
      {...props}
      className={cn(
        isGraphDock
          ? cn('flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto text-[11px]', chrome === 'frameless' ? 'bg-transparent' : 'bg-[var(--hz-ui-surface)]')
          : isRail
            ? 'flex min-w-0 flex-wrap items-center gap-1.5 bg-[var(--hz-ui-surface)] text-[12px]'
            : 'grid min-w-0 gap-2 bg-[var(--hz-ui-surface)] text-[12px] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center',
        isGraphDock && boundary === 'section'
          ? 'border-t border-[var(--hz-ui-line-soft)] py-1'
          : isRail && boundary === 'section'
          ? 'border-t border-[var(--hz-ui-line-soft)] px-3 py-1'
          : topologyFocusTrailBoundaryClassName[boundary],
        className
      )}
      data-hz-ui="topology-focus-trail"
      data-hz-topology-primitive="focus-trail"
      data-hz-topology-focus-trail-density={density}
      data-hz-topology-focus-trail-mode={focusMode}
      data-hz-topology-focus-trail-mode-owner="hertzbeat-ui-focus-trail-mode"
      data-hz-topology-focus-trail-depth={focusDepth ?? 'unknown'}
      data-hz-topology-focus-trail-depth-owner="hertzbeat-ui-focus-trail-depth"
      data-hz-topology-focus-trail-entity={focusEntityId ?? 'none'}
      data-hz-topology-focus-trail-entity-owner="hertzbeat-ui-focus-trail-entity"
      data-hz-topology-focus-trail-layout={isGraphDock ? 'single-line-nowrap' : isRail ? 'single-line-wrap' : undefined}
      data-hz-topology-focus-trail-height-contract={isGraphDock ? 'one-compact-row' : isRail ? 'one-control-row-preferred' : undefined}
      data-hz-topology-focus-trail-occlusion={isGraphDock ? 'none' : undefined}
      data-hz-topology-focus-trail-position-contract={isGraphDock ? 'document-flow' : undefined}
      data-hz-topology-focus-trail-priority={isGraphDock ? 'canvas' : undefined}
      data-hz-topology-focus-trail-alignment={isGraphDock ? 'shared-control-grid' : undefined}
      data-hz-topology-focus-trail-inset={isGraphDock ? '0px' : undefined}
      data-hz-topology-focus-trail-control-height={isGraphDock ? '28px' : undefined}
      data-hz-topology-focus-trail-visual-weight={isGraphDock ? 'low-interruption' : undefined}
      data-hz-topology-focus-trail-visual-weight-owner={isGraphDock ? 'hertzbeat-ui-focus-trail-visual-weight' : undefined}
      data-hz-topology-focus-trail-chrome={isGraphDock ? chrome : undefined}
      data-hz-topology-focus-trail-frame={isGraphDock && chrome === 'frameless' ? 'none' : undefined}
      data-hz-topology-focus-trail-boundary={boundary}
      data-hz-topology-focus-trail-boundary-owner="hertzbeat-ui-focus-trail-boundary"
    >
      <div className={cn(isLinear ? 'contents' : 'grid min-w-0 gap-2')}>
        <div
          className={cn(
            'truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#727b8c]',
            isLinear ? 'sr-only' : null
          )}
          data-hz-topology-focus-trail-label-owner="hertzbeat-ui-focus-trail-label"
        >
          {label}
        </div>
        <nav
          className={cn(
            'flex min-w-0 items-center gap-1 overflow-x-auto',
            isGraphDock ? 'flex-nowrap' : isRail ? 'flex-wrap overflow-x-visible' : 'flex-nowrap'
          )}
          data-hz-topology-focus-crumbs-owner="hertzbeat-ui-focus-trail-crumbs"
        >
          {crumbs.map((crumb, index) => {
            const { id, label: crumbLabel, value, active = false, className: crumbClassName, href = '#', ...anchorProps } = crumb;
            return (
              <React.Fragment key={id}>
                {index > 0 ? (
                  <span className="shrink-0 text-[#4f5665]" aria-hidden="true">
                    /
                  </span>
                ) : null}
                <a
                  {...anchorProps}
                  href={href}
                  className={cn(
                    'inline-flex min-w-0 items-center gap-1 rounded-[3px] border px-2 transition-colors',
                    isGraphDock ? 'h-6 max-w-[156px]' : isRail ? 'h-7 max-w-[180px]' : 'h-7 max-w-[220px]',
                    active
                      ? 'border-[#4e74f8] bg-[#182238] text-[#d8e4ff]'
                      : 'border-[#252832] bg-[#101217] text-[#cbd3df] hover:border-[#364052] hover:bg-[#131821]',
                    crumbClassName
                  )}
                  data-hz-topology-focus-crumb={id}
                  data-hz-topology-focus-crumb-owner="hertzbeat-ui-focus-trail-crumb"
                  data-hz-topology-focus-crumb-active={active ? 'true' : 'false'}
                >
                  <span className="min-w-0 truncate font-semibold" data-hz-topology-focus-crumb-label-owner="hertzbeat-ui-focus-trail-crumb-label">
                    {crumbLabel}
                  </span>
                  {value ? (
                    <span
                      className="shrink-0 font-mono text-[10px] text-[#8f99ab]"
                      data-hz-topology-focus-crumb-value-owner="hertzbeat-ui-focus-trail-crumb-value"
                    >
                      {value}
                    </span>
                  ) : null}
                </a>
              </React.Fragment>
            );
          })}
        </nav>
        {filters.length > 0 ? (
          <div
            className={cn(
              'flex min-w-0 items-center gap-1 overflow-x-auto',
              isGraphDock ? 'sr-only flex-nowrap' : isRail ? 'flex-wrap overflow-x-visible' : 'flex-nowrap'
            )}
            data-hz-topology-focus-filters-owner="hertzbeat-ui-focus-trail-filters"
            data-hz-topology-focus-filter-visibility={isGraphDock ? 'assistive' : 'visible'}
            data-hz-topology-focus-filter-visibility-owner="hertzbeat-ui-focus-trail-filter-visibility"
            data-hz-topology-focus-filter-deduped-by={isGraphDock ? 'topology-toolbar' : undefined}
          >
            {filters.map(filter => {
              const { id, label: filterLabel, value, className: filterClassName, ...filterProps } = filter;
              return (
                <span
                  key={id}
                  {...filterProps}
                  className={cn(
                    'inline-flex h-6 min-w-0 items-center gap-1 rounded-[3px] border border-[#252832] bg-[#151821] px-2 text-[#9ca3b4]',
                    isGraphDock ? 'max-w-[136px]' : null,
                    filterClassName
                  )}
                  data-hz-topology-focus-filter={id}
                  data-hz-topology-focus-filter-owner="hertzbeat-ui-focus-trail-filter"
                >
                  <span className="truncate text-[#727b8c]" data-hz-topology-focus-filter-label-owner="hertzbeat-ui-focus-trail-filter-label">
                    {filterLabel}
                  </span>
                  <span className="truncate font-semibold text-[#d6d9e2]" data-hz-topology-focus-filter-value-owner="hertzbeat-ui-focus-trail-filter-value">
                    {value}
                  </span>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
      {(hiddenCountLabel || exitAction) ? (
        <div className={cn('flex min-w-0 flex-nowrap items-center gap-2', isLinear ? 'ml-auto' : 'lg:justify-end')}>
          {hiddenCountLabel ? (
            <span
              {...hiddenCountRestProps}
              className={cn(
                'shrink-0 font-mono uppercase tracking-[0.08em] text-[#727b8c]',
                isGraphDock ? 'text-[9px]' : 'text-[10px]',
                hiddenCountClassName
              )}
              data-hz-topology-focus-hidden-count-owner="hertzbeat-ui-focus-trail-hidden-count"
            >
              {hiddenCountLabel}
            </span>
          ) : null}
          {exitAction ? (
            (() => {
              const { label: exitLabel, className: exitClassName, ...exitProps } = exitAction;
              return (
                <a
                  {...exitProps}
                  className={cn(
                    'inline-flex shrink-0 items-center justify-center rounded-[3px] border border-[#303542] bg-[#151821] font-semibold text-[#dfe3ec] transition-colors hover:border-[#4e74f8]',
                    isGraphDock ? 'h-6 px-2 text-[11px]' : 'h-7 px-3 text-[12px]',
                    exitClassName
                  )}
                  data-hz-topology-focus-exit-owner="hertzbeat-ui-focus-trail-exit"
                  data-hz-topology-focus-exit-href={exitProps.href}
                  data-hz-topology-focus-exit-href-owner="hertzbeat-ui-focus-trail-exit-href"
                >
                  {exitLabel}
                </a>
              );
            })()
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function HzTopologyGroupPanel({
  title,
  copy,
  groupByLabel,
  items,
  actions = [],
  boundary = 'default',
  className,
  ...props
}: HzTopologyGroupPanelProps) {
  return (
    <section
      {...props}
      className={cn(
        'grid min-w-0 gap-3 bg-[var(--hz-ui-surface)] p-3 text-[12px] text-[#cbd3df]',
        topologyGroupPanelBoundaryClassName[boundary],
        className
      )}
      data-hz-ui="topology-group-panel"
      data-hz-topology-primitive="group-panel"
      data-hz-topology-group-panel-density="compact"
      data-hz-topology-group-panel-boundary={boundary}
      data-hz-topology-group-panel-boundary-owner="hertzbeat-ui-group-panel-boundary"
    >
      <div className="grid min-w-0 gap-1" data-hz-topology-group-panel-header-owner="hertzbeat-ui-group-panel-header">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span
            className="min-w-0 truncate text-[12px] font-semibold text-[#eef2f8]"
            data-hz-topology-group-panel-title-owner="hertzbeat-ui-group-panel-title"
          >
            {title}
          </span>
          <span
            className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]"
            data-hz-topology-group-panel-group-by-owner="hertzbeat-ui-group-panel-group-by"
          >
            {groupByLabel}
          </span>
        </div>
        {copy ? (
          <span className="text-[11px] leading-5 text-[#8f99ab]" data-hz-topology-group-panel-copy-owner="hertzbeat-ui-group-panel-copy">
            {copy}
          </span>
        ) : null}
      </div>
      <div className="grid min-w-0 gap-2" data-hz-topology-group-panel-items-owner="hertzbeat-ui-group-panel-items">
        {items.map(item => {
          const {
            id,
            label: itemLabel,
            value,
            count,
            collapsedCount = 0,
            collapsedLabel,
            worstTone = 'neutral',
            active = false,
            meta,
            className: itemClassName,
            ...itemProps
          } = item;
          return (
            <div
              key={id}
              {...itemProps}
              className={cn(
                'grid min-w-0 gap-1 rounded-[3px] border px-2 py-2',
                topologyGroupPanelToneClassName[worstTone],
                active ? 'shadow-[inset_2px_0_0_#4e74f8]' : '',
                itemClassName
              )}
              data-hz-topology-group-panel-item={id}
              data-hz-topology-group-panel-item-owner="hertzbeat-ui-group-panel-item"
              data-hz-topology-group-panel-item-active={active ? 'true' : 'false'}
              data-hz-topology-group-panel-item-worst-tone={worstTone}
              data-hz-topology-group-panel-item-count={count}
              data-hz-topology-group-panel-item-collapsed-count={collapsedCount}
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="min-w-0 truncate font-semibold" data-hz-topology-group-panel-label-owner="hertzbeat-ui-group-panel-label">
                  {itemLabel}
                </span>
                <span className="shrink-0 font-mono text-[10px]" data-hz-topology-group-panel-count-owner="hertzbeat-ui-group-panel-count">
                  {count}
                </span>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px]">
                <span className="min-w-0 truncate text-[#d6d9e2]" data-hz-topology-group-panel-value-owner="hertzbeat-ui-group-panel-value">
                  {value}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-[#8f99ab]">
                  {collapsedLabel ?? `${collapsedCount} collapsed`}
                </span>
              </div>
              {meta ? (
                <span className="min-w-0 truncate text-[11px] text-[#8f99ab]" data-hz-topology-group-panel-meta-owner="hertzbeat-ui-group-panel-meta">
                  {meta}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {actions.length > 0 ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2" data-hz-topology-group-panel-actions-owner="hertzbeat-ui-group-panel-actions">
          {actions.map(action => {
            const { id, label: actionLabel, className: actionClassName, href = '#', ...actionProps } = action;
            return (
              <a
                key={id}
                {...actionProps}
                href={href}
                className={cn(
                  'inline-flex h-7 items-center rounded-[3px] border border-[#303542] bg-[#151821] px-2 text-[11px] font-semibold text-[#dfe3ec] transition-colors hover:border-[#4e74f8]',
                  actionClassName
                )}
                data-hz-topology-group-panel-action={id}
                data-hz-topology-group-panel-action-owner="hertzbeat-ui-group-panel-action"
              >
                {actionLabel}
              </a>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function HzTopologyPathEndpoint({
  kind,
  endpoint
}: {
  kind: 'source' | 'target';
  endpoint: HzTopologyPathSummaryEndpoint;
}) {
  return (
    <div
      className="grid min-w-0 gap-1 rounded-[3px] border border-[#252832] bg-[#101217] px-2 py-2"
      data-hz-topology-path-endpoint={kind}
      data-hz-topology-path-endpoint-owner="hertzbeat-ui-path-summary-endpoint"
    >
      <span
        className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#727b8c]"
        data-hz-topology-path-endpoint-label-owner="hertzbeat-ui-path-summary-endpoint-label"
      >
        {endpoint.label}
      </span>
      <span className="min-w-0 truncate text-[12px] font-semibold text-[#eef2f8]" data-hz-topology-path-endpoint-value-owner="hertzbeat-ui-path-summary-endpoint-value">
        {endpoint.value}
      </span>
      {endpoint.meta ? (
        <span className="min-w-0 truncate text-[11px] text-[#8f99ab]" data-hz-topology-path-endpoint-meta-owner="hertzbeat-ui-path-summary-endpoint-meta">
          {endpoint.meta}
        </span>
      ) : null}
    </div>
  );
}

export function HzTopologyPathSummary({
  title,
  source,
  target,
  relation,
  directionLabel,
  metrics = [],
  evidenceBadges = [],
  actions = [],
  boundary = 'none',
  interactionState,
  selectedEdgeId,
  hoveredEdgeId,
  sourceId,
  targetId,
  relationType,
  sourceKind,
  className,
  ...props
}: HzTopologyPathSummaryProps) {
  const resolvedInteractionState: HzTopologyPathSummaryInteractionState =
    interactionState ?? (selectedEdgeId ? 'selected' : hoveredEdgeId ? 'hovered' : 'preview');

  return (
    <section
      {...props}
      className={cn(
        'grid min-w-0 gap-3 bg-[var(--hz-ui-surface)] p-3 text-[12px] text-[#cbd3df]',
        topologyPathSummaryBoundaryClassName[boundary],
        className
      )}
      data-hz-ui="topology-path-summary"
      data-hz-topology-primitive="path-summary"
      data-hz-topology-path-summary-density="compact"
      data-hz-topology-path-summary-boundary={boundary}
      data-hz-topology-path-summary-boundary-owner="hertzbeat-ui-path-summary-boundary"
      data-hz-topology-path-interaction-owner="hertzbeat-ui-path-summary-interaction"
      data-topology-path-summary-interaction-state={resolvedInteractionState}
      data-hz-topology-path-summary-interaction-state={resolvedInteractionState}
      data-hz-topology-path-summary-interaction-state-owner="hertzbeat-ui-path-summary-interaction-state"
      data-topology-path-summary-selected-edge-id={selectedEdgeId ?? 'none'}
      data-topology-path-summary-hovered-edge-id={hoveredEdgeId ?? 'none'}
      data-hz-topology-path-selected-edge={selectedEdgeId ?? 'none'}
      data-hz-topology-path-hovered-edge={hoveredEdgeId ?? 'none'}
      data-hz-topology-path-source-id={sourceId ?? 'none'}
      data-hz-topology-path-target-id={targetId ?? 'none'}
      data-hz-topology-path-relation-type={relationType ?? 'unknown'}
      data-hz-topology-path-source-kind={sourceKind ?? 'unknown'}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2" data-hz-topology-path-summary-header-owner="hertzbeat-ui-path-summary-header">
        <span className="min-w-0 truncate text-[12px] font-semibold text-[#eef2f8]" data-hz-topology-path-summary-title-owner="hertzbeat-ui-path-summary-title">
          {title}
        </span>
        {directionLabel ? (
          <span
            className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]"
            data-hz-topology-path-summary-direction-owner="hertzbeat-ui-path-summary-direction"
          >
            {directionLabel}
          </span>
        ) : null}
      </div>
      <div
        className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"
        data-hz-topology-path-endpoints-owner="hertzbeat-ui-path-summary-endpoints"
      >
        <HzTopologyPathEndpoint kind="source" endpoint={source} />
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-[3px] border border-[#303542] bg-[#151821] text-[#8f99ab]"
          aria-hidden="true"
          data-hz-topology-path-arrow-owner="hertzbeat-ui-path-summary-arrow"
        >
          {'->'}
        </span>
        <HzTopologyPathEndpoint kind="target" endpoint={target} />
      </div>
      {relation ? (
        <div className="flex min-w-0 items-center gap-2 rounded-[3px] border border-[#252832] bg-[#151821] px-2 py-2" data-hz-topology-path-relation-owner="hertzbeat-ui-path-summary-relation">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#727b8c]">
            {relation.label}
          </span>
          <span className="min-w-0 truncate font-semibold text-[#d6d9e2]">
            {relation.value}
          </span>
          {relation.meta ? <span className="min-w-0 truncate text-[11px] text-[#8f99ab]">{relation.meta}</span> : null}
        </div>
      ) : null}
      {metrics.length > 0 ? (
        <div className="grid min-w-0 gap-2 sm:grid-cols-3" data-hz-topology-path-metrics-owner="hertzbeat-ui-path-summary-metrics">
          {metrics.map(metric => (
            <div
              key={metric.id}
              className={cn('grid min-w-0 gap-1 rounded-[3px] border px-2 py-2', topologyPathSummaryMetricClassName[metric.tone ?? 'neutral'])}
              data-hz-topology-path-metric={metric.id}
              data-hz-topology-path-metric-owner="hertzbeat-ui-path-summary-metric"
            >
              <span className="truncate text-[10px] uppercase tracking-[0.08em] text-[#727b8c]">{metric.label}</span>
              <span className="truncate font-mono text-[12px] font-semibold">{metric.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {(evidenceBadges.length > 0 || actions.length > 0) ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {evidenceBadges.map(badge => (
              <span
                key={badge}
                className="inline-flex h-6 items-center rounded-[3px] border border-[#303542] bg-[#151821] px-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[#9ca3b4]"
                data-hz-topology-path-badge={badge}
                data-hz-topology-path-badge-owner="hertzbeat-ui-path-summary-badge"
              >
                {badge}
              </span>
            ))}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {actions.map(action => {
              const { id, label: actionLabel, className: actionClassName, href = '#', ...actionProps } = action;
              return (
                <a
                  key={id}
                  {...actionProps}
                  href={href}
                  className={cn(
                    'inline-flex h-7 items-center rounded-[3px] border border-[#303542] bg-[#151821] px-2 text-[11px] font-semibold text-[#dfe3ec] transition-colors hover:border-[#4e74f8]',
                    actionClassName
                  )}
                  data-hz-topology-path-action={id}
                  data-hz-topology-path-action-owner="hertzbeat-ui-path-summary-action"
                >
                  {actionLabel}
                </a>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function HzTopologyScopeBar({
  items,
  actions = [],
  boundary = 'none',
  summaryVisibility = 'visible',
  summaryDedupedBy,
  className,
  ...props
}: HzTopologyScopeBarProps) {
  return (
    <section
      {...props}
      className={cn(
        'flex min-w-0 flex-nowrap items-center justify-end gap-2 overflow-x-auto text-[12px]',
        topologyScopeBarBoundaryClassName[boundary],
        className
      )}
      data-hz-ui="topology-scope-bar"
      data-hz-topology-primitive="scope-bar"
      data-hz-topology-scope-bar-density="compact"
      data-hz-topology-scope-bar-boundary={boundary}
      data-hz-topology-scope-bar-boundary-owner="hertzbeat-ui-scope-bar-boundary"
      data-hz-topology-scope-summary-visibility={summaryVisibility}
      data-hz-topology-scope-summary-deduped-by={summaryDedupedBy}
    >
      {items.map(item => {
        const { id, label, value, className: itemClassName, ...itemProps } = item;
        return (
          <span
            key={id}
            {...itemProps}
            className={cn(
              summaryVisibility === 'assistive'
                ? 'sr-only'
                : 'inline-flex h-7 min-w-0 items-center gap-1 rounded-[3px] border border-[#252832] bg-[#151821] px-2 text-[#9ca3b4]',
              itemClassName
            )}
            data-hz-topology-scope-item={id}
            data-hz-topology-scope-item-owner="hertzbeat-ui-scope-item"
            data-hz-topology-scope-item-visibility={summaryVisibility}
          >
            {label ? (
              <span className="truncate text-[#727b8c]" data-hz-topology-scope-item-label-owner="hertzbeat-ui-scope-item-label">
                {label}
              </span>
            ) : null}
            <span className="truncate font-semibold text-[#d6d9e2]" data-hz-topology-scope-item-value-owner="hertzbeat-ui-scope-item-value">
              {value}
            </span>
          </span>
        );
      })}
      {actions.map(action => {
        const {
          id,
          label,
          emphasis = 'neutral',
          className: actionClassName,
          type,
          ...buttonProps
        } = action;
        return (
          <button
            key={id}
            {...buttonProps}
            type={type ?? 'button'}
            className={cn(
              'inline-flex h-7 items-center justify-center rounded-[3px] border px-3 text-[12px] font-semibold transition-colors',
              emphasis === 'primary'
                ? 'border-[#31405c] bg-[#182238] text-[#d8e4ff] hover:border-[#4e74f8]'
                : 'border-[#303542] bg-[#151821] text-[#dfe3ec] hover:border-[#4e74f8]',
              actionClassName
            )}
            data-hz-topology-scope-action={id}
            data-hz-topology-scope-action-owner="hertzbeat-ui-scope-action"
            data-hz-topology-scope-action-emphasis={emphasis}
          >
            {label}
          </button>
        );
      })}
    </section>
  );
}

export function HzTopologyNode({
  label,
  healthLabel,
  healthCopy,
  entityType,
  source,
  health,
  tone = 'success',
  focus = 'normal',
  evidenceBadges = [],
  redMetrics,
  position,
  healthMetaProps,
  className,
  style,
  ...props
}: HzTopologyNodeProps) {
  const positionedStyle = position
    ? {
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: position.size,
        height: position.size,
        transform: 'translate(-50%, -50%)',
        ...style
      }
    : style;
  const redMetricOwners = [
    { id: 'request-rate', value: formatTopologyNodeMetricAttribute(redMetrics?.requestRatePerSecond) },
    { id: 'error-rate', value: formatTopologyNodeMetricAttribute(redMetrics?.errorRate) },
    { id: 'latency-p95', value: formatTopologyNodeMetricAttribute(redMetrics?.latencyP95Ms) }
  ];

  return (
    <a
      {...props}
      className={cn(
        'absolute flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[4px] border px-2 py-1 text-center text-[12px] font-semibold shadow-[0_16px_48px_rgba(0,0,0,0.35)]',
        topologyNodeToneClassName[tone],
        topologyNodeFocusClassName[focus],
        className
      )}
      style={positionedStyle}
      data-hz-ui="topology-node"
      data-hz-topology-primitive="node"
      data-hz-topology-node-owner="hertzbeat-ui-node"
      data-hz-topology-node-tone={tone}
      data-hz-topology-node-focus={focus}
      data-hz-topology-node-entity-type={entityType}
      data-hz-topology-node-source={source}
      data-hz-topology-node-health={health}
      data-hz-topology-node-evidence-badges={evidenceBadges.length > 0 ? evidenceBadges.join(' ') : 'none'}
      data-hz-topology-node-request-rate={formatTopologyNodeMetricAttribute(redMetrics?.requestRatePerSecond)}
      data-hz-topology-node-error-rate={formatTopologyNodeMetricAttribute(redMetrics?.errorRate)}
      data-hz-topology-node-latency-p95-ms={formatTopologyNodeMetricAttribute(redMetrics?.latencyP95Ms)}
    >
      <span className="w-full truncate leading-tight" data-hz-topology-node-label-owner="hertzbeat-ui-node-label">
        {label}
      </span>
      {healthLabel ? (
        <span
          {...healthMetaProps}
          className={cn('w-full truncate text-[10px] font-medium leading-3 text-[#a9b0bb]', healthMetaProps?.className)}
          title={healthCopy}
          data-hz-topology-node-health-owner="hertzbeat-ui-node-health"
          data-hz-topology-node-health-label-owner="hertzbeat-ui-node-health-label"
          data-hz-topology-node-health-copy-owner="hertzbeat-ui-node-health-copy"
        >
          {healthLabel}
        </span>
      ) : null}
      <span className="sr-only" data-hz-topology-node-red-owner="hertzbeat-ui-node-red">
        {redMetricOwners.map(metric => (
          <span
            key={metric.id}
            data-hz-topology-node-red-metric={metric.id}
            data-hz-topology-node-red-metric-owner="hertzbeat-ui-node-red-metric"
          >
            {metric.value ?? 'unavailable'}
          </span>
        ))}
      </span>
      <span className="sr-only" data-hz-topology-node-badge-list-owner="hertzbeat-ui-node-badge-list">
        {(evidenceBadges.length > 0 ? evidenceBadges : ['none']).map(badge => (
          <span key={badge} data-hz-topology-node-badge={badge} data-hz-topology-node-badge-owner="hertzbeat-ui-node-badge">
            {badge}
          </span>
        ))}
      </span>
    </a>
  );
}

export type HzTopologyCanvasLayout = 'layered-service' | 'force' | 'grid-table';
export type HzTopologyCanvasInteractionMode = 'inspect' | 'focus' | 'pan-zoom';
export type HzTopologyCanvasHoverMode = 'none' | 'neighbor-highlight';
export type HzTopologyCanvasDrawerMode = 'none' | 'node' | 'edge' | 'node-edge';
export type HzTopologyCanvasFocusDepth = 'none' | '1-hop' | '2-hop' | 'auto';
export type HzTopologyCanvasMinHeight = 'compact' | 'workbench' | 'full';
export type HzTopologyCanvasInteractionScope = 'none' | 'hover-group';
export type HzTopologyCanvasBoundary = 'none' | 'section';
export type HzTopologyCanvasAnnotationPlacement = 'top-left' | 'top-right';
export type HzTopologyCanvasAnnotationVisibility = 'visible' | 'assistive';
export type HzTopologyWorkbenchDensity = 'compact' | 'roomy';
export type HzTopologyWorkbenchFrameBoundary = 'route' | 'section';

const topologyWorkbenchFrameBoundaryClassName: Record<HzTopologyWorkbenchFrameBoundary, string> = {
  route: '',
  section: 'border-t border-[var(--hz-ui-line-soft)]'
};

export type HzTopologyWorkbenchFrameProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType;
  density?: HzTopologyWorkbenchDensity;
  boundary?: HzTopologyWorkbenchFrameBoundary;
};

export function HzTopologyWorkbenchFrame({
  as: Component = 'section',
  density = 'compact',
  boundary = 'route',
  className,
  children,
  ...props
}: HzTopologyWorkbenchFrameProps) {
  return (
    <Component
      {...props}
      className={cn(
        'min-h-[calc(100vh-56px)] bg-[#08090c] text-[#f1f3f7]',
        density === 'compact' ? 'text-[13px]' : 'text-[14px]',
        topologyWorkbenchFrameBoundaryClassName[boundary],
        className
      )}
      data-hz-ui="topology-workbench-frame"
      data-hz-topology-primitive="workbench-frame"
      data-hz-topology-workbench-density={density}
      data-hz-topology-workbench-boundary={boundary}
      data-hz-topology-workbench-frame-boundary-owner="hertzbeat-ui-workbench-frame-boundary"
    >
      {children}
    </Component>
  );
}

export type HzTopologyWorkbenchHeaderDensity = 'standard' | 'operational-compact';
export type HzTopologyWorkbenchHeaderCopyVisibility = 'visible' | 'assistive';
export type HzTopologyWorkbenchHeaderBoundary = 'default' | 'none';

const topologyWorkbenchHeaderBoundaryClassName: Record<HzTopologyWorkbenchHeaderBoundary, string> = {
  default: 'border-b border-[#252832]',
  none: ''
};

export type HzTopologyWorkbenchHeaderProps = React.HTMLAttributes<HTMLElement> & {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  copy?: React.ReactNode;
  density?: HzTopologyWorkbenchHeaderDensity;
  copyVisibility?: HzTopologyWorkbenchHeaderCopyVisibility;
  boundary?: HzTopologyWorkbenchHeaderBoundary;
  scopeSlot?: React.ReactNode;
  sourceSlot?: React.ReactNode;
};

export function HzTopologyWorkbenchHeader({
  eyebrow,
  title,
  copy,
  density = 'standard',
  copyVisibility = density === 'operational-compact' ? 'assistive' : 'visible',
  boundary = 'default',
  scopeSlot,
  sourceSlot,
  className,
  children,
  ...props
}: HzTopologyWorkbenchHeaderProps) {
  const compact = density === 'operational-compact';
  return (
    <header
      {...props}
      className={cn(
        'bg-[#0b0c0f] px-4',
        topologyWorkbenchHeaderBoundaryClassName[boundary],
        compact ? 'grid gap-2 py-2' : 'py-4',
        className
      )}
      data-hz-ui="topology-workbench-header"
      data-hz-topology-primitive="workbench-header"
      data-hz-topology-workbench-header-owner="hertzbeat-ui-workbench-header"
      data-hz-topology-workbench-header-layout="title-scope-source"
      data-hz-topology-workbench-header-alignment="shared-control-grid"
      data-hz-topology-workbench-header-inset="16px"
      data-hz-topology-workbench-header-control-height="28px"
      data-hz-topology-workbench-header-density={density}
      data-hz-topology-workbench-header-density-owner="hertzbeat-ui-workbench-header-density"
      data-hz-topology-workbench-header-boundary={boundary}
      data-hz-topology-workbench-header-boundary-owner="hertzbeat-ui-workbench-header-boundary"
      data-hz-topology-workbench-copy-visibility={copyVisibility}
      data-hz-topology-workbench-eyebrow={eyebrow ? 'true' : 'false'}
      data-hz-topology-workbench-scope-slot={scopeSlot ? 'true' : 'false'}
      data-hz-topology-workbench-source-slot={sourceSlot ? 'true' : 'false'}
    >
      <div className={cn(compact ? 'grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start' : 'flex flex-wrap items-start justify-between gap-4')}>
        <div className={compact ? 'min-w-[180px]' : 'min-w-[260px]'}>
          {eyebrow ? (
            <div
              className={cn('font-semibold tracking-[0.12em] text-[#7e8494]', compact ? 'text-[10px]' : 'text-[11px]')}
              data-hz-topology-workbench-eyebrow-owner="hertzbeat-ui-workbench-eyebrow"
            >
              {eyebrow}
            </div>
          ) : null}
          <h1
            className={cn('font-semibold leading-tight text-[#f5f7fb]', compact ? 'mt-0.5 text-[20px]' : 'mt-1 text-[26px]')}
            data-hz-topology-workbench-title-owner="hertzbeat-ui-workbench-title"
          >
            {title}
          </h1>
          {copy ? (
            <p
              className={cn(
                copyVisibility === 'assistive'
                  ? 'sr-only'
                  : compact
                    ? 'mt-1 max-w-[520px] text-[12px] leading-5 text-[#8f99ab]'
                    : 'mt-2 max-w-[760px] text-[13px] leading-6 text-[#a9b0bb]'
              )}
              data-hz-topology-workbench-copy-owner="hertzbeat-ui-workbench-copy"
            >
              {copy}
            </p>
          ) : null}
        </div>
        {scopeSlot ? (
          <div className={cn('min-w-0', compact && 'lg:justify-self-end')} data-hz-topology-workbench-scope-slot-owner="hertzbeat-ui-workbench-scope-slot">
            {scopeSlot}
          </div>
        ) : null}
      </div>
      {sourceSlot ? (
        <div className={compact ? 'min-w-0' : 'mt-4'} data-hz-topology-workbench-source-slot-owner="hertzbeat-ui-workbench-source-slot">
          {sourceSlot}
        </div>
      ) : null}
      {children}
    </header>
  );
}

export type HzTopologyWorkbenchGridProps = React.HTMLAttributes<HTMLElement> & {
  layout?: 'canvas-companion' | 'canvas-only';
};

export type HzTopologyWorkbenchSlotKind = 'canvas' | 'companion';
export type HzTopologyWorkbenchSlotSurface = 'content' | 'placeholder';

export type HzTopologyWorkbenchSlotProps = React.HTMLAttributes<HTMLDivElement> & {
  kind: HzTopologyWorkbenchSlotKind;
  surface?: HzTopologyWorkbenchSlotSurface;
};

export function HzTopologyWorkbenchGrid({
  layout = 'canvas-companion',
  className,
  children,
  ...props
}: HzTopologyWorkbenchGridProps) {
  const canvasStickiness = layout === 'canvas-companion' ? 'sticky-with-companion' : 'none';
  return (
    <section
      {...props}
      className={cn(
        'grid min-h-[760px] bg-[#08090c]',
        layout === 'canvas-companion' ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : '',
        className
      )}
      data-hz-ui="topology-workbench-grid"
      data-hz-topology-primitive="workbench-grid"
      data-hz-topology-workbench-grid-owner="hertzbeat-ui-workbench-grid"
      data-hz-topology-workbench-grid-layout={layout}
      data-hz-topology-workbench-grid-canvas-stickiness={canvasStickiness}
      data-hz-topology-workbench-grid-canvas-stickiness-owner="hertzbeat-ui-workbench-grid-canvas-stickiness"
    >
      {children}
    </section>
  );
}

const topologyWorkbenchSlotSurfaceClassName: Record<HzTopologyWorkbenchSlotSurface, string> = {
  content: '',
  placeholder: 'min-h-[120px] border-t border-[var(--hz-ui-line-soft)] bg-[#08090c] px-3 py-2 text-[12px] text-[#8f99ab]'
};

const topologyWorkbenchSlotKindClassName: Record<HzTopologyWorkbenchSlotKind, string> = {
  canvas: 'min-w-0 lg:sticky lg:top-[64px] lg:self-start',
  companion: 'min-w-0'
};

export function HzTopologyWorkbenchSlot({
  kind,
  surface = 'content',
  className,
  children,
  ...props
}: HzTopologyWorkbenchSlotProps) {
  return (
    <div
      {...props}
      className={cn(
        topologyWorkbenchSlotKindClassName[kind],
        topologyWorkbenchSlotSurfaceClassName[surface],
        className
      )}
      data-hz-ui="topology-workbench-slot"
      data-hz-topology-primitive="workbench-slot"
      data-hz-topology-workbench-slot-owner="hertzbeat-ui-workbench-slot"
      data-hz-topology-workbench-slot-kind={kind}
      data-hz-topology-workbench-slot-surface={surface}
      data-hz-topology-workbench-slot-stickiness={kind === 'canvas' ? 'sticky-with-companion' : 'normal'}
    >
      {children}
    </div>
  );
}

export type HzTopologyCanvasProps = React.HTMLAttributes<HTMLElement> & {
  layout?: HzTopologyCanvasLayout;
  interactionMode?: HzTopologyCanvasInteractionMode;
  interactionScope?: HzTopologyCanvasInteractionScope;
  hoverMode?: HzTopologyCanvasHoverMode;
  drawerMode?: HzTopologyCanvasDrawerMode;
  focusDepth?: HzTopologyCanvasFocusDepth;
  minHeight?: HzTopologyCanvasMinHeight;
  boundary?: HzTopologyCanvasBoundary;
};

const topologyCanvasMinHeightClassName: Record<HzTopologyCanvasMinHeight, string> = {
  compact: 'min-h-[220px]',
  workbench: 'min-h-[680px]',
  full: 'min-h-[760px]'
};

const topologyCanvasInteractionScopeClassName: Record<HzTopologyCanvasInteractionScope, string> = {
  none: '',
  'hover-group': 'group'
};

const topologyCanvasBoundaryClassName: Record<HzTopologyCanvasBoundary, string> = {
  none: '',
  section: 'border-t border-[var(--hz-ui-line-soft)]'
};

export function HzTopologyCanvas({
  layout = 'layered-service',
  interactionMode = 'inspect',
  interactionScope = 'none',
  hoverMode = 'none',
  drawerMode = 'none',
  focusDepth = 'auto',
  minHeight = 'workbench',
  boundary = 'none',
  className,
  children,
  ...props
}: HzTopologyCanvasProps) {
  return (
    <section
      {...props}
      className={cn(
        'relative min-w-0 overflow-hidden bg-[#08090c]',
        topologyCanvasMinHeightClassName[minHeight],
        topologyCanvasInteractionScopeClassName[interactionScope],
        topologyCanvasBoundaryClassName[boundary],
        className
      )}
      data-hz-ui="topology-canvas"
      data-hz-topology-primitive="canvas"
      data-hz-topology-canvas-layout={layout}
      data-hz-topology-canvas-layout-owner="hertzbeat-ui-canvas-layout"
      data-hz-topology-canvas-interaction-mode={interactionMode}
      data-hz-topology-canvas-interaction-owner="hertzbeat-ui-canvas-interaction"
      data-hz-topology-canvas-interaction-scope={interactionScope}
      data-hz-topology-canvas-interaction-scope-owner="hertzbeat-ui-canvas-interaction-scope"
      data-hz-topology-canvas-hover-mode={hoverMode}
      data-hz-topology-canvas-drawer-mode={drawerMode}
      data-hz-topology-canvas-focus-depth={focusDepth}
      data-hz-topology-canvas-min-height={minHeight}
      data-hz-topology-canvas-min-height-owner="hertzbeat-ui-canvas-min-height"
      data-hz-topology-canvas-boundary={boundary}
      data-hz-topology-canvas-boundary-owner="hertzbeat-ui-canvas-boundary"
    >
      {children}
    </section>
  );
}

export type HzTopologyCanvasAnnotationProps = React.HTMLAttributes<HTMLDivElement> & {
  title: React.ReactNode;
  copy?: React.ReactNode;
  placement?: HzTopologyCanvasAnnotationPlacement;
  visibility?: HzTopologyCanvasAnnotationVisibility;
};

const topologyCanvasAnnotationPlacementClassName: Record<HzTopologyCanvasAnnotationPlacement, string> = {
  'top-left': 'left-3 top-3 sm:left-4 sm:top-4',
  'top-right': 'right-3 top-3 sm:right-4 sm:top-4'
};

export function HzTopologyCanvasAnnotation({
  title,
  copy,
  placement = 'top-left',
  visibility = 'visible',
  className,
  ...props
}: HzTopologyCanvasAnnotationProps) {
  const isAssistive = visibility === 'assistive';
  return (
    <div
      {...props}
      className={cn(
        isAssistive
          ? 'sr-only'
          : 'pointer-events-none absolute z-10 grid max-w-[260px] gap-0.5 border border-[var(--hz-ui-line-soft)] bg-[rgba(8,9,12,0.84)] px-2.5 py-1.5 text-[11px] text-[#8f99ab] shadow-[0_10px_28px_rgba(0,0,0,0.24)] backdrop-blur',
        isAssistive ? null : topologyCanvasAnnotationPlacementClassName[placement],
        className
      )}
      data-hz-ui="topology-canvas-annotation"
      data-hz-topology-primitive="canvas-annotation"
      data-hz-topology-canvas-annotation-owner="hertzbeat-ui-canvas-annotation"
      data-hz-topology-canvas-annotation-placement={placement}
      data-hz-topology-canvas-annotation-visibility={visibility}
      data-hz-topology-canvas-annotation-occlusion={isAssistive ? 'none' : 'overlay'}
      data-hz-topology-canvas-annotation-hit-test="pass-through"
    >
      <span className="truncate font-semibold text-[#dbe4f0]" data-hz-topology-canvas-annotation-title-owner="hertzbeat-ui-canvas-annotation-title">
        {title}
      </span>
      {copy ? (
        <span className="truncate font-mono text-[10px] text-[#727b8c]" data-hz-topology-canvas-annotation-copy-owner="hertzbeat-ui-canvas-annotation-copy">
          {copy}
        </span>
      ) : null}
    </div>
  );
}

export type HzTopologyGraphLayerProps = React.SVGAttributes<SVGSVGElement> & {
  layer?: 'svg-edge-layer';
};

export function HzTopologyGraphLayer({
  layer = 'svg-edge-layer',
  className,
  children,
  viewBox = '0 0 100 100',
  preserveAspectRatio = 'none',
  ...props
}: HzTopologyGraphLayerProps) {
  return (
    <svg
      {...props}
      className={cn('absolute inset-0 h-full w-full', className)}
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      aria-hidden={props['aria-hidden'] ?? true}
      data-hz-ui="topology-graph-layer"
      data-hz-topology-primitive="graph-layer"
      data-hz-topology-graph-layer={layer}
      data-hz-topology-graph-layer-owner="hertzbeat-ui-graph-layer"
    >
      {children}
    </svg>
  );
}

export type HzTopologyToolbarOption = {
  value: string;
  label: string;
};

export type HzTopologyToolbarStateItem = React.HTMLAttributes<HTMLSpanElement> & HzDataAttributeProps & {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: HzStatusTone;
};

export type HzTopologyToolbarBoundary = 'none' | 'default' | 'section';
export type HzTopologyToolbarDensity = 'compact' | 'graph-first';

const topologyToolbarBoundaryClassName: Record<HzTopologyToolbarBoundary, string> = {
  none: '',
  default: 'border-b border-[var(--hz-ui-line-soft)]',
  section: 'border-y border-[var(--hz-ui-line-soft)]'
};

export type HzTopologyToolbarProps = Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> & {
  environmentLabel: string;
  environmentValue: string;
  environmentOptions: HzTopologyToolbarOption[];
  searchLabel: string;
  searchPlaceholder?: string;
  searchValue?: string;
  sourceKindLabel?: string;
  sourceKindValue?: string;
  sourceKindOptions?: HzTopologyToolbarOption[];
  fitLabel?: React.ReactNode;
  locateLabel?: React.ReactNode;
  depthLabel?: string;
  depthValue?: string;
  depthOptions?: HzTopologyToolbarOption[];
  layoutLabel?: string;
  layoutValue?: string;
  layoutOptions?: HzTopologyToolbarOption[];
  groupByLabel?: string;
  groupByValue?: string;
  groupByOptions?: HzTopologyToolbarOption[];
  resetLabel?: React.ReactNode;
  resetHref?: string;
  summaryLabel: React.ReactNode;
  summaryItems?: React.ReactNode[];
  stateLabel?: React.ReactNode;
  stateItems?: HzTopologyToolbarStateItem[];
  onEnvironmentChange?: (value: string) => void;
  onSourceKindChange?: (value: string) => void;
  onDepthChange?: (value: string) => void;
  onLayoutChange?: (value: string) => void;
  onGroupByChange?: (value: string) => void;
  onSearchChange?: React.ChangeEventHandler<HTMLInputElement>;
  onFit?: React.MouseEventHandler<HTMLButtonElement>;
  onLocate?: React.MouseEventHandler<HTMLButtonElement>;
  onReset?: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  boundary?: HzTopologyToolbarBoundary;
  density?: HzTopologyToolbarDensity;
};

export function HzTopologyToolbar({
  environmentLabel,
  environmentValue,
  environmentOptions,
  searchLabel,
  searchPlaceholder,
  searchValue,
  sourceKindLabel,
  sourceKindValue,
  sourceKindOptions = [],
  fitLabel,
  locateLabel,
  depthLabel,
  depthValue,
  depthOptions = [],
  layoutLabel,
  layoutValue,
  layoutOptions = [],
  groupByLabel,
  groupByValue,
  groupByOptions = [],
  resetLabel,
  resetHref,
  summaryLabel,
  summaryItems = [],
  stateLabel,
  stateItems = [],
  onEnvironmentChange,
  onSourceKindChange,
  onDepthChange,
  onLayoutChange,
  onGroupByChange,
  onSearchChange,
  onFit,
  onLocate,
  onReset,
  boundary = 'default',
  density = 'compact',
  className,
  ...props
}: HzTopologyToolbarProps) {
  const graphFirst = density === 'graph-first';
  const hasSourceKindControl = sourceKindOptions.length > 0;
  const hasLayoutControl = !graphFirst && layoutOptions.length > 0;
  const hasCanvasTextActions = !graphFirst && (Boolean(fitLabel) || Boolean(locateLabel));
  const hasScopeControls = depthOptions.length > 0 || hasLayoutControl || groupByOptions.length > 0 || Boolean(resetLabel);
  const secondaryVisibility = graphFirst ? 'assistive' : 'visible';
  const controlStripLayout = graphFirst ? 'inline-overflow' : 'stacked-grid';
  const controlStripDisplay = graphFirst ? 'contents' : 'grid';
  const chrome = graphFirst && boundary === 'none' ? 'frameless' : 'surface';
  const selectTriggerClassName = graphFirst ? 'h-7 !gap-1.5 !px-2' : 'h-8';

  return (
    <section
      {...props}
      className={cn(
        'min-w-0',
        chrome === 'frameless' ? 'bg-transparent' : 'bg-[var(--hz-ui-surface)]',
        graphFirst
          ? 'grid items-center gap-1.5 overflow-x-auto px-0 py-1 [grid-template-columns:112px_minmax(260px,1fr)_148px_88px_132px_auto]'
          : 'grid gap-2 px-4 py-2 lg:grid-cols-[180px_minmax(0,1fr)_104px_104px]',
        topologyToolbarBoundaryClassName[boundary],
        className
      )}
      data-hz-ui="topology-toolbar"
      data-hz-topology-primitive="toolbar"
      data-hz-topology-toolbar-density={density}
      data-hz-topology-toolbar-density-owner="hertzbeat-ui-toolbar-density"
      data-hz-topology-toolbar-first-viewport-priority={graphFirst ? 'canvas' : 'balanced'}
      data-hz-topology-toolbar-first-viewport-owner="hertzbeat-ui-toolbar-first-viewport"
      data-hz-topology-toolbar-row-contract={graphFirst ? 'single-row-overflow' : 'multi-row-grid'}
      data-hz-topology-toolbar-row-contract-owner="hertzbeat-ui-toolbar-row-contract"
      data-hz-topology-toolbar-alignment={graphFirst ? 'flush-control-grid' : 'stacked-grid'}
      data-hz-topology-toolbar-inset={graphFirst ? '0px' : '16px'}
      data-hz-topology-toolbar-control-height={graphFirst ? '28px' : '32px'}
      data-hz-topology-toolbar-select-padding={graphFirst ? 'compact-flush' : 'default'}
      data-hz-topology-toolbar-row-separator={graphFirst ? 'none' : 'soft'}
      data-hz-topology-toolbar-control-gap={graphFirst ? '6px' : '8px'}
      data-hz-topology-toolbar-control-flow={graphFirst ? 'single-grid-row' : 'stacked-grid'}
      data-hz-topology-toolbar-empty-offset={graphFirst ? 'none' : undefined}
      data-hz-topology-toolbar-visual-weight={graphFirst ? 'low-interruption' : 'balanced'}
      data-hz-topology-toolbar-visual-weight-owner="hertzbeat-ui-toolbar-visual-weight"
      data-hz-topology-toolbar-secondary-visibility={secondaryVisibility}
      data-hz-topology-toolbar-secondary-visibility-owner="hertzbeat-ui-toolbar-secondary-visibility"
      data-hz-topology-toolbar-boundary={boundary}
      data-hz-topology-toolbar-boundary-owner="hertzbeat-ui-toolbar-boundary"
      data-hz-topology-toolbar-action-policy={graphFirst ? 'scope-controls-only' : 'scope-and-canvas-actions'}
      data-hz-topology-toolbar-canvas-action-policy={graphFirst ? 'in-canvas-g6-toolbar' : 'toolbar-buttons'}
      data-hz-topology-toolbar-chrome={chrome}
      data-hz-topology-toolbar-frame={chrome === 'frameless' ? 'none' : undefined}
    >
      <HzSelect
        aria-label={environmentLabel}
        data-hz-topology-control="environment"
        data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
        options={environmentOptions}
        value={environmentValue}
        onChange={event => onEnvironmentChange?.(event.currentTarget.value)}
        className={graphFirst ? 'w-[112px] min-w-0' : undefined}
        triggerClassName={selectTriggerClassName}
      />
      <HzInput
        aria-label={searchLabel}
        data-hz-topology-control="search"
        data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
        placeholder={searchPlaceholder}
        value={searchValue ?? ''}
        onChange={onSearchChange}
        readOnly={!onSearchChange}
        className={graphFirst ? 'h-7 min-w-[220px] w-full' : undefined}
      />
      {hasSourceKindControl ? (
        <HzSelect
          aria-label={sourceKindLabel}
          data-hz-topology-control="source-kind"
          data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
          data-hz-topology-control-source-kind-owner="hertzbeat-ui-toolbar-source-kind-control"
          data-hz-topology-control-source-kind-value={sourceKindValue}
          options={sourceKindOptions}
          value={sourceKindValue}
          onChange={event => onSourceKindChange?.(event.currentTarget.value)}
          className={graphFirst ? 'w-[148px] shrink-0' : undefined}
          triggerClassName={selectTriggerClassName}
        />
      ) : null}
      {hasCanvasTextActions && fitLabel ? (
        <HzButton
          type="button"
          size="sm"
          data-hz-topology-control="fit-view"
          data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
          onClick={onFit}
        >
          {fitLabel}
        </HzButton>
      ) : null}
      {hasCanvasTextActions && locateLabel ? (
        <HzButton
          type="button"
          size="sm"
          intent="primary"
          data-hz-topology-control="locate-entity"
          data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
          onClick={onLocate}
        >
          {locateLabel}
        </HzButton>
      ) : null}
      {hasScopeControls ? (
        <div
          className={cn(
            graphFirst
              ? 'contents'
              : 'grid min-w-0 border-t border-[var(--hz-ui-line-faint)] sm:grid-cols-2 lg:col-span-4',
            graphFirst ? '' : 'gap-2 pt-2 xl:grid-cols-[120px_160px_160px_auto]'
          )}
          data-hz-topology-toolbar-control-strip={graphFirst ? 'source-depth-group-reset' : 'depth-layout-group-reset'}
          data-hz-topology-toolbar-control-strip-owner="hertzbeat-ui-toolbar-control-strip"
          data-hz-topology-toolbar-control-strip-layout={controlStripLayout}
          data-hz-topology-toolbar-control-strip-display={controlStripDisplay}
          data-hz-topology-toolbar-control-strip-layout-owner="hertzbeat-ui-toolbar-control-strip-layout"
        >
          {depthOptions.length > 0 ? (
            <HzSelect
              aria-label={depthLabel}
              data-hz-topology-control="depth"
              data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
              data-hz-topology-control-depth-owner="hertzbeat-ui-toolbar-depth-control"
              data-hz-topology-control-depth-value={depthValue}
              options={depthOptions}
              value={depthValue}
              onChange={event => onDepthChange?.(event.currentTarget.value)}
              className={graphFirst ? 'w-[88px] shrink-0' : undefined}
              triggerClassName={selectTriggerClassName}
            />
          ) : null}
          {hasLayoutControl ? (
            <HzSelect
              aria-label={layoutLabel}
              data-hz-topology-control="layout"
              data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
              data-hz-topology-control-layout-owner="hertzbeat-ui-toolbar-layout-control"
              data-hz-topology-control-layout-value={layoutValue}
              options={layoutOptions}
              value={layoutValue}
              onChange={event => onLayoutChange?.(event.currentTarget.value)}
              className={graphFirst ? 'w-[132px] shrink-0' : undefined}
              triggerClassName={selectTriggerClassName}
            />
          ) : null}
          {groupByOptions.length > 0 ? (
            <HzSelect
              aria-label={groupByLabel}
              data-hz-topology-control="group-by"
              data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
              data-hz-topology-control-group-owner="hertzbeat-ui-toolbar-group-control"
              data-hz-topology-control-group-value={groupByValue}
              options={groupByOptions}
              value={groupByValue}
              onChange={event => onGroupByChange?.(event.currentTarget.value)}
              className={graphFirst ? 'w-[132px] shrink-0' : undefined}
              triggerClassName={selectTriggerClassName}
            />
          ) : null}
          {resetLabel && resetHref ? (
            <HzButtonLink
              href={resetHref}
              size="sm"
              onClick={onReset as React.MouseEventHandler<HTMLAnchorElement>}
              data-hz-topology-control="reset-scope"
              data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
              data-hz-topology-control-reset-owner="hertzbeat-ui-toolbar-reset-control"
            >
              {resetLabel}
            </HzButtonLink>
          ) : resetLabel ? (
            <HzButton
              type="button"
              size="sm"
              onClick={onReset as React.MouseEventHandler<HTMLButtonElement>}
              data-hz-topology-control="reset-scope"
              data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
              data-hz-topology-control-reset-owner="hertzbeat-ui-toolbar-reset-control"
            >
              {resetLabel}
            </HzButton>
          ) : null}
        </div>
      ) : null}
      <div
        className={cn(
          'flex min-w-0 flex-wrap items-center gap-2 text-[12px] text-[#8f99ab]',
          graphFirst ? '' : 'lg:col-span-4',
          graphFirst ? 'sr-only' : ''
        )}
        data-hz-topology-toolbar-summary="incoming-context"
        data-hz-topology-toolbar-summary-visibility={secondaryVisibility}
        data-hz-topology-toolbar-summary-owner="hertzbeat-ui-toolbar-summary"
      >
        <span className="font-semibold text-[#d6d9e2]" data-hz-topology-toolbar-summary-label-owner="hertzbeat-ui-toolbar-summary-label">
          {summaryLabel}
        </span>
        {summaryItems.map((item, index) => (
          <span
            key={index}
            data-hz-topology-summary-item={index}
            data-hz-topology-summary-item-owner="hertzbeat-ui-toolbar-summary-item"
          >
            {item}
          </span>
        ))}
      </div>
      {stateItems.length > 0 ? (
        <div
          className={cn(
            'flex min-w-0 flex-wrap items-center gap-2 border-t border-[var(--hz-ui-line-faint)] pt-2 text-[11px]',
            graphFirst ? '' : 'lg:col-span-4',
            graphFirst ? 'sr-only border-0 pt-0' : ''
          )}
          data-hz-topology-toolbar-state={stateItems.map(item => item.id).join('-')}
          data-hz-topology-toolbar-state-visibility={secondaryVisibility}
          data-hz-topology-toolbar-state-owner="hertzbeat-ui-toolbar-state"
          data-hz-topology-state-label={typeof stateLabel === 'string' ? stateLabel : undefined}
        >
          {stateLabel ? (
            <span
              className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#727b8c]"
              data-hz-topology-state-label-owner="hertzbeat-ui-toolbar-state-label"
            >
              {stateLabel}
            </span>
          ) : null}
          {stateItems.map(item => {
            const {
              id,
              label,
              value,
              tone = 'neutral',
              className: itemClassName,
              ...itemProps
            } = item;
            const toneColor = chartToneColor[tone];
            return (
              <span
                key={id}
                {...itemProps}
                className={cn(
                  'inline-flex h-6 min-w-0 items-center gap-1.5 border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-control)] px-2 text-[#d6d9e2]',
                  itemClassName
                )}
                data-hz-topology-state-item={id}
                data-hz-topology-state-item-tone={tone}
                data-hz-topology-state-item-owner="hertzbeat-ui-toolbar-state-item"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0"
                  style={{ backgroundColor: toneColor.stroke }}
                  aria-hidden="true"
                  data-hz-topology-state-indicator-owner="hertzbeat-ui-toolbar-state-indicator"
                />
                <span className="truncate text-[#727b8c]" data-hz-topology-state-item-label-owner="hertzbeat-ui-toolbar-state-item-label">
                  {label}
                </span>
                <span className="min-w-0 truncate font-semibold" data-hz-topology-state-item-value-owner="hertzbeat-ui-toolbar-state-item-value">
                  {value}
                </span>
              </span>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export type HzTopologyEmptyStateBoundary = 'default' | 'flush' | 'canvas';
export type HzTopologyEmptyStateCopyVisibility = 'visible' | 'assistive';

const topologyEmptyStateBoundaryClassNames: Record<HzTopologyEmptyStateBoundary, string> = {
  default: 'border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] shadow-[0_16px_48px_rgba(0,0,0,0.28)]',
  flush: 'border-y border-x-0 border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] shadow-[0_16px_48px_rgba(0,0,0,0.28)]',
  canvas: 'border-0 bg-transparent shadow-none'
};

export type HzTopologyEmptyStateProps = React.HTMLAttributes<HTMLElement> & {
  title: React.ReactNode;
  copy: React.ReactNode;
  sourceLabel?: React.ReactNode;
  timeScope?: React.ReactNode;
  environment?: string;
  sourceKind?: string;
  relationType?: string;
  focusEntityId?: string;
  depth?: number | string;
  resultCount?: number;
  evidenceSources?: string[];
  kind?: 'api-empty' | 'degraded' | 'filtered-empty';
  placement?: 'inline' | 'canvas-center';
  boundary?: HzTopologyEmptyStateBoundary;
  copyVisibility?: HzTopologyEmptyStateCopyVisibility;
};

export function HzTopologyEmptyState({
  title,
  copy,
  sourceLabel,
  timeScope,
  environment,
  sourceKind,
  relationType,
  focusEntityId,
  depth,
  resultCount,
  evidenceSources,
  kind = 'api-empty',
  placement = 'inline',
  boundary = 'default',
  copyVisibility = 'visible',
  className,
  ...props
}: HzTopologyEmptyStateProps) {
  const normalizedEvidenceSources = evidenceSources && evidenceSources.length > 0 ? evidenceSources.join(' ') : 'none';

  return (
    <section
      {...props}
      className={cn(
        'grid min-w-0 px-4 py-4 text-center',
        topologyEmptyStateBoundaryClassNames[boundary],
        placement === 'canvas-center'
          ? 'absolute left-1/2 top-1/2 w-[min(420px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2'
          : 'w-full',
        className
      )}
      data-hz-ui="topology-empty-state"
      data-hz-topology-primitive="empty-state"
      data-hz-topology-empty-kind={kind}
      data-hz-topology-empty-boundary={boundary}
      data-hz-topology-empty-boundary-owner="hertzbeat-ui-empty-boundary"
      data-hz-topology-empty-boundary-visual={boundary === 'canvas' ? 'frameless-canvas' : 'surface'}
      data-hz-topology-empty-placement={placement}
      data-hz-topology-empty-source={sourceLabel}
      data-hz-topology-empty-time-scope={timeScope}
      data-hz-topology-empty-scope-owner="hertzbeat-ui-empty-scope"
      data-hz-topology-empty-environment={environment ?? 'all'}
      data-hz-topology-empty-source-kind={sourceKind ?? 'all'}
      data-hz-topology-empty-relation-type={relationType ?? 'all'}
      data-hz-topology-empty-focus-entity-id={focusEntityId ?? 'none'}
      data-hz-topology-empty-depth={depth ?? 'unknown'}
      data-hz-topology-empty-result-count={typeof resultCount === 'number' ? resultCount : 'unknown'}
      data-hz-topology-empty-evidence-sources={normalizedEvidenceSources}
      data-hz-topology-empty-copy-visibility={copyVisibility}
    >
      <div className="text-[13px] font-semibold text-[#f3f6fb]" data-hz-topology-empty-title-owner="hertzbeat-ui-empty-title">
        {title}
      </div>
      <div
        className={cn(
          copyVisibility === 'assistive' ? 'sr-only' : 'mt-2 text-[12px] leading-5 text-[#8f99ab]'
        )}
        data-hz-topology-empty-copy-owner="hertzbeat-ui-empty-copy"
      >
        {copy}
      </div>
      {sourceLabel || timeScope ? (
        <div
          className="mt-3 flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]"
          data-hz-topology-empty-meta-owner="hertzbeat-ui-empty-meta"
        >
          {sourceLabel ? (
            <span className="truncate" data-hz-topology-empty-source-owner="hertzbeat-ui-empty-source">
              {sourceLabel}
            </span>
          ) : null}
          {timeScope ? (
            <span className="truncate" data-hz-topology-empty-time-scope-owner="hertzbeat-ui-empty-time-scope">
              {timeScope}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export type HzTopologyLoadingStateProps = React.HTMLAttributes<HTMLElement> & {
  title: React.ReactNode;
  copy: React.ReactNode;
  sourceLabel?: React.ReactNode;
  timeScope?: React.ReactNode;
  environment?: string;
  sourceKind?: string;
  relationType?: string;
  focusEntityId?: string;
  depth?: number | string;
  evidenceSources?: string[];
  rows?: number;
  placement?: 'inline' | 'canvas-center';
  boundary?: HzTopologyEmptyStateBoundary;
};

export function HzTopologyLoadingState({
  title,
  copy,
  sourceLabel,
  timeScope,
  environment,
  sourceKind,
  relationType,
  focusEntityId,
  depth,
  evidenceSources,
  rows = 3,
  placement = 'inline',
  boundary = 'default',
  className,
  ...props
}: HzTopologyLoadingStateProps) {
  const normalizedEvidenceSources = evidenceSources && evidenceSources.length > 0 ? evidenceSources.join(' ') : 'none';
  const skeletonRows = Array.from({ length: Math.max(1, Math.min(6, Math.floor(rows))) });

  return (
    <section
      {...props}
      className={cn(
        'grid min-w-0 px-4 py-4 text-center',
        topologyEmptyStateBoundaryClassNames[boundary],
        placement === 'canvas-center'
          ? 'absolute left-1/2 top-1/2 w-[min(420px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2'
          : 'w-full',
        className
      )}
      data-hz-ui="topology-loading-state"
      data-hz-topology-primitive="loading-state"
      data-hz-topology-loading-boundary={boundary}
      data-hz-topology-loading-boundary-owner="hertzbeat-ui-loading-boundary"
      data-hz-topology-loading-placement={placement}
      data-hz-topology-loading-source={sourceLabel}
      data-hz-topology-loading-time-scope={timeScope}
      data-hz-topology-loading-scope-owner="hertzbeat-ui-loading-scope"
      data-hz-topology-loading-environment={environment ?? 'all'}
      data-hz-topology-loading-source-kind={sourceKind ?? 'all'}
      data-hz-topology-loading-relation-type={relationType ?? 'all'}
      data-hz-topology-loading-focus-entity-id={focusEntityId ?? 'none'}
      data-hz-topology-loading-depth={depth ?? 'unknown'}
      data-hz-topology-loading-evidence-sources={normalizedEvidenceSources}
    >
      <div className="text-[13px] font-semibold text-[#f3f6fb]" data-hz-topology-loading-title-owner="hertzbeat-ui-loading-title">
        {title}
      </div>
      <div className="mt-2 text-[12px] leading-5 text-[#8f99ab]" data-hz-topology-loading-copy-owner="hertzbeat-ui-loading-copy">
        {copy}
      </div>
      {sourceLabel || timeScope ? (
        <div
          className="mt-3 flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]"
          data-hz-topology-loading-meta-owner="hertzbeat-ui-loading-meta"
        >
          {sourceLabel ? (
            <span className="truncate" data-hz-topology-loading-source-owner="hertzbeat-ui-loading-source">
              {sourceLabel}
            </span>
          ) : null}
          {timeScope ? (
            <span className="truncate" data-hz-topology-loading-time-scope-owner="hertzbeat-ui-loading-time-scope">
              {timeScope}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 grid gap-2" data-hz-topology-loading-skeleton-owner="hertzbeat-ui-loading-skeleton">
        {skeletonRows.map((_, index) => (
          <div
            key={index}
            className="h-2 rounded-[2px] bg-[rgba(126,132,148,0.22)]"
            style={{ width: `${100 - index * 14}%` }}
            data-hz-topology-loading-row={index + 1}
            data-hz-topology-skeleton-row-owner="hertzbeat-ui-loading-row"
          />
        ))}
      </div>
    </section>
  );
}

export type HzTopologyCompanionRailDensity = 'compact' | 'roomy';
export type HzTopologyCompanionRailPlacement = 'side' | 'stack';
export type HzTopologyCompanionRailBoundary = 'side' | 'stack-section' | 'none';
export type HzTopologyCompanionRailPriority = 'balanced' | 'graph-first';
export type HzTopologyCompanionRailStickyContext = 'none' | 'first-section' | 'jump-list';
export type HzTopologyCompanionSectionDensity = 'compact' | 'graph-first';
export type HzTopologyCompanionJumpListDensity = 'compact' | 'graph-first';
export type HzTopologyCompanionJumpListActiveMode = 'manual' | 'contained-rail-scroll';

export type HzTopologyCompanionSectionProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
  sectionId: string;
  anchorId?: string;
  density?: HzTopologyCompanionSectionDensity;
  collapsible?: boolean;
  collapsed?: boolean;
  collapseLabel?: React.ReactNode;
  expandLabel?: React.ReactNode;
  onCollapsedChange?: (collapsed: boolean) => void;
};

export type HzTopologySectionLabelProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  density?: 'compact' | 'roomy';
};

export type HzTopologyCompanionJumpListItem = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & {
  id: string;
  href: string;
  label: React.ReactNode;
  active?: boolean;
};

export type HzTopologyCompanionJumpListProps = React.HTMLAttributes<HTMLElement> & {
  items: HzTopologyCompanionJumpListItem[];
  density?: HzTopologyCompanionJumpListDensity;
  activeMode?: HzTopologyCompanionJumpListActiveMode;
  activeResetKey?: string | number;
  ariaLabel?: string;
};

export function HzTopologySectionLabel({
  children,
  density = 'compact',
  className,
  ...rest
}: HzTopologySectionLabelProps) {
  return (
    <div
      {...rest}
      className={cn(
        'min-w-0 truncate font-semibold tracking-[0.12em] text-[#7e8494]',
        density === 'compact' ? 'text-[12px]' : 'text-[13px]',
        className
      )}
      data-hz-ui="topology-section-label"
      data-hz-topology-primitive="section-label"
      data-hz-topology-section-label-density={density}
      data-hz-topology-section-label-owner="hertzbeat-ui-section-label"
      data-hz-topology-section-label-text-owner="hertzbeat-ui-section-label-text"
    >
      {children}
    </div>
  );
}

export function HzTopologyCompanionSection({
  children,
  sectionId,
  anchorId = sectionId,
  density = 'compact',
  collapsible = false,
  collapsed = false,
  collapseLabel = 'Collapse',
  expandLabel = 'Expand',
  onCollapsedChange,
  className,
  ...rest
}: HzTopologyCompanionSectionProps) {
  const isCollapsed = collapsible ? collapsed : false;
  const bodyId = `${anchorId}-body`;

  return (
    <section
      {...rest}
      id={anchorId}
      className={cn(
        'min-w-0 scroll-mt-2',
        density === 'graph-first' ? '[&>*+*]:mt-2' : '[&>*+*]:mt-3',
        className
      )}
      data-hz-ui="topology-companion-section"
      data-hz-topology-primitive="companion-section"
      data-hz-topology-companion-section-id={sectionId}
      data-hz-topology-companion-section-anchor={anchorId}
      data-hz-topology-companion-section-owner="hertzbeat-ui-companion-section"
      data-hz-topology-companion-section-anchor-owner="hertzbeat-ui-companion-section-anchor"
      data-hz-topology-companion-section-density={density}
      data-hz-topology-companion-section-collapsible={collapsible ? 'true' : 'false'}
      data-hz-topology-companion-section-collapsed={isCollapsed ? 'true' : 'false'}
    >
      {collapsible ? (
        <>
          <button
            type="button"
            className={cn(
              'flex h-6 w-full min-w-0 items-center justify-between gap-2 border border-[rgba(126,132,148,0.26)] bg-[rgba(11,16,26,0.78)] px-2 text-left text-[11px] font-semibold text-[#98a2b3] transition-colors hover:border-[rgba(99,127,236,0.58)] hover:text-[#dbe4f0] focus-visible:border-[#5c7cfa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(92,124,250,0.24)]',
              density === 'graph-first' ? 'tracking-[0.08em]' : 'tracking-[0.06em]'
            )}
            aria-controls={bodyId}
            aria-expanded={!isCollapsed}
            data-hz-topology-companion-section-toggle-owner="hertzbeat-ui-companion-section-toggle"
            data-hz-topology-companion-section-toggle-state={isCollapsed ? 'collapsed' : 'expanded'}
            onClick={() => onCollapsedChange?.(!isCollapsed)}
          >
            <span className="min-w-0 truncate" data-hz-topology-companion-section-toggle-label-owner="hertzbeat-ui-companion-section-toggle-label">
              {isCollapsed ? expandLabel : collapseLabel}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={cn('h-3 w-3 shrink-0 transition-transform', isCollapsed ? '-rotate-90' : 'rotate-0')}
              data-hz-topology-companion-section-toggle-icon-owner="hertzbeat-ui-companion-section-toggle-icon"
            />
          </button>
          <div
            id={bodyId}
            hidden={isCollapsed}
            data-hz-topology-companion-section-body-owner="hertzbeat-ui-companion-section-body"
            data-hz-topology-companion-section-body-state={isCollapsed ? 'collapsed' : 'expanded'}
          >
            {children}
          </div>
        </>
      ) : (
        children
      )}
    </section>
  );
}

export function HzTopologyCompanionJumpList({
  items,
  density = 'compact',
  activeMode = 'manual',
  activeResetKey,
  ariaLabel = 'Topology companion sections',
  className,
  ...rest
}: HzTopologyCompanionJumpListProps) {
  const jumpListRef = React.useRef<HTMLElement | null>(null);
  const manualActiveId = React.useMemo(() => items.find(item => item.active)?.id, [items]);
  const manualActiveHref = items.find(item => item.id === manualActiveId)?.href;
  const [scrollActiveId, setScrollActiveId] = React.useState<string | undefined>();
  const resolvedActiveId = activeMode === 'contained-rail-scroll' ? (scrollActiveId ?? manualActiveId) : manualActiveId;
  const didRunSelectionSyncRef = React.useRef(false);

  React.useEffect(() => {
    if (activeMode !== 'contained-rail-scroll') {
      didRunSelectionSyncRef.current = false;
      return;
    }
    const shouldSyncLocation = didRunSelectionSyncRef.current && activeResetKey !== undefined;
    didRunSelectionSyncRef.current = true;
    setScrollActiveId(undefined);
    if (!manualActiveHref?.startsWith('#') || typeof document === 'undefined') return;
    const jumpList = jumpListRef.current;
    const rail = jumpList?.closest<HTMLElement>('[data-hz-ui="topology-companion-rail"][data-hz-topology-companion-scroll="contained"]');
    const target = document.getElementById(manualActiveHref.slice(1));
    if (!jumpList || !rail || !target || !rail.contains(target)) return;
    const railRect = rail.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const jumpListHeight = jumpList.getBoundingClientRect().height;
    const targetTop = Math.max(0, rail.scrollTop + targetRect.top - railRect.top - jumpListHeight - 8);
    if (typeof rail.scrollTo === 'function') {
      rail.scrollTo({ top: targetTop, behavior: 'auto' });
    } else {
      rail.scrollTop = targetTop;
    }
    if (shouldSyncLocation && typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${manualActiveHref}`);
    }
  }, [activeMode, activeResetKey, manualActiveHref, manualActiveId]);

  React.useEffect(() => {
    if (activeMode !== 'contained-rail-scroll' || typeof document === 'undefined') return undefined;
    const jumpList = jumpListRef.current;
    const rail = jumpList?.closest<HTMLElement>('[data-hz-ui="topology-companion-rail"][data-hz-topology-companion-scroll="contained"]');
    if (!jumpList || !rail) return undefined;

    const getNextActiveId = () => {
      const railRect = rail.getBoundingClientRect();
      const jumpListHeight = jumpList.getBoundingClientRect().height;
      const activationTop = railRect.top + jumpListHeight + 12;
      let nextActiveId: string | undefined;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const item of items) {
        if (!item.href.startsWith('#')) continue;
        const target = document.getElementById(item.href.slice(1));
        if (!target || !rail.contains(target)) continue;
        const rect = target.getBoundingClientRect();
        const distance = Math.abs(rect.top - activationTop);
        if (rect.top <= activationTop && distance <= nearestDistance) {
          nextActiveId = item.id;
          nearestDistance = distance;
        }
      }

      if (nextActiveId) return nextActiveId;

      for (const item of items) {
        if (!item.href.startsWith('#')) continue;
        const target = document.getElementById(item.href.slice(1));
        if (!target || !rail.contains(target)) continue;
        const rect = target.getBoundingClientRect();
        const distance = Math.abs(rect.top - activationTop);
        if (distance <= nearestDistance) {
          nextActiveId = item.id;
          nearestDistance = distance;
        }
      }

      return nextActiveId;
    };

    const updateActiveSection = () => {
      const nextActiveId = getNextActiveId();
      if (nextActiveId) setScrollActiveId(current => (current === nextActiveId ? current : nextActiveId));
    };

    rail.addEventListener('scroll', updateActiveSection, { passive: true });
    return () => rail.removeEventListener('scroll', updateActiveSection);
  }, [activeMode, items]);

  return (
    <nav
      {...rest}
      ref={jumpListRef}
      aria-label={ariaLabel}
      className={cn(
        'min-w-0 overflow-x-auto hb-scrollbar',
        density === 'graph-first' ? 'sticky top-0 z-20 -mx-1 bg-[#08090c] px-1 py-1' : 'py-1',
        className
      )}
      data-hz-ui="topology-companion-jump-list"
      data-hz-topology-primitive="companion-jump-list"
      data-hz-topology-companion-jump-list-owner="hertzbeat-ui-companion-jump-list"
      data-hz-topology-companion-jump-list-density={density}
      data-hz-topology-companion-jump-list-interaction="anchor-jump"
      data-hz-topology-companion-jump-list-interaction-owner="hertzbeat-ui-companion-jump-list-interaction"
      data-hz-topology-companion-jump-list-sticky={density === 'graph-first' ? 'top' : 'none'}
      data-hz-topology-companion-jump-list-sticky-owner="hertzbeat-ui-companion-jump-list-sticky"
      data-hz-topology-companion-jump-list-scroll-scope={density === 'graph-first' ? 'contained-rail' : 'document'}
      data-hz-topology-companion-jump-list-scroll-scope-owner="hertzbeat-ui-companion-jump-list-scroll-scope"
      data-hz-topology-companion-jump-list-active-mode={activeMode}
      data-hz-topology-companion-jump-list-active-mode-owner="hertzbeat-ui-companion-jump-list-active-mode"
      data-hz-topology-companion-jump-list-selection-sync="manual-active-resets-scroll-active"
      data-hz-topology-companion-jump-list-selection-sync-owner="hertzbeat-ui-companion-jump-list-selection-sync"
      data-hz-topology-companion-jump-list-selection-scroll="active-section"
      data-hz-topology-companion-jump-list-selection-scroll-owner="hertzbeat-ui-companion-jump-list-selection-scroll"
      data-hz-topology-companion-jump-list-selection-url-policy="replace-active-section-hash"
      data-hz-topology-companion-jump-list-selection-url-policy-owner="hertzbeat-ui-companion-jump-list-selection-url-policy"
      data-hz-topology-companion-jump-list-active-reset-key={activeResetKey ?? manualActiveId ?? 'none'}
    >
      <div className="flex min-w-max items-center gap-1">
        {items.map(({ id, href, label, active = false, className: itemClassName, onClick, ...itemProps }) => {
          const activeFromScroll = activeMode === 'contained-rail-scroll' && scrollActiveId === id;
          const itemActive = activeMode === 'contained-rail-scroll' ? resolvedActiveId === id : active;
          const handleClick: React.MouseEventHandler<HTMLAnchorElement> = event => {
            onClick?.(event);
            if (event.defaultPrevented || !href.startsWith('#') || typeof document === 'undefined') return;
            const target = document.getElementById(href.slice(1));
            if (!target) return;
            event.preventDefault();
            const rail = event.currentTarget.closest<HTMLElement>(
              '[data-hz-ui="topology-companion-rail"][data-hz-topology-companion-scroll="contained"]'
            );
            const jumpList = event.currentTarget.closest<HTMLElement>('[data-hz-ui="topology-companion-jump-list"]');
            if (rail?.contains(target)) {
              const railRect = rail.getBoundingClientRect();
              const targetRect = target.getBoundingClientRect();
              const jumpListHeight = jumpList?.getBoundingClientRect().height ?? 0;
              const targetTop = Math.max(0, rail.scrollTop + targetRect.top - railRect.top - jumpListHeight - 8);
              if (typeof rail.scrollTo === 'function') {
                rail.scrollTo({ top: targetTop, behavior: 'smooth' });
              } else {
                rail.scrollTop = targetTop;
              }
            } else {
              target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
            if (activeMode === 'contained-rail-scroll') setScrollActiveId(id);
            if (typeof window !== 'undefined' && window.history?.replaceState) {
              window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${href}`);
            }
          };

          return (
            <a
              key={id}
              {...itemProps}
              href={href}
              onClick={handleClick}
              aria-current={itemActive ? 'location' : undefined}
              className={cn(
                'inline-flex h-6 shrink-0 items-center border px-2 text-[11px] font-semibold transition-colors',
                itemActive
                  ? 'border-[#5570d9] bg-[rgba(85,112,217,0.18)] text-[#dbe4ff]'
                  : 'border-[rgba(126,132,148,0.24)] bg-[#10131a] text-[#8f99ab] hover:border-[#5570d9] hover:text-[#e8ecf6]',
                itemClassName
              )}
              data-hz-topology-companion-jump-item={id}
              data-hz-topology-companion-jump-href={href}
              data-hz-topology-companion-jump-item-owner="hertzbeat-ui-companion-jump-item"
              data-hz-topology-companion-jump-active={itemActive ? 'true' : 'false'}
              data-hz-topology-companion-jump-active-source={activeFromScroll ? 'contained-rail-scroll' : active ? 'manual' : 'none'}
              data-hz-topology-companion-jump-scroll-owner="hertzbeat-ui-companion-jump-scroll"
            >
              {label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

export function HzTopologyCompanionRail({
  children,
  density = 'compact',
  placement = 'side',
  boundary = placement === 'stack' ? 'none' : 'side',
  priority = 'balanced',
  stickyContext: stickyContextProp,
  className,
  ...rest
}: {
  children: React.ReactNode;
  density?: HzTopologyCompanionRailDensity;
  placement?: HzTopologyCompanionRailPlacement;
  boundary?: HzTopologyCompanionRailBoundary;
  priority?: HzTopologyCompanionRailPriority;
  stickyContext?: HzTopologyCompanionRailStickyContext;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  const lowInterruption = priority === 'graph-first';
  const containedScroll = lowInterruption;
  const defaultStickyContext: HzTopologyCompanionRailStickyContext = containedScroll ? 'first-section' : 'none';
  const stickyContext = stickyContextProp ?? defaultStickyContext;
  const stickyTarget =
    stickyContext === 'jump-list'
      ? 'topology-companion-jump-list'
      : stickyContext === 'first-section'
        ? 'topology-section-label'
        : 'none';
  return (
    <aside
      {...rest}
      className={cn(
        'min-w-0 bg-[#0b0c0f] p-4',
        density === 'compact' ? '[&>*+*]:mt-5' : '[&>*+*]:mt-6',
        lowInterruption ? 'bg-[#08090c] p-3 text-[12px] [&>*+*]:mt-3' : '',
        containedScroll ? 'max-h-[680px] overflow-y-auto hb-scrollbar' : '',
        containedScroll && stickyContext === 'first-section'
          ? '[&>[data-hz-ui=topology-section-label]:first-child]:sticky [&>[data-hz-ui=topology-section-label]:first-child]:top-0 [&>[data-hz-ui=topology-section-label]:first-child]:z-10 [&>[data-hz-ui=topology-section-label]:first-child]:bg-[#08090c] [&>[data-hz-ui=topology-section-label]:first-child]:py-1'
          : '',
        containedScroll && stickyContext === 'jump-list'
          ? '[&>[data-hz-ui=topology-companion-jump-list]:first-child]:sticky [&>[data-hz-ui=topology-companion-jump-list]:first-child]:top-0 [&>[data-hz-ui=topology-companion-jump-list]:first-child]:z-20 [&>[data-hz-ui=topology-companion-jump-list]:first-child]:bg-[#08090c]'
          : '',
        boundary === 'side' ? 'border-l border-[var(--hz-ui-line-soft)]' : '',
        boundary === 'stack-section' ? 'border-t border-[var(--hz-ui-line-soft)]' : '',
        className
      )}
      data-hz-ui="topology-companion-rail"
      data-hz-topology-primitive="companion-rail"
      data-hz-topology-companion-density={density}
      data-hz-topology-companion-placement={placement}
      data-hz-topology-companion-priority={priority}
      data-hz-topology-companion-priority-owner="hertzbeat-ui-companion-rail-priority"
      data-hz-topology-companion-visual-weight={lowInterruption ? 'low-interruption' : 'balanced'}
      data-hz-topology-companion-visual-weight-owner="hertzbeat-ui-companion-rail-visual-weight"
      data-hz-topology-companion-scroll={containedScroll ? 'contained' : 'page'}
      data-hz-topology-companion-scroll-owner="hertzbeat-ui-companion-rail-scroll"
      data-hz-topology-companion-viewport-contract={containedScroll ? 'graph-height' : 'page-flow'}
      data-hz-topology-companion-sticky-context={stickyContext}
      data-hz-topology-companion-sticky-context-owner="hertzbeat-ui-companion-rail-sticky-context"
      data-hz-topology-companion-sticky-target={stickyTarget}
      data-hz-topology-companion-sticky-target-owner="hertzbeat-ui-companion-rail-sticky-target"
      data-hz-topology-companion-boundary={boundary}
      data-hz-topology-companion-boundary-owner="hertzbeat-ui-companion-rail-boundary"
      data-hz-topology-companion-spacing="shared-stack"
      data-hz-topology-companion-spacing-owner="hertzbeat-ui-companion-rail-spacing"
      data-hz-topology-companion-content-owner="hertzbeat-ui-companion-rail-content"
    >
      {children}
    </aside>
  );
}

export type HzTopologyMetricTableLabels = {
  edgeCount?: React.ReactNode;
  requestRate?: React.ReactNode;
  errorRate?: React.ReactNode;
  latencyP95?: React.ReactNode;
  rowAction?: React.ReactNode;
  rowAriaLabel?: (row: HzTopologyMetricRow) => string;
  renderWindowFilterAll?: React.ReactNode;
  renderWindowFilterVisible?: React.ReactNode;
  renderWindowFilterPartial?: React.ReactNode;
  renderWindowFilterHidden?: React.ReactNode;
  renderWindowFilterUnknown?: React.ReactNode;
  renderWindowEdgeSummary?: React.ReactNode;
  renderWindowRowSummary?: (rendered: number, total: number) => React.ReactNode;
  renderWindowShowMore?: (next: number, total: number) => React.ReactNode;
};

export type HzTopologyMetricTableRenderWindowCompanion = {
  mode: 'direct' | 'windowed';
  totalNodeCount: number;
  renderedNodeCount: number;
  hiddenNodeCount: number;
  totalEdgeCount?: number;
  renderedEdgeCount?: number;
  visibleNodeBudget: number;
  tableCompanion?: 'optional' | 'recommended' | 'required';
  priorityNodeIds?: string[];
  renderedNodeIds?: string[];
};

export type HzTopologyMetricTableBoundary = 'default' | 'framed' | 'flush';
export type HzTopologyMetricTableDensity = 'compact' | 'graph-first';
export type HzTopologyMetricRowWindowVisibility = 'visible' | 'partial' | 'hidden' | 'unknown';
export type HzTopologyMetricTableRenderWindowFilter = 'all' | HzTopologyMetricRowWindowVisibility;
const HZ_TOPOLOGY_METRIC_TABLE_ROW_RENDER_BUDGET = 120;

const topologyMetricTableBoundaryClassName: Record<HzTopologyMetricTableBoundary, string> = {
  default: 'border-y border-[var(--hz-ui-line-soft)]',
  framed: 'border border-[var(--hz-ui-line-soft)]',
  flush: 'border-y border-[var(--hz-ui-line-soft)] border-x-0'
};

function formatTopologyNumber(value: number | undefined, maximumFractionDigits = 2) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return value.toLocaleString('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: 0
  });
}

function formatTopologyRate(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${formatTopologyNumber(value)}/s`
    : '-';
}

function formatTopologyPercent(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  const percentValue = Math.abs(value) <= 1 ? value * 100 : value;
  return `${formatTopologyNumber(percentValue)}%`;
}

function formatTopologyLatency(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${formatTopologyNumber(value)}ms`
    : '-';
}

function resolveTopologyMetricEndpointVisibility(
  nodeId: string | undefined,
  mode: HzTopologyMetricTableRenderWindowCompanion['mode'],
  renderedNodeIds: Set<string> | undefined
): 'true' | 'false' | 'unknown' {
  if (!nodeId) return 'unknown';
  if (mode === 'direct') return 'true';
  if (!renderedNodeIds) return 'unknown';
  return renderedNodeIds.has(nodeId) ? 'true' : 'false';
}

function resolveTopologyMetricRowWindowVisibility(
  sourceVisible: 'true' | 'false' | 'unknown',
  targetVisible: 'true' | 'false' | 'unknown'
): HzTopologyMetricRowWindowVisibility {
  if (sourceVisible === 'unknown' || targetVisible === 'unknown') return 'unknown';
  if (sourceVisible === 'true' && targetVisible === 'true') return 'visible';
  if (sourceVisible === 'false' && targetVisible === 'false') return 'hidden';
  return 'partial';
}

function normalizeTopologyMetricTableRenderWindowFilter(
  filter: HzTopologyMetricTableRenderWindowFilter | undefined
): HzTopologyMetricTableRenderWindowFilter {
  if (filter === 'visible' || filter === 'partial' || filter === 'hidden' || filter === 'unknown') return filter;
  return 'all';
}

export function HzTopologyMetricTable({
  title,
  rows,
  selectedRowId,
  selectionSource = 'none',
  emptyLabel = 'No topology evidence',
  labels,
  renderWindowCompanion,
  renderWindowFilter = 'all',
  onRenderWindowFilterChange,
  onRowSelect,
  boundary = 'default',
  density = 'compact',
  className,
  ...rest
}: {
  title: React.ReactNode;
  rows: HzTopologyMetricRow[];
  selectedRowId?: string;
  selectionSource?: string;
  emptyLabel?: React.ReactNode;
  labels?: HzTopologyMetricTableLabels;
  renderWindowCompanion?: HzTopologyMetricTableRenderWindowCompanion;
  renderWindowFilter?: HzTopologyMetricTableRenderWindowFilter;
  onRenderWindowFilterChange?: (filter: HzTopologyMetricTableRenderWindowFilter) => void;
  onRowSelect?: (row: HzTopologyMetricRow) => void;
  boundary?: HzTopologyMetricTableBoundary;
  density?: HzTopologyMetricTableDensity;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  const graphFirst = density === 'graph-first';
  const renderWindowMode = renderWindowCompanion?.mode ?? 'direct';
  const renderWindowTableCompanion = renderWindowCompanion?.tableCompanion ?? 'optional';
  const hiddenNodeCompanion =
    renderWindowCompanion && renderWindowCompanion.hiddenNodeCount > 0
      ? renderWindowTableCompanion
      : 'inactive';
  const priorityNodeIds = renderWindowCompanion?.priorityNodeIds?.length
    ? renderWindowCompanion.priorityNodeIds.join(' ')
    : 'none';
  const renderedNodeIds = renderWindowCompanion?.renderedNodeIds;
  const renderedNodeIdSet = renderedNodeIds?.length ? new Set(renderedNodeIds) : undefined;
  const tableEdgeCount = typeof renderWindowCompanion?.totalEdgeCount === 'number'
    ? renderWindowCompanion.totalEdgeCount
    : rows.length;
  const canvasRenderedEdgeCount = typeof renderWindowCompanion?.renderedEdgeCount === 'number'
    ? renderWindowCompanion.renderedEdgeCount
    : tableEdgeCount;
  const hasCanvasEdgeSummary =
    renderWindowMode === 'windowed' &&
    typeof renderWindowCompanion?.totalEdgeCount === 'number' &&
    typeof renderWindowCompanion?.renderedEdgeCount === 'number';
  const edgeCountPolicy = hasCanvasEdgeSummary ? 'canvas-rendered-vs-table-total' : 'row-window-visibility';
  const renderWindowEdgeSummary =
    labels?.renderWindowEdgeSummary ?? `${canvasRenderedEdgeCount}/${tableEdgeCount} rendered in canvas`;
  const rowsWithWindowVisibility = rows.map(row => {
    const sourceVisible = resolveTopologyMetricEndpointVisibility(row.sourceNodeId, renderWindowMode, renderedNodeIdSet);
    const targetVisible = resolveTopologyMetricEndpointVisibility(row.targetNodeId, renderWindowMode, renderedNodeIdSet);
    const rowWindowVisibility = resolveTopologyMetricRowWindowVisibility(sourceVisible, targetVisible);
    return { row, sourceVisible, targetVisible, rowWindowVisibility };
  });
  const selectedRowWithWindowVisibility = selectedRowId
    ? rowsWithWindowVisibility.find(({ row }) => row.id === selectedRowId)
    : undefined;
  const hasMetricTableSelection = Boolean(selectedRowId && selectionSource !== 'none');
  const renderWindowRowCounts = rowsWithWindowVisibility.reduce<Record<HzTopologyMetricRowWindowVisibility, number>>(
    (counts, row) => {
      counts[row.rowWindowVisibility] += 1;
      return counts;
    },
    { visible: 0, partial: 0, hidden: 0, unknown: 0 }
  );
  const activeRenderWindowFilter = normalizeTopologyMetricTableRenderWindowFilter(renderWindowFilter);
  const [rowRenderPage, setRowRenderPage] = React.useState(1);
  React.useEffect(() => {
    setRowRenderPage(1);
  }, [activeRenderWindowFilter, rows.length]);
  const filteredRowsWithWindowVisibility =
    activeRenderWindowFilter === 'all'
      ? rowsWithWindowVisibility
      : rowsWithWindowVisibility.filter(row => row.rowWindowVisibility === activeRenderWindowFilter);
  const shouldBudgetRenderedRows =
    renderWindowMode === 'windowed' &&
    filteredRowsWithWindowVisibility.length > HZ_TOPOLOGY_METRIC_TABLE_ROW_RENDER_BUDGET;
  const rowRenderBudget = shouldBudgetRenderedRows
    ? Math.min(filteredRowsWithWindowVisibility.length, HZ_TOPOLOGY_METRIC_TABLE_ROW_RENDER_BUDGET * rowRenderPage)
    : filteredRowsWithWindowVisibility.length;
  const budgetedRowsWithWindowVisibility = shouldBudgetRenderedRows
    ? filteredRowsWithWindowVisibility.slice(0, rowRenderBudget)
    : filteredRowsWithWindowVisibility;
  const selectedFilteredRowWithWindowVisibility = selectedRowId
    ? filteredRowsWithWindowVisibility.find(({ row }) => row.id === selectedRowId)
    : undefined;
  const renderedRowsWithWindowVisibility =
    shouldBudgetRenderedRows &&
    selectedFilteredRowWithWindowVisibility &&
    !budgetedRowsWithWindowVisibility.some(({ row }) => row.id === selectedFilteredRowWithWindowVisibility.row.id)
      ? [...budgetedRowsWithWindowVisibility, selectedFilteredRowWithWindowVisibility]
      : budgetedRowsWithWindowVisibility;
  const hiddenRenderedRowCount = Math.max(0, filteredRowsWithWindowVisibility.length - renderedRowsWithWindowVisibility.length);
  const nextRowRenderCount = shouldBudgetRenderedRows
    ? Math.min(filteredRowsWithWindowVisibility.length, rowRenderBudget + HZ_TOPOLOGY_METRIC_TABLE_ROW_RENDER_BUDGET)
    : filteredRowsWithWindowVisibility.length;
  const canShowMoreRenderedRows = shouldBudgetRenderedRows && rowRenderBudget < filteredRowsWithWindowVisibility.length;
  const rowRenderPolicy = shouldBudgetRenderedRows ? 'windowed-dom-budget' : 'all-filtered-rows';
  const renderWindowRowSummary =
    labels?.renderWindowRowSummary?.(renderedRowsWithWindowVisibility.length, filteredRowsWithWindowVisibility.length) ??
    `Showing ${renderedRowsWithWindowVisibility.length} of ${filteredRowsWithWindowVisibility.length} rows`;
  const renderWindowShowMore =
    labels?.renderWindowShowMore?.(nextRowRenderCount, filteredRowsWithWindowVisibility.length) ??
    `Show ${nextRowRenderCount} of ${filteredRowsWithWindowVisibility.length} rows`;
  const renderWindowFilterOptions: Array<{
    id: HzTopologyMetricTableRenderWindowFilter;
    label: React.ReactNode;
    count: number;
  }> = [
    { id: 'all', label: labels?.renderWindowFilterAll ?? 'All', count: rows.length },
    { id: 'visible', label: labels?.renderWindowFilterVisible ?? 'Visible', count: renderWindowRowCounts.visible },
    { id: 'partial', label: labels?.renderWindowFilterPartial ?? 'Partial', count: renderWindowRowCounts.partial },
    { id: 'hidden', label: labels?.renderWindowFilterHidden ?? 'Hidden', count: renderWindowRowCounts.hidden },
    { id: 'unknown', label: labels?.renderWindowFilterUnknown ?? 'Unknown', count: renderWindowRowCounts.unknown }
  ];
  return (
    <section
      {...rest}
      className={cn(
        'min-w-0',
        graphFirst ? 'bg-[#0b0c0f] text-[11px]' : 'bg-[var(--hz-ui-surface)]',
        topologyMetricTableBoundaryClassName[boundary],
        className
      )}
      data-hz-ui="topology-metric-table"
      data-hz-topology-primitive="metric-table"
      data-hz-topology-metric-table-root="true"
      data-hz-topology-metric-table-density={density}
      data-hz-topology-metric-table-density-owner="hertzbeat-ui-metric-table-density"
      data-hz-topology-metric-table-visual-weight={graphFirst ? 'low-interruption' : 'balanced'}
      data-hz-topology-metric-table-visual-weight-owner="hertzbeat-ui-metric-table-visual-weight"
      data-hz-topology-metric-table-row-density={graphFirst ? 'compressed-red' : 'standard-red'}
      data-hz-topology-metric-table-boundary={boundary}
      data-hz-topology-metric-table-boundary-owner="hertzbeat-ui-metric-table-boundary"
      data-hz-topology-metric-rows={rows.length}
      data-hz-topology-metric-table-total-rows={rows.length}
      data-hz-topology-metric-table-interaction="row-select-detail"
      data-hz-topology-metric-table-live-selection-owner="hertzbeat-ui-metric-table-selection"
      data-hz-topology-metric-table-selected-edge-id={hasMetricTableSelection ? selectedRowId : 'none'}
      data-hz-topology-metric-table-selection-source={hasMetricTableSelection ? selectionSource : 'none'}
      data-hz-topology-metric-table-selected-row-render-window-visibility={
        hasMetricTableSelection ? selectedRowWithWindowVisibility?.rowWindowVisibility ?? 'unknown' : 'none'
      }
      data-hz-topology-metric-table-selected-row-source-visible={
        hasMetricTableSelection && selectedRowWithWindowVisibility ? String(selectedRowWithWindowVisibility.sourceVisible) : 'unknown'
      }
      data-hz-topology-metric-table-selected-row-target-visible={
        hasMetricTableSelection && selectedRowWithWindowVisibility ? String(selectedRowWithWindowVisibility.targetVisible) : 'unknown'
      }
      data-hz-topology-metric-table-live-selection-invariants="row-click-drawer no-url-change no-remount no-refit viewport-preserved render-key-stable"
      data-hz-topology-metric-table-filter-invariants="in-page no-url-change no-g6-remount viewport-preserved selection-preserved"
      data-hz-topology-metric-table-filter-url-policy="preserve-current-url"
      data-hz-topology-metric-table-render-window-owner="hertzbeat-ui-metric-table-render-window"
      data-hz-topology-metric-table-render-window-mode={renderWindowMode}
      data-hz-topology-metric-table-render-window-total-node-count={renderWindowCompanion?.totalNodeCount ?? 0}
      data-hz-topology-metric-table-render-window-rendered-node-count={renderWindowCompanion?.renderedNodeCount ?? rows.length}
      data-hz-topology-metric-table-render-window-hidden-node-count={renderWindowCompanion?.hiddenNodeCount ?? 0}
      data-hz-topology-metric-table-render-window-total-edge-count={tableEdgeCount}
      data-hz-topology-metric-table-render-window-rendered-edge-count={canvasRenderedEdgeCount}
      data-hz-topology-metric-table-edge-count-policy={edgeCountPolicy}
      data-hz-topology-metric-table-canvas-rendered-edge-count={canvasRenderedEdgeCount}
      data-hz-topology-metric-table-table-edge-count={tableEdgeCount}
      data-hz-topology-metric-table-render-window-visible-node-budget={renderWindowCompanion?.visibleNodeBudget ?? rows.length}
      data-hz-topology-metric-table-render-window-visible-node-count={renderedNodeIds?.length ?? (renderWindowMode === 'direct' ? renderWindowCompanion?.renderedNodeCount ?? 0 : 0)}
      data-hz-topology-metric-table-render-window-table-companion={renderWindowTableCompanion}
      data-hz-topology-metric-table-hidden-node-companion={hiddenNodeCompanion}
      data-hz-topology-metric-table-priority-node-ids={priorityNodeIds}
      data-hz-topology-metric-table-visible-row-count={renderWindowRowCounts.visible}
      data-hz-topology-metric-table-partial-row-count={renderWindowRowCounts.partial}
      data-hz-topology-metric-table-hidden-row-count={renderWindowRowCounts.hidden}
      data-hz-topology-metric-table-hidden-row-proof-owner="hertzbeat-ui-metric-table-hidden-row-proof"
      data-hz-topology-metric-table-hidden-row-proof={renderWindowRowCounts.hidden > 0 ? 'available' : 'none'}
      data-hz-topology-metric-table-hidden-row-proof-filter="hidden"
      data-hz-topology-metric-table-hidden-row-proof-count={renderWindowRowCounts.hidden}
      data-hz-topology-metric-table-unknown-row-count={renderWindowRowCounts.unknown}
      data-hz-topology-metric-table-render-window-filter-owner="hertzbeat-ui-metric-table-render-window-filter"
      data-hz-topology-metric-table-render-window-filter={activeRenderWindowFilter}
      data-hz-topology-metric-table-filtered-row-count={filteredRowsWithWindowVisibility.length}
      data-hz-topology-metric-table-filtered-out-row-count={rows.length - filteredRowsWithWindowVisibility.length}
      data-hz-topology-metric-table-row-render-policy={rowRenderPolicy}
      data-hz-topology-metric-table-row-render-reset-policy="filter-change-resets-budget-preserve-selected-row"
      data-hz-topology-metric-table-row-render-budget={rowRenderBudget}
      data-hz-topology-metric-table-row-render-page={rowRenderPage}
      data-hz-topology-metric-table-row-render-next-count={nextRowRenderCount}
      data-hz-topology-metric-table-row-render-can-show-more={canShowMoreRenderedRows ? 'true' : 'false'}
      data-hz-topology-metric-table-rendered-row-count={renderedRowsWithWindowVisibility.length}
      data-hz-topology-metric-table-rendered-hidden-row-count={hiddenRenderedRowCount}
    >
      <header
        className={cn(
          'flex items-center justify-between border-b border-[var(--hz-ui-line-soft)]',
          graphFirst ? 'min-h-8 gap-2 px-2 py-1.5' : 'min-h-10 gap-3 px-3 py-2'
        )}
        data-hz-topology-metric-table-header-owner="hertzbeat-ui-metric-table-header"
      >
        <div
          className={cn('min-w-0 truncate font-semibold text-[#f3f6fb]', graphFirst ? 'text-[12px]' : 'text-[13px]')}
          data-hz-topology-metric-table-title-owner="hertzbeat-ui-metric-table-title"
        >
          {title}
        </div>
        <span
          className={cn('font-mono uppercase tracking-[0.08em] text-[#727b8c]', graphFirst ? 'text-[9px]' : 'text-[10px]')}
          data-hz-topology-metric-table-count-owner="hertzbeat-ui-metric-table-count"
        >
          {labels?.edgeCount ?? `${rows.length} edges`}
        </span>
      </header>
      <div
        className={cn(
          'flex min-w-0 flex-wrap items-center border-b border-[var(--hz-ui-line-faint)]',
          graphFirst ? 'gap-1 px-2 py-1.5' : 'gap-1.5 px-3 py-2'
        )}
        data-hz-topology-metric-table-filter-controls-owner="hertzbeat-ui-metric-table-filter-controls"
      >
        {hasCanvasEdgeSummary ? (
          <span
            className={cn(
              'inline-flex min-h-7 items-center border border-[var(--hz-ui-line-soft)] bg-[#08090c] font-mono text-[#8f99ab]',
              graphFirst ? 'px-2 text-[10px]' : 'px-2.5 text-[11px]'
            )}
            data-hz-topology-metric-table-edge-summary-owner="hertzbeat-ui-metric-table-edge-summary"
            data-hz-topology-metric-table-edge-summary-policy={edgeCountPolicy}
          >
            {renderWindowEdgeSummary}
          </span>
        ) : null}
        {renderWindowFilterOptions.map(option => {
          const active = option.id === activeRenderWindowFilter;
          return (
            <button
              key={option.id}
              type="button"
              className={cn(
                'inline-flex min-h-7 items-center gap-1 border font-mono transition-colors',
                graphFirst ? 'px-2 text-[10px]' : 'px-2.5 text-[11px]',
                active
                  ? 'border-[var(--hz-ui-accent-muted)] bg-[var(--hz-ui-active-soft)] text-[#dbe4f0]'
                  : 'border-[var(--hz-ui-line-soft)] bg-[#0b0c0f] text-[#8f99ab] hover:border-[var(--hz-ui-line)] hover:text-[#dbe4f0]'
              )}
              aria-pressed={active}
              onClick={() => onRenderWindowFilterChange?.(option.id)}
              data-hz-topology-metric-table-filter-control-owner="hertzbeat-ui-metric-table-filter-control"
              data-hz-topology-metric-table-filter-control={option.id}
              data-hz-topology-metric-table-filter-active={active ? 'true' : 'false'}
              data-hz-topology-metric-table-filter-control-active={active ? 'true' : 'false'}
              data-hz-topology-metric-table-filter-count={option.count}
              data-hz-topology-metric-table-filter-control-url-policy="preserve-current-url"
              data-hz-topology-metric-table-filter-control-selection-policy="preserve-selected-edge"
              data-hz-topology-metric-table-filter-row-render-reset-policy="reset-row-budget-preserve-selection"
            >
              <span>{option.label}</span>
              <span className="text-[#727b8c]">{option.count}</span>
            </button>
          );
        })}
      </div>
      {filteredRowsWithWindowVisibility.length === 0 ? (
        <div className={cn('text-[#8f99ab]', graphFirst ? 'px-2 py-3 text-[11px]' : 'px-3 py-4 text-[12px]')} data-hz-topology-empty="metric-table">
          {emptyLabel}
        </div>
      ) : (
        <>
        <div className="grid min-w-0 divide-y divide-[var(--hz-ui-line-faint)]">
          {renderedRowsWithWindowVisibility.map(({ row, sourceVisible, targetVisible, rowWindowVisibility }, rowIndex) => {
            const tone = row.tone || (row.errorRate && row.errorRate > 0 ? 'warning' : 'neutral');
            const selected = selectedRowId === row.id;
            const tabbable = selected || (!hasMetricTableSelection && rowIndex === 0);
            const rowActionLabel = labels?.rowAction;
            const rowWindowContextLabel =
              rowWindowVisibility === 'visible'
                ? labels?.renderWindowFilterVisible ?? 'Visible'
                : rowWindowVisibility === 'partial'
                  ? labels?.renderWindowFilterPartial ?? 'Partial'
                  : rowWindowVisibility === 'hidden'
                    ? labels?.renderWindowFilterHidden ?? 'Hidden'
                    : labels?.renderWindowFilterUnknown ?? 'Unknown';
            const showRowWindowContext = renderWindowMode === 'windowed' && (selected || rowWindowVisibility !== 'visible');
            return (
              <button
                key={row.id}
                type="button"
                className={cn(
                  rowActionLabel
                    ? cn(
                        'grid w-full min-w-0',
                        graphFirst
                          ? 'min-h-10 grid-cols-[minmax(0,1fr)_repeat(3,minmax(48px,auto))_auto]'
                          : 'min-h-12 grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(68px,auto))_auto]'
                      )
                    : cn(
                        'grid w-full min-w-0',
                        graphFirst
                          ? 'min-h-10 grid-cols-[minmax(0,1fr)_repeat(3,minmax(48px,auto))]'
                          : 'min-h-12 grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(68px,auto))]'
                      ),
                  graphFirst ? 'items-center gap-2 px-2 py-1.5' : 'items-center gap-3 px-3 py-2',
                  'text-left transition-colors',
                  selected
                    ? 'bg-[var(--hz-ui-active-soft)] shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]'
                    : 'hover:bg-[var(--hz-ui-surface-soft)]'
                )}
                aria-label={labels?.rowAriaLabel?.(row) ?? `Open topology edge ${row.id}`}
                aria-current={selected ? 'true' : undefined}
                tabIndex={tabbable ? 0 : -1}
                onClick={() => onRowSelect?.(row)}
                data-hz-topology-edge-row={row.id}
                data-hz-topology-edge-row-tabstop={tabbable ? 'true' : 'false'}
                data-hz-topology-edge-row-tabstop-policy="single-active-row"
                data-hz-topology-edge-row-render-window-visibility={rowWindowVisibility}
                data-hz-topology-edge-row-source-node-id={row.sourceNodeId ?? 'unknown'}
                data-hz-topology-edge-row-target-node-id={row.targetNodeId ?? 'unknown'}
                data-hz-topology-edge-row-source-visible={sourceVisible}
                data-hz-topology-edge-row-target-visible={targetVisible}
                data-hz-topology-edge-selected={selected ? 'true' : 'false'}
                data-hz-topology-edge-tone={tone}
                data-hz-topology-request-rate={row.requestRatePerSecond}
                data-hz-topology-error-rate={row.errorRate}
                data-hz-topology-error-count={row.errorCount}
                data-hz-topology-latency-p95-ms={row.latencyP95Ms}
                data-hz-topology-metric-table-row-owner="hertzbeat-ui-metric-table-row"
                data-hz-topology-edge-row-selection-owner="hertzbeat-ui-metric-table-row-selection"
                data-hz-topology-edge-row-selection-mode="table-row-click-drawer"
                data-hz-topology-edge-row-selection-url-policy="preserve-current-url"
              >
                <span className="min-w-0" data-hz-topology-metric-table-endpoints-owner="hertzbeat-ui-metric-table-endpoints">
                  <span
                    className={cn('flex min-w-0 items-center font-mono text-[#dbe4f0]', graphFirst ? 'gap-1.5 text-[10px]' : 'gap-2 text-[11px]')}
                    data-hz-topology-metric-table-route-owner="hertzbeat-ui-metric-table-route"
                  >
                    <span className="truncate text-[#8f99ab]" data-hz-topology-metric-table-source-owner="hertzbeat-ui-metric-table-source">
                      {row.source}
                    </span>
                    <span
                      className={cn('h-px shrink-0', graphFirst ? 'w-5' : 'w-7')}
                      style={{ backgroundColor: chartToneColor[tone].stroke }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-[#8f99ab]" data-hz-topology-metric-table-target-owner="hertzbeat-ui-metric-table-target">
                      {row.target}
                    </span>
                  </span>
                  <span className={cn('mt-1 flex min-w-0 flex-wrap items-center', graphFirst ? 'gap-1 text-[10px]' : 'gap-1.5 text-[11px]')}>
                    <span className="truncate font-semibold text-[#f3f6fb]" data-hz-topology-metric-table-relation-owner="hertzbeat-ui-metric-table-relation">
                      {row.relationType}
                    </span>
                    {row.sourceKind ? (
                      <span className="text-[#727b8c]" data-hz-topology-metric-table-source-kind-owner="hertzbeat-ui-metric-table-source-kind">
                        {row.sourceKind}
                      </span>
                    ) : null}
                    {showRowWindowContext ? (
                      <span
                        className="border-l border-[var(--hz-ui-line-soft)] pl-1.5 font-semibold text-[#dbe4f0]"
                        data-hz-topology-edge-row-window-context-owner="hertzbeat-ui-metric-table-row-window-context"
                        data-hz-topology-edge-row-window-context={rowWindowVisibility}
                        data-hz-topology-edge-row-window-context-source-visible={sourceVisible}
                        data-hz-topology-edge-row-window-context-target-visible={targetVisible}
                      >
                        {rowWindowContextLabel}
                      </span>
                    ) : null}
                    {row.evidenceBadges?.map((badge, index) => (
                      <span
                        key={index}
                        className="border-l border-[var(--hz-ui-line-soft)] pl-1.5 text-[#8f99ab]"
                        data-hz-topology-evidence-badge={index}
                        data-hz-topology-metric-table-badge-owner="hertzbeat-ui-metric-table-badge"
                      >
                        {badge}
                      </span>
                    ))}
                  </span>
                </span>
                <span className={cn('text-right font-mono text-[#727b8c]', graphFirst ? 'text-[9px]' : 'text-[10px]')} data-hz-topology-metric-table-cell-owner="hertzbeat-ui-metric-table-cell">
                  <span className="block text-[#dbe4f0]" data-hz-topology-metric-table-value-owner="hertzbeat-ui-metric-table-value">
                    {formatTopologyRate(row.requestRatePerSecond)}
                  </span>
                  <span data-hz-topology-metric-table-label-owner="hertzbeat-ui-metric-table-label">
                    {labels?.requestRate ?? 'req/s'}
                  </span>
                </span>
                <span className={cn('text-right font-mono text-[#727b8c]', graphFirst ? 'text-[9px]' : 'text-[10px]')} data-hz-topology-metric-table-cell-owner="hertzbeat-ui-metric-table-cell">
                  <span
                    className="block"
                    style={{ color: row.errorRate && row.errorRate > 0 ? chartToneColor.warning.stroke : '#dbe4f0' }}
                    data-hz-topology-metric-table-value-owner="hertzbeat-ui-metric-table-value"
                  >
                    {formatTopologyPercent(row.errorRate)}
                  </span>
                  <span data-hz-topology-metric-table-label-owner="hertzbeat-ui-metric-table-label">
                    {labels?.errorRate ?? 'errors'}
                  </span>
                </span>
                <span className={cn('text-right font-mono text-[#727b8c]', graphFirst ? 'text-[9px]' : 'text-[10px]')} data-hz-topology-metric-table-cell-owner="hertzbeat-ui-metric-table-cell">
                  <span className="block text-[#dbe4f0]" data-hz-topology-metric-table-value-owner="hertzbeat-ui-metric-table-value">
                    {formatTopologyLatency(row.latencyP95Ms)}
                  </span>
                  <span data-hz-topology-metric-table-label-owner="hertzbeat-ui-metric-table-label">
                    {labels?.latencyP95 ?? 'p95'}
                  </span>
                </span>
                {rowActionLabel ? (
                  <span
                    className={cn(
                      'justify-self-end border-l border-[var(--hz-ui-line-soft)] font-semibold',
                      graphFirst ? 'pl-2 text-[10px]' : 'pl-3 text-[11px]',
                      selected ? 'text-[#dbe4f0]' : 'text-[#8f99ab]'
                    )}
                    data-hz-topology-edge-action={row.id}
                    data-hz-topology-metric-table-action-owner="hertzbeat-ui-metric-table-action"
                  >
                    {rowActionLabel}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {hiddenRenderedRowCount > 0 ? (
          <div
            className={cn(
              'flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--hz-ui-line-faint)] font-mono text-[#8f99ab]',
              graphFirst ? 'px-2 py-2 text-[10px]' : 'px-3 py-2.5 text-[11px]'
            )}
            data-hz-topology-metric-table-row-render-summary-owner="hertzbeat-ui-metric-table-row-render-summary"
          >
            <span>{renderWindowRowSummary}</span>
            {canShowMoreRenderedRows ? (
              <button
                type="button"
                className="inline-flex min-h-7 items-center border border-[var(--hz-ui-line-soft)] bg-[#0b0c0f] px-2 font-semibold text-[#dbe4f0] transition-colors hover:border-[var(--hz-ui-line)]"
                onClick={() => setRowRenderPage(page => page + 1)}
                data-hz-topology-metric-table-row-render-action-owner="hertzbeat-ui-metric-table-row-render-action"
                data-hz-topology-metric-table-row-render-action="show-more"
                data-hz-topology-metric-table-row-render-action-invariants="append-rows-only no-url-change no-g6-remount viewport-preserved selection-preserved"
                data-hz-topology-metric-table-row-render-action-effect="append-row-budget"
                data-hz-topology-metric-table-row-render-action-filter-reset-policy="reset-row-budget-on-filter-change"
                data-hz-topology-metric-table-row-render-action-url-policy="preserve-current-url"
                data-hz-topology-metric-table-row-render-action-selection-policy="preserve-selected-edge"
                data-hz-topology-metric-table-row-render-action-next-count={nextRowRenderCount}
              >
                {renderWindowShowMore}
              </button>
            ) : null}
          </div>
        ) : null}
        </>
      )}
    </section>
  );
}

export type HzTraceListItem = {
  id: string;
  service: React.ReactNode;
  operation: React.ReactNode;
  startTime?: React.ReactNode;
  durationMs: number;
  spanCount: number;
  errorCount?: number;
  rootCause?: React.ReactNode;
  tone?: HzStatusTone;
};

export function HzTraceList({
  title,
  traces,
  selectedTraceId,
  onTraceSelect,
  className
}: {
  title: React.ReactNode;
  traces: HzTraceListItem[];
  selectedTraceId?: string;
  onTraceSelect?: (trace: HzTraceListItem) => void;
  className?: string;
}) {
  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="trace-list"
      data-hz-chart-kind="trace-list"
    >
      <header className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0 truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</div>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]">{traces.length} traces</span>
      </header>
      <div className="divide-y divide-[var(--hz-ui-line-faint)]">
        {traces.map(trace => {
          const tone = trace.tone || (trace.errorCount ? 'warning' : 'neutral');
          const selected = selectedTraceId === trace.id;
          return (
            <button
              key={trace.id}
              type="button"
              className={cn(
                'grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left transition-colors',
                selected ? 'bg-[var(--hz-ui-active-soft)] shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]' : 'hover:bg-[var(--hz-ui-surface-soft)]'
              )}
              aria-label={`Open trace ${trace.id}`}
              onClick={() => onTraceSelect?.(trace)}
              data-hz-trace-row={trace.id}
              data-hz-trace-row-selected={selected ? 'true' : 'false'}
              data-hz-trace-duration-ms={trace.durationMs}
              data-hz-trace-span-count={trace.spanCount}
              data-hz-trace-error-count={trace.errorCount || 0}
              data-hz-trace-row-tone={tone}
            >
              <span className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
                <span className="mt-1 h-2 w-2" style={{ backgroundColor: chartToneColor[tone].stroke }} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[12px] font-semibold text-[#dbe4f0]">{trace.service}</span>
                    <span className="shrink-0 font-mono text-[10px] text-[#727b8c]">{trace.id}</span>
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[11px] text-[#8f99ab]">{trace.operation}</span>
                  {trace.rootCause ? <span className="mt-0.5 block truncate text-[11px] text-[#c69b58]">{trace.rootCause}</span> : null}
                </span>
              </span>
              <span className="grid shrink-0 grid-cols-3 gap-3 text-right font-mono text-[10px] text-[#727b8c]">
                <span>
                  <span className="block text-[#dbe4f0]">{trace.durationMs}ms</span>
                  duration
                </span>
                <span>
                  <span className="block text-[#dbe4f0]">{trace.spanCount}</span>
                  spans
                </span>
                <span>
                  <span className="block" style={{ color: trace.errorCount ? chartToneColor.warning.stroke : '#8f99ab' }}>
                    {trace.errorCount || 0}
                  </span>
                  errors
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function HzTraceDetailDrawer({
  open,
  trace,
  facts,
  sections,
  actions,
  onClose,
  className
}: {
  open: boolean;
  trace: HzTraceListItem;
  facts?: HzInspectorFact[];
  sections?: HzInspectorSection[];
  actions?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  const tone = trace.tone || (trace.errorCount ? 'warning' : 'neutral');

  return (
    <div
      data-hz-ui="trace-detail-drawer"
      data-hz-trace-detail-open={open ? 'true' : 'false'}
      data-hz-trace-detail-id={trace.id}
    >
      <HzInspectorDrawer
        open={open}
        variant="overlay"
        title="Trace detail"
        subtitle={`${stringifyNode(trace.service, trace.id)} · ${stringifyNode(trace.operation, trace.id)}`}
        status={<span className="font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: chartToneColor[tone].stroke }}>{trace.id}</span>}
        facts={
          facts || [
            { label: 'Duration', value: `${trace.durationMs}ms`, tone },
            { label: 'Spans', value: trace.spanCount, tone: 'info' },
            { label: 'Errors', value: trace.errorCount || 0, tone: trace.errorCount ? 'warning' : 'success' },
            { label: 'Start', value: trace.startTime || '-', tone: 'neutral' }
          ]
        }
        sections={sections}
        actions={actions}
        onClose={onClose}
        className={className}
      />
    </div>
  );
}

export function HzTraceEventTimeline({
  title,
  events,
  totalMs,
  selectedSpanId,
  className
}: {
  title: React.ReactNode;
  events: HzTraceEvent[];
  totalMs?: number;
  selectedSpanId?: string;
  className?: string;
}) {
  const rangeMs = Math.max(1, totalMs || 0, ...events.map(event => event.timestampMs));

  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="trace-event-timeline"
      data-hz-chart-kind="trace-events"
    >
      <header className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0 truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</div>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]">{events.length} events</span>
      </header>
      <div className="grid min-w-0 gap-2 px-3 py-2">
        <div className="relative h-11 border-b border-[var(--hz-ui-line-faint)]">
          <span className="absolute left-0 right-0 top-4 h-px bg-[var(--hz-ui-line-soft)]" aria-hidden="true" />
          {events.map(event => {
            const tone = event.tone || 'info';
            const left = `${Math.min(100, Math.max(0, (event.timestampMs / rangeMs) * 100))}%`;
            const selected = selectedSpanId ? event.spanId === selectedSpanId : false;
            return (
              <span
                key={event.id}
                className={cn('absolute top-2 h-5 w-px', selected ? 'h-6' : '')}
                data-hz-trace-event-marker={event.id}
                data-hz-trace-event-marker-selected={selected ? 'true' : 'false'}
                title={`${stringifyNode(event.name, event.id)} - ${event.timestampMs}ms`}
                style={{
                  left,
                  backgroundColor: chartToneColor[tone].stroke,
                  boxShadow: `0 0 0 3px ${chartToneColor[tone].soft}`
                }}
              >
                <span className="absolute left-1.5 top-5 max-w-[130px] truncate font-mono text-[10px] text-[#8f99ab]">{event.timestampMs}ms</span>
              </span>
            );
          })}
        </div>
        <div className="divide-y divide-[var(--hz-ui-line-faint)]">
          {events.map(event => {
            const tone = event.tone || 'info';
            const selected = selectedSpanId ? event.spanId === selectedSpanId : false;
            return (
              <div
                key={event.id}
                className={cn(
                  'grid min-w-0 grid-cols-[52px_minmax(0,1fr)] gap-3 py-2 text-[11px]',
                  selected ? 'bg-[var(--hz-ui-active-soft)] shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]' : ''
                )}
                data-hz-trace-event={event.id}
                data-hz-trace-event-span={event.spanId}
                data-hz-trace-event-tone={tone}
                data-hz-trace-event-selected={selected ? 'true' : 'false'}
              >
                <span className="font-mono text-[#727b8c]">{event.timestampMs}ms</span>
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0" style={{ backgroundColor: chartToneColor[tone].stroke }} aria-hidden="true" />
                    <span className="truncate font-mono text-[#dbe4f0]">{event.name}</span>
                    <span className="shrink-0 font-mono text-[10px] text-[#727b8c]">{event.spanId}</span>
                  </span>
                  {event.attributes?.length ? (
                    <span className="mt-1 flex min-w-0 flex-wrap gap-1.5">
                      {event.attributes.map(attribute => (
                        <span
                          key={`${stringifyNode(attribute.label, 'attribute')}-${stringifyNode(attribute.value, 'value')}`}
                          className="border border-[var(--hz-ui-line-faint)] bg-[var(--hz-ui-surface-soft)] px-1.5 py-0.5 font-mono text-[10px] text-[#8f99ab]"
                          data-hz-trace-event-attribute={stringifyNode(attribute.label, 'attribute')}
                        >
                          <span className="text-[#727b8c]">{attribute.label}=</span>
                          <span style={{ color: attribute.tone ? chartToneColor[attribute.tone].stroke : undefined }}>{attribute.value}</span>
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HzTraceWaterfall({
  title,
  spans,
  events = [],
  selectedSpanId,
  criticalPathSpanIds = [],
  onSpanSelect,
  className
}: {
  title: React.ReactNode;
  spans: HzTraceSpan[];
  events?: HzTraceEvent[];
  selectedSpanId?: string;
  criticalPathSpanIds?: string[];
  onSpanSelect?: (span: HzTraceSpan) => void;
  className?: string;
}) {
  const totalMs = Math.max(1, ...spans.map(span => span.startMs + span.durationMs), ...events.map(event => event.timestampMs));
  const criticalPath = new Set(criticalPathSpanIds);
  const eventsBySpan = events.reduce<Record<string, HzTraceEvent[]>>((acc, event) => {
    acc[event.spanId] = acc[event.spanId] || [];
    acc[event.spanId].push(event);
    return acc;
  }, {});

  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="trace-waterfall"
      data-hz-chart-kind="traces"
      data-hz-waterfall-scale="global"
    >
      <header className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0 truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</div>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]">{spans.length} spans - {totalMs} ms</span>
      </header>
      <div
        className="grid grid-cols-[158px_minmax(0,1fr)_72px] gap-2 border-b border-[var(--hz-ui-line-faint)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#727b8c]"
        data-hz-waterfall-ruler="true"
      >
        <span>Span</span>
        <span className="relative h-5 min-w-0">
          {[0, 25, 50, 75, 100].map(tick => (
            <span key={tick} className="absolute top-0 h-full border-l border-[var(--hz-ui-line-faint)]" style={{ left: `${tick}%` }}>
              <span className="ml-1 font-mono normal-case tracking-normal text-[#727b8c]">{Math.round((totalMs * tick) / 100)}ms</span>
            </span>
          ))}
        </span>
        <span className="text-right">Self</span>
      </div>
      <div className="grid gap-0 px-3 py-2">
        {spans.map(span => {
          const tone = span.tone || 'info';
          const startRatio = Math.min(100, Math.max(0, (span.startMs / totalMs) * 100));
          const endRatio = Math.min(100, Math.max(startRatio, ((span.startMs + span.durationMs) / totalMs) * 100));
          const left = `${startRatio}%`;
          const width = `${Math.max(2, endRatio - startRatio)}%`;
          const depth = Math.max(0, span.depth || 0);
          const selfPercent = `${Math.max(6, Math.min(100, ((span.selfMs || span.durationMs) / Math.max(1, span.durationMs)) * 100))}%`;
          const rowEvents = eventsBySpan[span.id] || [];
          const selected = selectedSpanId === span.id;
          const isCriticalPath = criticalPath.has(span.id);
          return (
            <div
              key={span.id}
              role={onSpanSelect ? 'button' : undefined}
              tabIndex={onSpanSelect ? 0 : undefined}
              aria-label={onSpanSelect ? `Select trace span ${span.id}` : undefined}
              onClick={() => onSpanSelect?.(span)}
              onKeyDown={event => {
                if (!onSpanSelect) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSpanSelect(span);
                }
              }}
              className={cn(
                'grid min-w-0 grid-cols-[158px_minmax(0,1fr)_72px] items-center gap-2 border-b border-[var(--hz-ui-line-faint)] py-1.5 text-[11px] last:border-b-0',
                selected ? 'bg-[var(--hz-ui-active-soft)] shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]' : ''
              )}
              data-hz-span={span.id}
              data-hz-span-interactive={onSpanSelect ? 'true' : 'false'}
              data-hz-span-depth={depth}
              data-hz-span-start-ms={span.startMs}
              data-hz-span-end-ms={span.startMs + span.durationMs}
              data-hz-span-start-ratio={formatTraceRatio(startRatio)}
              data-hz-span-end-ratio={formatTraceRatio(endRatio)}
              data-hz-span-link={span.parentId ? `${span.parentId}->${span.id}` : undefined}
              data-hz-span-selected={selected ? 'true' : 'false'}
              data-hz-span-critical-path={isCriticalPath ? 'true' : 'false'}
              data-hz-span-tone={tone}
            >
              <span className="min-w-0" style={{ paddingLeft: depth * 14 }}>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0" style={{ backgroundColor: chartToneColor[tone].stroke }} aria-hidden="true" />
                  <span className="truncate text-[#dbe4f0]">{span.service}</span>
                  {isCriticalPath ? <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.08em] text-[#c69b58]">critical</span> : null}
                </span>
                <span className="mt-0.5 flex min-w-0 items-center gap-1.5 font-mono text-[10px] text-[#727b8c]">
                  {span.parentId ? <span className="shrink-0 text-[#4f5868]">-</span> : null}
                  <span className="truncate">{span.operation}</span>
                </span>
              </span>
              <span
                className="relative h-7 min-w-0 border border-[var(--hz-ui-line-faint)] bg-[var(--hz-ui-canvas)]"
                data-hz-waterfall-lane="global"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, transparent 0, transparent calc(25% - 1px), var(--hz-ui-line-faint) calc(25% - 1px), var(--hz-ui-line-faint) 25%, transparent 25%, transparent calc(50% - 1px), var(--hz-ui-line-faint) calc(50% - 1px), var(--hz-ui-line-faint) 50%, transparent 50%, transparent calc(75% - 1px), var(--hz-ui-line-faint) calc(75% - 1px), var(--hz-ui-line-faint) 75%, transparent 75%)'
                }}
              >
                {span.parentId ? (
                  <span
                    className="absolute top-0 h-full w-px"
                    data-hz-span-parent-connector={span.id}
                    aria-hidden="true"
                    style={{
                      left,
                      backgroundColor: chartToneColor[tone].soft,
                      boxShadow: `0 0 0 2px ${chartToneColor[tone].soft}`
                    }}
                  />
                ) : null}
                <span
                  className="absolute top-1/2 h-4 -translate-y-1/2 border border-transparent"
                  style={{
                    left,
                    width,
                    backgroundColor: chartToneColor[tone].soft,
                    borderColor: chartToneColor[tone].stroke,
                    boxShadow: `0 0 0 1px ${chartToneColor[tone].soft} inset`
                  }}
                >
                  <span
                    className="absolute inset-y-0 left-0"
                    data-hz-span-self-bar={span.id}
                    style={{
                      width: selfPercent,
                      backgroundColor: chartToneColor[tone].stroke
                    }}
                  />
                </span>
                {rowEvents.map(event => {
                  const eventTone = event.tone || tone;
                  const eventLeft = `${Math.min(100, Math.max(0, (event.timestampMs / totalMs) * 100))}%`;
                  return (
                    <span
                      key={event.id}
                      className="absolute top-1 h-5 w-px"
                      data-hz-span-event-marker={event.id}
                      title={stringifyNode(event.name, event.id)}
                      style={{
                        left: eventLeft,
                        backgroundColor: chartToneColor[eventTone].stroke,
                        boxShadow: `0 0 0 3px ${chartToneColor[eventTone].soft}`
                      }}
                    />
                  );
                })}
              </span>
              <span className="min-w-0 text-right font-mono text-[#8f99ab]">
                <span className="block truncate text-[#cbd5e1]">{span.selfMs || span.durationMs}ms</span>
                {span.status ? <span className="block truncate text-[10px] text-[#727b8c]">{span.status}</span> : null}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export type HzTraceLatencyBucket = {
  id: string;
  label: React.ReactNode;
  value: number;
  tone?: HzStatusTone;
};

export function HzTraceLatencyDistribution({
  title,
  buckets,
  height = 116,
  className
}: {
  title: React.ReactNode;
  buckets: HzTraceLatencyBucket[];
  height?: number;
  className?: string;
}) {
  const maxValue = Math.max(1, ...buckets.map(bucket => bucket.value));

  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="trace-latency-distribution"
      data-hz-chart-kind="trace-latency"
    >
      <header className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0 truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</div>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]">latency buckets</span>
      </header>
      <div className="grid min-w-0 gap-2 px-3 py-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, buckets.length)}, minmax(0, 1fr))` }}>
        {buckets.map(bucket => {
          const tone = bucket.tone || 'info';
          const barHeight = Math.max(6, Math.round((bucket.value / maxValue) * height));
          return (
            <div key={bucket.id} className="grid min-w-0 grid-rows-[minmax(0,1fr)_18px_16px] gap-1 text-center" data-hz-trace-latency-bucket={bucket.id}>
              <div className="flex min-w-0 items-end justify-center border-b border-[var(--hz-ui-line-faint)]" style={{ height }}>
                <span
                  className="block w-full min-w-[8px]"
                  data-hz-trace-latency-value={bucket.value}
                  style={{
                    height: barHeight,
                    backgroundColor: chartToneColor[tone].stroke,
                    boxShadow: `0 0 0 1px ${chartToneColor[tone].soft} inset`
                  }}
                />
              </div>
              <span className="truncate font-mono text-[10px] text-[#727b8c]">{bucket.label}</span>
              <span className="font-mono text-[10px] text-[#cbd5e1]">{bucket.value}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function HzTraceSpanTable({
  title,
  spans,
  className
}: {
  title: React.ReactNode;
  spans: HzTraceSpan[];
  className?: string;
}) {
  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="trace-span-table"
      data-hz-chart-kind="trace-spans"
    >
      <header className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0 truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</div>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]">{spans.length} spans</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--hz-ui-line-faint)] bg-[var(--hz-ui-surface-soft)]">
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">Service</th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">Operation</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">Start</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">Duration</th>
            </tr>
          </thead>
          <tbody>
            {spans.map(span => {
              const tone = span.tone || 'info';
              return (
                <tr key={span.id} className="border-b border-[var(--hz-ui-line-faint)] last:border-b-0" data-hz-trace-span-row={span.id} data-hz-trace-span-tone={tone}>
                  <td className="px-3 py-2 text-[12px] font-semibold text-[#dbe4f0]">
                    <span className="mr-2 inline-block h-2 w-2" style={{ backgroundColor: chartToneColor[tone].stroke }} aria-hidden="true" />
                    {span.service}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-[#8f99ab]">{span.operation}</td>
                  <td className="px-3 py-2 text-right font-mono text-[11px] text-[#8f99ab]">{span.startMs}ms</td>
                  <td className="px-3 py-2 text-right font-mono text-[11px] text-[#cbd5e1]">{span.durationMs}ms</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function HzStateNotice({
  tone = 'info',
  title,
  description,
  meta,
  actions,
  variant = 'default',
  frame = 'default',
  className,
  ...props
}: {
  tone?: HzStatusTone;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  variant?: 'default' | 'embedded' | 'hint';
  frame?: 'default' | 'trend-empty';
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>) {
  const toneColor = chartToneColor[tone];
  const frameClassName = frame === 'trend-empty'
    ? 'flex h-full min-w-0 flex-1 flex-col justify-center border-dashed border-[#2a303a] bg-[#0c1016] text-center'
    : '';

  if (variant === 'hint') {
    return (
      <div
        role="note"
        className={cn('rounded-[3px] border border-[#252b35] bg-[#10141b] px-2.5 py-2 text-[11px] leading-4 text-[#8792a5]', frameClassName, className)}
        {...props}
        data-hz-ui="state-notice"
        data-hz-state-tone={tone}
        data-hz-state-variant={variant}
        data-hz-state-frame={frame}
        data-hz-state-hint-owner="hertzbeat-ui-state-notice"
      >
        <span className="block min-w-0">{title}</span>
        {description ? <span className="mt-1 block min-w-0">{description}</span> : null}
        {meta ? (
          <span className="mt-1 block min-w-0 font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: toneColor.stroke }}>
            {meta}
          </span>
        ) : null}
        {actions ? <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    );
  }

  return (
    <div
      role={tone === 'critical' || tone === 'warning' ? 'status' : 'note'}
      className={cn(
        'grid min-w-0 items-stretch bg-[var(--hz-ui-surface)]',
        variant === 'embedded' ? 'border-0' : 'border-y border-[var(--hz-ui-line-soft)]',
        actions ? 'grid-cols-[3px_minmax(0,1fr)_auto]' : 'grid-cols-[3px_minmax(0,1fr)]',
        frameClassName,
        className
      )}
      {...props}
      data-hz-ui="state-notice"
      data-hz-state-tone={tone}
      data-hz-state-variant={variant}
      data-hz-state-frame={frame}
    >
      <span aria-hidden="true" style={{ backgroundColor: toneColor.stroke }} />
      <div className="min-w-0 px-3 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</span>
          {meta ? (
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: toneColor.stroke }}>
              {meta}
            </span>
          ) : null}
        </div>
        {description ? <div className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2 border-l border-[var(--hz-ui-line-soft)] px-3 py-2">{actions}</div> : null}
    </div>
  );
}

export type HzDialogEventNoticeProps = React.ComponentProps<typeof HzStateNotice> & {
  layout?: 'side-stack' | 'grid-cell';
};

const dialogEventNoticeLayoutClassName: Record<NonNullable<HzDialogEventNoticeProps['layout']>, string> = {
  'grid-cell': 'border-x-0 border-b border-t-0 bg-transparent px-2 pb-2 pt-0 lg:border-r',
  'side-stack': 'border-x-0 border-b border-t-0 bg-transparent px-0 pb-2 pt-0'
};

export function HzDialogEventNotice({
  layout = 'side-stack',
  tone = 'info',
  variant = 'hint',
  className,
  ...props
}: HzDialogEventNoticeProps) {
  return (
    <HzStateNotice
      tone={tone}
      variant={variant}
      className={cn(dialogEventNoticeLayoutClassName[layout], className)}
      data-hz-dialog-event-notice-owner="hertzbeat-ui-dialog-event-notice"
      data-hz-dialog-event-notice-layout={layout}
      {...props}
    />
  );
}

export type HzDialogEventTextProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'copy' | 'meta';
};

export const HzDialogEventText = React.forwardRef<HTMLSpanElement, HzDialogEventTextProps>(
  ({ variant = 'copy', className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('min-w-0', className)}
      data-hz-ui="dialog-event-text"
      data-hz-dialog-event-text-owner="hertzbeat-ui-dialog-event-text"
      data-hz-dialog-event-text-variant={variant}
      {...props}
    />
  )
);

HzDialogEventText.displayName = 'HzDialogEventText';

export type HzEmptyStateProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  layout?: 'default' | 'table-panel';
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>;

const emptyStateLayoutClassName: Record<NonNullable<HzEmptyStateProps['layout']>, string | null> = {
  default: null,
  'table-panel': 'mx-auto h-[260px] max-w-[420px] border-y-0 text-left'
};

export function HzEmptyState({
  title,
  description,
  actions,
  className,
  layout = 'default',
  ...props
}: HzEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[88px] min-w-0 flex-col justify-center gap-2 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-canvas)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between',
        emptyStateLayoutClassName[layout],
        className
      )}
      data-hz-ui="empty-state"
      data-hz-empty-state-layout={layout}
      {...props}
    >
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-[#dbe4f0]">{title}</div>
        {description ? <div className="mt-1 max-w-[520px] text-[12px] leading-5 text-[#727b8c]">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export type HzAssistiveMarkerProps = React.HTMLAttributes<HTMLSpanElement> & {
  label?: React.ReactNode;
  visibility?: 'sr-only';
};

export function HzAssistiveMarker({
  className,
  label,
  visibility = 'sr-only',
  ...props
}: HzAssistiveMarkerProps) {
  return (
    <span
      className={cn(visibility, className)}
      data-hz-ui="assistive-marker"
      data-hz-assistive-marker-owner="hertzbeat-ui-assistive-marker"
      data-hz-assistive-marker-visibility={visibility}
      aria-hidden={label ? undefined : true}
      {...props}
    >
      {label}
    </span>
  );
}

export function HzLoadingState({
  title = 'Loading',
  description,
  rows = 4,
  className,
  ...props
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  rows?: number;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>) {
  const rowCount = Math.max(1, Math.min(8, Math.round(rows)));

  return (
    <div
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] px-3 py-3', className)}
      {...props}
      data-hz-ui="loading-state"
      aria-busy="true"
    >
      <div className="mb-3 min-w-0">
        <div className="text-[13px] font-semibold text-[#dbe4f0]">{title}</div>
        {description ? <div className="mt-1 text-[12px] leading-5 text-[#727b8c]">{description}</div> : null}
      </div>
      <div className="grid gap-2">
        {Array.from({ length: rowCount }, (_, index) => (
          <div
            key={index}
            className="grid h-7 min-w-0 animate-pulse grid-cols-[96px_minmax(0,1fr)_72px] items-center gap-3 border-b border-[var(--hz-ui-line-faint)] last:border-b-0"
            data-hz-loading-row={index + 1}
          >
            <span className="h-2 bg-[var(--hz-ui-surface-soft)]" />
            <span className="h-2 bg-[var(--hz-ui-surface-soft)]" />
            <span className="h-2 bg-[var(--hz-ui-surface-soft)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export type HzMonitorFavoriteModeOption = {
  value: string;
  label: string;
};

export function HzMonitorFavoriteSurface({
  value,
  options,
  onValueChange,
  children,
  message,
  error,
  empty,
  className,
  selectorClassName,
  selectorLabel = 'Favorite scope',
  selectorProps,
  ...props
}: {
  value: string;
  options: HzMonitorFavoriteModeOption[];
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
  message?: React.ReactNode;
  error?: React.ReactNode;
  empty?: React.ReactNode;
  className?: string;
  selectorClassName?: string;
  selectorLabel?: string;
  selectorProps?: React.HTMLAttributes<HTMLDivElement>;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>) {
  return (
    <section
      {...props}
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-transparent', className)}
      data-hz-ui="monitor-favorite-surface"
      data-hz-monitor-favorite-mode={value}
    >
      <div
        {...selectorProps}
        className={cn(
          'grid min-h-10 grid-cols-[minmax(0,200px)_minmax(0,1fr)] items-center gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2',
          selectorProps?.className
        )}
        data-hz-monitor-favorite-selector="select-menu"
      >
        <HzSelectMenu
          value={value}
          options={options}
          label={selectorLabel}
          onChange={onValueChange}
          className={cn('min-w-0', selectorClassName)}
        />
        <span className="min-w-0 truncate text-[11px] text-[#727b8c]" data-hz-monitor-favorite-mode-label={value}>
          {options.find(option => option.value === value)?.label || value}
        </span>
      </div>
      <div className="min-w-0" data-hz-monitor-favorite-content="true">
        {children || empty}
      </div>
      {message ? (
        <div
          role="status"
          className="border-t border-[var(--hz-ui-line-soft)] px-3 py-2 text-[12px] text-[#b9c6d8]"
          data-hz-monitor-favorite-message="true"
        >
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="border-t border-[var(--hz-ui-line-soft)] px-3 py-2 text-[12px] text-rose-300" data-hz-monitor-favorite-error="true">
          {error}
        </div>
      ) : null}
    </section>
  );
}

export function HzMonitorFavoritePane({
  kind,
  children,
  className,
  ...props
}: {
  kind: 'realtime' | 'history' | string;
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('grid min-w-0 divide-y divide-[var(--hz-ui-line-soft)]', className)}
      data-hz-ui="monitor-favorite-pane"
      data-hz-monitor-favorite-pane-kind={kind}
      data-monitor-detail-favorite-pane-owner="hertzbeat-ui-favorite-pane"
    >
      {children}
    </div>
  );
}

export function HzMonitorDetailStage({
  title,
  description,
  children,
  className,
  header = 'visible',
  rhythm = 'default',
  ...props
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  header?: 'visible' | 'hidden';
  rhythm?: 'default' | 'tight' | 'stack';
} & Omit<React.HTMLAttributes<HTMLElement>, 'title'>) {
  return (
    <section
      {...props}
      className={cn(
        rhythm === 'tight'
          ? 'grid min-w-0 gap-2 pt-0'
          : rhythm === 'stack'
            ? 'grid min-w-0 gap-3'
            : 'grid min-w-0 gap-3 border-t border-[var(--hz-ui-line-soft)] pt-3',
        className
      )}
      data-hz-ui="monitor-detail-stage"
      data-monitor-detail-stage-owner="hertzbeat-ui-detail-stage"
      data-monitor-detail-flat-stage="true"
      data-monitor-detail-stage-header={header === 'hidden' ? 'hidden' : undefined}
      data-monitor-detail-stage-rhythm={
        rhythm === 'tight' ? 'shared-tight' : rhythm === 'stack' ? 'shared-stack' : undefined
      }
    >
      {header === 'visible' ? (
        <div className="min-w-0" data-hz-monitor-detail-stage-header="true">
          <h3 className="truncate text-[13px] font-semibold tracking-[0.02em] text-[#f3f6fb]">{title}</h3>
          {description ? <p className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function HzMonitorBasicCard({
  heading,
  editHref,
  editLabel = 'Edit monitor',
  children,
  className,
  surfaceClassName,
  editLinkProps,
  actions,
  ...props
}: {
  heading: React.ReactNode;
  editHref?: string;
  editLabel?: string;
  children: React.ReactNode;
  className?: string;
  surfaceClassName?: string;
  editLinkProps?: React.AnchorHTMLAttributes<HTMLAnchorElement>;
  actions?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>) {
  const editAction = editHref ? (
    <a
      href={editHref}
      aria-label={editLabel}
      {...editLinkProps}
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center border-0 bg-transparent text-[#727b8c] transition-colors hover:text-[#f3f6fb]',
        editLinkProps?.className
      )}
      data-monitor-basic-edit-action="hertzbeat-ui-icon-action"
      data-monitor-basic-edit-action-density="compact-icon"
    >
      <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
    </a>
  ) : null;

  return (
    <div {...props} className={cn('min-w-0', className)} data-hz-ui="monitor-basic-card">
      <HzWorkbenchSurface
        heading={heading}
        actions={
          <>
            {actions}
            {editAction}
          </>
        }
        selected={false}
        className={cn(
          'grid min-h-[400px] min-w-0 content-start gap-3 rounded-[3px] border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface-graphite)] p-3',
          surfaceClassName
        )}
        data-monitor-basic-stage-surface="hertzbeat-ui-basic-card"
        data-monitor-basic-grid-item="shared-first-card"
        data-monitor-basic-card-chrome="hertzbeat-ui-basic-card"
        data-monitor-basic-card-tone="neutral-graphite"
      >
        {children}
      </HzWorkbenchSurface>
    </div>
  );
}

export type HzMonitorBasicSummaryFact = {
  label: React.ReactNode;
  value: React.ReactNode;
};

export type HzMonitorBasicSummaryToken = {
  label: React.ReactNode;
  value: React.ReactNode;
};

export function HzMonitorBasicSummary({
  name,
  statusLabel,
  statusTone = 'neutral',
  facts,
  metaRows,
  labels = [],
  annotations = [],
  labelHeading = 'Labels',
  annotationHeading = 'Annotations',
  className,
  ...props
}: {
  name: React.ReactNode;
  statusLabel: React.ReactNode;
  statusTone?: HzStatusTone;
  facts: HzMonitorBasicSummaryFact[];
  metaRows: HzMonitorBasicSummaryFact[];
  labels?: HzMonitorBasicSummaryToken[];
  annotations?: HzMonitorBasicSummaryToken[];
  labelHeading?: React.ReactNode;
  annotationHeading?: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const tokenRow = (tokens: HzMonitorBasicSummaryToken[], heading: React.ReactNode, kind: 'label' | 'annotation') =>
    tokens.length > 0 ? (
      <div
        className="grid min-w-0 gap-2 border-b border-[var(--hz-ui-line-soft)] py-2.5 last:border-b-0 sm:grid-cols-[148px_minmax(0,1fr)] sm:items-start"
        data-monitor-basic-token-row={kind}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">{heading}</span>
        <div className="flex min-w-0 flex-wrap gap-1.5 sm:justify-end">
          {tokens.map((token, index) => (
            <span
              key={`${stringifyNode(token.label, kind)}-${stringifyNode(token.value, String(index))}`}
              className="inline-flex max-w-full items-center border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface-soft)] px-2 py-1 font-mono text-[11px] text-[#cbd5e1]"
              data-monitor-basic-token-kind={kind}
            >
              <span className="min-w-0 truncate">
                {token.label}: {token.value}
              </span>
            </span>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div
      {...props}
      className={cn('grid min-w-0 gap-3', className)}
      data-hz-ui="monitor-basic-summary"
      data-monitor-basic-summary-owner="hertzbeat-ui-basic-summary"
      data-monitor-basic-density="shared-basic-summary"
    >
      <div className="grid min-w-0 gap-3 px-2 sm:px-3" data-monitor-basic-content-inset="hertzbeat-ui-basic-summary">
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1 truncate text-[16px] font-semibold leading-6 text-[#f3f6fb]">{name}</div>
          <HzStatusBadge tone={statusTone}>{statusLabel}</HzStatusBadge>
        </div>

        <div
          className="grid min-w-0 border-y border-[var(--hz-ui-line-soft)] text-[12px] sm:grid-cols-2 xl:grid-cols-4"
          data-monitor-basic-facts-density="hertzbeat-ui-fact-grid"
        >
          {facts.map((fact, index) => (
            <div
              key={`${stringifyNode(fact.label, 'fact')}-${index}`}
              className="min-w-0 border-b border-r border-[var(--hz-ui-line-soft)] px-2 py-2 last:border-r-0 sm:[&:nth-last-child(-n+2)]:border-b-0 xl:border-b-0"
              data-monitor-basic-fact="true"
            >
              <div className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">{fact.label}</div>
              <div className="mt-1 truncate text-[12px] font-semibold text-[#dbe4f0]">{fact.value}</div>
            </div>
          ))}
        </div>

        <div className="grid min-w-0 border-t border-[var(--hz-ui-line-soft)]" data-monitor-basic-meta-density="hertzbeat-ui-rows">
          {metaRows.map((row, index) => (
            <div
              key={`${stringifyNode(row.label, 'meta')}-${index}`}
              className="grid min-w-0 gap-2 border-b border-[var(--hz-ui-line-soft)] py-2.5 sm:grid-cols-[148px_minmax(0,1fr)] sm:items-start"
              data-monitor-basic-row="meta"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">{row.label}</span>
              <strong className="min-w-0 truncate text-sm font-medium leading-6 text-[#f3f6fb] sm:text-right">{row.value}</strong>
            </div>
          ))}
          {tokenRow(labels, labelHeading, 'label')}
        </div>
      </div>

      {annotations.length > 0 ? (
        <div className="grid min-w-0 px-2 sm:px-3" data-monitor-basic-annotations="shared">
          <div className="grid min-w-0 border-y border-[var(--hz-ui-line-soft)]">
            {tokenRow(annotations, annotationHeading, 'annotation')}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type HzMonitorMetricColumn = {
  key: string;
  title: React.ReactNode;
};

export type HzMonitorMetricRow = {
  key: string;
  label: React.ReactNode;
  values: React.ReactNode[];
};

export function HzMonitorDetailSignalList({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-hz-ui="monitor-detail-signal-list"
      data-monitor-detail-signal-list="true"
      data-monitor-detail-signal-grid="monitor-data-table"
      data-monitor-detail-signal-list-owner="hertzbeat-ui-signal-list"
      data-monitor-detail-signal-list-rhythm="shared-tight"
      data-monitor-detail-signal-list-geometry="shared-two-column-metric-cards"
      {...props}
      className={cn('grid min-w-0 gap-2 pt-0.5', className)}
    >
      {children}
    </div>
  );
}

export function HzMonitorMetricCardGrid({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'grid auto-rows-fr grid-cols-1 items-stretch gap-2 lg:grid-cols-2',
        className
      )}
      data-hz-ui="monitor-metric-card-grid"
      data-monitor-detail-realtime-card-flow="shared-metric-card-grid"
      data-monitor-detail-realtime-card-grid="basic-and-metrics"
      data-monitor-detail-realtime-reference="hertzbeat-ui-monitor-card-grid"
      data-monitor-detail-realtime-card-height="content-driven"
      data-monitor-detail-realtime-card-chrome="hertzbeat-ui-card-grid"
    >
      {children}
    </div>
  );
}

export type HzMonitorIncrementalLoadFooterProps = React.HTMLAttributes<HTMLDivElement> & {
  visibleCount: number;
  totalCount: number;
  hasMore?: boolean;
  loadMoreLabel: React.ReactNode;
  completeLabel?: React.ReactNode;
  onLoadMore?: () => void;
  buttonProps?: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children' | 'type'>;
};

export function HzMonitorIncrementalLoadFooter({
  visibleCount,
  totalCount,
  hasMore = false,
  loadMoreLabel,
  completeLabel,
  onLoadMore,
  buttonProps,
  className,
  ...props
}: HzMonitorIncrementalLoadFooterProps) {
  const boundedVisibleCount = Math.min(Math.max(visibleCount, 0), Math.max(totalCount, 0));
  return (
    <div
      {...props}
      className={cn(
        'grid min-w-0 justify-items-center gap-2 border-t border-[var(--hz-ui-line-soft)] px-3 py-3 text-center text-xs text-[#8f99ab]',
        className
      )}
      data-hz-ui="monitor-incremental-load-footer"
      data-hz-monitor-incremental-owner="hertzbeat-ui-incremental-load-footer"
      data-hz-monitor-incremental-visible={boundedVisibleCount}
      data-hz-monitor-incremental-total={totalCount}
      data-hz-monitor-incremental-has-more={hasMore ? 'true' : 'false'}
    >
      <div className="h-px w-full" data-hz-monitor-incremental-sentinel="true" aria-hidden="true" />
      <div data-hz-monitor-incremental-summary="true">
        {boundedVisibleCount} / {totalCount}
      </div>
      {hasMore ? (
        <HzButton
          type="button"
          intent="ghost"
          size="sm"
          onClick={onLoadMore}
          {...buttonProps}
          data-hz-monitor-incremental-action="load-more"
        >
          {loadMoreLabel}
        </HzButton>
      ) : completeLabel ? (
        <div data-hz-monitor-incremental-complete="true">{completeLabel}</div>
      ) : null}
    </div>
  );
}

export function HzMonitorMetricCard({
  title,
  columns,
  rows,
  selected = false,
  loading = false,
  error,
  loadingLabel = 'Loading',
  emptyLabel = 'No metric fields',
  actions,
  onSelect,
  className,
  surfaceClassName,
  titleButtonProps,
  tableButtonProps,
  labelHeader = 'Labels',
  ...props
}: {
  title: React.ReactNode;
  columns: HzMonitorMetricColumn[];
  rows: HzMonitorMetricRow[];
  selected?: boolean;
  loading?: boolean;
  error?: React.ReactNode;
  loadingLabel?: React.ReactNode;
  emptyLabel?: React.ReactNode;
  actions?: React.ReactNode;
  onSelect?: () => void;
  className?: string;
  surfaceClassName?: string;
  titleButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  tableButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  labelHeader?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'onSelect'>) {
  const hasTable = columns.length > 0 && rows.length > 0;
  const gridTemplateColumns = `minmax(96px, 0.8fr) repeat(${Math.max(columns.length, 1)}, minmax(64px, 1fr))`;

  return (
    <div {...props} className={cn('min-w-0', className)} data-hz-ui="monitor-metric-card">
      <HzWorkbenchSurface
        heading={
          <button
            type="button"
            {...titleButtonProps}
            className={cn(
              'min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hz-ui-active-soft)]',
              titleButtonProps?.className
            )}
            data-monitor-detail-signal-row-title="true"
            onClick={event => {
              titleButtonProps?.onClick?.(event);
              onSelect?.();
            }}
          >
            <div className="truncate text-[16px] font-semibold leading-6 text-[#f3f6fb]">{title}</div>
          </button>
        }
        selected={selected}
        actions={
          loading ? (
            <span className="flex-none text-[11px] text-[#727b8c]">{loadingLabel}</span>
          ) : (
            actions
          )
        }
        className={cn(
          'grid min-h-[400px] min-w-0 content-start gap-3 rounded-[3px] border p-3 bg-[var(--hz-ui-surface-graphite)] transition-colors',
          selected
            ? 'border-[var(--hz-ui-line)] shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]'
            : 'border-[var(--hz-ui-line-soft)] hover:border-[var(--hz-ui-line-strong)]',
          surfaceClassName
        )}
        data-monitor-detail-metric-card-tone="neutral-graphite"
      >
        <button
          type="button"
          {...tableButtonProps}
          className={cn(
            'grid w-full gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hz-ui-active-soft)]',
            tableButtonProps?.className
          )}
          data-monitor-detail-signal-card-table="true"
          data-monitor-detail-signal-card-body-density="shared-metric-table"
          onClick={event => {
            tableButtonProps?.onClick?.(event);
            onSelect?.();
          }}
        >
          {error ? (
            <span className="border-y border-rose-400/20 bg-rose-400/10 px-3 py-3 text-sm text-rose-200">{error}</span>
          ) : hasTable ? (
            <span className="grid overflow-hidden border-y border-[var(--hz-ui-line-soft)]" data-hz-monitor-metric-table-row="metric-fields">
              <span
                className="grid gap-2 border-b border-[var(--hz-ui-line-faint)] bg-[var(--hz-ui-surface-soft)] px-3 py-2 text-[11px] font-semibold text-[#8f99ab]"
                style={{ gridTemplateColumns }}
              >
                <span>{labelHeader}</span>
                {columns.map(column => (
                  <span key={column.key} className="truncate">
                    {column.title}
                  </span>
                ))}
              </span>
              {rows.map(row => (
                <span
                  key={row.key}
                  className="grid gap-2 border-b border-[var(--hz-ui-line-faint)] px-3 py-2 text-[12px] last:border-b-0"
                  style={{ gridTemplateColumns }}
                >
                  <span className="truncate text-[#a9b0bb]">{row.label}</span>
                  {columns.map((column, index) => (
                    <span key={column.key} className="truncate font-semibold text-[#f3f6fb]">
                      {row.values[index] ?? '-'}
                    </span>
                  ))}
                </span>
              ))}
            </span>
          ) : (
            <span className="border-y border-[var(--hz-ui-line-soft)] px-3 py-4 text-sm text-[#8f99ab]">
              {loading ? loadingLabel : emptyLabel}
            </span>
          )}
        </button>
      </HzWorkbenchSurface>
      <span className="sr-only" data-hz-monitor-metric-card-selected={selected ? 'true' : 'false'} />
    </div>
  );
}

export type HzMutationStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'failed';

export type HzValidationIssue = {
  id: string;
  field?: React.ReactNode;
  message: React.ReactNode;
  tone?: HzStatusTone;
};

const mutationStatusTone: Record<HzMutationStatus, HzStatusTone> = {
  clean: 'neutral',
  dirty: 'warning',
  saving: 'info',
  saved: 'success',
  failed: 'critical'
};

const mutationStatusLabel: Record<HzMutationStatus, string> = {
  clean: 'Clean',
  dirty: 'Unsaved',
  saving: 'Saving',
  saved: 'Saved',
  failed: 'Failed'
};

export function HzInlineFeedback({
  tone = 'info',
  title,
  description,
  meta,
  variant = 'default',
  className,
  ...props
}: {
  tone?: HzStatusTone;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  variant?: 'default' | 'embedded';
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>) {
  const toneColor = chartToneColor[tone];
  return (
    <div
      className={cn(
        'grid min-w-0 grid-cols-[3px_minmax(0,1fr)_auto] items-stretch bg-[var(--hz-ui-surface-soft)]',
        variant === 'embedded' ? 'border-0' : 'border-y border-[var(--hz-ui-line-soft)]',
        className
      )}
      {...props}
      data-hz-ui="inline-feedback"
      data-hz-feedback-tone={tone}
      data-hz-feedback-variant={variant}
      role={tone === 'critical' || tone === 'warning' ? 'alert' : 'status'}
    >
      <span aria-hidden="true" style={{ backgroundColor: toneColor.stroke }} />
      <div className="min-w-0 px-3 py-2">
        <div className="truncate text-[12px] font-semibold text-[#f3f6fb]">{title}</div>
        {description ? <div className="mt-0.5 text-[11px] leading-5 text-[#8f99ab]">{description}</div> : null}
      </div>
      {meta ? <div className="flex shrink-0 items-center px-3 font-mono text-[10px] text-[#727b8c]">{meta}</div> : null}
    </div>
  );
}

export function HzMutationBar({
  title,
  status = 'clean',
  statusLabel,
  summaryVisible = true,
  actionAlign = 'end',
  dirtyFields = [],
  validationIssues = [],
  feedback,
  saveLabel = 'Save',
  discardLabel = 'Discard',
  onSave,
  onDiscard,
  actions,
  className
}: {
  title: React.ReactNode;
  status?: HzMutationStatus;
  statusLabel?: React.ReactNode;
  dirtyFields?: React.ReactNode[];
  validationIssues?: HzValidationIssue[];
  feedback?: React.ReactNode;
  saveLabel?: React.ReactNode;
  discardLabel?: React.ReactNode;
  onSave?: () => void;
  onDiscard?: () => void;
  actions?: React.ReactNode;
  summaryVisible?: boolean;
  actionAlign?: 'end' | 'center';
  className?: string;
}) {
  const tone = mutationStatusTone[status];
  const toneColor = chartToneColor[tone];
  const titleLabel = stringifyNode(title, 'changes');
  const hasIssues = validationIssues.length > 0;
  const hasBlockingIssues = validationIssues.some(issue => issue.tone === 'critical');
  const showSummary = summaryVisible !== false;

  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="mutation-bar"
      data-hz-mutation-status={status}
      data-hz-mutation-issue-count={validationIssues.length}
      data-hz-mutation-summary={showSummary ? 'visible' : 'hidden'}
      data-hz-mutation-action-align={actionAlign}
    >
      <header
        className={cn(
          'grid min-h-11 items-center gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2',
          showSummary ? 'grid-cols-[minmax(0,1fr)_auto]' : 'grid-cols-1 justify-items-center'
        )}
      >
        {showSummary ? (
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</span>
              <span
                className="border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]"
                style={{
                  borderColor: toneColor.soft,
                  color: toneColor.stroke,
                  backgroundColor: toneColor.soft
                }}
                data-hz-mutation-status-label={status}
              >
                {statusLabel || mutationStatusLabel[status]}
              </span>
              {dirtyFields.length ? <span className="font-mono text-[10px] text-[#727b8c]">{dirtyFields.length} dirty</span> : null}
            </div>
            {dirtyFields.length ? (
              <div className="mt-1 flex min-w-0 flex-wrap gap-1.5">
                {dirtyFields.map((field, index) => (
                  <span
                    key={`${stringifyNode(field, 'field')}-${index}`}
                    className="border border-[var(--hz-ui-line-faint)] px-1.5 py-0.5 font-mono text-[10px] text-[#8f99ab]"
                    data-hz-dirty-field={stringifyNode(field, `field-${index}`)}
                  >
                    {field}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className={cn('flex flex-wrap items-center gap-2', showSummary ? 'shrink-0' : 'min-w-0', actionAlign === 'center' ? 'justify-center' : 'justify-end')}>
          {actions}
          {onDiscard ? (
            <HzButton size="sm" intent="ghost" onClick={onDiscard} aria-label={`Discard ${titleLabel}`}>
              {discardLabel}
            </HzButton>
          ) : null}
          {onSave ? (
            <HzButton size="sm" intent="primary" onClick={onSave} aria-label={`Save ${titleLabel}`} disabled={status === 'saving' || hasBlockingIssues}>
              {saveLabel}
            </HzButton>
          ) : null}
        </div>
      </header>
      {hasIssues ? (
        <div className="divide-y divide-[var(--hz-ui-line-faint)] border-b border-[var(--hz-ui-line-soft)]">
          {validationIssues.map(issue => {
            const issueTone = issue.tone || 'warning';
            return (
              <div
                key={issue.id}
                className="grid min-h-8 grid-cols-[auto_minmax(0,1fr)] items-start gap-2 px-3 py-2 text-[11px]"
                data-hz-validation-issue={issue.id}
                data-hz-validation-tone={issueTone}
              >
                <span className="mt-1.5 h-1.5 w-1.5" style={{ backgroundColor: chartToneColor[issueTone].stroke }} aria-hidden="true" />
                <span className="min-w-0">
                  {issue.field ? <span className="mr-2 font-mono text-[#727b8c]">{issue.field}</span> : null}
                  <span className="text-[#dbe4f0]">{issue.message}</span>
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
      {feedback ? <div className="border-b border-[var(--hz-ui-line-soft)] last:border-b-0">{feedback}</div> : null}
    </section>
  );
}

export type HzMonitorEditorActionBarAction = {
  id: string;
  label: React.ReactNode;
  help?: {
    label: string;
    body: React.ReactNode;
    impact?: React.ReactNode;
  };
  type?: HzButtonProps['type'];
  intent?: HzButtonIntent;
  size?: HzButtonSize;
  disabled?: boolean;
  onSelect?: HzButtonProps['onClick'];
  buttonProps?: Omit<HzButtonProps, 'children' | 'type' | 'intent' | 'size' | 'disabled' | 'onClick'> & HzDataAttributeProps;
};

export type HzMonitorEditorActionBarProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> & {
  title: React.ReactNode;
  status?: HzMutationStatus;
  statusLabel?: React.ReactNode;
  feedback?: React.ReactNode;
  actions: HzMonitorEditorActionBarAction[];
  summaryVisible?: boolean;
  actionAlign?: 'end' | 'center';
};

export function HzMonitorEditorActionBar({
  title,
  status = 'clean',
  statusLabel,
  feedback,
  actions,
  summaryVisible = false,
  actionAlign = 'center',
  className,
  ...props
}: HzMonitorEditorActionBarProps) {
  return (
    <div
      className={cn('min-w-0', className)}
      {...props}
      data-hz-ui="monitor-editor-action-bar"
      data-monitor-editor-action-bar-owner="hertzbeat-ui-monitor-editor-action-bar"
      data-monitor-editor-action-bar-layout={actionAlign === 'center' ? 'centered-footer' : 'end-footer'}
    >
      <HzMutationBar
        title={title}
        status={status}
        statusLabel={statusLabel}
        summaryVisible={summaryVisible}
        actionAlign={actionAlign}
        feedback={feedback}
        actions={
          <>
            {actions.map(action => (
              <span key={action.id} className="inline-flex items-center gap-1.5">
                <HzButton
                  {...action.buttonProps}
                  type={action.type || 'button'}
                  size={action.size || 'sm'}
                  intent={action.intent || 'ghost'}
                  disabled={action.disabled}
                  onClick={action.onSelect}
                  data-monitor-editor-action={action.id}
                  data-monitor-editor-action-owner="hertzbeat-ui-button"
                >
                  {action.label}
                </HzButton>
                {action.help ? (
                  <span
                    data-monitor-editor-action-help-placement="inline-action"
                    className="group/help relative inline-flex h-5 w-5 shrink-0 items-center justify-center"
                  >
                    <button
                      type="button"
                      aria-label={action.help.label}
                      data-monitor-editor-action-help-trigger="hertzbeat-ui-action-help"
                      data-monitor-editor-action-help-style="icon-after-action"
                      data-monitor-editor-action-help-visual="circle-help-icon"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-none border-0 bg-transparent p-0 text-[#8da2ff] transition hover:text-[#d8e4ff] focus:text-[#d8e4ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
                      title={action.help.label}
                      onClick={event => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                    >
                      <CircleHelp size={13} strokeWidth={2} aria-hidden="true" data-monitor-editor-action-help-icon="lucide-circle-help" />
                    </button>
                    <span
                      role="tooltip"
                      data-monitor-editor-action-help="hertzbeat-ui-action-tooltip"
                      className="pointer-events-none absolute bottom-6 left-0 z-20 hidden w-[280px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover/help:block group-focus-within/help:block"
                    >
                      <span className="block text-[11px] leading-4 text-[#dbe4f0]">{action.help.body}</span>
                      {action.help.impact ? <span className="mt-2 block border-t border-[#2b3039] pt-2 text-[11px] leading-4 text-[#98a2b3]">{action.help.impact}</span> : null}
                    </span>
                  </span>
                ) : null}
              </span>
            ))}
          </>
        }
      />
    </div>
  );
}

export type HzBatchToolbarAction = {
  id: string;
  label: React.ReactNode;
  busy?: boolean;
  busyLabel?: React.ReactNode;
  help?: {
    label: string;
    body: React.ReactNode;
    impact?: React.ReactNode;
    rootProps?: React.HTMLAttributes<HTMLSpanElement> & HzDataAttributeProps;
    triggerProps?: React.ButtonHTMLAttributes<HTMLButtonElement> & HzDataAttributeProps;
    tooltipProps?: React.HTMLAttributes<HTMLSpanElement> & HzDataAttributeProps;
  };
  tone?: HzStatusTone;
  disabled?: boolean;
  onSelect?: () => void;
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement> | (React.ButtonHTMLAttributes<HTMLButtonElement> & HzDataAttributeProps);
  presentation?: 'inline' | 'menu';
};

export function HzBatchToolbar({
  selectionCount,
  selectionLabel = 'selected',
  actions,
  variant = 'default',
  overflowLabel = 'More actions',
  overflowButtonProps,
  overflowPanelProps,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  selectionCount: number;
  selectionLabel?: React.ReactNode;
  actions: HzBatchToolbarAction[];
  variant?: 'default' | 'embedded';
  overflowLabel?: string;
  overflowButtonProps?: Omit<HzIconButtonProps, 'label' | 'children' | 'onClick'> & HzDataAttributeProps;
  overflowPanelProps?: React.HTMLAttributes<HTMLDivElement> & HzDataAttributeProps;
}) {
  const [overflowOpen, setOverflowOpen] = React.useState(false);
  const inlineActions = actions.filter(action => action.presentation !== 'menu');
  const menuActions = actions.filter(action => action.presentation === 'menu');
  const renderActionHelp = (action: HzBatchToolbarAction) =>
    action.help ? (
      <span
        {...action.help.rootProps}
        data-hz-batch-action-help={action.id}
        data-hz-batch-action-help-owner="hertzbeat-ui-batch-toolbar"
        className={cn('group/help relative inline-flex h-4 w-4 shrink-0 items-center justify-center', action.help.rootProps?.className)}
      >
        <button
          {...action.help.triggerProps}
          type="button"
          aria-label={action.help.label}
          data-hz-batch-action-help-trigger="hertzbeat-ui-action-help"
          data-hz-batch-action-help-style="icon-after-action"
          data-hz-batch-action-help-visual="circle-help-icon"
          className={cn('inline-flex h-4 w-4 items-center justify-center rounded-none border-0 bg-transparent p-0 text-[#d8e4ff] transition hover:text-[#f5f7fb] focus:text-[#f5f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]', action.help.triggerProps?.className)}
          onClick={event => {
            event.preventDefault();
            event.stopPropagation();
            action.help?.triggerProps?.onClick?.(event);
          }}
        >
          <CircleHelp size={12} strokeWidth={2} aria-hidden="true" data-hz-batch-action-help-icon="lucide-circle-help" />
        </button>
        <span
          {...action.help.tooltipProps}
          role="tooltip"
          data-hz-batch-action-help-tooltip="hertzbeat-ui-action-tooltip"
          className={cn('pointer-events-none absolute right-0 top-5 z-30 hidden w-[280px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover/help:block group-focus-within/help:block', action.help.tooltipProps?.className)}
        >
          <span className="block text-[11px] leading-4 text-[#dbe4f0]">{action.help.body}</span>
          {action.help.impact ? <span className="mt-2 block border-t border-[#2b3039] pt-2 text-[11px] leading-4 text-[#98a2b3]">{action.help.impact}</span> : null}
        </span>
      </span>
    ) : null;
  const renderActionButton = (action: HzBatchToolbarAction, menu = false) => {
    const button = (
      <HzButton
        {...action.buttonProps}
        size="sm"
        intent={action.tone === 'critical' ? 'danger' : 'ghost'}
        aria-busy={action.busy ? 'true' : action.buttonProps?.['aria-busy']}
        disabled={action.disabled || action.busy}
        onClick={() => {
          action.onSelect?.();
          if (menu) {
            setOverflowOpen(false);
          }
        }}
        data-hz-batch-action={action.id}
        data-hz-batch-action-owner="hertzbeat-ui-button"
        data-hz-batch-action-busy={action.busy ? 'true' : undefined}
        data-hz-batch-action-presentation={menu ? 'menu' : 'inline'}
        className={cn(menu ? 'w-full justify-start' : undefined, action.buttonProps?.className)}
      >
        <span className="truncate">{action.busy ? action.busyLabel || action.label : action.label}</span>
      </HzButton>
    );

    return action.help ? (
      <span key={action.id} className={cn('inline-flex min-w-0 items-center gap-1.5', menu ? 'w-full' : undefined)}>
        {button}
        {renderActionHelp(action)}
      </span>
    ) : (
      React.cloneElement(button, { key: action.id })
    );
  };

  return (
    <div
      {...props}
      className={cn(
        'grid min-h-10 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-transparent px-3 py-2',
        variant === 'embedded' ? 'border-0' : 'border-y border-[var(--hz-ui-line-soft)]',
        className
      )}
      data-hz-ui="batch-toolbar"
      data-hz-batch-toolbar-surface="transparent-lined"
      data-hz-batch-toolbar-variant={variant}
      data-hz-batch-selection-count={selectionCount}
      data-hz-batch-overflow-mode={menuActions.length > 0 ? 'angular-ellipsis-menu' : 'inline'}
      data-hz-batch-overflow-count={menuActions.length > 0 ? String(menuActions.length) : undefined}
    >
      <div className="min-w-0 truncate text-[12px] font-semibold text-[#dbe4f0]">
        <span className="font-mono text-[#f3f6fb]">{selectionCount}</span> {selectionLabel}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {inlineActions.map(action => renderActionButton(action))}
        {menuActions.length > 0 ? (
          <div
            className="relative"
            data-hz-batch-overflow="angular-ellipsis-menu"
            data-hz-batch-overflow-owner="hertzbeat-ui-batch-toolbar"
          >
            <HzIconButton
              {...overflowButtonProps}
              label={overflowLabel}
              intent="ghost"
              aria-haspopup="menu"
              aria-expanded={overflowOpen}
              onClick={() => setOverflowOpen(open => !open)}
              data-hz-batch-overflow-trigger="angular-ellipsis-menu"
              data-hz-batch-overflow-trigger-owner="hertzbeat-ui-icon-button"
            >
              <MoreHorizontal size={14} />
            </HzIconButton>
            <div
              {...overflowPanelProps}
              role="menu"
              hidden={!overflowOpen}
              className={cn(
                'absolute right-0 top-full z-40 mt-1 min-w-[190px] gap-1 rounded-[4px] border border-[var(--hz-ui-line-strong)] bg-[#101722] p-1 shadow-[0_18px_48px_rgba(0,0,0,0.45)]',
                overflowOpen ? 'grid' : 'hidden',
                overflowPanelProps?.className
              )}
              data-hz-batch-overflow-panel="angular-nz-dropdown-menu"
              data-hz-batch-overflow-panel-open={overflowOpen ? 'true' : 'false'}
              data-hz-batch-overflow-clearance="floating-overlay-no-table-crop"
              data-hz-batch-overflow-panel-owner="hertzbeat-ui-batch-toolbar"
            >
              {menuActions.map(action => renderActionButton(action, true))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type HzDataAttributeProps = {
  [key: `data-${string}`]: string | number | boolean | undefined;
};

export function HzPaginationBar({
  summary,
  pageSizeLabel,
  pageSizeValue,
  pageSizeOptions,
  onPageSizeChange,
  pageJumpLabel,
  pageJumpValue,
  pageJumpMax,
  onPageJumpChange,
  previousLabel,
  nextLabel,
  previousDisabled,
  nextDisabled,
  onPrevious,
  onNext,
  className,
  pageSizeSelectProps,
  pageJumpInputProps,
  previousButtonProps,
  nextButtonProps,
  ...props
}: {
  summary: React.ReactNode;
  pageSizeLabel: React.ReactNode;
  pageSizeValue: string;
  pageSizeOptions: HzSelectOption[];
  onPageSizeChange?: (value: string) => void;
  pageJumpLabel?: React.ReactNode;
  pageJumpValue?: string;
  pageJumpMax?: number;
  onPageJumpChange?: (value: string) => void;
  previousLabel: React.ReactNode;
  nextLabel: React.ReactNode;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  pageSizeSelectProps?: Omit<HzSelectProps, 'value' | 'options' | 'onChange'>;
  pageJumpInputProps?: Omit<HzInputProps, 'aria-label' | 'onChange' | 'value'> & HzDataAttributeProps;
  previousButtonProps?: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'disabled'> & HzDataAttributeProps;
  nextButtonProps?: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'disabled'> & HzDataAttributeProps;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>) {
  return (
    <div
      {...props}
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hz-ui-line-soft)] px-3 py-2.5',
        className
      )}
      data-hz-ui="pagination-bar"
    >
      <div className="min-w-0 truncate text-xs text-[#8f99ab]" data-hz-pagination-summary="true">
        {summary}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[#8f99ab]">{pageSizeLabel}</span>
        <div className="min-w-0 w-24" data-hz-pagination-page-size="select-menu">
          <HzSelect
            {...pageSizeSelectProps}
            aria-label={pageSizeSelectProps?.['aria-label'] || (typeof pageSizeLabel === 'string' ? pageSizeLabel : undefined)}
            className={cn('w-full', pageSizeSelectProps?.className)}
            value={pageSizeValue}
            options={pageSizeOptions}
            onChange={event => onPageSizeChange?.(event.target.value)}
          />
        </div>
        {pageJumpLabel && pageJumpValue !== undefined ? (
          <label className="flex items-center gap-1.5 text-xs text-[#8f99ab]" data-hz-pagination-page-jump="number-input">
            <span>{pageJumpLabel}</span>
            <HzInput
              {...pageJumpInputProps}
              aria-label={typeof pageJumpLabel === 'string' ? pageJumpLabel : undefined}
              className={cn('w-16 text-center', pageJumpInputProps?.className)}
              inputMode="numeric"
              min={1}
              max={pageJumpMax}
              type="number"
              value={pageJumpValue}
              onChange={event => onPageJumpChange?.(event.target.value)}
              data-hz-pagination-action="page-jump"
            />
          </label>
        ) : null}
        <HzButton
          {...previousButtonProps}
          size="sm"
          disabled={previousDisabled}
          onClick={onPrevious}
          data-hz-pagination-action="previous"
        >
          {previousLabel}
        </HzButton>
        <HzButton
          {...nextButtonProps}
          size="sm"
          disabled={nextDisabled}
          onClick={onNext}
          data-hz-pagination-action="next"
        >
          {nextLabel}
        </HzButton>
      </div>
    </div>
  );
}

export function HzConfirmDialog({
  open = false,
  title,
  kicker,
  children,
  bodyRhythm = 'none',
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  closable = false,
  tone = 'info',
  onCancel,
  onClose,
  onConfirm,
  confirmDisabled,
  className,
  footerClassName,
  cancelButtonProps,
  confirmButtonProps,
  ...props
}: {
  open?: boolean;
  title: React.ReactNode;
  kicker?: React.ReactNode;
  children?: React.ReactNode;
  bodyRhythm?: 'none' | 'stack';
  cancelLabel?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  closable?: boolean;
  tone?: HzStatusTone;
  onCancel?: () => void;
  onClose?: () => void;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  footerClassName?: string;
  cancelButtonProps?: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>
    | (Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & HzDataAttributeProps);
  confirmButtonProps?: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'disabled'>
    | (Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'disabled'> & HzDataAttributeProps);
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'title'>) {
  if (!open) return null;

  const titleLabel = stringifyNode(title, 'Confirm action');
  const danger = tone === 'critical';
  const handleCancel = onCancel ?? onClose;

  return (
    <div
      {...props}
      className={cn('fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4', className)}
      role="dialog"
      aria-modal="true"
      aria-label={titleLabel}
      data-hz-ui="confirm-dialog"
      data-hz-confirm-tone={tone}
      data-hz-confirm-closable={closable ? 'true' : 'false'}
      data-hz-confirm-ok-danger={danger ? 'true' : 'false'}
      data-hz-confirm-ok-type="primary"
    >
      <div
        className={cn(
          'w-full max-w-xl border bg-[var(--hz-ui-surface-raised)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]',
          danger ? 'border-[#5d3037]' : 'border-[var(--hz-ui-line-strong)]'
        )}
        data-hz-confirm-panel="true"
      >
        <div className={cn('border-b px-4 py-3', danger ? 'border-[#5d3037]' : 'border-[var(--hz-ui-line-soft)]')}>
          {kicker ? (
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#727b8c]">
              {kicker}
            </div>
          ) : null}
          <div className={cn('text-[14px] font-semibold leading-5', danger ? 'text-[#f0a7b2]' : 'text-[#f5f7fb]')}>
            {title}
          </div>
        </div>
        {children ? (
          <div
            className={cn(
              'px-4 py-3 text-[12px] leading-6 text-[#a9b0bb]',
              bodyRhythm === 'stack' ? 'space-y-3' : null
            )}
            data-hz-confirm-body="true"
            data-hz-confirm-body-rhythm={bodyRhythm}
          >
            {children}
          </div>
        ) : null}
        <div
          className={cn(
            'flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3',
            danger ? 'border-[#5d3037]' : 'border-[var(--hz-ui-line-soft)]',
            footerClassName
          )}
          data-hz-confirm-footer="true"
        >
          <HzButton
            {...cancelButtonProps}
            size="sm"
            intent="ghost"
            onClick={handleCancel}
            className={cn('min-h-8 min-w-16', cancelButtonProps?.className)}
            data-hz-confirm-action="cancel"
          >
            {cancelLabel}
          </HzButton>
          <HzButton
            {...confirmButtonProps}
            size="sm"
            intent={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={cn('min-h-8 min-w-16', confirmButtonProps?.className)}
            data-hz-confirm-action="confirm"
          >
            {confirmLabel}
          </HzButton>
        </div>
      </div>
    </div>
  );
}

export type HzExportTypeDialogType = 'JSON' | 'EXCEL';
export type HzExportTypeDialogScope = 'selected' | 'all';

export function HzExportTypeDialog({
  open = false,
  title,
  description,
  scope,
  selectedCount,
  jsonDescription,
  excelDescription,
  jsonBusy,
  excelBusy,
  closeLabel = 'Close',
  onClose,
  onSelect,
  className,
  jsonButtonProps,
  excelButtonProps,
  ...props
}: {
  open?: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  scope: HzExportTypeDialogScope;
  selectedCount?: number;
  jsonDescription?: React.ReactNode;
  excelDescription?: React.ReactNode;
  jsonBusy?: boolean;
  excelBusy?: boolean;
  closeLabel?: React.ReactNode;
  onClose?: () => void;
  onSelect?: (type: HzExportTypeDialogType) => void;
  jsonButtonProps?: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'disabled'>;
  excelButtonProps?: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'disabled'>;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onSelect' | 'title'>) {
  if (!open) return null;

  const titleLabel = stringifyNode(title, 'Choose export type');
  const renderOption = (
    type: HzExportTypeDialogType,
    body: React.ReactNode,
    busy: boolean | undefined,
    buttonProps: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'disabled'> | undefined
  ) => (
    <button
      {...buttonProps}
      type="button"
      className={cn(
        'grid min-h-[104px] grid-cols-[44px_minmax(0,1fr)] items-center gap-3 border border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-surface-soft)] px-3 py-3 text-left transition hover:border-[var(--hz-ui-accent-muted)] hover:bg-[var(--hz-ui-active-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hz-ui-active-soft)]',
        busy ? 'cursor-wait opacity-70' : null,
        buttonProps?.className
      )}
      disabled={busy}
      onClick={() => onSelect?.(type)}
      aria-busy={busy ? 'true' : buttonProps?.['aria-busy']}
      data-hz-export-type-option={type}
      data-hz-export-type-busy={busy ? 'true' : undefined}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-[3px] border border-[var(--hz-ui-line)] bg-[var(--hz-ui-control)] font-mono text-[12px] font-semibold text-[#dbe4f0]">
        {type}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-[#f3f6fb]">{type}</span>
        <span className="mt-1 block text-[11px] leading-5 text-[#8f99ab]">{body}</span>
      </span>
    </button>
  );

  return (
    <div
      {...props}
      className={cn('fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4', className)}
      role="dialog"
      aria-modal="true"
      aria-label={titleLabel}
      data-hz-ui="export-type-dialog"
      data-hz-export-scope={scope}
      data-hz-export-selected-count={selectedCount === undefined ? undefined : String(selectedCount)}
    >
      <div className="w-full max-w-[600px] border border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-surface-raised)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] px-4 py-3">
          <div className="min-w-0">
            <div className="text-[14px] font-semibold leading-5 text-[#f5f7fb]">{title}</div>
            {description ? <div className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{description}</div> : null}
          </div>
          <HzButton size="sm" intent="ghost" onClick={onClose} data-hz-export-type-close="true">
            {closeLabel}
          </HzButton>
        </header>
        <div className="grid gap-3 p-4 sm:grid-cols-2" data-hz-export-type-options="json-excel">
          {renderOption('JSON', jsonDescription, jsonBusy, jsonButtonProps)}
          {renderOption('EXCEL', excelDescription, excelBusy, excelButtonProps)}
        </div>
      </div>
    </div>
  );
}

export function HzMonitorEditorSection({
  title,
  titleMeta,
  copy,
  help,
  children,
  action,
  className,
  bodyClassName,
  ...props
}: {
  title: React.ReactNode;
  titleMeta?: React.ReactNode;
  copy?: React.ReactNode;
  help?: {
    label: string;
    body: React.ReactNode;
    impact?: React.ReactNode;
  };
  children?: React.ReactNode;
  action?: React.ReactNode;
  bodyClassName?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, 'children' | 'title'>) {
  const helpTooltipId = React.useId();

  return (
    <section
      {...props}
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="monitor-editor-section"
    >
      <header className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-[var(--hz-ui-line-faint)] px-3 py-2">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <h2 className="truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</h2>
            {help ? (
              <span
                data-monitor-editor-section-help-placement="inline-title"
                className="group relative inline-flex"
              >
                <button
                  type="button"
                  aria-label={help.label}
                  aria-describedby={helpTooltipId}
                  data-monitor-editor-section-help-trigger="hertzbeat-ui-section-help"
                  data-monitor-editor-section-help-style="icon-after-title"
                  data-monitor-editor-section-help-visual="circle-help-icon"
                  data-monitor-editor-section-help-icon="lucide-circle-help"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#2b3039] bg-[#101217] text-[11px] font-semibold leading-none text-[#8d95a5] transition hover:border-[#4e74f8] hover:text-[#d8e4ff] focus:text-[#d8e4ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
                  title={help.label}
                >
                  <CircleHelp size={12} strokeWidth={2} aria-hidden="true" />
                </button>
                <span
                  id={helpTooltipId}
                  role="tooltip"
                  data-monitor-editor-section-help="hertzbeat-ui-section-tooltip"
                  className="pointer-events-none absolute left-0 top-6 z-20 hidden w-[280px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left normal-case tracking-normal shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover:block group-focus-within:block"
                >
                  <span className="block text-[11px] leading-4 text-[#dbe4f0]">{help.body}</span>
                  {help.impact ? <span className="mt-2 block border-t border-[#2b3039] pt-2 text-[11px] leading-4 text-[#98a2b3]">{help.impact}</span> : null}
                </span>
              </span>
            ) : null}
            {titleMeta ? <span className="flex min-w-0 items-center gap-1.5">{titleMeta}</span> : null}
          </div>
          {copy ? <p className="mt-0.5 text-[11px] leading-5 text-[#727b8c]">{copy}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className={cn('min-w-0 px-3 py-3', bodyClassName)} data-hz-monitor-editor-section-body="true">
        {children}
      </div>
    </section>
  );
}

export type HzMonitorEditorFieldGridProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> & {
  children?: React.ReactNode;
  columns?: 1 | 2;
};

export function HzMonitorEditorFieldGrid({
  children,
  columns = 2,
  className,
  ...props
}: HzMonitorEditorFieldGridProps) {
  return (
    <div
      {...props}
      className={cn(columns === 1 ? 'grid gap-3' : 'grid gap-3 md:grid-cols-2', className)}
      data-hz-ui="monitor-editor-field-grid"
      data-monitor-editor-field-grid-owner="hertzbeat-ui-monitor-editor-field-grid"
      data-hz-monitor-editor-field-grid-columns={String(columns)}
    >
      {children}
    </div>
  );
}

export type HzMonitorEditorFormProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, 'children'> & {
  children?: React.ReactNode;
  actionBar?: React.ReactNode;
  bodyClassName?: string;
};

export function HzMonitorEditorForm({
  children,
  actionBar,
  className,
  bodyClassName,
  ...props
}: HzMonitorEditorFormProps) {
  return (
    <form
      {...props}
      className={cn('mx-auto w-full max-w-[980px]', className)}
      data-hz-ui="monitor-editor-form"
      data-monitor-editor-form-owner="hertzbeat-ui-monitor-editor-form"
      data-monitor-editor-layout="linear"
    >
      <div className={cn('space-y-3', bodyClassName)} data-monitor-editor-linear-shell="true">
        {children}
      </div>
      {actionBar}
    </form>
  );
}

export function HzMonitorEditorHeader({
  title,
  className,
  titleClassName,
  ...props
}: {
  title: React.ReactNode;
  titleClassName?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, 'children' | 'title'>) {
  return (
    <header
      {...props}
      className={cn('min-w-0 border-b border-[var(--hz-ui-line-soft)] px-3 pb-3 pt-2', className)}
      data-hz-ui="monitor-editor-header"
    >
      <h1 className={cn('truncate text-[18px] font-semibold text-[#f3f6fb]', titleClassName)}>{title}</h1>
    </header>
  );
}

export function HzDangerConfirm({
  open = false,
  title,
  description,
  triggerLabel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onOpenChange,
  onConfirm,
  className
}: {
  open?: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  triggerLabel: React.ReactNode;
  confirmLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  onConfirm?: () => void;
  className?: string;
}) {
  const titleLabel = stringifyNode(title, 'dangerous action');
  return (
    <div className={cn('min-w-0', className)} data-hz-ui="danger-confirm" data-hz-confirm-open={open ? 'true' : 'false'}>
      <HzButton intent="danger" size="sm" onClick={() => onOpenChange?.(true)} aria-label={`Open dangerous action ${titleLabel}`}>
        {triggerLabel}
      </HzButton>
      {open ? (
        <div
          className="mt-2 min-w-0 border-y border-[#5d3037] bg-[#1a1013]"
          role="dialog"
          aria-modal="false"
          aria-label={titleLabel}
          data-hz-confirm-dialog="true"
        >
          <div className="border-b border-[#5d3037] px-3 py-2">
            <div className="text-[13px] font-semibold text-[#f0a7b2]">{title}</div>
            {description ? <div className="mt-1 text-[11px] leading-5 text-[#b68991]">{description}</div> : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 px-3 py-2">
            <HzButton size="sm" intent="ghost" onClick={() => onOpenChange?.(false)} aria-label={`Cancel dangerous action ${titleLabel}`}>
              {cancelLabel}
            </HzButton>
            <HzButton size="sm" intent="danger" onClick={onConfirm} aria-label={`Confirm dangerous action ${titleLabel}`}>
              {confirmLabel}
            </HzButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type HzToastItem = {
  id: string;
  tone?: HzStatusTone;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
};

export function HzToastStack({
  items,
  className
}: {
  items: HzToastItem[];
  className?: string;
}) {
  return (
    <div className={cn('grid min-w-0 gap-2', className)} data-hz-ui="toast-stack">
      {items.map(item => {
        const tone = item.tone || 'info';
        return (
          <div
            key={item.id}
            className="grid min-w-0 grid-cols-[3px_minmax(0,1fr)_auto] items-stretch border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] shadow-[0_14px_28px_rgba(0,0,0,0.18)]"
            data-hz-toast={item.id}
            data-hz-toast-tone={tone}
            role={tone === 'critical' || tone === 'warning' ? 'alert' : 'status'}
          >
            <span aria-hidden="true" style={{ backgroundColor: chartToneColor[tone].stroke }} />
            <div className="min-w-0 px-3 py-2">
              <div className="truncate text-[12px] font-semibold text-[#f3f6fb]">{item.title}</div>
              {item.description ? <div className="mt-0.5 text-[11px] leading-5 text-[#8f99ab]">{item.description}</div> : null}
            </div>
            {item.meta ? <div className="flex shrink-0 items-center px-3 font-mono text-[10px] text-[#727b8c]">{item.meta}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

export type HzThresholdPoint = {
  value: number;
  label?: React.ReactNode;
  tone?: HzStatusTone;
};

export function HzStatCell({
  label,
  value,
  unit,
  detail,
  trend,
  tone = 'neutral',
  variant = 'band',
  density = 'default',
  frame = 'default',
  className,
  ...props
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  detail?: React.ReactNode;
  trend?: React.ReactNode;
  tone?: HzStatusTone;
  variant?: 'band' | 'tile';
  density?: 'default' | 'compact';
  frame?: 'default' | 'flush' | 'inset';
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>) {
  const toneColor = chartToneColor[tone];
  const variantClassName =
    variant === 'tile'
      ? cn(density === 'compact' ? 'min-h-[64px]' : 'min-h-[76px]', 'rounded-[4px] border border-[#252b35] px-3 py-3')
      : 'min-h-[86px] border-y border-[var(--hz-ui-line-soft)] px-3 py-2.5';

  return (
    <div
      {...props}
      className={cn(
        'grid min-w-0 bg-[var(--hz-ui-surface)]',
        variantClassName,
        frame === 'flush' ? 'border-0' : null,
        frame === 'inset' ? 'border-[#252b35] bg-[#0d1015]' : null,
        className
      )}
      data-hz-ui="stat-cell"
      data-hz-stat-tone={tone}
      data-hz-stat-variant={variant}
      data-hz-stat-density={density}
      data-hz-stat-frame={frame}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">{label}</span>
        {trend ? <span className="shrink-0 font-mono text-[10px]" style={{ color: toneColor.stroke }}>{trend}</span> : null}
      </div>
      <div className="mt-2 flex min-w-0 items-baseline gap-1">
        <span className="truncate font-mono text-[24px] font-semibold leading-none text-[#f5f7fb]">{value}</span>
        {unit ? <span className="font-mono text-[11px] text-[#727b8c]">{unit}</span> : null}
      </div>
      {detail ? <div className="mt-2 truncate text-[11px] text-[#8f99ab]">{detail}</div> : null}
    </div>
  );
}

export type HzSignalSummaryItem = {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  detail?: React.ReactNode;
  trend?: React.ReactNode;
  tone?: HzStatusTone;
};

export type HzSignalSummaryStripProps = React.HTMLAttributes<HTMLDivElement> & {
  items: HzSignalSummaryItem[];
  layout?: 'panel' | 'toolbar' | 'detail';
  density?: 'default' | 'compact';
};

export function HzSignalSummaryStrip({
  items,
  layout = 'panel',
  density = 'default',
  className,
  ...props
}: HzSignalSummaryStripProps) {
  const wrapperClassName =
    layout === 'toolbar'
      ? 'flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-1.5'
      : cn(
          'grid min-w-0',
          density === 'compact' ? 'gap-x-3 gap-y-2' : 'gap-x-5 gap-y-3',
          layout === 'detail' ? 'sm:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-4'
        );

  return (
    <div
      {...props}
      className={cn(wrapperClassName, className)}
      data-hz-ui="signal-summary-strip"
      data-hz-signal-summary-layout={layout}
      data-hz-signal-summary-density={density}
    >
      {items.map((item, index) => {
        const tone = item.tone || 'neutral';
        const toneColor = chartToneColor[tone];

        return (
          <div
            key={item.id}
            className={cn(
              'min-w-0',
              layout === 'toolbar'
                ? 'inline-grid grid-cols-[auto_auto] items-baseline gap-x-1.5 gap-y-0.5 border-l border-[#2a303a] pl-3 first:border-l-0 first:pl-0'
                : 'grid gap-1 border-l border-[#2a303a] pl-3 first:border-l-0 first:pl-0',
              layout === 'detail' ? 'py-0.5' : null
            )}
            data-hz-ui="signal-summary-item"
            data-hz-signal-summary-item={item.id}
            data-hz-signal-summary-item-tone={tone}
            data-hz-signal-summary-item-index={index}
          >
            <div className={cn('min-w-0 truncate text-[10px] font-semibold uppercase text-[#7e8494]', layout === 'toolbar' ? 'tracking-normal' : 'tracking-[0.12em]')}>
              {item.label}
            </div>
            <div className="flex min-w-0 items-baseline gap-1">
              <span className={cn('truncate font-mono font-semibold text-[#f5f7fb]', density === 'compact' || layout === 'toolbar' ? 'text-[13px]' : 'text-[15px]')}>
                {item.value}
              </span>
              {item.unit ? <span className="shrink-0 font-mono text-[10px] text-[#727b8c]">{item.unit}</span> : null}
            </div>
            {item.detail || item.trend ? (
              <div className={cn('min-w-0 truncate text-[11px] text-[#8f99ab]', layout === 'toolbar' ? 'col-span-2' : null)}>
                {item.trend ? <span className="mr-1 font-mono" style={{ color: toneColor.stroke }}>{item.trend}</span> : null}
                {item.detail}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export type HzStatStripProps = React.HTMLAttributes<HTMLDivElement> & {
  columns?: 2 | 3 | 4;
  density?: 'tile';
  frame?: 'none' | 'panel-inset' | 'panel-solid';
  spacing?: 'default' | 'compact';
};

export function HzStatStrip({ children, className, columns = 4, density = 'tile', frame = 'none', spacing = 'default', ...props }: HzStatStripProps) {
  const columnClass =
    columns === 2 ? 'sm:grid-cols-2' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-4';

  return (
    <div
      {...props}
      className={cn(
        'grid min-w-0',
        spacing === 'compact' ? 'gap-1' : 'gap-2',
        frame === 'panel-inset' ? 'rounded-[3px] border border-[#252b35] bg-[#10141b] p-1' : null,
        frame === 'panel-solid' ? 'rounded-[3px] border border-[#252b35] bg-[#252b35] p-1' : null,
        columnClass,
        className
      )}
      data-hz-ui="stat-strip"
      data-hz-stat-strip-owner="hertzbeat-ui-stat-strip"
      data-hz-stat-strip-columns={columns}
      data-hz-stat-strip-density={density}
      data-hz-stat-strip-frame={frame}
      data-hz-stat-strip-spacing={spacing}
    >
      {children}
    </div>
  );
}

export type HzSignalTrendBar = {
  id: string;
  value: number;
  label?: React.ReactNode;
  title?: string;
  tone?: HzStatusTone;
};

export function HzSignalTrendBars({
  title,
  meta,
  bars,
  height = 64,
  className,
  ...props
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  bars: HzSignalTrendBar[];
  height?: number;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  const visibleBars = bars.length ? bars : [{ id: 'empty', value: 0, label: '-' }];
  const maxValue = Math.max(1, ...visibleBars.map(bar => Number(bar.value) || 0));

  return (
    <section
      {...props}
      className={cn('min-w-0 rounded-[4px] border border-[#252b35] bg-[#10141b] px-3 py-3', className)}
      data-hz-ui="signal-trend-bars"
      data-hz-signal-trend-count={visibleBars.length}
    >
      <header className="mb-3 flex items-center justify-between gap-3 text-[12px] text-[#8792a5]">
        <span className="min-w-0 truncate font-semibold text-[#c6cfdd]">{title}</span>
        {meta ? <span className="inline-flex shrink-0 items-center gap-1">{meta}</span> : null}
      </header>
      <div className="flex items-end gap-1.5" style={{ height }} data-hz-signal-trend-bars="true">
        {visibleBars.map(bar => {
          const value = Number(bar.value) || 0;
          const barTone = bar.tone || 'info';
          const toneColor = chartToneColor[barTone];
          const barHeight = Math.max(10, (value / maxValue) * height);

          return (
            <span key={bar.id} className="min-w-0 flex-1" data-hz-signal-trend-bar={bar.id} data-hz-signal-trend-tone={barTone}>
              <span
                className="block rounded-t-[3px] border"
                style={{
                  height: `${barHeight}px`,
                  borderColor: toneColor.fill,
                  backgroundColor: toneColor.soft
                }}
                title={bar.title || `${bar.label || bar.id}: ${value}`}
              />
            </span>
          );
        })}
      </div>
    </section>
  );
}

export function HzBarGauge({
  title,
  value,
  min = 0,
  max = 100,
  unit,
  tone = 'info',
  thresholds = [],
  detail,
  className
}: {
  title: React.ReactNode;
  value: number;
  min?: number;
  max?: number;
  unit?: React.ReactNode;
  tone?: HzStatusTone;
  thresholds?: HzThresholdPoint[];
  detail?: React.ReactNode;
  className?: string;
}) {
  const percent = clampRangePercent(value, min, max);
  const toneColor = chartToneColor[tone];

  return (
    <div
      className={cn('grid min-h-[86px] min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] px-3 py-2.5', className)}
      data-hz-ui="bar-gauge"
      data-hz-gauge-value={value}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">{title}</span>
        <span className="shrink-0 font-mono text-[12px] font-semibold text-[#dbe4f0]">
          {value}
          {unit}
        </span>
      </div>
      <div className="relative mt-3 h-3 border border-[var(--hz-ui-line-faint)] bg-[var(--hz-ui-canvas)]">
        <span
          className="absolute inset-y-0 left-0"
          style={{
            width: `${percent}%`,
            backgroundColor: toneColor.stroke,
            boxShadow: `0 0 0 1px ${toneColor.soft} inset`
          }}
        />
        {thresholds.map(threshold => {
          const thresholdTone = threshold.tone || 'warning';
          return (
            <span
              key={`${threshold.value}-${stringifyNode(threshold.label, '')}`}
              className="absolute -top-1 bottom-[-4px] w-px"
              data-hz-threshold={threshold.value}
              data-hz-threshold-tone={thresholdTone}
              style={{
                left: `${clampRangePercent(threshold.value, min, max)}%`,
                backgroundColor: chartToneColor[thresholdTone].stroke
              }}
            >
              <span className="sr-only">{threshold.label || threshold.value}</span>
            </span>
          );
        })}
      </div>
      <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-[#727b8c]">
          {min}
          {unit}
        </span>
        {detail ? <span className="min-w-0 truncate text-center text-[11px] text-[#8f99ab]">{detail}</span> : null}
        <span className="font-mono text-[10px] text-[#727b8c]">
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}

export type HzMonitorStatGridItem = {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: HzStatusTone;
};

export function HzMonitorStatGrid({
  items,
  columns = 3,
  className
}: {
  items: HzMonitorStatGridItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const columnClass =
    columns === 2 ? 'sm:grid-cols-2' : columns === 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3';

  return (
    <div
      className={cn(
        'grid divide-y divide-[var(--hz-ui-line-soft)] border-y border-[var(--hz-ui-line-soft)] bg-transparent sm:divide-y-0 sm:divide-x sm:divide-[var(--hz-ui-line-soft)]',
        columnClass,
        className
      )}
      data-hz-ui="monitor-stat-grid"
      data-monitor-stat-grid-owner="hertzbeat-ui-monitor-stat-grid"
      data-monitor-stat-grid-columns={columns}
    >
      {items.map((item, index) => {
        const tone = item.tone || 'neutral';
        return (
          <div key={`${stringifyNode(item.label, 'stat')}-${index}`} className="min-w-0 px-0 py-2.5" data-monitor-stat-tone={tone}>
            <div className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7e8494]">{item.label}</div>
            <div className="mt-1 truncate text-sm font-semibold text-[#f3f6fb]">{item.value}</div>
          </div>
        );
      })}
    </div>
  );
}

export type HzMonitorSignalBarItem = {
  label: React.ReactNode;
  value: React.ReactNode;
  widthPercent: number;
  tone?: HzStatusTone;
};

export function HzMonitorSignalBars({
  items,
  className
}: {
  items: HzMonitorSignalBarItem[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn('grid gap-2', className)}
      data-hz-ui="monitor-signal-bars"
      data-monitor-signal-bars-owner="hertzbeat-ui-monitor-signal-bars"
    >
      {items.map((item, index) => {
        const tone = item.tone || 'info';
        return (
          <div key={`${stringifyNode(item.label, 'signal')}-${index}`} className="grid gap-1" data-monitor-signal-bar-tone={tone}>
            <div className="flex min-w-0 items-center justify-between gap-3 text-xs text-[#a9b0bb]">
              <span className="min-w-0 truncate">{item.label}</span>
              <span className="shrink-0 font-mono text-[#dbe4f0]">{item.value}</span>
            </div>
            <div className="h-1.5 overflow-hidden bg-[var(--hz-ui-surface-soft)]">
              <div
                className="h-full"
                style={{
                  width: `${Math.max(8, Math.min(100, Math.round(item.widthPercent)))}%`,
                  backgroundColor: chartToneColor[tone].stroke
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HzThresholdRail({
  title,
  value,
  min = 0,
  max = 100,
  unit,
  thresholds = [],
  className
}: {
  title: React.ReactNode;
  value: number;
  min?: number;
  max?: number;
  unit?: React.ReactNode;
  thresholds?: HzThresholdPoint[];
  className?: string;
}) {
  const currentTone = thresholds
    .slice()
    .sort((left, right) => right.value - left.value)
    .find(threshold => value >= threshold.value)?.tone || 'success';

  return (
    <div
      className={cn('grid min-h-[86px] min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] px-3 py-2.5', className)}
      data-hz-ui="threshold-rail"
      data-hz-threshold-value={value}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">{title}</span>
        <span className="shrink-0 font-mono text-[12px] font-semibold" style={{ color: chartToneColor[currentTone].stroke }}>
          {value}
          {unit}
        </span>
      </div>
      <div className="relative mt-4 h-px bg-[var(--hz-ui-line-strong)]">
        {thresholds.map(threshold => {
          const thresholdTone = threshold.tone || 'warning';
          return (
            <span
              key={`${threshold.value}-${stringifyNode(threshold.label, '')}`}
              className="absolute -top-3 h-6 w-px"
              data-hz-threshold={threshold.value}
              data-hz-threshold-tone={thresholdTone}
              style={{
                left: `${clampRangePercent(threshold.value, min, max)}%`,
                backgroundColor: chartToneColor[thresholdTone].stroke
              }}
            >
              {threshold.label ? (
                <span className="absolute left-1 top-4 whitespace-nowrap font-mono text-[10px]" style={{ color: chartToneColor[thresholdTone].stroke }}>
                  {threshold.label}
                </span>
              ) : null}
            </span>
          );
        })}
        <span
          className="absolute -top-2 h-4 w-1"
          data-hz-threshold-current="true"
          style={{
            left: `calc(${clampRangePercent(value, min, max)}% - 2px)`,
            backgroundColor: chartToneColor[currentTone].stroke,
            boxShadow: `0 0 0 3px ${chartToneColor[currentTone].soft}`
          }}
        />
      </div>
      <div className="mt-5 flex justify-between font-mono text-[10px] text-[#727b8c]">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}

export type HzQueryHistoryItem = {
  id: string;
  query: React.ReactNode;
  time?: React.ReactNode;
  duration?: React.ReactNode;
  resultCount?: React.ReactNode;
  tone?: HzStatusTone;
  active?: boolean;
  meta?: React.ReactNode;
};

export function HzQueryHistory({
  title = 'Query history',
  items,
  actions,
  onRestore,
  onCompare,
  className
}: {
  title?: React.ReactNode;
  items: HzQueryHistoryItem[];
  actions?: React.ReactNode;
  onRestore?: (item: HzQueryHistoryItem) => void;
  onCompare?: (item: HzQueryHistoryItem) => void;
  className?: string;
}) {
  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="query-history"
    >
      <div className="flex min-h-10 items-center justify-between gap-2 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</div>
          <div className="text-[11px] text-[#727b8c]">{items.length} runs</div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className="divide-y divide-[var(--hz-ui-line-faint)]">
        {items.map(item => {
          const tone = item.tone || 'neutral';
          const toneColor = chartToneColor[tone];
          return (
            <div
              key={item.id}
              className={cn(
                'grid min-w-0 gap-2 px-3 py-2 transition-colors',
                item.active ? 'bg-[var(--hz-ui-active)] shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]' : 'hover:bg-[var(--hz-ui-surface-soft)]'
              )}
              data-hz-query-history-row={item.id}
              data-hz-query-active={item.active ? 'true' : 'false'}
            >
              <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                <span className="h-2 w-2" style={{ backgroundColor: toneColor.stroke }} aria-hidden="true" />
                <span className="min-w-0 truncate font-mono text-[11px] text-[#dbe4f0]">{item.query}</span>
                <span className="shrink-0 font-mono text-[10px] text-[#727b8c]">{item.time}</span>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 pl-4 text-[10px] text-[#727b8c]">
                {item.duration ? <span className="font-mono">{item.duration}</span> : null}
                {item.resultCount !== undefined ? <span className="font-mono">{item.resultCount} results</span> : null}
                {item.meta ? <span className="min-w-0 truncate">{item.meta}</span> : null}
                <button
                  type="button"
                  className="ml-auto font-semibold uppercase tracking-[0.08em] text-[#98a2b3] hover:text-white"
                  onClick={() => onRestore?.(item)}
                  data-hz-query-action="restore"
                >
                  Restore
                </button>
                <button
                  type="button"
                  className="font-semibold uppercase tracking-[0.08em] text-[#98a2b3] hover:text-white"
                  onClick={() => onCompare?.(item)}
                  data-hz-query-action="compare"
                >
                  Compare
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export type HzSavedViewCompareSide = {
  label: React.ReactNode;
  meta?: React.ReactNode;
  items: React.ReactNode[];
};

export type HzSavedViewCompareDelta = {
  id?: string;
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: HzStatusTone;
};

function HzSavedViewCompareColumn({
  side,
  label,
  sideId
}: {
  side: HzSavedViewCompareSide;
  label: React.ReactNode;
  sideId: 'baseline' | 'candidate';
}) {
  return (
    <div className="min-w-0 border-r border-[var(--hz-ui-line-faint)] px-3 py-2 last:border-r-0" data-hz-compare-side={sideId}>
      <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">{label}</span>
        {side.meta ? <span className="shrink-0 font-mono text-[10px] text-[#727b8c]">{side.meta}</span> : null}
      </div>
      <div className="truncate text-[12px] font-semibold text-[#dbe4f0]">{side.label}</div>
      <div className="mt-2 grid gap-1">
        {side.items.map((item, index) => (
          <div key={`${sideId}-${index}`} className="truncate border-l border-[var(--hz-ui-line-soft)] pl-2 font-mono text-[10px] text-[#8f99ab]">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HzSavedViewCompare({
  title = 'Saved view compare',
  baseline,
  candidate,
  deltas = [],
  actions,
  className
}: {
  title?: React.ReactNode;
  baseline: HzSavedViewCompareSide;
  candidate: HzSavedViewCompareSide;
  deltas?: HzSavedViewCompareDelta[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="saved-view-compare"
    >
      <div className="flex min-h-10 items-center justify-between gap-2 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className="grid min-w-0 grid-cols-2 border-b border-[var(--hz-ui-line-faint)]">
        <HzSavedViewCompareColumn side={baseline} label="Baseline" sideId="baseline" />
        <HzSavedViewCompareColumn side={candidate} label="Candidate" sideId="candidate" />
      </div>
      {deltas.length ? (
        <div className="grid min-w-0 divide-y divide-[var(--hz-ui-line-faint)]">
          {deltas.map(delta => {
            const tone = delta.tone || 'neutral';
            return (
              <div
                key={delta.id || stringifyNode(delta.label, stringifyNode(delta.value, 'delta'))}
                className="grid min-h-8 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 text-[11px]"
                data-hz-compare-delta={delta.id || stringifyNode(delta.label, stringifyNode(delta.value, 'delta'))}
              >
                <span className="truncate text-[#8f99ab]">{delta.label}</span>
                <span className="font-mono font-semibold" style={{ color: chartToneColor[tone].stroke }}>
                  {delta.value}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export type HzInvestigationNote = {
  id: string;
  author: React.ReactNode;
  time?: React.ReactNode;
  body: React.ReactNode;
  tone?: HzStatusTone;
  tags?: React.ReactNode[];
};

export function HzInvestigationNotes({
  title = 'Investigation notes',
  notes,
  actions,
  className
}: {
  title?: React.ReactNode;
  notes: HzInvestigationNote[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="investigation-notes"
    >
      <div className="flex min-h-10 items-center justify-between gap-2 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</div>
          <div className="text-[11px] text-[#727b8c]">{notes.length} notes</div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className="divide-y divide-[var(--hz-ui-line-faint)]">
        {notes.map(note => {
          const tone = note.tone || 'neutral';
          return (
            <article key={note.id} className="grid min-w-0 gap-1 px-3 py-2" data-hz-note={note.id} data-hz-note-tone={tone}>
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0" style={{ backgroundColor: chartToneColor[tone].stroke }} aria-hidden="true" />
                <span className="truncate text-[11px] font-semibold text-[#dbe4f0]">{note.author}</span>
                {note.time ? <span className="shrink-0 font-mono text-[10px] text-[#727b8c]">{note.time}</span> : null}
              </div>
              <div className="min-w-0 pl-4 text-[12px] leading-5 text-[#aab3c2]">{note.body}</div>
              {note.tags?.length ? (
                <div className="flex min-w-0 flex-wrap gap-1 pl-4">
                  {note.tags.map((tag, index) => (
                    <span key={index} className="border border-[var(--hz-ui-line-faint)] px-1.5 py-0.5 font-mono text-[10px] text-[#727b8c]">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export type HzCommandPaletteItem = {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  shortcut?: React.ReactNode;
  tone?: HzStatusTone;
  active?: boolean;
  meta?: React.ReactNode;
};

export function HzCommandPalette({
  title = 'Command palette',
  query = '',
  placeholder = 'Search commands',
  items,
  actions,
  onQueryChange,
  onSelect,
  className
}: {
  title?: React.ReactNode;
  query?: string;
  placeholder?: string;
  items: HzCommandPaletteItem[];
  actions?: React.ReactNode;
  onQueryChange?: (value: string) => void;
  onSelect?: (item: HzCommandPaletteItem) => void;
  className?: string;
}) {
  return (
    <section
      className={cn('min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="command-palette"
    >
      <div className="flex min-h-10 items-center justify-between gap-2 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</div>
          <div className="text-[11px] text-[#727b8c]">{items.length} commands</div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className="border-b border-[var(--hz-ui-line-faint)] p-3">
        <HzInput
          value={query}
          placeholder={placeholder}
          aria-label={stringifyNode(title, 'Command palette')}
          onChange={event => onQueryChange?.(event.currentTarget.value)}
          className="h-8 text-[12px]"
          data-hz-command-search="true"
        />
      </div>
      <div className="divide-y divide-[var(--hz-ui-line-faint)]">
        {items.map(item => {
          const tone = item.tone || 'neutral';
          return (
            <button
              key={item.id}
              type="button"
              className={cn(
                'grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left transition-colors',
                item.active ? 'bg-[var(--hz-ui-active)] shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]' : 'hover:bg-[var(--hz-ui-surface-soft)]'
              )}
              onClick={() => onSelect?.(item)}
              data-hz-command-item={item.id}
              data-hz-command-active={item.active ? 'true' : 'false'}
            >
              <span className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
                <span className="mt-1 h-2 w-2" style={{ backgroundColor: chartToneColor[tone].stroke }} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold text-[#dbe4f0]">{item.title}</span>
                  {item.description ? <span className="mt-0.5 block truncate text-[11px] text-[#727b8c]">{item.description}</span> : null}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {item.meta ? <span className="font-mono text-[10px] text-[#727b8c]">{item.meta}</span> : null}
                {item.shortcut ? (
                  <span className="border border-[var(--hz-ui-line-faint)] px-1.5 py-0.5 font-mono text-[10px] text-[#8f99ab]">{item.shortcut}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export type HzContextHandoffTarget = {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  href?: string;
  tone?: HzStatusTone;
  current?: boolean;
};

export type HzContextHandoffProps = React.HTMLAttributes<HTMLElement> & {
  title?: React.ReactNode;
  context?: React.ReactNode;
  targets: HzContextHandoffTarget[];
  actions?: React.ReactNode;
  onOpen?: (target: HzContextHandoffTarget) => void;
  frame?: 'default' | 'flush' | 'flush-x';
};

export function HzContextHandoff({
  title = 'Context handoff',
  context,
  targets,
  actions,
  onOpen,
  className,
  frame = 'default',
  ...props
}: HzContextHandoffProps) {
  return (
    <section
      className={cn(
        'min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]',
        frame === 'flush' ? 'border-0' : null,
        frame === 'flush-x' ? 'border-x-0' : null,
        className
      )}
      data-hz-ui="context-handoff"
      data-hz-context-handoff-owner="hertzbeat-ui-context-handoff"
      data-hz-context-handoff-frame={frame}
      {...props}
    >
      <div className="flex min-h-10 items-center justify-between gap-2 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</div>
          {context ? <div className="mt-0.5 truncate font-mono text-[10px] text-[#727b8c]">{context}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className="divide-y divide-[var(--hz-ui-line-faint)]">
        {targets.map(target => {
          const tone = target.tone || 'neutral';
          const body = (
            <>
              <span className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
                <span className="mt-1 h-2 w-2" style={{ backgroundColor: chartToneColor[tone].stroke }} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold text-[#dbe4f0]">{target.label}</span>
                  {target.description ? <span className="mt-0.5 block truncate text-[11px] text-[#727b8c]">{target.description}</span> : null}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {target.current ? <span className="font-mono text-[10px] text-[#7c93db]">current</span> : null}
                {target.meta ? <span className="font-mono text-[10px] text-[#727b8c]">{target.meta}</span> : null}
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#98a2b3]">Open</span>
              </span>
            </>
          );

          if (target.href) {
            return (
              <a
                key={target.id}
                href={target.href}
                className={cn(
                  'grid min-h-12 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 transition-colors hover:bg-[var(--hz-ui-surface-soft)]',
                  target.current ? 'bg-[var(--hz-ui-active)] shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]' : null
                )}
                data-hz-context-target={target.id}
                data-hz-context-target-current={target.current ? 'true' : 'false'}
              >
                {body}
              </a>
            );
          }

          return (
            <button
              key={target.id}
              type="button"
              className={cn(
                'grid min-h-12 w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--hz-ui-surface-soft)]',
                target.current ? 'bg-[var(--hz-ui-active)] shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]' : null
              )}
              onClick={() => onOpen?.(target)}
              data-hz-context-target={target.id}
              data-hz-context-target-current={target.current ? 'true' : 'false'}
            >
              {body}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export type HzCollapsibleSectionProps = Omit<React.DetailsHTMLAttributes<HTMLDetailsElement>, 'title'> & {
  title: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
  surface?: 'default' | 'inset';
};

export function HzCollapsibleSection({
  title,
  meta,
  children,
  className,
  bodyClassName,
  surface = 'default',
  ...props
}: HzCollapsibleSectionProps) {
  return (
    <details
      {...props}
      className={cn(
        'overflow-hidden rounded-[3px] border',
        surface === 'inset' ? 'border-[#252b35] bg-[#0d1015]' : 'border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]',
        className
      )}
      data-hz-ui="collapsible-section"
      data-hz-collapsible-owner="hertzbeat-ui-collapsible-section"
      data-hz-collapsible-surface={surface}
    >
      <summary
        className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[11px] font-semibold text-[#8792a5]"
        data-hz-collapsible-summary-owner="hertzbeat-ui-collapsible-section"
      >
        <span className="min-w-0 truncate">{title}</span>
        {meta ? <span className="shrink-0 text-[#6d7788]">{meta}</span> : null}
      </summary>
      <div
        className={cn('border-t border-[var(--hz-ui-line-soft)]', bodyClassName)}
        data-hz-collapsible-body-owner="hertzbeat-ui-collapsible-section"
      >
        {children}
      </div>
    </details>
  );
}

export type HzInspectorFact = {
  label: React.ReactNode;
  value: React.ReactNode;
  meta?: React.ReactNode;
  tone?: HzStatusTone;
};

export type HzInspectorSectionItem = {
  id: string;
  label: React.ReactNode;
  value?: React.ReactNode;
  meta?: React.ReactNode;
  tone?: HzStatusTone;
};

export type HzInspectorSection = {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  items: HzInspectorSectionItem[];
  actions?: React.ReactNode;
};

export function HzInspectorDrawer({
  open = true,
  variant = 'inline',
  title,
  subtitle,
  status,
  facts = [],
  sections = [],
  actions,
  onClose,
  className
}: {
  open?: boolean;
  variant?: 'inline' | 'overlay';
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  status?: React.ReactNode;
  facts?: HzInspectorFact[];
  sections?: HzInspectorSection[];
  actions?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  const drawer = (
    <aside
      className={cn(
        'min-w-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] shadow-[inset_1px_0_0_rgba(255,255,255,0.018)]',
        variant === 'overlay' ? 'h-full overflow-auto border-y-0 border-l' : null,
        open || variant === 'overlay' ? null : 'hidden',
        className
      )}
      aria-label={stringifyNode(title, 'Inspector drawer')}
      data-hz-ui="inspector-drawer"
      data-hz-inspector-open={open ? 'true' : 'false'}
    >
      <header className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[13px] font-semibold text-[#f3f6fb]">{title}</h2>
            {status ? <span className="shrink-0">{status}</span> : null}
          </div>
          {subtitle ? <div className="mt-0.5 truncate font-mono text-[10px] text-[#727b8c]">{subtitle}</div> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {onClose ? (
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center border border-transparent text-[#727b8c] transition-colors hover:border-[var(--hz-ui-line-soft)] hover:bg-[var(--hz-ui-surface-soft)] hover:text-white"
              aria-label="Close inspector"
              onClick={onClose}
            >
              <X size={13} />
            </button>
          ) : null}
        </div>
      </header>

      {facts.length ? (
        <div className="grid min-w-0 border-b border-[var(--hz-ui-line-faint)] sm:grid-cols-2 xl:grid-cols-4">
          {facts.map((fact, index) => {
            const tone = fact.tone || 'neutral';
            return (
              <div
                key={`${stringifyNode(fact.label, 'fact')}-${index}`}
                className="min-w-0 border-b border-r border-[var(--hz-ui-line-faint)] px-3 py-2 last:border-r-0 sm:[&:nth-last-child(-n+2)]:border-b-0 xl:border-b-0"
                data-hz-inspector-fact={stringifyNode(fact.label, `fact-${index}`)}
                data-hz-inspector-fact-tone={tone}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0" style={{ backgroundColor: chartToneColor[tone].stroke }} aria-hidden="true" />
                  <span className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-[#727b8c]">{fact.label}</span>
                </div>
                <div className="mt-1 truncate text-[14px] font-semibold text-[#e6edf7]">{fact.value}</div>
                {fact.meta ? <div className="mt-0.5 truncate font-mono text-[10px] text-[#727b8c]">{fact.meta}</div> : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="divide-y divide-[var(--hz-ui-line-faint)]">
        {sections.map(section => (
          <section key={section.id} className="min-w-0" data-hz-inspector-section={section.id}>
            <div className="flex min-h-9 items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold text-[#f3f6fb]">{section.title}</div>
                {section.description ? <div className="mt-0.5 truncate text-[11px] text-[#727b8c]">{section.description}</div> : null}
              </div>
              {section.actions ? <div className="flex shrink-0 items-center gap-2">{section.actions}</div> : null}
            </div>
            <div className="divide-y divide-[var(--hz-ui-line-faint)] border-t border-[var(--hz-ui-line-faint)]">
              {section.items.map(item => {
                const tone = item.tone || 'neutral';
                return (
                  <div
                    key={item.id}
                    className="grid min-h-10 min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2"
                    data-hz-inspector-item={item.id}
                    data-hz-inspector-item-tone={tone}
                  >
                    <span className="h-2 w-2 shrink-0" style={{ backgroundColor: chartToneColor[tone].stroke }} aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-semibold text-[#dbe4f0]">{item.label}</div>
                      {item.value ? <div className="mt-0.5 truncate font-mono text-[11px] text-[#8f99ab]">{item.value}</div> : null}
                    </div>
                    {item.meta ? <div className="shrink-0 font-mono text-[10px] text-[#727b8c]">{item.meta}</div> : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );

  if (variant === 'overlay') {
    return (
      <div
        className={cn('fixed inset-0 z-50 bg-[rgba(3,6,12,0.42)] transition-opacity', open ? 'opacity-100' : 'pointer-events-none invisible opacity-0')}
        data-hz-ui="inspector-drawer-overlay"
        data-hz-inspector-open={open ? 'true' : 'false'}
      >
        <button
          type="button"
          className="absolute inset-0 cursor-default border-0 bg-transparent"
          aria-label="Close inspector backdrop"
          onClick={onClose}
          tabIndex={open ? 0 : -1}
        />
        <div
          className={cn(
            'absolute bottom-0 right-0 top-0 w-full max-w-[460px] bg-[var(--hz-ui-surface)] shadow-[-20px_0_40px_rgba(0,0,0,0.28)] transition-transform',
            open ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          {drawer}
        </div>
      </div>
    );
  }

  return drawer;
}

export type HzTemplateItem = {
  id: string;
  label: string;
  description?: string;
  meta?: string;
  status?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
};

export type HzTemplateCategory = {
  id: string;
  label: string;
  items: HzTemplateItem[];
};

export function filterHzTemplateCategories(categories: HzTemplateCategory[], search: string) {
  const keyword = search.trim().toLowerCase();
  if (!keyword) return categories;
  return categories
    .map(category => ({
      ...category,
      items: category.items.filter(item => item.label.toLowerCase().includes(keyword))
    }))
    .filter(category => category.items.length > 0);
}

export type HzTemplatePickerLabels = {
  defaultTitle?: React.ReactNode;
  itemCount?: (total: number) => React.ReactNode;
  searchPlaceholder?: string;
  empty?: React.ReactNode;
  loading?: React.ReactNode;
  showCounts?: boolean;
};

const DEFAULT_HZ_TEMPLATE_PICKER_LABELS: Required<HzTemplatePickerLabels> = {
  defaultTitle: 'Templates',
  itemCount: total => `${total} items`,
  searchPlaceholder: 'Search visible names',
  empty: 'No matches',
  loading: 'Loading templates',
  showCounts: true
};

export function HzTemplatePicker({
  categories,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  title,
  action,
  className,
  bodyClassName,
  itemLayout = 'list',
  gridColumns = 5,
  showItemIcon = true,
  showItemMeta = true,
  loading = false,
  searchInputProps,
  labels,
  ...props
}: {
  categories: HzTemplateCategory[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  itemLayout?: 'list' | 'grid';
  gridColumns?: 5;
  showItemIcon?: boolean;
  showItemMeta?: boolean;
  loading?: boolean;
  searchInputProps?: Omit<HzInputProps, 'onChange' | 'placeholder' | 'value'>;
  labels?: HzTemplatePickerLabels;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect' | 'title'>) {
  const visibleCategories = filterHzTemplateCategories(categories, search);
  const total = categories.reduce((sum, category) => sum + category.items.length, 0);
  const useGridLayout = itemLayout === 'grid';
  const resolvedLabels = { ...DEFAULT_HZ_TEMPLATE_PICKER_LABELS, ...labels };
  return (
    <div
      {...props}
      className={cn('min-w-0 border-y border-[var(--hz-ui-line)] bg-[var(--hz-ui-surface)]', className)}
      data-hz-ui="template-picker"
      data-hz-template-layout={itemLayout}
      data-hz-template-filter-contract="angular-monitor-select-list-label-only"
      data-hz-template-filter-owner="hertzbeat-ui-template-picker"
      data-hz-template-filter-match="label"
      data-hz-template-filter-state={search.trim() ? 'matched-groups' : 'all-groups'}
      data-hz-template-loading={loading ? 'true' : 'false'}
      data-hz-template-loading-owner="hertzbeat-ui-template-picker"
      aria-busy={loading ? 'true' : undefined}
    >
      <div className="flex min-h-11 items-center justify-between gap-2 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[#f3f6fb]">{title || resolvedLabels.defaultTitle}</div>
          {resolvedLabels.showCounts ? (
            <div className="text-[11px] text-[#727b8c]" data-hz-template-total-count="visible">
              {resolvedLabels.itemCount(total)}
            </div>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="border-b border-[var(--hz-ui-line-soft)] p-3">
        <HzInput
          {...searchInputProps}
          value={search}
          onChange={event => onSearchChange(event.target.value)}
          placeholder={resolvedLabels.searchPlaceholder}
          disabled={loading || searchInputProps?.disabled}
          data-hz-template-search-input="true"
          data-hz-template-search-owner="hertzbeat-ui-input"
        />
      </div>
      <div className={cn('max-h-[440px] overflow-auto', bodyClassName)}>
        {loading ? (
          <div
            className="grid min-h-[220px] place-items-center px-3 py-10 text-center text-[12px] text-[#8f99ab]"
            data-hz-template-loading-state="angular-monitor-select-list-loading"
            data-hz-template-loading-state-owner="hertzbeat-ui-template-picker"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-[#8fb3ff]" aria-hidden="true" />
              <span>{resolvedLabels.loading}</span>
            </div>
          </div>
        ) : visibleCategories.length > 0 ? (
          visibleCategories.map(category => (
            <div key={category.id} className="border-b border-[var(--hz-ui-line-soft)] last:border-b-0" data-hz-template-category={category.id}>
              <div className="flex h-8 items-center justify-between bg-[var(--hz-ui-surface-muted)] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                <span>{category.label}</span>
                {resolvedLabels.showCounts ? <span data-hz-template-category-count="visible">{category.items.length}</span> : null}
              </div>
              <div
                className={cn(useGridLayout ? 'grid grid-cols-5 gap-2 p-3' : 'grid min-w-0')}
                data-hz-template-grid-columns={useGridLayout ? String(gridColumns) : undefined}
              >
              {category.items.map(item => {
                const selected = item.id === selectedId;
                if (useGridLayout) {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        'flex min-h-9 min-w-0 items-center justify-center border px-2 py-2 text-center text-[12px] font-semibold transition',
                        selected
                          ? 'border-[var(--hz-ui-accent-muted)] bg-[var(--hz-ui-active)] text-white'
                          : 'border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface-soft)] text-[#dbe4f0] hover:border-[var(--hz-ui-accent-muted)] hover:bg-[var(--hz-ui-active-soft)] hover:text-white'
                      )}
                      onClick={() => onSelect?.(item.id)}
                      data-hz-template-row={item.id}
                      data-hz-template-selected={selected ? 'true' : 'false'}
                      data-hz-template-item={item.id}
                    >
                      <span className="block min-w-0 truncate">{item.label}</span>
                    </button>
                  );
                }
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'grid w-full grid-cols-[minmax(0,1fr)_auto] items-stretch border-t border-[var(--hz-ui-line-faint)] transition',
                      selected
                        ? 'bg-[var(--hz-ui-active)] text-white shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]'
                        : 'bg-transparent text-[#dbe4f0] hover:bg-[var(--hz-ui-surface-soft)]'
                    )}
                    data-hz-template-row={item.id}
                    data-hz-template-selected={selected ? 'true' : 'false'}
                  >
                    <button
                      type="button"
                      className="grid min-w-0 grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 bg-transparent px-3 py-2 text-left"
                      onClick={() => onSelect?.(item.id)}
                      data-hz-template-item={item.id}
                    >
                      {showItemIcon ? (
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-[3px] border border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-surface-soft)] text-[#cbd5e1]"
                          data-hz-template-item-icon="true"
                        >
                          {item.icon || <span className="h-1.5 w-1.5 rounded-[2px] bg-[#7e8494]" />}
                        </span>
                      ) : null}
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-semibold">{item.label}</span>
                      </span>
                      {showItemMeta ? (
                        <span className="flex shrink-0 items-center gap-2">
                          {item.meta ? <span className="text-[10px] text-[#727b8c]">{item.meta}</span> : null}
                          {item.status}
                        </span>
                      ) : null}
                    </button>
                    {item.action ? (
                      <span className="flex items-center border-l border-[var(--hz-ui-line-faint)] px-2 py-1">
                        {item.action}
                      </span>
                    ) : null}
                  </div>
                );
              })}
              </div>
            </div>
          ))
        ) : (
          <div
            className="px-3 py-10 text-center text-[12px] text-[#727b8c]"
            data-hz-template-empty-state="angular-no-matched-children"
          >
            {resolvedLabels.empty}
          </div>
        )}
      </div>
    </div>
  );
}

export type HzTypePickerDialogLabels = {
  close?: React.ReactNode;
  catalogTitle?: React.ReactNode;
  templatePicker?: HzTemplatePickerLabels;
};

const DEFAULT_HZ_TYPE_PICKER_DIALOG_LABELS: Required<Omit<HzTypePickerDialogLabels, 'templatePicker'>> = {
  close: 'Close',
  catalogTitle: 'Type catalog'
};

export function HzTypePickerDialog({
  open,
  title,
  description,
  categories,
  selectedId,
  search,
  onSearchChange,
  onSelect,
  onClose,
  searchInputProps,
  labels
}: {
  open: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  categories: HzTemplateCategory[];
  selectedId?: string;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect?: (id: string) => void;
  onClose: () => void;
  searchInputProps?: Omit<HzInputProps, 'onChange' | 'placeholder' | 'value'>;
  labels?: HzTypePickerDialogLabels;
}) {
  const dialogTitleId = React.useId();
  if (!open) return null;
  const resolvedLabels = { ...DEFAULT_HZ_TYPE_PICKER_DIALOG_LABELS, ...labels };
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-[7vh]"
      data-hz-ui="type-picker-dialog"
      data-hz-type-picker-layout="legacy-angular-grid"
    >
      <div
        aria-labelledby={dialogTitleId}
        aria-modal="true"
        role="dialog"
        className="w-full max-w-[980px] overflow-hidden border border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-surface)] shadow-[0_28px_90px_rgba(0,0,0,0.52)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--hz-ui-line)] px-4 py-3">
          <div className="min-w-0">
            <div id={dialogTitleId} className="text-[16px] font-semibold text-[#f5f7fb]">{title}</div>
            {description ? <div className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{description}</div> : null}
          </div>
          <HzButton intent="ghost" size="sm" onClick={onClose}>
            {resolvedLabels.close}
          </HzButton>
        </header>
        <HzTemplatePicker
          categories={categories}
          selectedId={selectedId}
          search={search}
          onSearchChange={onSearchChange}
          onSelect={id => {
            onSelect?.(id);
            onClose();
          }}
          title={resolvedLabels.catalogTitle}
          labels={labels?.templatePicker}
          className="border-0"
          bodyClassName="max-h-[52vh]"
          itemLayout="grid"
          gridColumns={5}
          showItemIcon={false}
          showItemMeta={false}
          searchInputProps={searchInputProps}
        />
      </div>
    </div>
  );
}

export function HzYamlWorkspace({
  categories,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  code,
  editor,
  onCodeChange,
  title,
  filename,
  feedback,
  actions,
  layout = 'split',
  className,
  templatePickerLabels,
  templatePickerLoading = false
}: {
  categories: HzTemplateCategory[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  code: string;
  editor?: React.ReactNode;
  onCodeChange?: (value: string) => void;
  title: React.ReactNode;
  filename?: string;
  feedback?: React.ReactNode;
  actions?: React.ReactNode;
  layout?: 'split' | 'rail';
  className?: string;
  templatePickerLabels?: HzTemplatePickerLabels;
  templatePickerLoading?: boolean;
}) {
  const railLayout = layout === 'rail';
  const yamlLines = splitYamlEditorLines(code);
  const minEditorRows = railLayout ? 18 : 24;
  const editorRows = Math.max(yamlLines.length, minEditorRows);
  const lineNumberWidth = Math.max(2, String(yamlLines.length).length);
  return (
    <div
      className={cn(
        'grid border-y border-[var(--hz-ui-line)] bg-[var(--hz-ui-surface)]',
        railLayout
          ? 'min-h-[620px] grid-rows-[minmax(180px,260px)_minmax(320px,1fr)]'
          : 'min-h-[520px] lg:grid-cols-[320px_minmax(0,1fr)]',
        className
      )}
      data-hz-ui="yaml-workspace"
      data-hz-yaml-layout={layout}
    >
      <HzTemplatePicker
        categories={categories}
        selectedId={selectedId}
        onSelect={onSelect}
        search={search}
        onSearchChange={onSearchChange}
        title={templatePickerLabels?.defaultTitle ?? 'YML definitions'}
        labels={templatePickerLabels}
        loading={templatePickerLoading}
        className={railLayout ? 'flex min-h-0 flex-col overflow-hidden border-0 border-b border-[var(--hz-ui-line-soft)]' : 'border-0 border-r border-[var(--hz-ui-line-soft)]'}
        bodyClassName={railLayout ? 'min-h-0 flex-1 max-h-none' : undefined}
      />
      <div className="grid min-w-0 grid-rows-[auto_auto_minmax(0,1fr)]">
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold text-[#f5f7fb]">{title}</div>
            {filename ? <div className="mt-0.5 font-mono text-[11px] text-[#727b8c]">{filename}</div> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
        {feedback ? <div className="border-b border-[var(--hz-ui-line-soft)] px-3 py-2 text-[12px] text-[#efd29b]">{feedback}</div> : null}
        {editor ? (
          <div
            className={cn('min-h-0 overflow-hidden bg-[var(--hz-ui-code)]', railLayout ? 'min-h-[320px]' : 'min-h-[420px]')}
            data-hz-ui="yaml-editor-shell"
            data-hz-yaml-editor-lines={yamlLines.length}
            data-hz-yaml-editor-runtime="external"
          >
            {editor}
          </div>
        ) : (
          <div
            className={cn(
              'grid min-h-0 grid-rows-[minmax(0,1fr)_32px] bg-[var(--hz-ui-code)]',
              railLayout ? 'min-h-[320px]' : 'min-h-[420px]'
            )}
            data-hz-ui="yaml-editor-shell"
            data-hz-yaml-editor-lines={yamlLines.length}
          >
            <div className="grid min-h-0 grid-cols-[48px_minmax(0,1fr)] overflow-auto" data-hz-ui="yaml-editor-scroll">
              <div
                className="sticky left-0 z-20 select-none border-r border-[var(--hz-ui-line-faint)] bg-[rgba(255,255,255,0.018)] py-4 font-mono text-[11px] leading-6 text-[#586174]"
                data-hz-ui="yaml-line-gutter"
              >
                {yamlLines.map((_, index) => (
                  <div key={`yaml-line-number-${index}`} className="h-6 px-2 text-right" data-hz-yaml-line-number={index + 1}>
                    {String(index + 1).padStart(lineNumberWidth, ' ')}
                  </div>
                ))}
              </div>
              <div className="relative min-h-full min-w-[520px] py-4 font-mono text-[12px] leading-6" data-hz-ui="yaml-editor-overlay">
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 py-4 text-[#dbe4f0]">
                  {yamlLines.map((line, index) => (
                    <div
                      key={`yaml-line-${index}`}
                      className={cn(
                        'h-6 min-w-max whitespace-pre px-4',
                        index === 0 ? 'bg-[rgba(124,147,219,0.07)] shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]' : ''
                      )}
                      data-hz-yaml-current-line={index === 0 ? 'true' : undefined}
                      data-hz-yaml-indent={getYamlIndentSpaces(line)}
                      data-hz-yaml-line={index + 1}
                    >
                      {renderYamlEditorLine(line)}
                    </div>
                  ))}
                </div>
                <textarea
                  value={code}
                  onChange={event => onCodeChange?.(event.target.value)}
                  rows={editorRows}
                  className="relative z-10 block min-h-full w-full resize-none overflow-hidden bg-transparent px-4 py-0 font-mono text-[12px] leading-6 text-transparent caret-[#dbe4f0] outline-none selection:bg-[rgba(124,147,219,0.34)]"
                  spellCheck={false}
                  data-hz-ui="yaml-editor"
                  aria-label={`${stringifyNode(title, 'YAML')} source`}
                />
              </div>
            </div>
            <div
              className="flex min-w-0 items-center justify-between gap-3 border-t border-[var(--hz-ui-line-faint)] px-3 font-mono text-[10px] uppercase tracking-[0.1em] text-[#727b8c]"
              data-hz-ui="yaml-editor-status"
            >
              <span>YAML</span>
              <span className="truncate">{yamlLines.length} lines</span>
              <span>spaces: 2</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export type HzFilterOption = {
  id: string;
  label: React.ReactNode;
  count?: number;
  active?: boolean;
};

export type HzFilterGroup = {
  id: string;
  label: React.ReactNode;
  options: HzFilterOption[];
};

export type HzFilterClause = {
  id: string;
  field: string;
  operator: string;
  value: React.ReactNode;
};

export type HzFilterGroupBy = {
  id: string;
  label: React.ReactNode;
};

export type HzFilterFacetValue = {
  id: string;
  label: React.ReactNode;
  count?: number;
  active?: boolean;
};

export type HzFilterFacet = {
  id: string;
  label: React.ReactNode;
  type?: React.ReactNode;
  values: HzFilterFacetValue[];
};

export type HzFilterFacetGroup = {
  id: string;
  label: React.ReactNode;
  facets: HzFilterFacet[];
};

export type HzSavedFilterView = {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  active?: boolean;
};

export type HzFilterQueryPlan = {
  aggregate?: React.ReactNode;
  orderBy?: React.ReactNode;
  limit?: React.ReactNode;
};

export type HzFilterBuilderField = {
  id: string;
  label: string;
};

export type HzFilterBuilderOperator = {
  id: string;
  label: string;
};

export type HzFilterBuilderLogic = 'AND' | 'OR';

export type HzFilterBuilderDraft = {
  field: string;
  operator: string;
  value: string;
  logic: HzFilterBuilderLogic;
};

export type HzResultOption = {
  id: string;
  label: string;
};

export type HzResultColumn = {
  id: string;
  label: React.ReactNode;
  visible: boolean;
  pinned?: boolean;
};

export type HzFieldInsightValue = {
  id: string;
  label: React.ReactNode;
  count: number;
  tone?: HzStatusTone;
};

export function HzFieldInsights({
  field,
  selectedValue,
  values,
  onShowContext,
  onDrilldown,
  className
}: {
  field: React.ReactNode;
  selectedValue?: React.ReactNode;
  values: HzFieldInsightValue[];
  onShowContext?: () => void;
  onDrilldown?: () => void;
  className?: string;
}) {
  const maxCount = Math.max(1, ...values.map(value => value.count));

  return (
    <div
      className={cn(
        'grid gap-0 border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] lg:grid-cols-[184px_minmax(0,1fr)_auto]',
        className
      )}
      data-hz-ui="field-insights"
    >
      <div className="border-b border-[var(--hz-ui-line-soft)] px-3 py-2 lg:border-b-0 lg:border-r lg:border-[var(--hz-ui-line-soft)]">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">
          <BarChart3 size={12} />
          Field stats
        </div>
        <div className="mt-1 truncate font-mono text-[12px] font-semibold text-[#dbe4f0]">{field}</div>
        {selectedValue ? <div className="mt-0.5 truncate text-[11px] text-[#8f99ab]">{selectedValue}</div> : null}
      </div>
      <div className="grid min-w-0 gap-1.5 px-3 py-2">
        {values.map(value => {
          const width = `${Math.max(6, Math.round((value.count / maxCount) * 100))}%`;
          return (
            <div key={value.id} className="grid grid-cols-[minmax(84px,140px)_minmax(0,1fr)_42px] items-center gap-2 text-[11px]">
              <span className="min-w-0 truncate text-[#dbe4f0]">{value.label}</span>
              <span className="h-1.5 min-w-0 bg-[var(--hz-ui-surface-soft)]">
                <span
                  className={cn(
                    'block h-full',
                    value.tone === 'success'
                      ? 'bg-[#5f9f75]'
                      : value.tone === 'warning'
                        ? 'bg-[#b38b4b]'
                        : value.tone === 'critical'
                          ? 'bg-[#b95d66]'
                          : 'bg-[var(--hz-ui-accent-muted)]'
                  )}
                  style={{ width }}
                />
              </span>
              <span className="text-right font-mono text-[#727b8c]">{value.count}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 border-t border-[var(--hz-ui-line-soft)] px-3 py-2 lg:border-l lg:border-t-0 lg:border-[var(--hz-ui-line-soft)]">
        <HzButton size="sm" intent="ghost" onClick={onShowContext}>
          Show context
        </HzButton>
        <HzButton size="sm" onClick={onDrilldown}>
          Drilldown
        </HzButton>
      </div>
    </div>
  );
}

export function HzResultControls({
  timeRanges,
  selectedTimeRangeId,
  onTimeRangeChange,
  refreshIntervals,
  selectedRefreshIntervalId,
  onRefreshIntervalChange,
  viewModes,
  selectedViewModeId,
  onViewModeChange,
  columns,
  onToggleColumn,
  onPinColumn,
  className
}: {
  timeRanges: HzResultOption[];
  selectedTimeRangeId: string;
  onTimeRangeChange?: (id: string) => void;
  refreshIntervals: HzResultOption[];
  selectedRefreshIntervalId: string;
  onRefreshIntervalChange?: (id: string) => void;
  viewModes: HzResultOption[];
  selectedViewModeId: string;
  onViewModeChange?: (id: string) => void;
  columns: HzResultColumn[];
  onToggleColumn?: (id: string) => void;
  onPinColumn?: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-0 border-b border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] lg:grid-cols-[minmax(260px,320px)_minmax(220px,1fr)]',
        className
      )}
      data-hz-ui="result-controls"
    >
      <div className="grid grid-cols-2 gap-2 border-b border-[var(--hz-ui-line-soft)] px-3 py-2 lg:border-b-0 lg:border-r lg:border-[var(--hz-ui-line-soft)]">
        <label className="grid min-w-0 gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">Time range</span>
          <HzSelectMenu
            value={selectedTimeRangeId}
            onChange={onTimeRangeChange}
            options={timeRanges.map(option => ({ value: option.id, label: option.label }))}
            label="Time range"
          />
        </label>
        <label className="grid min-w-0 gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">Auto refresh</span>
          <HzSelectMenu
            value={selectedRefreshIntervalId}
            onChange={onRefreshIntervalChange}
            options={refreshIntervals.map(option => ({ value: option.id, label: option.label }))}
            label="Auto refresh"
          />
        </label>
      </div>

      <div className="flex min-w-0 items-center gap-2 border-b border-[var(--hz-ui-line-soft)] px-3 py-2 lg:border-b-0">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">View</span>
        <div className="flex min-w-0 items-center gap-3 overflow-x-auto">
          {viewModes.map(mode => {
            const active = mode.id === selectedViewModeId;
            return (
              <button
                key={mode.id}
                type="button"
                className={cn(
                  'relative inline-flex h-7 items-center whitespace-nowrap px-0.5 text-[11px] font-semibold transition-colors',
                  active
                    ? 'text-[#f5f7fb] after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-[var(--hz-ui-accent-muted)]'
                    : 'text-[#98a2b3] hover:text-white'
                )}
                onClick={() => onViewModeChange?.(mode.id)}
                data-hz-result-view-active={active ? 'true' : 'false'}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 border-t border-[var(--hz-ui-line-soft)] px-3 py-2 lg:col-span-2">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">Visible columns</span>
          <span className="font-mono text-[10px] text-[#727b8c]">
            {columns.filter(column => column.visible).length}/{columns.length}
          </span>
        </div>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {columns.map(column => (
            <span
              key={column.id}
              className={cn(
                'inline-grid h-7 shrink-0 grid-cols-[minmax(56px,auto)_auto_auto] items-center gap-1 border border-[var(--hz-ui-line-soft)] px-2 text-[11px]',
                column.visible ? 'bg-[var(--hz-ui-surface-soft)] text-[#dbe4f0]' : 'bg-transparent text-[#727b8c]'
              )}
              data-hz-result-column={column.id}
              data-hz-result-column-visible={column.visible ? 'true' : 'false'}
              data-hz-result-column-pinned={column.pinned ? 'true' : 'false'}
            >
              <span className="truncate">
                {column.label}
                {column.pinned ? <span className="ml-1 font-mono text-[10px] text-[#7c93db]">pinned</span> : null}
              </span>
              <button
                type="button"
                aria-label={`${column.visible ? 'Hide' : 'Show'} ${column.label} column`}
                title={`${column.visible ? 'Hide' : 'Show'} ${column.label} column`}
                className="inline-flex h-5 w-5 items-center justify-center text-[#8f99ab] hover:text-white"
                onClick={() => onToggleColumn?.(column.id)}
              >
                {column.visible ? <Eye size={11} /> : <EyeOff size={11} />}
              </button>
              <button
                type="button"
                aria-label={`${column.pinned ? 'Unpin' : 'Pin'} ${column.label} column`}
                title={`${column.pinned ? 'Unpin' : 'Pin'} ${column.label} column`}
                className={cn(
                  'inline-flex h-5 w-5 items-center justify-center hover:text-white',
                  column.pinned ? 'text-[#7c93db]' : 'text-[#8f99ab]'
                )}
                onClick={() => onPinColumn?.(column.id)}
              >
                <Pin size={11} />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HzFieldValueActions({
  field,
  value,
  valueLabel,
  onInclude,
  onExclude,
  className
}: {
  field: string;
  value: React.ReactNode;
  valueLabel?: string;
  onInclude?: () => void;
  onExclude?: () => void;
  className?: string;
}) {
  const actionValueLabel = valueLabel || (typeof value === 'string' || typeof value === 'number' ? String(value) : field);
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)} data-hz-ui="field-value-actions">
      <span className="min-w-0 truncate">{value}</span>
      <span className="inline-flex shrink-0 items-center gap-1 opacity-70 transition-opacity hover:opacity-100">
        <button
          type="button"
          aria-label={`Include ${field} ${actionValueLabel}`}
          title={`Include ${field} ${actionValueLabel}`}
          className="inline-flex h-5 w-5 items-center justify-center border border-[var(--hz-ui-line-soft)] text-[#8f99ab] hover:border-[var(--hz-ui-accent-muted)] hover:text-white"
          onClick={onInclude}
        >
          <Plus size={11} />
        </button>
        <button
          type="button"
          aria-label={`Exclude ${field} ${actionValueLabel}`}
          title={`Exclude ${field} ${actionValueLabel}`}
          className="inline-flex h-5 w-5 items-center justify-center border border-[var(--hz-ui-line-soft)] text-[#8f99ab] hover:border-[var(--hz-ui-accent-muted)] hover:text-white"
          onClick={onExclude}
        >
          <Minus size={11} />
        </button>
      </span>
    </span>
  );
}

export function HzFilterRail({
  groups,
  onSelect,
  className
}: {
  groups: HzFilterGroup[];
  onSelect?: (groupId: string, optionId: string) => void;
  className?: string;
}) {
  return (
    <aside className={cn('min-w-0 bg-[var(--hz-ui-canvas)]', className)} data-hz-ui="filter-rail">
      <div className="border-b border-[var(--hz-ui-line)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
        Quick filters
      </div>
      <div className="divide-y divide-[var(--hz-ui-line-soft)]">
        {groups.map(group => (
          <div key={group.id} className="py-2" data-hz-filter-group={group.id}>
            <div className="px-3 pb-1.5 text-[11px] font-semibold text-[#8f99ab]">{group.label}</div>
            <div className="grid gap-0.5">
              {group.options.map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    'grid h-7 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 text-left text-[12px] transition-colors',
                    option.active
                      ? 'bg-[var(--hz-ui-active)] text-[#f5f7fb] shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]'
                      : 'text-[#a9b0bb] hover:bg-[var(--hz-ui-surface-soft)] hover:text-[#f5f7fb]'
                  )}
                  onClick={() => onSelect?.(group.id, option.id)}
                  data-hz-filter-active={option.active ? 'true' : 'false'}
                >
                  <span className="truncate">{option.label}</span>
                  {typeof option.count === 'number' ? <span className="font-mono text-[11px] text-[#727b8c]">{option.count}</span> : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export function HzFilterWorkbench({
  activeClauses,
  builderFields,
  builderOperators,
  builderLogic = 'AND',
  groupBy,
  savedViews,
  queryPlan,
  quickGroups,
  facetGroups,
  attributeSearch,
  onAttributeSearchChange,
  onSelectQuick,
  onIncludeValue,
  onExcludeValue,
  onClearClause,
  onClearAll,
  onBuilderLogicChange,
  onAddBuilderClause,
  onSelectSavedView,
  onSaveCurrentView,
  className
}: {
  activeClauses: HzFilterClause[];
  builderFields?: HzFilterBuilderField[];
  builderOperators?: HzFilterBuilderOperator[];
  builderLogic?: HzFilterBuilderLogic;
  groupBy?: HzFilterGroupBy[];
  savedViews?: HzSavedFilterView[];
  queryPlan?: HzFilterQueryPlan;
  quickGroups: HzFilterGroup[];
  facetGroups: HzFilterFacetGroup[];
  attributeSearch: string;
  onAttributeSearchChange: (value: string) => void;
  onSelectQuick?: (groupId: string, optionId: string) => void;
  onIncludeValue?: (facet: HzFilterFacet, value: HzFilterFacetValue) => void;
  onExcludeValue?: (facet: HzFilterFacet, value: HzFilterFacetValue) => void;
  onClearClause?: (id: string) => void;
  onClearAll?: () => void;
  onBuilderLogicChange?: (logic: HzFilterBuilderLogic) => void;
  onAddBuilderClause?: (draft: HzFilterBuilderDraft) => void;
  onSelectSavedView?: (id: string) => void;
  onSaveCurrentView?: () => void;
  className?: string;
}) {
  const keyword = attributeSearch.trim().toLowerCase();
  const [builderField, setBuilderField] = React.useState(builderFields?.[0]?.id || '');
  const [builderOperator, setBuilderOperator] = React.useState(builderOperators?.[0]?.id || '=');
  const [builderValue, setBuilderValue] = React.useState('');
  const visibleFacetGroups = keyword
    ? facetGroups
        .map(group => ({
          ...group,
          facets: group.facets.filter(facet => {
            const label = String(facet.label).toLowerCase();
            const type = facet.type ? String(facet.type).toLowerCase() : '';
            const values = facet.values.map(value => String(value.label).toLowerCase()).join(' ');
            return label.includes(keyword) || type.includes(keyword) || values.includes(keyword);
          })
        }))
        .filter(group => group.facets.length > 0)
    : facetGroups;

  return (
    <aside className={cn('min-w-0 bg-[var(--hz-ui-canvas)]', className)} data-hz-ui="filter-workbench">
      <div className="border-b border-[var(--hz-ui-line)] px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">Filters</div>
          {activeClauses.length > 0 ? (
            <button type="button" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#727b8c] hover:text-white" onClick={onClearAll}>
              Clear all
            </button>
          ) : null}
        </div>
      </div>

      <div className="border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-[#8f99ab]">
          <span>Active filters</span>
          <span className="font-mono text-[#727b8c]">{activeClauses.length}</span>
        </div>
        <div className="grid gap-1.5">
          {activeClauses.length > 0 ? (
            activeClauses.map(clause => (
              <span
                key={clause.id}
                className="grid min-h-7 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface-soft)] px-2 py-1 text-left"
              >
                <span className="min-w-0 truncate font-mono text-[11px] text-[#dbe4f0]">
                  <span className="text-[#8f99ab]">{clause.field}</span> {clause.operator} {clause.value}
                </span>
                {onClearClause ? (
                  <button
                    type="button"
                    aria-label={'Remove filter ' + clause.field}
                    title={'Remove filter ' + clause.field}
                    className="inline-flex h-5 w-5 items-center justify-center text-[#727b8c] hover:text-white"
                    onClick={() => onClearClause(clause.id)}
                  >
                    <X size={12} />
                  </button>
                ) : null}
              </span>
            ))
          ) : (
            <div className="py-2 text-[12px] text-[#727b8c]">No active filters</div>
          )}
        </div>
      </div>

      {builderFields?.length && builderOperators?.length ? (
        <div className="border-b border-[var(--hz-ui-line-soft)] px-3 py-2" data-hz-ui="filter-builder">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#8f99ab]">Filter builder</span>
            <span className="inline-flex items-center gap-2">
              {(['AND', 'OR'] as HzFilterBuilderLogic[]).map(logic => (
                <button
                  key={logic}
                  type="button"
                  className={cn(
                    'relative h-6 px-0.5 font-mono text-[10px] font-semibold transition-colors',
                    logic === builderLogic
                      ? 'text-[#f5f7fb] after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-[var(--hz-ui-accent-muted)]'
                      : 'text-[#727b8c] hover:text-white'
                  )}
                  onClick={() => onBuilderLogicChange?.(logic)}
                  data-hz-filter-logic-active={logic === builderLogic ? 'true' : 'false'}
                >
                  {logic}
                </button>
              ))}
            </span>
          </div>
          <div className="grid gap-1.5">
            <HzSelectMenu
              value={builderField}
              onChange={setBuilderField}
              options={builderFields.map(field => ({ value: field.id, label: field.label }))}
              label="Filter field"
            />
            <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-1.5">
              <HzSelectMenu
                value={builderOperator}
                onChange={setBuilderOperator}
                options={builderOperators.map(operator => ({ value: operator.id, label: operator.label }))}
                label="Filter operator"
              />
              <HzInput
                value={builderValue}
                onChange={event => setBuilderValue(event.target.value)}
                placeholder="Value"
                className="text-[11px]"
                aria-label="Filter value"
              />
            </div>
            <HzButton
              type="button"
              size="sm"
              className="w-full min-w-0"
              onClick={() => {
                if (!builderField || !builderOperator) return;
                onAddBuilderClause?.({
                  field: builderField,
                  operator: builderOperator,
                  value: builderValue.trim(),
                  logic: builderLogic
                });
              }}
            >
              Add filter
            </HzButton>
          </div>
        </div>
      ) : null}

      {savedViews?.length ? (
        <div className="border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-[#8f99ab]">
            <span>Saved views</span>
            <button type="button" className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c] hover:text-white" onClick={onSaveCurrentView}>
              Save
            </button>
          </div>
          <div className="grid gap-1">
            {savedViews.map(view => (
              <button
                key={view.id}
                type="button"
                className={cn(
                  'grid min-h-7 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 py-1 text-left text-[12px] transition-colors',
                  view.active
                    ? 'bg-[var(--hz-ui-active)] text-[#f5f7fb] shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]'
                    : 'text-[#a9b0bb] hover:bg-[var(--hz-ui-surface-soft)] hover:text-[#f5f7fb]'
                )}
                onClick={() => onSelectSavedView?.(view.id)}
                data-hz-saved-view-active={view.active ? 'true' : 'false'}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{view.label}</span>
                  {view.description ? <span className="mt-0.5 block truncate text-[11px] text-[#727b8c]">{view.description}</span> : null}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {groupBy?.length ? (
        <div className="border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-[#8f99ab]">
            <span>Group by</span>
            <span className="font-mono text-[#727b8c]">{groupBy.length}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {groupBy.map(item => (
              <span key={item.id} className="border border-[var(--hz-ui-line-soft)] px-2 py-1 font-mono text-[10px] text-[#cbd5e1]">
                {item.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {queryPlan ? (
        <div className="border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-[#8f99ab]">
            <span>Query plan</span>
            <span className="font-mono text-[10px] text-[#727b8c]">preview</span>
          </div>
          <div className="grid gap-1 font-mono text-[11px] text-[#cbd5e1]">
            {queryPlan.aggregate ? (
              <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-2">
                <span className="text-[#727b8c]">agg</span>
                <span className="truncate">{queryPlan.aggregate}</span>
              </div>
            ) : null}
            {queryPlan.orderBy ? (
              <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-2">
                <span className="text-[#727b8c]">order</span>
                <span className="truncate">{queryPlan.orderBy}</span>
              </div>
            ) : null}
            {queryPlan.limit ? (
              <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-2">
                <span className="text-[#727b8c]">limit</span>
                <span className="truncate">{queryPlan.limit}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="divide-y divide-[var(--hz-ui-line-soft)]">
        {quickGroups.map(group => (
          <div key={group.id} className="py-2" data-hz-filter-group={group.id}>
            <div className="px-3 pb-1.5 text-[11px] font-semibold text-[#8f99ab]">{group.label}</div>
            <div className="grid gap-0.5">
              {group.options.map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    'grid h-7 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 text-left text-[12px] transition-colors',
                    option.active
                      ? 'bg-[var(--hz-ui-active)] text-[#f5f7fb] shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]'
                      : 'text-[#a9b0bb] hover:bg-[var(--hz-ui-surface-soft)] hover:text-[#f5f7fb]'
                  )}
                  onClick={() => onSelectQuick?.(group.id, option.id)}
                  data-hz-filter-active={option.active ? 'true' : 'false'}
                >
                  <span className="truncate">{option.label}</span>
                  {typeof option.count === 'number' ? <span className="font-mono text-[11px] text-[#727b8c]">{option.count}</span> : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--hz-ui-line-soft)]">
        <div className="px-3 py-2">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">Attributes</div>
          <HzInput value={attributeSearch} onChange={event => onAttributeSearchChange(event.target.value)} placeholder="Search fields" />
        </div>
        <div className="max-h-[360px] overflow-auto border-t border-[var(--hz-ui-line-soft)]">
          {visibleFacetGroups.length > 0 ? (
            visibleFacetGroups.map(group => (
              <div key={group.id} className="border-b border-[var(--hz-ui-line-soft)] last:border-b-0">
                <div className="flex h-8 items-center justify-between bg-[var(--hz-ui-surface-muted)] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                  <span>{group.label}</span>
                  <span>{group.facets.length}</span>
                </div>
                {group.facets.map(facet => (
                  <div key={facet.id} className="border-t border-[var(--hz-ui-line-faint)] px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-mono text-[11px] font-semibold text-[#dbe4f0]">{facet.label}</span>
                      {facet.type ? <span className="shrink-0 text-[10px] text-[#727b8c]">{facet.type}</span> : null}
                    </div>
                    <div className="mt-1.5 grid gap-1">
                      {facet.values.map(value => (
                        <div key={value.id} className="grid h-6 grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-1 text-[11px] text-[#a9b0bb]">
                          <span className="min-w-0 truncate">{value.label}</span>
                          {typeof value.count === 'number' ? <span className="font-mono text-[#727b8c]">{value.count}</span> : null}
                          {(() => {
                            const valueLabel = typeof value.label === 'string' || typeof value.label === 'number' ? String(value.label) : value.id;
                            return (
                              <>
                                <button
                                  type="button"
                                  aria-label={'Include ' + valueLabel}
                                  title={'Include ' + valueLabel}
                                  className="inline-flex h-5 w-5 items-center justify-center border border-[var(--hz-ui-line-soft)] text-[#8f99ab] hover:border-[var(--hz-ui-accent-muted)] hover:text-white"
                                  onClick={() => onIncludeValue?.(facet, value)}
                                >
                                  <Plus size={11} />
                                </button>
                                <button
                                  type="button"
                                  aria-label={'Exclude ' + valueLabel}
                                  title={'Exclude ' + valueLabel}
                                  className="inline-flex h-5 w-5 items-center justify-center border border-[var(--hz-ui-line-soft)] text-[#8f99ab] hover:border-[var(--hz-ui-accent-muted)] hover:text-white"
                                  onClick={() => onExcludeValue?.(facet, value)}
                                >
                                  <Minus size={11} />
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="px-3 py-8 text-center text-[12px] text-[#727b8c]">No fields matched</div>
          )}
        </div>
      </div>
    </aside>
  );
}

export type HzMetricCell = {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: HzStatusTone;
};

export function HzMetricStrip({
  items,
  className
}: {
  items: HzMetricCell[];
  className?: string;
}) {
  return (
    <div
      className={cn('grid border-b border-[var(--hz-ui-line)] bg-[var(--hz-ui-surface)] sm:grid-cols-2 xl:grid-cols-4', className)}
      data-hz-ui="metric-strip"
    >
      {items.map((item, index) => (
        <div key={index} className="border-r border-[var(--hz-ui-line-soft)] px-3 py-2 last:border-r-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">{item.label}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-[20px] font-semibold leading-none text-[#f5f7fb]">{item.value}</span>
            {item.hint ? <span className="text-[11px] text-[#8f99ab]">{item.hint}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function HzQueryBar({
  query,
  onQueryChange,
  actions,
  className,
  inputProps,
  queryLabel = 'Filter'
}: {
  query: string;
  onQueryChange?: (value: string) => void;
  actions?: React.ReactNode;
  className?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  queryLabel?: React.ReactNode;
}) {
  return (
    <div className={cn('flex min-h-11 items-center gap-2 border-b border-[var(--hz-ui-line)] bg-[var(--hz-ui-surface)] px-3 py-2', className)} data-hz-ui="query-bar">
      <div className="grid min-w-0 flex-1 grid-cols-[78px_minmax(0,1fr)] items-center overflow-hidden border border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-control)]">
        <span className="border-r border-[var(--hz-ui-line-soft)] px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">
          {queryLabel}
        </span>
        <input
          {...inputProps}
          value={query}
          onChange={event => onQueryChange?.(event.target.value)}
          className={cn('h-8 min-w-0 bg-transparent px-3 font-mono text-[12px] text-[#dbe4f0] outline-none placeholder:text-[#6f7788]', inputProps?.className)}
          placeholder={inputProps?.placeholder || 'resource.type = mysql AND status != down'}
        />
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function HzExplorerFrame({
  eyebrow,
  title,
  description,
  actions,
  tabs,
  queryBar,
  filterRail,
  metricStrip,
  children,
  mainId = 'hz-ui-main',
  mainLabel,
  skipLinkLabel = 'Skip to workbench',
  filterRailLabel = 'Workbench filters',
  className,
  ...props
}: Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> & {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  queryBar?: React.ReactNode;
  filterRail?: React.ReactNode;
  metricStrip?: React.ReactNode;
  children: React.ReactNode;
  mainId?: string;
  mainLabel?: string;
  skipLinkLabel?: React.ReactNode;
  filterRailLabel?: string;
  className?: string;
}) {
  const resolvedMainLabel = mainLabel || `${stringifyNode(title, 'Explorer')} workbench`;

  return (
    <div
      {...props}
      className={cn('-mx-4 -mb-3 -mt-4 min-h-[calc(100vh-64px)] overflow-hidden bg-[var(--hz-ui-canvas)] text-[#f2f5f8] sm:-mx-6', className)}
      data-hz-density="operator-compact"
      data-hz-ui="explorer-frame"
      data-hz-viewport-guard="single-column-first"
    >
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:border focus:border-[var(--hz-ui-accent)] focus:bg-[var(--hz-ui-surface)] focus:px-3 focus:py-2 focus:text-[12px] focus:font-semibold focus:text-white"
        data-hz-ui="skip-link"
        href={`#${mainId}`}
      >
        {skipLinkLabel}
      </a>
      <header className="border-b border-[var(--hz-ui-line)] bg-[var(--hz-ui-surface)]">
        <div className="flex flex-col gap-3 px-4 py-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            {eyebrow ? <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7e8494]">{eyebrow}</div> : null}
            <h1 className="mt-1 text-[18px] font-semibold leading-tight text-[#f5f7fb]">{title}</h1>
            {description ? <p className="mt-1 max-w-[920px] text-[12px] leading-5 text-[#8f99ab]">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {tabs ? <div className="border-t border-[var(--hz-ui-line-soft)] px-4 py-2">{tabs}</div> : null}
      </header>
      <div
        className={cn(
          'grid min-h-[calc(100vh-162px)] grid-cols-1 overflow-hidden',
          filterRail ? 'lg:grid-cols-[248px_minmax(0,1fr)]' : 'lg:grid-cols-1'
        )}
        data-hz-layout-region="workbench-grid"
      >
        {filterRail ? (
          <aside
            aria-label={filterRailLabel}
            className="min-w-0 overflow-hidden border-b border-[var(--hz-ui-line-soft)] lg:border-b-0 lg:border-r"
            data-hz-layout-region="filter-rail"
          >
            {filterRail}
          </aside>
        ) : null}
        <main
          aria-label={resolvedMainLabel}
          className="min-w-0 overflow-hidden focus:outline-none"
          id={mainId}
          tabIndex={-1}
        >
          {queryBar}
          {metricStrip}
          <div className="min-w-0 overflow-hidden">{children}</div>
        </main>
      </div>
    </div>
  );
}
