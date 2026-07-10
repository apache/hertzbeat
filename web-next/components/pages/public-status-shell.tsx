'use client';

import React, { useState } from 'react';
import { ArrowLeftCircle, ArrowRightCircle, ChevronDown, ExternalLink, MessageSquareText, RefreshCw } from 'lucide-react';
import { useI18n } from '../providers/i18n-provider';
import { LocaleOptionList } from '../shell/locale-option-list';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { NumberStepper } from '../ui/number-stepper';
import { WorkbenchActionButton, WorkbenchPanel } from '../workbench/primitives';
import type { LOCALES, LocaleCode } from '../../lib/i18n';
import { cn } from '../../lib/utils';

type PublicStatusBrand = {
  title: string;
  subtitle: string;
  logo: string;
  color: string;
  stateLabel: string;
  stateColor: string;
  homeHref: string | null;
  feedbackHref: string | null;
  feedbackLabel: string;
  updatedLabel: string;
  updatedAt: string;
};

type PublicStatusBadgeTone = 'success' | 'danger' | 'default';

type PublicStatusComponentCard = {
  key: string;
  title: string;
  copy: string;
  state: number | string | null;
  tone: PublicStatusBadgeTone;
  statusLabel: string;
  latestTimeLabel: string;
  latestUptimeLabel: string;
  blocks: Array<{
    timestampLabel: string;
    uptimeLabel: string;
    title: string;
    color: string;
  }>;
};

type PublicStatusIncidentCard = {
  key: string;
  title: string;
  copy: string;
  state: number | string | null;
  tone: PublicStatusBadgeTone;
  stateLabel: string;
  stateColor: string;
  startAtLabel: string;
  updateAtLabel: string;
  contents: Array<{
    timestampLabel: string;
    stateLabel: string;
    state: number | null;
    tone: PublicStatusBadgeTone;
    stateColor: string;
    message: string;
  }>;
};

type PublicStatusShellProps = {
  pageLabel: string;
  mode: 'component' | 'incident';
  onModeChange: (mode: 'component' | 'incident') => void;
  brand: PublicStatusBrand;
  locale: LocaleCode;
  locales: typeof LOCALES;
  onSelectLocale: (locale: LocaleCode) => void | Promise<void>;
  componentCards: PublicStatusComponentCard[];
  componentEmptyTitle: string;
  componentEmptyCopy: string;
  componentWindowStartLabel: string;
  componentWindowEndLabel: string;
  incidentTitle: string;
  incidentCards: PublicStatusIncidentCard[];
  incidentLoading: boolean;
  incidentError: string | null;
  incidentEmptyTitle: string;
  incidentEmptyCopy: string;
  loadingTitle: string;
  loadFailedTitle: string;
  selectedYear: number;
  currentYear: number;
  onSelectedYearChange: (year: number) => void;
  onRefreshIncidents: () => void;
  yearLabel: string;
  refreshLabel: string;
  incidentStartLabel: string;
  incidentUpdateLabel: string;
  poweredByLabel: string;
  toIncidentLabel: string;
  toComponentLabel: string;
  uptimeLabel: string;
};

const shellBorderClass = 'border-[var(--ops-border-color)]';
const shellPanelClass = 'bg-[var(--ops-surface-panel)]';
const shellRaisedClass = 'bg-[var(--ops-surface-raised)]';
const shellElevatedClass = 'bg-[var(--ops-surface-elevated)]';
const shellTextPrimaryClass = 'text-[var(--ops-text-primary)]';
const shellTextSecondaryClass = 'text-[var(--ops-text-secondary)]';
const shellTextTertiaryClass = 'text-[var(--ops-text-tertiary)]';

function accentStyle(accent?: string | null) {
  const color = accent || 'var(--ops-text-tertiary)';
  return {
    borderColor: `${color}44`,
    backgroundColor: `${color}14`,
    color
  };
}

function publicStatusBrandFallbackLabel(title: string) {
  return title.trim().slice(0, 2).toUpperCase() || 'HB';
}

