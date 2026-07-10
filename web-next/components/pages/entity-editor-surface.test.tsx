// @vitest-environment jsdom

import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiMessageGet, apiMessagePost, apiMessagePut } from '@/lib/api-client';
import { saveEntityPayload } from '@/lib/entity-editor/controller';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { SUPPLEMENTAL_MESSAGES } from '../../lib/i18n-runtime-messages';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigationState = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  routerPush: vi.fn()
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockNavigationState.routerPush
  }),
  useSearchParams: () => mockNavigationState.searchParams
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN',
      overrides: SUPPLEMENTAL_MESSAGES['zh-CN'] ?? {}
    })
  })
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  buttonVariants: () => 'btn'
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange: _onValueChange, ...props }: any) => (
    <select data-hz-ui="select" onChange={() => undefined} {...props}>
      {children}
    </select>
  )
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea data-cold-textarea-owner="cold-textarea" {...props} />
}));

vi.mock('../ui/hz-code-editor', () => ({
  HzCodeEditor: ({ value, language, minHeight, readOnly, onChange: _onChange, ...props }: any) => (
    <div
      data-hz-code-editor="codemirror"
      data-hz-code-editor-language={language}
      data-hz-code-editor-min-height={minHeight}
      data-hz-code-editor-readonly={readOnly ? 'true' : undefined}
      data-entity-editor-json-code-editor={props['data-entity-editor-json-code-editor']}
      data-entity-editor-definition-code-editor={props['data-entity-editor-definition-code-editor']}
      data-entity-editor-definition-preview={props['data-entity-editor-definition-preview']}
    >
      {props.name ? <input type="hidden" name={props.name} value={value} /> : null}
      {value}
    </div>
  )
}));

vi.mock('@hertzbeat/ui', () => ({
  HzConfirmDialog: ({
    open,
    title,
    kicker,
    children,
    cancelLabel,
    confirmLabel,
    cancelButtonProps,
    confirmButtonProps,
    ...props
  }: any) =>
    open ? (
      <section data-hz-ui="confirm-dialog" {...props}>
        <div>{kicker}</div>
        <h2>{title}</h2>
        <div>{children}</div>
        <button {...cancelButtonProps}>{cancelLabel}</button>
        <button {...confirmButtonProps}>{confirmLabel}</button>
      </section>
    ) : null
}));

vi.mock('@/components/workbench/primitives', () => ({
  RailSection: ({ title, copy, children }: any) => (
    <section data-rail-section="true">
      <h3>{title}</h3>
      <p>{copy}</p>
      {children}
    </section>
  ),
  SurfaceSection: ({ title, copy, children }: any) => (
    <section data-surface-section="true">
      <h2>{title}</h2>
      <p>{copy}</p>
      {children}
    </section>
  ),
  WorkbenchInsetPanel: ({ as: Component = 'div', children, ...props }: any) => (
    <Component data-workbench-inset-panel="true" {...props}>
      {children}
    </Component>
  ),
  WorkbenchPillButton: ({ as: Component = 'button', children, active: _active, size: _size, ...props }: any) => (
    <Component data-workbench-pill-button="true" {...props}>
      {children}
    </Component>
  ),
  WorkbenchSelectableCard: ({ as: Component = 'button', children, active: _active, density: _density, ...props }: any) => (
    <Component data-workbench-selectable-card="true" {...props}>
      {children}
    </Component>
  ),
  WorkbenchStack: ({ children }: any) => <div data-workbench-stack="true">{children}</div>
}));

vi.mock('@/components/workbench/workbench-page', () => ({
  RowList: ({ rows }: any) => <div data-row-list="true">{rows.map((row: any) => row.title).join('|')}</div>,
  WorkbenchPage: ({ title, subtitle, actions, main, side }: any) => (
    <div data-workbench-page="true">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div data-workbench-actions="true">{actions}</div>
      <div data-workbench-main="true">{main}</div>
      {side ? <aside data-workbench-side="true">{side}</aside> : null}
    </div>
  )
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));

vi.mock('@/lib/entity-editor/collection-state', () => ({
  addJsonRow: (rows: string[]) => [...rows, '{}'],
  addObjectRow: (rows: any[]) => [...rows, {}],
  ensureJsonRows: (rows: string[]) => (rows.length > 0 ? rows : ['{}']),
  ensureObjectRows: (rows: any[]) => (rows.length > 0 ? rows : [{}]),
  removeJsonRow: (rows: string[], index: number) => rows.filter((_, currentIndex) => currentIndex !== index),
  removeObjectArrayItem: (rows: any[], index: number) => rows.filter((_, currentIndex) => currentIndex !== index),
  updateJsonRow: (rows: string[], index: number, value: string) => rows.map((row, currentIndex) => (currentIndex === index ? value : row)),
  updateObjectArrayItem: (rows: any[], index: number, value: Record<string, unknown>) =>
    rows.map((row, currentIndex) => (currentIndex === index ? { ...row, ...value } : row))
}));

vi.mock('@/lib/entity-editor/controller', () => ({
  buildEntityPayload: ({ draft }: any) => draft,
  saveEntityPayload: vi.fn(async (_mode: string, _payload: unknown, copy: any) => copy.saveSuccessMessage)
}));

vi.mock('@/lib/entity-editor/editor-state', () => ({
  appendCommaSeparatedValue: (value: string, nextValue: string) => (value ? `${value}, ${nextValue}` : nextValue),
  ensureKeyValueRows: (rows: Array<{ key: string; value: string }>) => (rows.length > 0 ? rows : [{ key: '', value: '' }]),
  removeRowAt: (rows: any[], index: number) => rows.filter((_, currentIndex) => currentIndex !== index),
  seedFirstLinkProvider: (rows: any[], provider: string) =>
    rows.length > 0 ? rows.map((row, index) => (index === 0 ? { ...row, provider } : row)) : [{ provider }],
  updateRowAt: (rows: any[], index: number, value: Record<string, unknown>) =>
    rows.map((row, currentIndex) => (currentIndex === index ? { ...row, ...value } : row))
}));

vi.mock('@/lib/entity-editor/initial-state', () => ({
  buildEntityEditorFormState: (initial: any) => ({
    labelRows: Object.entries(initial.entity.labels || {}).map(([key, value]) => ({ key, value })),
    tagsText: (initial.entity.tags || []).join(', '),
    componentOfText: (initial.entity.componentOf || []).join(', '),
    componentsText: (initial.entity.components || []).join(', '),
    implementedByText: (initial.entity.implementedBy || []).join(', '),
    languagesText: (initial.entity.languages || []).join(', '),
    identitiesItems: (initial.identities || []).map((item: unknown) => JSON.stringify(item)),
    monitorBindItems: (initial.monitorBinds || []).map((item: unknown) => JSON.stringify(item)),
    relationItems: (initial.relations || []).map((item: unknown) => JSON.stringify(item))
  })
}));

vi.mock('@/lib/entity-editor/view-model', () => {
  const t = createTranslatorMock({ locale: 'zh-CN', overrides: SUPPLEMENTAL_MESSAGES['zh-CN'] ?? {} });

  return {
    buildEntityEditorAttributionRows: () => [
      {
        key: 'identity',
        title: t('entities.editor.attribution.identity.title'),
        copy: t('entities.editor.attribution.identity.count', { count: 1 }),
        meta: 'service.name=checkout',
        state: 'ready'
      },
      {
        key: 'monitor-binding',
        title: t('entities.editor.attribution.monitor.title'),
        copy: t('entities.editor.attribution.monitor.count', { count: 1 }),
        meta: 'monitorId 42',
        state: 'ready'
      },
      {
        key: 'ownership',
        title: t('entities.editor.attribution.owner.title'),
        copy: t('entities.editor.attribution.owner.missing'),
        meta: t('entities.editor.attribution.owner.missing-meta'),
        state: 'missing'
      },
      {
        key: 'system-environment',
        title: t('entities.editor.attribution.system-environment.title'),
        copy: t('entities.editor.attribution.system-environment.missing-environment', { system: 'website' }),
        meta: t('entities.editor.attribution.system-environment.meta'),
        state: 'review'
      },
      {
        key: 'discovery-return',
        title: t('entities.editor.attribution.discovery.title'),
        copy: t('entities.editor.attribution.discovery.copy'),
        meta: '/entities/discovery',
        state: 'review',
        href: '/entities/discovery'
      }
    ],
    buildEntityEditorCatalogRows: () => [
      { title: 'catalog', copy: 'platform', meta: 'count 1' }
    ],
    buildEntityEditorFacts: () => [],
    buildEntityEditorNextStepRows: () => [
      { title: 'definition', copy: 'Open definition', meta: '/entities/42/definition' }
    ],
    buildEntityEditorSuggestions: () => ({
      ownerSuggestions: ['platform'],
      systemSuggestions: ['commerce'],
      environmentSuggestions: ['prod'],
      lifecycleSuggestions: ['production'],
      tierSuggestions: ['tier-1'],
      languageSuggestions: ['java'],
      providerSuggestions: ['grafana']
    }),
    buildEntityEditorTitle: (mode: 'new' | 'edit', entityId?: string) => (mode === 'new' ? 'Create entity' : `Edit entity · ${entityId}`),
    resolveEntityEditorDiscoveryReturnHref: (value?: string | null) => {
      const normalized = value?.trim();
      if (!normalized || normalized.startsWith('//')) return null;
      if (normalized === '/entities/discovery' || normalized.startsWith('/entities/discovery?')) return normalized;
      try {
        const parsed = new URL(normalized, 'https://hertzbeat.local');
        const returnTo = parsed.searchParams.get('returnTo');
        return returnTo === '/entities/discovery' || returnTo?.startsWith('/entities/discovery?') ? returnTo : null;
      } catch {
        return null;
      }
    }
  };
});

vi.mock('@/lib/workspace-navigation', () => ({
  buildEntityEditorWorkspaceTabs: () => []
}));

vi.mock('@/lib/utils', () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ')
}));

