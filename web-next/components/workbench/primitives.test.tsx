import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  PageHeader,
  PayloadPreview,
  RailSection,
  StatusState,
  SurfaceSection,
  TemplateRow,
  WorkbenchActionButton,
  WorkbenchBadge,
  WorkbenchFormControl,
  WorkbenchFullscreenShell,
  WorkbenchInsetPanel,
  WorkbenchControlChip,
  WorkbenchEditorField,
  WorkbenchPillButton,
  WorkbenchPanel,
  WorkbenchSelectableCard,
  WorkbenchStack,
  WorkbenchToolbarAction,
  WorkbenchValuePill,
  WorkbenchTableFrame
} from './primitives';

describe('workbench primitives delegation', () => {
  it('renders delegated page header', () => {
    const html = renderToStaticMarkup(
      <PageHeader
        kicker="Trace"
        title="Trace Workbench"
        subtitle="Shared header"
        facts={[
          { label: 'Total', value: '42' },
          { label: 'Errors', value: '3' }
        ]}
        actions={<button>Refresh</button>}
      />
    );

    expect(html).toContain('Trace');
    expect(html).toContain('Trace Workbench');
    expect(html).toContain('Shared header');
    expect(html).toContain('Refresh');
    expect(html).toContain('Total');
    expect(html).toContain('42');
  });

  it('renders delegated surface, rail, and status state', () => {
    const surfaceHtml = renderToStaticMarkup(<SurfaceSection title="Console" copy="Shared surface"><div>surface-body</div></SurfaceSection>);
    const railHtml = renderToStaticMarkup(<RailSection title="Rail"><div>rail-body</div></RailSection>);
    const statusHtml = renderToStaticMarkup(<StatusState title="Empty" copy="No data" tone="danger" />);

    expect(surfaceHtml).toContain('Console');
    expect(surfaceHtml).toContain('surface-body');
    expect(surfaceHtml).toContain('rounded-[10px]');
    expect(railHtml).toContain('Rail');
    expect(railHtml).toContain('rail-body');
    expect(statusHtml).toContain('Empty');
    expect(statusHtml).toContain('No data');
  });

  it('renders compact surface and rail variants with shared payload helpers', () => {
    const surfaceHtml = renderToStaticMarkup(
      <SurfaceSection title="Compact Console" density="compact">
        <div>compact-surface</div>
      </SurfaceSection>
    );
    const denseSurfaceHtml = renderToStaticMarkup(
      <SurfaceSection title="Dense Console" density="dense">
        <div>dense-surface</div>
      </SurfaceSection>
    );
    const railHtml = renderToStaticMarkup(
      <RailSection title="Compact Rail" density="compact">
        <div>compact-rail</div>
      </RailSection>
    );
    const payloadHtml = renderToStaticMarkup(<PayloadPreview>{'{"status":"ok"}'}</PayloadPreview>);
    const compactPayloadHtml = renderToStaticMarkup(
      <PayloadPreview tone="panel" density="compact">
        {'{"status":"compact"}'}
      </PayloadPreview>
    );
    const stackHtml = renderToStaticMarkup(<WorkbenchStack density="compact"><div>stack-body</div></WorkbenchStack>);

    expect(surfaceHtml).toContain('rounded-[6px]');
    expect(denseSurfaceHtml).toContain('rounded-[6px]');
    expect(denseSurfaceHtml).toContain('px-2.5');
    expect(denseSurfaceHtml).toContain('py-2');
    expect(railHtml).toContain('px-2.5');
    expect(payloadHtml).toContain('max-h-[420px]');
    expect(payloadHtml).toContain('rounded-[10px]');
    expect(compactPayloadHtml).toContain('rounded-[6px]');
    expect(compactPayloadHtml).toContain('bg-[var(--ops-surface-panel)]');
    expect(compactPayloadHtml).toContain('p-3.5');
    expect(compactPayloadHtml).toContain('text-xs');
    expect(stackHtml).toContain('space-y-1.5');
  });

  it('renders flat surface, rail, and panel variants for stackless workbench shells', () => {
    const surfaceHtml = renderToStaticMarkup(
      <SurfaceSection title="Flat Console" tone="operator" variant="flat" density="compact">
        <div>flat-surface</div>
      </SurfaceSection>
    );
    const railHtml = renderToStaticMarkup(
      <RailSection title="Flat Rail" tone="deck" variant="flat" density="compact">
        <div>flat-rail</div>
      </RailSection>
    );
    const panelHtml = renderToStaticMarkup(
      <WorkbenchPanel as="section" variant="flat">
        flat-panel
      </WorkbenchPanel>
    );

    expect(surfaceHtml).toContain('rounded-none');
    expect(surfaceHtml).toContain('border-t');
    expect(surfaceHtml).toContain('bg-transparent');
    expect(surfaceHtml).not.toContain('rounded-[6px]');
    expect(surfaceHtml).not.toContain('bg-[var(--ops-surface-panel)]');

    expect(railHtml).toContain('rounded-none');
    expect(railHtml).toContain('border-t');
    expect(railHtml).toContain('bg-transparent');
    expect(railHtml).not.toContain('rounded-[6px]');
    expect(railHtml).not.toContain('bg-[var(--ops-surface-elevated)]');

    expect(panelHtml).toContain('rounded-none');
    expect(panelHtml).toContain('border-t');
    expect(panelHtml).toContain('bg-transparent');
    expect(panelHtml).not.toContain('rounded-[10px]');
    expect(panelHtml).not.toContain('bg-[var(--ops-surface-panel)]');
  });

  it('renders shared workbench panels for exactness-sensitive page-local shells', () => {
    const articleHtml = renderToStaticMarkup(
      <WorkbenchPanel as="article" density="compact">
        panel-body
      </WorkbenchPanel>
    );
    const buttonHtml = renderToStaticMarkup(
      <WorkbenchPanel as="button" type="button" tone="raised">
        panel-button
      </WorkbenchPanel>
    );

    expect(articleHtml).toContain('rounded-[10px]');
    expect(articleHtml).toContain('bg-[var(--ops-surface-panel)]');
    expect(articleHtml).toContain('px-3.5 py-2.5');
    expect(buttonHtml).toContain('bg-[var(--ops-surface-raised)]');
    expect(buttonHtml).toContain('type="button"');
  });

  it('renders shared inset panels and table frames for inner workbench shells', () => {
    const insetHtml = renderToStaticMarkup(
      <WorkbenchInsetPanel as="article" density="spacious">
        inset-body
      </WorkbenchInsetPanel>
    );
    const tableHtml = renderToStaticMarkup(
      <WorkbenchTableFrame>
        <table>
          <tbody>
            <tr>
              <td>row</td>
            </tr>
          </tbody>
        </table>
      </WorkbenchTableFrame>
    );

    expect(insetHtml).toContain('rounded-[6px]');
    expect(insetHtml).toContain('bg-[var(--ops-surface-panel)]');
    expect(insetHtml).toContain('p-3.5');
    expect(tableHtml).toContain('overflow-x-auto');
    expect(tableHtml).toContain('rounded-[6px]');
    expect(tableHtml).toContain('px-0 py-0');
  });

  it('renders flat table frames for stackless data regions', () => {
    const html = renderToStaticMarkup(
      <WorkbenchTableFrame variant="flat">
        <table>
          <tbody>
            <tr>
              <td>flat-row</td>
            </tr>
          </tbody>
        </table>
      </WorkbenchTableFrame>
    );

    expect(html).toContain('rounded-none');
    expect(html).toContain('border-x-0');
    expect(html).toContain('border-b-0');
    expect(html).toContain('border-t');
    expect(html).toContain('bg-transparent');
    expect(html).not.toContain('rounded-[6px]');
    expect(html).not.toContain('bg-[var(--ops-surface-panel)]');
  });

  it('renders shared pill buttons and selectable cards for interaction-heavy shells', () => {
    const pillHtml = renderToStaticMarkup(
      <WorkbenchPillButton type="button" active>
        pill-button
      </WorkbenchPillButton>
    );
    const cardHtml = renderToStaticMarkup(
      <WorkbenchSelectableCard as="button" type="button" active>
        card-button
      </WorkbenchSelectableCard>
    );

    expect(pillHtml).toContain('rounded-[999px]');
    expect(pillHtml).toContain('bg-[var(--ops-surface-raised)]');
    expect(pillHtml).toContain('pill-button');
    expect(cardHtml).toContain('rounded-[6px]');
    expect(cardHtml).toContain('text-left');
    expect(cardHtml).toContain('card-button');
  });

  it('renders shared control chips for compact action and underline-toggle chrome', () => {
    const actionHtml = renderToStaticMarkup(
      <WorkbenchControlChip type="button" active>
        control-action
      </WorkbenchControlChip>
    );
    const toggleHtml = renderToStaticMarkup(
      <WorkbenchControlChip type="button" variant="underline">
        toggle-action
      </WorkbenchControlChip>
    );

    expect(actionHtml).toContain('rounded-[2px]');
    expect(actionHtml).toContain('border-[var(--ops-primary)]');
    expect(actionHtml).toContain('control-action');
    expect(toggleHtml).toContain('rounded-[2px]');
    expect(toggleHtml).toContain('toggle-action');
    expect(toggleHtml).toContain('text-[var(--ops-text-tertiary)]');
  });

  it('renders shared badges for static micro-chrome and metadata chips', () => {
    const tertiaryHtml = renderToStaticMarkup(
      <WorkbenchBadge as="span" size="micro" tone="tertiary">
        badge-count
      </WorkbenchBadge>
    );
    const secondaryHtml = renderToStaticMarkup(
      <WorkbenchBadge as="span" size="token">
        badge-token
      </WorkbenchBadge>
    );

    expect(tertiaryHtml).toContain('rounded-[2px]');
    expect(tertiaryHtml).toContain('badge-count');
    expect(tertiaryHtml).toContain('text-[var(--ops-text-tertiary)]');
    expect(secondaryHtml).toContain('badge-token');
    expect(secondaryHtml).toContain('text-[var(--ops-text-secondary)]');
  });

  it('renders shared fullscreen shells for modal workbench stages', () => {
    const html = renderToStaticMarkup(
      <WorkbenchFullscreenShell tabIndex={-1}>
        fullscreen-shell
      </WorkbenchFullscreenShell>
    );

    expect(html).toContain('rounded-[6px]');
    expect(html).toContain('bg-[var(--ops-surface-panel)]');
    expect(html).toContain('shadow-[0_24px_80px_rgba(0,0,0,0.45)]');
    expect(html).toContain('fullscreen-shell');
  });

  it('renders shared action buttons for compact shell controls', () => {
    const raisedHtml = renderToStaticMarkup(
      <WorkbenchActionButton type="button">
        locale-switcher
      </WorkbenchActionButton>
    );
    const elevatedHtml = renderToStaticMarkup(
      <WorkbenchActionButton type="button" hoverTone="elevated">
        elevated-locale-switcher
      </WorkbenchActionButton>
    );

    expect(raisedHtml).toContain('h-9');
    expect(raisedHtml).toContain('rounded-[2px]');
    expect(raisedHtml).toContain('hover:bg-[var(--ops-surface-raised)]');
    expect(raisedHtml).toContain('locale-switcher');
    expect(elevatedHtml).toContain('hover:bg-[var(--ops-surface-elevated)]');
    expect(elevatedHtml).toContain('elevated-locale-switcher');
  });

  it('renders shared toolbar actions for raised alert-family controls', () => {
    const defaultHtml = renderToStaticMarkup(
      <WorkbenchToolbarAction type="button">
        toolbar-action
      </WorkbenchToolbarAction>
    );
    const compactHtml = renderToStaticMarkup(
      <WorkbenchToolbarAction as="a" href="/alert" size="compact">
        compact-toolbar-action
      </WorkbenchToolbarAction>
    );

    expect(defaultHtml).toContain('h-8');
    expect(defaultHtml).toContain('bg-[var(--ops-surface-raised)]');
    expect(defaultHtml).toContain('hover:bg-[var(--ops-surface-elevated)]');
    expect(defaultHtml).toContain('toolbar-action');
    expect(compactHtml).toContain('min-h-7');
    expect(compactHtml).toContain('px-2');
    expect(compactHtml).toContain('href="/alert"');
  });

  it('renders shared raised value pills for static alert-family chips', () => {
    const html = renderToStaticMarkup(
      <WorkbenchValuePill as="span">
        value-pill
      </WorkbenchValuePill>
    );

    expect(html).toContain('min-h-7');
    expect(html).toContain('rounded-[2px]');
    expect(html).toContain('bg-[var(--ops-surface-raised)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).toContain('value-pill');
  });

  it('renders shared form controls for settings and admin selectors', () => {
    const defaultHtml = renderToStaticMarkup(
      <WorkbenchFormControl defaultValue="default-input" />
    );
    const selectHtml = renderToStaticMarkup(
      <WorkbenchFormControl as="select" defaultValue="1" className="w-[88px]">
        <option value="1">1</option>
      </WorkbenchFormControl>
    );

    expect(defaultHtml).toContain('h-8');
    expect(defaultHtml).toContain('w-full');
    expect(defaultHtml).toContain('rounded-[2px]');
    expect(defaultHtml).toContain('focus-visible:border-[var(--ops-primary)]');
    expect(defaultHtml).toContain('focus-visible:ring-[rgba(78,116,248,0.12)]');
    expect(selectHtml).toContain('bg-[var(--ops-surface-raised)]');
    expect(selectHtml).toContain('w-[88px]');
    expect(selectHtml).toContain('<select');
  });

  it('renders shared editor fields for settings and admin code editors', () => {
    const html = renderToStaticMarkup(
      <WorkbenchEditorField value="apiVersion: v1" readOnly />
    );

    expect(html).toContain('min-h-[420px]');
    expect(html).toContain('rounded-[6px]');
    expect(html).toContain('bg-[var(--ops-surface-raised)]');
    expect(html).toContain('font-mono');
    expect(html).toContain('leading-6');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).toContain('<textarea');
  });

  it('renders shared template row semantics without exposing the old editor row', () => {
    const templateHtml = renderToStaticMarkup(<TemplateRow type="button">template-body</TemplateRow>);

    expect(templateHtml).toContain('rounded-[6px]');
    expect(templateHtml).toContain('template-body');
  });
});