function PublicStatusBrandMark({ brand }: { brand: PublicStatusBrand }) {
  const [logoFailed, setLogoFailed] = useState(false);

  if (brand.logo && !logoFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brand.logo}
        alt={brand.title}
        className="h-full w-full object-contain"
        data-public-status-logo="source"
        onError={() => setLogoFailed(true)}
      />
    );
  }

  return (
    <span
      className={cn('text-[14px] font-semibold uppercase tracking-[0.18em]', shellTextSecondaryClass)}
      data-public-status-logo-fallback="text"
    >
      {publicStatusBrandFallbackLabel(brand.title)}
    </span>
  );
}

function PublicStatusComponentRows({
  cards,
  emptyTitle,
  emptyCopy,
  windowStartLabel,
  windowEndLabel,
  uptimeLabel
}: {
  cards: PublicStatusComponentCard[];
  emptyTitle: string;
  emptyCopy: string;
  windowStartLabel: string;
  windowEndLabel: string;
  uptimeLabel: string;
}) {
  if (cards.length === 0) {
    return (
      <div className={cn('border-b py-6 text-sm', shellBorderClass, shellTextSecondaryClass)}>
        <div className={cn('font-semibold', shellTextPrimaryClass)}>{emptyTitle}</div>
        <div className="mt-1">{emptyCopy}</div>
      </div>
    );
  }

  return (
    <>
      {cards.map(card => (
        <article key={card.key} className={cn('border-b py-5 last:border-b-0', shellBorderClass)}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={cn('text-[15px] font-semibold', shellTextPrimaryClass)}>{card.title}</h3>
                <Badge variant={card.tone}>{card.statusLabel}</Badge>
              </div>
              <p className={cn('mt-1 text-[12px] leading-6', shellTextSecondaryClass)}>{card.copy}</p>
            </div>
            <div className="shrink-0 text-left md:text-right">
              <div className={cn('text-[10px] uppercase tracking-[0.18em]', shellTextTertiaryClass)}>{uptimeLabel}</div>
              <div className={cn('mt-1 text-[13px] font-semibold', shellTextPrimaryClass)}>{card.latestUptimeLabel}</div>
              <div className={cn('mt-1 text-[11px]', shellTextTertiaryClass)}>{card.latestTimeLabel}</div>
            </div>
          </div>

          <div className="mt-4 flex h-10 gap-1.5">
            {card.blocks.length > 0
              ? card.blocks.map((block, index) => (
                  <div
                    key={`${card.key}-${index}-${block.timestampLabel}`}
                    className="min-w-0 flex-1 rounded-[3px]"
                    title={block.title}
                    aria-label={`${card.title} ${block.timestampLabel} ${block.uptimeLabel}`}
                    style={{ background: block.color }}
                  />
                ))
              : (
                <div className={cn('flex h-full w-full items-center justify-center rounded-[3px] border text-[12px]', shellBorderClass, shellRaisedClass, shellTextTertiaryClass)}>
                  {emptyCopy}
                </div>
              )}
          </div>

          <div className={cn('mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em]', shellTextTertiaryClass)}>
            <span>{windowStartLabel}</span>
            <span>{windowEndLabel}</span>
          </div>
        </article>
      ))}
    </>
  );
}

