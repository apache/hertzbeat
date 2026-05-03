import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { PublicStatusShell } from './public-status-shell';

vi.mock('../providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'en-US',
      overrides: {
        'settings.system-config.locale.en_US': 'English(en_US)',
        'settings.system-config.locale.zh_CN': 'Simplified Chinese(zh_CN)'
      }
    })
  })
}));

describe('PublicStatusShell', () => {
  it('renders the shared public status shell posture for the unified status route', () => {
    const html = renderToStaticMarkup(
      <PublicStatusShell
        pageLabel="Status"
        mode="component"
        onModeChange={() => {}}
        brand={{
          title: 'Operator Status',
          subtitle: 'Unified public signal posture for the active operator desk.',
          logo: '',
          color: '#0f172a',
          stateLabel: 'Operational',
          stateColor: '#4ade80',
          homeHref: 'https://hertzbeat.apache.org',
          feedbackHref: 'mailto:ops@hertzbeat.apache.org',
          feedbackLabel: 'Contact support',
          updatedLabel: 'Updated',
          updatedAt: '2026-04-20 19:10'
        }}
        locale={'en-US' as any}
        locales={
          [
            { code: 'en-US', labelKey: 'settings.system-config.locale.en_US', abbr: '🇬🇧' },
            { code: 'zh-CN', labelKey: 'settings.system-config.locale.zh_CN', abbr: '🇨🇳' }
          ] as any
        }
        onSelectLocale={() => {}}
        componentCards={[
          {
            key: 'api',
            title: 'Public API',
            copy: 'Primary signal intake service.',
            state: 0,
            statusLabel: 'Operational',
            latestTimeLabel: '19:10',
            latestUptimeLabel: '99.99%',
            blocks: [
              {
                timestampLabel: '18:10',
                uptimeLabel: '99.99%',
                title: '18:10 99.99%',
                color: '#4ade80'
              }
            ]
          }
        ]}
        componentEmptyTitle="No components"
        componentEmptyCopy="No components available."
        componentWindowStartLabel="Start"
        componentWindowEndLabel="Now"
        incidentTitle="Incidents"
        incidentCards={[]}
        incidentLoading={false}
        incidentError={null}
        incidentEmptyTitle="No incidents"
        incidentEmptyCopy="No incidents available."
        loadingTitle="Loading"
        loadFailedTitle="Load failed"
        selectedYear={2026}
        currentYear={2026}
        onSelectedYearChange={() => {}}
        onRefreshIncidents={() => {}}
        yearLabel="Year"
        refreshLabel="Refresh"
        incidentStartLabel="Start"
        incidentUpdateLabel="Updated"
        poweredByLabel="Power by Apache HertzBeat™. Star Us !"
        toIncidentLabel="View incidents"
        toComponentLabel="View components"
        uptimeLabel="Uptime"
      />
    );

    expect(html).toContain('data-public-status-shell="true"');
    expect(html).toContain('data-public-status-mode="component"');
    expect(html).toContain('Operator Status');
    expect(html).toContain('Unified public signal posture for the active operator desk.');
    expect(html).toContain('English(en_US)');
    expect(html).toContain('Contact support');
    expect(html).toContain('Power by Apache HertzBeat™. Star Us !');
    expect(html).toContain('View incidents');
  });

  it('removes the remaining white-shell residue and adopts shared ops tokens', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/public-status-shell.tsx'), 'utf8');

    expect(source).not.toContain('bg-[#04070c]');
    expect(source).not.toContain('text-white');
    expect(source).not.toContain('text-white/88');
    expect(source).not.toContain('text-white/70');
    expect(source).not.toContain('text-white/68');
    expect(source).not.toContain('text-white/60');
    expect(source).not.toContain('text-white/58');
    expect(source).not.toContain('text-white/52');
    expect(source).not.toContain('text-white/50');
    expect(source).not.toContain('text-white/48');
    expect(source).not.toContain('text-white/38');
    expect(source).not.toContain('text-white/34');
    expect(source).not.toContain('border-white/8');
    expect(source).not.toContain('border-white/10');
    expect(source).not.toContain('bg-white/[0.03]');
    expect(source).not.toContain('bg-white/[0.04]');
    expect(source).not.toContain('bg-[rgba(8,12,20,0.96)]');
    expect(source).not.toContain('hover:bg-white/[0.07]');
    expect(source).not.toContain('hover:bg-white/8');

    expect(source).toContain('bg-[var(--ops-background)]');
    expect(source).toContain('border-[var(--ops-border-color)]');
    expect(source).toContain('bg-[var(--ops-surface-panel)]');
    expect(source).toContain('bg-[var(--ops-surface-raised)]');
    expect(source).toContain('text-[var(--ops-text-primary)]');
    expect(source).toContain('text-[var(--ops-text-secondary)]');
    expect(source).toContain('text-[var(--ops-text-tertiary)]');
    expect(source).toContain("from '../workbench/primitives'");
    expect(source).toContain('WorkbenchPanel');
    expect(source).toContain('WorkbenchActionButton');
    expect(source).not.toContain('inline-flex h-9 items-center gap-2 rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-3 text-[12px] text-[var(--ops-text-secondary)] transition-colors hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-elevated)] hover:text-[var(--ops-text-primary)]');
  });

  it('uses the shared cold number stepper for the incident year filter', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/public-status-shell.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <PublicStatusShell
        pageLabel="Status"
        mode="incident"
        onModeChange={() => {}}
        brand={{
          title: 'Operator Status',
          subtitle: 'Unified public signal posture for the active operator desk.',
          logo: '',
          color: '#0f172a',
          stateLabel: 'Operational',
          stateColor: '#4ade80',
          homeHref: null,
          feedbackHref: null,
          feedbackLabel: 'Contact support',
          updatedLabel: 'Updated',
          updatedAt: '2026-04-20 19:10'
        }}
        locale={'en-US' as any}
        locales={
          [
            { code: 'en-US', labelKey: 'settings.system-config.locale.en_US', abbr: '🇬🇧' },
            { code: 'zh-CN', labelKey: 'settings.system-config.locale.zh_CN', abbr: '🇨🇳' }
          ] as any
        }
        onSelectLocale={() => {}}
        componentCards={[]}
        componentEmptyTitle="No components"
        componentEmptyCopy="No components available."
        componentWindowStartLabel="Start"
        componentWindowEndLabel="Now"
        incidentTitle="Incidents"
        incidentCards={[]}
        incidentLoading={false}
        incidentError={null}
        incidentEmptyTitle="No incidents"
        incidentEmptyCopy="No incidents available."
        loadingTitle="Loading"
        loadFailedTitle="Load failed"
        selectedYear={2026}
        currentYear={2026}
        onSelectedYearChange={() => {}}
        onRefreshIncidents={() => {}}
        yearLabel="Year"
        refreshLabel="Refresh"
        incidentStartLabel="Start"
        incidentUpdateLabel="Updated"
        poweredByLabel="Power by Apache HertzBeat™. Star Us !"
        toIncidentLabel="View incidents"
        toComponentLabel="View components"
        uptimeLabel="Uptime"
      />
    );

    expect(source).toContain("from '../ui/number-stepper'");
    expect(source).toContain('data-status-public-year-stepper="cold-number-stepper"');
    expect(source).not.toContain('type="number"');
    expect(html).toContain('data-status-public-year-stepper="cold-number-stepper"');
    expect(html).toContain('data-cold-number-stepper-owner="cold-number-stepper"');
    expect(html).toContain('data-cold-number-stepper-input="true"');
    expect(html).toContain('data-cold-number-stepper-action="decrement"');
    expect(html).toContain('data-cold-number-stepper-action="increment"');
    expect(html).toContain('value="2026"');
  });
});
