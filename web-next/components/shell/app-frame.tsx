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
  Megaphone,
  Menu,
  Sparkles,
  MessageSquare,
  Maximize2,
  Info,
  Settings,
  Settings2,
  Tags
} from 'lucide-react';
import { useI18n } from '@/components/providers/i18n-provider';
import { LocaleOptionList } from '@/components/shell/locale-option-list';
import { AuthGate } from '@/components/shell/auth-gate';
import { AppSidebar } from '@/components/shell/app-sidebar';
import { PlatformCopyrightFooter } from './platform-copyright-footer';
import { Input } from '../ui/input';
import { apiGet } from '@/lib/api-client';
import { isStandaloneRoute, shouldLoadHeaderState } from '@/lib/app-frame-state';
import { buildAlertListUrl } from '@/lib/alert-manage/query-state';
import { buildLoginRedirectHref } from '@/lib/passport-login/controller';
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

const HEADER_MUTE_STORAGE_KEY = 'hb.header-mute';
const PLATFORM_FOOTER_VERSION = 'v1.8.0';
const ANGULAR_SETUP_BASELINE_COMPLETED = 5;
const ANGULAR_SETUP_BASELINE_TOTAL = 6;
const ANGULAR_SETUP_BASELINE_PERCENT = 83;

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

type HeaderNotice = {
  id: number;
  title: string;
  status: string;
  activeAt?: number | null;
};

function readHeaderMute() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(HEADER_MUTE_STORAGE_KEY) !== 'false';
}

function writeHeaderMute(muted: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HEADER_MUTE_STORAGE_KEY, String(muted));
}

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