function PublicStatusIncidentRows({
  title,
  cards,
  loading,
  error,
  emptyTitle,
  emptyCopy,
  loadingTitle,
  loadFailedTitle,
  selectedYear,
  currentYear,
  onSelectedYearChange,
  onRefresh,
  yearLabel,
  decrementYearLabel,
  incrementYearLabel,
  refreshLabel,
  startLabel,
  updateLabel
}: {
  title: string;
  cards: PublicStatusIncidentCard[];
  loading: boolean;
  error: string | null;
  emptyTitle: string;
  emptyCopy: string;
  loadingTitle: string;
  loadFailedTitle: string;
  selectedYear: number;
  currentYear: number;
  onSelectedYearChange: (year: number) => void;
  onRefresh: () => void;
  yearLabel: string;
  decrementYearLabel: string;
  incrementYearLabel: string;
  refreshLabel: string;
  startLabel: string;
  updateLabel: string;
}) {
  let content: React.ReactNode;

  if (loading) {
    content = (
      <div className={cn('border-b py-6 text-sm', shellBorderClass, shellTextSecondaryClass)}>
        <div className={cn('font-semibold', shellTextPrimaryClass)}>{loadingTitle}</div>
      </div>
    );
  } else if (error) {
    content = (
      <div className="border-b border-[rgba(216,111,91,0.28)] bg-[rgba(216,111,91,0.08)] py-6 text-sm text-[var(--ops-text-secondary)]">
        <div className={cn('font-semibold', shellTextPrimaryClass)}>{loadFailedTitle}</div>
        <div className="mt-1">{error}</div>
      </div>
    );
  } else if (cards.length === 0) {
    content = (
      <div className={cn('border-b py-6 text-sm', shellBorderClass, shellTextSecondaryClass)}>
        <div className={cn('font-semibold', shellTextPrimaryClass)}>{emptyTitle}</div>
        <div className="mt-1">{emptyCopy}</div>
      </div>
    );
  } else {
    content = cards.map(card => (
      <details key={card.key} open className={cn('border-b py-5 last:border-b-0', shellBorderClass)}>
        <summary className="flex cursor-pointer list-none flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className={cn('text-[15px] font-semibold', shellTextPrimaryClass)}>{card.title}</div>
            <div className={cn('mt-1 text-[12px] leading-6', shellTextSecondaryClass)}>{card.copy}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: card.stateColor || '#6b7280' }} />
            <Badge variant={card.tone} style={accentStyle(card.stateColor)}>
              {card.stateLabel}
            </Badge>
          </div>
        </summary>

        <div className={cn('mt-4 grid gap-2 text-[11px] uppercase tracking-[0.16em] md:grid-cols-2', shellTextTertiaryClass)}>
          <div>
            {startLabel} {card.startAtLabel}
          </div>
          <div className="md:text-right">
            {updateLabel} {card.updateAtLabel}
          </div>
        </div>

        <div className={cn('mt-4 border-l pl-4', shellBorderClass)}>
          <div className="space-y-3">
            {card.contents.map(contentItem => (
              <div key={`${card.key}-${contentItem.timestampLabel}-${contentItem.message}`} className="grid gap-2 md:grid-cols-[140px_minmax(0,120px)_1fr]">
                <div className={cn('text-[11px] uppercase tracking-[0.16em]', shellTextTertiaryClass)}>{contentItem.timestampLabel}</div>
                <div>
                  <Badge variant={contentItem.tone} style={accentStyle(contentItem.stateColor || card.stateColor)}>
                    {contentItem.stateLabel}
                  </Badge>
                </div>
                <div className={cn('text-[12px] leading-6', shellTextSecondaryClass)}>{contentItem.message}</div>
              </div>
            ))}
          </div>
        </div>
      </details>
    ));
  }

  return (
    <section className="mt-6">
      <div className={cn('flex flex-col gap-3 border-b pb-4 md:flex-row md:items-end md:justify-between', shellBorderClass)}>
        <div>
          <h2 className={cn('text-[16px] font-semibold', shellTextPrimaryClass)}>{title}</h2>
          <p className={cn('mt-1 text-[12px] leading-6', shellTextSecondaryClass)}>{selectedYear}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-[148px] flex-col gap-1.5">
            <span className={cn('text-[10px] uppercase tracking-[0.18em]', shellTextTertiaryClass)}>{yearLabel}</span>
            <NumberStepper
              data-testid="status-public-year-input"
              data-status-public-year-stepper="hertzbeat-ui-number-stepper"
              min="1970"
              max={String(currentYear)}
              value={String(selectedYear)}
              decrementLabel={decrementYearLabel}
              incrementLabel={incrementYearLabel}
              onValueChange={value => onSelectedYearChange(Number.parseInt(value, 10))}
              className="text-[13px]"
              containerClassName="h-9"
            />
          </label>
          <Button
            type="button"
            size="sm"
            variant="subtle"
            data-testid="status-public-refresh"
            onClick={onRefresh}
            className="h-9 px-3"
          >
            <RefreshCw size={14} />
            {refreshLabel}
          </Button>
        </div>
      </div>
      <div>{content}</div>
    </section>
  );
}

