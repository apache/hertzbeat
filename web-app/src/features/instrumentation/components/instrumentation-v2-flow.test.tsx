/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key
  })
}));
vi.mock('./instrumentation-i18n', () => ({ translateBackend: (_t: unknown, key: string) => key }));
const notifications = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn() }));
vi.mock('antd', async importOriginal => {
  const actual = await importOriginal<typeof import('antd')>();
  return { ...actual, App: { useApp: () => ({ message: notifications }) } };
});

import { InstrumentationConfigureStep } from './instrumentation-configure-step';
import { InstrumentationGuideBlocks } from './instrumentation-guide-blocks';
import { InstrumentationGuideWorkspace } from './instrumentation-guide-workspace';
import { InstrumentationSourceStep } from './instrumentation-source-step';
import guideCss from './instrumentation-guide.module.css?raw';
import shellCss from './instrumentation-shell.module.css?raw';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('instrumentation v2 interaction', () => {
  it('searches grouped backend sources, shows category counts, and blocks unsupported entries', () => {
    const onSource = vi.fn();
    const onApplicationAnswer = vi.fn();
    const view = render(
      <InstrumentationSourceStep catalog={catalog} onSource={onSource} onApplicationAnswer={onApplicationAnswer} />
    );
    expect(screen.getByRole('searchbox')).toBeVisible();
    expect(screen.getByRole('button', { name: /instrumentation\.v2\.directory\.all.*4/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^instrumentation\.v2\.directory\.source\.quick_start/ })).toBeVisible();
    const javaSource = screen.getByRole('button', { name: /^instrumentation\.v2\.directory\.source\.java/ });
    expect(javaSource).toBeVisible();
    expect(javaSource).toHaveAttribute('title', 'instrumentation.v2.directory.source.java');
    expect(within(javaSource).getByText('instrumentation.v2.directory.source.java').tagName).toBe('SPAN');
    expect(screen.getByRole('button', { name: /^instrumentation\.v2\.directory\.source\.logstash/ })).toBeVisible();
    expect(shellCss).toMatch(/\.sourceGrid\s*\{[^}]*display:\s*flex[^}]*flex-wrap:\s*wrap/);
    expect(shellCss).toMatch(
      /\.sourceTile\s*\{[^}]*min-width:\s*150px[^}]*min-height:\s*var\(--ant-control-height-lg\)[^}]*flex:\s*0\s+0\s+auto/
    );
    expect(shellCss).toMatch(
      /\.sourceTile\s*\{[^}]*border:\s*var\(--ant-line-width\) solid transparent[^}]*background:\s*var\(--ant-color-fill-quaternary\)/
    );
    expect(shellCss).toMatch(
      /\.sourceTile:hover:not\(:disabled\),\s*\.sourceTile:focus-visible\s*\{[^}]*border-color:\s*var\(--ant-color-border\)[^}]*background:\s*var\(--ant-color-fill-tertiary\)/
    );
    expect(shellCss).toMatch(/\.sourceTile:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--hb-focus-ring\)/);
    expect(shellCss).toMatch(
      /\.sourceTileSelected,\s*\.sourceTileSelected:hover:not\(:disabled\),\s*\.sourceTileSelected:focus-visible\s*\{[^}]*border-color:\s*var\(--hb-brand-accent\)/
    );
    expect(shellCss).toMatch(/\.sourceName\s*\{[^}]*font-weight:\s*normal[^}]*white-space:\s*nowrap/);
    expect(shellCss).toMatch(
      /\.sourceIcon\s*\{[^}]*width:\s*var\(--ant-font-size-lg\)[^}]*height:\s*var\(--ant-font-size-lg\)/
    );
    const assistiveDescription = within(javaSource).getByText('instrumentation.v2.directory.source.java_description');
    expect(assistiveDescription).toHaveClass(/sourceAssistiveText/);
    expect(within(assistiveDescription).getByText(/instrumentation\.signal\.metrics/)).toBeInTheDocument();
    expect(javaSource.querySelector('[data-support]')).toBeNull();
    expect(shellCss).toMatch(
      /\.sourceAssistiveText\s*\{[^}]*position:\s*absolute[^}]*clip:\s*rect\(0,\s*0,\s*0,\s*0\)/
    );
    expect(
      screen.getByRole('button', { name: /instrumentation\.v2\.directory\.group\.applications.*2/ })
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /instrumentation\.v2\.directory\.group\.logs.*2/ }));
    expect(screen.getByRole('button', { name: /^instrumentation\.v2\.directory\.source\.fluent_bit/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /^instrumentation\.v2\.directory\.source\.quick_start/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^instrumentation\.v2\.directory\.source\.java/ })).toBeNull();
    view.rerender(
      <InstrumentationSourceStep
        key="after-reset"
        catalog={catalog}
        onSource={onSource}
        onApplicationAnswer={onApplicationAnswer}
      />
    );
    expect(screen.getByRole('button', { name: /^instrumentation\.v2\.directory\.source\.quick_start/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^instrumentation\.v2\.directory\.source\.java/ })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /instrumentation\.v2\.directory\.group\.logs.*2/ }));
    expect(screen.queryAllByRole('combobox')).toHaveLength(0);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'logstash' } });
    expect(screen.getAllByRole('button', { name: /^instrumentation\.v2\.directory\.source\.logstash/ })).toHaveLength(
      1
    );
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'java' } });
    expect(screen.getByRole('button', { name: /^instrumentation\.v2\.directory\.source\.java/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^instrumentation\.v2\.directory\.source\.quick_start/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^instrumentation\.v2\.directory\.source\.java/ }));
    expect(onSource).toHaveBeenCalledWith('java');
    view.rerender(
      <InstrumentationSourceStep
        catalog={catalog}
        sourceId="java"
        onSource={onSource}
        onApplicationAnswer={onApplicationAnswer}
      />
    );
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByRole('button', { name: 'spring_boot' })).toBeVisible();
    expect(screen.queryByText('instrumentation.v2.recipeLabel')).not.toBeInTheDocument();
  });

  it('provides a usable localized application question sequence', async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    render(<ApplicationQuestionHarness />);
    const framework = screen.getByRole('button', { name: 'spring_boot' });
    expect(screen.getByText('instrumentation.question.framework')).toBeVisible();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(shellCss).toMatch(/\.questionGrid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill/);
    expect(framework).toBeEnabled();
    expect(scrollIntoView).toHaveBeenCalledOnce();
    fireEvent.click(framework);
    expect(screen.queryByRole('button', { name: 'spring_boot' })).toBeNull();
    expect(screen.queryByText('instrumentation.question.framework')).toBeNull();
    expect(screen.queryByText('instrumentation.field.method')).toBeNull();
    expect(screen.getByText('instrumentation.question.environment')).toBeVisible();
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'docker' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'docker' }));
    expect(screen.getByRole('button', { name: 'docker' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/java · spring_boot · zero_code/)).toBeVisible();
  });

  it('keeps every destination visible and explains a missing Hybrid Collector without inventing an endpoint', () => {
    const props = {
      profileId: '',
      serviceName: '',
      platformOptions: [],
      canRender: false,
      rendering: false,
      renderError: false,
      token: '',
      tokenDraft: undefined,
      tokenGenerating: false,
      tokenError: false,
      onProfile: vi.fn(),
      onServiceName: vi.fn(),
      onPlatform: vi.fn(),
      onRender: vi.fn(),
      onOpenToken: vi.fn(),
      onCloseToken: vi.fn(),
      onTokenDraft: vi.fn(),
      onGenerateToken: vi.fn()
    };
    const view = render(
      <InstrumentationConfigureStep
        profiles={{
          schemaVersion: 2,
          status: 'available',
          defaultProfileId: 'server-default',
          profiles: [
            guide.intakeProfile,
            {
              id: 'hybrid-edge',
              kind: 'hertzbeat_collector',
              availability: 'unavailable',
              supportedTransports: [],
              endpoints: {},
              errorCode: 'intake_profile_unavailable'
            }
          ]
        }}
        {...props}
      />
    );
    expect(screen.getByRole('textbox', { name: 'instrumentation.field.serviceName' })).toBeVisible();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.queryByText('instrumentation.field.serviceNamespace')).toBeNull();
    expect(screen.queryByText('instrumentation.field.serviceEnvironment')).toBeNull();
    expect(screen.queryByText('instrumentation.field.serviceInstanceId')).toBeNull();
    expect(screen.queryByText('instrumentation.field.endpoint')).toBeNull();
    expect(screen.getByRole('button', { name: /instrumentation\.v2\.profileKind\.server/ })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: /instrumentation\.v2\.profileKind\.hertzbeat_collector/ })
    ).toBeDisabled();
    expect(screen.getByText('instrumentation.v2.profileReason.destinationUnavailable')).toBeVisible();

    view.rerender(
      <InstrumentationConfigureStep profiles={{ schemaVersion: 2, status: 'unconfigured', profiles: [] }} {...props} />
    );
    expect(screen.getByText('instrumentation.v2.profile.unconfigured')).toBeInTheDocument();
    expect(screen.getByText('instrumentation.v2.hybridCollectorSetupHint')).toBeInTheDocument();
    expect(screen.queryByText(/https?:\/\//)).toBeNull();
    view.rerender(
      <InstrumentationConfigureStep
        profiles={{
          schemaVersion: 2,
          status: 'unavailable',
          errorCode: 'intake_profile_discovery_unavailable',
          profiles: []
        }}
        {...props}
      />
    );
    expect(screen.getByText('instrumentation.v2.profile.unavailable')).toBeInTheDocument();
  });

  it('generates an OTLP ingest token through a name and expiry modal without a password field', () => {
    const onOpenToken = vi.fn();
    const onGenerateToken = vi.fn();
    render(
      <InstrumentationConfigureStep
        profiles={{
          schemaVersion: 2,
          status: 'available',
          defaultProfileId: 'server-default',
          profiles: [guide.intakeProfile]
        }}
        profileId="server-default"
        serviceName="checkout"
        platformOptions={[]}
        canRender={false}
        rendering={false}
        renderError={false}
        token=""
        tokenDraft={{ name: 'Checkout ingest', expireSeconds: 2_592_000, scope: 'otlp-ingest' }}
        tokenGenerating={false}
        tokenError={false}
        onProfile={vi.fn()}
        onServiceName={vi.fn()}
        onPlatform={vi.fn()}
        onRender={vi.fn()}
        onOpenToken={onOpenToken}
        onCloseToken={vi.fn()}
        onTokenDraft={vi.fn()}
        onGenerateToken={onGenerateToken}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'instrumentation.token.name' })).toHaveValue('Checkout ingest');
    expect(screen.getByText('instrumentation.token.fixedScope')).toBeInTheDocument();
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(screen.queryByLabelText('instrumentation.field.token')).toBeNull();
    expect(document.querySelector('input[type="password"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'instrumentation.token.generate' }));
    expect(onGenerateToken).toHaveBeenCalledOnce();
  });

  it('shows endpoint security and an explicit Bearer risk for a selected plaintext destination', () => {
    render(
      <InstrumentationConfigureStep
        profiles={{
          schemaVersion: 2,
          status: 'available',
          defaultProfileId: 'server-default',
          profiles: [
            {
              ...guide.intakeProfile,
              endpoints: {
                http_protobuf: { url: 'http://example.test:4318', security: 'plaintext' }
              }
            }
          ]
        }}
        profileId="server-default"
        serviceName="checkout"
        platformOptions={[]}
        canRender={false}
        rendering={false}
        renderError={false}
        token=""
        tokenGenerating={false}
        tokenError={false}
        onProfile={vi.fn()}
        onServiceName={vi.fn()}
        onPlatform={vi.fn()}
        onRender={vi.fn()}
        onOpenToken={vi.fn()}
        onCloseToken={vi.fn()}
        onTokenDraft={vi.fn()}
        onGenerateToken={vi.fn()}
      />
    );
    expect(screen.getByText('instrumentation.v2.transport.http_protobuf')).toBeVisible();
    expect(screen.getByText('instrumentation.v2.security.plaintext')).toBeVisible();
    expect(screen.getByText('instrumentation.token.plaintextBearerWarning')).toBeVisible();
  });

  it('materializes the memory-only token visibly without mutating the backend guide', () => {
    render(
      <InstrumentationGuideWorkspace
        catalog={catalog}
        draft={{
          sourceId: 'quick_start',
          sourceKind: 'quick_start',
          recipeId: 'telemetrygen',
          intakeProfileId: 'server-default',
          service: guide.service
        }}
        guide={guide}
        token="valid-token-123"
        detection={detection}
        detecting={false}
        detectionError={false}
        onCopy={vi.fn().mockResolvedValue(undefined)}
        onEdit={vi.fn()}
        onDetect={vi.fn()}
        onOpen={vi.fn()}
      />
    );
    expect(screen.getByText('token=valid-token-123')).toBeVisible();
    expect(screen.getByText('https://example.test/otlp')).toBeVisible();
    expect(screen.getByText('instrumentation.v2.security.tls')).toBeVisible();
    expect(screen.queryByText('[object Object]')).toBeNull();
    expect(guide.blocks[0]!.content).toBe('token=${HERTZBEAT_TOKEN}');
    const openButtons = screen.getAllByRole('button', { name: 'instrumentation.action.openExplore' });
    expect(openButtons.map(button => button.hasAttribute('disabled'))).toEqual([false, true, true]);
    expect(screen.getByText('instrumentation.detection.status.waiting')).toBeInTheDocument();
    expect(screen.getByText('instrumentation.detection.status.unsupported')).toBeInTheDocument();
    expect(guideCss).toMatch(/\.workspace\s*\{[^}]*grid-template-columns:\s*220px minmax\(0,\s*1fr\) 300px/);
  });

  it('describes a component without a version as not applicable rather than unavailable', () => {
    render(
      <InstrumentationGuideBlocks
        guide={{
          ...guide,
          components: [
            {
              name: 'OpenTelemetry Collector',
              sourceUrl: 'https://github.com/open-telemetry/opentelemetry-collector',
              version: null,
              versionPolicy: 'language_specific',
              license: 'Apache-2.0',
              installationLocationKey: 'instrumentation.location.otel_collector',
              official: true,
              bundledWithHertzBeat: false,
              dependencies: [],
              artifacts: []
            }
          ]
        }}
        token=""
        onCopy={vi.fn().mockResolvedValue(undefined)}
      />
    );
    expect(screen.getByText('instrumentation.v2.versionNotApplicable')).toBeInTheDocument();
    expect(screen.queryByText('common.unavailable')).not.toBeInTheDocument();
  });

  it('handles token validation and clipboard rejection without an unhandled promise', async () => {
    const onCopy = vi.fn().mockRejectedValue(new Error('private token must not surface'));
    render(<InstrumentationGuideBlocks guide={guide} token="invalid token" onCopy={onCopy} />);
    fireEvent.click(screen.getByRole('button', { name: 'instrumentation.action.copy' }));
    await waitFor(() => expect(notifications.warning).toHaveBeenCalledWith('instrumentation.copyFailed'));
    expect(JSON.stringify(notifications.warning.mock.calls)).not.toContain('private token');
  });
});