describe('EntityEditorSurface', () => {
  const t = createTranslatorMock({ locale: 'zh-CN', overrides: SUPPLEMENTAL_MESSAGES['zh-CN'] ?? {} });
  const han = (...codes: number[]) => String.fromCodePoint(...codes);
  let interactionContainer: HTMLDivElement | null = null;
  let interactionRoot: Root | null = null;

  beforeEach(() => {
    mockNavigationState.searchParams = new URLSearchParams();
    mockNavigationState.routerPush.mockClear();
    vi.mocked(apiMessageGet).mockReset();
    vi.mocked(apiMessagePost).mockReset();
    vi.mocked(apiMessagePut).mockReset();
    vi.mocked(saveEntityPayload).mockReset();
    vi.mocked(saveEntityPayload).mockImplementation(async (_mode: string, _payload: unknown, copy: any) => copy.saveSuccessMessage);
  });

  afterEach(async () => {
    await act(async () => {
      interactionRoot?.unmount();
      await Promise.resolve();
    });
    interactionRoot = null;
    interactionContainer?.remove();
    interactionContainer = null;
  });

  it('routes newly created entities to their detail page while preserving the list return context', async () => {
    const { buildEntityEditorPostCreateHref } = await import('./entity-editor-surface');

    expect(
      buildEntityEditorPostCreateHref({
        createdEntityId: 658133837339904,
        returnHref: '/entities?search=checkout&pageSize=50&source=product-design-1328',
        source: 'product-design-1328'
      })
    ).toBe(
      '/entities/658133837339904?returnTo=%2Fentities%3Fsearch%3Dcheckout%26pageSize%3D50%26source%3Dproduct-design-1328&created=1&source=product-design-1328'
    );

    expect(
      buildEntityEditorPostCreateHref({
        createdEntityId: ' 42 ',
        returnHref: '/entities?source=entity-create-return',
        source: null
      })
    ).toBe('/entities/42?returnTo=%2Fentities%3Fsource%3Dentity-create-return&created=1&source=entity-create-return');

    expect(
      buildEntityEditorPostCreateHref({
        createdEntityId: null,
        returnHref: '/entities?source=entity-create-return'
      })
    ).toBe('/entities?source=entity-create-return');
  });

  it('preserves discovery monitor context after creating a candidate entity', async () => {
    const { buildEntityEditorPostCreateHref } = await import('./entity-editor-surface');

    expect(
      buildEntityEditorPostCreateHref({
        createdEntityId: 658302491847936,
        returnHref: '/entities?search=website&source=discovery-candidate',
        source: 'discovery-candidate',
        monitorId: '658302491983104',
        monitorName: 'Codex PD 1685 Candidate Website',
        monitorApp: 'website',
        monitorInstance: '127.0.0.1:4223'
      })
    ).toBe(
      '/entities/658302491847936?returnTo=%2Fentities%3Fsearch%3Dwebsite%26source%3Ddiscovery-candidate&created=1&source=discovery-candidate&monitorId=658302491983104&monitorName=Codex+PD+1685+Candidate+Website&monitorApp=website&monitorInstance=127.0.0.1%3A4223'
    );
  });

  it('routes saved edits to entity detail so operators can verify readback before returning to the list', async () => {
    const { buildEntityEditorPostEditHref } = await import('./entity-editor-surface');

    expect(
      buildEntityEditorPostEditHref({
        entityId: 658302491847936,
        returnHref: '/entities?source=product-design-1377',
        source: 'product-design-1377',
        monitorId: '658302491983104'
      })
    ).toBe('/entities/658302491847936?returnTo=%2Fentities%3Fsource%3Dproduct-design-1377&updated=1&source=product-design-1377');

    expect(
      buildEntityEditorPostEditHref({
        entityId: 658302491847936,
        returnHref: '/entities?search=website&source=discovery-candidate',
        source: 'discovery-candidate',
        monitorId: '658302491983104',
        monitorName: 'Codex PD 1377 Candidate Website',
        monitorApp: 'website',
        monitorInstance: '127.0.0.1:4223'
      })
    ).toBe(
      '/entities/658302491847936?returnTo=%2Fentities%3Fsearch%3Dwebsite%26source%3Ddiscovery-candidate&updated=1&source=discovery-candidate&monitorId=658302491983104&monitorName=Codex+PD+1377+Candidate+Website&monitorApp=website&monitorInstance=127.0.0.1%3A4223'
    );

    expect(
      buildEntityEditorPostEditHref({
        entityId: null,
        returnHref: '/entities?source=product-design-1377',
        source: 'product-design-1377',
        monitorId: '658302491983104'
      })
    ).toBe('/entities?source=product-design-1377');
  });

  it('focuses the requested signals stage when detail next actions hand off to entity editing', async () => {
    const { EntityEditorSurface } = await import('./entity-editor-surface');
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView
    });
    mockNavigationState.searchParams = new URLSearchParams('stage=signals&source=product-design-1817');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    try {
      await act(async () => {
        interactionRoot?.render(
          <EntityEditorSurface
            initial={{
              entity: {
                id: '42',
                type: 'service',
                name: 'checkout-api',
                owner: 'platform',
                system: 'commerce'
              },
              identities: [{ key: 'service.name', value: 'checkout-api' }],
              monitorBinds: [],
              relations: []
            }}
            mode="edit"
            entityId="42"
            catalogSuggestions={{
              owners: ['platform'],
              systems: ['commerce'],
              namespaces: ['commerce'],
              environments: ['prod']
            }}
            routeContext={{
              returnTo: '/entities?source=product-design-1817',
              source: 'product-design-1817'
            }}
          />
        );
        await Promise.resolve();
      });

      expect(interactionContainer.querySelector('[data-entity-editor-route-stage-focus="signals"]')).not.toBeNull();
      expect(interactionContainer.querySelector('[data-entity-editor-monitor-bind-template="manual-monitor-id"]')).not.toBeNull();
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        value: originalScrollIntoView
      });
    }
  });

  it('blocks blank novice entity creates, then saves and routes to detail after the name is supplied', async () => {
    const { EntityEditorSurface } = await import('./entity-editor-surface');
    vi.mocked(apiMessagePost).mockResolvedValueOnce(659278015225088 as never);
    vi.mocked(saveEntityPayload).mockImplementationOnce(async (mode: string, payload: unknown, copy: any) => {
      const createdEntityId = await copy.createEntity(payload);
      return copy.buildCreateSuccessMessage(createdEntityId);
    });
    mockNavigationState.searchParams = new URLSearchParams('source=product-design-1707&returnTo=/entities?search=checkout');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <EntityEditorSurface
          initial={{
            entity: {
              type: 'service',
              name: '',
              displayName: 'Checkout API',
              owner: 'platform',
              system: 'commerce'
            },
            identities: [],
            monitorBinds: [],
            relations: []
          }}
          mode="new"
          catalogSuggestions={{
            owners: ['platform'],
            systems: ['commerce'],
            namespaces: ['commerce'],
            environments: ['prod'],
            lifecycles: ['production'],
            tiers: ['tier-1'],
            languages: ['java'],
            linkProviders: ['grafana']
          }}
        />
      );
      await Promise.resolve();
    });

    const nameInput = interactionContainer.querySelector('input[data-entity-editor-input="name"]') as HTMLInputElement | null;
    const submitButton = interactionContainer.querySelector(
      'button[data-entity-editor-submit-placement="first-viewport"]'
    ) as HTMLButtonElement | null;
    expect(nameInput).not.toBeNull();
    expect(submitButton).not.toBeNull();

    await act(async () => {
      submitButton?.click();
      await new Promise(resolve => window.setTimeout(resolve, 0));
    });

    expect(saveEntityPayload).not.toHaveBeenCalled();
    expect(interactionContainer.querySelector('[data-entity-editor-validation="name"]')?.textContent).toContain(
      t('entities.editor.validation.name')
    );
    expect(nameInput?.getAttribute('aria-invalid')).toBe('true');

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      valueSetter?.call(nameInput, 'checkout-api');
      nameInput!.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    const expectedPostCreateHref =
      '/entities/659278015225088?returnTo=%2Fentities%3Fsearch%3Dcheckout&created=1&source=product-design-1707';
    window.history.pushState(null, '', expectedPostCreateHref);

    await act(async () => {
      submitButton?.click();
      await Promise.resolve();
    });

    expect(saveEntityPayload).toHaveBeenCalledWith('new', expect.objectContaining({
      entity: expect.objectContaining({ name: 'checkout-api' })
    }), expect.any(Object));
    expect(apiMessagePost).toHaveBeenCalledWith('/entities', expect.objectContaining({
      entity: expect.objectContaining({ name: 'checkout-api' })
    }));
    expect(mockNavigationState.routerPush).toHaveBeenCalledWith(expectedPostCreateHref);
  });

  it('saves novice entity edits and routes back to detail for readback', async () => {
    const { EntityEditorSurface } = await import('./entity-editor-surface');
    vi.mocked(apiMessagePut).mockResolvedValueOnce(undefined as never);
    vi.mocked(saveEntityPayload).mockImplementationOnce(async (_mode: string, payload: unknown, copy: any) => {
      await copy.updateEntity(payload);
      return copy.saveSuccessMessage;
    });
    mockNavigationState.searchParams = new URLSearchParams('source=product-design-1708&returnTo=/entities?search=checkout');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <EntityEditorSurface
          initial={{
            entity: {
              id: 42,
              type: 'service',
              name: 'checkout-api',
              displayName: 'Checkout API',
              owner: 'platform',
              system: 'commerce'
            },
            identities: [],
            monitorBinds: [],
            relations: []
          }}
          mode="edit"
          entityId="42"
          catalogSuggestions={{
            owners: ['platform'],
            systems: ['commerce'],
            namespaces: ['commerce'],
            environments: ['prod'],
            lifecycles: ['production'],
            tiers: ['tier-1'],
            languages: ['java'],
            linkProviders: ['grafana']
          }}
        />
      );
      await Promise.resolve();
    });

    const displayNameInput = interactionContainer.querySelector(
      'input[data-entity-editor-input="display-name"]'
    ) as HTMLInputElement | null;
    const submitButton = interactionContainer.querySelector(
      'button[data-entity-editor-submit-placement="first-viewport"]'
    ) as HTMLButtonElement | null;
    expect(displayNameInput).not.toBeNull();
    expect(submitButton).not.toBeNull();

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      valueSetter?.call(displayNameInput, 'Checkout API edited');
      displayNameInput!.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    const expectedPostEditHref =
      '/entities/42?returnTo=%2Fentities%3Fsearch%3Dcheckout&updated=1&source=product-design-1708';
    window.history.pushState(null, '', expectedPostEditHref);

    await act(async () => {
      submitButton?.click();
      await Promise.resolve();
    });

    expect(saveEntityPayload).toHaveBeenCalledWith('edit', expect.objectContaining({
      entity: expect.objectContaining({
        id: 42,
        name: 'checkout-api',
        displayName: 'Checkout API edited'
      })
    }), expect.any(Object));
    expect(apiMessagePut).toHaveBeenCalledWith('/entities', expect.objectContaining({
      entity: expect.objectContaining({
        id: 42,
        displayName: 'Checkout API edited'
      })
    }));
    expect(mockNavigationState.routerPush).toHaveBeenCalledWith(expectedPostEditHref);
  });

  it('allows monitor binding collections to become empty after deleting the last row', async () => {
    const { removeJsonObjectListRow } = await import('./entity-editor-surface');

    expect(removeJsonObjectListRow(['{"monitorId":42}'], 0, true)).toEqual([]);
    expect(removeJsonObjectListRow(['{"monitorId":42}', '{"monitorId":43}'], 0, true)).toEqual(['{"monitorId":43}']);
  });

  it('keeps only nested row editors on shared inset panels while the page shell stays cold-owned', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');

    expect(source).toContain('WorkbenchInsetPanel');
    expect(source).not.toContain('WorkbenchPillButton');
    expect(source).not.toContain('WorkbenchSelectableCard');
    expect(source).not.toContain("const shellPanelClassName = 'grid gap-2.5 rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-3';");
    expect(source).not.toContain('data-entity-editor-toolbar="true" className="grid gap-3 rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-3"');
    expect(source).not.toContain('className="flex flex-wrap items-center justify-end gap-2 rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-3"');
    expect(source).not.toContain("const editorModePillClassName =");
    expect(source).not.toContain("const editorStageCardClassName =");
  });

  it('uses the shared cold CodeMirror editor for JSON evidence rows and definition previews', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');

    expect(source).toContain("import { HzCodeEditor } from '../ui/hz-code-editor';");
    expect(source).toContain('data-entity-editor-json-code-editor="object-row"');
    expect(source).toContain('data-entity-editor-definition-code-editor="preview"');
    expect(source).toContain('language="json"');
    expect(source).toContain("language={editorSurfaceMode === 'yaml' ? 'yaml' : 'json'}");
    expect(source).not.toContain("import { EditorRow } from '../observability/editor-rows';");
    expect(source).not.toContain('const editorTextAreaClassName =');
    expect(source).not.toContain('<EditorRow\n            className={editorTextAreaClassName}');
    expect(source).not.toContain('<EditorRow\n                  readOnly\n                  data-entity-editor-definition-preview={editorSurfaceMode}');
  });

  it('keeps a novice service-name identity template before raw JSON evidence editing', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');

    expect(source).toContain('function replaceFirstEmptyJsonRow(items: string[], value: string)');
    expect(source).toContain("identityType: 'otel_resource'");
    expect(source).toContain("identityKey: 'service.name'");
    expect(source).toContain('identityValue: draft.entity.name ||');
    expect(source).toContain('primaryIdentity: true');
    expect(source).toContain('data-entity-editor-identity-template="service-name"');
    expect(source).toContain('data-entity-editor-identity-template-action="service-name"');
    expect(source).toContain("t('entities.editor.identity-template.service-name.action')");
    expect(source).toContain('setIdentitiesItems(current => replaceFirstEmptyJsonRow(current, serviceIdentityTemplate))');
  });

  it('keeps a novice monitor binding template before raw JSON monitor binding editing', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');

    expect(source).toContain('function monitorBindItemsContainMonitor(items: string[], monitorId: string)');
    expect(source).toContain('function resolveEntityEditorInitialStage(value: string | null | undefined, incomingMonitorNeedsBinding: boolean)');
    expect(source).toContain('const incomingMonitorHasInitialBind = Boolean(');
    expect(source).toContain("const [monitorBindTemplateId, setMonitorBindTemplateId] = useState(initialMonitorBindTemplateId)");
    expect(source).toContain("resolveEntityEditorInitialStage(searchParams.get('stage'), incomingMonitorNeedsBinding)");
    expect(source).toContain('data-entity-editor-monitor-bind-template="manual-monitor-id"');
    expect(source).toContain('data-entity-editor-incoming-monitor-context="true"');
    expect(source).toContain('data-entity-editor-incoming-monitor-context-id={incomingMonitorContext.monitorId}');
    expect(source).toContain("const [incomingMonitorPreflightState, setIncomingMonitorPreflightState] = useState<'idle' | 'loading' | 'checked' | 'failed'>('idle')");
    expect(source).toContain('findMonitorBindConflictCandidate(candidates, currentEntityId)');
    expect(source).toContain('data-entity-editor-incoming-monitor-preflight={incomingMonitorPreflightState}');
    expect(source).toContain("data-entity-editor-incoming-monitor-conflict={incomingMonitorConflict != null ? 'true' : 'false'}");
    expect(source).toContain('data-entity-editor-incoming-monitor-conflict-link="true"');
    expect(source).toContain('monitorBindTemplateWaitingForPreflight');
    expect(source).toContain('monitorBindTemplateBlockedByIncomingConflict');
    expect(source).toContain('data-entity-editor-monitor-bind-search-input="true"');
    expect(source).toContain('data-entity-editor-monitor-bind-search-action="true"');
    expect(source).toContain('data-entity-editor-monitor-bind-candidates="true"');
    expect(source).toContain('data-entity-editor-monitor-bind-load-more="true"');
    expect(source).toContain('data-entity-editor-monitor-bind-candidate={candidate.id}');
    expect(source).toContain('data-entity-editor-monitor-bind-candidate-conflict="true"');
    expect(source).toContain('data-entity-editor-monitor-bind-candidate-conflict="false"');
    expect(source).toContain("data-entity-editor-monitor-bind-candidate-selected={candidateIsSelected ? 'true' : 'false'}");
    expect(source).toContain('data-entity-editor-monitor-bind-candidate-conflict-link="true"');
    expect(source).toContain('data-entity-editor-monitor-bind-template-input="manual-monitor-id"');
    expect(source).toContain('data-entity-editor-monitor-bind-template-action="manual-monitor-id"');
    expect(source).toContain('data-entity-editor-monitor-bind-next-step="save-entity"');
    expect(source).toContain('function buildManualMonitorBindTemplate(monitorId: string | number)');
    expect(source).toContain('const canAutoDraftIncomingMonitorBind = Boolean(');
    expect(source).toContain('const shouldAutoDraftIncomingMonitorBind = canAutoDraftIncomingMonitorBind;');
    expect(source).toContain('const monitorBindItemsForSave = shouldAutoDraftIncomingMonitorBind');
    expect(source).toContain('const hasUnsavedChangesForSave = hasUnsavedChanges || shouldAutoDraftIncomingMonitorBind;');
    expect(source).toContain('monitorBindItems: monitorBindItemsForSave');
    expect(source).toContain('emptyCopy={t(\'entities.editor.collection.monitor-binds.empty\')}');
    expect(source).toContain('const allowEmpty = Boolean(emptyCopy);');
    expect(source).toContain('const rows = allowEmpty && value.length === 0 ? [] : ensureJsonRows(value);');
    expect(source).toContain('const ENTITY_EDITOR_JSON_OBJECT_ROW_LIMIT = 8;');
    expect(source).toContain('const visibleRows = showAllRows ? rows : rows.slice(0, ENTITY_EDITOR_JSON_OBJECT_ROW_LIMIT);');
    expect(source).toContain('data-entity-editor-json-object-list-overflow={hiddenRowCount > 0 ?');
    expect(source).toContain('data-entity-editor-json-object-list-overflow-panel="bounded-json-list"');
    expect(source).toContain("t('entities.editor.collection.json-list.overflow'");
    expect(source).toContain("t('entities.editor.collection.json-list.show-all')");
    expect(source).toContain('removeJsonObjectListRow(rows, index, allowEmpty)');
    expect(source).toContain("apiMessageGet<PageResult<MonitorDto>>(`/monitors?${params.toString()}`)");
    expect(source).toContain('const ENTITY_EDITOR_MONITOR_BIND_SEARCH_PAGE_SIZE = 5;');
    expect(source).toContain('await loadMonitorBindCandidatePage(monitorBindSearchResolvedQuery, monitorBindSearchPageIndex + 1, true)');
    expect(source).toContain('apiMessageGet<EntityMonitorBindingCandidate[]>');
    expect(source).toContain('/entities/monitor/${encodeURIComponent(String(monitor.id))}/candidates');
    expect(source).toContain('monitorId: /^\\d+$/.test(normalizedMonitorId)');
    expect(source).toContain('const buildMonitorBindTemplateFromMonitor = (monitor: MonitorDto) => buildManualMonitorBindTemplate(monitor.id);');
    expect(source).toContain("bindType: 'manual'");
    expect(source).toContain("bindSource: 'manual'");
    expect(source).toContain("status: 'active'");
    expect(source).toContain('const monitorBindTemplateAlreadyDrafted = monitorBindItemsContainMonitor(monitorBindItems, normalizedMonitorBindTemplateId);');
    expect(source).toContain('|| monitorBindTemplateAlreadyDrafted');
    expect(source).toContain("t('entities.editor.monitor-bind-template.manual-monitor.already-drafted'");
    expect(source).toContain('if (monitorBindItemsContainMonitor(monitorBindItems, String(monitor.id)))');
    expect(source).toContain('setMonitorBindItems(current => replaceFirstEmptyJsonRow(current, monitorBindTemplate))');
    expect(source).toContain('setMonitorBindItems(current => replaceFirstEmptyJsonRow(current, buildMonitorBindTemplateFromMonitor(monitor)))');
    expect(source).toContain("t('entities.editor.monitor-bind-template.manual-monitor.action')");
    expect(source).toContain("t('entities.editor.monitor-bind-template.manual-monitor.generated-next-step'");
    expect(source).toContain("t('entities.editor.monitor-bind-template.incoming.title')");
    expect(source).toContain("t('entities.editor.monitor-bind-template.incoming.preflight-loading')");
    expect(source).toContain("t('entities.editor.monitor-bind-template.incoming.preflight-conflict'");
    expect(source).toContain("t('entities.editor.monitor-bind-template.incoming.preflight-failed')");
    expect(source).toContain("t('entities.editor.monitor-bind-template.search.action')");
    expect(source).toContain("inputModeLabel={t('entities.editor.field.input-mode.suggestions')}");
    expect(source).toContain("inputModeHelp={t('entities.editor.field.input-mode.suggestions.help')}");
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain("'entities.editor.monitor-bind-template.search.result-progress-with-conflict'");
    expect(source).toContain("t('entities.editor.monitor-bind-template.search.load-more'");
    expect(source).toContain("t('entities.editor.monitor-bind-template.search.selected-label')");
    expect(source).toContain("t('entities.editor.monitor-bind-template.search.already-bound'");
    expect(source).toContain("t('entities.editor.message.monitor-already-bound'");
    expect(source).toContain("t('entities.editor.message.monitor-bind-conflict.open-existing')");
    expect(SUPPLEMENTAL_MESSAGES['en-US']?.['entities.editor.monitor-bind-template.manual-monitor.already-drafted']).toBe(
      'monitorId {{monitorId}} is already in the binding draft. Save the Entity next.'
    );
    expect(source).not.toContain('The Monitor ID is already filled so the next safe action is Fill monitor binding, then save.');
  });

  it('loads beyond the first conflict-only monitor page and marks the chosen binding draft', async () => {
    mockNavigationState.searchParams = new URLSearchParams('stage=signals&source=product-design-1926');
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn()
    });
    const monitors = Array.from({ length: 6 }, (_, index) => ({
      id: 101 + index,
      name: `Candidate monitor ${index + 1}`,
      app: 'website',
      instance: `candidate-${index + 1}.example.com:443`
    }));

    vi.mocked(apiMessageGet).mockImplementation(async (path: string) => {
      if (path.startsWith('/monitors?')) {
        const params = new URLSearchParams(path.split('?')[1]);
        const pageIndex = Number(params.get('pageIndex') || 0);
        return {
          content: pageIndex === 0 ? monitors.slice(0, 5) : monitors.slice(5),
          totalElements: monitors.length,
          pageIndex,
          pageSize: 5
        } as any;
      }
      if (path.startsWith('/entities/monitor/')) {
        const monitorId = path.split('/')[3];
        return monitorId === '106'
          ? [] as any
          : [{ alreadyBound: true, entityId: `entity-${monitorId}`, entityName: `Bound entity ${monitorId}` }] as any;
      }
      throw new Error(`Unexpected API path: ${path}`);
    });

    const { EntityEditorSurface } = await import('./entity-editor-surface');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <EntityEditorSurface
          initial={{
            entity: { type: 'service', name: 'codex-pd-monitor-bind-search' },
            identities: [],
            monitorBinds: [],
            relations: []
          }}
          mode="new"
          catalogSuggestions={{ owners: [], systems: [], namespaces: [] }}
        />
      );
      await Promise.resolve();
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: originalScrollIntoView
    });

    const queryInput = interactionContainer.querySelector(
      'input[data-entity-editor-monitor-bind-search-input="true"]'
    ) as HTMLInputElement | null;
    const searchAction = interactionContainer.querySelector(
      'button[data-entity-editor-monitor-bind-search-action="true"]'
    ) as HTMLButtonElement | null;

    await act(async () => {
      if (queryInput) {
        const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        valueSetter?.call(queryInput, 'Candidate monitor');
        queryInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await Promise.resolve();
    });
    await act(async () => {
      searchAction?.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(interactionContainer.querySelectorAll('[data-entity-editor-monitor-bind-candidate]')).toHaveLength(5);
    expect(interactionContainer.querySelectorAll('[data-entity-editor-monitor-bind-candidate-conflict="true"]')).toHaveLength(5);
    const loadMoreAction = interactionContainer.querySelector(
      'button[data-entity-editor-monitor-bind-load-more="true"]'
    ) as HTMLButtonElement | null;
    expect(loadMoreAction?.textContent).toContain('6 / 6');

    await act(async () => {
      loadMoreAction?.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(interactionContainer.querySelectorAll('[data-entity-editor-monitor-bind-candidate]')).toHaveLength(6);
    expect(interactionContainer.querySelector('[data-entity-editor-monitor-bind-load-more="true"]')).toBeNull();
    const availableCandidate = interactionContainer.querySelector(
      'button[data-entity-editor-monitor-bind-candidate="106"]'
    ) as HTMLButtonElement | null;
    expect(availableCandidate?.getAttribute('aria-pressed')).toBe('false');

    await act(async () => {
      availableCandidate?.click();
      await Promise.resolve();
    });

    expect(availableCandidate?.getAttribute('aria-pressed')).toBe('true');
    expect(availableCandidate?.textContent).toContain(t('entities.editor.monitor-bind-template.search.selected-label'));
    expect(interactionContainer.querySelector('[data-entity-editor-monitor-bind-next-step="save-entity"]')?.textContent).toContain('106');
  }, 30000);

  it('preflights new telemetry monitor handoffs and blocks create while a monitor bind conflict is known', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');

    expect(source).toContain("|| (mode === 'new' && incomingMonitorHasInitialBind)");
    expect(source).toContain('const saveBlockedByIncomingMonitorConflict = mode ===');
    expect(source).toContain('const saveBlockedByIncomingMonitorPreflight = mode ===');
    expect(source).toContain('setMessage(`Monitor already bound to another entity: ${incomingMonitorContext.monitorId}.`);');
    expect(source).toContain('data-entity-editor-submit-blocked-by-monitor-conflict=');
    expect(source).toContain('data-entity-editor-submit-waiting-for-monitor-preflight=');
    expect(source).toContain('const saveDisabledByNoChanges = isEditMode && !hasUnsavedChanges && !canAutoDraftIncomingMonitorBind;');
    expect(source).toContain('const saveDisabled = saving || saveDisabledByNoChanges || saveBlockedByIncomingMonitorConflict || saveBlockedByIncomingMonitorPreflight;');
    expect(source).toContain('data-entity-editor-submit-placement="first-viewport"');
    expect(source).toContain('data-entity-editor-submit-placement="footer"');
  });

  it('opens edit handoffs with an inherited discovery monitor in the signal binding step', async () => {
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            id: 42,
            type: 'service',
            name: 'checkout-api',
            displayName: 'Checkout API',
            owner: 'platform',
            system: 'website',
            environment: 'prod',
            source: 'manual'
          },
          identities: [],
          monitorBinds: [],
          relations: []
        }}
        mode="edit"
        entityId="42"
        routeContext={{
          source: 'discovery-candidate',
          monitorId: '658094606003456',
          monitorName: 'Checkout API Website Check',
          monitorApp: 'website',
          monitorInstance: '127.0.0.1:4223'
        }}
      />
    );

    expect(html).toMatch(/data-entity-editor-stage-step="signals"[^>]*data-entity-editor-stage-step-active="true"/);
    expect(html).toContain('data-entity-editor-incoming-monitor-context="true"');
    expect(html).toContain('data-entity-editor-incoming-monitor-context-id="658094606003456"');
    expect(html).toContain('data-entity-editor-monitor-bind-template-input="manual-monitor-id"');
    expect(html).toContain('value="658094606003456"');
    expect(html).toContain(t('entities.editor.monitor-bind-template.incoming.title'));
    expect(html).toContain(t('entities.editor.monitor-bind-template.incoming.copy', { name: 'Checkout API Website Check' }));
    expect(html).toContain(t('entities.editor.collection.monitor-binds.empty'));
  });

  it('opens detail bind-monitor handoffs in the signal binding step', async () => {
    mockNavigationState.searchParams = new URLSearchParams('stage=signals');
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            id: 78,
            type: 'service',
            name: 'owned-service',
            source: 'manual'
          },
          identities: [{ identityKey: 'service.name', identityValue: 'owned-service' }],
          monitorBinds: [],
          relations: []
        }}
        mode="edit"
        entityId="78"
      />
    );

    expect(html).toMatch(/data-entity-editor-stage-step="signals"[^>]*data-entity-editor-stage-step-active="true"/);
    expect(html).toContain(t('entities.editor.stage.signals.label'));
    expect(html).toContain('data-entity-editor-monitor-bind-template="manual-monitor-id"');
  });

  it('keeps relationship authoring in the relations stage with a novice depends_on template', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');

    expect(source).toContain('data-entity-editor-relation-template="depends-on"');
    expect(source).toContain('data-entity-editor-relation-template-action="depends-on"');
    expect(source).toContain("relationType: 'depends_on'");
    expect(source).toContain("relationSource: 'manual'");
    expect(source).toContain("targetRef: normalizedRelationTargetRef");
    expect(source).toContain("'relation-target'");
    expect(source).toContain('catalogSuggestions?.entityRefs');
    expect(source).toContain('setRelationItems(current => replaceFirstEmptyJsonRow(current, dependencyRelationTemplate))');
    expect(source).toContain("t('entities.editor.relation-template.depends-on.action')");
    expect(source).toContain("activeStage === 'relations'");
    expect(source).not.toContain("activeStage === 'signals' ? (\\n                  <div className=\"grid gap-3\">\\n                    <JsonObjectListEditor label={t('entities.editor.collection.relations')}");
  });

  it('localizes Entity editor backend save errors and exposes them as inline alerts', async () => {
    const {
      buildEntityEditorUniqueNameLookupUrl,
      findEntityEditorExactUniqueNameMatch,
      resolveEntityEditorDuplicateRecoveryHref,
      resolveEntityEditorMonitorBindConflictRecoveryHref,
      resolveVisibleEntityEditorMessage,
      shouldShowEntityEditorBackendRetry
    } = await import('./entity-editor-surface');
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');

    expect(source).toContain('resolveVisibleEntityEditorMessage(message, messageTone, t)');
    expect(source).toContain('resolveEntityEditorDuplicateRecoveryHref(message, messageTone, draft.entity.name)');
    expect(source).toContain('findExistingEntityEditorUniqueName(payload.entity.name ||');
    expect(source).toContain("setMessage(`Entity already exists: ${existingEntity.entity?.name || payload.entity.name || ''}.`);");
    expect(source).toContain('apiMessageGet<PageResult<EntitySummaryInfo>>(buildEntityEditorUniqueNameLookupUrl(normalizedName))');
    expect(source).toContain('resolveEntityEditorMonitorBindConflictRecoveryHref(');
    expect(source).toContain('shouldShowEntityEditorBackendRetry(message, messageTone)');
    expect(source).toContain('data-entity-editor-message={messageTone ===');
    expect(source).toContain('data-entity-editor-duplicate-recovery-link="true"');
    expect(source).toContain('data-entity-editor-monitor-bind-conflict-recovery-link="true"');
    expect(source).toContain('data-entity-editor-backend-unavailable-retry="save-again"');
    expect(source).toContain("type=\"submit\"");
    expect(source).toContain("t('common.button.retry')");
    expect(source).toContain("role={messageTone === 'error' ? 'alert' : 'status'}");
    expect(source).toContain("'border-[#31405c] bg-[#111724] text-[#d8e4ff]'");
    expect(source).toContain("messageTone === 'success' ? 'text-[#9fb0cc]' : 'text-rose-600'");
    expect(source).not.toContain('text-emerald-600');
    expect(source).not.toContain("'border-[#24533a] bg-[#101914] text-[#a8efc0]'");
    expect(source).toContain("normalized.startsWith('Entity primary identity already exists: ')");
    expect(source).toContain("normalized.startsWith('Entity already exists: ')");
    expect(resolveVisibleEntityEditorMessage('Entity primary identity already exists: service.name=checkout-api.', 'error', t)).toBe(
      t('entities.editor.message.entity-primary-identity-exists', { identity: 'service.name=checkout-api' })
    );
    expect(resolveVisibleEntityEditorMessage('Entity already exists: service product-design/checkout-api.', 'error', t)).toBe(
      t('entities.editor.message.entity-already-exists', { reference: 'service product-design/checkout-api' })
    );
    expect(resolveVisibleEntityEditorMessage('Backend parser saw custom-field drift.', 'error', t)).toBe(
      t('entities.editor.message.backend-fallback', { message: 'Backend parser saw custom-field drift.' })
    );
    expect(resolveVisibleEntityEditorMessage(t('common.save-success'), 'success', t)).toBe(t('common.save-success'));
    expect(
      resolveEntityEditorDuplicateRecoveryHref('Entity primary identity already exists: service.name=checkout-api.', 'error', 'checkout-api')
    ).toBe('/entities?search=checkout-api&source=entity-editor-duplicate-recovery');
    expect(resolveEntityEditorDuplicateRecoveryHref('Entity primary identity already exists: service.name=checkout-api.', 'error')).toBe(
      '/entities?search=checkout-api&source=entity-editor-duplicate-recovery'
    );
    expect(resolveEntityEditorDuplicateRecoveryHref('Backend parser saw custom-field drift.', 'error', 'checkout-api')).toBeNull();
    expect(buildEntityEditorUniqueNameLookupUrl(' checkout-api ')).toBe(
      '/entities?search=checkout-api&pageIndex=0&pageSize=8'
    );
    expect(
      findEntityEditorExactUniqueNameMatch(
        {
          content: [
            { entity: { id: 41, name: 'checkout-api-copy' } },
            { entity: { id: 42, name: 'checkout-api' } }
          ],
          totalElements: 2,
          pageIndex: 0,
          pageSize: 8
        },
        'checkout-api'
      )?.entity?.id
    ).toBe(42);
    expect(
      findEntityEditorExactUniqueNameMatch(
        {
          content: [{ entity: { id: 42, name: 'checkout-api' } }],
          totalElements: 1,
          pageIndex: 0,
          pageSize: 8
        },
        'checkout-api',
        '42'
      )
    ).toBeNull();
    expect(
      resolveEntityEditorMonitorBindConflictRecoveryHref(
        'Monitor already bound to another entity: 632051474676992.',
        'error',
        {
          '632051474676992': {
            entityId: 42,
            entityName: 'Checkout API',
            entityType: 'service',
            score: 100,
            recommendation: 'already_bound',
            alreadyBound: true,
            matchedIdentities: {}
          }
        },
        '/entities?search=checkout'
      )
    ).toBe('/entities/42?source=entity-editor-monitor-bind-conflict&returnTo=%2Fentities%3Fsearch%3Dcheckout');
    expect(
      resolveEntityEditorMonitorBindConflictRecoveryHref(
        'Monitor already bound to another entity: 632051474676992.',
        'error',
        {},
        '/entities'
      )
    ).toBeNull();
    expect(
      shouldShowEntityEditorBackendRetry(
        'Backend service unavailable. Please retry after the backend service is restored.',
        'error'
      )
    ).toBe(true);
    expect(shouldShowEntityEditorBackendRetry('API request failed: 503 Service Unavailable', 'error')).toBe(true);
    expect(shouldShowEntityEditorBackendRetry('Entity already exists: checkout-api.', 'error')).toBe(false);
    expect(shouldShowEntityEditorBackendRetry('Monitor already bound to another entity: 632051474676992.', 'error')).toBe(false);
    expect(shouldShowEntityEditorBackendRetry(t('common.save-success'), 'success')).toBe(false);
  });

  it('uses the shared cold textarea for descriptive prose instead of page-local textarea chrome', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');

    expect(source).toContain("import { Textarea } from '@/components/ui/textarea';");
    expect(source).toContain('data-entity-editor-description-textarea="hertzbeat-ui-textarea"');
    expect(source).not.toContain('<textarea');
    expect(source).not.toContain('resize-y');
    expect(source).not.toContain('resize:');
  });

  it('keeps the entity editor workbench unframed so the page cannot regress to card-in-card chrome', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');

    expect(source).toContain('data-entity-editor-frame="hertzbeat-ui-unframed-editor-band"');
    expect(source).toContain('data-entity-editor-nested-card-policy="no-card-inside-card"');
    expect(source).toContain('data-entity-editor-summary-card="hertzbeat-ui-unframed-editor-section"');
    expect(source).toContain('data-entity-editor-summary-section="hertzbeat-ui-unframed-editor-section"');
    expect(source).toContain('data-entity-type-icon-frame="hertzbeat-ui-unframed-icon"');
    expect(source).toContain('data-entity-editor-preview-rail-nesting-contract="flat-summary-aside"');
    expect(source).toContain('className="self-start p-0"');
    expect(source).toContain("'flex min-h-[46px] items-center gap-2 border px-3 py-1.5 text-left transition-colors'");
    expect(source).toContain('data-entity-editor-stage-stepper="hertzbeat-ui-stepper"');
    expect(source).toContain('data-entity-editor-stage-help-placement="inline-title"');
    expect(source).toContain('data-entity-editor-stage-step-title="hertzbeat-ui-stepper-title"');
    expect(source).toContain("Check,");
    expect(source).toContain('data-entity-editor-stage-step-done-icon="lucide-check"');
    expect(source).not.toContain("{done ? 'OK' : index + 1}");
    expect(source).toContain('data-entity-editor-stage-help-trigger="hertzbeat-ui-stepper-help"');
    expect(source).toContain('data-entity-editor-stage-help-style="icon-after-title"');
    expect(source).toContain('data-entity-editor-stage-help-frame="borderless"');
    expect(source).toContain('data-entity-editor-stage-help-visual="circle-help-icon"');
    expect(source).toContain('data-entity-editor-stage-help-icon="lucide-circle-help"');
    expect(source).not.toContain('data-entity-editor-stage-help-style="literal-question-after-title"');
    expect(source).not.toContain('data-entity-editor-stage-help-visual="borderless-question"');
    expect(source).toContain('data-entity-editor-stage-help="hertzbeat-ui-stepper-tooltip"');
    expect(source).toContain('data-entity-editor-action-help={id}');
    expect(source).toContain('data-entity-editor-action-help-style={helpStyle}');
    expect(source).toContain('data-entity-editor-action-help-trigger="hertzbeat-ui-action-help"');
    expect(source).toContain('data-entity-editor-action-help-trigger-style={helpStyle}');
    expect(source).toContain('data-entity-editor-action-help-visual={helpVisual}');
    expect(source).toContain('data-entity-editor-action-help-icon="lucide-circle-help"');
    expect(source).toContain('data-entity-editor-action-help-tooltip={id}');
    expect(source).toContain('data-entity-editor-action-help-item={helpId}');
    expect(source).toContain('data-entity-editor-field-help-placement="inline-label"');
    expect(source).toContain('data-entity-editor-field-title="inline-help-and-meta"');
    expect(source).toContain('data-entity-editor-field-help-position="after-label-before-meta"');
    expect(source).toContain('data-entity-editor-field-help-button="icon-after-label"');
    expect(source).toContain('data-entity-editor-field-help-visual="circle-help-icon"');
    expect(source).toContain('data-entity-editor-field-help-icon="lucide-circle-help"');
    expect(source).not.toContain('data-entity-editor-field-help-button="literal-question-after-label"');
    expect(source).not.toContain('data-entity-editor-field-help-visual="borderless-question"');
    expect(source).toContain('data-entity-editor-field-label-help="true"');
    expect(source).toContain('data-entity-editor-field-meta="requirement-and-input-mode"');
    expect(source).toContain('data-entity-editor-field-help-trigger="hertzbeat-ui-field-help"');
    expect(source).toContain('data-entity-editor-field-help="hertzbeat-ui-field-tooltip"');
    expect(source).toContain('data-entity-editor-field-requirement={tone}');
    expect(source).toContain('data-entity-editor-field-input-mode={mode}');
    expect(source).toContain("t('entities.editor.field.input-mode.manual')");
    expect(source).toContain("t('entities.editor.field.input-mode.suggestions')");
    expect(source).toContain("t('entities.editor.field.input-mode.catalog')");
    expect(source).toContain("t('entities.editor.field.input-mode.selection')");
    expect(source).toContain("t('entities.editor.field.requirement.required')");
    expect(source).toContain("t('entities.editor.field.requirement.recommended')");
    expect(source).toContain("t('entities.editor.field.requirement.optional')");
    expect(source).toContain('inputModeHelp={inputModeHelp}');
    expect(source).toContain('function EntityEditorFieldTitle');
    expect(source).toContain("t('entities.editor.contact.help')");
    expect(source).toContain("t('entities.editor.link.help')");
    expect(source).toContain("t('entities.editor.collection.identities.help')");
    expect(source).toContain("t('entities.editor.collection.monitor-binds.help')");
    expect(source).toContain("t('entities.editor.collection.relations.help')");
    expect(source).toContain("t('entities.editor.relation.component-of.help')");
    expect(source).toContain("t('entities.editor.relation.components.help')");
    expect(source).toContain("t('entities.editor.relation.implemented-by.help')");
    expect(source).toContain("t('entities.editor.relation.languages.help')");
    expect(source).toContain("t('entities.editor.relation.labels.help')");
    expect(source).toContain('data-entity-editor-field-suggestions={fieldKey}');
    expect(source).toContain('suggestions: catalogSuggestions?.owners');
    expect(source).toContain('suggestions: catalogSuggestions?.systems');
    expect(source).toContain('suggestions: mergeSuggestions(catalogSuggestions?.environments, environmentSuggestions)');
    expect(source).toContain('suggestions: subtypeSuggestions');
    expect(source).toContain('suggestions: catalogSuggestions?.namespaces');
    expect(source).toContain('suggestionCapable: true');
    expect(source).not.toContain('data-entity-editor-frame="hertzbeat-ui-editor-frame"');
    expect(source).not.toContain('data-entity-editor-summary-card="hertzbeat-ui-editor-panel"');
    expect(source).not.toContain('rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] px-4 py-4 shadow');
    expect(source).not.toContain('className="self-start rounded-[4px] border border-[#2b3039] bg-[#101217] p-3"');
    expect(source).not.toContain('inline-flex h-6 w-6 items-center justify-center rounded-[3px] border border-[#2b3039] bg-[#0b0c0e]');
    expect(source).not.toContain('data-entity-editor-field-help-button="literal-question-after-label"\n        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#182238]');
    expect(source).not.toContain('data-entity-editor-action-help-trigger="hertzbeat-ui-action-help"\n        className="inline-flex h-5 w-5 items-center justify-center rounded-full');
    expect(source).not.toContain("'flex min-h-[46px] items-start gap-2 border px-3 py-1.5 text-left transition-colors'");
    expect(source).not.toContain("'flex min-h-[64px] items-start gap-2 border px-3 py-2 text-left'");
    expect(source).not.toContain("'flex min-h-[64px] items-center gap-2 border px-3 py-2 text-left'");
    expect(source).not.toContain('grid-cols-[32px_minmax(0,1fr)_24px]');
    expect(source).not.toContain('className="group relative inline-flex justify-end"');
    expect(source).not.toContain('className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center text-[#d8e4ff]"');
    expect(source).not.toContain("'inline-flex h-[18px] w-[18px] flex-none items-center justify-center text-[10px] font-bold'");
    expect(source).not.toContain("className=\"inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#2b3039] bg-[#101217] text-[11px] font-semibold leading-none text-[#8d95a5]");
    expect(source).not.toContain("cn('rounded-[3px]', done ? 'bg-[#14532d] text-[#d7f5df]' : 'bg-[#1b2029] text-[#8d95a5]')");
    expect(source).toContain('CircleHelp');
    expect(source).not.toContain('data-entity-editor-action-help-style="literal-question-after-action"');
    expect(source).not.toContain('data-entity-editor-action-help-visual="borderless-question"');
  });

  it('lets novice operators resolve system and environment attribution from the ownership stage', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');

    expect(source).toMatch(
      /activeStage === 'ownership'[\s\S]*t\('entities\.editor\.field\.owner'\)[\s\S]*t\('entities\.editor\.field\.runbook'\)[\s\S]*t\('entities\.editor\.field\.system'\)[\s\S]*updateEntityField\('system'[\s\S]*t\('entities\.editor\.field\.environment'\)[\s\S]*updateEntityField\('environment'/
    );
  });

  it('renders the shared create shell with a real form, definition-mode pills, preview toggle, and footer actions', async () => {
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            type: 'service',
            name: 'checkout-api',
            displayName: 'Checkout API',
            owner: 'platform',
            system: 'commerce'
          },
          identities: [],
          monitorBinds: [],
          relations: []
        }}
        mode="new"
        catalogSuggestions={{
          owners: ['platform'],
          systems: ['commerce'],
          namespaces: ['commerce'],
          environments: ['prod'],
          lifecycles: ['production'],
          tiers: ['tier-1'],
          languages: ['java'],
          linkProviders: ['grafana']
        }}
      />
    );

    expect(html).toContain('<form');
    expect(html).toContain('data-entity-editor-shell="otlp-hertzbeat-ui-entity-composer"');
    expect(html).toContain('data-entity-editor-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-entity-editor-layout="full-width-workbench"');
    expect(html).toContain('data-entity-editor-header="hertzbeat-ui-compact-header"');
    expect(html).toContain('data-entity-editor-header-rhythm="hertzbeat-ui-compact"');
    expect(html).toContain('data-entity-editor-page-heading="true"');
    expect(html).toContain('data-entity-editor-form-heading="true"');
    expect(html).toContain(`<h1 data-entity-editor-page-heading="true" class="text-[24px] font-semibold leading-none text-[#f5f7fb]">${t('entities.editor.shell.title.new')}</h1>`);
    expect(html).toContain(`<h2 data-entity-editor-form-heading="true" class="text-[18px] font-semibold leading-none text-[#f5f7fb]">${t('entities.editor.shell.title.new')}</h2>`);
    expect(html).toContain('data-entity-editor-frame="hertzbeat-ui-unframed-editor-band"');
    expect(html).toContain('data-entity-editor-nested-card-policy="no-card-inside-card"');
    expect(html).toContain('data-entity-editor-route-tabs="hertzbeat-ui-segmented-tabs"');
    expect(html).toContain('data-entity-editor-summary-card="hertzbeat-ui-unframed-editor-section"');
    expect(html).toContain('data-entity-editor-summary-section="hertzbeat-ui-unframed-editor-section"');
    expect(html).toContain('data-entity-editor-preview-rail-nesting-contract="flat-summary-aside"');
    expect(html).toContain('data-entity-editor-preview-rail-density="hertzbeat-ui-inline-preview"');
    expect(html).toContain('class="self-start p-0"');
    expect(html).toContain('data-entity-editor-type-strip="hertzbeat-ui-catalog-grid"');
    expect(html).toContain('data-entity-editor-type-strip-layout="hertzbeat-ui-compact-grid"');
    expect(html).toContain('data-entity-editor-type-card-density="hertzbeat-ui-compact-card"');
    expect(html).toContain('data-entity-editor-entry-strip="hertzbeat-ui-segmented-pills"');
    expect(html).toContain('data-entity-editor-stage-stepper="hertzbeat-ui-stepper"');
    expect(html).toContain('data-entity-editor-stage-step-trigger="hertzbeat-ui-stepper-trigger"');
    expect(html).toContain('data-entity-editor-stage-step-title="hertzbeat-ui-stepper-title"');
    expect(html).toContain('data-entity-editor-stage-step-done-icon="lucide-check"');
    expect(html).not.toContain('>OK<');
    expect(html).toContain('data-entity-editor-stage-help-placement="inline-title"');
    expect(html).toContain('data-entity-editor-stage-help-trigger="hertzbeat-ui-stepper-help"');
    expect(html).toContain('data-entity-editor-stage-help-style="icon-after-title"');
    expect(html).toContain('data-entity-editor-stage-help-frame="borderless"');
    expect(html).toContain('data-entity-editor-stage-help-visual="circle-help-icon"');
    expect(html).toContain('data-entity-editor-stage-help-icon="lucide-circle-help"');
    expect(html).toContain('data-entity-editor-stage-help="hertzbeat-ui-stepper-tooltip"');
    expect((html.match(/data-entity-editor-stage-help-style="icon-after-title"/g) || []).length).toBe(4);
    expect((html.match(/data-entity-editor-stage-help-frame="borderless"/g) || []).length).toBe(4);
    expect((html.match(/data-entity-editor-stage-help-visual="circle-help-icon"/g) || []).length).toBe(4);
    expect((html.match(/data-entity-editor-stage-help-icon="lucide-circle-help"/g) || []).length).toBe(4);
    expect(html).not.toContain('data-entity-editor-stage-help-style="literal-question-after-title"');
    expect(html).not.toContain('data-entity-editor-stage-help-visual="borderless-question"');
    expect((html.match(/data-entity-editor-action-help-style="icon-after-action"/g) || []).length).toBe(4);
    expect((html.match(/data-entity-editor-action-help-trigger-style="icon-after-action"/g) || []).length).toBe(4);
    expect((html.match(/data-entity-editor-action-help-visual="circle-help-icon"/g) || []).length).toBe(4);
    expect((html.match(/data-entity-editor-action-help-icon="lucide-circle-help"/g) || []).length).toBe(4);
    expect(html).not.toContain('data-entity-editor-action-help-style="literal-question-after-action"');
    expect(html).not.toContain('data-entity-editor-action-help-visual="borderless-question"');
    ['all-entities', 'preview-toggle', 'cancel', 'save'].forEach(actionId => {
      expect(html).toContain(`data-entity-editor-action-help="${actionId}"`);
      expect(html).toContain(`data-entity-editor-action-help-item="${actionId}"`);
      expect(html).toContain(`data-entity-editor-action-help-tooltip="${actionId}"`);
    });
    expect(html).toContain('data-entity-editor-action-help-trigger="hertzbeat-ui-action-help"');
    expect(html).toContain(t('entities.editor.action.all-entities.help'));
    expect(html).toContain(t('entities.editor.action.preview-toggle.help'));
    expect(html).toContain(t('entities.editor.action.cancel.help'));
    expect(html).toContain(t('entities.editor.action.save.create-help'));
    expect(html).toContain('data-entity-editor-command-action="return"');
    expect(html).toContain('data-entity-editor-command-action="preview-toggle"');
    expect(html).toContain('data-entity-editor-command-action="top-cancel"');
    expect(html).toContain('data-entity-editor-command-action="top-submit"');
    expect(html).toContain('data-entity-editor-command-action="footer-cancel"');
    expect(html).toContain('data-entity-editor-command-action="footer-submit"');
    expect(html).toContain('data-entity-editor-all-entities-return="entity-list-root"');
    expect(html).toContain('data-entity-editor-all-entities-return-target="/entities"');
    expect(html).toContain('data-entity-editor-cancel-return="entity-list-root"');
    expect(html).toContain('data-entity-editor-cancel-return-target="/entities"');
    expect(html).not.toContain('<span aria-hidden="true">?</span>');
    expect(html).toContain('data-entity-editor-stage-step-requirement="required"');
    expect(html).toContain('data-entity-editor-stage-step-requirement="recommended"');
    expect(html).toContain('data-entity-editor-stage-step-requirement="optional"');
    expect(html).toContain('data-entity-editor-body="hertzbeat-ui-single-stage"');
    expect(html).not.toContain('data-entity-editor-body-placement="hertzbeat-ui-deferred-body"');
    expect(html).not.toContain('data-entity-editor-body="angular-single-stage"');
    expect(html).toContain('data-entity-editor-definition-tabs="hertzbeat-ui-bottom-tabs"');
    expect(html).toContain('data-entity-editor-definition-footer="hertzbeat-ui-definition-footer"');
    expect(html).not.toContain('data-entity-editor-page-header-offset="angular-sidebar-flush"');
    expect(html).not.toContain('data-entity-editor-frame="angular-flush"');
    expect(html).not.toContain('data-entity-editor-definition-footer-raise="angular-flush-tabs"');
    expect(html).not.toContain('data-workbench-side="true"');
    expect(html).toContain(t('entities.editor.mode.editor'));
    expect(html).toContain('YAML');
    expect(html).toContain('JSON');
    expect(html).toContain(t('entities.editor.shell.preview.hide'));
    expect(html).toContain('data-entity-editor-preview-toggle-icon="cold"');
    expect(html).toContain(t('common.button.cancel'));
    expect(html).toContain(t('entities.editor.field.display-name'));
    expect(html).toContain(t('entities.editor.field.namespace'));
    expect(html).toContain(t('entities.editor.field.environment'));
    expect(html).toContain('data-entity-editor-field-help-placement="inline-label"');
    expect(html).toContain('data-entity-editor-field-title="inline-help-and-meta"');
    expect(html).toContain('data-entity-editor-field-help-position="after-label-before-meta"');
    expect(html).toContain('data-entity-editor-field-help-button="icon-after-label"');
    expect(html).toContain('data-entity-editor-field-help-visual="circle-help-icon"');
    expect(html).toContain('data-entity-editor-field-help-icon="lucide-circle-help"');
    expect(html).not.toContain('data-entity-editor-field-help-button="literal-question-after-label"');
    expect(html).not.toContain('data-entity-editor-field-help-visual="borderless-question"');
    expect(html).toContain('data-entity-editor-field-label-help="true"');
    expect(html).toContain('data-entity-editor-field-meta="requirement-and-input-mode"');
    expect(html).toContain('data-entity-editor-field-help-trigger="hertzbeat-ui-field-help"');
    expect(html).toContain('data-entity-editor-field-help="hertzbeat-ui-field-tooltip"');
    expect(html).toContain('data-entity-editor-field-help-key="name"');
    expect(html).toContain('data-entity-editor-field-help-key="type"');
    expect(html).toContain('id="entity-editor-field-help-type"');
    expect(html).toContain('aria-describedby="entity-editor-field-help-type"');
    expect(html).toContain('data-entity-editor-field-help-key="entry-source"');
    expect(html).toContain('data-entity-editor-field-help-key="display-name"');
    expect(html).toContain('data-entity-editor-field-help-key="namespace"');
    expect(html).toContain('data-entity-editor-field-help-key="environment"');
    expect(html).toContain('data-entity-editor-field-help-key="subtype"');
    expect(html).toContain('data-entity-editor-field-help-key="owner"');
    expect(html).toContain('data-entity-editor-field-help-key="system"');
    expect(html).toContain('data-entity-editor-field-help-key="source"');
    expect(html).toContain('data-entity-editor-field-help-key="description"');
    expect((html.match(/data-entity-editor-field-title="inline-help-and-meta"/g) || []).length).toBeGreaterThanOrEqual(10);
    expect((html.match(/data-entity-editor-field-help-trigger="hertzbeat-ui-field-help"/g) || []).length).toBeGreaterThanOrEqual(11);
    expect((html.match(/data-entity-editor-field-help-visual="circle-help-icon"/g) || []).length).toBeGreaterThanOrEqual(11);
    expect((html.match(/data-entity-editor-field-help-icon="lucide-circle-help"/g) || []).length).toBeGreaterThanOrEqual(11);
    expect(html).toContain('data-entity-editor-field-requirement="required"');
    expect(html).toContain('data-entity-editor-field-requirement="recommended"');
    expect(html).toContain('data-entity-editor-field-requirement="optional"');
    expect(html).toContain('data-entity-editor-field-input-mode="manual"');
    expect(html).toContain('data-entity-editor-field-input-mode="suggestions"');
    expect(html).toContain('data-entity-editor-field-input-mode="selection"');
    expect(html).toContain(t('entities.editor.field.requirement.required'));
    expect(html).toContain(t('entities.editor.field.requirement.recommended'));
    expect(html).toContain(t('entities.editor.field.requirement.optional'));
    expect(html).toContain(t('entities.editor.field.input-mode.manual'));
    expect(html).toContain(t('entities.editor.field.input-mode.manual.help'));
    expect(html).toContain(t('entities.editor.field.input-mode.suggestions'));
    expect(html).toContain(t('entities.editor.field.input-mode.suggestions.help'));
    expect(html).not.toContain('data-entity-editor-field-input-mode="catalog"');
    expect(html).toContain(t('entities.editor.field.input-mode.selection'));
    expect(html).toContain(t('entities.editor.field.input-mode.selection.help'));
    expect(html).toContain(t('entities.editor.field.name.help'));
    expect(html).toContain(t('entities.editor.field.type.help'));
    expect(html).toContain(t('entities.editor.field.entry-source.help'));
    expect(html).toContain(t('entities.editor.field.display-name.help'));
    expect(html).toContain(t('entities.editor.field.namespace.help'));
    expect(html).toContain(t('entities.editor.field.environment.help'));
    expect(html).toContain(t('entities.editor.field.owner.help'));
    expect(html).toContain(t('entities.editor.field.system.help'));
    expect(html).toContain(t('entities.editor.field.source.help'));
    expect(html).toContain(t('entities.editor.field.description.help'));
    expect(html).not.toContain('data-entity-editor-field-suggestion-status=');
    expect(html).toContain('data-entity-editor-field-suggestions="namespace"');
    expect(html).toContain('data-entity-editor-field-suggestions="environment"');
    expect(html).toContain('data-entity-editor-field-suggestions="subtype"');
    expect(html).toContain('data-entity-editor-field-suggestions="owner"');
    expect(html).toContain('data-entity-editor-field-suggestions="system"');
    expect(html).toContain('data-entity-editor-suggestion-picker="namespace"');
    expect(html).toContain('data-entity-editor-suggestion-picker="environment"');
    expect(html).toContain('data-entity-editor-suggestion-picker="subtype"');
    expect(html).toContain('data-entity-editor-suggestion-picker="owner"');
    expect(html).toContain('data-entity-editor-suggestion-picker="system"');
    expect(html).toContain('data-entity-editor-suggestion-action="namespace"');
    expect(html).toContain('data-entity-editor-suggestion-action="environment"');
    expect(html).toContain('data-entity-editor-suggestion-action="owner"');
    expect(html).toContain(t('entities.editor.field.suggestions-available'));
    expect(html).toContain(t('entities.editor.field.suggestion.use', { field: t('entities.editor.field.namespace'), value: 'commerce' }));
    expect((html.match(/data-entity-editor-suggestion-action=/g) || []).length).toBeGreaterThanOrEqual(5);
    expect(html).toContain('list="entity-editor-field-namespace-suggestions"');
    expect(html).toContain('list="entity-editor-field-environment-suggestions"');
    expect(html).toContain('list="entity-editor-field-subtype-suggestions"');
    expect(html).not.toContain('list="entity-editor-field-source-suggestions"');
    expect(html).toContain('data-entity-editor-select="source"');
    expect(html).toContain('data-hz-ui="select"');
    expect(html).toContain('value="manual"');
    expect(html).toContain('value="otel_resource"');
    expect(html).toContain('value="definition"');
    expect(html).toContain(`aria-label="${t('entities.editor.field.display-name')}"`);
    expect(html).toContain(`aria-label="${t('entities.editor.shell.name-label')}"`);
    expect(html).toContain(`aria-label="${t('entities.editor.field.source')}"`);
    expect(html).toContain(`aria-label="${t('entities.editor.field.description')}"`);
    expect(html).not.toContain('Cancel');
    expect(html).not.toContain('Namespace');
    expect(html).not.toContain('Environment');
    expect(html).not.toContain('Display Name');
    expect(html).not.toContain('aria-label="Name"');
    expect(html).not.toContain('aria-label="Source"');
    expect(html).toContain(t('entities.editor.submit.create'));
    expect(html).toContain(
      `aria-label="${t('entities.editor.submit.first-viewport-aria', { action: t('entities.editor.submit.create') })}"`
    );
    expect(html).toContain(
      `aria-label="${t('entities.editor.submit.footer-aria', { action: t('entities.editor.submit.create') })}"`
    );
    expect(html).toContain(t('entities.editor.type.system.label'));
    expect(html).toContain(t('entities.editor.type.service.label'));
    expect(html).toContain('data-entity-type-icon-frame="hertzbeat-ui-unframed-icon"');
    expect(html).toContain('data-entity-type-icon="service"');
    expect(html).toContain('data-entity-type-icon="database"');
    expect(html).toContain('<svg');
    expect(html).toContain(t('entities.editor.entry-source.manual'));
    expect(html).toContain('data-entity-entry-source-icon="manual"');
    expect(html).toContain('data-entity-entry-source-icon="otel_resource"');
    expect(html).toContain('data-entity-entry-source-icon="definition"');
    expect(html).toContain(t('entities.editor.stage.basic.label'));
    expect(html).toContain(t('entities.editor.stage.ownership.label'));
    expect(html).toContain(t('entities.editor.stage.signals.label'));
    expect(html).toContain(t('entities.editor.stage.relations.label'));
    expect(html).toContain(t('entities.editor.stage.required'));
    expect(html).toContain(t('entities.editor.stage.recommended'));
    expect(html).toContain(t('entities.editor.stage.optional'));
    expect(html).toContain(t('entities.editor.stage.basic.help'));
    expect(html).toContain(t('entities.editor.stage.basic.impact'));
    expect(html).toContain('data-entity-editor-top-actions="first-viewport-completion"');
    expect(html).toContain('data-entity-editor-top-actions-owner="hertzbeat-ui-inline-actions"');
    expect(html).toContain('data-entity-editor-top-cancel-return="entity-list-root"');
    expect(html).toContain('data-entity-editor-top-cancel-return-target="/entities"');
    expect(html).toContain('data-entity-editor-submit-placement="first-viewport"');
    expect(html).toContain('data-entity-editor-submit-placement="footer"');
    expect(html).toContain('data-entity-editor-footer="true"');
    expect(html.indexOf('data-entity-editor-command-action="top-cancel"')).toBeLessThan(
      html.indexOf('data-entity-editor-command-action="top-submit"')
    );
    expect(html.indexOf('data-entity-editor-command-action="footer-cancel"')).toBeLessThan(
      html.indexOf('data-entity-editor-command-action="footer-submit"')
    );

    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');
    expect(source).toContain("from 'lucide-react'");
    expect(source).toContain('data-entity-editor-shell="otlp-hertzbeat-ui-entity-composer"');
    expect(source).toContain('data-entity-editor-command-action="return"');
    expect(source).toContain('data-entity-editor-command-action="preview-toggle"');
    expect(source).toContain('data-entity-editor-command-action="top-cancel"');
    expect(source).toContain('data-entity-editor-command-action="top-submit"');
    expect(source).toContain('data-entity-editor-command-action="footer-cancel"');
    expect(source).toContain('data-entity-editor-command-action="footer-submit"');
    expect(source).toContain('data-entity-editor-style-baseline="hertzbeat-ui-matte"');
    expect(source).toContain('data-entity-editor-frame="hertzbeat-ui-unframed-editor-band"');
    expect(source).toContain('data-entity-editor-nested-card-policy="no-card-inside-card"');
    expect(source).toContain('data-entity-editor-definition-footer="hertzbeat-ui-definition-footer"');
    expect(source).toContain('data-entity-editor-type-card-density="hertzbeat-ui-compact-card"');
    expect(source).not.toContain('useAngularVisual');
    expect(source).not.toContain('angular-');
    expect(source).not.toContain('angularTitle');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('RailSection');
    expect(source).not.toContain('WorkbenchPillButton');
    expect(source).not.toContain('WorkbenchSelectableCard');
    expect(source).not.toContain('WorkbenchStack');
    expect(source).not.toContain('RowList');
    expect(source).not.toContain('SectionBlock');
    expect(source).not.toContain('TextField');
    expect(source).not.toContain('SuggestionChips');
    expect(source).not.toContain('buildEntityEditorFacts');
    expect(source).not.toContain('buildEntityEditorCatalogRows');
    expect(source).not.toContain('buildEntityEditorNextStepRows');
    expect(source).not.toContain('buildEntityEditorTitle');
    expect(source).not.toContain('buildEntityEditorWorkspaceTabs');
    expect(source).not.toContain("'Workflow'");
    expect(source).not.toContain("'Basics'");
    expect(source).not.toContain('lightInputClassName');
    expect(source).not.toContain('nameInputClassName');
    expect(source).not.toContain('text-white');
    expect(source).not.toContain('bg-white');
    expect(source).not.toContain('rounded-[2px]');
    expect(source).not.toContain('border-t border-[#eef1f5] px-4 py-3');
    expect(source).not.toContain("index === 0 ? 'border-[#3f6df6] bg-[#16213a] text-white'");
    expect(source).not.toContain('flex min-h-[52px] items-start gap-2 rounded-[6px]');
    expect(source).not.toContain('rounded-[6px] bg-white p-[14px]');
    expect(source).not.toContain('card.label.slice(0, 1)');
    expect(source).not.toContain("renderField('Namespace'");
    expect(source).not.toContain("renderField('Environment'");
    expect(source).not.toContain("renderField('Runbook'");
    expect(source).not.toContain('<MultiValueField label="Component Of"');
    expect(source).not.toContain('<MultiValueField label="Components"');
    expect(source).not.toContain('<MultiValueField label="Implemented By"');
    expect(source).not.toContain('<MultiValueField label="Languages"');
    expect(source).not.toContain('<KeyValueEditor label="Labels"');
    expect(source).not.toContain('Provider"');
    expect(source).not.toContain('Telemetry Discovery</div>');
  }, 30000);

  it('returns cancel and all-entities actions to a safe internal returnTo context', async () => {
    mockNavigationState.searchParams = new URLSearchParams(
      'returnTo=%2Fentities%3Fsearch%3Dcheckout%26pageSize%3D15%26type%3Dservice'
    );
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            type: 'service',
            name: ''
          },
          identities: [],
          monitorBinds: [],
          relations: []
        }}
        mode="new"
        catalogSuggestions={{ owners: [], systems: [], namespaces: [] }}
      />
    );

    expect(html).toContain('href="/entities?search=checkout&amp;pageSize=15&amp;type=service"');
    expect(html).toContain('data-entity-editor-all-entities-return="safe-return-context-or-entity-list"');
    expect(html).toContain('data-entity-editor-all-entities-return-kind="entity-list"');
    expect(html).toContain('data-entity-editor-all-entities-return-target="/entities?search=checkout&amp;pageSize=15&amp;type=service"');
    expect(html).toContain('data-entity-editor-cancel-return="safe-return-context-or-entity-list"');
    expect(html).toContain('data-entity-editor-cancel-return-target="/entities?search=checkout&amp;pageSize=15&amp;type=service"');
    expect(html).toContain('data-entity-editor-top-cancel-return="safe-return-context-or-entity-list"');
    expect(html).toContain('data-entity-editor-top-cancel-return-target="/entities?search=checkout&amp;pageSize=15&amp;type=service"');
    expect(html).toContain('data-entity-editor-unsaved-return-guard="clean"');
    expect(html).toContain('data-entity-editor-unsaved-cancel="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-entity-editor-unsaved-cancel-state="closed"');
    expect(html).toContain(t('entities.editor.shell.all-entities'));
  }, 30000);

  it('explains before save that an unbound new entity will remain unscored', async () => {
    mockNavigationState.searchParams = new URLSearchParams();
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            type: 'service',
            name: 'codex-pd-unbound-entity'
          },
          identities: [],
          monitorBinds: [],
          relations: []
        }}
        mode="new"
        catalogSuggestions={{ owners: [], systems: [], namespaces: [] }}
      />
    );

    expect(html).toContain('data-entity-editor-status-lifecycle="no-live-evidence-bound"');
    expect(html).toContain('data-entity-editor-status-lifecycle-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain(t('entities.editor.status-lifecycle.no-live-evidence.title'));
    expect(html).toContain(t('entities.editor.status-lifecycle.no-live-evidence.copy'));
  }, 30000);

  it('shows a first-viewport modeling checklist before the JSON-heavy evidence sections', async () => {
    mockNavigationState.searchParams = new URLSearchParams();
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            type: 'service',
            name: 'codex-pd-checklist-entity'
          },
          identities: [],
          monitorBinds: [],
          relations: []
        }}
        mode="new"
        catalogSuggestions={{ owners: [], systems: [], namespaces: [] }}
      />
    );

    expect(html).toContain('data-entity-editor-modeling-checklist="identity-evidence-relations"');
    expect(html).toContain('data-entity-editor-modeling-checklist-owner="hertzbeat-ui-inline-readiness"');
    expect(html).toContain('data-entity-editor-modeling-checklist-item="identity"');
    expect(html).toContain('data-entity-editor-modeling-checklist-item="evidence"');
    expect(html).toContain('data-entity-editor-modeling-checklist-item="relations"');
    expect(html).toContain('data-entity-editor-modeling-checklist-state="next"');
    expect(html).toContain('data-entity-editor-modeling-checklist-state="review"');
    expect(html).toContain('data-entity-editor-modeling-checklist-action="open-ownership"');
    expect(html).toContain('data-entity-editor-modeling-checklist-action="apply-service-name"');
    expect(html).toContain('data-entity-editor-modeling-checklist-action="open-signals"');
    expect(html).toContain('data-entity-editor-name-identity-action="service-name"');
    expect(html).toContain(t('entities.editor.modeling-checklist.action.ownership'));
    expect(html).toContain(t('entities.editor.identity-template.service-name.action'));
    expect(html).toContain(t('entities.editor.modeling-checklist.identity.next'));
    expect(html).toContain(t('entities.editor.modeling-checklist.evidence.next'));
    expect(html).toContain(t('entities.editor.modeling-checklist.relations.next'));
  }, 30000);

  it('lets novice operators jump from the modeling checklist to missing ownership', async () => {
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <EntityEditorSurface
          initial={{
            entity: {
              type: 'service',
              name: 'codex-pd-missing-owner',
              owner: ''
            },
            identities: [],
            monitorBinds: [],
            relations: []
          }}
          mode="new"
          catalogSuggestions={{ owners: ['platform'], systems: [], namespaces: [] }}
        />
      );
      await Promise.resolve();
    });

    const ownershipAction = interactionContainer.querySelector(
      'button[data-entity-editor-modeling-checklist-action="open-ownership"]'
    ) as HTMLButtonElement | null;

    expect(ownershipAction?.textContent).toContain(t('entities.editor.modeling-checklist.action.ownership'));
    expect(
      interactionContainer.querySelector('[data-entity-editor-stage-step="basic"]')?.getAttribute('data-entity-editor-stage-step-active')
    ).toBe('true');

    await act(async () => {
      ownershipAction?.click();
      await Promise.resolve();
    });

    expect(
      interactionContainer.querySelector('[data-entity-editor-stage-step="ownership"]')?.getAttribute('data-entity-editor-stage-step-active')
    ).toBe('true');
    expect(interactionContainer.querySelector('input[data-entity-editor-input="owner"]')).not.toBeNull();
  }, 30000);

  it('lets novice operators apply the service.name identity directly from the modeling checklist', async () => {
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <EntityEditorSurface
          initial={{
            entity: {
              type: 'service',
              name: 'codex-pd-checkout-api',
              owner: 'platform'
            },
            identities: [],
            monitorBinds: [],
            relations: []
          }}
          mode="new"
          catalogSuggestions={{ owners: ['platform'], systems: [], namespaces: [] }}
        />
      );
      await Promise.resolve();
    });

    const serviceNameAction = interactionContainer.querySelector(
      'button[data-entity-editor-name-identity-action="service-name"]'
    ) as HTMLButtonElement | null;

    expect(serviceNameAction).not.toBeNull();
    expect(serviceNameAction?.disabled).toBe(false);
    expect(
      interactionContainer.querySelector('[data-entity-editor-stage-step="basic"]')?.getAttribute('data-entity-editor-stage-step-active')
    ).toBe('true');

    await act(async () => {
      serviceNameAction?.click();
      await Promise.resolve();
    });

    expect(
      interactionContainer.querySelector('[data-entity-editor-stage-step="signals"]')?.getAttribute('data-entity-editor-stage-step-active')
    ).toBe('true');
    const identityEditor = interactionContainer.querySelector('[data-entity-editor-json-code-editor="object-row"]');
    expect(identityEditor?.textContent).toContain('"identityKey": "service.name"');
    expect(identityEditor?.textContent).toContain('"identityValue": "codex-pd-checkout-api"');
    expect(identityEditor?.textContent).toContain('"primaryIdentity": true');
  }, 30000);

  it('labels monitor detail return contexts honestly when creating an entity from a monitor', async () => {
    mockNavigationState.searchParams = new URLSearchParams(
      'source=telemetry&monitorId=658167456218368&returnTo=%2Fmonitors%2F658167456218368%3Fapp%3Dwebsite%26pageIndex%3D0%26pageSize%3D8'
    );
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            type: 'service',
            name: 'Codex PD monitor seeded service',
            source: 'otel_resource'
          },
          identities: [],
          monitorBinds: [{ monitorId: 658167456218368 }],
          relations: []
        }}
        mode="new"
        catalogSuggestions={{ owners: [], systems: [], namespaces: [] }}
      />
    );

    expect(html).toContain('href="/monitors/658167456218368?app=website&amp;pageIndex=0&amp;pageSize=8"');
    expect(html).toContain('data-entity-editor-all-entities-return="safe-return-context-or-entity-list"');
    expect(html).toContain('data-entity-editor-all-entities-return-kind="monitor-detail"');
    expect(html).toContain('data-entity-editor-all-entities-return-target="/monitors/658167456218368?app=website&amp;pageIndex=0&amp;pageSize=8"');
    expect(html).toContain('data-entity-editor-cancel-return-target="/monitors/658167456218368?app=website&amp;pageIndex=0&amp;pageSize=8"');
    expect(html).toContain(t('entities.editor.shell.monitor-detail'));
    expect(html).toContain(t('entities.editor.action.return-monitor.help-label'));
    expect(html).toContain(t('entities.editor.action.return-monitor.help'));
    expect(html).toContain(t('entities.editor.action.cancel.monitor-help'));
  }, 30000);

  it('labels telemetry discovery return contexts honestly when creating an entity from an OTLP candidate', async () => {
    mockNavigationState.searchParams = new URLSearchParams(
      'source=otlp-candidate&returnTo=%2Fentities%2Fdiscovery%3FidentityKey%3Dservice.name%26identityValue%3Dcheckout%26serviceName%3Dcheckout-api%26serviceNamespace%3Dcommerce%26environment%3Dprod%26source%3Dtrace-drawer'
    );
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            type: 'service',
            name: 'checkout-api',
            source: 'otel_resource'
          },
          identities: [{ identityKey: 'service.name', identityValue: 'checkout' }],
          monitorBinds: [],
          relations: []
        }}
        mode="new"
        catalogSuggestions={{ owners: [], systems: [], namespaces: [] }}
      />
    );

    expect(html).toContain(
      'href="/entities/discovery?identityKey=service.name&amp;identityValue=checkout&amp;serviceName=checkout-api&amp;serviceNamespace=commerce&amp;environment=prod&amp;source=trace-drawer"'
    );
    expect(html).toContain('data-entity-editor-all-entities-return-kind="entity-discovery"');
    expect(html).toContain(
      'data-entity-editor-all-entities-return-target="/entities/discovery?identityKey=service.name&amp;identityValue=checkout&amp;serviceName=checkout-api&amp;serviceNamespace=commerce&amp;environment=prod&amp;source=trace-drawer"'
    );
    expect(html).toContain(t('entities.editor.shell.entity-discovery'));
    expect(html).toContain(t('entities.editor.action.return-discovery.help-label'));
    expect(html).toContain(t('entities.editor.action.return-discovery.help'));
    expect(html).toContain(t('entities.editor.action.cancel.discovery-help'));
    expect(html).not.toContain('>←<!-- -->' + t('entities.editor.shell.all-entities'));
  }, 30000);

  it('labels entity detail return contexts honestly when editing from detail', async () => {
    mockNavigationState.searchParams = new URLSearchParams(
      'returnTo=%2Fentities%2F42%3Fsource%3Dproduct-design-1559'
    );
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            id: 42,
            type: 'service',
            name: 'checkout-api',
            source: 'manual'
          },
          identities: [{ identityKey: 'service.name', identityValue: 'checkout-api' }],
          monitorBinds: [],
          relations: []
        }}
        mode="edit"
        entityId="42"
        catalogSuggestions={{ owners: [], systems: [], namespaces: [] }}
      />
    );

    expect(html).toContain('href="/entities/42?source=product-design-1559"');
    expect(html).toContain('data-entity-editor-all-entities-return-kind="entity-detail"');
    expect(html).toContain('data-entity-editor-all-entities-return-target="/entities/42?source=product-design-1559"');
    expect(html).toContain(t('entities.editor.shell.entity-detail'));
    expect(html).toContain(t('entities.editor.action.return-entity-detail.help-label'));
    expect(html).toContain(t('entities.editor.action.return-entity-detail.help'));
    expect(html).toContain(t('entities.editor.action.cancel.entity-detail-help'));
    expect(html).not.toContain('>←<!-- -->' + t('entities.editor.shell.all-entities'));
  }, 30000);

  it('falls back to the entity list root when returnTo is unsafe', async () => {
    mockNavigationState.searchParams = new URLSearchParams('returnTo=%2F%2Fevil.example%2Fsteal-session');
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            type: 'service',
            name: ''
          },
          identities: [],
          monitorBinds: [],
          relations: []
        }}
        mode="new"
        catalogSuggestions={{ owners: [], systems: [], namespaces: [] }}
      />
    );

    expect(html).toContain('href="/entities"');
    expect(html).toContain('data-entity-editor-cancel-return="entity-list-root"');
    expect(html).toContain('data-entity-editor-cancel-return-target="/entities"');
    expect(html).not.toContain('evil.example');
  }, 30000);

  it('routes successful saves to the same safe return context as cancel', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');

    expect(source).toContain('const router = useRouter();');
    expect(source).toContain("const entityReturnHref = resolveEntityEditorReturnHref(searchParams.get('returnTo'));");
    expect(source).toContain('buildEntityEditorPostEditHref({');
    expect(source).toContain('function navigateEntityEditorAfterSave');
    expect(source).toContain('router.push(href);');
    expect(source).toContain('window.setTimeout');
    expect(source).toContain('window.location.assign(nextHref);');
    expect(source).toContain('const hasUnsavedChanges = currentDirtyKey !== initialDirtyKey;');
    expect(source).toContain('const saveDisabledByNoChanges = isEditMode && !hasUnsavedChanges && !canAutoDraftIncomingMonitorBind;');
    expect(source).toContain("if (mode === 'edit' && !hasUnsavedChangesForSave) {");
    expect(source).toContain("setMessage(t('entities.editor.no-changes'));");
    expect(source).toContain('data-entity-editor-feedback="first-viewport"');
    expect(source).toContain('data-entity-editor-feedback-tone={messageTone ===');
    expect(source).toContain('data-entity-editor-duplicate-recovery-placement="first-viewport"');
    expect(source).toContain('data-entity-editor-monitor-bind-conflict-recovery-placement="first-viewport"');
    expect(source).toContain('function requestEditorReturn(event: React.MouseEvent<HTMLAnchorElement>)');
    expect(source).toContain("data-entity-editor-unsaved-return-guard={hasUnsavedChanges ? 'dirty' : 'clean'}");
    expect(source).toContain('data-entity-editor-unsaved-cancel="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('data-entity-editor-unsaved-cancel-confirm');
    expect(source).toContain('entities.editor.unsaved-cancel.title');
  });

  it('owns required-name validation instead of leaving empty submits to the browser bubble only', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');

    expect(source).toContain('const [submitAttempted, setSubmitAttempted] = useState(false);');
    expect(source).toContain('setSubmitAttempted(true);');
    expect(source).toContain('noValidate');
    expect(source).toContain('data-entity-editor-validation="name"');
    expect(source).toContain("t('entities.editor.validation.name')");
    expect(source).toContain('aria-invalid={nameValidationMessage ?');
    expect(source).toContain('const nameInputRef = useRef<HTMLInputElement>(null);');
    expect(source).toContain('nameInputRef.current?.focus();');
    expect(source).toContain('ref={nameInputRef}');
  });

  it('marks catalog-backed fields as selectable history fields even before suggestions exist', async () => {
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            type: 'service',
            name: 'checkout-api'
          },
          identities: [],
          monitorBinds: [],
          relations: []
        }}
        mode="new"
        catalogSuggestions={{ owners: [], systems: [], namespaces: [] }}
      />
    );

    expect(html).toContain(t('entities.editor.field.input-mode.catalog'));
    expect(html).toContain(t('entities.editor.field.input-mode.catalog.help'));
    expect((html.match(/data-entity-editor-field-input-mode="catalog"/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(html).not.toContain('list="entity-editor-field-namespace-suggestions"');
    expect(html).not.toContain('list="entity-editor-field-owner-suggestions"');
    expect(html).not.toContain('list="entity-editor-field-system-suggestions"');
    expect(html).toContain('data-entity-editor-field-input-mode="suggestions"');
  }, 30000);

  it('uses Kubernetes workload subtype suggestions when the entity type value is k8s_workload', async () => {
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            type: 'k8s_workload',
            name: 'checkout-deployment'
          },
          identities: [],
          monitorBinds: [],
          relations: []
        }}
        mode="new"
        catalogSuggestions={{ owners: [], systems: [], namespaces: [] }}
      />
    );

    expect(html).toContain('data-entity-type-icon="k8s_workload"');
    expect(html).toContain('list="entity-editor-field-subtype-suggestions"');
    expect(html).toContain('<option value="deployment"></option>');
    expect(html).toContain('<option value="statefulset"></option>');
    expect(html).toContain('<option value="daemonset"></option>');
    expect(html).not.toContain('<option value="grpc"></option>');
  }, 30000);

  it('renders the edit shell with the same composer structure, save semantics, and definition handoff', async () => {
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            type: 'service',
            name: 'checkout-api',
            displayName: 'Checkout API',
            owner: 'platform',
            system: 'commerce'
          },
          identities: [],
          monitorBinds: [],
          relations: []
        }}
        mode="edit"
        entityId="42"
        catalogSuggestions={{ owners: ['platform'] }}
      />
    );

    expect(html).toContain('data-entity-editor-shell="otlp-hertzbeat-ui-entity-composer"');
    expect(html).toContain('data-entity-editor-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-entity-editor-layout="full-width-workbench"');
    expect(html).toContain('data-entity-editor-header="hertzbeat-ui-compact-header"');
    expect(html).toContain('data-entity-editor-page-heading="true"');
    expect(html).toContain(`<h1 data-entity-editor-page-heading="true" class="text-[24px] font-semibold leading-none text-[#f5f7fb]">${t('entities.editor.shell.title.edit')}</h1>`);
    expect(html).toContain('data-entity-editor-frame="hertzbeat-ui-unframed-editor-band"');
    expect(html).toContain('data-entity-editor-frame-spacing="hertzbeat-ui-tight"');
    expect(html).toContain('data-entity-editor-nested-card-policy="no-card-inside-card"');
    expect(html).toContain('data-entity-editor-summary-card="hertzbeat-ui-unframed-editor-section"');
    expect(html).toContain('data-entity-editor-type-strip="hertzbeat-ui-catalog-grid"');
    expect(html).toContain('data-entity-editor-entry-strip="hertzbeat-ui-segmented-pills"');
    expect(html).toContain('data-entity-editor-stage-stepper="hertzbeat-ui-stepper"');
    expect(html).toContain('data-entity-editor-edit-stage-posture="hertzbeat-ui-complete-context"');
    expect(html).toContain('data-entity-editor-stage-step-status="signals-next"');
    expect(html).toContain('data-entity-editor-stage-step-status="relations-ready"');
    expect(html).toContain('data-entity-editor-stage-step-done-icon="lucide-check"');
    expect(html).not.toContain('>OK<');
    expect(html).toContain('data-entity-editor-body="hertzbeat-ui-single-stage"');
    expect(html).not.toContain('data-entity-editor-body-placement="hertzbeat-ui-deferred-body"');
    expect(html).toContain('data-entity-editor-definition-tabs="hertzbeat-ui-bottom-tabs"');
    expect(html).toContain('data-entity-editor-definition-footer="hertzbeat-ui-definition-footer"');
    expect((html.match(/data-entity-editor-action-help-style="icon-after-action"/g) || []).length).toBe(4);
    expect((html.match(/data-entity-editor-action-help-visual="circle-help-icon"/g) || []).length).toBe(4);
    expect((html.match(/data-entity-editor-action-help-icon="lucide-circle-help"/g) || []).length).toBe(4);
    expect(html).not.toContain('data-entity-editor-action-help-style="literal-question-after-action"');
    expect(html).toContain('data-entity-editor-action-help="save"');
    expect(html).toContain(t('entities.editor.action.save.edit-help'));
    expect(html).toContain('data-entity-editor-preview-rail-density="hertzbeat-ui-inline-preview"');
    expect(html).toContain('data-entity-editor-definition-handoff="hertzbeat-ui-hidden"');
    expect(html).toContain('data-entity-type-icon="service"');
    expect(html).toContain('data-entity-type-icon="database"');
    expect(html).toContain(t('entities.editor.shell.title.edit'));
    expect(html).toContain(t('common.save'));
    expect(html).toContain('/entities/42/definition');
    expect(html).toContain('data-entity-editor-mode="editor"');
    expect(html).not.toContain('data-workbench-page="true"');
    expect(html).not.toContain('data-entity-editor-shell="angular-composer"');
    expect(html).not.toContain('data-entity-editor-frame="angular-flush"');
    expect(html).not.toContain('data-entity-editor-definition-tabs="angular-bottom"');

    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');
    expect(source).toContain('data-entity-editor-edit-stage-posture');
    expect(source).toContain("'hertzbeat-ui-complete-context'");
    expect(source).not.toContain("'angular-complete-context'");
  });

  it('bounds large entity editor suggestion catalogs so novice inputs do not render every backend value', async () => {
    const { EntityEditorSurface } = await import('./entity-editor-surface');
    const ownerSuggestions = Array.from({ length: 200 }, (_, index) => `owner-${index}`);

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            type: 'service',
            name: 'checkout-api',
            displayName: 'Checkout API',
            owner: '',
            system: 'commerce'
          },
          identities: [],
          monitorBinds: [],
          relations: []
        }}
        mode="new"
        catalogSuggestions={{
          owners: ownerSuggestions,
          systems: ['commerce'],
          namespaces: ['commerce'],
          environments: ['prod']
        }}
      />
    );

    expect(html).toContain('data-entity-editor-field-suggestions="owner"');
    expect(html).toContain('data-entity-editor-field-suggestion-total="200"');
    expect(html).toContain('data-entity-editor-field-suggestion-rendered="50"');
    expect(html).toContain('data-entity-editor-field-suggestion-limit="50"');
    expect(html).toContain('data-entity-editor-field-suggestion-overflow="bounded-datalist"');
    expect((html.match(/<option value="owner-/g) || []).length).toBe(50);
    expect((html.match(/data-entity-editor-suggestion-action="owner"/g) || []).length).toBe(4);
    expect(html).toContain('value="owner-49"');
    expect(html).not.toContain('value="owner-50"');
    expect(html).not.toContain('owner-199');
  });

  it('bounds large JSON object collections so imported entity evidence does not flood the editor', async () => {
    mockNavigationState.searchParams = new URLSearchParams('stage=signals');
    const { EntityEditorSurface } = await import('./entity-editor-surface');
    const monitorBinds = Array.from({ length: 12 }, (_, index) => ({
      monitorId: 9000 + index,
      bindType: 'manual',
      bindSource: 'scale-proof',
      status: 'active'
    }));

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            type: 'service',
            name: 'checkout-api'
          },
          identities: [],
          monitorBinds,
          relations: []
        }}
        mode="new"
        catalogSuggestions={{ owners: [], systems: [], namespaces: [] }}
      />
    );

    expect(html).toContain(`data-entity-editor-json-object-list="${t('entities.editor.collection.monitor-binds')}"`);
    expect(html).toContain('data-entity-editor-json-object-list-total="12"');
    expect(html).toContain('data-entity-editor-json-object-list-rendered="8"');
    expect(html).toContain('data-entity-editor-json-object-list-limit="8"');
    expect(html).toContain('data-entity-editor-json-object-list-overflow="bounded"');
    expect(html).toContain('data-entity-editor-json-object-list-overflow-panel="bounded-json-list"');
    expect(html).toContain(t('entities.editor.collection.json-list.overflow', { hidden: 4, total: 12, rendered: 8 }));
    expect(html).toContain(t('entities.editor.collection.json-list.show-all'));
    expect(html).toContain('9007');
    expect(html).not.toContain('9008');
    expect(html).not.toContain('9011');
  });

  it('renders telemetry handoff evidence when the draft is seeded from discovery', async () => {
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            type: 'endpoint',
            name: 'example.com:443',
            displayName: 'codex-history-green-443',
            owner: '',
            system: 'website',
            source: 'otel_resource'
          },
          identities: [{ identityKey: 'endpoint.url', identityValue: 'example.com:443' }],
          monitorBinds: [{ monitorId: 42, bindType: 'suggested', source: 'otel_resource', status: 'active' }],
          relations: []
        }}
        mode="new"
        catalogSuggestions={{
          owners: ['platform'],
          systems: ['commerce'],
          environments: ['prod']
        }}
      />
    );

    expect(html).toContain('data-entity-editor-telemetry-handoff="true"');
    expect(html).toContain('data-entity-editor-attribution-panel="telemetry-attribution-check"');
    expect(html).toContain('data-entity-editor-attribution-grid="responsive-contained"');
    expect(html).toContain('class="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-5"');
    expect(html).toContain('data-entity-editor-attribution-row="identity"');
    expect(html).toContain('data-entity-editor-attribution-state="ready"');
    expect(html).toContain('data-entity-editor-attribution-row="monitor-binding"');
    expect(html).toContain('data-entity-editor-attribution-row="ownership"');
    expect(html).toContain('data-entity-editor-attribution-state="missing"');
    expect(html).toContain('data-entity-editor-attribution-row="system-environment"');
    expect(html).toContain('data-entity-editor-attribution-state="review"');
    expect(html).toContain('data-entity-editor-attribution-row="discovery-return"');
    expect(html).toContain(t('entities.editor.telemetry-handoff.title'));
    expect(html).toContain(t('entities.editor.telemetry-handoff.attribution-check'));
    expect(html).toContain('service.name=checkout');
    expect(html).toContain('monitorId 42');
    expect(html).toContain(t('entities.editor.attribution.owner.missing-meta'));
    expect(html).toContain(t('entities.editor.attribution.system-environment.missing-environment', { system: 'website' }));
    expect(html).toContain(t('entities.editor.attribution.monitor.count', { count: 1 }));
    expect(html).toContain(t('entities.editor.attribution.identity.count', { count: 1 }));
    expect(html).toContain('/entities/discovery');
    expect(html).toContain('class="block min-w-0 truncate text-[11px] font-semibold text-[#d8e4ff]"');
    expect(html).toContain(`aria-label="${t('entities.editor.shell.name-label')}"`);
    expect(html).toContain(`aria-label="${t('entities.editor.field.display-name')}"`);
    expect(html).toContain(`aria-label="${t('entities.editor.field.source')}"`);
    expect(html).not.toContain('Telemetry Discovery');
    expect(html).not.toContain('bound monitor');
  });

  it('renders an OTLP candidate draft handoff with identity return context and no monitor requirement', async () => {
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            type: 'service',
            name: 'billing-api',
            displayName: 'billing-api',
            namespace: 'commerce',
            environment: 'prod',
            owner: '',
            source: 'otel_resource',
            labels: {
              'hertzbeat.discovery.source': 'otlp-candidate'
            }
          },
          identities: [
            { identityType: 'otel_resource', identityKey: 'service.name', identityValue: 'billing', primaryIdentity: true },
            { identityType: 'otel_resource', identityKey: 'service.namespace', identityValue: 'commerce' },
            { identityType: 'otel_resource', identityKey: 'deployment.environment.name', identityValue: 'prod' }
          ],
          monitorBinds: [],
          relations: []
        }}
        mode="new"
        catalogSuggestions={{ owners: ['platform'], systems: ['commerce'], environments: ['prod'] }}
      />
    );

    expect(html).toContain('data-entity-editor-telemetry-handoff="true"');
    expect(html).toContain('data-entity-editor-telemetry-handoff-source="otlp-candidate"');
    expect(html).toContain(t('entities.editor.attribution.monitor.count', { count: 0 }));
    expect(html).toContain(t('entities.editor.attribution.identity.count', { count: 3 }));
    expect(html).toContain(
      'href="/entities/discovery?identityKey=service.name&amp;identityValue=billing&amp;serviceName=billing-api&amp;serviceNamespace=commerce&amp;environment=prod"'
    );
    expect(html).toContain(`aria-label="${t('entities.editor.shell.name-label')}"`);
    expect(html).toContain('value="billing-api"');
    expect(html).toContain(`aria-label="${t('entities.editor.field.namespace')}"`);
    expect(html).toContain('value="commerce"');
    expect(html).toContain(`aria-label="${t('entities.editor.field.environment')}"`);
    expect(html).toContain('value="prod"');
    expect(html).not.toContain(han(0x5df2, 0x5f52, 0x5c5e));
    expect(html).not.toContain(han(0x5065, 0x5eb7, 0x6b63, 0x5e38));
    expect(html).not.toContain(han(0x62d3, 0x6251, 0x5df2, 0x786e, 0x8ba4));
  }, 30000);
});