function formatHeaderTime(value?: number | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
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
  const pathname = usePathname();
  const [setupOpen, setSetupOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [notificationsMuted, setNotificationsMuted] = useState(true);
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [alertNotices, setAlertNotices] = useState<HeaderNotice[]>([]);
  const [setupSummary, setSetupSummary] = useState<SetupSummary>(() => buildEmptySetupSummary(t));
  const setupRef = useRef<HTMLDivElement | null>(null);
  const notifyRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const userRef = useRef<HTMLDivElement | null>(null);
  const standaloneRoute = isStandaloneRoute(pathname);

  function logout() {
    window.localStorage.removeItem('Authorization');
    window.localStorage.removeItem('refresh-token');
    window.location.href = buildLoginRedirectHref(undefined, process.env.NEXT_PUBLIC_LOGIN_PATH);
  }

  function toggleFullscreen() {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void document.documentElement.requestFullscreen();
  }

  function toggleMute() {
    setNotificationsMuted(current => {
      const next = !current;
      writeHeaderMute(next);
      return next;
    });
  }

  function openSetupAction(action: SetupAction) {
    setSetupOpen(false);
    router.push(resolveSetupActionHref(action));
  }

  function submitAiPrompt() {
    const query = aiPrompt.trim();
    router.push(query ? `/overview?ai=${encodeURIComponent(query)}` : '/overview');
  }

  useEffect(() => {
    setNotificationsMuted(readHeaderMute());
  }, []);

  useEffect(() => {
    bootstrapWorkbenchTheme();
  }, []);

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
        ] = await Promise.all([
          apiGet<PageResult<unknown>>('/monitors?pageIndex=0&pageSize=1').catch(() => ({ content: [], totalElements: 0, pageIndex: 0, pageSize: 1 })),
          apiGet<PageResult<CollectorSummary>>('/collector?pageIndex=0&pageSize=1').catch(() => ({ content: [], totalElements: 0, pageIndex: 0, pageSize: 1 })),
          apiGet<PageResult<EntitySummaryInfo>>('/entities?pageIndex=0&pageSize=40&sort=gmtUpdate&order=desc').catch(() => ({ content: [], totalElements: 0, pageIndex: 0, pageSize: 40 })),
          apiGet<EntityDefinitionActivity[]>('/entities/definition-activities?limit=8').catch(() => []),
          apiGet<EntityDiscoveryGovernancePreset[]>('/entities/discovery/governance-presets?limit=8').catch(() => []),
          apiGet<AlertSummary>('/alerts/summary').catch(() => null),
          apiGet<PageResult<SingleAlert>>(
            buildAlertListUrl({ search: '', status: '', severity: '', entityId: '', entityName: '', returnTo: '' })
          ).catch(() => ({ content: [], totalElements: 0, pageIndex: 0, pageSize: 8 })),
        ]);

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
  }, [pathname, standaloneRoute, t]);

  if (standaloneRoute) {
    return <>{children}</>;
  }

  return (
    <AuthGate>
      <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
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
                  aria-label="Menu"
                  data-app-frame-icon-trigger="menu"
                >
                  <Menu size={17} />
                  <span className="sr-only">Menu</span>
                </button>
                <a
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[2px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.35)] hover:text-[hsl(var(--foreground))]"
                  href="https://github.com/apache/hertzbeat"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="GitHub"
                  data-app-frame-icon-trigger="github"
                >
                  <Github size={17} />
                  <span className="sr-only">GitHub</span>
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
                  <div className="flex h-8 items-stretch overflow-hidden rounded-[2px] border border-[hsl(var(--border))] bg-[hsl(var(--background))]">
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
                      aria-label={t('ai.chat.submit')}
                    >
                      <MessageSquare size={15} />
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
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[2px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.35)] hover:text-[hsl(var(--foreground))]"
                        onClick={toggleMute}
                        aria-label={notificationsMuted ? t('common.unmute') : t('common.mute')}
                        data-app-frame-icon-trigger="mute"
                      >
                        <Megaphone size={16} data-app-frame-glyph="mute-megaphone" />
                        <span className="sr-only">{notificationsMuted ? t('common.mute') : t('common.unmute')}</span>
                      </button>
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
                            <span>{notificationsMuted ? t('common.unmute') : t('common.mute')}</span>
                          </button>
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
                                    {item.status} · {formatHeaderTime(item.activeAt)}
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
                    >
                      <Settings size={16} data-app-frame-glyph="settings-gear" />
                      <span className="sr-only">{t('menu.settings')}</span>
                    </button>
                    {settingsOpen ? (
                      <div className="absolute right-0 top-10 z-30 min-w-[220px] rounded-[4px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-[0_8px_24px_rgba(0,0,0,.22)]">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-[2px] px-2.5 py-2 text-left text-[12px] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.5)]"
                          onClick={() => {
                            setSettingsOpen(false);
                            toggleFullscreen();
                          }}
                        >
                          <Maximize2 size={14} />
                          {t('common.fullscreen')}
                        </button>
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
                            await setLocale(nextLocale);
                            setSettingsOpen(false);
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
                      aria-label="admin"
                      data-app-frame-icon-trigger="user"
                    >
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d9dde5]"
                        data-app-frame-user-avatar="angular-circle"
                      />
                      <span className="sr-only">admin</span>
                    </button>
                    {userOpen ? (
                      <div className="absolute right-0 top-10 z-30 min-w-[180px] rounded-[4px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-[0_8px_24px_rgba(0,0,0,.22)]">
                        <Link
                          href="/setting/settings/config"
                          className="flex items-center gap-2 rounded-[2px] px-2.5 py-2 text-[12px] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.5)]"
                          onClick={() => setUserOpen(false)}
                        >
                          <Settings2 size={14} />
                          {t('menu.settings')}
                        </Link>
                        <a
                          href="https://hertzbeat.apache.org/docs/"
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-[2px] px-2.5 py-2 text-[12px] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.5)]"
                        >
                          <Info size={14} />
                          {t('common.about')}
                        </a>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-[2px] px-2.5 py-2 text-left text-[12px] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.5)]"
                          onClick={logout}
                        >
                          <LogOut size={14} />
                          {t('common.logout')}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <AppSidebar pathname={pathname} t={t} />

          <main className="relative min-w-0 self-start">
            <div data-app-frame-content-shell={buildContentFrameShellKind(pathname)} className={buildContentFrameClassName(pathname)}>
              {children}
            </div>
            <PlatformCopyrightFooter
              className="border-t border-[var(--ops-border-color)] py-2.5 text-center"
              data-platform-footer="angular-footer"
              headlineClassName="text-[11px] font-semibold text-[var(--ops-text-secondary)]"
              innerClassName="space-y-0.5"
              lineClassName="text-[10px] leading-4 text-[var(--ops-text-tertiary)]"
              linkClassName="text-[var(--ops-text-secondary)]"
              version={PLATFORM_FOOTER_VERSION}
            />
            <a
              aria-label={t('common.help')}
              className="fixed bottom-4 right-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-[6px] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_14px_38px_rgba(67,97,238,0.34)] transition hover:brightness-110"
              data-shell-help-launcher="angular-help"
              href="https://hertzbeat.apache.org/docs/"
              rel="noreferrer"
              target="_blank"
            >
              <Bot size={28} strokeWidth={2.2} />
              <span className="sr-only">{t('common.help')}</span>
            </a>
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