function ApplicationQuestionHarness() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  return (
    <InstrumentationSourceStep
      catalog={catalog}
      sourceId="java"
      {...answers}
      onSource={vi.fn()}
      onApplicationAnswer={(field, value) => setAnswers(current => ({ ...current, [field]: value }))}
    />
  );
}

const catalog = {
  schemaVersion: 2 as const,
  groups: [
    { id: 'quick_start', labelKey: 'instrumentation.v2.directory.group.quick_start' },
    { id: 'applications', labelKey: 'instrumentation.v2.directory.group.applications' },
    { id: 'logs', labelKey: 'instrumentation.v2.directory.group.logs' }
  ],
  sources: [
    {
      id: 'quick_start',
      labelKey: 'instrumentation.v2.directory.source.quick_start',
      descriptionKey: 'instrumentation.v2.directory.source.quick_start_description',
      iconKey: 'quick-start',
      groupIds: ['quick_start'],
      support: 'supported' as const,
      sourceKind: 'quick_start' as const,
      recipeIds: ['telemetrygen'],
      signals: { metrics: 'supported' as const, logs: 'supported' as const, traces: 'supported' as const }
    },
    {
      id: 'java',
      labelKey: 'instrumentation.v2.directory.source.java',
      descriptionKey: 'instrumentation.v2.directory.source.java_description',
      iconKey: 'java',
      groupIds: ['applications'],
      support: 'supported' as const,
      sourceKind: 'application' as const,
      recipeIds: ['java_spring', 'java_jar'],
      signals: { metrics: 'supported' as const, logs: 'preview' as const, traces: 'supported' as const }
    },
    {
      id: 'fluent_bit',
      labelKey: 'instrumentation.v2.directory.source.fluent_bit',
      descriptionKey: 'instrumentation.v2.directory.source.fluent_bit_description',
      iconKey: 'fluent-bit',
      groupIds: ['logs'],
      support: 'unsupported' as const,
      recipeIds: [],
      signals: { metrics: 'unsupported' as const, logs: 'unsupported' as const, traces: 'unsupported' as const }
    },
    {
      id: 'logstash',
      labelKey: 'instrumentation.v2.directory.source.logstash',
      descriptionKey: 'instrumentation.v2.directory.source.logstash_description',
      iconKey: 'logstash',
      groupIds: ['applications', 'logs'],
      support: 'preview' as const,
      recipeIds: [],
      signals: { metrics: 'unsupported' as const, logs: 'preview' as const, traces: 'unsupported' as const }
    }
  ],
  recipes: [
    {
      id: 'telemetrygen',
      kind: 'quick_start' as const,
      labelKey: 'instrumentation.v2.recipe.telemetrygen',
      preview: false,
      environments: ['docker'],
      platforms: ['linux_amd64'],
      signals: { metrics: 'supported' as const, logs: 'supported' as const, traces: 'supported' as const },
      components: [],
      blocksPreview: ['command' as const]
    },
    {
      id: 'java_spring',
      kind: 'application' as const,
      labelKey: 'instrumentation.v2.recipe.java_spring',
      preview: false,
      language: 'java',
      framework: 'spring_boot',
      method: 'zero_code',
      environments: ['docker', 'kubernetes'],
      platforms: ['linux_amd64'],
      signals: { metrics: 'supported' as const, logs: 'preview' as const, traces: 'supported' as const },
      components: [],
      blocksPreview: ['environment' as const]
    },
    {
      id: 'java_jar',
      kind: 'application' as const,
      labelKey: 'instrumentation.v2.recipe.java_jar',
      preview: false,
      language: 'java',
      framework: 'java_jar',
      method: 'zero_code',
      environments: ['docker'],
      platforms: ['linux_amd64'],
      signals: { metrics: 'supported' as const, logs: 'preview' as const, traces: 'supported' as const },
      components: [],
      blocksPreview: ['environment' as const]
    }
  ]
};

