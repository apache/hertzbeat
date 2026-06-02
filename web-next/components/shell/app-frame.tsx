'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellRing,
  Bot,
  ChevronDown,
  Github,
  Lock,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  Sparkles,
  MessageSquare,
  Maximize2,
  Minimize2,
  Send,
  Settings,
  Tags,
  Wrench
} from 'lucide-react';
import {
  HzAiChatModalSurface,
  HzAboutModalSurface,
  HzHeaderIconButton,
  HzHeaderMenuAction,
  HzHeaderRealtimeNotice,
  HzUserMenuAction,
  type HzAiChatConfigStatus,
  type HzAiChatProviderConfigValue,
  type HzAiChatScheduleDraft,
  type HzAiChatScheduleDeleteStatus,
  type HzAiChatScheduleRow,
  type HzAiChatScheduleStatus
} from '@hertzbeat/ui/shell';
import { useI18n } from '@/components/providers/i18n-provider';
import { LocaleOptionList } from '@/components/shell/locale-option-list';
import { AuthGate } from '@/components/shell/auth-gate';
import { AppSidebar } from '@/components/shell/app-sidebar';
import { PlatformCopyrightFooter } from './platform-copyright-footer';
import { Input } from '../ui/input';
import { apiGet } from '@/lib/api-client';
import { isStandaloneRoute, shouldLoadHeaderRealtime, shouldLoadHeaderState } from '@/lib/app-frame-state';
import { buildAlertListUrl } from '@/lib/alert-manage/query-state';
import {
  AI_CHAT_CONVERSATION_STATUS_LABEL_KEYS,
  AI_CHAT_MESSAGE_STATUS_LABEL_KEYS,
  AI_CHAT_MESSAGE_ROLE_LABEL_KEYS,
  createAiChatConversation,
  deleteAiChatConversation,
  loadAiChatConversationHistory,
  loadAiChatConversations,
  streamAiChatResponse,
  type AiChatConversationMessage,
  type AiChatConversationHistoryState,
  type AiChatConversationListState
} from '@/lib/ai-chat/conversations';
import {
  AI_CHAT_CONFIG_STATUS_LABEL_KEYS,
  AI_CHAT_PROVIDER_OPTIONS,
  applyAiChatProviderDefaults,
  buildDefaultAiChatProviderConfig,
  loadAiChatProviderConfig,
  saveAiChatProviderConfig
} from '@/lib/ai-chat/provider-config';
import {
  AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS,
  createAiChatSchedule,
  deleteAiChatSchedule,
  loadAiChatScheduleSkills,
  loadAiChatSchedules,
  toggleAiChatSchedule,
  updateAiChatSchedule
} from '@/lib/ai-chat/schedules';
import { buildLoginRedirectHref } from '@/lib/passport-login/controller';
import { clearClientSession, readClientSessionUserSnapshot } from '@/lib/session-client';
import { consumeAboutAutoShowAfterLogin, readAboutNotShowNextLogin, writeAboutNotShowNextLogin } from '@/lib/shell/about';
import { loadHeaderMuteConfig, saveHeaderMuteConfig } from '@/lib/shell/header-mute';
import { showHeaderLocaleReloadSpinner } from '@/lib/shell/locale-reload';
import {
  HEADER_ALERT_EVENT_TYPE,
  HEADER_ALERT_SSE_URL,
  HEADER_DUAL_SSE_CONTRACT,
  HEADER_IMPORT_TASK_EVENT_TYPE,
  HEADER_MANAGER_SSE_URL,
  buildHeaderNoticeFromAlert,
  buildManagerImportMessage,
  mergeHeaderNoticeEvent,
  parseHeaderSseJson,
  resolveHeaderAlertSoundSrc,
  type HeaderManagerImportEvent,
  type HeaderNoticeEvent,
  type HeaderRealtimeStatus
} from '@/lib/shell/header-realtime';
import { consumeWorkbenchLoad } from '@/lib/workbench-load-cache';
import { bootstrapWorkbenchTheme } from '@/lib/workbench-theme';
import type {
  AlertSummary,
  EntityDefinitionActivity,
  EntityDiscoveryGovernancePreset,
  EntitySummaryInfo,
  PageResult,
  SingleAlert,
  CollectorSummary
} from '@/lib/types';
import { cn } from '@/lib/utils';

const PLATFORM_FOOTER_VERSION = 'v1.8.0';
const ANGULAR_SETUP_BASELINE_COMPLETED = 5;
const ANGULAR_SETUP_BASELINE_TOTAL = 6;
const ANGULAR_SETUP_BASELINE_PERCENT = 83;
const APP_FRAME_HEADER_STATE_CACHE_TTL_MS = 60_000;
const AI_CHAT_SKILL_REPORT_MARKER = '[[SKILL_REPORT]]';
const ABOUT_AUTO_CLOSE_AFTER_LOGIN_MS = 20_000;

export type ContentFrameShellKind = 'standard' | 'flat-workbench';

export function buildContentFrameShellKind(pathname: string): ContentFrameShellKind {
  const pathOnly = pathname.split('?')[0] || pathname;
  return pathOnly === '/ingestion/otlp/metrics' || pathOnly.startsWith('/ingestion/otlp/metrics/')
    ? 'flat-workbench'
    : 'standard';
}

export function buildContentFrameClassName(pathname: string): string {
  return buildContentFrameShellKind(pathname) === 'flat-workbench' ? 'px-0 pb-3 pt-0 sm:px-0' : 'px-4 pb-3 pt-4 sm:px-6';
}

type SetupAction = 'entities' | 'monitors' | 'collector' | 'otlp' | 'discovery' | 'definition' | 'governance';

type SetupChecklistItem = {
  key: string;
  title: string;
  description: string;
  actionLabel: string;
  action: SetupAction;
  completed: boolean;
};

type SetupEntryOption = {
  key: string;
  title: string;
  description: string;
  action: SetupAction;
};

type SetupSummary = {
  loading: boolean;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  headline: string;
  nextTitle: string;
  nextCopy: string;
  nextActionLabel: string;
  checklist: SetupChecklistItem[];
  entryOptions: SetupEntryOption[];
};

type SetupSummaryData = {
  monitorTotal: number;
  collectorTotal: number;
  entityTotal: number;
  hasEvidenceLinked: boolean;
  definitionCount: number;
  governanceCount: number;
};

type HeaderNotice = HeaderNoticeEvent;

type HeaderRealtimeNotice = {
  status: Exclude<HeaderRealtimeStatus, 'connecting' | 'idle' | 'unsupported'> | 'live';
  title: string;
  description?: string;
  meta?: string;
};

function buildEmptySetupSummary(t: (key: string, params?: Record<string, string | number | null | undefined>) => string): SetupSummary {
  return {
    loading: true,
    completedCount: ANGULAR_SETUP_BASELINE_COMPLETED,
    totalCount: ANGULAR_SETUP_BASELINE_TOTAL,
    progressPercent: ANGULAR_SETUP_BASELINE_PERCENT,
    headline: t('layout.setup.progress.headline', { percent: ANGULAR_SETUP_BASELINE_PERCENT }),
    nextTitle: t('layout.setup.next.loading.title'),
    nextCopy: t('layout.setup.next.loading.copy'),
    nextActionLabel: t('layout.setup.next.loading.action'),
    checklist: [],
    entryOptions: [],
  };
}

function formatHeaderTime(value: number | null | undefined, fallback: string) {
  if (!value) return fallback;
  return new Date(value).toLocaleString();
}

function playHeaderAlertSound(locale: string, audioRef: React.MutableRefObject<HTMLAudioElement | null>) {
  if (typeof window === 'undefined' || !window.Audio) return;
  const audio = audioRef.current ?? new window.Audio();
  audioRef.current = audio;
  audio.src = resolveHeaderAlertSoundSrc(locale);
  audio.load();
  void audio.play().catch(() => undefined);
}

function showHeaderAlertNotification(
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string,
  navigateToAlertCenter: () => void
) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (window.Notification.permission !== 'granted') return;
  const notification = new window.Notification(t('alert.notify.title'), {
    body: t('alert.notify.body'),
    icon: '/assets/logo.svg'
  });
  notification.onclick = () => {
    window.focus();
    navigateToAlertCenter();
    notification.close();
  };
}

function resolveSetupActionHref(action: SetupAction) {
  switch (action) {
    case 'entities':
      return '/entities/new';
    case 'monitors':
      return '/monitors';
    case 'collector':
      return '/setting/collector';
    case 'otlp':
      return '/ingestion/otlp';
    case 'discovery':
      return '/entities/discovery';
    case 'definition':
      return '/entities/import';
    case 'governance':
      return '/entities';
    default:
      return '/overview';
  }
}