export function PublicStatusShell({
  pageLabel,
  mode,
  onModeChange,
  brand,
  locale,
  locales,
  onSelectLocale,
  componentCards,
  componentEmptyTitle,
  componentEmptyCopy,
  componentWindowStartLabel,
  componentWindowEndLabel,
  incidentTitle,
  incidentCards,
  incidentLoading,
  incidentError,
  incidentEmptyTitle,
  incidentEmptyCopy,
  loadingTitle,
  loadFailedTitle,
  selectedYear,
  currentYear,
  onSelectedYearChange,
  onRefreshIncidents,
  yearLabel,
  refreshLabel,
  incidentStartLabel,
  incidentUpdateLabel,
  poweredByLabel,
  toIncidentLabel,
  toComponentLabel,
  uptimeLabel
}: PublicStatusShellProps) {
  const { t } = useI18n();
  const [localeOpen, setLocaleOpen] = useState(false);
  const activeLocale = locales.find(option => option.code === locale) ?? locales[0];
  const bannerColor = brand.color || '#121317';

  return (
    <div
      className="min-h-screen bg-[var(--ops-background)] text-[var(--ops-text-primary)]"
      data-public-status-shell="true"
      data-public-status-mode={mode}
      data-public-status-api-contract="angular-public-status"
      data-public-status-api-owner="status-center-public-controller"
      data-public-status-mode-switch-contract="component-incident"
    >
      <div
        className={cn('border-b bg-[var(--ops-surface-panel)]', shellBorderClass)}
        style={{ backgroundImage: 'linear-gradient(180deg,rgba(18,19,23,0.96),rgba(11,12,14,0.98))' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <div className={cn('text-[10px] uppercase tracking-[0.28em]', shellTextTertiaryClass)}>{pageLabel}</div>
            <div className={cn('mt-1 text-[12px]', shellTextSecondaryClass)}>
              {brand.updatedLabel} {brand.updatedAt}
            </div>
          </div>
          <div className="relative">
            <WorkbenchActionButton
              type="button"
              data-testid="status-public-locale-toggle"
              hoverTone="elevated"
              onClick={() => setLocaleOpen(open => !open)}
            >
              <span className="inline-flex min-w-5 items-center justify-center text-[14px] leading-none">{activeLocale?.abbr}</span>
              <span>{t(activeLocale?.labelKey || 'settings.system-config.locale.en_US')}</span>
              <ChevronDown size={14} className={shellTextTertiaryClass} />
            </WorkbenchActionButton>
            {localeOpen ? (
              <WorkbenchPanel
                density="flush"
                tone="raised"
                className="absolute right-0 top-11 z-20 min-w-[196px] rounded-[6px] p-1 shadow-[var(--ops-panel-shadow-strong)]"
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
                    await onSelectLocale(nextLocale);
                    setLocaleOpen(false);
                  }}
                />
              </WorkbenchPanel>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={cn('border-b bg-[var(--ops-surface-panel)]', shellBorderClass)}
        style={{
          backgroundImage: `linear-gradient(135deg, ${bannerColor}d6 0%, rgba(18,19,23,0.94) 36%, rgba(11,12,14,0.98) 100%)`
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex items-center gap-4">
            {brand.homeHref ? (
              <WorkbenchPanel
                as="a"
                density="flush"
                tone="elevated"
                href={brand.homeHref}
                target="_blank"
                rel="noreferrer"
                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[6px] p-2"
              >
                <PublicStatusBrandMark brand={brand} />
              </WorkbenchPanel>
            ) : (
              <WorkbenchPanel
                density="flush"
                tone="elevated"
                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[6px] p-2"
              >
                <PublicStatusBrandMark brand={brand} />
              </WorkbenchPanel>
            )}
            <div className="min-w-0">
              <div className={cn('text-[10px] uppercase tracking-[0.28em]', shellTextTertiaryClass)}>{pageLabel}</div>
              <h1 className="mt-2 text-[clamp(1.65rem,4vw,2.5rem)] font-semibold tracking-[-0.04em] text-[var(--ops-text-primary)]">{brand.title}</h1>
              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[var(--ops-text-secondary)]">{brand.subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className={cn('flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between', shellBorderClass)}>
          <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--ops-text-primary)]">{brand.title}</h2>
          </div>
          {brand.feedbackHref ? (
            <a href={brand.feedbackHref} target="_blank" rel="noreferrer">
              <Button type="button" variant="primary" size="sm" className="rounded-[2px] px-3">
                <MessageSquareText size={14} />
                {brand.feedbackLabel}
              </Button>
            </a>
          ) : null}
        </div>

        <WorkbenchPanel
          as="section"
          className="mt-4 rounded-[6px] px-4 py-3"
          style={{ borderColor: `${brand.stateColor}55`, backgroundImage: `linear-gradient(135deg, ${brand.stateColor}1f 0%, rgba(18,19,23,0.96) 100%)` }}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: brand.stateColor }} />
              <span className="text-[13px] font-semibold text-[var(--ops-text-primary)]">{brand.stateLabel}</span>
            </div>
            <div className="text-[11px] text-[var(--ops-text-secondary)]">
              {brand.updatedLabel} {brand.updatedAt}
            </div>
          </div>
        </WorkbenchPanel>

        {mode === 'component' ? (
          <section className="mt-6">
            <PublicStatusComponentRows
              cards={componentCards}
              emptyTitle={componentEmptyTitle}
              emptyCopy={componentEmptyCopy}
              windowStartLabel={componentWindowStartLabel}
              windowEndLabel={componentWindowEndLabel}
              uptimeLabel={uptimeLabel}
            />
          </section>
        ) : (
          <PublicStatusIncidentRows
            title={incidentTitle}
            cards={incidentCards}
            loading={incidentLoading}
            error={incidentError}
            emptyTitle={incidentEmptyTitle}
            emptyCopy={incidentEmptyCopy}
            loadingTitle={loadingTitle}
            loadFailedTitle={loadFailedTitle}
            selectedYear={selectedYear}
            currentYear={currentYear}
            onSelectedYearChange={onSelectedYearChange}
            onRefresh={onRefreshIncidents}
            yearLabel={yearLabel}
            decrementYearLabel={`${t('common.decrement')} ${yearLabel}`}
            incrementYearLabel={`${t('common.increment')} ${yearLabel}`}
            refreshLabel={refreshLabel}
            startLabel={incidentStartLabel}
            updateLabel={incidentUpdateLabel}
          />
        )}

        <footer className={cn('mt-8 flex flex-col gap-3 border-t pt-4 text-[12px] sm:flex-row sm:items-center sm:justify-between', shellBorderClass, shellTextSecondaryClass)}>
          <a
            data-testid="status-public-powered-by"
            href="https://github.com/apache/hertzbeat"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition hover:text-[var(--ops-text-primary)]"
          >
            {poweredByLabel}
            <ExternalLink size={14} />
          </a>
          {mode === 'component' ? (
            <Button
              type="button"
              data-testid="status-public-mode-incident"
              data-public-status-mode-switch="component-to-incident"
              data-public-status-mode-switch-owner="hertzbeat-ui-button"
              variant="ghost"
              className="justify-start rounded-[2px] px-0 text-[var(--ops-text-secondary)] hover:bg-transparent hover:text-[var(--ops-text-primary)]"
              onClick={() => onModeChange('incident')}
            >
              {toIncidentLabel}
              <ArrowRightCircle size={14} />
            </Button>
          ) : (
            <Button
              type="button"
              data-testid="status-public-mode-component"
              data-public-status-mode-switch="incident-to-component"
              data-public-status-mode-switch-owner="hertzbeat-ui-button"
              variant="ghost"
              className="justify-start rounded-[2px] px-0 text-[var(--ops-text-secondary)] hover:bg-transparent hover:text-[var(--ops-text-primary)]"
              onClick={() => onModeChange('component')}
            >
              <ArrowLeftCircle size={14} />
              {toComponentLabel}
            </Button>
          )}
        </footer>
      </main>
    </div>
  );
}