const context = {
  serviceName: 'checkout',
  serviceNamespace: 'shop',
  environment: 'prod',
  intakeProfileId: 'server-default',
  startedAt: 1000,
  detectedAt: 2000
};
const guide = {
  schemaVersion: 2 as const,
  sourceKind: 'quick_start' as const,
  recipeId: 'opentelemetry_telemetrygen',
  intakeProfile: {
    id: 'server-default',
    kind: 'server' as const,
    availability: 'available' as const,
    gateway: 'server' as const,
    supportedTransports: ['http_protobuf' as const],
    endpoints: { http_protobuf: { url: 'https://example.test/otlp', security: 'tls' as const } },
    authHeaderName: 'Authorization'
  },
  service: { name: 'checkout', namespace: 'shop', environment: 'prod' },
  signals: { metrics: 'supported' as const, logs: 'supported' as const, traces: 'supported' as const },
  components: [],
  secretPlaceholders: {
    authorizationToken: { marker: '${HERTZBEAT_TOKEN}' as const, kind: 'authorization_token' as const }
  },
  blocks: [
    {
      id: 'send',
      type: 'command' as const,
      titleKey: 'instrumentation.v2.block.send_metrics',
      executionLocationKey: 'instrumentation.location.application_host',
      language: 'shell',
      content: 'token=${HERTZBEAT_TOKEN}',
      placeholders: ['authorizationToken' as const]
    }
  ]
};
const detection = {
  schemaVersion: 2 as const,
  detectedAt: 2000,
  context: {
    sourceKind: 'quick_start' as const,
    recipeId: 'opentelemetry_telemetrygen',
    service: guide.service,
    intakeProfileId: 'server-default',
    startedAt: 1000,
    windowEndAt: 2000
  },
  signals: {
    metrics: { status: 'received' as const, lastReceivedAt: 1900 },
    logs: { status: 'waiting' as const, errorCode: 'signal_not_received' },
    traces: { status: 'unsupported' as const, errorCode: 'signal_not_supported' }
  },
  polling: { decision: 'complete' as const, deadlineAt: 3000 },
  queryJumpContext: context,
  queryJumps: [
    { signal: 'metrics' as const, enabled: true, context },
    { signal: 'logs' as const, enabled: false, context },
    { signal: 'traces' as const, enabled: false, context }
  ]
};
