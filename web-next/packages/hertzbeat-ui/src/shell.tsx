'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const controlFocusClassName =
  'focus-visible:border-[var(--hz-ui-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hz-ui-active-soft)]';

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
      welcomeTitle,
      welcomeDescription,
      inputPlaceholder,
      inputReadOnly,
      inputValue = '',
      inputHint,
      closeLabel,
      sendLabel = 'Send',
      sendStatus = 'idle',
      configOpen = false,
      configTitle,
      configStatus,
      configStatusLabel,
      configTriggerLabel,
      scheduleOpen = false,
      scheduleTitle,
      scheduleStatus,
      scheduleStatusLabel,
      scheduleTriggerLabel,
      conversations = [],
      conversationStatus,
      conversationStatusLabel,
      conversationMessages,
      previewMessages,
      messageStatus,
      messageStatusLabel,
      onNewConversation,
      onConversationSelect,
      onInputChange,
      onSendMessage,
      onConfigOpen,
      onConfigClose,
      onScheduleOpen,
      onScheduleClose,
      onClose,
      ...props
    },
    ref
  ) => {
    const messages = conversationMessages?.length ? conversationMessages : previewMessages || [];

    return (
      <div
        ref={ref}
        className={cn('fixed inset-0 z-50 flex items-end justify-end bg-black/35 p-4', className)}
        role="dialog"
        aria-modal="true"
        data-hz-ui="ai-chat-modal-surface"
        {...props}
      >
        <section className="flex h-[min(760px,calc(100vh-32px))] w-[min(920px,calc(100vw-32px))] flex-col rounded-[6px] border border-[var(--hz-ui-line-soft)] bg-[#10141b] shadow-[0_24px_70px_rgba(0,0,0,.42)]">
          <header className="flex items-start justify-between gap-4 border-b border-[var(--hz-ui-line-soft)] px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold text-[#f4f7fb]">{title}</div>
              {subtitle ? <div className="mt-0.5 truncate text-[12px] text-[#8792a5]">{subtitle}</div> : null}
            </div>
            <button
              type="button"
              className={cn('inline-flex h-7 w-7 items-center justify-center rounded-[2px] text-[#8792a5] hover:bg-[#1a202c] hover:text-[#f4f7fb]', controlFocusClassName)}
              aria-label={closeLabel}
              onClick={onClose}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>
          <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)]">
            <aside className="min-h-0 border-r border-[var(--hz-ui-line-soft)] p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8792a5]">{conversationsTitle}</div>
              <button type="button" className="mt-3 h-8 w-full rounded-[3px] bg-[var(--hz-ui-accent)] text-[12px] font-semibold text-white" onClick={onNewConversation}>
                {newChatLabel}
              </button>
              {conversationStatusLabel ? (
                <div className="mt-2 text-[11px] text-[#8792a5]" data-hz-ai-chat-conversation-status={conversationStatus}>
                  {conversationStatusLabel}
                </div>
              ) : null}
              <div className="mt-3 space-y-1">
                {conversations.map(conversation => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={cn(
                      'w-full rounded-[3px] px-2 py-2 text-left text-[12px] text-[#c6cfdd] hover:bg-[#1a202c]',
                      conversation.active && 'bg-[#1f2937] text-white'
                    )}
                    onClick={() => onConversationSelect?.(conversation.id)}
                  >
                    <span className="block truncate">{conversation.title}</span>
                    {conversation.subtitle ? <span className="mt-0.5 block truncate text-[11px] text-[#8792a5]">{conversation.subtitle}</span> : null}
                  </button>
                ))}
              </div>
            </aside>
            <main className="flex min-h-0 flex-col">
              <div className="flex items-center gap-2 border-b border-[var(--hz-ui-line-soft)] px-4 py-2">
                <button type="button" className="rounded-[3px] border border-[var(--hz-ui-line-soft)] px-2 py-1 text-[12px] text-[#c6cfdd]" onClick={onConfigOpen}>
                  {configTriggerLabel}
                </button>
                <button type="button" className="rounded-[3px] border border-[var(--hz-ui-line-soft)] px-2 py-1 text-[12px] text-[#c6cfdd]" onClick={onScheduleOpen}>
                  {scheduleTriggerLabel}
                </button>
                {configOpen ? (
                  <span className="text-[11px] text-[#8792a5]" data-hz-ai-chat-config-status={configStatus}>
                    {configTitle} {configStatusLabel}
                    <button type="button" className="ml-2 underline" onClick={onConfigClose}>close</button>
                  </span>
                ) : null}
                {scheduleOpen ? (
                  <span className="text-[11px] text-[#8792a5]" data-hz-ai-chat-schedule-status={scheduleStatus}>
                    {scheduleTitle} {scheduleStatusLabel}
                    <button type="button" className="ml-2 underline" onClick={onScheduleClose}>close</button>
                  </span>
                ) : null}
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-auto px-4 py-3">
                {messages.length ? (
                  messages.map((message, index) => (
                    <article key={`${message.role}-${index}`} className="rounded-[4px] border border-[var(--hz-ui-line-soft)] bg-[#0d1117] px-3 py-2">
                      <div className="text-[11px] font-semibold uppercase text-[#8792a5]">{message.label}</div>
                      <div className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-[#d8e0ec]">{message.content}</div>
                    </article>
                  ))
                ) : (
                  <article className="rounded-[4px] border border-[var(--hz-ui-line-soft)] bg-[#0d1117] px-3 py-2">
                    <div className="text-[13px] font-semibold text-[#f4f7fb]">{welcomeTitle}</div>
                    <div className="mt-1 text-[12px] leading-5 text-[#8792a5]">{welcomeDescription}</div>
                  </article>
                )}
                {messageStatusLabel ? (
                  <div className="text-[11px] text-[#8792a5]" data-hz-ai-chat-message-status={messageStatus}>
                    {messageStatusLabel}
                  </div>
                ) : null}
              </div>
              <footer className="border-t border-[var(--hz-ui-line-soft)] p-3">
                <div className="flex gap-2">
                  <textarea
                    className="min-h-[72px] flex-1 rounded-[3px] border border-[var(--hz-ui-line-soft)] bg-[#0d1117] px-3 py-2 text-[12px] text-[#f4f7fb]"
                    placeholder={inputPlaceholder}
                    readOnly={inputReadOnly}
                    value={inputValue}
                    onChange={event => onInputChange?.(event.currentTarget.value)}
                  />
                  <button
                    type="button"
                    className="h-[72px] rounded-[3px] bg-[var(--hz-ui-accent)] px-4 text-[12px] font-semibold text-white disabled:opacity-60"
                    disabled={sendStatus === 'sending'}
                    onClick={onSendMessage}
                  >
                    {sendLabel}
                  </button>
                </div>
                {inputHint ? <div className="mt-1 text-[11px] text-[#8792a5]">{inputHint}</div> : null}
              </footer>
            </main>
          </div>
        </section>
      </div>
    );
  }
);

HzAiChatModalSurface.displayName = 'HzAiChatModalSurface';

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
  (
    {
      abbr,
      label,
      selected = false,
      indicatorClassName,
      className,
      type = 'button',
      ...props
    },
    ref
  ) => (
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
      <span
        className="inline-flex min-w-5 items-center justify-center text-[14px] leading-none"
        data-hz-locale-menu-option-abbr="shared"
      >
        {abbr}
      </span>
      <span className="flex-1">{label}</span>
      {selected ? (
        <span
          className={cn('text-[11px] text-[hsl(var(--muted-foreground))]', indicatorClassName)}
          data-hz-locale-menu-option-indicator="selected"
        >
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
                key={link.href}
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