export function buildSetupSummary(
  data: SetupSummaryData,
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string
): SetupSummary {
  const checklist: SetupChecklistItem[] = [
    {
      key: 'collector',
      title: t('layout.setup.step.collector.title'),
      description: t('layout.setup.step.collector.copy'),
      actionLabel: t('layout.setup.step.collector.action'),
      action: 'collector',
      completed: data.collectorTotal > 0,
    },
    {
      key: 'entity',
      title: t('layout.setup.step.entity.title'),
      description: t('layout.setup.step.entity.copy'),
      actionLabel: t('layout.setup.step.entity.action'),
      action: 'entities',
      completed: data.entityTotal > 0,
    },
    {
      key: 'monitoring',
      title: t('layout.setup.step.monitoring.title'),
      description: t('layout.setup.step.monitoring.copy'),
      actionLabel: t('layout.setup.step.monitoring.action'),
      action: 'monitors',
      completed: data.monitorTotal > 0,
    },
    {
      key: 'telemetry',
      title: t('layout.setup.step.telemetry.title'),
      description: t('layout.setup.step.telemetry.copy'),
      actionLabel: t('layout.setup.step.telemetry.action'),
      action: 'discovery',
      completed: data.hasEvidenceLinked,
    },
    {
      key: 'definition',
      title: t('layout.setup.step.definition.title'),
      description: t('layout.setup.step.definition.copy'),
      actionLabel: t('layout.setup.step.definition.action'),
      action: 'definition',
      completed: data.definitionCount > 0,
    },
    {
      key: 'governance',
      title: t('layout.setup.step.governance.title'),
      description: t('layout.setup.step.governance.copy'),
      actionLabel: t('layout.setup.step.governance.action'),
      action: 'governance',
      completed: data.governanceCount > 0,
    },
  ];

  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const displayCompletedCount = completedCount;
  const progressPercent = totalCount === 0 ? 0 : Math.round((displayCompletedCount / totalCount) * 100);
  const nextItem = checklist.find(item => !item.completed);

  return {
    loading: false,
    completedCount: displayCompletedCount,
    totalCount,
    progressPercent,
    headline: t('layout.setup.progress.headline', { percent: progressPercent }),
    nextTitle: nextItem?.title || t('layout.setup.next.done.title'),
    nextCopy:
      nextItem?.description ||
      t('layout.setup.next.done.copy'),
    nextActionLabel: nextItem?.actionLabel || t('layout.setup.next.done.action'),
    checklist,
    entryOptions: [
      {
        key: 'entity',
        title: t('layout.setup.entry.entity.title'),
        description: t('layout.setup.entry.entity.copy'),
        action: 'entities',
      },
      {
        key: 'monitor',
        title: t('layout.setup.entry.monitor.title'),
        description: t('layout.setup.entry.monitor.copy'),
        action: 'monitors',
      },
      {
        key: 'collector',
        title: t('layout.setup.entry.collector.title'),
        description: t('layout.setup.entry.collector.copy'),
        action: 'collector',
      },
      {
        key: 'otlp',
        title: t('layout.setup.entry.otlp.title'),
        description: t('layout.setup.entry.otlp.copy'),
        action: 'otlp',
      },
    ],
  };
}

function hasEmptySetupState(data: SetupSummaryData) {
  return (
    data.monitorTotal === 0 &&
    data.collectorTotal === 0 &&
    data.entityTotal === 0 &&
    !data.hasEvidenceLinked &&
    data.definitionCount === 0 &&
    data.governanceCount === 0
  );
}

function shouldKeepAngularSetupBaseline(pathname: string, data: SetupSummaryData) {
  return (
    (
      pathname === '/overview' ||
      pathname === '/dashboard' ||
      pathname === '/incidents' ||
      pathname === '/actions' ||
      pathname === '/entities/new' ||
      pathname === '/entities/import' ||
      /^\/entities\/[^/]+\/definition$/.test(pathname) ||
      pathname === '/entities/discovery' ||
      pathname === '/log/stream' ||
      pathname === '/ingestion/otlp'
    ) &&
    hasEmptySetupState(data)
  );
}

function processAiChatStreamContent(content: string) {
  const markerIndex = content.indexOf(AI_CHAT_SKILL_REPORT_MARKER);
  if (markerIndex === -1) return content;
  return content.substring(markerIndex + AI_CHAT_SKILL_REPORT_MARKER.length).replace(/^\n+/, '');
}

function appendToLastStreamingAiAssistantMessage(messages: AiChatConversationMessage[], content: string): AiChatConversationMessage[] {
  const nextMessages = [...messages];
  const lastMessage = nextMessages[nextMessages.length - 1];
  if (lastMessage?.role === 'assistant') {
    const nextContent = processAiChatStreamContent(`${lastMessage.content}${content}`);
    nextMessages[nextMessages.length - 1] = {
      ...lastMessage,
      content: nextContent
    };
    return nextMessages;
  }

  return [
    ...nextMessages,
    {
      role: 'assistant',
      labelKey: AI_CHAT_MESSAGE_ROLE_LABEL_KEYS.assistant,
      content
    }
  ];
}

function replaceLastStreamingAiAssistantMessage(messages: AiChatConversationMessage[], content: string): AiChatConversationMessage[] {
  const nextMessages = [...messages];
  const lastMessage = nextMessages[nextMessages.length - 1];
  if (lastMessage?.role === 'assistant') {
    nextMessages[nextMessages.length - 1] = {
      ...lastMessage,
      content
    };
    return nextMessages;
  }

  return [
    ...nextMessages,
    {
      role: 'assistant',
      labelKey: AI_CHAT_MESSAGE_ROLE_LABEL_KEYS.assistant,
      content
    }
  ];
}

