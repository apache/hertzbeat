import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('next/image', () => ({
  default: ({ alt, priority: _priority, ...props }: React.ComponentProps<'img'> & { priority?: boolean }) => (
    <img alt={alt} {...props} />
  )
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/overview',
  useRouter: () => ({
    push: vi.fn()
  })
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({ locale: 'zh-CN' }),
    locale: 'zh-CN',
    locales: ['en-US', 'zh-CN'],
    setLocale: vi.fn(async () => undefined)
  })
}));

vi.mock('@/components/shell/locale-option-list', () => ({
  LocaleOptionList: () => <div data-locale-option-list="true" />
}));

vi.mock('@/components/shell/auth-gate', () => ({
  AuthGate: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('@/components/shell/app-sidebar', () => ({
  AppSidebar: () => <aside data-app-sidebar="true">sidebar</aside>
}));

vi.mock('@/lib/api-client', () => ({
  apiGet: vi.fn(),
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn()
}));

vi.mock('@/lib/app-frame-state', () => ({
  isStandaloneRoute: () => false,
  shouldLoadHeaderRealtime: () => false,
  shouldLoadHeaderState: () => false
}));

vi.mock('@/lib/alert-manage/query-state', () => ({
  buildAlertListUrl: () => '/alert'
}));

vi.mock('@/lib/passport-login/controller', () => ({
  buildLoginRedirectHref: () => '/passport/login'
}));

vi.mock('@/lib/workbench-theme', () => ({
  bootstrapWorkbenchTheme: vi.fn()
}));

vi.mock('@/lib/utils', () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ')
}));

const setupT = createTranslatorMock({ locale: 'zh-CN' });

const emptySetupState = {
  monitorTotal: 0,
  collectorTotal: 0,
  entityTotal: 0,
  hasEvidenceLinked: false,
  definitionCount: 0,
  governanceCount: 0
};

describe('app frame chrome', () => {
  it('loads header shell primitives from a lightweight UI subpath instead of the full UI barrel', () => {
    const source = readFileSync(resolve(__dirname, 'app-frame.tsx'), 'utf8');

    expect(source).toContain("from '@hertzbeat/ui/shell'");
    expect(source).not.toContain("from '@hertzbeat/ui'");
  });

  it('keeps locale menu chrome on the lightweight shell UI subpath', () => {
    const source = readFileSync(resolve(__dirname, 'locale-option-list.tsx'), 'utf8');

    expect(source).toContain("from '@hertzbeat/ui/shell'");
    expect(source).not.toContain("from '@hertzbeat/ui'");
  });

  it('does not keep the startup baseline once live header setup state resolves empty', async () => {
    const { buildSetupSummary } = await import('./app-frame');
    const summary = buildSetupSummary(emptySetupState, setupT);

    expect(summary.completedCount).toBe(0);
    expect(summary.progressPercent).toBe(0);
    expect(summary.headline).toBe('你已完成 0% 的平台配置');
  }, 15000);

  it('keeps the startup setup baseline on the entity create route when the live setup state is empty', async () => {
    const { buildRouteSetupSummary } = await import('./app-frame');
    const summary = buildRouteSetupSummary('/entities/new', emptySetupState, setupT);

    expect(summary.completedCount).toBe(5);
    expect(summary.progressPercent).toBe(83);
    expect(summary.headline).toBe('你已完成 83% 的平台配置');
  }, 15000);

  it('keeps the startup setup baseline on the entity import route when the live setup state is empty', async () => {
    const { buildRouteSetupSummary } = await import('./app-frame');
    const summary = buildRouteSetupSummary('/entities/import', emptySetupState, setupT);

    expect(summary.completedCount).toBe(5);
    expect(summary.progressPercent).toBe(83);
    expect(summary.headline).toBe('你已完成 83% 的平台配置');
  });

  it('keeps the startup setup baseline on the entity discovery route when the live setup state is empty', async () => {
    const { buildRouteSetupSummary } = await import('./app-frame');
    const summary = buildRouteSetupSummary('/entities/discovery', emptySetupState, setupT);

    expect(summary.completedCount).toBe(5);
    expect(summary.progressPercent).toBe(83);
    expect(summary.headline).toBe('你已完成 83% 的平台配置');
  });

  it('keeps the startup setup baseline on overview routes when the live setup state is empty', async () => {
    const { buildRouteSetupSummary } = await import('./app-frame');

    for (const pathname of ['/overview', '/dashboard']) {
      const summary = buildRouteSetupSummary(pathname, emptySetupState, setupT);

      expect(summary.completedCount).toBe(5);
      expect(summary.progressPercent).toBe(83);
      expect(summary.headline).toBe('你已完成 83% 的平台配置');
    }
  });

  it('keeps the startup setup baseline on dark-ops compatibility routes when the live setup state is empty', async () => {
    const { buildRouteSetupSummary } = await import('./app-frame');

    for (const pathname of ['/incidents', '/actions']) {
      const summary = buildRouteSetupSummary(pathname, emptySetupState, setupT);

      expect(summary.completedCount).toBe(5);
      expect(summary.progressPercent).toBe(83);
      expect(summary.headline).toBe('你已完成 83% 的平台配置');
    }
  });

  it('keeps the startup setup baseline on the log stream compatibility route when the live setup state is empty', async () => {
    const { buildRouteSetupSummary } = await import('./app-frame');
    const summary = buildRouteSetupSummary('/log/stream', emptySetupState, setupT);

    expect(summary.completedCount).toBe(5);
    expect(summary.progressPercent).toBe(83);
    expect(summary.headline).toBe('你已完成 83% 的平台配置');
  });

  it('keeps the startup setup baseline on the OTLP intake route when the live setup state is empty', async () => {
    const { buildRouteSetupSummary } = await import('./app-frame');
    const summary = buildRouteSetupSummary('/ingestion/otlp', emptySetupState, setupT);

    expect(summary.completedCount).toBe(5);
    expect(summary.progressPercent).toBe(83);
    expect(summary.headline).toBe('你已完成 83% 的平台配置');
  });

  it('keeps the startup setup baseline on entity definition routes when the live setup state is empty', async () => {
    const { buildRouteSetupSummary } = await import('./app-frame');
    const summary = buildRouteSetupSummary('/entities/1/definition', emptySetupState, setupT);

    expect(summary.completedCount).toBe(5);
    expect(summary.progressPercent).toBe(83);
    expect(summary.headline).toBe('你已完成 83% 的平台配置');
  });

  it('keeps the live empty setup state on the entity edit route', async () => {
    const { buildRouteSetupSummary } = await import('./app-frame');
    const summary = buildRouteSetupSummary('/entities/1/edit', emptySetupState, setupT);

    expect(summary.completedCount).toBe(0);
    expect(summary.progressPercent).toBe(0);
    expect(summary.headline).toBe('你已完成 0% 的平台配置');
  });

  it('renders shared header utility triggers with icon-only parity chrome on ops routes', async () => {
    const { AppFrame } = await import('./app-frame');

    const html = renderToStaticMarkup(
      <AppFrame>
        <div>overview-body</div>
      </AppFrame>
    );

    expect(html).toContain('data-app-frame-icon-trigger="github"');
    expect(html).toContain('data-app-frame-icon-trigger="menu"');
    expect(html).toContain('data-app-frame-icon-trigger="notify"');
    expect(html).toContain('data-app-frame-header-realtime-sse-contract="angular-alert-and-manager-sse"');
    expect(html).toContain('data-app-frame-header-realtime-sse-owner="route-realtime-sse-contract"');
    expect(html).toContain('data-app-frame-header-realtime-alert-source="/api/alert/sse/subscribe"');
    expect(html).toContain('data-app-frame-header-realtime-manager-source="/api/manager/sse/subscribe"');
    expect(html).toContain('data-app-frame-icon-trigger="mute"');
    expect(html).toContain('data-hz-header-icon-button-owner="hertzbeat-ui-header-icon-button"');
    expect(html).toContain('data-hz-header-icon-button-density="angular-header-item"');
    expect(html).toContain('data-app-frame-mute-state="muted"');
    expect(html).toContain('data-app-frame-mute-save-lifecycle="angular-success-only-state-update"');
    expect(html).toContain('data-app-frame-mute-save-lifecycle-owner="route-action-state-contract"');
    expect(html).toContain('data-app-frame-icon-trigger="lock"');
    expect(html).toContain('data-app-frame-icon-trigger="settings"');
    expect(html).toContain('data-app-frame-locale-reload-contract="angular-load-use-layout-reload"');
    expect(html).toContain('data-app-frame-locale-reload-owner="route-locale-reload-contract"');
    expect(html).toContain('data-app-frame-icon-trigger="user"');
    expect(html).toContain('data-app-frame-user-name="admin"');
    expect(html).toContain('data-app-frame-user-role="unknown"');
    expect(html).toContain('data-app-frame-user-logout-lifecycle-contract="angular-clear-then-passport-login"');
    expect(html).toContain('data-app-frame-user-logout-lifecycle-owner="route-session-contract"');
    expect(html).toContain('data-app-frame-about-closable-contract="angular-nz-closable-false"');
    expect(html).toContain('data-app-frame-about-cancel-contract="angular-on-cancel"');
    expect(html).toContain('data-app-frame-glyph="notify-bell"');
    expect(html).toContain('data-app-frame-glyph="mute-megaphone"');
    expect(html).toContain('data-app-frame-glyph="settings-gear"');
    expect(html).toContain('data-app-frame-user-avatar="angular-circle"');
    expect(html).toContain('开始使用');
    expect(html).toContain('data-app-frame-setup-progress="angular-reference"');
    expect(html).toContain('style="width:83%"');
    expect(html).not.toContain('common.setup');
    expect(html).toContain('data-platform-footer="angular-footer"');
    expect(html).toContain('class="relative flex min-h-0 min-w-0 flex-col self-stretch"');
    expect(html).toContain('data-platform-main-scroll="content-flow"');
    expect(html).toContain('data-platform-footer-placement="flow-end-or-viewport-bottom"');
    expect(html).toContain('Apache HertzBeat™ v1.8.0');
    expect(html).not.toContain('遵循 Apache License, Version 2.0 授权');
    expect(html).not.toContain('Apache License, Version 2.0');
    expect(html).toContain('data-shell-ai-chat-launcher="angular-ai-chat"');
    expect(html).toContain('class="sr-only">打开 AI 助手</span>');
    expect(html).toContain('class="sr-only">GitHub</span>');
    expect(html).toContain('class="sr-only">菜单</span>');
    expect(html).toContain('class="sr-only">通知</span>');
    expect(html).toContain('class="sr-only">取消静音</span>');
    expect(html).toContain('class="sr-only">锁屏</span>');
    expect(html).toContain('class="sr-only">设置</span>');
    expect(html).toContain('class="sr-only">用户菜单：admin</span>');
    expect(html).toContain('placeholder="询问助手"');
    expect(html).toContain('aria-label="发送提示"');
    expect(html).toContain('overview-body');
  });

  it('keeps the fullscreen settings action synchronized with the Angular header-fullscreen contract', () => {
    const source = readFileSync(resolve(__dirname, 'app-frame.tsx'), 'utf8');

    expect(source).toContain('HzHeaderMenuAction');
    expect(source).toContain('const [fullscreenActive, setFullscreenActive] = useState(false)');
    expect(source).toContain("const fullscreenLabel = fullscreenActive ? t('menu.fullscreen.exit') : t('menu.fullscreen')");
    expect(source).toContain('document.fullscreenElement');
    expect(source).toContain('document.addEventListener(\'fullscreenchange\', syncFullscreenStatus)');
    expect(source).toContain('document.removeEventListener(\'fullscreenchange\', syncFullscreenStatus)');
    expect(source).toContain('document.exitFullscreen()');
    expect(source).toContain('document.documentElement.requestFullscreen()');
    expect(source).toContain('data-app-frame-settings-fullscreen-action="angular-toggle"');
    expect(source).toContain("state={fullscreenActive ? 'active' : 'inactive'}");
    expect(source).toContain('data-app-frame-glyph="fullscreen-exit"');
    expect(source).toContain('data-app-frame-glyph="fullscreen-enter"');
  });

  it('keeps the locale settings action on the Angular header-i18n reload contract', () => {
    const source = readFileSync(resolve(__dirname, 'app-frame.tsx'), 'utf8');
    const localeReloadSource = readFileSync(resolve(__dirname, '../../lib/shell/locale-reload.ts'), 'utf8');

    expect(source).toContain('showHeaderLocaleReloadSpinner()');
    expect(source).toContain('await setLocale(nextLocale);');
    expect(source).toContain('window.location.reload();');
    expect(source).toContain('data-app-frame-locale-reload-contract="angular-load-use-layout-reload"');
    expect(source).toContain('data-app-frame-locale-reload-owner="route-locale-reload-contract"');
    expect(localeReloadSource).toContain("HEADER_LOCALE_RELOAD_SPINNER_CLASS = 'page-loading ant-spin ant-spin-lg ant-spin-spinning'");
    expect(localeReloadSource).toContain("HEADER_LOCALE_RELOAD_SPINNER_MARKER = 'angular-header-i18n-reload'");
    expect(localeReloadSource).toContain('ant-spin-dot ant-spin-dot-spin');
  });

  it('keeps the AI chat launcher on the Angular modal path instead of redirecting to overview query state', () => {
    const source = readFileSync(resolve(__dirname, 'app-frame.tsx'), 'utf8');

    expect(source).toContain("data-app-frame-ai-chat-input=\"angular-header-ai-chat\"");
    expect(source).toContain('data-app-frame-ai-chat-initial-message-contract="angular-open-modal-initial-message"');
    expect(source).toContain('data-app-frame-ai-chat-initial-message-owner="route-ai-chat-modal-contract"');
    expect(source).toContain('data-shell-ai-chat-launcher="angular-ai-chat"');
    expect(source).toContain('data-app-frame-ai-chat-launcher-contract="angular-empty-modal"');
    expect(source).toContain('data-app-frame-ai-chat-config-save-lifecycle-contract="angular-validate-save-close-refresh"');
    expect(source).toContain('data-app-frame-ai-chat-config-save-lifecycle-owner="route-ai-chat-config-contract"');
    expect(source).toContain('data-app-frame-ai-chat-conversation-action-lifecycle-contract="angular-create-select-delete-fallback"');
    expect(source).toContain('data-app-frame-ai-chat-conversation-action-lifecycle-owner="route-ai-chat-conversation-contract"');
    expect(source).toContain('data-app-frame-ai-chat-schedule-action-lifecycle-contract="angular-load-create-toggle-revert-confirm-update-delete"');
    expect(source).toContain('data-app-frame-ai-chat-schedule-action-lifecycle-owner="route-ai-chat-schedule-contract"');
    expect(source).toContain('data-app-frame-ai-chat-stream-history-lifecycle-contract="angular-push-user-placeholder-sse-skill-report-refresh"');
    expect(source).toContain('data-app-frame-ai-chat-stream-history-lifecycle-owner="route-ai-chat-stream-contract"');
    expect(source).toContain('data-app-frame-ai-chat-owner="hertzbeat-ui-ai-chat-modal"');
    expect(source).toContain("data-app-frame-ai-chat-initial-message-contract={aiInitialPrompt ? 'angular-open-modal-initial-message' : 'angular-empty-modal'}");
    expect(source).toContain('void loadAiProviderConfig(true)');
    expect(source).toContain("setAiConfigStatusLabelKey('ai.chat.config.provider.required')");
    expect(source).toContain("setAiConfigStatusLabelKey('ai.chat.config.api-key.required')");
    expect(source).toContain("setAiConfigStatusLabelKey('ai.chat.config.base-url.required')");
    expect(source).toContain("setAiConfigStatusLabelKey('ai.chat.config.model.required')");
    expect(source).toContain('loadAiChatConversations()');
    expect(source).toContain('loadAiChatConversationHistory(selectedAiConversationId)');
    expect(source).toContain('createAiChatConversation()');
    expect(source).toContain("setAiNewConversationStatus('creating')");
    expect(source).toContain('setSelectedAiConversationId(next.conversation.id)');
    expect(source).toContain('deleteAiChatConversation(conversationId)');
    expect(source).toContain("setAiDeleteConversationStatus('confirming')");
    expect(source).toContain("setAiDeleteConversationStatus('deleting')");
    expect(source).toContain('const conversations = aiConversations.conversations.filter');
    expect(source).toContain('await createNewAiConversation();');
    expect(source).toContain('conversationStatus={aiConversations.status}');
    expect(source).toContain('conversationStatusLabel={t(aiConversations.statusLabelKey)}');
    expect(source).toContain('newChatStatus={aiNewConversationStatus}');
    expect(source).toContain('onNewConversation={createNewAiConversation}');
    expect(source).toContain('deleteStatus={aiDeleteConversationStatus}');
    expect(source).toContain('deleteConversationId={aiDeleteConversationId}');
    expect(source).toContain('onConversationDeleteConfirm={confirmDeleteAiConversation}');
    expect(source).toContain('setAiDraftMessage(nextPrompt)');
    expect(source).toContain('setAiLocalMessages(current =>');
    expect(source).toContain('const nextContent = processAiChatStreamContent(`${lastMessage.content}${content}`);');
    expect(source).toContain('content.substring(markerIndex + AI_CHAT_SKILL_REPORT_MARKER.length).replace(/^\\n+/, \'\')');
    expect(source).toContain('appendOfflineAiAssistantResponse()');
    expect(source).toContain('streamAiChatResponse(messageContent');
    expect(source).toContain('onChunk: chunk => appendAiStreamChunk(chunk.content)');
    expect(source).toContain('replaceLastStreamingAiAssistantMessage(current, t(');
    expect(source).toContain("const AI_CHAT_SKILL_REPORT_MARKER = '[[SKILL_REPORT]]'");
    expect(source).toContain('void refreshAiConversationAfterStream(streamConversationId)');
    expect(source).toContain("content: t('ai.chat.offline.response')");
    expect(source).toContain('loadAiChatProviderConfig()');
    expect(source).toContain('saveAiChatProviderConfig(nextConfig)');
    expect(source).toContain("if (result.status === 'saved')");
    expect(source).toContain('setAiConfigOpen(false)');
    expect(source).toContain('buildDefaultAiChatProviderConfig()');
    expect(source).toContain('configOpen={aiConfigOpen}');
    expect(source).toContain("configTriggerLabel={t('ai.chat.modify-api-key')}");
    expect(source).toContain('configProviderOptions={AI_CHAT_PROVIDER_OPTIONS}');
    expect(source).toContain('configValue={aiProviderConfig}');
    expect(source).toContain('onConfigOpen={openAiProviderConfig}');
    expect(source).toContain('onConfigSave={saveAiProviderConfig}');
    expect(source).toContain('onConfigResetDefaults={resetAiProviderDefaults}');
    expect(source).toContain('onConfigChange={changeAiProviderConfig}');
    expect(source).toContain('loadAiChatSchedules(selectedAiConversationId)');
    expect(source).toContain('loadAiChatScheduleSkills()');
    expect(source).toContain('createAiChatSchedule(selectedAiConversationId, aiScheduleDraft)');
    expect(source).toContain('setAiSchedules(current => current.map(row => String(row.id) === String(scheduleId) ? { ...row, enabled } : row));');
    expect(source).toContain('toggleAiChatSchedule(scheduleId, enabled)');
    expect(source).toContain('setAiSchedules(current => current.map(row => String(row.id) === String(scheduleId) ? { ...row, enabled: !enabled } : row));');
    expect(source).toContain('updateAiChatSchedule(aiScheduleEditDraft.id, selectedAiConversationId, aiScheduleEditDraft)');
    expect(source).toContain("setAiDeleteScheduleStatus('confirming')");
    expect(source).toContain("setAiDeleteScheduleStatus('deleting')");
    expect(source).toContain('deleteAiChatSchedule(scheduleId)');
    expect(source).toContain('scheduleOpen={aiScheduleOpen}');
    expect(source).toContain("scheduleTriggerLabel={t('ai.chat.schedule.button')}");
    expect(source).toContain('scheduleRows={aiSchedules}');
    expect(source).toContain('scheduleSkills={aiScheduleSkills}');
    expect(source).toContain('scheduleDraft={aiScheduleDraft}');
    expect(source).toContain('scheduleEditDraft={aiScheduleEditDraft}');
    expect(source).toContain('onScheduleOpen={openAiSchedulePanel}');
    expect(source).toContain('onScheduleCreate={createAiScheduleFromDraft}');
    expect(source).toContain('onScheduleToggle={toggleAiSchedule}');
    expect(source).toContain('onScheduleUpdate={updateAiScheduleFromDraft}');
    expect(source).toContain('scheduleDeleteStatus={aiDeleteScheduleStatus}');
    expect(source).toContain('scheduleDeleteScheduleId={aiDeleteScheduleId}');
    expect(source).toContain('onScheduleDeleteRequest={requestDeleteAiSchedule}');
    expect(source).toContain('onScheduleDeleteCancel={cancelDeleteAiSchedule}');
    expect(source).toContain('onScheduleDeleteConfirm={confirmDeleteAiSchedule}');
    expect(source).toContain('inputValue={aiDraftMessage}');
    expect(source).toContain('onInputChange={setAiDraftMessage}');
    expect(source).toContain('onSendMessage={sendAiMessage}');
    expect(source).toContain('sendStatus={aiSendStatus}');
    expect(source).toContain("streamingLabel={t('ai.chat.typing')}");
    expect(source).toContain('messageStatus={aiMessageStatus}');
    expect(source).toContain('messageStatusLabel={t(aiMessageStatusLabelKey)}');
    expect(source).toContain('conversationMessages={aiConversationMessageRows}');
    expect(source).toContain('const nextPrompt = initialPrompt.trim()');
    expect(source).toContain('setAiInitialPrompt(nextPrompt)');
    expect(source).toContain('setAiChatOpen(true)');
    expect(source).toContain('openAiChatModal(query)');
    expect(source).not.toContain('/overview?ai=');
  });

  it('keeps notification timestamp fallbacks localized', () => {
    const source = readFileSync(resolve(__dirname, 'app-frame.tsx'), 'utf8');

    expect(source).toContain('formatHeaderTime(item.activeAt, emptyValue)');
    expect(source).toContain("const emptyValue = t('common.none');");
    expect(source).not.toContain("if (!value) return '-'");
  });

  it('keeps the mute toggle action label synchronized for aria and screen readers', () => {
    const source = readFileSync(resolve(__dirname, 'app-frame.tsx'), 'utf8');
    const muteSource = readFileSync(resolve(__dirname, '../../lib/shell/header-mute.ts'), 'utf8');

    expect(source).toContain(
      "const notificationMuteLabel = notificationsMuted ? t('common.unmute') : t('common.mute');"
    );
    expect(source).toContain('loadHeaderMuteConfig()');
    expect(source).toContain('saveHeaderMuteConfig(nextMuted)');
    expect(muteSource).toContain("apiMessageGet<Partial<HeaderMuteConfig> | boolean>('/config/mute')");
    expect(muteSource).toContain("apiMessagePost<unknown>('/config/mute', { mute: muted })");
    expect(muteSource).toContain("status: 'error'");
    expect(source).toContain("window.Notification.requestPermission()");
    expect(source).toContain('<HzHeaderIconButton');
    expect(source).toContain('label={notificationMuteLabel}');
    expect(source).toContain("state={notificationsMuted ? 'active' : 'inactive'}");
    expect(source).toContain("data-app-frame-mute-state={notificationsMuted ? 'muted' : 'audible'}");
    expect(source).toContain('data-app-frame-mute-save-lifecycle="angular-success-only-state-update"');
    expect(source).toContain('data-app-frame-mute-save-lifecycle-owner="route-action-state-contract"');
    expect(source).toContain('<span>{notificationMuteLabel}</span>');
    expect(source).not.toContain("notificationsMuted ? t('common.mute') : t('common.unmute')");
    expect(source).not.toContain("window.localStorage.setItem(HEADER_MUTE_STORAGE_KEY");
  });

  it('keeps the header notification SSE, sound, and browser notification parity contract', () => {
    const source = readFileSync(resolve(__dirname, 'app-frame.tsx'), 'utf8');
    const realtimeSource = readFileSync(resolve(__dirname, '../../lib/shell/header-realtime.ts'), 'utf8');

    expect(source).toContain('HzHeaderRealtimeNotice');
    expect(source).toContain('HEADER_ALERT_SSE_URL');
    expect(source).toContain('HEADER_DUAL_SSE_CONTRACT');
    expect(source).toContain('HEADER_MANAGER_SSE_URL');
    expect(source).toContain('HEADER_ALERT_EVENT_TYPE');
    expect(source).toContain('HEADER_IMPORT_TASK_EVENT_TYPE');
    expect(source).toContain('new window.EventSource(HEADER_ALERT_SSE_URL)');
    expect(source).toContain('new window.EventSource(HEADER_MANAGER_SSE_URL)');
    expect(source).toContain('buildHeaderNoticeFromAlert(alert');
    expect(source).toContain('mergeHeaderNoticeEvent(current, notice)');
    expect(source).toContain('resolveHeaderAlertSoundSrc(locale)');
    expect(source).toContain("new window.Notification(t('alert.notify.title')");
    expect(source).toContain('notifiedAlertIdsRef.current.has(alert.id)');
    expect(source).toContain('data-app-frame-header-realtime-toast="angular-sse"');
    expect(source).toContain('data-app-frame-header-realtime-sse-contract={HEADER_DUAL_SSE_CONTRACT}');
    expect(source).toContain('data-app-frame-header-realtime-sse-owner="route-realtime-sse-contract"');
    expect(source).toContain('data-app-frame-header-realtime-alert-source={HEADER_ALERT_SSE_URL}');
    expect(source).toContain('data-app-frame-header-realtime-manager-source={HEADER_MANAGER_SSE_URL}');
    expect(source).toContain('data-app-frame-header-realtime-notice-owner="hertzbeat-ui-header-realtime-notice"');
    expect(realtimeSource).toContain("HEADER_ALERT_SSE_URL = '/api/alert/sse/subscribe'");
    expect(realtimeSource).toContain("HEADER_MANAGER_SSE_URL = '/api/manager/sse/subscribe'");
    expect(realtimeSource).toContain("HEADER_DUAL_SSE_CONTRACT = 'angular-alert-and-manager-sse'");
    expect(realtimeSource).toContain("HEADER_ALERT_SOUND_CN = '/assets/audio/default-alert-CN.mp3'");
    expect(realtimeSource).toContain("HEADER_ALERT_SOUND_EN = '/assets/audio/default-alert-EN.mp3'");
  });

  it('keeps the user menu about action on the Angular modal contract', () => {
    const source = readFileSync(resolve(__dirname, 'app-frame.tsx'), 'utf8');
    const aboutSource = readFileSync(resolve(__dirname, '../../lib/shell/about.ts'), 'utf8');
    const sessionClientSource = readFileSync(resolve(__dirname, '../../lib/session-client.ts'), 'utf8');

    expect(source).toContain('HzUserMenuAction');
    expect(source).toContain('readClientSessionUserSnapshot()');
    expect(source).toContain("const currentUserName = sessionUser?.name || 'admin'");
    expect(source).toContain('data-app-frame-user-name={currentUserName}');
    expect(source).toContain("data-app-frame-user-role={sessionUser?.role || 'unknown'}");
    expect(source).toContain('data-app-frame-user-menu="angular-width-sm"');
    expect(source).toContain('data-app-frame-user-action="setting"');
    expect(source).toContain('data-app-frame-user-action="logout"');
    expect(source).toContain('data-app-frame-user-logout-lifecycle="angular-clear-then-passport-login"');
    expect(source).toContain('data-app-frame-user-logout-lifecycle-owner="route-session-contract"');
    expect(source).toContain('data-app-frame-user-action="about"');
    expect(source).toContain("t('menu.extras.setting')");
    expect(source).toContain("t('menu.account.logout')");
    expect(source).toContain("t('menu.extras.about')");
    expect(source).toContain('data-app-frame-user-menu-icon="tool"');
    expect(source).toContain('data-app-frame-user-menu-icon="logout"');
    expect(source).toContain('data-app-frame-user-menu-icon="environment"');
    expect(source).toContain('HzAboutModalSurface');
    expect(source).toContain('data-app-frame-user-about-action="angular-modal"');
    expect(source).toContain('data-app-frame-about-modal="angular-user-menu"');
    expect(source).toContain('data-app-frame-about-closable-contract="angular-nz-closable-false"');
    expect(source).toContain('data-app-frame-about-cancel-contract="angular-on-cancel"');
    expect(source).toContain('openAboutModal');
    expect(source).toContain('readAboutNotShowNextLogin()');
    expect(source).toContain('writeAboutNotShowNextLogin(checked)');
    expect(source).toContain('consumeAboutAutoShowAfterLogin()');
    expect(source).toContain('ABOUT_AUTO_CLOSE_AFTER_LOGIN_MS = 20_000');
    expect(source).toContain('setAboutOpen(true);');
    expect(source).toContain('window.setTimeout(() => {');
    expect(source).toContain('setAboutOpen(false);');
    expect(source).toContain("releaseHref={`https://github.com/apache/hertzbeat/releases/tag/${PLATFORM_FOOTER_VERSION}`}");
    expect(source).toContain("t('about.not-show-next-login')");
    expect(source).toContain("t('about.point.6')");
    expect(source).toContain("t('about.upgrade')");
    expect(aboutSource).toContain("ABOUT_NOT_SHOW_NEXT_LOGIN_KEY = 'NOT_SHOW_ABOUT_NEXT_LOGIN'");
    expect(aboutSource).toContain("ABOUT_AUTO_SHOW_AFTER_LOGIN_KEY = 'HB_ABOUT_AUTO_SHOW_AFTER_LOGIN'");
    expect(aboutSource).toContain('markAboutAutoShowAfterLogin');
    expect(aboutSource).toContain('consumeAboutAutoShowAfterLogin');
    expect(sessionClientSource).toContain("HB_UI_SESSION_USER_KEY = 'HB_UI_SESSION_USER'");
    expect(sessionClientSource).toContain('readClientSessionUserSnapshot');
    expect(sessionClientSource).toContain('clearClientSessionUserSnapshot();');
    expect(sessionClientSource).toContain('finally {');
    expect(sessionClientSource).toContain('clearClientSessionMarker();');
    expect(source).toContain('void clearClientSession().finally(() => {');
    expect(source).toContain('window.location.href = buildLoginRedirectHref(undefined, process.env.NEXT_PUBLIC_LOGIN_PATH);');
    expect(source).not.toContain('href="https://hertzbeat.apache.org/docs/"\\n                          target="_blank"');
    expect(source).not.toContain("t('common.about')");
    expect(source).not.toContain("t('common.logout')");
  });

  it('lets OTLP metrics remove the app-frame padding shell instead of nesting another workbench layer', async () => {
    const { buildContentFrameClassName, buildContentFrameShellKind } = await import('./app-frame');

    expect(buildContentFrameShellKind('/overview')).toBe('standard');
    expect(buildContentFrameClassName('/overview')).toBe('px-4 pb-3 pt-4 sm:px-6');

    expect(buildContentFrameShellKind('/ingestion/otlp/metrics')).toBe('flat-workbench');
    expect(buildContentFrameShellKind('/ingestion/otlp/metrics?timeRange=last-30m')).toBe('flat-workbench');
    expect(buildContentFrameClassName('/ingestion/otlp/metrics')).toBe('px-0 pb-3 pt-0 sm:px-0');
    expect(buildContentFrameClassName('/ingestion/otlp/metrics')).not.toContain('px-4');
    expect(buildContentFrameClassName('/ingestion/otlp/metrics')).not.toContain('pt-4');
  });
});
