/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

import { InstrumentationContextStep } from './instrumentation-context-step';
import { InstrumentationDetectionPanel } from './instrumentation-detection-panel';
import { InstrumentationGuideBlocks } from './instrumentation-guide-blocks';
import { InstrumentationProgress } from './instrumentation-progress';
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
      <InstrumentationSourceStep
        catalog={catalog}
        sourceId="quick_start"
        onSource={onSource}
        onApplicationAnswer={onApplicationAnswer}
      />
    );
    expect(screen.getByRole('searchbox')).toBeVisible();
    expect(
      screen.getByRole('button', { name: /instrumentation\.v2\.directory\.group\.applications.*2/ })
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /instrumentation\.v2\.directory\.group\.logs.*2/ }));
    expect(screen.getByRole('button', { name: /^instrumentation\.v2\.directory\.source\.fluent_bit/ })).toBeDisabled();
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
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(screen.queryByText('instrumentation.v2.recipeLabel')).not.toBeInTheDocument();
  });

  it('provides a usable localized application question sequence', async () => {
    render(<ApplicationQuestionHarness />);
    const framework = screen.getByRole('combobox', { name: /^instrumentation\.field\.framework/ });
    expect(screen.getByText('instrumentation.v2.questionPlaceholder')).toBeVisible();
    expect(shellCss).toMatch(/\.question\s*\{[^}]*display:\s*grid[^}]*width:\s*100%/);
    expect(shellCss).toMatch(/\.questionSelect\s*\{[^}]*width:\s*100%/);
    expect(framework).toBeEnabled();
    fireEvent.mouseDown(framework);
    fireEvent.click(await screen.findByTitle('spring_boot'));
    expect(screen.queryByRole('combobox', { name: /^instrumentation\.field\.method/ })).toBeNull();
    expect(screen.getByText(/java · spring_boot · zero_code/)).toBeVisible();
  });

  it('keeps unconfigured and discovery unavailable destinations distinct', () => {
    const props = {
      profileId: '',
      service: { name: '', namespace: '', environment: '' },
      canRender: false,
      rendering: false,
      renderError: false,
      onProfile: vi.fn(),
      onService: vi.fn(),
      onRender: vi.fn()
    };
    const view = render(
      <InstrumentationContextStep profiles={{ schemaVersion: 2, status: 'unconfigured', profiles: [] }} {...props} />
    );
    expect(screen.getByText('instrumentation.v2.profile.unconfigured')).toBeInTheDocument();
    view.rerender(
      <InstrumentationContextStep
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

  it('collects required and optional service identity without exposing an Entity concept', () => {
    render(
      <InstrumentationContextStep
        profiles={{
          schemaVersion: 2,
          status: 'available',
          defaultProfileId: 'server-default',
          profiles: [guide.intakeProfile]
        }}
        profileId="server-default"
        service={{ name: '', namespace: '', environment: '' }}
        canRender={false}
        rendering={false}
        renderError={false}
        onProfile={vi.fn()}
        onService={vi.fn()}
        onRender={vi.fn()}
      />
    );
    expect(screen.getAllByRole('textbox')).toHaveLength(5);
    expect(screen.getByText('instrumentation.field.serviceInstanceId')).toBeVisible();
    expect(screen.getByText('instrumentation.field.endpoint')).toBeVisible();
    expect(screen.queryByText(/entity/i)).toBeNull();
  });

  it('materializes the memory-only token visibly without mutating the backend guide', () => {
    render(
      <>
        <InstrumentationGuideBlocks
          guide={guide}
          token="valid-token-123"
          onCopy={vi.fn().mockResolvedValue(undefined)}
        />
        <InstrumentationDetectionPanel
          response={detection}
          detecting={false}
          error={false}
          onRetry={vi.fn()}
          onOpen={vi.fn()}
        />
      </>
    );
    expect(screen.getByText('token=valid-token-123')).toBeVisible();
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

  it('shows compact progress and an explicit non-destructive Back action', () => {
    const onBack = vi.fn();
    render(<InstrumentationProgress stage="install" onBack={onBack} />);
    expect(screen.getByText('instrumentation.v2.stage.install')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.back' }));
    expect(onBack).toHaveBeenCalledOnce();
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
      environments: ['docker'],
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
    httpsEndpoints: { http_protobuf: 'https://example.test/otlp' },
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