export function buildRouteSetupSummary(
  pathname: string,
  data: SetupSummaryData,
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string
) {
  if (shouldKeepAngularSetupBaseline(pathname, data)) {
    return buildEmptySetupSummary(t);
  }
  return buildSetupSummary(data, t);
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t, locale, locales, setLocale } = useI18n();
  const [sessionUser] = useState(() => readClientSessionUserSnapshot());
  const currentUserName = sessionUser?.name || 'admin';
  const emptyValue = t('common.none');
  const pathname = usePathname();
  const [setupOpen, setSetupOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [aboutNotShowNextLogin, setAboutNotShowNextLogin] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState('');
  const [aiConversations, setAiConversations] = useState<AiChatConversationListState>({
    status: 'loading',
    conversations: [],
    statusLabelKey: AI_CHAT_CONVERSATION_STATUS_LABEL_KEYS.loading
  });
  const [selectedAiConversationId, setSelectedAiConversationId] = useState<string | number | null>(null);
  const [aiConversationHistory, setAiConversationHistory] = useState<AiChatConversationHistoryState>({
    status: 'idle',
    messages: [],
    statusLabelKey: AI_CHAT_MESSAGE_STATUS_LABEL_KEYS.idle
  });
  const [aiDraftMessage, setAiDraftMessage] = useState('');
  const [aiLocalMessages, setAiLocalMessages] = useState<AiChatConversationMessage[]>([]);
  const [aiSendStatus, setAiSendStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [aiConfigOpen, setAiConfigOpen] = useState(false);
  const [aiProviderConfig, setAiProviderConfig] = useState<HzAiChatProviderConfigValue>(() => buildDefaultAiChatProviderConfig());
  const [aiConfigStatus, setAiConfigStatus] = useState<HzAiChatConfigStatus>('idle');
  const [aiConfigStatusLabelKey, setAiConfigStatusLabelKey] = useState(AI_CHAT_CONFIG_STATUS_LABEL_KEYS.idle);
  const [aiScheduleOpen, setAiScheduleOpen] = useState(false);
  const [aiScheduleStatus, setAiScheduleStatus] = useState<HzAiChatScheduleStatus>('idle');
  const [aiScheduleStatusLabelKey, setAiScheduleStatusLabelKey] = useState(AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.idle);
  const [aiSchedules, setAiSchedules] = useState<HzAiChatScheduleRow[]>([]);
  const [aiScheduleSkills, setAiScheduleSkills] = useState<Array<{ value: string; label: string }>>([]);
  const [aiScheduleDraft, setAiScheduleDraft] = useState<HzAiChatScheduleDraft>({ sopName: '', cronExpression: '', enabled: true });
  const [aiScheduleEditDraft, setAiScheduleEditDraft] = useState<(HzAiChatScheduleDraft & { id: string | number }) | null>(null);
  const [aiDeleteScheduleId, setAiDeleteScheduleId] = useState<string | number | null>(null);
  const [aiDeleteScheduleStatus, setAiDeleteScheduleStatus] = useState<HzAiChatScheduleDeleteStatus>('idle');
  const [aiNewConversationStatus, setAiNewConversationStatus] = useState<'idle' | 'creating' | 'error'>('idle');
  const [aiDeleteConversationId, setAiDeleteConversationId] = useState<string | number | null>(null);
  const [aiDeleteConversationStatus, setAiDeleteConversationStatus] = useState<'idle' | 'confirming' | 'deleting' | 'error'>('idle');
  const [notificationsMuted, setNotificationsMuted] = useState(true);
  const notificationMuteLabel = notificationsMuted ? t('common.unmute') : t('common.mute');
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const fullscreenLabel = fullscreenActive ? t('menu.fullscreen.exit') : t('menu.fullscreen');
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [alertNotices, setAlertNotices] = useState<HeaderNotice[]>([]);
  const [headerRealtimeStatus, setHeaderRealtimeStatus] = useState<HeaderRealtimeStatus>('idle');
  const [headerRealtimeNotice, setHeaderRealtimeNotice] = useState<HeaderRealtimeNotice | null>(null);
  const [setupSummary, setSetupSummary] = useState<SetupSummary>(() => buildEmptySetupSummary(t));
  const setupRef = useRef<HTMLDivElement | null>(null);
  const notifyRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const userRef = useRef<HTMLDivElement | null>(null);
  const notifiedAlertIdsRef = useRef<Set<number>>(new Set());
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const standaloneRoute = isStandaloneRoute(pathname);

  function logout() {
    void clearClientSession().finally(() => {
      window.location.href = buildLoginRedirectHref(undefined, process.env.NEXT_PUBLIC_LOGIN_PATH);
    });
  }

  function toggleFullscreen() {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void document.documentElement.requestFullscreen();
  }

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const syncFullscreenStatus = () => {
      setFullscreenActive(Boolean(document.fullscreenElement));
    };

    syncFullscreenStatus();
    document.addEventListener('fullscreenchange', syncFullscreenStatus);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenStatus);
    };
  }, []);

  function toggleMute() {
    const nextMuted = !notificationsMuted;

    if (!nextMuted && typeof window !== 'undefined' && 'Notification' in window) {
      void window.Notification.requestPermission();
    }

    void saveHeaderMuteConfig(nextMuted).then(result => {
      if (result.status === 'saved') {
        setNotificationsMuted(result.muted);
      }
    });
  }

  function openAboutModal() {
    setUserOpen(false);
    setAboutOpen(true);
  }

  function changeAboutNotShowNextLogin(checked: boolean) {
    writeAboutNotShowNextLogin(checked);
    setAboutNotShowNextLogin(checked);
  }

  function openSetupAction(action: SetupAction) {
    setSetupOpen(false);
    router.push(resolveSetupActionHref(action));
  }

  function openAiChatModal(initialPrompt = '') {
    const nextPrompt = initialPrompt.trim();
    setAiInitialPrompt(nextPrompt);
    setAiDraftMessage(nextPrompt);
    setAiChatOpen(true);
  }

  function submitAiPrompt() {
    const query = aiPrompt.trim();
    if (!query) return;
    openAiChatModal(query);
    setAiPrompt('');
  }

  async function loadAiProviderConfig(openOnError = false) {
    setAiConfigStatus('loading');
    setAiConfigStatusLabelKey(AI_CHAT_CONFIG_STATUS_LABEL_KEYS.loading);
    const next = await loadAiChatProviderConfig();
    setAiProviderConfig(next.config);
    setAiConfigStatus(next.status);
    setAiConfigStatusLabelKey(next.statusLabelKey);
    if (openOnError && next.status === 'error') {
      setAiConfigOpen(true);
    }
  }

  function openAiProviderConfig() {
    setAiConfigOpen(true);
    void loadAiProviderConfig(false);
  }

  function changeAiProviderConfig(next: HzAiChatProviderConfigValue) {
    setAiProviderConfig(current => {
      const codeChanged = current.code !== next.code;
      if (!codeChanged) {
        return next;
      }
      return applyAiChatProviderDefaults(next);
    });
    setAiConfigStatus(current => current === 'error' ? 'ready' : current);
    setAiConfigStatusLabelKey(AI_CHAT_CONFIG_STATUS_LABEL_KEYS.ready);
  }

  function resetAiProviderDefaults() {
    setAiProviderConfig(current => ({
      ...buildDefaultAiChatProviderConfig(current.code),
      apiKey: current.apiKey
    }));
    setAiConfigStatus(current => current === 'error' ? 'ready' : current);
    setAiConfigStatusLabelKey(AI_CHAT_CONFIG_STATUS_LABEL_KEYS.ready);
  }

  async function saveAiProviderConfig() {
    const nextConfig = applyAiChatProviderDefaults(aiProviderConfig);
    if (!nextConfig.code) {
      setAiConfigStatus('error');
      setAiConfigStatusLabelKey('ai.chat.config.provider.required');
      return;
    }
    if (!nextConfig.apiKey.trim()) {
      setAiConfigStatus('error');
      setAiConfigStatusLabelKey('ai.chat.config.api-key.required');
      return;
    }
    if (!nextConfig.baseUrl.trim()) {
      setAiConfigStatus('error');
      setAiConfigStatusLabelKey('ai.chat.config.base-url.required');
      return;
    }
    if (!nextConfig.model.trim()) {
      setAiConfigStatus('error');
      setAiConfigStatusLabelKey('ai.chat.config.model.required');
      return;
    }

    setAiConfigStatus('saving');
    setAiConfigStatusLabelKey(AI_CHAT_CONFIG_STATUS_LABEL_KEYS.saving);
    const result = await saveAiChatProviderConfig(nextConfig);
    setAiConfigStatus(result.status);
    setAiConfigStatusLabelKey(result.statusLabelKey);
    if (result.status === 'saved') {
      setAiProviderConfig(nextConfig);
      setAiConfigOpen(false);
      void loadAiChatConversations().then(next => {
        setAiConversations(next);
        setSelectedAiConversationId(next.conversations[0]?.id ?? null);
      });
    }
  }

  function openAiSchedulePanel() {
    setAiScheduleOpen(true);
    setAiScheduleEditDraft(null);
    setAiDeleteScheduleId(null);
    setAiDeleteScheduleStatus('idle');
  }

  async function createAiScheduleFromDraft() {
    if (selectedAiConversationId === null || selectedAiConversationId === 0 || !aiScheduleDraft.sopName || !aiScheduleDraft.cronExpression) return;
    setAiScheduleStatus('saving');
    setAiScheduleStatusLabelKey(AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.saving);
    const result = await createAiChatSchedule(selectedAiConversationId, aiScheduleDraft);
    if (result.status === 'ready' && result.schedule) {
      setAiSchedules(current => [...current, result.schedule!]);
      setAiScheduleDraft({ sopName: '', cronExpression: '', enabled: true });
      setAiScheduleStatus('ready');
    } else {
      setAiScheduleStatus('error');
    }
    setAiScheduleStatusLabelKey(result.statusLabelKey);
  }

  async function toggleAiSchedule(scheduleId: string | number, enabled: boolean) {
    setAiScheduleStatus('saving');
    setAiScheduleStatusLabelKey(AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.saving);
    setAiSchedules(current => current.map(row => String(row.id) === String(scheduleId) ? { ...row, enabled } : row));
    const result = await toggleAiChatSchedule(scheduleId, enabled);
    if (result.status === 'ready' && result.schedule) {
      setAiSchedules(current => current.map(row => String(row.id) === String(scheduleId) ? result.schedule! : row));
      setAiScheduleStatus('ready');
    } else {
      setAiSchedules(current => current.map(row => String(row.id) === String(scheduleId) ? { ...row, enabled: !enabled } : row));
      setAiScheduleStatus('error');
    }
    setAiScheduleStatusLabelKey(result.statusLabelKey);
  }

  function startAiScheduleEdit(row: HzAiChatScheduleRow) {
    setAiScheduleEditDraft({
      id: row.id,
      sopName: String(row.sopName),
      cronExpression: row.cronExpression,
      enabled: row.enabled
    });
  }

  async function updateAiScheduleFromDraft() {
    if (!aiScheduleEditDraft || selectedAiConversationId === null || selectedAiConversationId === 0) return;
    setAiScheduleStatus('saving');
    setAiScheduleStatusLabelKey(AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.saving);
    const result = await updateAiChatSchedule(aiScheduleEditDraft.id, selectedAiConversationId, aiScheduleEditDraft);
    if (result.status === 'ready' && result.schedule) {
      setAiSchedules(current => current.map(row => String(row.id) === String(aiScheduleEditDraft.id) ? result.schedule! : row));
      setAiScheduleEditDraft(null);
      setAiScheduleStatus('ready');
    } else {
      setAiScheduleStatus('error');
    }
    setAiScheduleStatusLabelKey(result.statusLabelKey);
  }

  function requestDeleteAiSchedule(scheduleId: string | number) {
    setAiDeleteScheduleId(scheduleId);
    setAiDeleteScheduleStatus('confirming');
  }

  function cancelDeleteAiSchedule() {
    setAiDeleteScheduleId(null);
    setAiDeleteScheduleStatus('idle');
  }

  async function confirmDeleteAiSchedule() {
    if (aiDeleteScheduleId === null) return;
    const scheduleId = aiDeleteScheduleId;
    setAiScheduleStatus('saving');
    setAiScheduleStatusLabelKey(AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.saving);
    setAiDeleteScheduleStatus('deleting');
    const result = await deleteAiChatSchedule(scheduleId);
    if (result.status === 'ready') {
      setAiSchedules(current => {
        const next = current.filter(row => String(row.id) !== String(scheduleId));
        setAiScheduleStatus(next.length > 0 ? 'ready' : 'empty');
        return next;
      });
      setAiDeleteScheduleId(null);
      setAiDeleteScheduleStatus('idle');
    } else {
      setAiScheduleStatus('error');
      setAiDeleteScheduleStatus('error');
    }
    setAiScheduleStatusLabelKey(result.statusLabelKey);
  }

  async function createNewAiConversation() {
    setAiNewConversationStatus('creating');
    const next = await createAiChatConversation();
    setAiNewConversationStatus(next.status === 'ready' ? 'idle' : 'error');
    setAiConversations(current => ({
      status: next.status === 'ready' ? 'ready' : 'error',
      statusLabelKey: next.statusLabelKey,
      conversations: [
        next.conversation,
        ...current.conversations.filter(conversation => String(conversation.id) !== String(next.conversation.id))
      ]
    }));
    setSelectedAiConversationId(next.conversation.id);
    setAiLocalMessages([]);
    setAiSendStatus('idle');
  }

  function requestDeleteAiConversation(conversationId: string | number) {
    setAiDeleteConversationId(conversationId);
    setAiDeleteConversationStatus('confirming');
  }

  function cancelDeleteAiConversation() {
    setAiDeleteConversationId(null);
    setAiDeleteConversationStatus('idle');
  }

  async function confirmDeleteAiConversation(conversationId: string | number) {
    setAiDeleteConversationId(conversationId);
    setAiDeleteConversationStatus('deleting');
    const next = await deleteAiChatConversation(conversationId);
    if (next.status === 'error') {
      setAiDeleteConversationStatus('error');
      setAiConversations(current => ({
        ...current,
        status: 'error',
        statusLabelKey: next.statusLabelKey
      }));
      return;
    }

    setAiDeleteConversationId(null);
    setAiDeleteConversationStatus('idle');
    const conversations = aiConversations.conversations.filter(conversation => String(conversation.id) !== String(conversationId));
    if (conversations.length === 0) {
      setAiConversations({
        status: 'empty',
        statusLabelKey: AI_CHAT_CONVERSATION_STATUS_LABEL_KEYS.empty,
        conversations: []
      });
      setSelectedAiConversationId(null);
      await createNewAiConversation();
      return;
    }

    const nextSelected = String(selectedAiConversationId) === String(conversationId)
      ? conversations[0].id
      : selectedAiConversationId;
    setAiConversations({
      status: 'ready',
      statusLabelKey: AI_CHAT_CONVERSATION_STATUS_LABEL_KEYS.ready,
      conversations
    });
    setSelectedAiConversationId(nextSelected);
    setAiLocalMessages([]);
    setAiSendStatus('idle');
  }

  function appendOfflineAiAssistantResponse() {
    globalThis.setTimeout(() => {
      setAiLocalMessages(current => replaceLastStreamingAiAssistantMessage(current, t('ai.chat.offline.response')));
      setAiSendStatus('idle');
    }, 1000);
  }

  function appendAiStreamChunk(content: string) {
    setAiLocalMessages(current => appendToLastStreamingAiAssistantMessage(current, content));
  }

  function failAiStreamResponse() {
    setAiLocalMessages(current => replaceLastStreamingAiAssistantMessage(current, t('ai.chat.error.processing')));
    setAiSendStatus('error');
  }

  async function refreshAiConversationAfterStream(conversationId: string | number | null) {
    if (conversationId === null || conversationId === 0) return;
    const next = await loadAiChatConversationHistory(conversationId);
    if (next.status === 'ready' && next.messages.length > 0) {
      setAiConversationHistory(next);
      setAiLocalMessages([]);
    }
  }

  function sendAiMessage() {
    const messageContent = aiDraftMessage.trim();
    if (!messageContent || aiSendStatus === 'sending') return;

    setAiDraftMessage('');
    setAiLocalMessages(current => [
      ...current,
      {
        role: 'user',
        labelKey: AI_CHAT_MESSAGE_ROLE_LABEL_KEYS.user,
        content: messageContent
      },
      {
        role: 'assistant',
        labelKey: AI_CHAT_MESSAGE_ROLE_LABEL_KEYS.assistant,
        content: ''
      }
    ]);
    setAiSendStatus('sending');

    if (
      selectedAiConversationId === 0 ||
      selectedAiConversationId === null ||
      aiConversations.status === 'error' ||
      aiConversationHistory.status === 'error'
    ) {
      appendOfflineAiAssistantResponse();
      return;
    }

    const streamConversationId = selectedAiConversationId;
    void streamAiChatResponse(messageContent, {
      conversationId: streamConversationId,
      onChunk: chunk => appendAiStreamChunk(chunk.content)
    }).then(() => {
      setAiSendStatus('idle');
      void refreshAiConversationAfterStream(streamConversationId);
    }).catch(() => {
      failAiStreamResponse();
    });
  }

  useEffect(() => {
    let mounted = true;

    void loadHeaderMuteConfig().then(result => {
      if (mounted) {
        setNotificationsMuted(result.muted);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setAboutNotShowNextLogin(readAboutNotShowNextLogin());
  }, []);

  useEffect(() => {
    if (!consumeAboutAutoShowAfterLogin()) return undefined;
    if (readAboutNotShowNextLogin()) return undefined;

    setAboutOpen(true);
    const timeout = window.setTimeout(() => {
      setAboutOpen(false);
    }, ABOUT_AUTO_CLOSE_AFTER_LOGIN_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    bootstrapWorkbenchTheme();
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!aiChatOpen) return () => {
      mounted = false;
    };

    setAiConversations({
      status: 'loading',
      conversations: [],
      statusLabelKey: AI_CHAT_CONVERSATION_STATUS_LABEL_KEYS.loading
    });
    setSelectedAiConversationId(null);
    setAiConversationHistory({
      status: 'idle',
      messages: [],
      statusLabelKey: AI_CHAT_MESSAGE_STATUS_LABEL_KEYS.idle
    });
    setAiLocalMessages([]);
    setAiSendStatus('idle');
    setAiNewConversationStatus('idle');
    setAiDeleteConversationId(null);
    setAiDeleteConversationStatus('idle');
    setAiConfigOpen(false);
    setAiConfigStatus('idle');
    setAiConfigStatusLabelKey(AI_CHAT_CONFIG_STATUS_LABEL_KEYS.idle);
    setAiScheduleOpen(false);
    setAiScheduleStatus('idle');
    setAiScheduleStatusLabelKey(AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.idle);
    setAiSchedules([]);
    setAiScheduleEditDraft(null);
    setAiDeleteScheduleId(null);
    setAiDeleteScheduleStatus('idle');

    void loadAiProviderConfig(true);

    void loadAiChatConversations().then(next => {
      if (mounted) {
        setAiConversations(next);
        setSelectedAiConversationId(next.conversations[0]?.id ?? null);
      }
    });

    return () => {
      mounted = false;
    };
  }, [aiChatOpen]);

  useEffect(() => {
    let mounted = true;

    if (!aiChatOpen || selectedAiConversationId === null) return () => {
      mounted = false;
    };

    setAiConversationHistory({
      status: 'loading',
      messages: [],
      statusLabelKey: AI_CHAT_MESSAGE_STATUS_LABEL_KEYS.loading,
      conversationId: selectedAiConversationId
    });
    setAiLocalMessages([]);
    setAiSendStatus('idle');

    void loadAiChatConversationHistory(selectedAiConversationId).then(next => {
      if (mounted) {
        setAiConversationHistory(next);
      }
    });

    return () => {
      mounted = false;
    };
  }, [aiChatOpen, selectedAiConversationId]);

  useEffect(() => {
    let mounted = true;

    if (!aiChatOpen || !aiScheduleOpen) return () => {
      mounted = false;
    };

    if (selectedAiConversationId === null || selectedAiConversationId === 0) {
      setAiScheduleStatus('error');
      setAiScheduleStatusLabelKey(AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.error);
      setAiSchedules([]);
      setAiScheduleSkills([]);
      return () => {
        mounted = false;
      };
    }

    setAiScheduleStatus('loading');
    setAiScheduleStatusLabelKey(AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.loading);
    void Promise.all([
      loadAiChatSchedules(selectedAiConversationId),
      loadAiChatScheduleSkills()
    ]).then(([schedules, skills]) => {
      if (!mounted) return;
      setAiSchedules(schedules.schedules);
      setAiScheduleSkills(skills.skills.map(skill => ({ value: skill.value, label: String(skill.label) })));
      setAiScheduleStatus(schedules.status);
      setAiScheduleStatusLabelKey(schedules.statusLabelKey);
    });

    return () => {
      mounted = false;
    };
  }, [aiChatOpen, aiScheduleOpen, selectedAiConversationId]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (setupRef.current && !setupRef.current.contains(target)) {
        setSetupOpen(false);
      }
      if (notifyRef.current && !notifyRef.current.contains(target)) {
        setNotifyOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(target)) {
        setSettingsOpen(false);
      }
      if (userRef.current && !userRef.current.contains(target)) {
        setUserOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!shouldLoadHeaderState(pathname)) {
      setAlertSummary(null);
      setAlertNotices([]);
      setSetupSummary(buildEmptySetupSummary(t));
      return;
    }

    let cancelled = false;

    async function loadHeaderState() {
      try {
        const [
          monitors,
          collectors,
          entities,
          definitionActivities,
          governancePresets,
          summary,
          alerts,
        ] = await consumeWorkbenchLoad(
          `app-frame:header-state:${locale}`,
          () => Promise.all([
            apiGet<PageResult<unknown>>('/monitors?pageIndex=0&pageSize=1').catch(() => ({ content: [], totalElements: 0, pageIndex: 0, pageSize: 1 })),
            apiGet<PageResult<CollectorSummary>>('/collector?pageIndex=0&pageSize=1').catch(() => ({ content: [], totalElements: 0, pageIndex: 0, pageSize: 1 })),
            apiGet<PageResult<EntitySummaryInfo>>('/entities?pageIndex=0&pageSize=40&sort=gmtUpdate&order=desc').catch(() => ({ content: [], totalElements: 0, pageIndex: 0, pageSize: 40 })),
            apiGet<EntityDefinitionActivity[]>('/entities/definition-activities?limit=8').catch(() => []),
            apiGet<EntityDiscoveryGovernancePreset[]>('/entities/discovery/governance-presets?limit=8').catch(() => []),
            apiGet<AlertSummary>('/alerts/summary').catch(() => null),
            apiGet<PageResult<SingleAlert>>(
              buildAlertListUrl({ search: '', status: '', severity: '', entityId: '', entityName: '', returnTo: '' })
            ).catch(() => ({ content: [], totalElements: 0, pageIndex: 0, pageSize: 8 })),
          ]),
          { settledTtlMs: APP_FRAME_HEADER_STATE_CACHE_TTL_MS }
        );

        if (cancelled) return;

        const hasEvidenceLinked = entities.content.some(
          item => (item.monitorCount || 0) > 0 || (item.identityCount || 0) > 0
        );

        setSetupSummary(
          buildRouteSetupSummary(
            pathname,
            {
              monitorTotal: monitors.totalElements || 0,
              collectorTotal: collectors.totalElements || 0,
              entityTotal: entities.totalElements || 0,
              hasEvidenceLinked,
              definitionCount: definitionActivities.length,
              governanceCount: governancePresets.length,
            },
            t
          )
        );
        setAlertSummary(summary);
        setAlertNotices(
          alerts.content.slice(0, 5).map(item => ({
            id: item.id,
            title: item.content || t('dashboard.alerts.center-title'),
            status: item.status || 'firing',
            activeAt: item.activeAt ?? item.gmtUpdate ?? null,
          }))
        );
      } catch {
        if (cancelled) return;
        setSetupSummary(buildRouteSetupSummary(pathname, {
          monitorTotal: 0,
          collectorTotal: 0,
          entityTotal: 0,
          hasEvidenceLinked: false,
          definitionCount: 0,
          governanceCount: 0,
        }, t));
        setAlertSummary(null);
        setAlertNotices([]);
      }
    }

    void loadHeaderState();
    return () => {
      cancelled = true;
    };
  }, [locale, pathname, standaloneRoute, t]);

  useEffect(() => {
    if (!shouldLoadHeaderRealtime(pathname)) {
      setHeaderRealtimeStatus('idle');
      setHeaderRealtimeNotice(null);
      return undefined;
    }
    if (typeof window === 'undefined' || !window.EventSource) {
      setHeaderRealtimeStatus('unsupported');
      return undefined;
    }

    let cancelled = false;
    setHeaderRealtimeStatus('connecting');

    const alertSource = new window.EventSource(HEADER_ALERT_SSE_URL);
    const managerSource = new window.EventSource(HEADER_MANAGER_SSE_URL);

    const markLive = () => {
      if (!cancelled) setHeaderRealtimeStatus('live');
    };
    const markError = () => {
      if (!cancelled) setHeaderRealtimeStatus('error');
    };

    alertSource.onopen = markLive;
    managerSource.onopen = markLive;

    alertSource.addEventListener(HEADER_ALERT_EVENT_TYPE, (event: MessageEvent) => {
      if (cancelled) return;
      const alert = parseHeaderSseJson<SingleAlert>(event.data);
      if (!alert) return;

      const notice = buildHeaderNoticeFromAlert(alert, t('dashboard.alerts.center-title'));
      setHeaderRealtimeStatus('live');
      setHeaderRealtimeNotice({
        status: 'live',
        title: notice.title,
        description: `${notice.status} · ${formatHeaderTime(notice.activeAt, emptyValue)}`,
        meta: HEADER_ALERT_EVENT_TYPE
      });
      setAlertNotices(current => mergeHeaderNoticeEvent(current, notice));
      setAlertSummary(current => current
        ? { ...current, total: Math.max(current.total, 1) }
        : { total: 1, dealNum: 0, rate: 0, priorityWarningNum: 0, priorityCriticalNum: 0, priorityEmergencyNum: 0 });

      if (!notificationsMuted && !notifiedAlertIdsRef.current.has(alert.id)) {
        notifiedAlertIdsRef.current.add(alert.id);
        playHeaderAlertSound(locale, alertAudioRef);
        showHeaderAlertNotification(t, () => router.push('/alert'));
      }
    });

    managerSource.addEventListener(HEADER_IMPORT_TASK_EVENT_TYPE, (event: MessageEvent) => {
      if (cancelled) return;
      const payload = parseHeaderSseJson<HeaderManagerImportEvent>(event.data);
      if (!payload) return;
      const message = buildManagerImportMessage(payload, t);
      if (!message) return;
      setHeaderRealtimeStatus(message.status === 'error' ? 'error' : 'live');
      setHeaderRealtimeNotice(message);
    });

    alertSource.onerror = () => {
      markError();
      alertSource.close();
    };
    managerSource.onerror = () => {
      markError();
      managerSource.close();
    };

    return () => {
      cancelled = true;
      alertSource.close();
      managerSource.close();
    };
  }, [emptyValue, locale, notificationsMuted, pathname, router, t]);

  if (standaloneRoute) {
    return <>{children}</>;
  }

  const aiConversationRows = aiConversations.conversations.map(conversation => ({
    ...conversation,
    active: selectedAiConversationId === null
      ? Boolean(conversation.active)
      : String(conversation.id) === String(selectedAiConversationId)
  }));
  const aiConversationMessageRows = aiConversationHistory.messages.map(message => ({
    role: message.role,
    label: t(message.labelKey),
    content: message.content
  })).concat(aiLocalMessages.map(message => ({
    role: message.role,
    label: t(message.labelKey),
    content: message.content
  })));
  const aiMessageStatus = aiLocalMessages.length > 0 ? 'ready' : aiConversationHistory.status;
  const aiMessageStatusLabelKey = aiLocalMessages.length > 0
    ? AI_CHAT_MESSAGE_STATUS_LABEL_KEYS.ready
    : aiConversationHistory.statusLabelKey;

  return (
    <AuthGate>
      <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
        {headerRealtimeNotice ? (
          <div
            className="fixed right-4 top-20 z-40 w-[320px]"
            data-app-frame-header-realtime-toast="angular-sse"
          >
            <HzHeaderRealtimeNotice
              status={headerRealtimeNotice.status}
              title={headerRealtimeNotice.title}
              description={headerRealtimeNotice.description}
              meta={headerRealtimeNotice.meta}
              data-app-frame-header-realtime-notice-owner="hertzbeat-ui-header-realtime-notice"
            />
          </div>
        ) : null}
        <div className="grid min-h-screen lg:grid-cols-[164px_minmax(0,1fr)] lg:grid-rows-[64px_minmax(0,1fr)]">
          <header className="sticky top-0 z-20 col-span-full border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]">
            <div className="grid h-16 lg:grid-cols-[164px_minmax(0,1fr)]">
              <Link
                href="/overview"
                className="flex items-center px-3 text-[hsl(var(--foreground))]"
              >
                <Image
                  src="/assets/brand_white.svg"
                  alt="HertzBeat"
                  width={186}
                  height={33}
                  className="h-[33px] w-auto object-contain"
                  priority
                />
              </Link>

              <div className="flex items-center gap-3 px-3 sm:px-4">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[2px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.35)] hover:text-[hsl(var(--foreground))]"
                  aria-label={t('app.frame.utility.menu')}
                  data-app-frame-icon-trigger="menu"
                >
                  <Menu size={17} />
                  <span className="sr-only">{t('app.frame.utility.menu')}</span>
                </button>
                <a
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[2px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.35)] hover:text-[hsl(var(--foreground))]"
                  href="https://github.com/apache/hertzbeat"
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t('app.frame.utility.github')}
                  data-app-frame-icon-trigger="github"
                >
                  <Github size={17} />
                  <span className="sr-only">{t('app.frame.utility.github')}</span>
                </a>

                <div className="relative hidden lg:block" ref={setupRef}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-6 items-center gap-1.5 rounded-[2px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 text-[11px] font-semibold text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--ring)/0.35)] hover:bg-[hsl(var(--accent)/0.25)]"
                      onClick={() => setSetupOpen(open => !open)}
                    >
                      <Sparkles size={13} />
                      <span>{t('layout.setup.title')}</span>
                      <ChevronDown size={12} />
                    </button>
                    <div className="min-w-[124px]" data-app-frame-setup-progress="angular-reference">
                      <div className="text-[10px] font-medium leading-none text-[hsl(var(--muted-foreground))]">
                        {setupSummary.headline}
                      </div>
                      <div className="mt-1 h-[2px] overflow-hidden rounded-full bg-[hsl(var(--accent))]">
                        <div
                          className="h-full bg-[hsl(var(--primary))] transition-[width]"
                          style={{ width: `${setupSummary.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  {setupOpen ? (
                    <div className="hb-scrollbar absolute left-0 top-10 z-30 max-h-[min(72vh,680px)] w-[360px] overflow-y-auto overscroll-contain rounded-[4px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-3 shadow-[0_10px_30px_rgba(0,0,0,.22)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="px-4">
                          <div className="text-[13px] font-semibold text-[hsl(var(--foreground))]">
                            {t('layout.setup.menu.title')}
                          </div>
                          <div className="mt-1 text-[12px] text-[hsl(var(--muted-foreground))]">
                            {setupSummary.headline}
                          </div>
                        </div>
                        <span className="mr-4 rounded-[2px] bg-[hsl(var(--accent))] px-2 py-1 text-[12px] font-medium text-[hsl(var(--foreground))]">
                          {setupSummary.completedCount}/{setupSummary.totalCount}
                        </span>
                      </div>
                      <div className="mx-4 mt-3 h-1 overflow-hidden rounded-full bg-[hsl(var(--accent))]">
                        <div
                          className="h-full bg-[hsl(var(--primary))] transition-[width]"
                          style={{ width: `${setupSummary.progressPercent}%` }}
                        />
                      </div>
                      <div className="mt-3 border-y border-[hsl(var(--border))] bg-[hsl(var(--background)/0.18)] px-4 py-3">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                          {t('layout.setup.next.kicker')}
                        </div>
                        <div className="mt-1 text-[12px] font-semibold text-[hsl(var(--foreground))]">
                          {setupSummary.nextTitle}
                        </div>
                        <div className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">
                          {setupSummary.nextCopy}
                        </div>
                        <button
                          type="button"
                          className="mt-3 inline-flex h-7 items-center rounded-[2px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-[12px] font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.35)]"
                          onClick={() => {
                            const nextItem = setupSummary.checklist.find(item => !item.completed);
                            openSetupAction(nextItem?.action || 'entities');
                          }}
                        >
                          {setupSummary.nextActionLabel}
                        </button>
                      </div>
                      <div className="mt-3 px-4">
                        <div className="grid gap-1.5">
                        {setupSummary.entryOptions.map(option => (
                          <button
                            key={option.key}
                            type="button"
                            className="rounded-[2px] px-3 py-2 text-left transition hover:bg-[hsl(var(--accent)/0.4)]"
                            onClick={() => openSetupAction(option.action)}
                          >
                            <div className="text-[12px] font-normal text-[hsl(var(--foreground))]">{option.title}</div>
                            <div className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{option.description}</div>
                          </button>
                        ))}
                        </div>
                      </div>
                      <div className="mt-3 border-t border-[hsl(var(--border))]">
                        {setupSummary.checklist.map(item => (
                          <button
                            key={item.key}
                            type="button"
                            className="flex w-full items-start gap-3 border-b border-[hsl(var(--border))] px-4 py-2.5 text-left transition last:border-b-0 hover:bg-[hsl(var(--accent)/0.3)]"
                            onClick={() => openSetupAction(item.action)}
                          >
                            <span
                              className={cn(
                                'mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-semibold',
                                item.completed
                                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                                  : 'bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]'
                              )}
                            >
                              {item.completed ? '✓' : '→'}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[12px] font-normal text-[hsl(var(--foreground))]">{item.title}</span>
                              <span className="mt-1 block text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{item.description}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="hidden min-w-[320px] max-w-[500px] flex-1 lg:block">
                  <div
                    className="flex h-8 items-stretch overflow-hidden rounded-[2px] border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
                    data-app-frame-ai-chat-input="angular-header-ai-chat"
                    data-app-frame-ai-chat-initial-message-contract="angular-open-modal-initial-message"
                    data-app-frame-ai-chat-initial-message-owner="route-ai-chat-modal-contract"
                  >
                    <Input
                      value={aiPrompt}
                      onChange={event => setAiPrompt(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          submitAiPrompt();
                        }
                      }}
                      className="min-w-0 flex-1 border-0 bg-transparent px-3 text-[12px] text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                      placeholder={t('ai.chat.input.placeholder')}
                    />
                    <button
                      type="button"
                      className="flex w-8 items-center justify-center border-l border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.2)] hover:text-[hsl(var(--foreground))]"
                      onClick={submitAiPrompt}
                      disabled={!aiPrompt.trim()}
                      aria-label={t('ai.chat.submit')}
                      data-app-frame-ai-chat-submit-state={aiPrompt.trim() ? 'ready' : 'empty'}
                    >
                      {aiPrompt.trim() ? <Send size={15} /> : <MessageSquare size={15} />}
                    </button>
                  </div>
                </div>

                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  <div className="relative" ref={notifyRef}>
                    <div className="inline-flex items-center gap-1 rounded-[3px]">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[2px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.35)] hover:text-[hsl(var(--foreground))]"
                        aria-label={t('common.notify')}
                        onClick={() => setNotifyOpen(open => !open)}
                        data-app-frame-icon-trigger="notify"
                        data-app-frame-header-realtime-sse-contract={HEADER_DUAL_SSE_CONTRACT}
                        data-app-frame-header-realtime-sse-owner="route-realtime-sse-contract"
                        data-app-frame-header-realtime-alert-source={HEADER_ALERT_SSE_URL}
                        data-app-frame-header-realtime-manager-source={HEADER_MANAGER_SSE_URL}
                      >
                        <span className="relative inline-flex items-center">
                          <Bell size={16} data-app-frame-glyph="notify-bell" />
                          {(alertSummary?.total || 0) > 0 ? (
                            <span className="absolute -right-2 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-[hsl(var(--destructive))] px-1 text-[10px] leading-4 text-[hsl(var(--destructive-foreground))]">
                              {Math.min(alertSummary?.total || 0, 99)}
                            </span>
                          ) : null}
                        </span>
                        <span className="sr-only">{t('common.notify')}</span>
                      </button>
                      <HzHeaderIconButton
                        label={notificationMuteLabel}
                        state={notificationsMuted ? 'active' : 'inactive'}
                        onClick={toggleMute}
                        data-app-frame-icon-trigger="mute"
                        data-app-frame-mute-state={notificationsMuted ? 'muted' : 'audible'}
                        data-app-frame-mute-save-lifecycle="angular-success-only-state-update"
                        data-app-frame-mute-save-lifecycle-owner="route-action-state-contract"
                      >
                        <Megaphone size={16} data-app-frame-glyph="mute-megaphone" />
                      </HzHeaderIconButton>
                    </div>
                    {notifyOpen ? (
                      <div className="absolute right-0 top-10 z-30 w-[320px] rounded-[4px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-3 shadow-[0_10px_30px_rgba(0,0,0,.22)]">
                        <div className="flex items-center justify-between gap-3 px-4">
                          <div className="min-w-0">
                            <div className="text-[12px] font-semibold text-[hsl(var(--foreground))]">
                              {t('dashboard.alerts.notifications-title')}
                            </div>
                            <div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                              {t('dashboard.alerts.enter')} · {(alertSummary?.total || 0)} {t('common.items')}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="inline-flex h-7 items-center gap-1 rounded-[2px] px-1.5 text-[12px] font-normal text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.35)] hover:text-[hsl(var(--foreground))]"
                            onClick={toggleMute}
                          >
                            <Megaphone size={15} />
                            <span>{notificationMuteLabel}</span>
                          </button>
                        </div>
                        <div className="mt-3 px-4">
                          <HzHeaderRealtimeNotice
                            status={headerRealtimeStatus}
                            title={t('dashboard.alerts.notifications-title')}
                            description={headerRealtimeNotice?.description || t('dashboard.alerts.enter')}
                            meta={headerRealtimeNotice?.meta || HEADER_ALERT_EVENT_TYPE}
                            data-app-frame-header-realtime-notice-owner="hertzbeat-ui-header-realtime-notice"
                            data-app-frame-header-realtime-status={headerRealtimeStatus}
                          />
                        </div>
                        <div className="mt-3 border-t border-[hsl(var(--border))]">
                          {alertNotices.length > 0 ? (
                            alertNotices.map(item => (
                              <button
                                key={item.id}
                                type="button"
                                className="flex w-full items-start gap-3 border-b border-[hsl(var(--border))] px-4 py-3 text-left transition last:border-b-0 hover:bg-[hsl(var(--accent)/0.3)]"
                                onClick={() => {
                                  setNotifyOpen(false);
                                  router.push('/alert');
                                }}
                              >
                                <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]">
                                  <BellRing size={12} />
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-[12px] font-medium text-[hsl(var(--foreground))]">{item.title}</span>
                                  <span className="mt-1 block text-[11px] text-[hsl(var(--muted-foreground))]">
                                    {item.status} · {formatHeaderTime(item.activeAt, emptyValue)}
                                  </span>
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-5 text-center text-[12px] text-[hsl(var(--muted-foreground))]">
                              {t('dashboard.alerts.no')}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="mx-4 mt-3 inline-flex h-7 items-center rounded-[2px] px-3 text-[12px] font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.35)]"
                          onClick={() => {
                            setNotifyOpen(false);
                            router.push('/alert');
                          }}
                        >
                          {t('dashboard.alerts.enter')}
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <Link href="/passport/lock">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[2px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.35)] hover:text-[hsl(var(--foreground))]"
                      aria-label={t('common.lock')}
                      data-app-frame-icon-trigger="lock"
                    >
                      <Lock size={16} />
                      <span className="sr-only">{t('common.lock')}</span>
                    </button>
                  </Link>
                  <div className="relative" ref={settingsRef}>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[2px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.35)] hover:text-[hsl(var(--foreground))]"
                      aria-label={t('menu.settings')}
                      onClick={() => setSettingsOpen(open => !open)}
                      data-app-frame-icon-trigger="settings"
                      data-app-frame-locale-reload-contract="angular-load-use-layout-reload"
                      data-app-frame-locale-reload-owner="route-locale-reload-contract"
                    >
                      <Settings size={16} data-app-frame-glyph="settings-gear" />
                      <span className="sr-only">{t('menu.settings')}</span>
                    </button>
                    {settingsOpen ? (
                      <div className="absolute right-0 top-10 z-30 min-w-[220px] rounded-[4px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-[0_8px_24px_rgba(0,0,0,.22)]">
                        <HzHeaderMenuAction
                          label={fullscreenLabel}
                          state={fullscreenActive ? 'active' : 'inactive'}
                          onClick={() => {
                            setSettingsOpen(false);
                            toggleFullscreen();
                          }}
                          data-app-frame-settings-fullscreen-action="angular-toggle"
                        >
                          {fullscreenActive ? (
                            <Minimize2 size={14} data-app-frame-glyph="fullscreen-exit" />
                          ) : (
                            <Maximize2 size={14} data-app-frame-glyph="fullscreen-enter" />
                          )}
                        </HzHeaderMenuAction>
                        <Link
                          href="/setting/labels"
                          className="flex items-center gap-2 rounded-[2px] px-2.5 py-2 text-[12px] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.5)]"
                          onClick={() => setSettingsOpen(false)}
                        >
                          <Tags size={14} />
                          {t('menu.advanced.labels')}
                        </Link>
                        <div className="my-1 h-px bg-[hsl(var(--border))]" />
                        <LocaleOptionList
                          locale={locale}
                          locales={locales}
                          className="px-1 py-1"
                          itemClassName="rounded-[2px] px-2.5 py-2 text-[12px]"
                          activeItemClassName="bg-[hsl(var(--accent)/0.5)] text-[hsl(var(--foreground))]"
                          inactiveItemClassName="text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.5)]"
                          activeIndicatorClassName="text-[11px] text-[hsl(var(--muted-foreground))]"
                          onSelect={async nextLocale => {
                            showHeaderLocaleReloadSpinner();
                            await setLocale(nextLocale);
                            setSettingsOpen(false);
                            window.location.reload();
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="relative" ref={userRef}>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[2px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.35)] hover:text-[hsl(var(--foreground))]"
                      onClick={() => setUserOpen(open => !open)}
                      aria-label={t('app.frame.utility.user', { user: currentUserName })}
                      data-app-frame-icon-trigger="user"
                      data-app-frame-user-name={currentUserName}
                      data-app-frame-user-role={sessionUser?.role || 'unknown'}
                      data-app-frame-user-logout-lifecycle-contract="angular-clear-then-passport-login"
                      data-app-frame-user-logout-lifecycle-owner="route-session-contract"
                      data-app-frame-about-closable-contract="angular-nz-closable-false"
                      data-app-frame-about-cancel-contract="angular-on-cancel"
                    >
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d9dde5]"
                        data-app-frame-user-avatar="angular-circle"
                      />
                      <span className="sr-only">{t('app.frame.utility.user', { user: currentUserName })}</span>
                    </button>
                    {userOpen ? (
                      <div
                        className="absolute right-0 top-10 z-30 min-w-[180px] rounded-[4px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-[0_8px_24px_rgba(0,0,0,.22)]"
                        data-app-frame-user-menu="angular-width-sm"
                      >
                        <HzUserMenuAction
                          component={Link}
                          href="/setting/settings/config"
                          item="setting"
                          label={t('menu.extras.setting')}
                          onClick={() => setUserOpen(false)}
                          data-app-frame-user-action="setting"
                        >
                          <Wrench size={14} data-app-frame-user-menu-icon="tool" />
                        </HzUserMenuAction>
                        <HzUserMenuAction
                          item="logout"
                          label={t('menu.account.logout')}
                          onClick={logout}
                          data-app-frame-user-action="logout"
                          data-app-frame-user-logout-lifecycle="angular-clear-then-passport-login"
                          data-app-frame-user-logout-lifecycle-owner="route-session-contract"
                        >
                          <LogOut size={14} data-app-frame-user-menu-icon="logout" />
                        </HzUserMenuAction>
                        <HzUserMenuAction
                          item="about"
                          label={t('menu.extras.about')}
                          onClick={openAboutModal}
                          data-app-frame-user-action="about"
                          data-app-frame-user-about-action="angular-modal"
                        >
                          <MapPin size={14} data-app-frame-user-menu-icon="environment" />
                        </HzUserMenuAction>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <AppSidebar pathname={pathname} t={t} />

          <main
            className="relative flex min-h-0 min-w-0 flex-col self-stretch"
            data-platform-main-scroll="content-flow"
          >
            <div data-app-frame-content-shell={buildContentFrameShellKind(pathname)} className={buildContentFrameClassName(pathname)}>
              {children}
            </div>
            <PlatformCopyrightFooter
              className="mt-auto border-t border-[var(--ops-border-color)] py-2.5 text-center"
              data-platform-footer="angular-footer"
              data-platform-footer-placement="flow-end-or-viewport-bottom"
              headlineClassName="text-[11px] font-semibold text-[var(--ops-text-secondary)]"
              innerClassName="space-y-0.5"
              lineClassName="text-[10px] leading-4 text-[var(--ops-text-tertiary)]"
              linkClassName="text-[var(--ops-text-secondary)]"
              version={PLATFORM_FOOTER_VERSION}
            />
            <HzAboutModalSurface
              open={aboutOpen}
              title={t('about.title')}
              points={[
                t('about.point.1'),
                t('about.point.2'),
                t('about.point.3'),
                t('about.point.4'),
                t('about.point.5'),
                t('about.point.6')
              ]}
              help={t('about.help')}
              version={PLATFORM_FOOTER_VERSION}
              releaseHref={`https://github.com/apache/hertzbeat/releases/tag/${PLATFORM_FOOTER_VERSION}`}
              copyright={t('about.copyright', { year: new Date().getFullYear() })}
              notShowLabel={t('about.not-show-next-login')}
              notShowChecked={aboutNotShowNextLogin}
              closeLabel={t('common.dialog.close')}
              communityLinks={[
                { href: 'https://github.com/apache/hertzbeat', label: t('about.github') },
                { href: 'https://github.com/apache/hertzbeat/issues', label: t('about.issue') },
                { href: 'https://github.com/apache/hertzbeat/pulls', label: t('about.pr') },
                { href: 'https://discord.com/invite/Fb6M73htGr', label: t('about.discuss') },
                { href: 'https://hertzbeat.apache.org/docs/', label: t('about.doc') },
                { href: 'https://hertzbeat.apache.org/docs/start/upgrade', label: t('about.upgrade') },
                { href: 'https://github.com/apache/hertzbeat', label: t('about.star') }
              ]}
              onClose={() => setAboutOpen(false)}
              onNotShowChange={changeAboutNotShowNextLogin}
              data-app-frame-about-modal="angular-user-menu"
              data-app-frame-about-closable-contract="angular-nz-closable-false"
              data-app-frame-about-cancel-contract="angular-on-cancel"
            />
            <button
              type="button"
              aria-label={t('ai.chat.launch')}
              className="fixed bottom-4 right-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-[6px] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_14px_38px_rgba(67,97,238,0.34)] transition hover:brightness-110"
              data-shell-ai-chat-launcher="angular-ai-chat"
              data-app-frame-ai-chat-launcher-contract="angular-empty-modal"
              data-app-frame-ai-chat-config-save-lifecycle-contract="angular-validate-save-close-refresh"
              data-app-frame-ai-chat-config-save-lifecycle-owner="route-ai-chat-config-contract"
              data-app-frame-ai-chat-conversation-action-lifecycle-contract="angular-create-select-delete-fallback"
              data-app-frame-ai-chat-conversation-action-lifecycle-owner="route-ai-chat-conversation-contract"
              data-app-frame-ai-chat-schedule-action-lifecycle-contract="angular-load-create-toggle-revert-confirm-update-delete"
              data-app-frame-ai-chat-schedule-action-lifecycle-owner="route-ai-chat-schedule-contract"
              data-app-frame-ai-chat-stream-history-lifecycle-contract="angular-push-user-placeholder-sse-skill-report-refresh"
              data-app-frame-ai-chat-stream-history-lifecycle-owner="route-ai-chat-stream-contract"
              onClick={() => openAiChatModal()}
            >
              <Bot size={28} strokeWidth={2.2} />
              <span className="sr-only">{t('ai.chat.launch')}</span>
            </button>
            {aiChatOpen ? (
              <HzAiChatModalSurface
                data-app-frame-ai-chat-owner="hertzbeat-ui-ai-chat-modal"
                data-app-frame-ai-chat-initial-message-contract={aiInitialPrompt ? 'angular-open-modal-initial-message' : 'angular-empty-modal'}
                data-app-frame-ai-chat-initial-message-owner="route-ai-chat-modal-contract"
                data-app-frame-ai-chat-config-save-lifecycle-contract="angular-validate-save-close-refresh"
                data-app-frame-ai-chat-config-save-lifecycle-owner="route-ai-chat-config-contract"
                data-app-frame-ai-chat-conversation-action-lifecycle-contract="angular-create-select-delete-fallback"
                data-app-frame-ai-chat-conversation-action-lifecycle-owner="route-ai-chat-conversation-contract"
                data-app-frame-ai-chat-schedule-action-lifecycle-contract="angular-load-create-toggle-revert-confirm-update-delete"
                data-app-frame-ai-chat-schedule-action-lifecycle-owner="route-ai-chat-schedule-contract"
                data-app-frame-ai-chat-stream-history-lifecycle-contract="angular-push-user-placeholder-sse-skill-report-refresh"
                data-app-frame-ai-chat-stream-history-lifecycle-owner="route-ai-chat-stream-contract"
                title={t('ai.chat.title')}
                subtitle={t('ai.chat.subtitle')}
                conversationsTitle={t('ai.chat.conversations')}
                newChatLabel={t('ai.chat.new-chat')}
                newChatStatus={aiNewConversationStatus}
                deleteLabel={t('ai.chat.conversation.delete.title')}
                deleteConfirmLabel={t('ai.chat.conversation.delete.confirm')}
                deleteCancelLabel={t('common.cancel')}
                deleteStatus={aiDeleteConversationStatus}
                deleteConversationId={aiDeleteConversationId}
                welcomeTitle={t('ai.chat.welcome.title')}
                welcomeDescription={t('ai.chat.welcome.description')}
                inputPlaceholder={t('ai.chat.input.placeholder')}
                inputValue={aiDraftMessage}
                inputHint={t('ai.chat.input.hint')}
                closeLabel={t('common.dialog.close')}
                sendLabel={t('ai.chat.submit')}
                sendStatus={aiSendStatus}
                streamingLabel={t('ai.chat.typing')}
                configOpen={aiConfigOpen}
                configTitle={t('ai.chat.config.title')}
                configDescription={t('ai.chat.config.required.content')}
                configStatus={aiConfigStatus}
                configStatusLabel={t(aiConfigStatusLabelKey)}
                configTriggerLabel={t('ai.chat.modify-api-key')}
                configProviderLabel={t('ai.chat.config.provider')}
                configProviderHelp={t('ai.chat.config.provider.help')}
                configApiKeyLabel={t('ai.chat.config.api-key')}
                configApiKeyHelp={t('ai.chat.config.api-key.help')}
                configBaseUrlLabel={t('ai.chat.config.base-url')}
                configBaseUrlHelp={t('ai.chat.config.base-url.help')}
                configModelLabel={t('ai.chat.config.model')}
                configModelHelp={t('ai.chat.config.model.help')}
                configResetLabel={t('ai.chat.config.reset')}
                configSaveLabel={t('ai.chat.config.save')}
                configCancelLabel={t('ai.chat.config.cancel')}
                configProviderOptions={AI_CHAT_PROVIDER_OPTIONS}
                configValue={aiProviderConfig}
                scheduleOpen={aiScheduleOpen}
                scheduleStatus={aiScheduleStatus}
                scheduleStatusLabel={t(aiScheduleStatusLabelKey)}
                scheduleTriggerLabel={t('ai.chat.schedule.button')}
                scheduleTitle={t('ai.chat.schedule.title')}
                scheduleConfiguredTitle={t('ai.chat.schedule.configured')}
                scheduleCreateTitle={t('ai.chat.schedule.create')}
                scheduleAddTitle={t('ai.chat.schedule.add')}
                scheduleSkillLabel={t('ai.chat.schedule.skill')}
                scheduleSkillSelectLabel={t('ai.chat.schedule.skill.select')}
                scheduleSkillPlaceholder={t('ai.chat.schedule.skill.placeholder')}
                scheduleCronLabel={t('ai.chat.schedule.cron.label')}
                scheduleCronHelp={t('ai.chat.schedule.cron.help')}
                scheduleCronCommonLabel={t('ai.chat.schedule.cron.common')}
                scheduleCronMondayLabel={t('ai.chat.schedule.cron.monday')}
                scheduleStatusColumnLabel={t('ai.chat.schedule.status')}
                scheduleActionLabel={t('ai.chat.schedule.action')}
                scheduleEnabledLabel={t('common.enabled')}
                scheduleDisabledLabel={t('common.disabled')}
                scheduleEditLabel={t('ai.chat.schedule.edit')}
                scheduleDeleteLabel={t('common.button.delete')}
                scheduleDeleteConfirmLabel={t('ai.chat.conversation.delete.confirm')}
                scheduleDeleteCancelLabel={t('common.button.cancel')}
                scheduleDeleteStatus={aiDeleteScheduleStatus}
                scheduleDeleteScheduleId={aiDeleteScheduleId}
                scheduleSaveLabel={t('common.button.save')}
                scheduleCancelLabel={t('common.button.cancel')}
                scheduleCreateLabel={t('ai.chat.schedule.create')}
                scheduleRows={aiSchedules}
                scheduleSkills={aiScheduleSkills}
                scheduleDraft={aiScheduleDraft}
                scheduleEditDraft={aiScheduleEditDraft}
                initialMessageLabel={t('ai.chat.initial-message')}
                initialMessage={aiInitialPrompt}
                conversationStatus={aiConversations.status}
                conversationStatusLabel={t(aiConversations.statusLabelKey)}
                conversations={aiConversationRows}
                onNewConversation={createNewAiConversation}
                onConversationSelect={setSelectedAiConversationId}
                onConversationDeleteRequest={requestDeleteAiConversation}
                onConversationDeleteCancel={cancelDeleteAiConversation}
                onConversationDeleteConfirm={confirmDeleteAiConversation}
                messageStatus={aiMessageStatus}
                messageStatusLabel={t(aiMessageStatusLabelKey)}
                conversationMessages={aiConversationMessageRows}
                onInputChange={setAiDraftMessage}
                onSendMessage={sendAiMessage}
                onConfigOpen={openAiProviderConfig}
                onConfigClose={() => setAiConfigOpen(false)}
                onConfigSave={saveAiProviderConfig}
                onConfigResetDefaults={resetAiProviderDefaults}
                onConfigChange={changeAiProviderConfig}
                onScheduleOpen={openAiSchedulePanel}
                onScheduleClose={() => setAiScheduleOpen(false)}
                onScheduleDraftChange={setAiScheduleDraft}
                onScheduleCreate={createAiScheduleFromDraft}
                onScheduleToggle={toggleAiSchedule}
                onScheduleEditStart={startAiScheduleEdit}
                onScheduleEditCancel={() => setAiScheduleEditDraft(null)}
                onScheduleEditChange={setAiScheduleEditDraft}
                onScheduleUpdate={updateAiScheduleFromDraft}
                onScheduleDeleteRequest={requestDeleteAiSchedule}
                onScheduleDeleteCancel={cancelDeleteAiSchedule}
                onScheduleDeleteConfirm={confirmDeleteAiSchedule}
                previewMessages={[
                  { role: 'assistant', label: t('ai.chat.assistant'), content: t('ai.chat.offline.response') }
                ]}
                onClose={() => setAiChatOpen(false)}
              />
            ) : null}
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
