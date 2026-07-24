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
import shellCss from './instrumentation-shell.module.css?raw';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('instrumentation v2 interaction', () => {
  it('presents source choices in backend order and reveals ordered questions only for applications', () => {
    const onSource = vi.fn();
    const onApplicationAnswer = vi.fn();
    const view = render(
      <InstrumentationSourceStep
        catalog={catalog}
        sourceKind="quick_start"
        onSource={onSource}
        onApplicationAnswer={onApplicationAnswer}
      />
    );
    expect(screen.getAllByRole('radio').map(item => item.getAttribute('value'))).toEqual([
      'quick_start',
      'application',
      'existing_opentelemetry'
    ]);
    expect(screen.queryAllByRole('combobox')).toHaveLength(0);
    fireEvent.click(screen.getAllByRole('radio')[1]!);
    expect(onSource).toHaveBeenCalledWith('application');
    view.rerender(
      <InstrumentationSourceStep
        catalog={catalog}
        sourceKind="application"
        onSource={onSource}
        onApplicationAnswer={onApplicationAnswer}
      />
    );
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(screen.queryByText('instrumentation.v2.recipeLabel')).not.toBeInTheDocument();
  });

  it('provides a usable localized application question sequence', async () => {
    render(<ApplicationQuestionHarness />);
    const language = screen.getByRole('combobox', { name: /^instrumentation\.field\.language/ });
    expect(screen.getByText('instrumentation.v2.questionPlaceholder')).toBeVisible();
    expect(shellCss).toMatch(/\.question\s*\{[^}]*display:\s*grid[^}]*width:\s*100%/);
    expect(shellCss).toMatch(/\.questionSelect\s*\{[^}]*width:\s*100%/);
    fireEvent.mouseDown(language);
    fireEvent.click(await screen.findByTitle('java'));

    const framework = await screen.findByRole('combobox', { name: /^instrumentation\.field\.framework/ });
    expect(framework).toBeEnabled();
    fireEvent.mouseDown(framework);
    fireEvent.click(await screen.findByTitle('spring_boot'));
    expect(await screen.findByRole('combobox', { name: /^instrumentation\.field\.method/ })).toBeEnabled();
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

  it('does not render the memory-only token and enables only backend query jumps', () => {
    render(
      <>
        <InstrumentationGuideBlocks
          guide={guide}
          token="valid-token-123"
          onToken={vi.fn()}
          onCopy={vi.fn().mockResolvedValue(undefined)}
          onDetect={vi.fn()}
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
    expect(screen.queryByText('valid-token-123')).not.toBeInTheDocument();
    const openButtons = screen.getAllByRole('button', { name: 'instrumentation.action.openExplore' });
    expect(openButtons.map(button => button.hasAttribute('disabled'))).toEqual([false, true, true]);
    expect(screen.getByText('instrumentation.detection.status.waiting')).toBeInTheDocument();
    expect(screen.getByText('instrumentation.detection.status.unsupported')).toBeInTheDocument();
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
        onToken={vi.fn()}
        onCopy={vi.fn().mockResolvedValue(undefined)}
        onDetect={vi.fn()}
      />
    );
    expect(screen.getByText('instrumentation.v2.versionNotApplicable')).toBeInTheDocument();
    expect(screen.queryByText('common.unavailable')).not.toBeInTheDocument();
  });

  it('handles token validation and clipboard rejection without an unhandled promise', async () => {
    const onCopy = vi.fn().mockRejectedValue(new Error('private token must not surface'));
    render(
      <InstrumentationGuideBlocks
        guide={guide}
        token="invalid token"
        onToken={vi.fn()}
        onCopy={onCopy}
        onDetect={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'instrumentation.action.copy' }));
    await waitFor(() => expect(notifications.warning).toHaveBeenCalledWith('instrumentation.copyFailed'));
    expect(JSON.stringify(notifications.warning.mock.calls)).not.toContain('private token');
  });

  it('shows compact progress and an explicit non-destructive Back action', () => {
    const onBack = vi.fn();
    render(<InstrumentationProgress stage="install" onBack={onBack} />);
    expect(screen.getByText('instrumentation.v2.stage.detect')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.back' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});

function ApplicationQuestionHarness() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  return (
    <InstrumentationSourceStep
      catalog={catalog}
      sourceKind="application"
      {...answers}
      onSource={vi.fn()}
      onApplicationAnswer={(field, value) => setAnswers(current => ({ ...current, [field]: value }))}
    />
  );
}

const catalog = {
  schemaVersion: 2 as const,
  sources: [
    {
      kind: 'quick_start' as const,
      labelKey: 'instrumentation.v2.source.quick_start',
      descriptionKey: 'instrumentation.v2.source.quick_start_description'
    },
    {
      kind: 'application' as const,
      labelKey: 'instrumentation.v2.source.application',
      descriptionKey: 'instrumentation.v2.source.application_description'
    },
    {
      kind: 'existing_opentelemetry' as const,
      labelKey: 'instrumentation.v2.source.existing_opentelemetry',
      descriptionKey: 'instrumentation.v2.source.existing_opentelemetry_description'
    }
  ],
  recipes: [
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
