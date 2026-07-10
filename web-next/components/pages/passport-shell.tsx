'use client';

import React, { type ReactNode, useEffect, useState } from 'react';
import Image from 'next/image';
import { Globe2 } from 'lucide-react';
import { HzPassportSessionClearFrame } from '@hertzbeat/ui';
import { useI18n } from '../providers/i18n-provider';
import { LocaleOptionList } from '../shell/locale-option-list';
import { PlatformCopyrightFooter } from '../shell/platform-copyright-footer';
import { WorkbenchPanel } from '../workbench/primitives';
import { clearClientSessionMarker, clearClientSessionUserSnapshot } from '../../lib/session-client';
import { cn } from '../../lib/utils';

type PassportShellProps = {
  children: ReactNode;
  panelClassName?: string;
  sessionLifecycle?: 'clear-on-entry' | 'preserve-on-lock';
};

type PassportPanelProps = {
  children: ReactNode;
  title?: ReactNode;
  header?: ReactNode;
  className?: string;
};

export function PassportShell({ children, panelClassName, sessionLifecycle = 'clear-on-entry' }: PassportShellProps) {
  const { t, locale, locales, setLocale } = useI18n();
  const [localeOpen, setLocaleOpen] = useState(false);
  const shouldClearSession = sessionLifecycle === 'clear-on-entry';
  const sessionContract = shouldClearSession ? 'angular-token-service-clear-on-passport-entry' : 'angular-lock-preserve-session';
  const passportPoints = [
    t('about.point.1'),
    t('about.point.2'),
    t('about.point.3'),
    t('about.point.4'),
    t('about.point.5'),
    t('about.point.6')
  ];

  useEffect(() => {
    if (!shouldClearSession) {
      return;
    }
    clearClientSessionMarker();
    clearClientSessionUserSnapshot();
  }, [shouldClearSession]);

  return (
    <HzPassportSessionClearFrame
      className="relative min-h-screen overflow-hidden bg-[var(--ops-background)] text-[var(--ops-text-primary)]"
      lifecycle={sessionLifecycle}
      data-login-shell="passport"
      data-passport-shell="true"
      data-passport-shell-visual="ops-dark-entry"
      data-passport-session-clear-contract={sessionContract}
      data-passport-session-clear-enabled={shouldClearSession ? 'true' : 'false'}
      data-passport-session-clear-owner="hertzbeat-ui-passport-session-clear"
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(79,107,220,0.2),transparent_34%),radial-gradient(circle_at_78%_12%,rgba(19,200,255,0.1),transparent_30%),linear-gradient(180deg,rgba(13,18,28,0.98),rgba(8,9,12,0.99))]"
        data-passport-background-overlay="angular-light"
        data-passport-background-tone="ops-dark"
      />
      <div
        className="relative z-10 min-h-screen px-5 pt-10 pb-3 md:px-8"
        data-passport-shell-spacing="angular-reference"
      >
        <div className="mx-auto flex min-h-[calc(100vh-4.25rem)] max-w-7xl flex-col">
          <header className="relative text-center">
            <div className="absolute right-0 top-0 hidden md:block">
              <div className="relative">
                <button
                  aria-label={t('app.passport.language-switch')}
                  className="inline-flex h-9 w-9 items-center justify-center text-[var(--ops-primary)] transition-colors hover:text-[var(--ops-primary-hover)]"
                  data-passport-locale-trigger="globe"
                  data-passport-locale-tone="angular-magenta"
                  data-passport-locale-visual-tone="ops-primary"
                  type="button"
                  onClick={() => setLocaleOpen(open => !open)}
                >
                  <Globe2 size={24} strokeWidth={2.4} />
                </button>
                {localeOpen ? (
                  <WorkbenchPanel
                    density="flush"
                    tone="raised"
                    className="absolute right-0 top-11 z-20 min-w-[180px] rounded-[6px] p-1 shadow-[var(--ops-panel-shadow-strong)]"
                  >
                    <LocaleOptionList
                      locale={locale}
                      locales={locales}
                      className="p-1"
                      itemClassName="rounded-[2px] px-3 py-2 text-[12px] text-[var(--ops-text-secondary)]"
                      inactiveItemClassName="hover:bg-[var(--ops-surface-elevated)] hover:text-[var(--ops-text-primary)]"
                      activeItemClassName="bg-[var(--ops-surface-elevated)] text-[var(--ops-text-primary)]"
                      activeIndicatorClassName="text-[var(--ops-primary)]"
                      onSelect={async nextLocale => {
                        await setLocale(nextLocale);
                        setLocaleOpen(false);
                      }}
                    />
                  </WorkbenchPanel>
                ) : null}
              </div>
            </div>
            <div
              className="mx-auto inline-flex translate-y-2 items-center justify-center"
              data-passport-brand-lockup="angular-lowered"
            >
              <Image src="/assets/brand.svg" alt="HertzBeat" width={220} height={52} className="h-[55px] w-auto object-contain" priority />
            </div>
            <p className="mt-3 translate-y-2 text-sm tracking-[0.02em] text-[var(--ops-text-secondary)]">
              {t('app.passport.desc')}
            </p>
          </header>

          <div
            className="mt-3 grid flex-1 items-start gap-8 pt-4 lg:translate-x-3 lg:gap-24 lg:grid-cols-[minmax(0,11fr)_minmax(0,10fr)]"
            data-passport-content-alignment="angular-centered"
            data-passport-content-gutter="angular-right-shift"
            data-passport-vertical-position="angular-upper-content"
          >
            <section className="hidden lg:flex lg:flex-col lg:pl-[15%]" data-passport-hero-offset="angular-left-reference">
              <div className="max-w-[600px]">
                <h1 className="text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold leading-[1.2] text-[var(--ops-text-primary)]">
                  {t('app.passport.intro-1')}
                  <br />
                  {t('app.passport.intro-2')}
                </h1>
                <div
                  className="mt-[10px] h-px w-full bg-[rgba(255,255,255,0.44)]"
                  data-passport-intro-separator="top"
                />
                <ul
                  className="mt-2 flex max-w-[590px] flex-col gap-2 text-[13px] font-semibold leading-[1.35] text-white"
                  data-passport-intro-list="angular-single-column"
                  data-passport-intro-bullet-tone="angular-cyan"
                >
                  {passportPoints.map(point => (
                    <li key={point} className="flex items-start gap-3">
                      <span className="mt-[6px] h-[5px] w-[5px] shrink-0 rounded-full border border-[rgba(255,255,255,0.8)] bg-[#13c8ff]" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <div
                  className="mt-[10px] h-px w-full bg-[rgba(255,255,255,0.44)]"
                  data-passport-intro-separator="bottom"
                />
              </div>
            </section>

            <section className={cn('mx-auto w-full', panelClassName)}>
              {children}
            </section>
          </div>

          <PlatformCopyrightFooter
            className="mt-auto pt-4 text-center text-[13px] leading-6"
            data-passport-footer-band="angular-raised"
            data-passport-footer-tone="angular-muted"
            data-passport-footer-visual-tone="ops-muted"
            headlineClassName="text-[var(--ops-text-tertiary)]"
            innerClassName="border-t border-[var(--ops-border-color)] pt-4"
            lineClassName="text-[var(--ops-text-tertiary)]"
            linkClassName="text-[var(--ops-primary)]"
            version="v1.8.0"
          />
        </div>
      </div>
    </HzPassportSessionClearFrame>
  );
}

export function PassportPanel({ children, title, header, className }: PassportPanelProps) {
  return (
    <WorkbenchPanel
      as="section"
      data-passport-panel="true"
      className={cn(
        'rounded-[6px] px-5 py-5 shadow-[var(--ops-panel-shadow-strong)]',
        className
      )}
    >
      {header ? (
        header
      ) : title ? (
        <div className="text-center">
          <div className="text-[16px] font-semibold text-[var(--ops-text-primary)]">
            {title}
          </div>
        </div>
      ) : null}
      {children}
    </WorkbenchPanel>
  );
}
