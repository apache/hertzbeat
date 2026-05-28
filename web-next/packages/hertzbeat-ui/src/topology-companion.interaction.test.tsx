// @vitest-environment jsdom

import React, { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import {
  HzTopologyCompanionJumpList,
  HzTopologyCompanionRail,
  HzTopologyCompanionSection
} from './index';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('@hertzbeat/ui topology companion interactions', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = undefined;
    container?.remove();
    container = undefined;
    vi.restoreAllMocks();
  });

  it('keeps companion jump navigation inside the contained rail instead of scrolling the page', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <HzTopologyCompanionRail priority="graph-first" stickyContext="jump-list">
          <HzTopologyCompanionJumpList
            density="graph-first"
            items={[
              { id: 'view-mode', href: '#topology-companion-view-mode', label: 'View', active: true },
              { id: 'edge-red', href: '#topology-companion-edge-red', label: 'RED' }
            ]}
          />
          <HzTopologyCompanionSection sectionId="view-mode" anchorId="topology-companion-view-mode">
            View mode
          </HzTopologyCompanionSection>
          <div style={{ height: 480 }} />
          <HzTopologyCompanionSection sectionId="edge-red" anchorId="topology-companion-edge-red">
            RED evidence
          </HzTopologyCompanionSection>
        </HzTopologyCompanionRail>
      );
    });

    const rail = container.querySelector('[data-hz-ui="topology-companion-rail"]') as HTMLElement;
    const jump = container.querySelector('[data-hz-ui="topology-companion-jump-list"]') as HTMLElement;
    const target = container.querySelector('#topology-companion-edge-red') as HTMLElement;
    const link = container.querySelector('[data-hz-topology-companion-jump-item="edge-red"]') as HTMLAnchorElement;
    const scrollIntoView = vi.fn();
    const replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => undefined);
    const scrollTo = vi.fn(({ top }: ScrollToOptions) => {
      rail.scrollTop = Number(top);
    });

    Object.defineProperty(target, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    Object.defineProperty(rail, 'scrollTo', { configurable: true, value: scrollTo });
    Object.defineProperty(rail, 'scrollTop', { configurable: true, writable: true, value: 0 });
    Object.defineProperty(rail, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 100, bottom: 780, height: 680, left: 0, right: 320, width: 320, x: 0, y: 100, toJSON: () => ({}) })
    });
    Object.defineProperty(jump, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 100, bottom: 132, height: 32, left: 0, right: 320, width: 320, x: 0, y: 100, toJSON: () => ({}) })
    });
    Object.defineProperty(target, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 560, bottom: 620, height: 60, left: 0, right: 320, width: 320, x: 0, y: 560, toJSON: () => ({}) })
    });

    await act(async () => {
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(scrollTo).toHaveBeenCalledWith({ top: 420, behavior: 'smooth' });
    expect(rail.scrollTop).toBe(420);
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledWith(
      null,
      '',
      `${window.location.pathname}${window.location.search}#topology-companion-edge-red`
    );
    expect(window.scrollY).toBe(0);
    expect(jump.getAttribute('data-hz-topology-companion-jump-list-scroll-scope')).toBe('contained-rail');
    expect(link.getAttribute('data-hz-topology-companion-jump-scroll-owner')).toBe(
      'hertzbeat-ui-companion-jump-scroll'
    );
  });

  it('highlights the visible companion section from contained rail scrolling', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <HzTopologyCompanionRail priority="graph-first" stickyContext="jump-list">
          <HzTopologyCompanionJumpList
            density="graph-first"
            activeMode="contained-rail-scroll"
            items={[
              { id: 'view-mode', href: '#topology-companion-view-mode', label: 'View', active: true },
              { id: 'edge-red', href: '#topology-companion-edge-red', label: 'RED' }
            ]}
          />
          <HzTopologyCompanionSection sectionId="view-mode" anchorId="topology-companion-view-mode">
            View mode
          </HzTopologyCompanionSection>
          <div style={{ height: 480 }} />
          <HzTopologyCompanionSection sectionId="edge-red" anchorId="topology-companion-edge-red">
            RED evidence
          </HzTopologyCompanionSection>
        </HzTopologyCompanionRail>
      );
    });

    const rail = container.querySelector('[data-hz-ui="topology-companion-rail"]') as HTMLElement;
    const jump = container.querySelector('[data-hz-ui="topology-companion-jump-list"]') as HTMLElement;
    const viewLink = container.querySelector('[data-hz-topology-companion-jump-item="view-mode"]') as HTMLAnchorElement;
    const redLink = container.querySelector('[data-hz-topology-companion-jump-item="edge-red"]') as HTMLAnchorElement;
    const viewTarget = container.querySelector('#topology-companion-view-mode') as HTMLElement;
    const redTarget = container.querySelector('#topology-companion-edge-red') as HTMLElement;

    Object.defineProperty(rail, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 100, bottom: 780, height: 680, left: 0, right: 320, width: 320, x: 0, y: 100, toJSON: () => ({}) })
    });
    Object.defineProperty(jump, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 100, bottom: 132, height: 32, left: 0, right: 320, width: 320, x: 0, y: 100, toJSON: () => ({}) })
    });
    Object.defineProperty(viewTarget, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: -260, bottom: -180, height: 80, left: 0, right: 320, width: 320, x: 0, y: -260, toJSON: () => ({}) })
    });
    Object.defineProperty(redTarget, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 128, bottom: 188, height: 60, left: 0, right: 320, width: 320, x: 0, y: 128, toJSON: () => ({}) })
    });

    await act(async () => {
      rail.dispatchEvent(new Event('scroll', { bubbles: true }));
    });

    expect(jump.getAttribute('data-hz-topology-companion-jump-list-active-mode')).toBe('contained-rail-scroll');
    expect(jump.getAttribute('data-hz-topology-companion-jump-list-active-mode-owner')).toBe(
      'hertzbeat-ui-companion-jump-list-active-mode'
    );
    expect(viewLink.getAttribute('data-hz-topology-companion-jump-active')).toBe('false');
    expect(redLink.getAttribute('data-hz-topology-companion-jump-active')).toBe('true');
    expect(redLink.getAttribute('data-hz-topology-companion-jump-active-source')).toBe('contained-rail-scroll');
    expect(redLink.getAttribute('aria-current')).toBe('location');
  });

  it('toggles collapsible companion sections without page-local state or styling', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    function CollapsibleSectionHarness() {
      const [collapsed, setCollapsed] = React.useState(true);

      return (
        <HzTopologyCompanionSection
          sectionId="timeline"
          anchorId="topology-companion-timeline"
          density="graph-first"
          collapsible
          collapsed={collapsed}
          collapseLabel="Hide"
          expandLabel="Show"
          onCollapsedChange={setCollapsed}
        >
          <div data-testid="timeline-body">Timeline evidence</div>
        </HzTopologyCompanionSection>
      );
    }

    await act(async () => {
      root?.render(<CollapsibleSectionHarness />);
    });

    const section = container.querySelector('[data-hz-ui="topology-companion-section"]') as HTMLElement;
    const toggle = container.querySelector(
      '[data-hz-topology-companion-section-toggle-owner="hertzbeat-ui-companion-section-toggle"]'
    ) as HTMLButtonElement;
    const body = container.querySelector(
      '[data-hz-topology-companion-section-body-owner="hertzbeat-ui-companion-section-body"]'
    ) as HTMLElement;

    expect(section.getAttribute('data-hz-topology-companion-section-collapsible')).toBe('true');
    expect(section.getAttribute('data-hz-topology-companion-section-collapsed')).toBe('true');
    expect(toggle.textContent).toContain('Show');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(body.hidden).toBe(true);

    await act(async () => {
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(section.getAttribute('data-hz-topology-companion-section-collapsed')).toBe('false');
    expect(toggle.textContent).toContain('Hide');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(body.hidden).toBe(false);
  });
});
