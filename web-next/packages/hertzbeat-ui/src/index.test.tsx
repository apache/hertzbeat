import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, readOnly, extensions, height, minHeight, basicSetup, theme, onChange, ...props }: any) => (
    <div
      data-testid={props['data-testid']}
      data-mocked-codemirror="true"
      data-readonly={readOnly ? 'true' : 'false'}
      data-height={height}
      data-min-height={minHeight}
      data-basic-setup={basicSetup ? 'true' : 'false'}
      data-theme={theme ? 'custom-dark' : 'missing'}
      data-extension-count={Array.isArray(extensions) ? String(extensions.length) : '0'}
      onClick={() => onChange?.(`${value}\nnext`)}
    >
      {value}
    </div>
  )
}));

vi.mock('@codemirror/lang-yaml', () => ({ yaml: () => 'yaml-extension' }));
vi.mock('@codemirror/lang-json', () => ({ json: () => 'json-extension' }));
vi.mock('@codemirror/lang-html', () => ({ html: () => 'html-extension' }));
vi.mock('@codemirror/lang-javascript', () => ({ javascript: () => 'javascript-extension' }));
vi.mock('@codemirror/view', () => ({
  EditorView: {
    lineWrapping: 'line-wrapping-extension',
    theme: () => 'theme-extension'
  }
}));
vi.mock('@codemirror/state', () => ({
  EditorState: {
    readOnly: {
      of: () => 'readonly-extension'
    }
  }
}));
vi.mock('@codemirror/theme-one-dark', () => ({ oneDark: 'one-dark-theme' }));

import {
  filterHzTemplateCategories,
  hertzBeatUiControlBaseline,
  hertzBeatUiContract,
  hertzBeatUiFoundationGuide,
  hertzBeatUiScrollbarBaseline,
  HzAboutModalSurface,
  HzAiChatModalSurface,
  HzBarGauge,
  HzButton,
  HzButtonIcon,
  HzButtonLink,
  HzCommandPalette,
  HzContextHandoff,
  HzCodeEditor,
  HzCodeEditorFrame,
  HzCollapsibleSection,
  HzBatchToolbar,
  HzConfirmDialog,
  HzDataCellText,
  HzDataCellStack,
  HzDataMetaText,
  HzDataTable,
  HzDetailRows,
  HzDangerConfirm,
  HzDialogEventNotice,
  HzDialogEventText,
  HzDialogMetaItem,
  HzDisabledActionShell,
  HzEmptyState,
  HzExplorerFrame,
  HzExportTypeDialog,
  HzFileInput,
  HzFoundationGuide,
  HzFilterWorkbench,
  HzField,
  HzFieldValueActions,
  HzFilterRail,
  HzInvestigationNotes,
  HzHeaderMenuAction,
  HzLocaleMenuOption,
  HzPassportLoginActionFrame,
  HzPassportLoginNotice,
  HzPassportLoginValidationNotice,
  HzPassportSessionClearFrame,
  HzUserMenuAction,
  HzMetricStrip,
  HzMonitorFavoriteSurface,
  HzMonitorFavoritePane,
  HzMonitorBasicCard,
  HzMonitorBasicSummary,
  HzMonitorFullscreenFrame,
  HzMonitorDetailConsoleShell,
  HzMonitorDetailWorkbenchFrame,
  HzMonitorDetailTabLabel,
  HzMonitorDetailTabs,
  HzMonitorDetailStage,
  HzMonitorDetailTabSequence,
  HzMonitorDetailTabPanel,
  HzMonitorEditorForm,
  HzMonitorEditorHeader,
  HzMonitorEditorActionBar,
  HzMonitorEditorFieldGrid,
  HzMonitorEditorSection,
  HzMonitorControlBand,
  HzMonitorEvidenceFrame,
  HzMonitorBreadcrumb,
  HzMonitorRealtimeInspector,
  HzMonitorRowNavigator,
  HzMonitorRealtimeRowNavigator,
  HzMonitorRealtimeToolbar,
  HzMutationBar,
  HzMonitorMetricCard,
  HzMonitorMetricCardGrid,
  HzMonitorMetricFavoriteAction,
  HzMonitorIncrementalLoadFooter,
  HzMonitorDetailSignalList,
  HzMonitorSignalBars,
  HzMonitorStatGrid,
  HzNumberStepper,
  HzInlineFeedback,
  HzLabelTag,
  HzLoadingState,
  HzQueryBar,
  HzQueryActionGroup,
  HzQueryHistory,
  HzQueryStatusSelect,
  HzQueryTokenField,
  HzRadioButtonGroup,
  HzFieldInsights,
  HzActionGroup,
  HzActionWorkbench,
  HzAttributeDiagnostics,
  HzAssistiveMarker,
  HzInlineContextMark,
  HzIconButton,
  HzHeaderIconButton,
  HzHeaderRealtimeNotice,
  HzIconLink,
  HzPassportLockSurface,
  HzIncidentWorkbench,
  HzResultControls,
  HzSavedViewCompare,
  HzScrollViewport,
  HzLogStreamLiveRow,
  HzDetailAside,
  HzDetailBodyStack,
  HzChartSurface,
  HzCheckbox,
  HzSwitch,
  HzChipGroup,
  HzControlStack,
  HzDialogBodyLayout,
  HzSignalSummaryStrip,
  HzSignalWorkbenchShell,
  HzSearchFieldFrame,
  HzSearchFieldIcon,
  HzWorkbenchHeaderCopy,
  HzWorkbenchLayout,
  HzUnderlineToggle,
  HzStateNotice,
  HzStatCell,
  HzStatStrip,
  HzHeatmapChart,
  HzInspectorDrawer,
  HzInput,
  HzConfigurableFieldEditor,
  HzKeyValueEditor,
  HzLogLevelDistribution,
  HzLogStream,
  HzLogVolumeChart,
  HzSegmentedTabs,
  HzSignalTrendBars,
  HzMonitorFilterBar,
  HzMonitorRefreshToolbar,
  HzMonitorHistoryChartCard,
  HzMonitorHistoryChartGrid,
  HzMetricTimeSeriesPanel,
  HzEChartsPanel,
  HzPaginationBar,
  HzSelectableRows,
  HzSelect,
  HzStatusBadge,
  HzTableRowActionButton,
  HzTemplatePicker,
  HzThresholdRail,
  HzExpressionTimeRangePicker,
  HzTimeRangePreviewHandoff,
  HzTimeRangeToolbar,
  HzTimeDistributionChart,
  HzTimeSeriesChart,
  HzTextarea,
  HzStatusIncidentHistory,
  HzStatusTimeline,
  HzTraceEventTimeline,
  HzServiceDependencyGraph,
  HzTopologyWorkbenchFrame,
  HzTopologyWorkbenchHeader,
  HzTopologyWorkbenchGrid,
  HzTopologyWorkbenchSlot,
  HzTopologyCanvas,
  HzTopologyCanvasAnnotation,
  HzTopologyGraphLayer,
  HzTopologyFocusTrail,
  HzTopologyGroupPanel,
  HzTopologyPathSummary,
  HzTopologyScopeBar,
  HzTopologyToolbar,
  HzTopologyCompanionRail,
  HzTopologyCompanionSection,
  HzTopologyCompanionJumpList,
  HzTopologyEmptyState,
  HzTopologyLoadingState,
  HzTopologyMetricTable,
  HzTopologyNode,
  HzTopologyEdge,
  HzTopologyLegend,
  HzTopologyDetailDrawer,
  HzTopologyEvidenceList,
  HzTopologyHoverTooltip,
  HzTopologyFilterStrip,
  HzTopologySectionLabel,
  HzTopologyActionLink,
  HzTraceDetailDrawer,
  HzTraceList,
  HzTraceWaterfall,
  HzTraceLatencyDistribution,
  HzTraceSpanTable,
  HzToastStack,
  HzTypePickerDialog,
  HzPanelHeader,
  HzPanelSection,
  HzPanelTitleLabel,
  HzPanelSurface,
  HzTrendBar,
  HzTrendFrame,
  HzWorkbenchSurface,
  HzYamlWorkspace,
  resolveHzSelectMenuPlacement,
  type HzTemplateCategory
} from './index';

function textFromCodePoints(...codePoints: number[]) {
  return String.fromCodePoint(...codePoints);
}

const localizedFixtures = {
  dbMonitor: textFromCodePoints(0x6570, 0x636e, 0x5e93, 0x76d1, 0x63a7),
  osMonitor: textFromCodePoints(0x64cd, 0x4f5c, 0x7cfb, 0x7edf, 0x76d1, 0x63a7),
  normalStatus: textFromCodePoints(0x6b63, 0x5e38),
  newMonitor: textFromCodePoints(0x65b0, 0x589e, 0x76d1, 0x63a7),
  chooseExportType: textFromCodePoints(0x9009, 0x62e9, 0x5bfc, 0x51fa, 0x7c7b, 0x578b),
  chooseTemplateByResource: textFromCodePoints(0x6309, 0x8d44, 0x6e90, 0x7c7b, 0x578b, 0x9009, 0x62e9, 0x6a21, 0x677f),
  close: textFromCodePoints(0x5173, 0x95ed),
  catalogTitle: textFromCodePoints(0x7c7b, 0x578b, 0x76ee, 0x5f55),
  itemUnit: textFromCodePoints(0x9879),
  searchVisibleName: textFromCodePoints(0x641c, 0x7d22, 0x53ef, 0x89c1, 0x540d, 0x79f0),
  noMatches: textFromCodePoints(0x6ca1, 0x6709, 0x5339, 0x914d, 0x9879),
  newTemplateDraft: textFromCodePoints(0x65b0, 0x589e, 0x6a21, 0x677f, 0x8349, 0x7a3f),
  definition: textFromCodePoints(0x5b9a, 0x4e49),
  search: textFromCodePoints(0x641c, 0x7d22),
  noTemplateMatches: textFromCodePoints(0x6ca1, 0x6709, 0x5339, 0x914d, 0x7684, 0x6a21, 0x677f)
};

function localizedItemCount(total: number) {
  return `${total} ${localizedFixtures.itemUnit}`;
}

const categories: HzTemplateCategory[] = [
  {
    id: 'db',
    label: localizedFixtures.dbMonitor,
    items: [
      { id: 'mysql', label: 'MySQL', description: 'JDBC + availability', meta: 'yml' },
      { id: 'postgresql', label: 'PostgreSQL', description: 'JDBC + connections', meta: 'yml' }
    ]
  },
  {
    id: 'os',
    label: localizedFixtures.osMonitor,
    items: [
      { id: 'linux', label: 'Linux', description: 'SSH + process', meta: 'yml' }
    ]
  }
];

afterEach(() => {
  vi.useRealTimers();
});

describe('@hertzbeat/ui', () => {
  it('declares the native operator UI contract instead of a card-grid visual owner', () => {
    expect(hertzBeatUiContract.packageName).toBe('@hertzbeat/ui');
    expect(hertzBeatUiContract.visualOwner).toBe('hertzbeat-native-operator-ui');
    expect(hertzBeatUiContract.antiPattern).toBe('marketing-card-grid');
  });

  it('documents foundation tokens, forbidden patterns, component usage, and stop criteria as code-owned guidance', () => {
    expect(hertzBeatUiFoundationGuide.foundationStatus).toBe('ready');
    expect(hertzBeatUiFoundationGuide.tokenGroups.flatMap(group => group.tokens)).toEqual(
      expect.arrayContaining([
        '--hz-ui-canvas',
        '--hz-ui-surface',
        '--hz-ui-line-soft',
        '--hz-ui-line-faint',
        '--hz-ui-accent',
        '--hz-ui-scrollbar-size',
        '--hz-ui-scrollbar-thumb',
        '--hz-ui-scrollbar-thumb-hover'
      ])
    );
    expect(hertzBeatUiFoundationGuide.forbiddenPatterns.map(pattern => pattern.id)).toEqual(
      expect.arrayContaining(['nested-card-shells', 'marketing-card-grid', 'oversized-rounded-panels', 'gradient-orb-backgrounds'])
    );
    expect(hertzBeatUiFoundationGuide.componentUsage.map(item => item.component)).toEqual(
      expect.arrayContaining(['HzExplorerFrame', 'HzFilterWorkbench', 'HzMonitorFilterBar', 'HzMonitorDetailTabs', 'HzMonitorDetailTabSequence', 'HzMonitorDetailTabPanel', 'HzMonitorRefreshToolbar', 'HzMonitorRealtimeToolbar', 'HzMonitorRealtimeInspector', 'HzMonitorRowNavigator', 'HzMonitorRealtimeRowNavigator', 'HzMonitorEditorHeader', 'HzMonitorEditorActionBar', 'HzMonitorEditorFieldGrid', 'HzTraceWaterfall', 'HzTopologyWorkbenchFrame', 'HzTopologyWorkbenchHeader', 'HzTopologyWorkbenchGrid', 'HzTopologyWorkbenchSlot', 'HzTopologyCanvas', 'HzTopologyCanvasAnnotation', 'HzTopologyGraphLayer', 'HzTopologyFocusTrail', 'HzTopologyGroupPanel', 'HzTopologyPathSummary', 'HzTopologyScopeBar', 'HzTopologyToolbar', 'HzTopologyCompanionRail', 'HzTopologyCompanionSection', 'HzTopologyCompanionJumpList', 'HzTopologyEmptyState', 'HzTopologyLoadingState', 'HzTopologyMetricTable', 'HzTopologyNode', 'HzTopologyEdge', 'HzTopologyHoverTooltip', 'HzTopologyLegend', 'HzTopologyDetailDrawer', 'HzTopologyEvidenceList', 'HzTopologyFilterStrip', 'HzTopologyActionLink', 'HzMetricTimeSeriesPanel', 'HzActionWorkbench', 'HzMutationBar', 'HzYamlWorkspace'])
    );
    expect(hertzBeatUiFoundationGuide.stopCriteria).toHaveLength(5);

    const html = renderToStaticMarkup(<HzFoundationGuide />);

    expect(html).toContain('data-hz-ui="foundation-guide"');
    expect(html).toContain('data-hz-foundation-status="ready"');
    expect(html).toContain('data-hz-foundation-section="tokens"');
    expect(html).toContain('--hz-ui-canvas');
    expect(html).toContain('data-hz-foundation-section="forbidden-patterns"');
    expect(html).toContain('nested-card-shells');
    expect(html).toContain('data-hz-foundation-section="component-usage"');
    expect(html).toContain('HzTraceWaterfall');
    expect(html).toContain('data-hz-foundation-section="stop-criteria"');
    expect(html).toContain('M5 guide readiness');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('declares a compact dark scrollbar baseline for shared scroll surfaces', () => {
    expect(hertzBeatUiScrollbarBaseline.owner).toBe('hertzbeat-ui-scrollbar');
    expect(hertzBeatUiScrollbarBaseline.className).toBe('hb-scrollbar');
    expect(hertzBeatUiScrollbarBaseline.widthPx).toBeLessThanOrEqual(7);
    expect(hertzBeatUiScrollbarBaseline.thumbTone).toBe('dark-neutral');
    expect(hertzBeatUiScrollbarBaseline.webKitThumbBorderPx).toBe(1);

    const html = renderToStaticMarkup(
      <HzScrollViewport variant="log-stream" data-log-manage-stream-viewport-owner="hertzbeat-ui-scroll-viewport">
        Logs
      </HzScrollViewport>
    );

    expect(html).toContain('data-hz-ui="scroll-viewport"');
    expect(html).toContain('data-hz-scroll-viewport-owner="hertzbeat-ui-scroll-viewport"');
    expect(html).toContain('data-hz-scroll-viewport-variant="log-stream"');
    expect(html).toContain('data-log-manage-stream-viewport-owner="hertzbeat-ui-scroll-viewport"');
    expect(html).toContain('class="hb-scrollbar max-h-[620px] overflow-auto"');
  });

  it('owns compact live log stream row chrome for virtualized rows', () => {
    const html = renderToStaticMarkup(
      <HzLogStreamLiveRow selected data-log-manage-stream-row-owner="hertzbeat-ui-log-stream-row">
        <span>ERROR</span>
        <span>21:24:16</span>
        <span>checkout timeout</span>
      </HzLogStreamLiveRow>
    );

    expect(html).toContain('data-hz-ui="log-stream-live-row"');
    expect(html).toContain('data-hz-log-stream-row-owner="hertzbeat-ui-log-stream-row"');
    expect(html).toContain('data-hz-log-stream-row-variant="compact-live-row"');
    expect(html).toContain('data-hz-log-stream-row-selected="true"');
    expect(html).toContain('data-log-manage-stream-row-owner="hertzbeat-ui-log-stream-row"');
    expect(html).toContain('grid w-full grid-cols-[58px_minmax(0,112px)_minmax(0,1fr)]');
    expect(html).toContain('hover:bg-[#10141b]');
    expect(html).toContain('bg-[#111927]');
  });

  it('owns signal detail aside chrome for selected detail rails', () => {
    const html = renderToStaticMarkup(
      <HzDetailAside data-log-manage-stream-selected-aside-owner="hertzbeat-ui-detail-aside">
        Selected detail
      </HzDetailAside>
    );

    expect(html).toContain('data-hz-ui="detail-aside"');
    expect(html).toContain('data-hz-detail-aside-owner="hertzbeat-ui-detail-aside"');
    expect(html).toContain('data-hz-detail-aside-variant="signal-detail-rail"');
    expect(html).toContain('data-log-manage-stream-selected-aside-owner="hertzbeat-ui-detail-aside"');
    expect(html).toContain('class="border-l border-[#252b35] bg-[#0b0e13] px-4 py-4"');
  });

  it('owns selected detail body stack spacing', () => {
    const html = renderToStaticMarkup(
      <HzDetailBodyStack data-log-manage-stream-selected-body-owner="hertzbeat-ui-detail-body-stack">
        Selected facts
      </HzDetailBodyStack>
    );

    expect(html).toContain('data-hz-ui="detail-body-stack"');
    expect(html).toContain('data-hz-detail-body-stack-owner="hertzbeat-ui-detail-body-stack"');
    expect(html).toContain('data-hz-detail-body-stack-variant="selected-detail"');
    expect(html).toContain('data-log-manage-stream-selected-body-owner="hertzbeat-ui-detail-body-stack"');
    expect(html).toContain('class="mt-4 space-y-2"');
  });

  it('owns compact workbench header copy typography', () => {
    const html = renderToStaticMarkup(
      <HzWorkbenchHeaderCopy
        eyebrow="Observability"
        title="Trace workbench"
        copy="Investigate services, spans, and entity handoffs."
        data-trace-manage-header-copy-owner="hertzbeat-ui-workbench-header-copy"
      />
    );

    expect(html).toContain('data-hz-ui="workbench-header-copy"');
    expect(html).toContain('data-hz-workbench-header-copy-owner="hertzbeat-ui-workbench-header-copy"');
    expect(html).toContain('data-hz-workbench-header-copy-density="standard"');
    expect(html).toContain('data-trace-manage-header-copy-owner="hertzbeat-ui-workbench-header-copy"');
    expect(html).toContain('data-hz-workbench-header-copy-eyebrow="true"');
    expect(html).toContain('data-hz-workbench-header-copy-title="true"');
    expect(html).toContain('data-hz-workbench-header-copy-body="true"');
    expect(html).toContain('class="min-w-0"');
    expect(html).toContain('font-semibold tracking-normal text-[#f4f7fb] text-[30px]');
    expect(html).toContain('mt-3 max-w-[820px] text-[13px] leading-6 text-[#9ca7ba]');
  });

  it('owns compact workbench header copy typography', () => {
    const html = renderToStaticMarkup(
      <HzWorkbenchHeaderCopy
        density="compact"
        eyebrow="Metrics workbench"
        title="OTLP metrics"
        data-otlp-metrics-header-copy-owner="hertzbeat-ui-workbench-header-copy"
      />
    );

    expect(html).toContain('data-hz-ui="workbench-header-copy"');
    expect(html).toContain('data-hz-workbench-header-copy-owner="hertzbeat-ui-workbench-header-copy"');
    expect(html).toContain('data-hz-workbench-header-copy-density="compact"');
    expect(html).toContain('data-otlp-metrics-header-copy-owner="hertzbeat-ui-workbench-header-copy"');
    expect(html).toContain('data-hz-workbench-header-copy-eyebrow="true"');
    expect(html).toContain('data-hz-workbench-header-copy-title="true"');
    expect(html).toContain('font-semibold tracking-normal text-[#f4f7fb] text-[26px]');
    expect(html).not.toContain('font-semibold tracking-normal text-[#f4f7fb] text-[30px]');
  });

  it('owns the AI chat modal shell used by the global app frame', () => {
    const html = renderToStaticMarkup(
      <HzAiChatModalSurface
        title="AI assistant"
        subtitle="Operator chat"
        conversationsTitle="Conversations"
        newChatLabel="New chat"
        newChatStatus="idle"
        deleteLabel="Delete conversation"
        deleteConfirmLabel="Delete"
        deleteCancelLabel="Cancel"
        deleteStatus="confirming"
        deleteConversationId={2}
        welcomeTitle="How can I help?"
        welcomeDescription="Ask about monitors, alerts, logs, traces, and platform configuration."
        inputPlaceholder="Ask assistant"
        inputValue="Summarize checkout errors"
        inputHint="Streaming response proof is handled by the route integration."
        closeLabel="Close dialog"
        sendLabel="Send prompt"
        sendStatus="sending"
        streamingLabel="Typing..."
        configOpen
        configTitle="AI Provider Configuration"
        configDescription="Configure the provider used by the AI assistant."
        configStatus="ready"
        configStatusLabel="Provider configuration loaded from /config/provider"
        configTriggerLabel="Modify API key"
        configProviderLabel="AI Provider"
        configProviderHelp="Choose your AI provider (OpenAI, ZhiPu, or ZAI)"
        configApiKeyLabel="API Key"
        configApiKeyHelp="Your Provider API key. The key will be validated when saved."
        configBaseUrlLabel="Base URL"
        configBaseUrlHelp="Custom API endpoint URL. Leave empty to use default for selected provider."
        configModelLabel="Model"
        configModelHelp="Model name to use. Leave empty to use default for selected provider."
        configResetLabel="Reset to default values"
        configSaveLabel="Save"
        configCancelLabel="Cancel"
        configProviderOptions={[
          { value: 'openai', label: 'OpenAI', defaultBaseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4' },
          { value: 'zai', label: 'ZAI', defaultBaseUrl: 'https://api.z.ai/api/paas/v4', defaultModel: 'glm-4.6' },
          { value: 'zhipu', label: 'ZhiPu', defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4', defaultModel: 'glm-4.6' }
        ]}
        configValue={{
          code: 'openai',
          apiKey: 'sk-test',
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4'
        }}
        scheduleOpen
        scheduleStatus="ready"
        scheduleStatusLabel="Schedules loaded from /ai/schedule/conversation/1"
        scheduleTriggerLabel="Schedule"
        scheduleTitle="Schedule Configuration"
        scheduleConfiguredTitle="Configured Schedules"
        scheduleCreateTitle="Create Schedule"
        scheduleAddTitle="Add New Task"
        scheduleSkillLabel="Skill"
        scheduleSkillSelectLabel="Select Skill"
        scheduleSkillPlaceholder="Select skill to execute"
        scheduleCronLabel="Execution Time (Cron Expression)"
        scheduleCronHelp="Format: seconds minutes hours day month week"
        scheduleCronCommonLabel="Common: daily 9am"
        scheduleCronMondayLabel="Monday 9am"
        scheduleStatusColumnLabel="Status"
        scheduleActionLabel="Action"
        scheduleEditLabel="Edit"
        scheduleDeleteLabel="Delete"
        scheduleDeleteConfirmLabel="Delete"
        scheduleDeleteCancelLabel="Cancel"
        scheduleDeleteStatus="confirming"
        scheduleDeleteScheduleId={11}
        scheduleSaveLabel="Save"
        scheduleCancelLabel="Cancel"
        scheduleCreateLabel="Create Schedule"
        scheduleRows={[
          { id: 11, sopName: 'daily-health', cronExpression: '0 0 9 * * ?', enabled: true },
          { id: 12, sopName: 'weekly-report', cronExpression: '0 0 9 ? * MON', enabled: false }
        ]}
        scheduleSkills={[
          { value: 'daily-health', label: 'daily-health - Daily health report' },
          { value: 'weekly-report', label: 'weekly-report - Weekly report' }
        ]}
        scheduleDraft={{ sopName: 'daily-health', cronExpression: '0 0 9 * * ?', enabled: true }}
        scheduleEditDraft={{ id: 12, sopName: 'weekly-report', cronExpression: '0 0 9 ? * MON', enabled: false }}
        initialMessageLabel="Initial request"
        initialMessage="Show unhealthy monitors"
        previewMessages={[
          { role: 'assistant', label: 'Assistant', content: 'I can inspect current signals.' }
        ]}
        conversationMessages={[
          { role: 'user', label: 'User', content: 'What happened to checkout?' },
          { role: 'assistant', label: 'Assistant', content: 'The conversation history loaded from the selected thread.' },
          { role: 'assistant', label: 'Assistant', content: '' }
        ]}
        messageStatus="ready"
        messageStatusLabel="Loaded selected conversation history"
        conversationStatus="ready"
        conversationStatusLabel="Loaded 2 conversations"
        conversations={[
          { id: 1, title: 'Investigate checkout errors', subtitle: 'Updated just now', active: true },
          { id: 2, title: 'Collector health review', subtitle: '2 hours ago' }
        ]}
        data-app-frame-ai-chat-owner="hertzbeat-ui-ai-chat-modal"
        onConversationDeleteRequest={() => {}}
        onConversationDeleteCancel={() => {}}
        onConversationDeleteConfirm={() => {}}
        onInputChange={() => {}}
        onSendMessage={() => {}}
        onConfigOpen={() => {}}
        onConfigClose={() => {}}
        onConfigSave={() => {}}
        onConfigResetDefaults={() => {}}
        onConfigChange={() => {}}
        onScheduleOpen={() => {}}
        onScheduleClose={() => {}}
        onScheduleDraftChange={() => {}}
        onScheduleCreate={() => {}}
        onScheduleToggle={() => {}}
        onScheduleEditStart={() => {}}
        onScheduleEditCancel={() => {}}
        onScheduleEditChange={() => {}}
        onScheduleUpdate={() => {}}
        onScheduleDeleteRequest={() => {}}
        onScheduleDeleteCancel={() => {}}
        onScheduleDeleteConfirm={() => {}}
      />
    );

    expect(html).toContain('data-hz-ui="ai-chat-modal-surface"');
    expect(html).toContain('data-hz-ai-chat-owner="hertzbeat-ui-ai-chat-modal"');
    expect(html).toContain('data-hz-ai-chat-density="operator-compact"');
    expect(html).toContain('data-hz-ai-chat-style="angular-modal-parity"');
    expect(html).toContain('data-hz-ai-chat-initial-message-contract="angular-open-modal-initial-message"');
    expect(html).toContain('data-hz-ai-chat-config-save-lifecycle="angular-validate-save-close-refresh"');
    expect(html).toContain('data-hz-ai-chat-conversation-action-lifecycle="angular-create-select-delete-fallback"');
    expect(html).toContain('data-hz-ai-chat-schedule-action-lifecycle="angular-load-create-toggle-revert-confirm-update-delete"');
    expect(html).toContain('data-hz-ai-chat-stream-history-lifecycle="angular-push-user-placeholder-sse-skill-report-refresh"');
    expect(html).toContain('data-app-frame-ai-chat-owner="hertzbeat-ui-ai-chat-modal"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('data-hz-ai-chat-sidebar="conversation-list"');
    expect(html).toContain('data-hz-ai-chat-new-chat="shared"');
    expect(html).toContain('data-hz-ai-chat-new-chat-status="idle"');
    expect(html).toContain('data-hz-ai-chat-conversation-status="ready"');
    expect(html).toContain('data-hz-ai-chat-conversation-count="2"');
    expect(html).toContain('data-hz-ai-chat-conversation-action-lifecycle="angular-create-select-delete-fallback"');
    expect(html).toContain('data-hz-ai-chat-conversation-row="shared"');
    expect(html).toContain('data-hz-ai-chat-conversation-active="true"');
    expect(html).toContain('data-hz-ai-chat-conversation-select="shared"');
    expect(html).toContain('data-hz-ai-chat-conversation-delete="shared"');
    expect(html).toContain('data-hz-ai-chat-conversation-delete-confirm="shared"');
    expect(html).toContain('data-hz-ai-chat-conversation-delete-submit="shared"');
    expect(html).toContain('data-hz-ai-chat-conversation-delete-status="confirming"');
    expect(html).toContain('Investigate checkout errors');
    expect(html).toContain('Collector health review');
    expect(html).toContain('data-hz-ai-chat-main="message-flow"');
    expect(html).toContain('data-hz-ai-chat-message-status="ready"');
    expect(html).toContain('data-hz-ai-chat-message-count="3"');
    expect(html).toContain('data-hz-ai-chat-stream-history-lifecycle="angular-push-user-placeholder-sse-skill-report-refresh"');
    expect(html).toContain('data-hz-ai-chat-message-row="shared"');
    expect(html).toContain('What happened to checkout?');
    expect(html).toContain('The conversation history loaded from the selected thread.');
    expect(html).toContain('data-hz-ai-chat-welcome="shared"');
    expect(html).toContain('data-hz-ai-chat-initial-message="true"');
    expect(html).toContain('data-hz-ai-chat-initial-message-source="angular-open-modal"');
    expect(html).toContain('Show unhealthy monitors');
    expect(html).toContain('data-hz-ai-chat-preview-message="assistant"');
    expect(html).toContain('data-hz-ai-chat-input-shell="shared"');
    expect(html).toContain('data-hz-ai-chat-input-mode="editable"');
    expect(html).toContain('data-hz-ai-chat-send-lifecycle="angular-push-user-placeholder-sse"');
    expect(html).toContain('data-hz-ai-chat-input="shared"');
    expect(html).toContain('data-hz-ai-chat-send="shared"');
    expect(html).toContain('data-hz-ai-chat-streaming-indicator="shared"');
    expect(html).toContain('data-hz-ai-chat-streaming-status="typing"');
    expect(html).toContain('Typing...');
    expect(html).toContain('data-hz-ai-chat-send-status="sending"');
    expect(html).toContain('data-hz-ai-chat-config-open="shared"');
    expect(html).toContain('data-hz-ai-chat-config-panel="shared"');
    expect(html).toContain('data-hz-ai-chat-config-owner="hertzbeat-ui-ai-chat-config"');
    expect(html).toContain('data-hz-ai-chat-config-status="ready"');
    expect(html).toContain('data-hz-ai-chat-config-required-fields="api-key-provider-base-url-model"');
    expect(html).toContain('data-hz-ai-chat-config-status-label="shared"');
    expect(html).toContain('data-hz-ai-chat-config-provider="shared"');
    expect(html).toContain('data-hz-ai-chat-config-api-key="shared"');
    expect(html).toContain('data-hz-ai-chat-config-base-url="shared"');
    expect(html).toContain('data-hz-ai-chat-config-model="shared"');
    expect(html).toContain('data-hz-ai-chat-config-reset="shared"');
    expect(html).toContain('data-hz-ai-chat-config-save="shared"');
    expect(html).toContain('AI Provider Configuration');
    expect(html).toContain('OpenAI');
    expect(html).toContain('ZhiPu');
    expect(html).toContain('value="https://api.openai.com/v1"');
    expect(html).toContain('value="gpt-4"');
    expect(html).toContain('data-hz-ai-chat-schedule-open="shared"');
    expect(html).toContain('data-hz-ai-chat-schedule-panel="shared"');
    expect(html).toContain('data-hz-ai-chat-schedule-owner="hertzbeat-ui-ai-chat-schedule"');
    expect(html).toContain('data-hz-ai-chat-schedule-status="ready"');
    expect(html).toContain('data-hz-ai-chat-schedule-action-lifecycle="angular-load-create-toggle-revert-confirm-update-delete"');
    expect(html).toContain('data-hz-ai-chat-schedule-required-fields="sop-name-cron-expression"');
    expect(html).toContain('data-hz-ai-chat-schedule-list="shared"');
    expect(html).toContain('data-hz-ai-chat-schedule-count="2"');
    expect(html).toContain('data-hz-ai-chat-schedule-row="shared"');
    expect(html).toContain('data-hz-ai-chat-schedule-toggle="shared"');
    expect(html).toContain('data-hz-ai-chat-schedule-edit="shared"');
    expect(html).toContain('data-hz-ai-chat-schedule-delete="shared"');
    expect(html).toContain('data-hz-ai-chat-schedule-delete-status="confirming"');
    expect(html).toContain('data-hz-ai-chat-schedule-delete-confirm="shared"');
    expect(html).toContain('data-hz-ai-chat-schedule-delete-cancel="shared"');
    expect(html).toContain('data-hz-ai-chat-schedule-delete-submit="shared"');
    expect(html).toContain('data-hz-ai-chat-schedule-edit-form="shared"');
    expect(html).toContain('data-hz-ai-chat-schedule-create-form="shared"');
    expect(html).toContain('data-hz-ai-chat-schedule-skill="shared"');
    expect(html).toContain('data-hz-ai-chat-schedule-cron="shared"');
    expect(html).toContain('data-hz-ai-chat-schedule-create="shared"');
    expect(html).toContain('daily-health');
    expect(html).toContain('weekly-report');
    expect(html).toContain('0 0 9 ? * MON');
    expect(html).toContain('value="Summarize checkout errors"');
    expect(html).toContain('aria-label="Send prompt"');
    expect(html).toContain('h-[80vh] w-[min(90vw,1180px)]');
  });

  it('owns signal workbench shell and content width', () => {
    const html = renderToStaticMarkup(
      <HzSignalWorkbenchShell data-trace-manage-shell-owner="hertzbeat-ui-signal-workbench-shell">
        Workbench
      </HzSignalWorkbenchShell>
    );

    expect(html).toContain('data-hz-ui="signal-workbench-shell"');
    expect(html).toContain('data-hz-signal-workbench-shell-owner="hertzbeat-ui-signal-workbench-shell"');
    expect(html).toContain('data-hz-signal-workbench-shell-layout="default"');
    expect(html).toContain('data-trace-manage-shell-owner="hertzbeat-ui-signal-workbench-shell"');
    expect(html).toContain('data-hz-signal-workbench-shell-content="true"');
    expect(html).toContain('data-hz-signal-workbench-shell-content-owner="hertzbeat-ui-signal-workbench-shell"');
    expect(html).toContain('data-hz-signal-workbench-shell-content-layout="default"');
    expect(html).toContain('class="min-h-[calc(100vh-56px)] bg-[#07090b] text-[#e8edf5]"');
    expect(html).toContain('class="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-6 py-6"');
  });

  it('owns the metrics workbench shell direct panel stack', () => {
    const html = renderToStaticMarkup(
      <HzSignalWorkbenchShell
        layout="metrics-workbench"
        data-otlp-metrics-shell-owner="hertzbeat-ui-signal-workbench-shell"
      >
        Metrics workbench
      </HzSignalWorkbenchShell>
    );

    expect(html).toContain('data-hz-ui="signal-workbench-shell"');
    expect(html).toContain('data-hz-signal-workbench-shell-owner="hertzbeat-ui-signal-workbench-shell"');
    expect(html).toContain('data-hz-signal-workbench-shell-layout="metrics-workbench"');
    expect(html).toContain('data-otlp-metrics-shell-owner="hertzbeat-ui-signal-workbench-shell"');
    expect(html).toContain('data-hz-signal-workbench-shell-content="true"');
    expect(html).toContain('data-hz-signal-workbench-shell-content-owner="hertzbeat-ui-signal-workbench-shell"');
    expect(html).toContain('data-hz-signal-workbench-shell-content-layout="metrics-workbench"');
    expect(html).toContain('class="min-h-[calc(100vh-56px)] bg-[#07090b] text-[#e8edf5] flex flex-col gap-3 px-3 pb-3 pt-0"');
    expect(html).toContain('class="contents"');
  });

  it('owns the topology-like signal workbench chrome without nested card shells', () => {
    const html = renderToStaticMarkup(
      <HzSignalWorkbenchShell
        layout="topology-workbench"
        data-log-manage-shell-owner="hertzbeat-ui-signal-workbench-shell"
      >
        <HzPanelSurface>Signal workbench</HzPanelSurface>
      </HzSignalWorkbenchShell>
    );

    expect(html).toContain('data-hz-signal-workbench-shell-layout="topology-workbench"');
    expect(html).toContain('data-hz-signal-workbench-shell-content-layout="topology-workbench"');
    expect(html).toContain('data-log-manage-shell-owner="hertzbeat-ui-signal-workbench-shell"');
    expect(html).toContain('[&amp;_[data-hz-ui=panel-surface]]:rounded-none');
    expect(html).toContain('[&amp;_[data-hz-ui=panel-surface]]:shadow-none');
    expect(html).toContain('class="flex w-full min-w-0 flex-col gap-0 px-4 pb-4 pt-3 xl:px-5"');
    expect(html).not.toContain('max-w-[1600px]');
  });

  it('owns search field icon frame for query controls', () => {
    const TestIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />;
    const html = renderToStaticMarkup(
      <HzSearchFieldFrame
        width="metrics-query"
        icon={<HzSearchFieldIcon icon={TestIcon} data-trace-manage-query-search-icon="service" data-trace-manage-query-search-icon-owner="hertzbeat-ui-search-field-icon" />}
        data-trace-manage-query-search-frame-owner="hertzbeat-ui-search-field-frame"
      >
        <HzInput inset="search-icon" aria-label="Service" />
      </HzSearchFieldFrame>
    );

    expect(html).toContain('data-hz-ui="search-field-frame"');
    expect(html).toContain('data-hz-search-field-frame-owner="hertzbeat-ui-search-field-frame"');
    expect(html).toContain('data-hz-search-field-frame-width="metrics-query"');
    expect(html).toContain('data-trace-manage-query-search-frame-owner="hertzbeat-ui-search-field-frame"');
    expect(html).toContain('data-hz-search-field-frame-icon="true"');
    expect(html).toContain('data-hz-ui="search-field-icon"');
    expect(html).toContain('data-hz-search-field-icon-owner="hertzbeat-ui-search-field-icon"');
    expect(html).toContain('data-hz-search-field-icon-size="md"');
    expect(html).toContain('data-trace-manage-query-search-icon-owner="hertzbeat-ui-search-field-icon"');
    expect(html).toContain('data-hz-ui="input"');
    expect(html).toContain('data-hz-input-inset="search-icon"');
    expect(html).toContain('class="relative min-w-[320px] max-w-[560px] flex-1"');
    expect(html).toContain('pointer-events-none absolute left-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-[#7d8798]');
    expect(html).toContain('pl-9');

    const logHtml = renderToStaticMarkup(
      <HzSearchFieldFrame
        width="log-query"
        icon={<HzSearchFieldIcon icon={TestIcon} data-log-manage-query-search-icon="service" data-log-manage-query-search-icon-owner="hertzbeat-ui-search-field-icon" />}
        data-log-manage-query-search-frame-owner="hertzbeat-ui-search-field-frame"
      >
        <HzInput inset="search-icon" width="log-query-expression" aria-label="Log search" />
      </HzSearchFieldFrame>
    );

    expect(logHtml).toContain('data-hz-search-field-frame-width="log-query"');
    expect(logHtml).toContain('data-log-manage-query-search-frame-owner="hertzbeat-ui-search-field-frame"');
    expect(logHtml).toContain('data-log-manage-query-search-icon-owner="hertzbeat-ui-search-field-icon"');
    expect(logHtml).toContain('data-hz-input-width="log-query-expression"');
    expect(logHtml).toContain('class="relative min-w-[320px] max-w-[560px] flex-1"');
    expect(logHtml).toContain('w-full font-mono');
  });

  it('owns button icon sizing for query actions', () => {
    const TestIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />;
    const html = renderToStaticMarkup(
      <HzButton data-trace-manage-search-action="true" intent="primary" size="md">
        <HzButtonIcon icon={TestIcon} data-trace-manage-query-action-icon="run" data-trace-manage-query-action-icon-owner="hertzbeat-ui-button-icon" />
        Run
      </HzButton>
    );

    expect(html).toContain('data-hz-ui="button-icon"');
    expect(html).toContain('data-hz-button-icon-owner="hertzbeat-ui-button-icon"');
    expect(html).toContain('data-hz-button-icon-size="md"');
    expect(html).toContain('data-trace-manage-query-action-icon="run"');
    expect(html).toContain('data-trace-manage-query-action-icon-owner="hertzbeat-ui-button-icon"');
    expect(html).toContain('h-4 w-4');
  });

  it('owns monospace query token field widths for trace controls', () => {
    const html = renderToStaticMarkup(
      <HzQueryTokenField
        width="trace-id"
        aria-label="Trace ID"
        fieldProps={{
          'data-trace-manage-query-token-field': 'trace-id',
          'data-trace-manage-query-token-field-owner': 'hertzbeat-ui-query-token-field'
        }}
        data-trace-manage-trace-id-input="true"
      />
    );

    expect(html).toContain('data-hz-ui="query-token-field"');
    expect(html).toContain('data-hz-query-token-field-owner="hertzbeat-ui-query-token-field"');
    expect(html).toContain('data-hz-query-token-field-width="trace-id"');
    expect(html).toContain('data-trace-manage-query-token-field="trace-id"');
    expect(html).toContain('data-trace-manage-query-token-field-owner="hertzbeat-ui-query-token-field"');
    expect(html).toContain('data-hz-ui="input"');
    expect(html).toContain('data-hz-query-token-input="true"');
    expect(html).toContain('data-hz-query-token-input-owner="hertzbeat-ui-query-token-field"');
    expect(html).toContain('data-trace-manage-trace-id-input="true"');
    expect(html).toContain('class="min-w-0 w-[240px]"');
    expect(html).toContain('w-full font-mono');
  });

  it('owns metrics context input widths', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzInput width="metrics-query-expression" inset="search-icon" aria-label="Metric query" data-otlp-metrics-query-input="true" />
        <HzInput width="metrics-filter-expression" inset="search-icon" aria-label="Metric filter" data-otlp-metrics-filter-input="true" />
        <HzInput width="metrics-query-step" aria-label="Query step" data-otlp-metrics-step-input="true" />
        <HzInput width="metrics-query-limit" aria-label="Series limit" data-otlp-metrics-limit-input="true" />
        <HzInput width="log-query-token" aria-label="Log trace ID" data-log-manage-query-token-input="trace-id" />
        <HzInput width="log-query-body" aria-label="Log body" data-log-manage-query-body-input="shared-log-body-input" />
        <HzInput width="metrics-context" aria-label="Service" data-otlp-metrics-context-input="service-name" />
        <HzInput width="metrics-context-compact" aria-label="Environment" data-otlp-metrics-context-input="environment" />
        <HzInput width="metrics-trace-id" aria-label="Trace ID" data-otlp-metrics-context-input="trace-id" />
      </div>
    );

    expect(html).toContain('data-hz-ui="input"');
    expect(html).toContain('data-hz-input-width="metrics-query-expression"');
    expect(html).toContain('data-hz-input-width="metrics-filter-expression"');
    expect(html).toContain('data-hz-input-width="metrics-query-step"');
    expect(html).toContain('data-hz-input-width="metrics-query-limit"');
    expect(html).toContain('data-hz-input-width="log-query-token"');
    expect(html).toContain('data-hz-input-width="log-query-body"');
    expect(html).toContain('data-hz-input-width="metrics-context"');
    expect(html).toContain('data-hz-input-width="metrics-context-compact"');
    expect(html).toContain('data-hz-input-width="metrics-trace-id"');
    expect(html).toContain('data-log-manage-query-token-input="trace-id"');
    expect(html).toContain('data-log-manage-query-body-input="shared-log-body-input"');
    expect(html).toContain('data-otlp-metrics-query-input="true"');
    expect(html).toContain('data-otlp-metrics-filter-input="true"');
    expect(html).toContain('data-otlp-metrics-step-input="true"');
    expect(html).toContain('data-otlp-metrics-limit-input="true"');
    expect(html).toContain('data-otlp-metrics-context-input="service-name"');
    expect(html).toContain('data-otlp-metrics-context-input="environment"');
    expect(html).toContain('data-otlp-metrics-context-input="trace-id"');
    expect(html).toContain('data-hz-input-inset="search-icon"');
    expect(html).toContain('w-full font-mono');
    expect(html).toContain('w-[220px]');
    expect(html).toContain('w-[220px] font-mono');
    expect(html).toContain('min-w-[280px] max-w-[520px] flex-1');
    expect(html).toContain('w-[160px]');
    expect(html).toContain('min-w-[220px] max-w-[360px] flex-1 font-mono');
  });

  it('owns compact query status select width and trigger density', () => {
    const html = renderToStaticMarkup(
      <HzQueryStatusSelect
        aria-label="Status"
        value="error"
        data-trace-manage-query-status-select="shared-query-status-select"
        data-trace-manage-query-status-select-owner="hertzbeat-ui-query-status-select"
        options={[
          { value: 'all', label: 'All' },
          { value: 'error', label: 'Errors' }
        ]}
      />
    );

    expect(html).toContain('data-hz-ui="select"');
    expect(html).toContain('data-hz-query-status-select-owner="hertzbeat-ui-query-status-select"');
    expect(html).toContain('data-hz-query-status-select-width="status"');
    expect(html).toContain('data-trace-manage-query-status-select="shared-query-status-select"');
    expect(html).toContain('data-trace-manage-query-status-select-owner="hertzbeat-ui-query-status-select"');
    expect(html).toContain('class="min-w-0 w-[120px]"');
    expect(html).toContain('data-hz-ui="select-trigger"');
    expect(html).toContain('h-8 min-w-0 text-[#d5dce8]');
  });

  it('owns query action grouping for run and reset controls', () => {
    const html = renderToStaticMarkup(
      <HzQueryActionGroup
        data-trace-manage-query-action-group="shared-query-action-group"
        data-trace-manage-query-action-group-owner="hertzbeat-ui-query-action-group"
      >
        <HzButton intent="primary" size="md">Run</HzButton>
        <HzButton intent="secondary" size="md">Reset</HzButton>
      </HzQueryActionGroup>
    );

    expect(html).toContain('data-hz-ui="action-group"');
    expect(html).toContain('data-hz-action-group-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('data-hz-query-action-group-owner="hertzbeat-ui-query-action-group"');
    expect(html).toContain('data-hz-query-action-group-kind="run-reset"');
    expect(html).toContain('data-trace-manage-query-action-group="shared-query-action-group"');
    expect(html).toContain('data-trace-manage-query-action-group-owner="hertzbeat-ui-query-action-group"');
    expect(html).toContain('data-hz-button-tier="solid-primary"');
    expect(html).toContain('data-hz-button-tier="flat-neutral"');
  });

  it('filters template groups by visible labels only', () => {
    expect(filterHzTemplateCategories(categories, 'linux')).toEqual([
      {
        id: 'os',
        label: localizedFixtures.osMonitor,
        items: [
          { id: 'linux', label: 'Linux', description: 'SSH + process', meta: 'yml' }
        ]
      }
    ]);
    expect(filterHzTemplateCategories(categories, 'database')).toEqual([]);
  });

  it('renders dense primitives and product patterns without oversized rounded card chrome', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzButton>Refresh</HzButton>
        <HzStatusBadge
          tone="success"
          data-monitor-refresh-badge-owner="hertzbeat-ui-status-badge"
          style={{ fontFamily: 'IBM Plex Mono' }}
        >
          Healthy
        </HzStatusBadge>
        <HzStatusBadge
          tone="critical"
          size="xs"
          data-signal-attribution-diagnostic-badge-owner="hertzbeat-ui-status-badge"
        >
          Missing
        </HzStatusBadge>
        <HzStatusBadge
          tone="warning"
          size="md"
          data-log-stream-status-badge-owner="hertzbeat-ui-status-badge"
        >
          Connecting
        </HzStatusBadge>
        <HzStatusBadge
          tone="neutral"
          size="sm"
          layout="metric-fact"
          label="points"
          value="24"
          data-metrics-chart-meta-fact-owner="hertzbeat-ui-status-badge"
        />
        <HzStatusBadge
          tone="info"
          size="sm"
          layout="zoom-draft"
          label="Zoom draft"
          value="2026-05-24 03:41:00 - 03:42:00"
          valueFont="mono"
          data-metrics-chart-zoom-draft-owner="hertzbeat-ui-status-badge"
        />
        <HzStatusBadge
          tone="neutral"
          size="sm"
          layout="context-pill"
          label="service"
          value="checkout-api"
          data-metrics-header-context-pill-owner="hertzbeat-ui-status-badge"
        />
        <HzLabelTag
          colorToken="geekblue"
          data-label-color-owner="hertzbeat-ui-label-tag"
        >
          team:ops
        </HzLabelTag>
        <HzDataTable
          variant="embedded"
          getRowProps={row => ({ 'data-test-row': row.name })}
          columns={[
            { key: 'name', header: 'Name', render: row => row.name },
            { key: 'status', header: 'Status', render: row => <HzStatusBadge tone="info">{row.status}</HzStatusBadge> }
          ]}
          rows={[{ name: 'mysql-prod', status: 'collecting' }]}
          getRowKey={row => row.name}
        />
        <HzTemplatePicker categories={categories} selectedId="mysql" search="" onSearchChange={vi.fn()} />
      </div>
    );

    expect(html).toContain('data-hz-ui="button"');
    expect(html).toContain('data-hz-ui="status-badge"');
    expect(html).toContain('data-hz-status-tone="success"');
    expect(html).toContain('data-hz-status-tone="critical"');
    expect(html).toContain('data-hz-status-size="xs"');
    expect(html).toContain('data-hz-status-tone="warning"');
    expect(html).toContain('data-hz-status-size="md"');
    expect(html).toContain('data-hz-status-badge-layout="metric-fact"');
    expect(html).toContain('data-hz-status-badge-layout="zoom-draft"');
    expect(html).toContain('data-hz-status-badge-layout="context-pill"');
    expect(html).toContain('data-hz-status-badge-part="label"');
    expect(html).toContain('data-hz-status-badge-part="value"');
    expect(html).toContain('max-w-[180px]');
    expect(html).toContain('max-w-[340px]');
    expect(html).toContain('max-w-[220px]');
    expect(html).toContain('gap-2');
    expect(html).toContain('shrink-0 font-semibold text-[#7f8a9d]');
    expect(html).toContain('truncate font-semibold text-[#dbe5f3]');
    expect(html).toContain('font-mono');
    expect(html).toContain('data-monitor-refresh-badge-owner="hertzbeat-ui-status-badge"');
    expect(html).toContain('data-signal-attribution-diagnostic-badge-owner="hertzbeat-ui-status-badge"');
    expect(html).toContain('data-log-stream-status-badge-owner="hertzbeat-ui-status-badge"');
    expect(html).toContain('data-metrics-chart-meta-fact-owner="hertzbeat-ui-status-badge"');
    expect(html).toContain('data-metrics-chart-zoom-draft-owner="hertzbeat-ui-status-badge"');
    expect(html).toContain('data-hz-ui="label-tag"');
    expect(html).toContain('data-hz-label-tag-owner="hertzbeat-ui-label-tag"');
    expect(html).toContain('data-hz-label-color-token="geekblue"');
    expect(html).toContain('data-label-color-owner="hertzbeat-ui-label-tag"');
    expect(html).toContain('team:ops');
    expect(html).toContain('IBM Plex Mono');
    expect(html).toContain('data-hz-ui="data-table"');
    expect(html).toContain('data-hz-data-table-variant="embedded"');
    expect(html).toContain('overflow-x-auto overflow-y-hidden bg-[var(--hz-ui-surface)]');
    expect(html).toContain('data-test-row="mysql-prod"');
    expect(html).toContain('data-hz-ui="template-picker"');
    expect(html).toContain('data-hz-template-selected="true"');
    expect(html).toContain('whitespace-nowrap');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('supports selectable data rows so lists can open detail drawers', () => {
    const html = renderToStaticMarkup(
      <HzDataTable
        columns={[{ key: 'name', header: 'Name', render: row => row.name }]}
        rows={[{ name: 'mysql-prod' }, { name: 'linux-edge' }]}
        getRowKey={row => row.name}
        selectedRowKey="mysql-prod"
        onRowClick={vi.fn()}
      />
    );

    expect(html).toContain('data-hz-row-clickable="true"');
    expect(html).toContain('data-hz-row-selected="true"');
    expect(html).not.toContain('role="button"');
    expect(html).toContain('tabindex="0"');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a shared collapsible section for compact evidence panels', () => {
    const html = renderToStaticMarkup(
      <HzCollapsibleSection
        title="Evidence"
        meta="logs / traces"
        surface="inset"
        data-test-collapsible="true"
      >
        <div data-test-collapsible-body="true">Shared body</div>
      </HzCollapsibleSection>
    );

    expect(html).toContain('data-hz-ui="collapsible-section"');
    expect(html).toContain('data-hz-collapsible-owner="hertzbeat-ui-collapsible-section"');
    expect(html).toContain('data-hz-collapsible-surface="inset"');
    expect(html).toContain('data-hz-collapsible-summary-owner="hertzbeat-ui-collapsible-section"');
    expect(html).toContain('data-hz-collapsible-body-owner="hertzbeat-ui-collapsible-section"');
    expect(html).toContain('border-[#252b35]');
    expect(html).toContain('bg-[#0d1015]');
    expect(html).toContain('data-test-collapsible="true"');
    expect(html).toContain('Evidence');
    expect(html).toContain('logs / traces');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders an action workbench with shared guarded suggestion and adapter-boundary density', () => {
    const html = renderToStaticMarkup(
      <HzActionWorkbench
        title="Automation actions"
        subtitle="Keep suggested remediations evidence-led and manually confirmed."
        sourceLabel="Automation entry"
        actions={[
          { label: 'Open overview', href: '/overview', variant: 'primary' },
          { label: 'Open entities', href: '/entities', variant: 'subtle' }
        ]}
        shell={{
          eyebrow: 'Shared action shell',
          copy: 'Action surfaces stay compact while execution adapters are pending.',
          chips: ['Action catalog', 'Risk posture', 'Approval rail']
        }}
        adapterBoundary={{
          state: 'adapter-pending',
          label: 'Execution boundary',
          copy: 'Roadmap automation snapshots stay separated from live operator actions.',
          roadmapOnlyLabels: ['Workflow automation', 'Action catalog', 'Approvals']
        }}
        checklistTitle="Launch checklist"
        checklist={[
          { title: 'Context carried', copy: 'Signal context remains attached.', tone: 'bg-[#75ad86]' },
          { title: 'Adapter pending', copy: 'No automatic execution is exposed.', tone: 'bg-[#c2a86b]' }
        ]}
        suggestedTitle="Suggested actions"
        suggestedCopy="Suggestions require confirmation."
        suggestedEvidenceLabel="Open evidence"
        suggestedConfirmLabel="Manual required"
        suggestedActions={[
          {
            id: 'suggest-restart-checkout',
            title: 'Suggest restart checkout-api',
            copy: 'Restart stays disabled until a human confirms risk.',
            displayMeta: 'High risk · restart checkout',
            evidence: 'Source alert center · signal traces',
            evidenceHref: '/alert?status=firing',
            confirmation: 'manual-required',
            posture: 'Suggestion only.'
          }
        ]}
        catalogAdapter={{
          state: 'fallback-empty',
          adapterOwner: 'next-actions-catalog-bff',
          endpoint: '/api/actions/catalog?limit=8',
          method: 'GET',
          executionMode: 'manual-approval-draft-only',
          executionAllowed: false,
          managerBacked: false,
          title: 'Action catalog adapter',
          copy: 'Reads durable manual-only action catalog entries before approval drafts reference them.',
          loadingLabel: 'Loading catalog',
          emptyLabel: 'No manager catalog items yet.',
          items: []
        }}
        approvalDraft={{
          state: 'ready',
          adapterOwner: 'next-actions-approval-draft-bff',
          endpoint: '/api/actions/approval-drafts',
          method: 'POST',
          executionMode: 'manual-approval-draft-only',
          executionAllowed: false,
          title: 'Approval draft adapter',
          copy: 'Creates a non-executing approval draft from the first suggestion.',
          createLabel: 'Create draft',
          pendingLabel: 'Creating draft',
          successLabel: 'Draft created',
          failedLabel: 'Draft failed',
          disabledReason: 'Needs alert or entity context.',
          requestPreview: '{"actionId":"suggest-restart-checkout","executionAllowed":false}'
        }}
        approvalDraftQueue={{
          state: 'fallback-local-drafts',
          adapterOwner: 'next-actions-approval-draft-bff',
          endpoint: '/api/actions/approval-drafts?limit=8',
          method: 'GET',
          executionMode: 'manual-approval-draft-only',
          executionAllowed: false,
          managerBacked: false,
          title: 'Approval draft queue',
          copy: 'Reads approval drafts before execution exists.',
          loadingLabel: 'Loading drafts',
          emptyLabel: 'No approval drafts yet.',
          drafts: [
            {
              draftId: 'approval-draft-ui-lab-approved',
              state: 'approval-draft-approved',
              actionId: 'suggest-restart-checkout',
              catalogId: 'restart-checkout',
              executionState: 'not-executed',
              adapterOwner: 'next-actions-approval-decision-bff'
            }
          ]
        }}
        approvalDecision={{
          state: 'awaiting-draft',
          status: 'blocked',
          adapterOwner: 'next-actions-approval-decision-bff',
          endpoint: '/api/actions/approval-drafts/:draftId/decision',
          method: 'POST',
          executionMode: 'manual-approval-draft-only',
          executionAllowed: false,
          managerBacked: false,
          title: 'Approval decision adapter',
          copy: 'Records approve or reject without action execution.',
          approveLabel: 'Approve draft',
          rejectLabel: 'Reject draft',
          pendingLabel: 'Recording decision',
          successLabel: 'Decision recorded',
          failedLabel: 'Decision failed',
          disabledReason: 'Create a draft before decision.',
          requestPreview: '{"decision":"approved","executionAllowed":false}'
        }}
        emptyTitle="Execution adapter pending"
        emptyCopy="Live runs and approvals remain behind the adapter boundary."
      />
    );

    expect(html).toContain('data-hz-ui="action-workbench"');
    expect(html).toContain('data-hz-action-workbench-owner="hertzbeat-ui-action-workbench"');
    expect(html).toContain('data-hz-action-workbench-density="operator-compact"');
    expect(html).toContain('data-hz-action-workbench-style="hertzbeat-ui-matte-hard-edge"');
    expect(html).toContain('data-hz-action-workbench-adapter-state="adapter-pending"');
    expect(html).toContain('data-hz-action-workbench-actions="shared"');
    expect(html).toContain('data-actions-shell-panel="hertzbeat-ui-ops-shell-panel"');
    expect(html).toContain('data-actions-launch-checklist="hertzbeat-ui-ops-static-rail"');
    expect(html).toContain('data-actions-adapter-boundary="adapter-pending"');
    expect(html).toContain('data-actions-suggested-remediation="alert-context-human-confirmation"');
    expect(html).toContain('data-actions-suggested-action="suggest-restart-checkout"');
    expect(html).toContain('data-actions-suggested-action-confirm="manual-required"');
    expect(html).toContain('data-actions-catalog="manual-action-catalog-api"');
    expect(html).toContain('data-actions-catalog-owner="next-actions-catalog-bff"');
    expect(html).toContain('data-actions-catalog-endpoint="/api/actions/catalog?limit=8"');
    expect(html).toContain('data-actions-catalog-manager-backed="false"');
    expect(html).toContain('data-actions-catalog-execution-mode="manual-approval-draft-only"');
    expect(html).toContain('data-actions-catalog-execution-allowed="false"');
    expect(html).toContain('data-actions-catalog-item-count="0"');
    expect(html).toContain('data-actions-catalog-empty="true"');
    expect(html).toContain('data-actions-approval-draft="manual-approval-draft-api"');
    expect(html).toContain('data-actions-approval-draft-owner="next-actions-approval-draft-bff"');
    expect(html).toContain('data-actions-approval-draft-endpoint="/api/actions/approval-drafts"');
    expect(html).toContain('data-actions-approval-draft-execution-mode="manual-approval-draft-only"');
    expect(html).toContain('data-actions-approval-draft-execution-allowed="false"');
    expect(html).toContain('data-actions-approval-draft-request="preview"');
    expect(html).toContain('data-actions-approval-draft-queue="manual-approval-draft-read-api"');
    expect(html).toContain('data-actions-approval-draft-queue-owner="next-actions-approval-draft-bff"');
    expect(html).toContain('data-actions-approval-draft-queue-endpoint="/api/actions/approval-drafts?limit=8"');
    expect(html).toContain('data-actions-approval-draft-queue-manager-backed="false"');
    expect(html).toContain('data-actions-approval-draft-queue-execution-mode="manual-approval-draft-only"');
    expect(html).toContain('data-actions-approval-draft-queue-execution-allowed="false"');
    expect(html).toContain('data-actions-approval-draft-queue-item-count="1"');
    expect(html).toContain('data-actions-approval-draft-queue-item="approval-draft-ui-lab-approved"');
    expect(html).toContain('data-actions-approval-draft-queue-item-state="approval-draft-approved"');
    expect(html).toContain('data-actions-approval-draft-queue-item-execution-state="not-executed"');
    expect(html).toContain('data-actions-approval-draft-queue-item-adapter-owner="next-actions-approval-decision-bff"');
    expect(html).toContain('data-actions-approval-draft-queue-item-action-id="suggest-restart-checkout"');
    expect(html).toContain('data-actions-approval-draft-queue-item-catalog-id="restart-checkout"');
    expect(html).toContain('data-actions-approval-decision="manual-approval-decision-api"');
    expect(html).toContain('data-actions-approval-decision-owner="next-actions-approval-decision-bff"');
    expect(html).toContain('data-actions-approval-decision-endpoint="/api/actions/approval-drafts/:draftId/decision"');
    expect(html).toContain('data-actions-approval-decision-manager-backed="false"');
    expect(html).toContain('data-actions-approval-decision-execution-mode="manual-approval-draft-only"');
    expect(html).toContain('data-actions-approval-decision-execution-allowed="false"');
    expect(html).toContain('data-actions-approval-decision-request="preview"');
    expect(html).toContain('data-actions-approval-decision-blocked="true"');
    expect(html).toContain('data-actions-empty-state="hertzbeat-ui-ops-domain-adapter"');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('locks action approval decision controls after the decision is recorded', () => {
    const html = renderToStaticMarkup(
      <HzActionWorkbench
        title="Automation actions"
        subtitle="Keep suggested remediations evidence-led and manually confirmed."
        sourceLabel="Automation entry"
        actions={[]}
        shell={{
          eyebrow: 'Shared action shell',
          copy: 'Action surfaces stay compact while execution adapters are pending.',
          chips: []
        }}
        adapterBoundary={{
          state: 'adapter-pending',
          label: 'Execution boundary',
          copy: 'Roadmap automation snapshots stay separated from live operator actions.',
          roadmapOnlyLabels: []
        }}
        checklistTitle="Launch checklist"
        checklist={[]}
        approvalDecision={{
          state: 'ready',
          status: 'decided',
          adapterOwner: 'next-actions-approval-decision-bff',
          endpoint: '/api/actions/approval-drafts/approval-draft-ui-lab-rejected/decision',
          method: 'POST',
          executionMode: 'manual-approval-draft-only',
          executionAllowed: false,
          managerBacked: false,
          title: 'Approval decision adapter',
          copy: 'Records approve or reject without action execution.',
          approveLabel: 'Approve draft',
          rejectLabel: 'Reject draft',
          pendingLabel: 'Recording decision',
          successLabel: 'Decision recorded',
          failedLabel: 'Decision failed',
          disabledReason: 'Create a draft before decision.',
          requestPreview: '{"decision":"rejected","executionAllowed":false}',
          result: {
            draftId: 'approval-draft-ui-lab-rejected',
            decision: 'rejected',
            state: 'approval-draft-rejected',
            executionState: 'not-executed'
          },
          onApprove: vi.fn(),
          onReject: vi.fn()
        }}
        emptyTitle="Execution adapter pending"
        emptyCopy="Live runs and approvals remain behind the adapter boundary."
      />
    );

    expect(html).toContain('data-actions-approval-decision-status="decided"');
    expect(html).toMatch(/<button(?=[^>]*disabled="")(?=[^>]*data-actions-approval-decision-approve="decided")/);
    expect(html).toMatch(/<button(?=[^>]*disabled="")(?=[^>]*data-actions-approval-decision-reject="decided")/);
    expect(html).toContain('data-actions-approval-decision-result="approval-draft-ui-lab-rejected"');
    expect(html).toContain('not-executed');
  });

  it('renders an incident workbench with shared table, timeline, and ownership density', () => {
    const html = renderToStaticMarkup(
      <HzIncidentWorkbench
        title="Incident workbench"
        subtitle="Coordinate status-page incidents with evidence handoffs."
        sourceLabel="Status page incidents"
        queryLabel="page=0 size=8"
        metrics={[
          { label: 'Open', value: '3', hint: 'active' },
          { label: 'Critical', value: '1', tone: 'critical' },
          { label: 'Mitigating', value: '1', tone: 'warning' },
          { label: 'Owners', value: '2' }
        ]}
        incidents={[
          {
            id: 'inc-204',
            title: 'Checkout latency spike with a deliberately long incident title that must truncate inside the first table column',
            severity: 'critical',
            severityLabel: 'Critical incident',
            stage: 'mitigating',
            service: 'checkout-api',
            owner: 'commerce-sre',
            openedAt: '2026-05-23 09:10',
            blastRadius: 'prod checkout'
          }
        ]}
        timeline={[
          {
            id: 'event-1',
            title: 'Mitigation started',
            copy: 'Status page update added and trace evidence attached.',
            meta: '09:14',
            tone: 'warning'
          }
        ]}
        ownership={[
          {
            id: 'owner-commerce',
            owner: 'commerce-sre',
            queue: 'primary',
            copy: 'Owns customer checkout mitigation.',
            meta: 'on call',
            tone: 'info'
          }
        ]}
        actions={[{ label: 'Open logs', href: '/log/manage', variant: 'primary' }]}
        transitionActions={[
          { id: 'monitoring', label: 'Mark monitoring', state: 2, variant: 'default' },
          { id: 'resolved', label: 'Resolve', state: 3, variant: 'primary', disabled: true }
        ]}
        transitionLabel="Incident status"
        labels={{
          incident: 'Incident label',
          severity: 'Severity label',
          stage: 'Stage label',
          owner: 'Owner label',
          impact: 'Impact label',
          timeline: 'Timeline label',
          ownership: 'Ownership label'
        }}
        selectedIncidentId="inc-204"
      />
    );

    expect(html).toContain('data-hz-ui="incident-workbench"');
    expect(html).toContain('data-hz-incident-workbench-owner="hertzbeat-ui-incident-workbench"');
    expect(html).toContain('data-hz-incident-workbench-density="operator-compact"');
    expect(html).toContain('data-hz-incident-workbench-style="hertzbeat-ui-matte-hard-edge"');
    expect(html).toContain('data-hz-incident-workbench-source="Status page incidents"');
    expect(html).toContain('data-hz-incident-workbench-query="page=0 size=8"');
    expect(html).toContain('data-hz-incident-workbench-table="shared"');
    expect(html).toContain('data-hz-incident-transition-actions="shared"');
    expect(html).toContain('data-hz-incident-transition-owner="hertzbeat-ui-incident-transition-actions"');
    expect(html).toContain('data-hz-incident-transition-density="operator-compact"');
    expect(html).toContain('data-hz-incident-transition-style="hertzbeat-ui-matte-hard-edge"');
    expect(html).toContain('data-hz-incident-transition-action="monitoring"');
    expect(html).toContain('data-hz-incident-transition-target-state="2"');
    expect(html).toContain('data-hz-incident-transition-disabled="false"');
    expect(html).toContain('data-hz-incident-transition-action="resolved"');
    expect(html).toContain('data-hz-incident-transition-target-state="3"');
    expect(html).toContain('data-hz-incident-transition-disabled="true"');
    expect(html).toContain('data-hz-ui="data-table"');
    expect(html).toContain('data-hz-row-selected="true"');
    expect(html).toContain('Incident label');
    expect(html).toContain('Severity label');
    expect(html).toContain('Stage label');
    expect(html).toContain('Owner label');
    expect(html).toContain('Impact label');
    expect(html).toContain('Timeline label');
    expect(html).toContain('Ownership label');
    expect(html).toContain('Critical incident');
    expect(html).toContain('data-hz-incident-cell="title-opened-at"');
    expect(html).toContain('data-hz-incident-cell="owner-service"');
    expect(html).toContain('max-w-[320px]');
    expect(html).toContain('max-w-[160px]');
    expect(html).toContain('data-hz-data-cell-variant="title"');
    expect(html).toContain('data-hz-data-cell-display="block"');
    expect(html).toContain('data-hz-data-meta-display="block"');
    expect(html).toContain('data-hz-data-meta-casing="plain"');
    expect(html).toContain('data-hz-incident-timeline-item="event-1"');
    expect(html).toContain('data-hz-incident-owner-item="owner-commerce"');
    expect(html).toContain('data-hz-incident-workbench-action="primary"');
    expect(html).toContain('Checkout latency spike with a deliberately long incident title');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders data-table meta text as a shared primitive instead of page-local tiny labels', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzDataMetaText>MYSQL</HzDataMetaText>
        <HzDataMetaText variant="unit">ms</HzDataMetaText>
        <HzDataMetaText spacing="inline">team=platform</HzDataMetaText>
        <HzDataMetaText variant="unit" spacing="compact">s</HzDataMetaText>
        <HzDataMetaText display="block" casing="plain">3 / 8 rows</HzDataMetaText>
        <HzDataMetaText display="block" casing="plain" spacing="trend-helper">3 sample points</HzDataMetaText>
      </div>
    );

    expect(html).toContain('data-hz-ui="data-meta-text"');
    expect(html).toContain('data-hz-data-meta-owner="hertzbeat-ui-data-meta-text"');
    expect(html).toContain('data-hz-data-meta-variant="meta"');
    expect(html).toContain('data-hz-data-meta-variant="unit"');
    expect(html).toContain('data-hz-data-meta-spacing="inline"');
    expect(html).toContain('data-hz-data-meta-spacing="compact"');
    expect(html).toContain('data-hz-data-meta-spacing="trend-helper"');
    expect(html).toContain('data-hz-data-meta-display="block"');
    expect(html).toContain('data-hz-data-meta-casing="plain"');
    expect(html).toContain('uppercase');
    expect(html).toContain('normal-case');
    expect(html).toContain('tracking-normal');
    expect(html).toContain('ml-2');
    expect(html).toContain('ml-1');
    expect(html).toContain('mt-2');
    expect(html).toContain('text-[11px]');
    expect(html).toContain('text-[#6d7788]');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders data table cell text variants for real monitor rows without page-local typography', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzDataCellText variant="title" display="block">checkout-http</HzDataCellText>
        <HzDataCellText variant="copy" display="block" spacing="stack-tight">10.0.0.42</HzDataCellText>
        <HzDataCellText variant="meta" display="block" spacing="stack">team=platform</HzDataCellText>
        <HzDataCellText variant="type">MYSQL</HzDataCellText>
        <HzDataCellText variant="timestamp">2026-05-23 22:15:00</HzDataCellText>
        <HzDataCellText variant="value">118ms</HzDataCellText>
        <HzDataCellText variant="value" tone="strong" weight="semibold">Checkout API</HzDataCellText>
        <HzDataCellText variant="value" tone="bright" font="mono">128ms</HzDataCellText>
        <HzDataCellText variant="meta" casing="plain" tone="success">entityId=7</HzDataCellText>
        <HzDataCellText variant="meta" casing="plain" tone="muted">waiting attribution</HzDataCellText>
        <HzDataCellText variant="identifier" display="block" width="trace-id">trace-20260523</HzDataCellText>
      </div>
    );

    expect(html).toContain('data-hz-ui="data-cell-text"');
    expect(html).toContain('data-hz-data-cell-owner="hertzbeat-ui-data-cell-text"');
    expect(html).toContain('data-hz-data-cell-variant="title"');
    expect(html).toContain('data-hz-data-cell-variant="copy"');
    expect(html).toContain('data-hz-data-cell-variant="meta"');
    expect(html).toContain('data-hz-data-cell-variant="type"');
    expect(html).toContain('data-hz-data-cell-variant="timestamp"');
    expect(html).toContain('data-hz-data-cell-variant="value"');
    expect(html).toContain('data-hz-data-cell-variant="identifier"');
    expect(html).toContain('data-hz-data-cell-display="block"');
    expect(html).toContain('data-hz-data-cell-spacing="stack-tight"');
    expect(html).toContain('data-hz-data-cell-spacing="stack"');
    expect(html).toContain('data-hz-data-cell-width="trace-id"');
    expect(html).toContain('data-hz-data-cell-tone="strong"');
    expect(html).toContain('data-hz-data-cell-tone="bright"');
    expect(html).toContain('data-hz-data-cell-tone="success"');
    expect(html).toContain('data-hz-data-cell-tone="muted"');
    expect(html).toContain('data-hz-data-cell-weight="semibold"');
    expect(html).toContain('data-hz-data-cell-font="mono"');
    expect(html).toContain('data-hz-data-cell-casing="plain"');
    expect(html).toContain('mt-0.5');
    expect(html).toContain('mt-1');
    expect(html).toContain('max-w-[220px]');
    expect(html).toContain('font-semibold');
    expect(html).toContain('font-mono');
    expect(html).toContain('normal-case');
    expect(html).toContain('tracking-normal');
    expect(html).toContain('text-[#dbe5f3]');
    expect(html).toContain('text-[#e6edf7]');
    expect(html).toContain('text-[#75c795]');
    expect(html).toContain('text-[#8b94a4]');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('owns stacked data table cell footprints for metrics entity rows', () => {
    const html = renderToStaticMarkup(
      <HzDataCellStack
        display="block"
        width="metrics-entity"
        data-otlp-metrics-series-entity="true"
        data-otlp-metrics-series-entity-owner="hertzbeat-ui-data-cell-stack"
      >
        <HzDataCellText
          variant="value"
          display="block"
          tone="strong"
          weight="semibold"
          data-otlp-metrics-series-entity-label-owner="hertzbeat-ui-data-cell-text"
        >
          Checkout API
        </HzDataCellText>
        <HzDataCellText
          variant="meta"
          display="block"
          spacing="stack-tight"
          casing="plain"
          tone="success"
          data-otlp-metrics-series-entity-meta-owner="hertzbeat-ui-data-cell-text"
        >
          entityId=7
        </HzDataCellText>
      </HzDataCellStack>
    );

    expect(html).toContain('data-hz-ui="data-cell-stack"');
    expect(html).toContain('data-hz-data-cell-stack-owner="hertzbeat-ui-data-cell-stack"');
    expect(html).toContain('data-hz-data-cell-stack-display="block"');
    expect(html).toContain('data-hz-data-cell-stack-width="metrics-entity"');
    expect(html).toContain('data-otlp-metrics-series-entity-owner="hertzbeat-ui-data-cell-stack"');
    expect(html).toContain('class="block min-w-[140px]"');
    expect(html).toContain('data-otlp-metrics-series-entity-label-owner="hertzbeat-ui-data-cell-text"');
    expect(html).toContain('data-otlp-metrics-series-entity-meta-owner="hertzbeat-ui-data-cell-text"');
  });

  it('renders monitor realtime toolbar facts and actions with shared compact chrome', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzMonitorRealtimeToolbar
          facts={[
            { title: 'Collect time', copy: '2026-04-11 10:00:00' },
            { title: 'Rows', copy: '2' }
          ]}
          modeOptions={[
            { value: 'table', label: 'Table' },
            { value: 'detail', label: 'Detail' }
          ]}
          selectedMode="table"
          refreshLabel="Refresh"
          expandLabel="Fullscreen"
        />
        <HzMonitorRealtimeToolbar
          compact
          facts={[{ title: 'Collect time', copy: '2026-04-11 10:00:00' }]}
          expandLabel="Fullscreen"
        />
      </div>
    );

    expect(html).toContain('data-hz-ui="monitor-realtime-toolbar"');
    expect(html).toContain('data-monitor-realtime-toolbar-owner="hertzbeat-ui-realtime-toolbar"');
    expect(html).toContain('data-monitor-realtime-action-group="shared-toolbar-actions"');
    expect(html).toContain('data-monitor-realtime-action-group="shared-metric-extra"');
    expect(html).toContain('data-monitor-realtime-action-density="hertzbeat-ui-compact-actions"');
    expect(html).toContain('data-monitor-realtime-collect-time="true"');
    expect(html).toContain('data-monitor-realtime-expand-action-density="hertzbeat-ui-link-action"');
    expect(html).not.toContain('angular-plain-meta');
  });

  it('renders monitor realtime inspector with shared summary and details chrome', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzMonitorRealtimeInspector
          variant="summary"
          label="Selected row"
          value="host=db-1"
        />
        <HzMonitorRealtimeInspector
          variant="details"
          label="Active row"
          value="host=db-1"
          stats={[
            { label: 'Fields', value: '2' },
            { label: 'Labels', value: '1' }
          ]}
          rows={[
            { label: 'usage', value: '72' },
            { label: 'idle', value: '28' }
          ]}
        />
      </div>
    );

    expect(html).toContain('data-hz-ui="monitor-realtime-inspector"');
    expect(html).toContain('data-monitor-realtime-inspector-owner="hertzbeat-ui-realtime-inspector"');
    expect(html).toContain('data-monitor-realtime-inspector-variant="summary"');
    expect(html).toContain('data-monitor-realtime-inspector-variant="details"');
    expect(html).toContain('data-monitor-realtime-inspector-stat="true"');
    expect(html).toContain('data-monitor-realtime-inspector-row="true"');
    expect(html).not.toContain('data-monitor-surface-panel="row-inspector"');
  });

  it('renders monitor realtime row navigation with shared action chrome', () => {
    const genericHtml = renderToStaticMarkup(
      <HzMonitorRowNavigator
        label="Series 2 / 4 · mysql-prod-01"
        previousLabel="Previous series"
        nextLabel="Next series"
        canPrevious
        canNext
      />
    );
    const html = renderToStaticMarkup(
      <HzMonitorRealtimeRowNavigator
        label="Row 1 / 2 · host=db-1"
        previousLabel="Previous"
        nextLabel="Next"
        canPrevious={false}
        canNext
      />
    );

    expect(genericHtml).toContain('data-hz-ui="monitor-row-navigator"');
    expect(genericHtml).toContain('data-monitor-row-nav-owner="hertzbeat-ui-row-navigator"');
    expect(genericHtml).toContain('data-monitor-row-nav-action="previous"');
    expect(genericHtml).toContain('data-monitor-row-nav-action="next"');
    expect(html).toContain('data-hz-ui="monitor-realtime-row-navigator"');
    expect(html).toContain('data-monitor-realtime-row-nav-owner="hertzbeat-ui-row-navigator"');
    expect(html).toContain('data-monitor-realtime-row-nav-action="previous"');
    expect(html).toContain('data-monitor-realtime-row-nav-action="next"');
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('var(--ops-border-color)');
    expect(html).not.toContain('data-observability-control-button');
  });

  it('renders monitor control bands with shared flat divider chrome', () => {
    const html = renderToStaticMarkup(
      <HzMonitorControlBand
        title="Compare scope"
        variant="embedded"
        actions={
          <>
            <HzButton intent="ghost" size="sm">
              Selected only
            </HzButton>
            <HzButton intent="ghost" size="sm">
              All
            </HzButton>
          </>
        }
        data-monitor-history-compare-band-owner="hertzbeat-ui-control-band"
      >
        <HzUnderlineToggle selected selectionAttrName="data-compare-selected">
          basic.max_connections
        </HzUnderlineToggle>
      </HzMonitorControlBand>
    );

    expect(html).toContain('data-hz-ui="monitor-control-band"');
    expect(html).toContain('data-monitor-control-band-owner="hertzbeat-ui-control-band"');
    expect(html).toContain('data-monitor-history-compare-band-owner="hertzbeat-ui-control-band"');
    expect(html).toContain('data-hz-control-band-style="flat-divider"');
    expect(html).toContain('data-hz-control-band-variant="embedded"');
    expect(html).toContain('Compare scope');
    expect(html).toContain('data-compare-selected="true"');
    expect(html).not.toContain('data-monitor-surface-panel="series-compare"');
    expect(html).not.toContain('bg-[var(--ops-surface-panel)]');
  });

  it('renders monitor evidence frames with shared flat divider chrome', () => {
    const html = renderToStaticMarkup(
      <HzMonitorEvidenceFrame variant="media" data-monitor-history-chart-frame-owner="hertzbeat-ui-evidence-frame">
        <iframe title="History chart" src="about:blank" />
      </HzMonitorEvidenceFrame>
    );

    expect(html).toContain('data-hz-ui="monitor-evidence-frame"');
    expect(html).toContain('data-monitor-evidence-frame-owner="hertzbeat-ui-evidence-frame"');
    expect(html).toContain('data-monitor-history-chart-frame-owner="hertzbeat-ui-evidence-frame"');
    expect(html).toContain('data-hz-evidence-frame-style="flat-divider"');
    expect(html).toContain('data-hz-evidence-frame-variant="media"');
    expect(html).toContain('data-hz-evidence-frame-media-target="iframe"');
    expect(html).toContain('[&amp;_iframe]:h-[720px]');
    expect(html).toContain('[&amp;_iframe]:w-full');
    expect(html).toContain('[&amp;_iframe]:border-0');
    expect(html).toContain('title="History chart"');
    expect(html).not.toContain('class="h-[720px] w-full border-0"');
    expect(html).toContain('overflow-hidden');
    expect(html).toContain('py-0');
    expect(html).not.toContain('var(--ops-border-color)');
    expect(html).not.toContain('bg-[var(--ops-surface-panel)]');
  });

  it('lets compact icon links keep shared styling while routing through an app-owned link component', () => {
    const RoutedLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
      (props, ref) => <a ref={ref} data-routed-link="true" {...props} />
    );
    RoutedLink.displayName = 'RoutedLink';

    const html = renderToStaticMarkup(
      <HzIconLink component={RoutedLink} href="/monitors/42/edit" label="Edit monitor">
        E
      </HzIconLink>
    );

    expect(html).toContain('data-hz-ui="icon-link"');
    expect(html).toContain('data-routed-link="true"');
    expect(html).toContain('href="/monitors/42/edit"');
    expect(html).toContain('aria-label="Edit monitor"');
  });

  it('renders breadcrumb context as shared underline text instead of chip chrome', () => {
    const RoutedLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
      (props, ref) => <a ref={ref} data-routed-link="true" {...props} />
    );
    RoutedLink.displayName = 'RoutedLink';

    const html = renderToStaticMarkup(
      <HzInlineContextMark component={RoutedLink} href="/setting/define?app=mysql" placement="breadcrumb">
        MySQL
      </HzInlineContextMark>
    );

    expect(html).toContain('data-hz-ui="inline-context-mark"');
    expect(html).toContain('data-hz-control-edge="bottom-underline"');
    expect(html).toContain('data-hz-inline-context-mark-placement="breadcrumb"');
    expect(html).toContain('ml-1');
    expect(html).toContain('data-routed-link="true"');
    expect(html).toContain('href="/setting/define?app=mysql"');
    expect(html).toContain('MySQL');
    expect(html).not.toContain('data-hz-ui="breadcrumb-chip"');
    expect(html).not.toContain('rounded-[12px]');
    expect(html).not.toContain('rounded-[14px]');
  });

  it('renders monitor breadcrumbs as shared flat navigation chrome', () => {
    const RoutedLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
      (props, ref) => <a ref={ref} data-routed-link="true" {...props} />
    );
    RoutedLink.displayName = 'RoutedLink';

    const html = renderToStaticMarkup(
      <HzMonitorBreadcrumb aria-label="Monitor detail">
        <RoutedLink href="/">Overview</RoutedLink>
        <span>Monitors</span>
        <HzInlineContextMark component="a" href="/setting/define?app=mysql" placement="breadcrumb">
          MySQL
        </HzInlineContextMark>
      </HzMonitorBreadcrumb>
    );

    expect(html).toContain('data-hz-ui="monitor-breadcrumb"');
    expect(html).toContain('data-hz-monitor-breadcrumb-owner="hertzbeat-ui-monitor-breadcrumb"');
    expect(html).toContain('data-hz-monitor-breadcrumb-rhythm="flat-bottom-line"');
    expect(html).toContain('data-hz-ui="inline-context-mark"');
    expect(html).toContain('data-hz-inline-context-mark-placement="breadcrumb"');
    expect(html).toContain('href="/setting/define?app=mysql"');
    expect(html).not.toContain('var(--ops-border-color)');
    expect(html).not.toContain('rounded-');
  });

  it('renders compact selects through the custom menu primitive instead of native browser chrome', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzSelect
          aria-label="Status"
          value="up"
          options={[
            { value: 'all', label: 'All status' },
            { value: 'up', label: 'Available' }
          ]}
        />
        <HzSelect
          aria-label="Aggregation"
          value="avg"
          width="metrics-aggregation"
          data-otlp-metrics-aggregation-select-owner="hertzbeat-ui-select"
          options={[
            { value: 'avg', label: 'Avg' },
            { value: 'sum', label: 'Sum' }
          ]}
        />
        <HzSelect
          aria-label="Group by"
          value="service"
          width="metrics-group-by"
          data-otlp-metrics-group-by-select-owner="hertzbeat-ui-select"
          options={[
            { value: 'service', label: 'Service' },
            { value: 'entity', label: 'Entity' }
          ]}
        />
        <HzSelect
          aria-label="Temporal aggregation"
          value="rate"
          width="metrics-temporal-aggregation"
          data-otlp-metrics-temporal-aggregation-select-owner="hertzbeat-ui-select"
          options={[
            { value: 'raw', label: 'Raw' },
            { value: 'rate', label: 'Rate' }
          ]}
        />
        <HzSelect
          aria-label="Severity"
          value="WARN"
          width="log-severity"
          triggerTone="signal-query"
          data-log-manage-query-severity-select-owner="hertzbeat-ui-select"
          options={[
            { value: 'all', label: 'All levels' },
            { value: 'WARN', label: 'WARN' }
          ]}
        />
      </div>
    );

    expect(html).toContain('data-hz-ui="select"');
    expect(html).toContain('data-hz-select-width="default"');
    expect(html).toContain('data-hz-select-width="metrics-aggregation"');
    expect(html).toContain('data-hz-select-width="metrics-group-by"');
    expect(html).toContain('data-hz-select-width="metrics-temporal-aggregation"');
    expect(html).toContain('data-hz-select-width="log-severity"');
    expect(html).toContain('data-hz-select-trigger-tone="signal-query"');
    expect(html).toContain('data-otlp-metrics-aggregation-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-otlp-metrics-group-by-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-otlp-metrics-temporal-aggregation-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-log-manage-query-severity-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('w-[124px]');
    expect(html).toContain('w-[132px]');
    expect(html).toContain('w-[156px]');
    expect(html).toContain('text-[#d5dce8]');
    expect(html).toContain('data-hz-ui="select-menu"');
    expect(html).toContain('data-hz-ui="select-trigger"');
    expect(html).not.toContain('<select');
    expect(html).toContain('h-8');
  });

  it('opens select menus upward when the trigger is near the viewport bottom', () => {
    expect(
      resolveHzSelectMenuPlacement({
        triggerTop: 720,
        triggerBottom: 752,
        viewportHeight: 800,
        optionCount: 3
      })
    ).toBe('top');
    expect(
      resolveHzSelectMenuPlacement({
        triggerTop: 120,
        triggerBottom: 152,
        viewportHeight: 800,
        optionCount: 3
      })
    ).toBe('bottom');
    expect(
      resolveHzSelectMenuPlacement({
        placement: 'bottom',
        triggerTop: 720,
        triggerBottom: 752,
        viewportHeight: 800,
        optionCount: 3
      })
    ).toBe('bottom');
  });

  it('renders overlay inspector drawers as dismissible right-side panels', () => {
    const html = renderToStaticMarkup(
      <HzInspectorDrawer
        open
        variant="overlay"
        title="Selected resource"
        subtitle="mysql-prod-01"
        facts={[{ label: 'Latency p95', value: '118ms', tone: 'warning' }]}
        sections={[]}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('data-hz-ui="inspector-drawer-overlay"');
    expect(html).toContain('data-hz-ui="inspector-drawer"');
    expect(html).toContain('data-hz-inspector-open="true"');
    expect(html).toContain('aria-label="Close inspector"');
    expect(html).toContain('fixed inset-0');
    expect(html).toContain('right-0');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders top tabs as a rail instead of a segmented card', () => {
    const html = renderToStaticMarkup(
      <HzSegmentedTabs
        activeId="monitors"
        items={[
          { id: 'monitors', label: 'Monitors', count: 128 },
          { id: 'templates', label: 'Templates', count: 42 },
          { id: 'signals', label: 'Signals', count: 3 }
        ]}
      />
    );

    expect(html).toContain('data-hz-ui="tabs"');
    expect(html).toContain('after:bg-[var(--hz-ui-accent)]');
    expect(html).not.toContain('p-[3px]');
    expect(html).not.toContain('min-w-[92px]');
    expect(html).not.toContain('border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-surface-soft)]');
  });

  it('renders time range toolbars as shared operator controls', () => {
    const html = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ timeRange: 'last-1h', refresh: '30', tz: 'Asia/Shanghai' }}
        presets={[
          { value: 'last-30m', label: '30 minutes' },
          { value: 'last-1h', label: '1 hour' }
        ]}
        labels={{ preset: 'Time range', apply: 'Apply', refreshAction: 'Refresh now' }}
        onApply={() => undefined}
        onRefresh={() => undefined}
        presetSelectProps={{ 'data-monitor-history-time-range-select': 'true' } as React.HTMLAttributes<HTMLDivElement>}
        presetOptionDataAttribute="data-monitor-history-time-range-option"
        refreshActionProps={{ 'data-monitor-history-refresh-action': 'true' } as React.ButtonHTMLAttributes<HTMLButtonElement>}
      />
    );

    expect(html).toContain('data-hz-ui="time-range-toolbar"');
    expect(html).toContain('data-hz-time-range-toolbar-owner="hertzbeat-ui-time-range-toolbar"');
    expect(html).toContain('data-hz-time-range-toolbar-state="applied"');
    expect(html).toContain('data-hz-time-range-toolbar-card="false"');
    expect(html).toContain('data-hz-time-range-toolbar-layout="compact-lined-controls"');
    expect(html).toContain('data-hz-time-range-toolbar-density="operator-wrap-compact"');
    expect(html).toContain('data-hz-time-range-toolbar-family="signal-handoff-toolbar"');
    expect(html).toContain('data-hz-time-range-toolbar-action-family="signal-handoff-toolbar"');
    expect(html).toContain('data-hz-time-range-toolbar-select-family="signal-handoff-toolbar"');
    expect(html).toContain('data-hz-time-range-toolbar-preset-width="compact"');
    expect(html).toContain('max-w-[360px]');
    expect(html).toContain('data-monitor-history-time-range-select="true"');
    expect(html).toContain('data-monitor-history-time-range-option="last-1h"');
    expect(html).toContain('data-monitor-history-refresh-action="true"');
    expect(html).toContain('data-hz-ui="select"');
    expect(html).toContain('data-hz-ui="select-menu"');
    expect(html).toContain('border-[var(--hz-ui-line-soft)] bg-transparent');
    expect(html).not.toContain('border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]');
    expect(html).not.toContain('data-hz-time-range-toolbar-layout="stacked-operator-controls"');
    expect(html).not.toContain('bg-[var(--hz-ui-active)]');
    expect(html).not.toContain('min-w-[84px]');
    expect(html).not.toContain('min-w-[104px]');
    expect(html).not.toContain('grid min-w-[180px] flex-1 gap-1');
    expect(html).not.toContain('data-time-range-control="hertzbeat-shared"');
  });

  it('accepts canonical timezone values in the shared time range toolbar model', () => {
    const html = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ timeRange: 'last-1h', from: 'now-1h', to: 'now', timezone: 'Asia/Shanghai' } as any}
        labels={{ timezone: 'Timezone' }}
        onApply={() => undefined}
      />
    );

    expect(html).toContain('Asia/Shanghai');
    expect(html).toContain('data-hz-time-range-toolbar-model="expression-from-to"');
    expect(html).toContain('data-hz-time-range-toolbar-timezone-control="shared-timezone-select"');
    expect(html).toContain('data-hz-time-range-toolbar-timezone-option="local"');
    expect(html).toContain('data-hz-time-range-toolbar-timezone-option-route-key="local"');
    expect(html).toContain('data-hz-time-range-toolbar-timezone-option="Asia/Shanghai"');
    expect(html).toContain('data-hz-time-range-toolbar-timezone-option-route-key="timezone"');
  });

  it('lets live=false own the manual refresh state even when a stale refresh interval is present', () => {
    const html = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ timeRange: 'last-1h', from: 'now-1h', to: 'now', refresh: '60', live: 'false' }}
        labels={{ refresh: 'Refresh' }}
        onApply={() => undefined}
      />
    );

    expect(html).toContain('Manual');
    expect(html).not.toContain('>1m</span>');
  });

  it('keeps manual and interval refresh route values mutually exclusive in the shared time toolbar', () => {
    const source = readFileSync(resolve(__dirname, 'index.tsx'), 'utf8');

    expect(source).toContain('function normalizeHzTimeRangeToolbarRefresh');
    expect(source).toContain("value.live === 'false' ? '' : value.refresh || ''");
    expect(source).toContain('function resolveHzTimeRangeToolbarLiveDraft');
    expect(source).toContain("return refresh ? '' : 'false';");
    expect(source).toContain("if (field === 'refresh')");
  });

  it('exposes canonical auto and manual refresh state for platform time routes', () => {
    const autoHtml = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ from: 'now-1h', to: 'now', refresh: '30', tz: 'Asia/Shanghai' }}
        absoluteFieldsLayout="inline"
        absoluteInputMode="datetime-local"
        timeRangePickerMode="single"
        railLayout="nowrap"
        labels={{ preset: 'Time range', refresh: 'Refresh', timezone: 'Timezone', apply: 'Apply' }}
      />
    );
    const manualHtml = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ from: 'now-1h', to: 'now', refresh: '60', live: 'false', tz: 'Asia/Shanghai' }}
        absoluteFieldsLayout="inline"
        absoluteInputMode="datetime-local"
        timeRangePickerMode="single"
        railLayout="nowrap"
        labels={{ preset: 'Time range', refresh: 'Refresh', timezone: 'Timezone', apply: 'Apply' }}
      />
    );

    expect(autoHtml).toContain('data-hz-time-range-toolbar-refresh-mode="auto"');
    expect(autoHtml).toContain('data-hz-time-range-toolbar-refresh-interval="30"');
    expect(autoHtml).toContain('data-hz-time-range-toolbar-live-state="running"');
    expect(autoHtml).not.toContain('data-hz-time-range-toolbar-refresh-interval="30s"');
    expect(manualHtml).toContain('data-hz-time-range-toolbar-refresh-mode="manual"');
    expect(manualHtml).toContain('data-hz-time-range-toolbar-live-state="paused"');
    expect(manualHtml).not.toContain('data-hz-time-range-toolbar-refresh-interval="60"');
  });

  it('exposes canonical local and named timezone state for platform time routes', () => {
    const namedHtml = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ from: 'now-1h', to: 'now', tz: 'Asia/Shanghai' }}
        absoluteFieldsLayout="inline"
        absoluteInputMode="datetime-local"
        timeRangePickerMode="single"
        railLayout="nowrap"
        labels={{ preset: 'Time range', refresh: 'Refresh', timezone: 'Timezone', apply: 'Apply' }}
      />
    );
    const localHtml = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ from: 'now-1h', to: 'now' }}
        absoluteFieldsLayout="inline"
        absoluteInputMode="datetime-local"
        timeRangePickerMode="single"
        railLayout="nowrap"
        labels={{ preset: 'Time range', refresh: 'Refresh', timezone: 'Timezone', apply: 'Apply' }}
      />
    );

    expect(namedHtml).toContain('data-hz-time-range-toolbar-timezone-mode="named"');
    expect(namedHtml).toContain('data-hz-time-range-toolbar-timezone-value="Asia/Shanghai"');
    expect(namedHtml).toContain('data-hz-time-range-toolbar-timezone-route-key="timezone"');
    expect(namedHtml).toContain('data-hz-time-range-toolbar-timezone-control="shared-timezone-select"');
    expect(namedHtml).toContain('data-hz-time-range-toolbar-timezone-owner="hertzbeat-ui-time-range-toolbar"');
    expect(namedHtml).toContain('data-hz-time-range-toolbar-timezone-options="local-named"');
    expect(namedHtml).toContain('data-hz-time-range-toolbar-timezone-option="local"');
    expect(namedHtml).toContain('data-hz-time-range-toolbar-timezone-option-route-key="local"');
    expect(namedHtml).toContain('data-hz-time-range-toolbar-timezone-option-mode="local"');
    expect(namedHtml).toContain('data-hz-time-range-toolbar-timezone-option="Asia/Shanghai"');
    expect(namedHtml).toContain('data-hz-time-range-toolbar-timezone-option-route-key="timezone"');
    expect(namedHtml).toContain('data-hz-time-range-toolbar-timezone-option-mode="named"');
    expect(localHtml).toContain('data-hz-time-range-toolbar-timezone-mode="local"');
    expect(localHtml).toContain('data-hz-time-range-toolbar-timezone-route-key="local"');
    expect(localHtml).not.toContain('data-hz-time-range-toolbar-timezone-value=');
  });

  it('renders compact inline absolute time fields for monitor history toolbars', () => {
    const html = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ timeRange: 'last-1h', start: '1778985158146', end: '1778986674000', refresh: '', tz: '' }}
        absoluteFieldsLayout="inline"
        absoluteInputMode="datetime-local"
        timeRangePickerMode="single"
        railLayout="nowrap"
        labels={{ preset: 'Time range', start: 'Start', end: 'End', apply: 'Apply', deleteCustomRange: 'Delete saved range' }}
        onApply={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain('data-hz-ui="time-range-toolbar"');
    expect(html).toContain('data-hz-time-range-toolbar-time-entry="single-expression-picker"');
    expect(html).toContain('data-hz-time-range-toolbar-preset-placement="picker-panel"');
    expect(html).toContain('data-hz-time-range-toolbar-absolute="picker-panel"');
    expect(html).toContain('data-hz-time-range-toolbar-absolute-layout="single-picker"');
    expect(html).toContain('data-hz-time-range-toolbar-rail-layout="nowrap"');
    expect(html).toContain('data-hz-time-range-toolbar-overflow="horizontal-scroll"');
    expect(html).toContain('flex min-w-max flex-nowrap items-center gap-0.5');
    expect(html).toContain('data-hz-ui="expression-time-range-picker"');
    expect(html).toContain('data-hz-expression-time-range-picker-layout="expression-single-range"');
    expect(html).toContain('data-hz-expression-time-range-trigger="single-range"');
    expect(html).toContain('data-hz-expression-time-range-picker-trigger-width="compact"');
    expect(html).toContain('data-hz-time-range-toolbar-density="operator-single-row-tight"');
    expect(html).toContain('data-hz-time-range-toolbar-control-height="28"');
    expect(html).toContain('data-hz-time-range-toolbar-action-mode="icon-text"');
    expect(html).toContain('data-hz-time-range-toolbar-action="refresh"');
    expect(html).toContain('data-hz-time-range-toolbar-action="reset"');
    expect(html).toContain('data-hz-time-range-toolbar-action="apply"');
    expect(html).toContain('Refresh now');
    expect(html).toContain('Reset');
    expect(html).toContain('Apply');
    expect(html).toContain('data-hz-expression-time-range-picker-panel-width="560"');
    expect(html).toContain('max-w-[280px]');
    expect(html).not.toContain('max-w-[320px]');
    expect(html).not.toContain('max-w-[430px]');
    expect(html).not.toContain('h-8');
    expect(html).not.toContain('py-2');
    expect(html).toContain('data-hz-time-range-toolbar-absolute-control="expression-time-range-picker"');
    expect(html).toContain('data-hz-time-range-toolbar-absolute-input-mode="manual-text-with-picker"');
    expect(html).toContain('2026-05-17 10:32:38');
    expect(html).toContain('2026-05-17 10:57:54');
    expect(html).toContain('2026-05-17 10:32:38 - 2026-05-17 10:57:54');
    expect(html).toContain('data-hz-expression-time-range-hidden="from"');
    expect(html).toContain('data-hz-expression-time-range-hidden="to"');
    expect(html).not.toContain('data-hz-ui="date-time-picker"');
    expect(html).not.toContain('type="datetime-local"');
    expect(html).not.toContain('data-hz-time-range-toolbar-preset-width="compact"');
    expect(html).not.toContain('data-hz-ui="select" data-hz-select-family="native"');
    expect(html).not.toContain('value="1778985158146"');
    expect(html).not.toContain('value="1778986674000"');
    expect(html).not.toContain('flex-[1_1_100%]');
    expect(html).not.toContain('md:grid-cols-2');
  });

  it('keeps absolute time fields permanently visible when requested', () => {
    const html = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ timeRange: 'last-1h' }}
        showAbsoluteFields
        absoluteFieldsLayout="inline"
        absoluteInputMode="datetime-local"
        timeRangePickerMode="single"
        railLayout="nowrap"
        labels={{ preset: 'Time range', start: 'Start', end: 'End' }}
      />
    );

    expect(html).toContain('data-hz-time-range-toolbar-absolute="picker-panel"');
    expect(html).toContain('data-hz-time-range-toolbar-time-entry="single-expression-picker"');
    expect(html).toContain('aria-label="Time range"');
    expect(html).toContain('data-hz-ui="expression-time-range-picker"');
    expect(html).toContain('data-hz-expression-time-range-picker-layout="expression-single-range"');
    expect(html).toContain('data-hz-time-range-toolbar-rail-layout="nowrap"');
  });

  it('renders a date-math absolute time picker panel on the graphite black surface', () => {
    const html = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ timeRange: 'last-1h', start: '1778985158146', end: '1778986674000', refresh: '', tz: '' }}
        absoluteFieldsLayout="inline"
        absoluteInputMode="datetime-local"
        timeRangePickerMode="single"
        railLayout="nowrap"
        timePickerDefaultOpen
        labels={{ preset: 'Time range', start: 'Start', end: 'End', apply: 'Apply', deleteCustomRange: 'Delete saved range' }}
        onApply={() => undefined}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('data-hz-expression-time-range-picker-panel="open"');
    expect(html).toContain('data-hz-expression-time-range-picker-panel-tone="graphite-black"');
    expect(html).toContain('data-hz-expression-time-range-picker-panel-height="bounded-520"');
    expect(html).toContain('data-hz-expression-time-range-side-rail-scroll="bounded"');
    expect(html).toContain('max-h-[520px]');
    expect(html).toContain('data-hz-expression-time-range-quick-ranges="true"');
    expect(html).toContain('data-hz-expression-time-range-active-field="from"');
    expect(html).toContain('data-hz-expression-time-range-manual-input="from"');
    expect(html).toContain('data-hz-expression-time-range-manual-input="to"');
    expect(html).toContain('data-hz-expression-time-range-manual-input-mode="text"');
    expect(html).toContain('data-hz-expression-time-range-action="clear"');
    expect(html).toContain('data-hz-expression-time-range-action-owner="hertzbeat-ui-time-foundation-picker"');
    expect(html).toContain('data-hz-expression-time-range-action="apply"');
    expect(html).toContain('data-hz-expression-time-range-apply-owner="hertzbeat-ui-time-foundation-picker"');
    expect(html).toContain('value="2026-05-17 10:32:38"');
    expect(html).toContain('value="2026-05-17 10:57:54"');
    expect(html).toContain('data-hz-expression-calendar="layered"');
    expect(html).toContain('data-hz-expression-calendar-layer="day"');
    expect(html).toContain('data-hz-expression-calendar-day="true"');
    expect(html).toContain('data-hz-expression-time-stepper="hour"');
    expect(html).toContain('data-hz-expression-time-stepper="minute"');
    expect(html).toContain('data-hz-expression-time-stepper="second"');
    expect(html).toContain('Quick ranges');
    expect(html).toContain('Absolute time range');
    expect(html).toContain('From');
    expect(html).toContain('To');
    expect(html).not.toContain('type="date"');
    expect(html).not.toContain('bg-[var(--hz-ui-surface-raised)]');
    expect(html).not.toContain('bg-[var(--hz-ui-active)]');
  });

  it('structures the time picker panel without a redundant visible relative summary block', () => {
    const html = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ from: 'now-6h', to: 'now', refresh: '30', tz: 'Asia/Shanghai' }}
        absoluteFieldsLayout="inline"
        absoluteInputMode="datetime-local"
        timeRangePickerMode="single"
        railLayout="nowrap"
        timePickerDefaultOpen
        labels={{ preset: 'Time range', start: 'Start', end: 'End', apply: 'Apply', deleteCustomRange: 'Delete saved range' }}
        onApply={() => undefined}
      />
    );

    expect(html).toContain('data-hz-expression-time-range-panel-structure="quick-absolute-recent-custom"');
    expect(html).toContain('data-hz-expression-time-range-picker-panel-height="bounded-520"');
    expect(html).toContain('data-hz-expression-time-range-side-rail-scroll="bounded"');
    expect(html).toContain('data-hz-expression-time-range-panel-section="quick-ranges"');
    expect(html).toContain('data-hz-expression-time-range-panel-section="absolute-picker"');
    expect(html).toContain('data-hz-expression-time-range-panel-section="recent-ranges"');
    expect(html).toContain('data-hz-expression-time-range-panel-section="custom-range"');
    expect(html).toContain('data-hz-expression-time-range-relative-entry="manual-from-to-fields"');
    expect(html).toContain('data-hz-expression-time-range-manual-fields-layout="one-line-two-column"');
    expect(html).toContain('data-hz-expression-time-range-manual-fields-density="compact"');
    expect(html).toContain('data-hz-expression-time-range-manual-field-height="28"');
    expect(html).toContain('data-hz-expression-time-range-manual-input-width="readable-datetime"');
    expect(html).toContain('grid h-7 min-w-0 grid-cols-[auto_minmax(0,1fr)]');
    expect(html).toContain('data-hz-expression-time-range-validation-owner="hertzbeat-ui-time-foundation-picker"');
    expect(html).toContain('data-hz-expression-time-range-validation-field="from"');
    expect(html).toContain('data-hz-expression-time-range-validation-field="to"');
    expect(html).toContain('data-hz-expression-time-range-validation-state="valid"');
    expect(html).not.toContain('data-hz-expression-time-range-panel-section="relative-expression"');
    expect(html).not.toContain('Relative time');
    expect(html).toContain('Recent ranges');
    expect(html).toContain('Custom range');
  });

  it('renders the absolute calendar as i18n layered day, month, and decade views instead of one flattened panel', () => {
    const layeredLabels = {
      preset: 'Time range',
      start: 'Start',
      end: 'End',
      apply: 'Apply',
      weekdays: ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'],
      months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
      previousYears: 'Previous decade',
      nextYears: 'Next decade'
    };
    const dayHtml = renderToStaticMarkup(
      <HzExpressionTimeRangePicker
        from="2026-05-16 21:42:15"
        to="2026-05-16 22:42:15"
        defaultOpen
        variant="single"
        labels={layeredLabels}
      />
    );
    const monthHtml = renderToStaticMarkup(
      <HzExpressionTimeRangePicker
        from="2026-05-16 21:42:15"
        to="2026-05-16 22:42:15"
        defaultOpen
        defaultCalendarView="month"
        variant="single"
        labels={layeredLabels}
      />
    );
    const yearHtml = renderToStaticMarkup(
      <HzExpressionTimeRangePicker
        from="2026-05-16 21:42:15"
        to="2026-05-16 22:42:15"
        defaultOpen
        defaultCalendarView="year"
        variant="single"
        labels={layeredLabels}
      />
    );

    expect(dayHtml).toContain('data-hz-expression-calendar-layer="day"');
    expect(dayHtml).toContain('data-hz-expression-calendar-layer-action="month"');
    expect(dayHtml).toContain('data-hz-expression-calendar-month-title="Mayo 2026"');
    expect(dayHtml).toContain('Lu');
    expect(dayHtml).toContain('Do');
    expect(dayHtml).not.toContain('data-hz-expression-calendar-month-grid="true"');
    expect(dayHtml).not.toContain('data-hz-expression-calendar-year-grid="true"');

    expect(monthHtml).toContain('data-hz-expression-calendar-layer="month"');
    expect(monthHtml).toContain('data-hz-expression-calendar-layer-action="year"');
    expect(monthHtml).toContain('data-hz-expression-calendar-month-grid="true"');
    expect(monthHtml).toContain('data-hz-expression-calendar-month-option="5"');
    expect(monthHtml).toContain('Mayo');
    expect(monthHtml).not.toContain('data-hz-expression-calendar-day="true"');

    expect(yearHtml).toContain('data-hz-expression-calendar-layer="year"');
    expect(yearHtml).toContain('data-hz-expression-calendar-year-mode="decade-grid"');
    expect(yearHtml).toContain('data-hz-expression-calendar-year-min="1970"');
    expect(yearHtml).toContain('data-hz-expression-calendar-year-max="9999"');
    expect(yearHtml).toContain('data-hz-expression-calendar-year-page-size="10"');
    expect(yearHtml).toContain('data-hz-expression-calendar-year-page-step="10"');
    expect(yearHtml).toContain('data-hz-expression-calendar-year-range="2021-2030"');
    expect(yearHtml).toContain('data-hz-expression-calendar-year-page-action="previous"');
    expect(yearHtml).toContain('data-hz-expression-calendar-year-page-action="next"');
    expect(yearHtml).toContain('aria-label="Previous decade"');
    expect(yearHtml).toContain('aria-label="Next decade"');
    expect(yearHtml).toContain('data-hz-expression-calendar-year-grid="true"');
    expect(yearHtml).toContain('data-hz-expression-calendar-year-option="2026"');

    expect(dayHtml).toContain('data-hz-expression-time-stepper="hour"');
    expect(dayHtml).toContain('data-hz-expression-time-stepper="minute"');
    expect(dayHtml).toContain('data-hz-expression-time-stepper="second"');
    expect(dayHtml).toContain('data-hz-expression-time-input-mode="manual-stepper"');
    expect(dayHtml).toContain('data-hz-expression-time-stepper-action="decrement"');
    expect(dayHtml).toContain('data-hz-expression-time-stepper-action="increment"');
    expect(dayHtml).toContain('data-hz-number-stepper-input="true"');
    expect(dayHtml).toContain('type="text"');
    expect(dayHtml).toContain('class="min-w-0" data-hz-expression-time-stepper="hour"');
    expect(dayHtml).not.toContain('data-hz-expression-time-select="hour"');
    expect(dayHtml).not.toContain('data-hz-expression-time-select="minute"');
    expect(dayHtml).not.toContain('data-hz-expression-time-select="second"');
    expect(dayHtml).not.toContain('type="number"');
  });

  it('keeps the expression picker open for panel blank clicks and keeps time steppers outside label nesting', () => {
    const source = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');

    expect(source).toContain('const pointerDownInsideRef = React.useRef(false);');
    expect(source).toContain('onPointerDownCapture={() => {');
    expect(source).toContain('if (pointerDownInsideRef.current) return;');
    expect(source).toContain('aria-labelledby={`${panelId}-${item.unit}`}');
    const timeStepperSource = source.slice(
      source.indexOf("data-hz-expression-time-stepper={item.unit}"),
      source.indexOf('data-hz-expression-time-range-action="clear"')
    );
    expect(timeStepperSource).not.toContain('<label');
  });

  it('marks invalid manual date-math input before it can be treated as a query range', () => {
    const html = renderToStaticMarkup(
      <HzExpressionTimeRangePicker
        from="not-a-range"
        to="now"
        defaultOpen
        variant="single"
        labels={{ preset: 'Time range', start: 'Start', end: 'End', apply: 'Apply' }}
      />
    );

    expect(html).toContain('data-hz-expression-time-range-validation-field="from"');
    expect(html).toContain('data-hz-expression-time-range-validation-state="invalid"');
    expect(html).toContain('data-hz-expression-time-range-validation-field="to"');
    expect(html).toContain('data-hz-expression-time-range-validation-state="valid"');
    expect(html).toContain('data-hz-expression-time-range-apply-state="disabled"');
    expect(html).toContain('disabled=""');
  });

  it('prevents invalid time drafts from being applied by the shared toolbar action', () => {
    const html = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ from: 'not-a-range', to: 'now', refresh: '30', tz: 'Asia/Shanghai' }}
        absoluteFieldsLayout="inline"
        absoluteInputMode="datetime-local"
        timeRangePickerMode="single"
        railLayout="nowrap"
        timePickerDefaultOpen
        labels={{ preset: 'Time range', start: 'Start', end: 'End', apply: 'Apply' }}
        onApply={() => undefined}
      />
    );

    expect(html).toContain('data-hz-time-range-toolbar-validation-state="invalid"');
    expect(html).toContain('data-hz-time-range-toolbar-apply-state="disabled"');
    expect(html).toContain('data-hz-expression-time-range-apply-state="disabled"');
  });

  it('marks chart dataZoom time windows as preview state before query apply', () => {
    const html = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ from: '2026-05-17 15:30:00', to: '2026-05-17 16:30:00', refresh: '30', tz: 'Asia/Shanghai' }}
        previewSource="chart-datazoom"
        absoluteFieldsLayout="inline"
        absoluteInputMode="datetime-local"
        timeRangePickerMode="single"
        railLayout="nowrap"
        labels={{ preset: 'Time range', start: 'Start', end: 'End', apply: 'Apply' }}
        onApply={() => undefined}
      />
    );

    expect(html).toContain('data-hz-time-range-toolbar-state="preview"');
    expect(html).toContain('data-hz-time-range-toolbar-preview-source="chart-datazoom"');
    expect(html).toContain('2026-05-17 15:30:00 - 2026-05-17 16:30:00');
    expect(html).toContain('data-hz-time-range-toolbar-apply-state="enabled"');
    expect(html).not.toContain('data-hz-time-range-toolbar-state="applied"');
  });

  it('renders a reusable dataZoom preview handoff for deterministic preview apply reset flows', () => {
    const html = renderToStaticMarkup(
      <HzTimeRangePreviewHandoff
        state="preview"
        source="chart-datazoom"
        from="2026-05-17 15:30:00"
        to="2026-05-17 16:30:00"
        applyLabel="Apply as query time"
        resetLabel="Reset"
        simulateLabel="Simulate chart zoom"
      />
    );

    expect(html).toContain('data-hz-ui="time-range-preview-handoff"');
    expect(html).toContain('data-hz-time-range-preview-handoff-owner="hertzbeat-ui-time-range-preview-handoff"');
    expect(html).toContain('data-hz-time-range-preview-handoff-model="chart-datazoom-preview-apply-reset"');
    expect(html).toContain('data-hz-time-range-preview-handoff-state="preview"');
    expect(html).toContain('data-hz-time-range-preview-handoff-source="chart-datazoom"');
    expect(html).toContain('data-hz-time-range-preview-handoff-from="2026-05-17 15:30:00"');
    expect(html).toContain('data-hz-time-range-preview-handoff-to="2026-05-17 16:30:00"');
    expect(html).toContain('data-hz-time-range-preview-handoff-action="simulate"');
    expect(html).toContain('data-hz-time-range-preview-handoff-action="apply"');
    expect(html).toContain('data-hz-time-range-preview-handoff-action="reset"');
    expect(html).toContain('2026-05-17 15:30:00 - 2026-05-17 16:30:00');
    expect(html).not.toContain('1778985158146');
  });

  it('formats incoming raw numeric route timestamps before rendering the shared toolbar UX', () => {
    const html = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ from: '1778985158146', to: 'now', refresh: '30', tz: 'Asia/Shanghai' }}
        absoluteFieldsLayout="inline"
        absoluteInputMode="datetime-local"
        timeRangePickerMode="single"
        railLayout="nowrap"
        timePickerDefaultOpen
        labels={{ preset: 'Time range', start: 'Start', end: 'End', apply: 'Apply' }}
        onApply={() => undefined}
      />
    );

    expect(html).toContain('value="2026-05-17 10:32:38.146"');
    expect(html).toContain('2026-05-17 10:32:38.146 - now');
    expect(html).toContain('data-hz-expression-time-range-validation-state="valid"');
    expect(html).toContain('data-hz-time-range-toolbar-apply-state="enabled"');
    expect(html).not.toContain('1778985158146 - now');
    expect(html).not.toContain('value="1778985158146"');
  });

  it('renders absolute expression ranges with a space separator instead of ISO T in the visible UX', () => {
    const html = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ from: '2026-05-01T22:53:47', to: '2026-05-23T23:53:57', refresh: '', tz: 'Asia/Shanghai' }}
        absoluteFieldsLayout="inline"
        absoluteInputMode="datetime-local"
        timeRangePickerMode="single"
        railLayout="nowrap"
        timePickerDefaultOpen
        labels={{ preset: 'Time range', start: 'Start', end: 'End', apply: 'Apply' }}
        onApply={() => undefined}
      />
    );

    const triggerMarkup = html.match(/<button[^>]*data-hz-expression-time-range-trigger="single-range"[\s\S]*?<\/button>/)?.[0] ?? '';
    expect(triggerMarkup).toContain('2026-05-01 22:53:47 - 2026-05-23 23:53:57');
    expect(triggerMarkup).not.toContain('2026-05-01T22:53:47');
    expect(html).toContain('value="2026-05-01 22:53:47"');
    expect(html).toContain('value="2026-05-23 23:53:57"');
    expect(html).not.toContain('data-hz-expression-time-range-manual-input="from" value="2026-05-01T22:53:47"');
    expect(html).not.toContain('data-hz-expression-time-range-manual-input="to" value="2026-05-23T23:53:57"');
  });

  it('rejects manually typed raw numeric timestamp drafts in the shared time picker UX', () => {
    const html = renderToStaticMarkup(
      <HzExpressionTimeRangePicker
        from="1778985158146"
        to="now"
        defaultOpen
        variant="single"
        labels={{ preset: 'Time range', start: 'Start', end: 'End', apply: 'Apply' }}
      />
    );

    expect(html).toContain('value="1778985158146"');
    expect(html).toContain('data-hz-expression-time-range-validation-field="from"');
    expect(html).toContain('data-hz-expression-time-range-validation-state="invalid"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('data-hz-expression-time-range-apply-state="disabled"');
    expect(html).not.toContain('data-hz-expression-time-range-validation-state="valid" value="1778985158146"');
  });

  it('renders recoverable recent ranges through the shared time foundation picker', () => {
    const html = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ from: 'now-1h', to: 'now', refresh: '30', tz: 'Asia/Shanghai' }}
        recentRanges={[
          { id: 'recent-last-hour', label: 'Last applied hour', from: 'now-1h', to: 'now', refresh: '30', tz: 'Asia/Shanghai' },
          {
            id: 'recent-absolute-window',
            label: 'Absolute deploy window',
            start: '2026-05-17 10:32:38',
            end: '2026-05-17 10:57:54',
            refresh: '60',
            live: 'false',
            timezone: 'UTC'
          }
        ]}
        recentStorageKey="hertzbeat-test-time-ranges"
        absoluteFieldsLayout="inline"
        absoluteInputMode="datetime-local"
        timeRangePickerMode="single"
        railLayout="nowrap"
        timePickerDefaultOpen
        labels={{ preset: 'Time range', start: 'Start', end: 'End', apply: 'Apply' }}
        onApply={() => undefined}
      />
    );

    expect(html).toContain('data-hz-time-range-toolbar-recent-storage-key="hertzbeat-test-time-ranges"');
    expect(html).toContain('data-hz-expression-time-range-recent-ranges="persistent"');
    expect(html).toContain('data-hz-expression-time-range-recent-range="recent-last-hour"');
    expect(html).toContain('data-hz-expression-time-range-recent-range-owner="hertzbeat-ui-time-foundation-picker"');
    expect(html).toContain('data-hz-expression-time-range-recent-range-route-model="expression-from-to"');
    expect(html).toContain('data-hz-expression-time-range-recent-range-from="now-1h"');
    expect(html).toContain('data-hz-expression-time-range-recent-range-to="now"');
    expect(html).toContain('data-hz-expression-time-range-recent-range-refresh="30"');
    expect(html).toContain('data-hz-expression-time-range-recent-range-timezone="Asia/Shanghai"');
    expect(html).toContain('data-hz-expression-time-range-recent-range-entry="recent-absolute-window"');
    expect(html).toContain('data-hz-expression-time-range-recent-range-route-model="absolute-start-end"');
    expect(html).toContain('data-hz-expression-time-range-recent-range-live="false"');
    expect(html).toContain('data-hz-expression-time-range-recent-range-timezone="UTC"');
    expect(html).toContain('Last applied hour');
    expect(html).toContain('Absolute deploy window');
  });

  it('renders savable custom ranges through the shared time foundation picker', () => {
    const html = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ from: 'now-2h', to: 'now', refresh: '30', tz: 'Asia/Shanghai' }}
        customRanges={[
          { id: 'custom-release-window', label: 'Release window', from: 'now-2h', to: 'now', refresh: '60', live: 'false', tz: 'Asia/Shanghai' }
        ]}
        customStorageKey="hertzbeat-test-custom-time-ranges"
        absoluteFieldsLayout="inline"
        absoluteInputMode="datetime-local"
        timeRangePickerMode="single"
        railLayout="nowrap"
        timePickerDefaultOpen
        labels={{ preset: 'Time range', start: 'Start', end: 'End', apply: 'Apply', deleteCustomRange: 'Delete saved range' }}
        onApply={() => undefined}
      />
    );

    expect(html).toContain('data-hz-time-range-toolbar-custom-storage-key="hertzbeat-test-custom-time-ranges"');
    expect(html).toContain('data-hz-time-range-toolbar-custom-ranges="persistent"');
    expect(html).toContain('data-hz-expression-time-range-custom-range="save-current-range"');
    expect(html).toContain('data-hz-expression-time-range-custom-ranges="persistent"');
    expect(html).toContain('data-hz-expression-time-range-custom-name-input="true"');
    expect(html).toContain('data-hz-expression-time-range-custom-save="current-range"');
    expect(html).toContain('data-hz-expression-time-range-custom-save-owner="hertzbeat-ui-time-foundation-picker"');
    expect(html).toContain('data-hz-expression-time-range-custom-range-entry="custom-release-window"');
    expect(html).toContain('data-hz-expression-time-range-custom-range-owner="hertzbeat-ui-time-foundation-picker"');
    expect(html).toContain('data-hz-expression-time-range-custom-range-route-model="expression-from-to"');
    expect(html).toContain('data-hz-expression-time-range-custom-range-from="now-2h"');
    expect(html).toContain('data-hz-expression-time-range-custom-range-to="now"');
    expect(html).toContain('data-hz-expression-time-range-custom-range-refresh="60"');
    expect(html).toContain('data-hz-expression-time-range-custom-range-live="false"');
    expect(html).toContain('data-hz-expression-time-range-custom-range-timezone="Asia/Shanghai"');
    expect(html).toContain('data-hz-expression-time-range-custom-range-delete="custom-release-window"');
    expect(html).toContain('data-hz-expression-time-range-custom-range-delete-owner="hertzbeat-ui-time-foundation-picker"');
    expect(html).toContain('data-hz-expression-time-range-custom-range-delete-label="Delete saved range"');
    expect(html).toContain('aria-label="Delete saved range: Release window"');
    expect(html).toContain('Delete saved range');
    expect(html).toContain('Release window');

    const source = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');
    expect(source).toContain('const [deletedCustomRangeIds, setDeletedCustomRangeIds]');
    expect(source).toContain('.filter(range => !deletedCustomRangeIdSet.has(range.id))');
    expect(source).toContain('onPointerDown={event => {');
    expect(source).toContain('onMouseDown={event => {');
    expect(source).toContain('event.preventDefault();');
    expect(source).toContain('setDeletedCustomRangeIds(current => current.includes(range.id) ? current : [...current, range.id])');
    expect(source).toContain('writeHzTimeRangeCustomRanges(customStorageKey, nextCustomRanges);');
  });

  it('exposes selectable calendar and single editable time steppers as the shared time foundation picker contract', () => {
    const html = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ from: '2026-05-17 10:32:38', to: '2026-05-17 10:57:54', refresh: '30', tz: 'Asia/Shanghai' }}
        absoluteFieldsLayout="inline"
        absoluteInputMode="datetime-local"
        timeRangePickerMode="single"
        railLayout="nowrap"
        timePickerDefaultOpen
        labels={{ preset: 'Time range', start: 'Start', end: 'End', apply: 'Apply' }}
        onApply={() => undefined}
      />
    );

    expect(html).toContain('data-hz-expression-calendar-owner="hertzbeat-ui-time-foundation-picker"');
    expect(html).toContain('data-hz-expression-calendar-value="2026-05"');
    expect(html).toContain('data-hz-expression-calendar-day-value="2026-05-17"');
    expect(html).toContain('aria-label="Select date 2026-05-17"');
    expect(html).toContain('data-hz-expression-calendar-day-selected="true"');
    expect(html).toContain('data-hz-expression-time-stepper-owner="hertzbeat-ui-time-foundation-picker"');
    expect(html).toContain('data-hz-expression-time-stepper-unit="hour"');
    expect(html).toContain('data-hz-expression-time-stepper-unit="minute"');
    expect(html).toContain('data-hz-expression-time-stepper-unit="second"');
    expect(html).toContain('data-hz-expression-time-stepper-value="10"');
    expect(html).toContain('data-hz-expression-time-stepper-value="32"');
    expect(html).toContain('data-hz-expression-time-stepper-value="38"');
    expect(html.match(/data-hz-expression-time-stepper-owner="hertzbeat-ui-time-foundation-picker"/g)?.length).toBe(3);
    expect(html).not.toContain('data-hz-expression-time-select-owner="hertzbeat-ui-time-foundation-picker"');
    expect(html).not.toContain('data-hz-expression-calendar-owner="local-monitor-picker"');
  });

  it('keeps date-math from/to expressions editable in the shared time range picker', () => {
    const html = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ from: 'now-6h', to: 'now', refresh: '30', tz: 'Asia/Shanghai' }}
        absoluteFieldsLayout="inline"
        absoluteInputMode="datetime-local"
        timeRangePickerMode="single"
        railLayout="nowrap"
        timePickerDefaultOpen
        labels={{ preset: 'Time range', start: 'Start', end: 'End', apply: 'Apply' }}
        onApply={() => undefined}
      />
    );

    expect(html).toContain('data-hz-time-range-toolbar-model="expression-from-to"');
    expect(html).toContain('data-hz-time-range-toolbar-time-entry="single-expression-picker"');
    expect(html).toContain('data-hz-expression-time-range-expression-mode="from-to"');
    expect(html).toContain('data-hz-expression-time-range-expression-display="raw"');
    expect(html).toContain('data-hz-expression-time-range-hidden="from-expression"');
    expect(html).toContain('data-hz-expression-time-range-hidden="to-expression"');
    expect(html).toContain('value="now-6h"');
    expect(html).toContain('value="now"');
    expect(html).toContain('now-6h - now');
    expect(html).not.toContain('Select time - Select time');
  });

  it('shows matched quick range labels on the closed picker while preserving date math values for editing', () => {
    const html = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ timeRange: 'last-1h', from: 'now-1h', to: 'now', refresh: '', tz: '' }}
        absoluteFieldsLayout="inline"
        absoluteInputMode="datetime-local"
        timeRangePickerMode="single"
        railLayout="nowrap"
        labels={{ preset: 'Time range', start: 'Start', end: 'End', apply: 'Apply' }}
        onApply={() => undefined}
      />
    );

    const triggerMarkup = html.match(/<button[^>]*data-hz-expression-time-range-trigger="single-range"[\s\S]*?<\/button>/)?.[0] ?? '';
    expect(triggerMarkup).toContain('Last 1 hour');
    expect(triggerMarkup).not.toContain('now-1h - now');
    expect(html).toContain('data-hz-expression-time-range-hidden="from-expression"');
    expect(html).toContain('value="now-1h"');
    expect(html).toContain('value="now"');
  });

  it('normalizes explicit time picker apply values so manual ranges do not carry stale quick presets', () => {
    const source = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');

    expect(source).toContain('const expressionRangeOwnsValue = Boolean(value.from && value.to);');
    expect(source).toContain('const absoluteRangeOwnsValue = Boolean(parsedStart && parsedEnd);');
    expect(source).toContain('timeRange: expressionRangeOwnsValue || absoluteRangeOwnsValue ? undefined : value.timeRange || undefined');
  });

  it('clears explicit range drafts when a split toolbar quick range is selected', () => {
    const source = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');

    expect(source).toContain("onChange={event => setDraft(current => ({ ...current, timeRange: event.target.value, from: '', to: '', start: '', end: '' }))}");
  });

  it('anchors relative date-math picker calendars to the current operator day instead of an invalid expression date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 17, 16, 12, 57));

    const html = renderToStaticMarkup(
      <HzTimeRangeToolbar
        value={{ from: 'now-6h', to: 'now', refresh: '30', tz: 'Asia/Shanghai' }}
        absoluteFieldsLayout="inline"
        absoluteInputMode="datetime-local"
        timeRangePickerMode="single"
        railLayout="nowrap"
        timePickerDefaultOpen
        labels={{ preset: 'Time range', start: 'Start', end: 'End', apply: 'Apply' }}
        onApply={() => undefined}
      />
    );

    expect(html).toContain('value="now-6h"');
    expect(html).toContain('value="now"');
    expect(html).toContain('data-hz-expression-calendar-day-selected="true"');
    expect(html).toMatch(/data-hz-expression-calendar-day-selected="true"[^>]*>17<\/button>/);
    expect(html).not.toMatch(/data-hz-expression-calendar-day-selected="true"[^>]*>1<\/button>/);
  });

  it('renders monitor detail tabs as shared underline toggles instead of toolbar cards', () => {
    const html = renderToStaticMarkup(
      <HzMonitorDetailTabs
        items={[
          { key: 'realtime', label: 'Realtime' },
          { key: 'history', label: 'History' },
          { key: 'favorites', label: 'Favorites' }
        ]}
        selectedKey="history"
        onSelect={vi.fn()}
        panelIdPrefix="monitor-detail"
        extra={<HzButton>Refresh</HzButton>}
      />
    );

    expect(html).toContain('data-hz-ui="monitor-detail-tabs"');
    expect(html).toContain('data-monitor-detail-tabs-owner="hertzbeat-ui-monitor-detail-tabs"');
    expect(html).toContain('data-monitor-detail-tabs-variant="bottom-underline-switch"');
    expect(html).toContain('data-monitor-detail-tabs-control-baseline="underline-28"');
    expect(html).toContain('data-monitor-detail-tabs-family="top-tab-underline"');
    expect(html).toContain('data-monitor-detail-tabs-extra="true"');
    expect(html).toContain('data-monitor-detail-tabs-extra-slot="true"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Tab navigation"');
    expect(html).toContain('id="monitor-detail-tab-history"');
    expect(html).toContain('aria-controls="monitor-detail-panel-history"');
    expect(html).toContain('data-monitor-detail-tab-underline="true"');
    expect(html).toContain('data-monitor-detail-tab-underline-selected="true"');
    expect(html).toContain('data-monitor-detail-tab-control-baseline="underline-28"');
    expect(html).toContain('data-hz-control-height="28"');
    expect(html).toContain('data-hz-control-edge="bottom-underline"');
    expect(html).toContain('data-monitor-detail-tab-visual-family="top-tab-underline"');
    expect(html).toContain('h-7');
    expect(html).toContain('data-selected-tab="history"');
    expect(html).toContain('after:absolute');
    expect(html).not.toContain('min-h-10');
    expect(html).not.toContain('sm:self-end');
    expect(html).not.toContain('pb-1');
    expect(html).not.toContain('data-monitor-detail-tabs-variant="compact-toolbar-buttons"');
    expect(html).not.toContain('data-monitor-detail-tab-toolbar-button="true"');
    expect(html).not.toContain('data-hz-control-edge="lined"');
    expect(html).not.toContain('border-[var(--hz-ui-line-soft)] bg-transparent px-2');
    expect(html).not.toContain('border-b-[var(--hz-ui-accent)]');
    expect(html).not.toContain('data-monitor-detail-tab-accent-card="true"');
    expect(html).not.toContain('data-monitor-detail-tab-card="true"');
    expect(html).not.toContain('rounded-t-[3px]');
    expect(html).not.toContain('data-observability-tab-card');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders monitor detail tab labels through the shared underline label primitive', () => {
    const ActivityIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
      <svg className={className} {...props} />
    );

    const html = renderToStaticMarkup(
      <HzMonitorDetailTabLabel tabKey="realtime" icon={ActivityIcon}>
        Realtime
      </HzMonitorDetailTabLabel>
    );

    expect(html).toContain('data-hz-ui="monitor-detail-tab-label"');
    expect(html).toContain('data-monitor-detail-tab-label-owner="hertzbeat-ui-detail-tab-label"');
    expect(html).toContain('data-monitor-detail-tab-label-source="angular-title"');
    expect(html).toContain('data-monitor-detail-tab-label="realtime"');
    expect(html).toContain('data-monitor-detail-tab-icon="realtime"');
    expect(html).toContain('data-monitor-detail-tab-icon-owner="hertzbeat-ui-detail-tab-label"');
    expect(html).toContain('inline-flex');
    expect(html).toContain('h-3.5');
  });

  it('renders monitor detail refresh and signal handoff as one shared toolbar primitive', () => {
    const RoutedLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
      (props, ref) => <a ref={ref} data-routed-link="true" {...props} />
    );
    RoutedLink.displayName = 'RoutedLink';

    const html = renderToStaticMarkup(
      <HzMonitorRefreshToolbar
        refreshLabel="Refresh soon 18s"
        refreshActionLabel="Refresh"
        selectedRefresh="30"
        refreshOptions={[
          { value: '10', label: '10s' },
          { value: '30', label: '30s' },
          { value: '-1', label: 'Off' }
        ]}
        signalLinks={[
          {
            id: 'metrics',
            href: '/ingestion/otlp/metrics',
            label: 'Metrics',
            icon: <span aria-hidden="true">M</span>,
            component: RoutedLink
          }
        ]}
        refreshIcon={<span aria-hidden="true">R</span>}
        onRefresh={() => undefined}
        onRefreshChange={() => undefined}
      />
    );

    expect(html).toContain('data-hz-ui="monitor-refresh-toolbar"');
    expect(html).toContain('data-hz-monitor-refresh-toolbar-layout="single-row-compact"');
    expect(html).toContain('data-monitor-refresh-toolbar-owner="hertzbeat-ui-refresh-toolbar"');
    expect(html).toContain('data-monitor-refresh-toolbar-density="inline-quiet-controls"');
    expect(html).toContain('data-monitor-signal-handoff-owner="hertzbeat-ui-icon-link-group"');
    expect(html).toContain('data-monitor-signal-handoff-link-owner="hertzbeat-ui-icon-link"');
    expect(html).toContain('data-monitor-signal-handoff-link="metrics"');
    expect(html).toContain('data-monitor-signal-handoff-control-baseline="button-28-lined"');
    expect(html).toContain('data-monitor-signal-handoff-link-control="button-28-lined"');
    expect(html).toContain('data-monitor-refresh-badge-owner="hertzbeat-ui-status-badge"');
    expect(html).toContain('data-monitor-refresh-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-monitor-refresh-action-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-monitor-refresh-command-action="refresh"');
    expect(html).toContain('data-monitor-refresh-badge-variant="quiet"');
    expect(html).toContain('data-monitor-refresh-select-density="quiet"');
    expect(html).toContain('data-monitor-refresh-action-density="quiet"');
    expect(html).toContain('data-monitor-refresh-control-baseline="control-32-lined"');
    expect(html).toContain('data-hz-control-height="32"');
    expect(html).toContain('data-hz-control-height="28"');
    expect(html).toContain('data-hz-control-edge="lined"');
    expect(html).toContain('h-8');
    expect(html).toContain('h-7');
    expect(html).toContain('border-[var(--hz-ui-line-soft)]');
    expect(html).toContain('data-hz-ui="status-badge"');
    expect(html).toContain('data-hz-ui="select"');
    expect(html).toContain('data-hz-ui="button"');
    expect(html).toContain('data-routed-link="true"');
    expect(html).not.toContain('border-transparent');
    expect(html).not.toContain('data-monitor-refresh-badge-variant="bordered"');
    expect(html).not.toContain('data-monitor-refresh-select-density="bordered"');
    expect(html).not.toContain('data-monitor-refresh-action-density="bordered"');
    expect(html).not.toContain('data-hz-monitor-refresh-toolbar-layout="stacked-card"');
    expect(html).not.toContain('rounded-[12px]');
    expect(html).not.toContain('rounded-[14px]');
  });

  it('keeps primitive fields on 32px while action buttons use a tighter 28px baseline', () => {
    const RoutedLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
      (props, ref) => <a ref={ref} data-routed-link="true" {...props} />
    );
    RoutedLink.displayName = 'RoutedLink';

    const html = renderToStaticMarkup(
      <div>
        <HzButton size="sm">Small action</HzButton>
        <HzButton size="sm" intent="ghost">Ghost action</HzButton>
        <HzButtonLink href="/download.svg" download="download.svg" size="xs">
          Download SVG
        </HzButtonLink>
        <HzButton size="icon" aria-label="Icon action">I</HzButton>
        <HzIconLink component={RoutedLink} href="/target" label="Open target">
          O
        </HzIconLink>
        <HzHeaderIconButton label="Mute notifications" state="active" data-app-frame-icon-trigger="mute">
          M
        </HzHeaderIconButton>
        <HzHeaderMenuAction label="Exit fullscreen" state="active" data-app-frame-settings-fullscreen-action="angular-toggle">
          F
        </HzHeaderMenuAction>
        <HzLocaleMenuOption abbr="CN" label="Simplified Chinese" selected data-app-frame-locale-option="zh-CN" />
        <HzUserMenuAction item="logout" label="Logout" data-app-frame-user-action="logout">
          L
        </HzUserMenuAction>
        <HzPassportLoginActionFrame>
          <form>login controls</form>
        </HzPassportLoginActionFrame>
        <HzPassportSessionClearFrame>session clear</HzPassportSessionClearFrame>
        <HzPassportSessionClearFrame lifecycle="preserve-on-lock">lock keeps session</HzPassportSessionClearFrame>
        <HzPassportLoginNotice copy="Please update the initial default password in time!" href="https://hertzbeat.apache.org/docs/start/account-modify" />
        <HzPassportLoginValidationNotice title="attention" copy="Please enter your username" />
        <HzHeaderRealtimeNotice
          status="live"
          title="New Alert"
          description="checkout-service latency breach"
          meta="ALERT_EVENT"
        />
        <HzPassportLockSurface
          title="Unlock"
          passwordLabel="Password"
          passwordPlaceholder="Input password"
          buttonLabel="Unlock"
          password=""
          avatarSrc="./assets/img/avatar.svg"
          avatarAlt="ops-admin"
          disabled
          data-passport-lock-panel-owner="hertzbeat-ui-passport-lock"
        />
        <HzInput value="mysql-prod-01" readOnly />
        <HzSelect
          aria-label="Control mode"
          value="manual"
          options={[
            { value: 'manual', label: 'Manual' },
            { value: 'auto', label: 'Auto' }
          ]}
        />
        <HzNumberStepper value="60" onValueChange={() => undefined} />
        <HzCheckbox label="Enabled" defaultChecked />
        <HzSwitch checked label="Running" />
        <HzFileInput aria-label="Import monitors" />
      </div>
    );

    expect(hertzBeatUiControlBaseline.heightPx).toBe(32);
    expect(hertzBeatUiControlBaseline.buttonHeightPx).toBe(28);
    expect(hertzBeatUiControlBaseline.buttonHeightsPx).toEqual({ xs: 24, sm: 28, md: 32, lg: 40, icon: 28 });
    expect(hertzBeatUiControlBaseline.defaultButtonSize).toBe('sm');
    expect(hertzBeatUiControlBaseline.fieldEdge).toBe('lined');
    expect(hertzBeatUiControlBaseline.buttonTiers).toEqual(['flat-neutral', 'solid-primary', 'solid-danger']);
    expect(hertzBeatUiControlBaseline.componentScope).toEqual(
      expect.arrayContaining(['HzButton', 'HzButtonIcon', 'HzButtonLink', 'HzHeaderIconButton', 'HzHeaderRealtimeNotice', 'HzAboutModalSurface', 'HzPassportLockSurface', 'HzTableRowActionButton', 'HzDisabledActionShell', 'HzActionGroup', 'HzChipGroup', 'HzControlStack', 'HzDetailAside', 'HzDetailBodyStack', 'HzDialogBodyLayout', 'HzDialogEventNotice', 'HzDialogEventText', 'HzDialogMetaItem', 'HzSignalSummaryItem', 'HzSignalSummaryStrip', 'HzSignalWorkbenchShell', 'HzSearchFieldIcon', 'HzPanelSection', 'HzPanelTitleLabel', 'HzTrendBar', 'HzTrendFrame', 'HzWorkbenchHeaderCopy', 'HzWorkbenchLayout', 'HzIconLink', 'HzInput', 'HzSelect', 'HzNumberStepper', 'HzCheckbox', 'HzSwitch', 'HzUnderlineToggle'])
    );
    expect(hertzBeatUiControlBaseline.componentScope).toContain('HzHeaderMenuAction');
    expect(hertzBeatUiControlBaseline.componentScope).toContain('HzLocaleMenuOption');
    expect(hertzBeatUiControlBaseline.componentScope).toContain('HzPassportLoginActionFrame');
    expect(hertzBeatUiControlBaseline.componentScope).toContain('HzPassportLoginNotice');
    expect(hertzBeatUiControlBaseline.componentScope).toContain('HzPassportLoginValidationNotice');
    expect(hertzBeatUiControlBaseline.componentScope).toContain('HzPassportSessionClearFrame');
    expect(hertzBeatUiControlBaseline.componentScope).toContain('HzUserMenuAction');
    expect(html).toContain('data-hz-ui="header-menu-action"');
    expect(html).toContain('data-hz-header-menu-action-owner="hertzbeat-ui-header-menu-action"');
    expect(html).toContain('data-hz-header-menu-action-density="angular-header-menu-item"');
    expect(html).toContain('data-hz-header-menu-action-state="active"');
    expect(html).toContain('data-hz-ui="locale-menu-option"');
    expect(html).toContain('data-hz-locale-menu-option-owner="hertzbeat-ui-locale-menu-option"');
    expect(html).toContain('data-hz-locale-menu-option-density="angular-header-locale-item"');
    expect(html).toContain('data-hz-locale-menu-option-selected="true"');
    expect(html).toContain('data-hz-locale-menu-option-indicator="selected"');
    expect(html).toContain('data-hz-ui="user-menu-action"');
    expect(html).toContain('data-hz-user-menu-action-owner="hertzbeat-ui-user-menu-action"');
    expect(html).toContain('data-hz-user-menu-action-density="angular-user-menu-item"');
    expect(html).toContain('data-hz-user-menu-action-item="logout"');
    expect(html).toContain('data-hz-ui="passport-login-action-frame"');
    expect(html).toContain('data-hz-passport-login-action-owner="hertzbeat-ui-passport-login-action"');
    expect(html).toContain('data-hz-passport-login-submit-lifecycle="angular-required-default-warning-session-bootstrap-redirect"');
    expect(html).toContain('data-hz-passport-login-required-fields="identifier-credential"');
    expect(html).toContain('data-hz-passport-login-required-mode="angular-required-no-trim"');
    expect(html).toContain('data-hz-passport-login-default-password="angular-first-submit-warning"');
    expect(html).toContain('data-hz-passport-login-default-password-lifecycle="angular-sticky-until-submit"');
    expect(html).toContain('data-hz-passport-login-token-boundary="bff-cookie-no-localstorage"');
    expect(html).toContain('data-hz-passport-login-session-bootstrap="angular-startup-load-after-success"');
    expect(html).toContain('data-hz-passport-login-session-user-name="angular-raw-identifier"');
    expect(html).toContain('data-hz-passport-login-startup-failure="angular-exception-500"');
    expect(html).toContain('data-hz-passport-login-redirect="angular-referrer-non-passport-fallback"');
    expect(html).toContain('data-hz-passport-login-redirect-fallback="angular-root-fallback"');
    expect(html).toContain('data-hz-passport-login-remember-default="true"');
    expect(html).toContain('data-hz-ui="passport-session-clear-frame"');
    expect(html).toContain('data-hz-passport-session-clear-owner="hertzbeat-ui-passport-session-clear"');
    expect(html).toContain('data-hz-passport-session-clear-lifecycle="angular-token-service-clear-on-passport-entry"');
    expect(html).toContain('data-hz-passport-session-clear-scope="client-marker-user-snapshot"');
    expect(html).toContain('data-hz-passport-session-clear-boundary="no-api-logout-on-entry"');
    expect(html).toContain('data-hz-passport-session-clear-lifecycle="angular-lock-preserve-session"');
    expect(html).toContain('data-hz-passport-session-clear-scope="client-marker-user-snapshot-preserved"');
    expect(html).toContain('data-hz-passport-session-clear-boundary="no-session-clear-on-lock"');
    expect(html).toContain('data-hz-ui="passport-login-notice"');
    expect(html).toContain('data-hz-passport-login-notice-owner="hertzbeat-ui-passport-login-notice"');
    expect(html).toContain('data-hz-passport-login-notice-density="angular-warning-alert"');
    expect(html).toContain('data-hz-passport-login-notice-tone="warning"');
    expect(html).toContain('data-hz-passport-login-notice-link="account-modify"');
    expect(html).toContain('data-hz-ui="passport-login-validation-notice"');
    expect(html).toContain('data-hz-passport-login-validation-owner="hertzbeat-ui-passport-login-validation"');
    expect(html).toContain('data-hz-passport-login-validation-density="angular-error-alert"');
    expect(html).toContain('data-hz-passport-login-validation-tone="danger"');
    expect(html).toContain('data-hz-passport-login-validation-title="shared"');
    expect(html).toContain('data-hz-passport-login-validation-copy="shared"');
    expect(html).toContain('data-hz-ui="header-realtime-notice"');
    expect(html).toContain('data-hz-header-realtime-notice-owner="hertzbeat-ui-header-realtime-notice"');
    expect(html).toContain('data-hz-header-realtime-notice-density="angular-notice-sse"');
    expect(html).toContain('data-hz-header-realtime-notice-status="live"');
    expect(html).toContain('data-hz-ui="passport-lock-surface"');
    expect(html).toContain('data-hz-passport-lock-owner="hertzbeat-ui-passport-lock"');
    expect(html).toContain('data-hz-passport-lock-density="angular-lock-card"');
    expect(html).toContain('data-hz-passport-lock-submit-lifecycle="angular-mark-dirty-required-then-dashboard"');
    expect(html).toContain('data-hz-passport-lock-required-fields="password"');
    expect(html).toContain('data-hz-passport-lock-required-mode="angular-required-no-trim"');
    expect(html).toContain('data-hz-passport-lock-redirect="angular-dashboard-next-overview"');
    expect(html).toContain('data-hz-passport-lock-submit-disabled="angular-invalid-disabled"');
    expect(html).toContain('data-hz-passport-lock-avatar="angular-floating"');
    expect(html).toContain('data-hz-passport-lock-avatar-source="settings-user-avatar"');
    expect(html).toContain('data-hz-passport-lock-avatar-img="settings-user-avatar"');
    expect(html).toContain('alt="ops-admin"');
    expect(html).toContain('./assets/img/avatar.svg');
    expect(html).toContain('data-hz-passport-lock-submit-state="disabled"');
    expect(html).toContain('data-hz-control-height="32"');
    expect(html).toContain('data-hz-control-height="28"');
    expect(html).toContain('data-hz-control-edge="flat"');
    expect(html).toContain('data-hz-control-edge="lined"');
    expect(html).toContain('h-8');
    expect(html).toContain('h-7');
    expect(html).toContain('border-[var(--hz-ui-line-soft)]');
    expect(html).toContain('data-hz-button-tier="flat-neutral"');
    expect(html).toContain('data-hz-ui="button-link"');
    expect(html).toContain('data-hz-ui="header-icon-button"');
    expect(html).toContain('data-hz-header-icon-button-owner="hertzbeat-ui-header-icon-button"');
    expect(html).toContain('data-hz-header-icon-button-density="angular-header-item"');
    expect(html).toContain('data-hz-header-icon-button-state="active"');
    expect(html).toContain('data-app-frame-icon-trigger="mute"');
    expect(html).toContain('download.svg');
  });

  it('renders the Angular about dialog contract through the shared modal surface', () => {
    const html = renderToStaticMarkup(
      <HzAboutModalSurface
        title="HertzBeat is an open source observability platform"
        points={['Metric collection', 'Log troubleshooting', 'Alert handling', 'Notification channels', 'Template definitions', 'Collector clusters']}
        help="Thanks for using HertzBeat."
        version="v1.8.0"
        releaseHref="https://github.com/apache/hertzbeat/releases/tag/v1.8.0"
        copyright="Copyright © 2026 | Apache HertzBeat™"
        notShowLabel="Do not show next login"
        notShowChecked
        closeLabel="Close dialog"
        communityLinks={[
          { href: 'https://github.com/apache/hertzbeat', label: 'GitHub' },
          { href: 'https://hertzbeat.apache.org/docs/', label: 'Docs' }
        ]}
      />
    );

    expect(html).toContain('data-hz-ui="about-modal-surface"');
    expect(html).toContain('data-hz-about-modal-owner="hertzbeat-ui-about-modal"');
    expect(html).toContain('data-hz-about-modal-density="angular-about-modal"');
    expect(html).toContain('data-hz-about-modal-open="true"');
    expect(html).toContain('data-hz-about-modal-closable="false"');
    expect(html).toContain('data-hz-about-modal-cancel="angular-on-cancel"');
    expect(html).not.toContain('data-hz-about-modal-close="shared"');
    expect(html).toContain('data-hz-about-modal-brand="apache-hertzbeat"');
    expect(html).toContain('data-hz-about-modal-title="shared"');
    expect(html).toContain('data-hz-about-modal-points="shared"');
    expect(html).toContain('data-hz-about-modal-point="6"');
    expect(html).toContain('data-hz-about-modal-release="shared"');
    expect(html).toContain('href="https://github.com/apache/hertzbeat/releases/tag/v1.8.0"');
    expect(html).toContain('data-hz-about-modal-not-show="shared"');
    expect(html).toContain('checked=""');
    expect(html).toContain('data-hz-about-modal-community-link="shared"');
  });

  it('keeps about community link keys stable when multiple actions share one href', () => {
    const source = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');

    expect(source).toContain('key={`${link.href}-${link.label}`}');
    expect(source).not.toContain('key={link.href}');
  });

  it('can opt into an explicit about close button when a non-Angular surface needs one', () => {
    const html = renderToStaticMarkup(
      <HzAboutModalSurface
        title="About"
        points={['One', 'Two', 'Three', 'Four', 'Five', 'Six']}
        help="Help"
        version="v1.8.0"
        releaseHref="https://github.com/apache/hertzbeat/releases/tag/v1.8.0"
        copyright="Copyright © 2026"
        notShowLabel="Do not show next login"
        closeLabel="Close dialog"
        closable
        communityLinks={[{ href: 'https://github.com/apache/hertzbeat', label: 'GitHub' }]}
      />
    );

    expect(html).toContain('data-hz-about-modal-closable="true"');
    expect(html).toContain('data-hz-about-modal-close="shared"');
  });

  it('renders anchor actions through the shared button link primitive instead of hand-authored button chrome', () => {
    const html = renderToStaticMarkup(
      <HzButtonLink
        href="/history.svg"
        download="history.svg"
        size="xs"
        layout="full"
        data-monitor-history-download-owner="hertzbeat-ui-button-link"
      >
        Download SVG
      </HzButtonLink>
    );

    expect(html).toContain('data-hz-ui="button-link"');
    expect(html).toContain('data-hz-control-height="24"');
    expect(html).toContain('data-hz-control-edge="flat"');
    expect(html).toContain('data-hz-button-tier="flat-neutral"');
    expect(html).toContain('data-hz-button-link-layout="full"');
    expect(html).toContain('w-full');
    expect(html).toContain('data-monitor-history-download-owner="hertzbeat-ui-button-link"');
    expect(html).toContain('href="/history.svg"');
    expect(html).toContain('download="history.svg"');
    expect(html).not.toContain('bg-[var(--hz-ui-action-bg)]');
  });

  it('renders disabled full-width actions through the shared button primitive', () => {
    const html = renderToStaticMarkup(
      <HzButton size="md" layout="full" disabled data-metrics-disabled-handoff-owner="hertzbeat-ui-button">
        Entity
      </HzButton>
    );

    expect(html).toContain('data-hz-ui="button"');
    expect(html).toContain('data-hz-control-height="32"');
    expect(html).toContain('data-hz-button-tier="flat-neutral"');
    expect(html).toContain('data-hz-button-layout="full"');
    expect(html).toContain('w-full');
    expect(html).toContain('px-2');
    expect(html).toContain('disabled=""');
    expect(html).toContain('data-metrics-disabled-handoff-owner="hertzbeat-ui-button"');
  });

  it('owns dense table row action button sizing instead of leaving root-span cells to pages', () => {
    const html = renderToStaticMarkup(
      <HzTableRowActionButton
        width="root-span"
        data-trace-manage-row-action-owner="hertzbeat-ui-table-row-action-button"
      >
        POST /api/monitors/detect
      </HzTableRowActionButton>
    );

    expect(html).toContain('data-hz-ui="button"');
    expect(html).toContain('data-hz-table-row-action-owner="hertzbeat-ui-table-row-action-button"');
    expect(html).toContain('data-hz-table-row-action-width="root-span"');
    expect(html).toContain('data-trace-manage-row-action-owner="hertzbeat-ui-table-row-action-button"');
    expect(html).toContain('data-hz-control-height="24"');
    expect(html).toContain('data-hz-control-edge="flat"');
    expect(html).toContain('data-hz-button-tier="flat-neutral"');
    expect(html).toContain('max-w-[240px]');
    expect(html).toContain('justify-start');
    expect(html).toContain('truncate');
    expect(html).toContain('font-semibold');
    expect(html).not.toContain('min-w-[84px]');
    expect(html).not.toContain('min-w-[104px]');
  });

  it('owns disabled action title shells instead of leaving inline-flex wrappers to pages', () => {
    const html = renderToStaticMarkup(
      <HzDisabledActionShell
        title="Missing trace"
        data-trace-manage-disabled-action-owner="hertzbeat-ui-disabled-action-shell"
      >
        <HzButton disabled size="md">View logs</HzButton>
      </HzDisabledActionShell>
    );

    expect(html).toContain('data-hz-ui="disabled-action-shell"');
    expect(html).toContain('data-hz-disabled-action-shell-owner="hertzbeat-ui-disabled-action-shell"');
    expect(html).toContain('data-hz-disabled-action-shell-layout="inline"');
    expect(html).toContain('data-trace-manage-disabled-action-owner="hertzbeat-ui-disabled-action-shell"');
    expect(html).toContain('title="Missing trace"');
    expect(html).toContain('inline-flex');
    expect(html).toContain('data-hz-ui="button"');
    expect(html).toContain('data-hz-control-height="32"');
    expect(html).toContain('disabled=""');
  });

  it('owns full-width disabled action wrappers for metric handoffs', () => {
    const html = renderToStaticMarkup(
      <HzDisabledActionShell
        title="Missing entity"
        layout="full"
        data-otlp-metrics-entity-action-disabled-shell-owner="hertzbeat-ui-disabled-action-shell"
      >
        <HzButton disabled size="md" layout="full">Entity</HzButton>
      </HzDisabledActionShell>
    );

    expect(html).toContain('data-hz-ui="disabled-action-shell"');
    expect(html).toContain('data-hz-disabled-action-shell-owner="hertzbeat-ui-disabled-action-shell"');
    expect(html).toContain('data-hz-disabled-action-shell-layout="full"');
    expect(html).toContain('data-otlp-metrics-entity-action-disabled-shell-owner="hertzbeat-ui-disabled-action-shell"');
    expect(html).toContain('class="inline-flex w-full"');
    expect(html).toContain('data-hz-button-layout="full"');
    expect(html).toContain('disabled=""');
  });

  it('owns compact icon action grouping instead of leaving row action spacing to pages', () => {
    const RoutedLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
      (props, ref) => <a ref={ref} data-routed-link="true" {...props} />
    );
    RoutedLink.displayName = 'RoutedLink';

    const html = renderToStaticMarkup(
      <HzActionGroup density="compact-icons" data-monitor-row-actions-owner="hertzbeat-ui-action-group">
        <HzIconLink component={RoutedLink} href="/monitors/42/edit" label="Edit monitor">
          E
        </HzIconLink>
        <HzIconButton label="Copy monitor">C</HzIconButton>
      </HzActionGroup>
    );

    expect(html).toContain('data-hz-ui="action-group"');
    expect(html).toContain('data-hz-action-group-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('data-hz-action-group-density="compact-icons"');
    expect(html).toContain('data-monitor-row-actions-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('flex-nowrap');
    expect(html).toContain('gap-1.5');
    expect(html).not.toContain('rounded-[14px]');
  });

  it('owns split action grouping for monitor toolbars without page-local justify classes', () => {
    const html = renderToStaticMarkup(
      <HzActionGroup layout="split" density="inline" data-monitor-history-action-owner="hertzbeat-ui-action-group">
        <HzActionGroup density="inline">
          <HzButton size="sm">Raw</HzButton>
        </HzActionGroup>
        <HzActionGroup density="inline">
          <HzButton size="sm">Refresh</HzButton>
        </HzActionGroup>
      </HzActionGroup>
    );

    expect(html).toContain('data-hz-ui="action-group"');
    expect(html).toContain('data-hz-action-group-layout="split"');
    expect(html).toContain('w-full');
    expect(html).toContain('justify-between');
    expect(html).toContain('data-monitor-history-action-owner="hertzbeat-ui-action-group"');
  });

  it('owns right-aligned action grouping for stream/list switch controls', () => {
    const html = renderToStaticMarkup(
      <>
        <HzActionGroup layout="end-wrap" density="inline" data-log-manage-view-toggle-group-owner="hertzbeat-ui-action-group">
          <HzButton size="md">Stream</HzButton>
          <HzButton size="md">History</HzButton>
        </HzActionGroup>
        <HzActionGroup layout="full-end" density="inline" data-trace-manage-header-action-row-owner="hertzbeat-ui-action-group">
          <HzButton size="md">Collector</HzButton>
        </HzActionGroup>
        <HzActionGroup layout="end-wrap" density="inline" data-metrics-chart-toolbar-actions-owner="hertzbeat-ui-action-group">
          <HzStatusBadge tone="neutral" size="xs">0 series</HzStatusBadge>
          <HzButton size="sm">Apply zoom</HzButton>
        </HzActionGroup>
      </>
    );

    expect(html).toContain('data-hz-ui="action-group"');
    expect(html).toContain('data-hz-action-group-layout="end-wrap"');
    expect(html).toContain('data-hz-action-group-layout="full-end"');
    expect(html).toContain('data-log-manage-view-toggle-group-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('data-trace-manage-header-action-row-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('data-metrics-chart-toolbar-actions-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('ml-auto');
    expect(html).toContain('w-full');
    expect(html).toContain('justify-end');
  });

  it('owns two-column action grouping for dense detail footers', () => {
    const html = renderToStaticMarkup(
      <HzActionGroup layout="grid-2" density="inline" data-metrics-handoff-actions-owner="hertzbeat-ui-action-group">
        <HzButton size="md">Entity</HzButton>
        <HzButton size="md">Alerts</HzButton>
      </HzActionGroup>
    );

    expect(html).toContain('data-hz-ui="action-group"');
    expect(html).toContain('data-hz-action-group-layout="grid-2"');
    expect(html).toContain('data-metrics-handoff-actions-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('grid');
    expect(html).toContain('w-full');
    expect(html).toContain('grid-cols-2');
    expect(html).toContain('gap-2');
    expect(html).not.toContain('border-t border');
    expect(html).not.toContain('px-4');
  });

  it('owns stacked action grouping for dense monitor chart controls', () => {
    const html = renderToStaticMarkup(
      <HzActionGroup layout="stack" density="inline" data-monitor-history-line-action-stack-owner="hertzbeat-ui-action-group">
        <HzActionGroup density="inline">
          <HzButton size="xs" intent="ghost">
            Primary only
          </HzButton>
        </HzActionGroup>
        <HzActionGroup density="inline">
          <HzButton size="xs" intent="secondary">
            Mean
          </HzButton>
        </HzActionGroup>
      </HzActionGroup>
    );

    expect(html).toContain('data-hz-ui="action-group"');
    expect(html).toContain('data-hz-action-group-layout="stack"');
    expect(html).toContain('flex-col');
    expect(html).toContain('items-start');
    expect(html).toContain('data-monitor-history-line-action-stack-owner="hertzbeat-ui-action-group"');
  });

  it('owns inline chip grouping for dialog badges and metadata', () => {
    const html = renderToStaticMarkup(
      <HzChipGroup
        align="end"
        boundary="top"
        density="compact"
        spacing="top-3"
        data-metrics-header-context-strip-owner="hertzbeat-ui-toolbar-chips"
        data-signal-dialog-toolbar-chips-owner="hertzbeat-ui-toolbar-chips"
      >
        <HzStatusBadge size="xs" tone="neutral">
          JSON
        </HzStatusBadge>
        <HzInlineContextMark active={false} className="h-6 text-[11px]">
          traceId · trace-20260523
        </HzInlineContextMark>
      </HzChipGroup>
    );

    expect(html).toContain('data-hz-ui="chip-group"');
    expect(html).toContain('data-hz-chip-group-owner="hertzbeat-ui-toolbar-chips"');
    expect(html).toContain('data-hz-chip-group-align="end"');
    expect(html).toContain('data-hz-chip-group-density="compact"');
    expect(html).toContain('data-hz-chip-group-boundary="top"');
    expect(html).toContain('data-hz-chip-group-spacing="top-3"');
    expect(html).toContain('data-metrics-header-context-strip-owner="hertzbeat-ui-toolbar-chips"');
    expect(html).toContain('data-signal-dialog-toolbar-chips-owner="hertzbeat-ui-toolbar-chips"');
    expect(html).toContain('border-t');
    expect(html).toContain('justify-end');
    expect(html).toContain('gap-1.5');
    expect(html).toContain('mt-3');
    expect(html).toContain('data-hz-ui="status-badge"');
    expect(html).toContain('data-hz-ui="inline-context-mark"');
    expect(html).not.toContain('rounded-[14px]');
  });

  it('owns dialog metadata item sizing for trace drawer chips', () => {
    const html = renderToStaticMarkup(
      <HzChipGroup data-trace-manage-drawer-meta-owner="hertzbeat-ui-toolbar-chips">
        <HzDialogMetaItem
          data-trace-manage-drawer-meta-item="trace-id"
          data-trace-manage-drawer-meta-item-owner="hertzbeat-ui-dialog-meta-item"
          width="trace-id"
        >
          trace-20260523
        </HzDialogMetaItem>
        <HzDialogMetaItem
          data-trace-manage-drawer-meta-item="duration"
          data-trace-manage-drawer-meta-item-owner="hertzbeat-ui-dialog-meta-item"
          width="duration"
        >
          420 ms
        </HzDialogMetaItem>
      </HzChipGroup>
    );

    expect(html).toContain('data-hz-ui="inline-context-mark"');
    expect(html).toContain('data-hz-inline-context-mark-owner="hertzbeat-ui-inline-context-mark"');
    expect(html).toContain('data-hz-dialog-meta-item-owner="hertzbeat-ui-dialog-meta-item"');
    expect(html).toContain('data-hz-dialog-meta-item-width="trace-id"');
    expect(html).toContain('data-hz-dialog-meta-item-width="duration"');
    expect(html).toContain('data-trace-manage-drawer-meta-item-owner="hertzbeat-ui-dialog-meta-item"');
    expect(html).toContain('h-6 text-[11px] max-w-[320px] font-mono');
    expect(html).toContain('h-6 text-[11px] max-w-[160px]');
  });

  it('owns dialog body layout rhythm for stacks and split detail views', () => {
    const html = renderToStaticMarkup(
      <HzDialogBodyLayout data-log-stream-detail-dialog-body-owner="hertzbeat-ui-dialog-body-layout">
        <HzDialogBodyLayout variant="split-detail" data-log-related-trace-body-layout-owner="hertzbeat-ui-dialog-body-layout">
          <div>Timeline</div>
          <HzDialogBodyLayout variant="side-stack" data-log-related-trace-side-stack-owner="hertzbeat-ui-dialog-body-layout">
            <div>Facts</div>
          </HzDialogBodyLayout>
        </HzDialogBodyLayout>
        <HzDialogBodyLayout variant="waterfall-detail" data-trace-manage-drawer-body-layout-owner="hertzbeat-ui-dialog-body-layout">
          <div>Waterfall</div>
          <HzDialogBodyLayout variant="side-stack" data-trace-manage-drawer-side-stack-owner="hertzbeat-ui-dialog-body-layout">
            <div>Span facts</div>
          </HzDialogBodyLayout>
        </HzDialogBodyLayout>
      </HzDialogBodyLayout>
    );

    expect(html).toContain('data-hz-ui="dialog-body-layout"');
    expect(html).toContain('data-hz-dialog-body-layout-owner="hertzbeat-ui-dialog-body-layout"');
    expect(html).toContain('data-hz-dialog-body-layout-variant="stack"');
    expect(html).toContain('data-hz-dialog-body-layout-variant="split-detail"');
    expect(html).toContain('data-hz-dialog-body-layout-variant="waterfall-detail"');
    expect(html).toContain('data-hz-dialog-body-layout-variant="side-stack"');
    expect(html).toContain('xl:grid-cols-[minmax(0,1fr)_300px]');
    expect(html).toContain('xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]');
    expect(html).toContain('gap-3');
    expect(html).toContain('data-log-stream-detail-dialog-body-owner="hertzbeat-ui-dialog-body-layout"');
    expect(html).toContain('data-log-related-trace-body-layout-owner="hertzbeat-ui-dialog-body-layout"');
    expect(html).toContain('data-log-related-trace-side-stack-owner="hertzbeat-ui-dialog-body-layout"');
    expect(html).toContain('data-trace-manage-drawer-body-layout-owner="hertzbeat-ui-dialog-body-layout"');
    expect(html).toContain('data-trace-manage-drawer-side-stack-owner="hertzbeat-ui-dialog-body-layout"');
    expect(html).not.toContain('rounded-[14px]');
  });

  it('owns compact control stacks for monitor search fields and helper meta', () => {
    const html = renderToStaticMarkup(
      <>
        <HzControlStack data-monitor-realtime-search-stack-owner="hertzbeat-ui-control-stack">
          <HzInput value="" onChange={() => {}} placeholder="Search rows" />
          <HzDataMetaText>3 / 8 rows</HzDataMetaText>
        </HzControlStack>
        <HzControlStack
          layout="inline-wrap"
          spacing="top-2"
          data-otlp-metrics-context-control-stack-owner="hertzbeat-ui-control-stack"
          data-trace-manage-query-control-stack-owner="hertzbeat-ui-control-stack"
        >
          <HzInput value="" onChange={() => {}} placeholder="Service" />
          <HzButton>Run</HzButton>
        </HzControlStack>
        <HzControlStack layout="end-inline" data-trace-manage-time-control-owner="hertzbeat-ui-control-stack">
          <HzDataMetaText display="block" casing="plain">
            Time range rail
          </HzDataMetaText>
        </HzControlStack>
        <HzControlStack data-log-manage-stream-detail-action-stack-owner="hertzbeat-ui-control-stack" className="mt-4">
          <HzButton size="md">Open log</HzButton>
          <HzButton size="md">Open trace</HzButton>
        </HzControlStack>
      </>
    );

    expect(html).toContain('data-hz-ui="control-stack"');
    expect(html).toContain('data-hz-control-stack-owner="hertzbeat-ui-control-stack"');
    expect(html).toContain('data-hz-control-stack-layout="stack"');
    expect(html).toContain('data-hz-control-stack-layout="inline-wrap"');
    expect(html).toContain('data-hz-control-stack-layout="end-inline"');
    expect(html).toContain('data-hz-control-stack-spacing="none"');
    expect(html).toContain('data-hz-control-stack-spacing="top-2"');
    expect(html).toContain('data-monitor-realtime-search-stack-owner="hertzbeat-ui-control-stack"');
    expect(html).toContain('data-otlp-metrics-context-control-stack-owner="hertzbeat-ui-control-stack"');
    expect(html).toContain('data-trace-manage-query-control-stack-owner="hertzbeat-ui-control-stack"');
    expect(html).toContain('data-trace-manage-time-control-owner="hertzbeat-ui-control-stack"');
    expect(html).toContain('data-log-manage-stream-detail-action-stack-owner="hertzbeat-ui-control-stack"');
    expect(html).toContain('grid min-w-0 gap-2');
    expect(html).toContain('flex min-w-0 flex-wrap items-center gap-2 mt-2');
    expect(html).toContain('flex max-w-full justify-end');
    expect(html).toContain('data-hz-ui="input"');
    expect(html).toContain('data-hz-ui="button"');
    expect(html).toContain('data-hz-ui="data-meta-text"');
  });

  it('owns workbench layouts for table and side-detail surfaces', () => {
    const html = renderToStaticMarkup(
      <>
        <HzWorkbenchLayout as="div" variant="header-actions" data-trace-manage-header-layout-owner="hertzbeat-ui-workbench-layout">
          <div>Title</div>
          <div>Actions</div>
        </HzWorkbenchLayout>
        <HzWorkbenchLayout as="div" variant="metrics-header" data-otlp-metrics-header-layout-owner="hertzbeat-ui-workbench-layout">
          <div>Metrics title</div>
          <div>Metrics toolbar</div>
        </HzWorkbenchLayout>
        <HzWorkbenchLayout as="div" variant="metrics-series-detail" data-otlp-metrics-workbench-grid-owner="hertzbeat-ui-workbench-layout">
          <HzPanelSurface data-panel="series">Series</HzPanelSurface>
          <HzPanelSurface data-panel="detail">Detail</HzPanelSurface>
        </HzWorkbenchLayout>
        <HzWorkbenchLayout as="div" variant="metrics-series-only" data-otlp-metrics-workbench-empty-grid-owner="hertzbeat-ui-workbench-layout">
          <HzPanelSurface data-panel="series-only">Series only</HzPanelSurface>
        </HzWorkbenchLayout>
        <HzWorkbenchLayout as="div" variant="header-toolbar-slot" data-otlp-metrics-header-topbar-owner="hertzbeat-ui-workbench-layout">
          <HzWorkbenchLayout as="div" variant="time-toolbar">Time toolbar</HzWorkbenchLayout>
        </HzWorkbenchLayout>
        <HzWorkbenchLayout as="div" variant="time-toolbar" data-trace-manage-time-toolbar-owner="hertzbeat-ui-workbench-layout">
          <div>Time control</div>
          <HzActionGroup>
            <HzButtonLink href="/trace/manage" size="md">Refresh</HzButtonLink>
          </HzActionGroup>
        </HzWorkbenchLayout>
        <HzWorkbenchLayout as="div" variant="view-switch" data-log-manage-view-switch-layout-owner="hertzbeat-ui-workbench-layout">
          <div>Stream / history</div>
          <HzActionGroup layout="end-wrap">
            <HzButton size="md">Stream</HzButton>
          </HzActionGroup>
        </HzWorkbenchLayout>
        <HzWorkbenchLayout as="div" variant="stream-stage" data-log-manage-stream-stage-layout-owner="hertzbeat-ui-workbench-layout">
          <div>Live viewport</div>
          <aside>Selected log</aside>
        </HzWorkbenchLayout>
        <HzWorkbenchLayout as="div" variant="summary-trend" data-trace-manage-chart-layout-owner="hertzbeat-ui-workbench-layout">
          <HzStatCell label="Total" value="8" variant="tile" />
          <HzStatCell label="Errors" value="2" variant="tile" />
          <HzStatCell label="Rows" value="8" variant="tile" />
          <HzStatCell label="Latest" value="now" variant="tile" />
          <div>Trend</div>
        </HzWorkbenchLayout>
        <HzWorkbenchLayout as="div" variant="chart-stack" data-otlp-metrics-chart-layout-owner="hertzbeat-ui-workbench-layout">
          <HzPanelSurface data-panel="chart">Chart</HzPanelSurface>
        </HzWorkbenchLayout>
        <HzWorkbenchLayout as="div" variant="metrics-chart-toolbar" data-otlp-metrics-chart-header-layout-owner="hertzbeat-ui-workbench-layout">
          <HzPanelTitleLabel>Time series</HzPanelTitleLabel>
          <HzActionGroup layout="end-wrap">
            <HzStatusBadge tone="neutral" size="xs">0 series</HzStatusBadge>
          </HzActionGroup>
        </HzWorkbenchLayout>
        <HzWorkbenchLayout as="div" variant="detail-stack" data-trace-manage-detail-body-layout-owner="hertzbeat-ui-workbench-layout">
          <HzDetailRows rows={[{ key: 'trace', title: 'Trace', copy: 'trace-123' }]} />
          <HzAttributeDiagnostics
            title="Attribution"
            rows={[{ key: 'entity-id', label: 'hertzbeat.entity_id', value: 'entity-checkout', state: 'present', stateLabel: 'Present', tone: 'success' }]}
          />
        </HzWorkbenchLayout>
        <HzWorkbenchLayout as="div" variant="detail-footer" data-trace-manage-detail-footer-layout-owner="hertzbeat-ui-workbench-layout">
          <HzStateNotice title="Carry this trace context into logs and metrics." variant="hint" />
          <HzButton size="md">Open logs</HzButton>
        </HzWorkbenchLayout>
        <HzWorkbenchLayout variant="table-detail" data-trace-manage-table-detail-layout-owner="hertzbeat-ui-workbench-layout">
          <HzPanelSurface data-panel="table">Table</HzPanelSurface>
          <HzPanelSurface data-panel="detail">Detail</HzPanelSurface>
        </HzWorkbenchLayout>
      </>
    );

    expect(html).toContain('data-hz-ui="workbench-layout"');
    expect(html).toContain('data-hz-workbench-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-hz-workbench-layout-variant="header-actions"');
    expect(html).toContain('2xl:grid-cols-[minmax(280px,1fr)_auto]');
    expect(html).not.toContain('xl:grid-cols-[minmax(0,1fr)_auto]');
    expect(html).toContain('data-hz-workbench-layout-variant="metrics-header"');
    expect(html).toContain('2xl:grid-cols-[minmax(280px,1fr)_minmax(780px,auto)]');
    expect(html).not.toContain('gap-3 xl:grid-cols-[minmax(280px,1fr)_minmax(780px,auto)] xl:items-start');
    expect(html).toContain('data-hz-workbench-layout-variant="header-toolbar-slot"');
    expect(html).toContain('data-hz-workbench-layout-variant="time-toolbar"');
    expect(html).toContain('data-hz-workbench-layout-variant="view-switch"');
    expect(html).toContain('data-hz-workbench-layout-variant="stream-stage"');
    expect(html).toContain('data-hz-workbench-layout-variant="summary-trend"');
    expect(html).toContain('data-hz-workbench-layout-variant="chart-stack"');
    expect(html).toContain('data-hz-workbench-layout-variant="metrics-chart-toolbar"');
    expect(html).toContain('data-hz-workbench-layout-variant="metrics-series-detail"');
    expect(html).toContain('data-hz-workbench-layout-variant="metrics-series-only"');
    expect(html).toContain('data-hz-workbench-layout-variant="detail-stack"');
    expect(html).toContain('data-hz-workbench-layout-variant="detail-footer"');
    expect(html).toContain('data-hz-workbench-layout-variant="table-detail"');
    expect(html).toContain('data-trace-manage-header-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-otlp-metrics-header-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-otlp-metrics-workbench-grid-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-otlp-metrics-workbench-empty-grid-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-otlp-metrics-header-topbar-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('grid min-w-0 justify-end xl:justify-self-end');
    expect(html).toContain('data-trace-manage-time-toolbar-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-log-manage-view-switch-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-log-manage-stream-stage-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-trace-manage-chart-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-otlp-metrics-chart-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-otlp-metrics-chart-header-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-trace-manage-detail-body-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-trace-manage-detail-footer-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-trace-manage-table-detail-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('<div class="grid min-w-0 gap-4 2xl:grid-cols-[minmax(280px,1fr)_auto] 2xl:items-start"');
    expect(html).toContain('grid min-w-0 gap-3 2xl:grid-cols-[minmax(280px,1fr)_minmax(780px,auto)] 2xl:items-start');
    expect(html).toContain('grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_440px]');
    expect(html).toContain('grid min-w-0 items-start gap-4');
    expect(html).toContain('grid min-w-0 ml-auto w-full max-w-[1120px] justify-end gap-2 xl:w-auto');
    expect(html).toContain('grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center');
    expect(html).toContain('grid min-w-0 min-h-[520px] lg:grid-cols-[minmax(0,1fr)_320px]');
    expect(html).toContain('grid min-w-0 gap-3 lg:grid-cols-[repeat(4,minmax(0,160px))_minmax(0,1fr)]');
    expect(html).toContain('grid min-w-0 items-start gap-3');
    expect(html).toContain('grid min-w-0 mb-3 gap-2 text-[12px] text-[#8792a5] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center');
    expect(html).toContain('grid min-w-0 gap-3 px-4 py-4');
    expect(html).toContain('grid min-w-0 gap-2 border-t border-[#252b35] px-4 py-4');
    expect(html).toContain('grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_330px]');
    expect(html).toContain('data-hz-ui="panel-surface"');
    expect(html).toContain('data-hz-ui="stat-cell"');
    expect(html).toContain('data-hz-ui="detail-rows"');
    expect(html).toContain('data-hz-ui="attribute-diagnostics"');
    expect(html).toContain('data-hz-ui="state-notice"');
    expect(html).not.toContain('rounded-[14px]');
  });

  it('owns monitor fullscreen chrome with one shared frame primitive', () => {
    const html = renderToStaticMarkup(
      <HzMonitorFullscreenFrame
        title="History detail"
        kicker="Monitor history"
        closeLabel="Exit fullscreen"
        onClose={() => undefined}
        data-monitor-history-fullscreen-owner="hertzbeat-ui-fullscreen-frame"
      >
        <div>Chart body</div>
      </HzMonitorFullscreenFrame>
    );

    expect(html).toContain('data-hz-ui="monitor-fullscreen-frame"');
    expect(html).toContain('data-hz-monitor-fullscreen-panel="true"');
    expect(html).toContain('data-hz-monitor-fullscreen-header="true"');
    expect(html).toContain('data-hz-monitor-fullscreen-body="true"');
    expect(html).toContain('data-hz-monitor-fullscreen-close="true"');
    expect(html).toContain('data-monitor-history-fullscreen-owner="hertzbeat-ui-fullscreen-frame"');
    expect(html).toContain('History detail');
    expect(html).toContain('Exit fullscreen');
    expect(html).not.toContain('rounded-[14px]');
  });

  it('renders action buttons as flat neutral or solid primary tiers while select triggers stay lined', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzButton intent="primary">Apply filters</HzButton>
        <HzButton intent="secondary">Import monitor</HzButton>
        <HzButton intent="danger">Delete selected</HzButton>
        <HzButton intent="ghost">Clear</HzButton>
        <HzButton size="xs">XS</HzButton>
        <HzButton size="sm">SM</HzButton>
        <HzButton size="md">MD</HzButton>
        <HzButton size="lg">LG</HzButton>
        <HzSelect
          aria-label="Status"
          value="all"
          options={[
            { value: 'all', label: 'All status' },
            { value: 'up', label: 'Normal' }
          ]}
        />
      </div>
    );

    const buttonHtml = html.match(/<button[^>]*data-hz-ui="button"[^>]*>/g) ?? [];
    expect(buttonHtml).toHaveLength(8);
    const [
      primaryButton = '',
      secondaryButton = '',
      dangerButton = '',
      ghostButton = '',
      xsButton = '',
      smButton = '',
      mdButton = '',
      lgButton = ''
    ] = buttonHtml;
    for (const markup of buttonHtml.slice(0, 4)) {
      expect(markup).toContain('data-hz-control-height="28"');
      expect(markup).toContain('h-7');
      expect(markup).not.toContain('shadow-[inset_0_-1px_0_var(--hz-ui-accent)]');
      expect(markup).not.toContain('border-[var(--hz-ui-accent-muted)]');
      expect(markup).not.toContain('min-w-[84px]');
      expect(markup).not.toContain('min-w-[104px]');
    }
    expect(primaryButton).toContain('data-hz-control-edge="solid"');
    expect(primaryButton).toContain('data-hz-button-tier="solid-primary"');
    expect(primaryButton).toContain('bg-[var(--hz-ui-action-primary)]');
    expect(secondaryButton).toContain('data-hz-control-edge="flat"');
    expect(secondaryButton).toContain('data-hz-button-tier="flat-neutral"');
    expect(secondaryButton).toContain('bg-[var(--hz-ui-control)]');
    expect(ghostButton).toContain('data-hz-control-edge="flat"');
    expect(ghostButton).toContain('data-hz-button-tier="flat-neutral"');
    expect(dangerButton).toContain('data-hz-control-edge="solid"');
    expect(dangerButton).toContain('data-hz-button-tier="solid-danger"');
    expect(xsButton).toContain('data-hz-control-height="24"');
    expect(xsButton).toContain('h-6');
    expect(smButton).toContain('data-hz-control-height="28"');
    expect(smButton).toContain('h-7');
    expect(mdButton).toContain('data-hz-control-height="32"');
    expect(mdButton).toContain('h-8');
    expect(lgButton).toContain('data-hz-control-height="40"');
    expect(lgButton).toContain('h-10');
    const selectTrigger = html.match(/<button[^>]*data-hz-ui="select-trigger"[^>]*>/)?.[0] ?? '';
    expect(selectTrigger).toContain('data-hz-control-height="32"');
    expect(selectTrigger).not.toContain('data-hz-control-height="28"');
    expect(selectTrigger).toContain('data-hz-control-edge="lined"');
    expect(selectTrigger).toContain('bg-transparent');
    expect(selectTrigger).not.toContain('bg-[var(--hz-ui-control)]');
  });

  it('renders selected toggles as underline tabs instead of chip chrome', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzUnderlineToggle selected selectionAttrName="data-chart-selected">
          Mean
        </HzUnderlineToggle>
        <HzUnderlineToggle disabled selected={false} selectionAttrName="data-compare-selected">
          Min
        </HzUnderlineToggle>
      </div>
    );

    expect(html).toContain('data-hz-ui="underline-toggle"');
    expect(html).toContain('data-hz-control-height="28"');
    expect(html).toContain('data-hz-control-edge="bottom-underline"');
    expect(html).toContain('data-hz-underline-toggle-owner="hertzbeat-ui-underline-toggle"');
    expect(html).toContain('data-chart-selected="true"');
    expect(html).toContain('data-compare-selected="false"');
    expect(html).toContain('Mean');
    expect(html).toContain('h-7');
    expect(html).toContain('after:absolute');
    expect(html).not.toContain('var(--ops-primary)');
    expect(html).not.toContain('data-hz-ui="chip-toggle"');
    expect(html).not.toContain('data-hz-chip-toggle-owner');
    expect(html).not.toContain('rounded-[3px]');
    expect(html).not.toContain('bg-[var(--hz-ui-active)]');
  });

  it('renders hidden file inputs through the shared UI ownership boundary', () => {
    const html = renderToStaticMarkup(
      <HzFileInput
        aria-label="Import monitors"
        data-monitor-manage-import-input-owner="hertzbeat-ui-file-input"
      />
    );

    expect(html).toContain('type="file"');
    expect(html).toContain('data-hz-ui="file-input"');
    expect(html).toContain('data-hz-file-input-control="native-hidden-file"');
    expect(html).toContain('data-monitor-manage-import-input-owner="hertzbeat-ui-file-input"');
    expect(html).toContain('hidden');
    expect(html).not.toContain('data-hz-file-input-owner');
  });

  it('renders a filter workbench with active clauses, group-by fields, and include/exclude value actions', () => {
    const html = renderToStaticMarkup(
      <HzFilterWorkbench
        activeClauses={[
          { id: 'resource-type', field: 'resource.type', operator: 'IN', value: 'mysql, linux' },
          { id: 'status', field: 'status', operator: '!=', value: 'down' }
        ]}
        builderFields={[
          { id: 'resource.type', label: 'resource.type' },
          { id: 'collector', label: 'collector' }
        ]}
        builderOperators={[
          { id: 'IN', label: 'IN' },
          { id: 'NOT_IN', label: 'NOT_IN' },
          { id: 'EXISTS', label: 'EXISTS' }
        ]}
        builderLogic="AND"
        groupBy={[{ id: 'collector', label: 'collector' }]}
        savedViews={[
          { id: 'baseline', label: 'Baseline', description: 'Default operations view', active: true },
          { id: 'alerts', label: 'Open alerts' }
        ]}
        queryPlan={{
          aggregate: 'count()',
          orderBy: 'latency desc',
          limit: 100
        }}
        quickGroups={[
          {
            id: 'status',
            label: 'Status',
            options: [{ id: 'up', label: 'Available', count: 116, active: true }]
          }
        ]}
        facetGroups={[
          {
            id: 'resource',
            label: 'Resource attributes',
            facets: [
              {
                id: 'resource-type',
                label: 'resource.type',
                type: 'keyword',
                values: [
                  { id: 'mysql', label: 'mysql', count: 24 },
                  { id: 'linux', label: 'linux', count: 46 }
                ]
              }
            ]
          }
        ]}
        attributeSearch=""
        onAttributeSearchChange={vi.fn()}
      />
    );

    expect(html).toContain('data-hz-ui="filter-workbench"');
    expect(html).toContain('Active filters');
    expect(html).toContain('resource.type');
    expect(html).toContain('Filter builder');
    expect(html).toContain('data-hz-ui="filter-builder"');
    expect(html).toContain('AND');
    expect(html).toContain('OR');
    expect(html).toContain('Add filter');
    expect(html).toContain('Value');
    expect(html).toContain('Saved views');
    expect(html).toContain('Baseline');
    expect(html).toContain('Query plan');
    expect(html).toContain('count()');
    expect(html).toContain('latency desc');
    expect(html).toContain('100');
    expect(html).toContain('Group by');
    expect(html).toContain('Attributes');
    expect(html).toContain('aria-label="Include mysql"');
    expect(html).toContain('aria-label="Exclude mysql"');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
  });

  it('renders field value actions for adding filters directly from result rows', () => {
    const html = renderToStaticMarkup(<HzFieldValueActions field="collector" value="collector-a" />);

    expect(html).toContain('data-hz-ui="field-value-actions"');
    expect(html).toContain('collector-a');
    expect(html).toContain('aria-label="Include collector collector-a"');
    expect(html).toContain('aria-label="Exclude collector collector-a"');
    expect(html).not.toContain('rounded-[16px]');
  });

  it('renders result controls for time range, refresh cadence, view mode, and visible columns', () => {
    const html = renderToStaticMarkup(
      <HzResultControls
        timeRanges={[
          { id: '15m', label: 'Last 15 minutes' },
          { id: '1h', label: 'Last 1 hour' }
        ]}
        selectedTimeRangeId="15m"
        refreshIntervals={[
          { id: 'off', label: 'Off' },
          { id: '30s', label: '30s' }
        ]}
        selectedRefreshIntervalId="30s"
        viewModes={[
          { id: 'list', label: 'List' },
          { id: 'timeseries', label: 'Time series' },
          { id: 'table', label: 'Table' }
        ]}
        selectedViewModeId="list"
        columns={[
          { id: 'resource', label: 'Resource', visible: true, pinned: true },
          { id: 'collector', label: 'Collector', visible: true },
          { id: 'latency', label: 'Latency', visible: false }
        ]}
      />
    );

    expect(html).toContain('data-hz-ui="result-controls"');
    expect(html).toContain('data-hz-ui="select-menu"');
    expect(html).toContain('data-hz-ui="select-trigger"');
    expect(html).toContain('Time range');
    expect(html).toContain('Last 15 minutes');
    expect(html).toContain('Auto refresh');
    expect(html).toContain('30s');
    expect(html).toContain('List');
    expect(html).toContain('Time series');
    expect(html).toContain('Table');
    expect(html).toContain('Visible columns');
    expect(html).toContain('Resource');
    expect(html).toContain('pinned');
    expect(html).toContain('aria-label="Hide Resource column"');
    expect(html).toContain('aria-label="Pin Collector column"');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
  });

  it('renders monitor list filters as a shared operator toolbar', () => {
    const html = renderToStaticMarkup(
      <HzMonitorFilterBar
        searchLabel="Search"
        searchPlaceholder="Search monitor name / instance"
        searchValue="mysql"
        onSearchClear={() => undefined}
        searchClearButtonProps={{ 'data-monitor-search-clear-owner': 'hertzbeat-ui-icon-button' }}
        labelFilterLabel="Labels"
        labelFilterPlaceholder="Label filter"
        labelFilterValue="team=platform"
        onLabelFilterClear={() => undefined}
        labelFilterClearButtonProps={{ 'data-monitor-label-clear-owner': 'hertzbeat-ui-icon-button' }}
        typeLabel="Monitor type"
        typeValue="mysql"
        typeOptions={[
          { value: '', label: 'All types' },
          { value: 'mysql', label: 'MySQL' }
        ]}
        typePickerLabel="Browse monitor apps"
        onTypePickerOpen={() => undefined}
        typePickerButtonProps={{ 'data-monitor-filter-picker-owner': 'hertzbeat-ui-button' }}
        statusLabel="Status"
        statusValue="1"
        statusOptions={[
          { value: '', label: 'All status' },
          { value: '1', label: localizedFixtures.normalStatus }
        ]}
        applyLabel="Apply"
        clearLabel="Clear"
        searchInputProps={{ 'data-monitors-search-input': 'true' } as React.InputHTMLAttributes<HTMLInputElement>}
        labelFilterInputProps={{ 'data-monitors-label-filter-input': 'true' } as React.InputHTMLAttributes<HTMLInputElement>}
        typeSelectProps={{ 'data-monitor-type-filter': 'true' }}
        statusSelectProps={{ 'data-monitors-status-filter': 'true' }}
      />
    );

    expect(html).toContain('data-hz-ui="monitor-filter-bar"');
    expect(html).toContain('data-hz-ui="toolbar"');
    expect(html).toContain('data-hz-monitor-filter-field="search"');
    expect(html).toContain('data-hz-monitor-filter-field="labels"');
    expect(html).toContain('data-hz-monitor-filter-enter-submit="search"');
    expect(html).toContain('data-hz-monitor-filter-enter-submit="labels"');
    expect(html).toContain('data-hz-monitor-filter-clearable-field="search"');
    expect(html).toContain('data-hz-monitor-filter-clearable-field="labels"');
    expect(html).toContain('data-hz-monitor-filter-clear-action="search"');
    expect(html).toContain('data-hz-monitor-filter-clear-action="labels"');
    expect(html).toContain('data-monitor-search-clear-owner="hertzbeat-ui-icon-button"');
    expect(html).toContain('data-monitor-label-clear-owner="hertzbeat-ui-icon-button"');
    expect(html).toContain('data-hz-monitor-filter-field="type"');
    expect(html).toContain('data-hz-monitor-filter-type-picker="available"');
    expect(html).toContain('data-hz-monitor-filter-field="type-picker"');
    expect(html).toContain('data-monitor-filter-picker-owner="hertzbeat-ui-button"');
    expect(html).toContain('aria-label="Browse monitor apps"');
    expect(html).toContain('data-hz-monitor-filter-field="status"');
    expect(html).toContain('data-monitors-search-input="true"');
    expect(html).toContain('data-monitors-label-filter-input="true"');
    expect(html).toContain('data-monitor-type-filter="true"');
    expect(html).toContain('data-monitors-status-filter="true"');
    expect(html).toContain('Search monitor name / instance');
    expect(html).toContain('Label filter');
    expect(html).toContain('team=platform');
    expect(html).toContain('MySQL');
    expect(html).toContain(localizedFixtures.normalStatus);
    expect(html).toContain('Apply');
    expect(html).toContain('Clear');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders pagination bars with shared page-size menu ownership', () => {
    const html = renderToStaticMarkup(
      <HzPaginationBar
        summary="Page 1 / 4 · total 128"
        pageSizeLabel="Page size"
        pageSizeValue="8"
        pageSizeOptions={[
          { value: '8', label: '8' },
          { value: '20', label: '20' }
        ]}
        pageJumpLabel="Page"
        pageJumpValue="1"
        pageJumpMax={4}
        pageJumpInputProps={{ 'data-monitor-page-jump-owner': 'hertzbeat-ui-input' } as React.InputHTMLAttributes<HTMLInputElement>}
        previousLabel="Previous"
        nextLabel="Next"
        previousDisabled
      />
    );

    expect(html).toContain('data-hz-ui="pagination-bar"');
    expect(html).toContain('data-hz-pagination-summary="true"');
    expect(html).toContain('data-hz-pagination-page-size="select-menu"');
    expect(html).toContain('data-hz-pagination-page-jump="number-input"');
    expect(html).toContain('data-hz-pagination-action="page-jump"');
    expect(html).toContain('data-monitor-page-jump-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-hz-ui="select-menu"');
    expect(html).toContain('data-hz-ui="input"');
    expect(html).toContain('data-hz-pagination-action="previous"');
    expect(html).toContain('data-hz-pagination-action="next"');
    expect(html).toContain('Page 1 / 4 · total 128');
    expect(html).toContain('Page size');
    expect(html).not.toContain('<select');
  });

  it('renders the focused chart primitives HertzBeat needs before a full full-sized chart library', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzTimeSeriesChart
          title="Collector latency"
          unit="ms"
          selectedPointId="p95:14:05"
          onPointSelect={vi.fn()}
          hiddenSeriesIds={['p50']}
          onLegendToggle={vi.fn()}
          series={[
            {
              id: 'p50',
              label: 'p50',
              tone: 'info',
              points: [
                { label: '14:00', value: 40 },
                { label: '14:05', value: 48 },
                { label: '14:10', value: 44 }
              ]
            },
            {
              id: 'p95',
              label: 'p95',
              tone: 'warning',
              points: [
                { label: '14:00', value: 80 },
                { label: '14:05', value: 118 },
                { label: '14:10', value: 92 }
              ]
            }
          ]}
        />
        <HzTimeDistributionChart
          title="Signal volume"
          selectedBucketId="14:05"
          onBucketSelect={vi.fn()}
          hiddenSegmentIds={['alerts']}
          onLegendToggle={vi.fn()}
          buckets={[
            {
              id: '14:00',
              label: '14:00',
              segments: [
                { id: 'metrics', label: 'metrics', value: 80, tone: 'success' },
                { id: 'logs', label: 'logs', value: 31, tone: 'info' }
              ]
            },
            {
              id: '14:05',
              label: '14:05',
              segments: [
                { id: 'metrics', label: 'metrics', value: 72, tone: 'success' },
                { id: 'alerts', label: 'alerts', value: 6, tone: 'warning' }
              ]
            }
          ]}
        />
        <HzStatusTimeline
          title="Availability timeline"
          rows={[
            {
              id: 'mysql',
              label: 'mysql-prod-01',
              states: [
                { id: 'up', label: 'available', tone: 'success', width: 64 },
                { id: 'warn', label: 'warning', tone: 'warning', width: 36 }
              ]
            },
            {
              id: 'linux',
              label: 'linux-edge-03',
              states: [
                { id: 'collecting', label: 'collecting', tone: 'info', width: 72 },
                { id: 'down', label: 'down', tone: 'critical', width: 28 }
              ]
            }
          ]}
        />
        <HzStatusIncidentHistory
          title="Incident History"
          items={[
            {
              id: 'newest',
              title: 'Mitigation update...',
              message: 'Mitigation update added after rollback.',
              meta: '2026-05-26 03:30:00',
              stateLabel: 'Monitoring',
              stateTone: 'warning'
            },
            {
              id: 'older',
              title: 'Investigating payme...',
              message: 'Investigating payment latency.',
              meta: '2026-05-26 03:12:00',
              stateLabel: 'Identified',
              stateTone: 'warning'
            }
          ]}
        />
      </div>
    );

    expect(html).toContain('data-hz-ui="time-series-chart"');
    expect(html).toContain('data-hz-chart-kind="time-series"');
    expect(html).toContain('data-hz-chart-crosshair="p95:14:05"');
    expect(html).toContain('data-hz-chart-point="p95:14:05"');
    expect(html).toContain('data-hz-chart-point-selected="true"');
    expect(html).toContain('aria-label="Select chart point p95 14:05 118"');
    expect(html).toContain('data-hz-chart-legend="p50"');
    expect(html).toContain('data-hz-chart-legend-active="false"');
    expect(html).toContain('aria-label="Toggle series p50"');
    expect(html).toContain('data-hz-series-hidden="true"');
    expect(html).toContain('Collector latency');
    expect(html).toContain('p95');
    expect(html).toContain('polyline');
    expect(html).toContain('data-hz-ui="time-distribution-chart"');
    expect(html).toContain('data-hz-chart-kind="histogram"');
    expect(html).toContain('data-hz-bucket="14:05"');
    expect(html).toContain('data-hz-bucket-selected="true"');
    expect(html).toContain('data-hz-time-window-label="14:05"');
    expect(html).toContain('aria-label="Select time bucket 14:05"');
    expect(html).toContain('data-hz-segment="alerts"');
    expect(html).toContain('data-hz-chart-legend="alerts"');
    expect(html).toContain('data-hz-chart-legend-active="false"');
    expect(html).toContain('aria-label="Toggle segment alerts"');
    expect(html).toContain('data-hz-segment-hidden="true"');
    expect(html).toContain('data-hz-ui="status-timeline"');
    expect(html).toContain('data-hz-chart-kind="state-timeline"');
    expect(html).toContain('mysql-prod-01');
    expect(html).toContain('data-hz-state="down"');
    expect(html).toContain('data-hz-ui="status-incident-history"');
    expect(html).toContain('data-hz-status-incident-history-owner="hertzbeat-ui-status-incident-history"');
    expect(html).toContain('data-hz-status-incident-history-contract="angular-collapse-desc"');
    expect(html).toContain('data-hz-status-incident-history-row="newest"');
    expect(html).toContain('Mitigation update...');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a reusable chart surface shell for business ECharts panels', () => {
    const html = renderToStaticMarkup(
      <HzChartSurface
        heading="responseTime"
        unit="ms"
        selected
        actions={<HzButton>Apply as query time</HzButton>}
        footer="61 samples"
      >
        <div data-chart-runtime="echarts" />
      </HzChartSurface>
    );

    expect(html).toContain('data-hz-ui="chart-surface"');
    expect(html).toContain('data-hz-chart-surface-selected="true"');
    expect(html).toContain('responseTime');
    expect(html).toContain('ms');
    expect(html).toContain('Apply as query time');
    expect(html).toContain('61 samples');
    expect(html).toContain('data-chart-runtime="echarts"');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders reusable metric time-series panels through the shared ECharts owner', () => {
    const html = renderToStaticMarkup(
      <HzMetricTimeSeriesPanel
        heading="responseTime"
        unit="ms"
        selected
        option={{
          xAxis: { type: 'category', data: ['14:00', '14:05'] },
          yAxis: { type: 'value' },
          dataZoom: [{ type: 'slider' }],
          series: [{ type: 'line', data: [118, 126] }]
        }}
        footer="61 samples"
        zoomActionLabel="Apply as query time"
        zoomActionDisabled
        zoomActionProps={{ 'data-monitor-history-zoom-apply': 'local-to-query-time' } as React.ButtonHTMLAttributes<HTMLButtonElement>}
        onDataZoomChange={() => undefined}
      />
    );

    expect(html).toContain('data-hz-ui="metric-time-series-panel"');
    expect(html).toContain('data-hz-chart-kind="metric-time-series-echarts"');
    expect(html).toContain('data-hz-ui="chart-surface"');
    expect(html).toContain('data-hz-ui="echarts-panel"');
    expect(html).toContain('data-hz-chart-runtime="echarts"');
    expect(html).toContain('data-hz-echarts-datazoom-feedback="change-callback"');
    expect(html).toContain('data-hz-echarts-datazoom-interaction="native-live-drag"');
    expect(html).toContain('data-hz-echarts-datazoom-event="native-datazoom"');
    expect(html).toContain('data-hz-echarts-datazoom-preserve="preserved"');
    expect(html).toContain('responseTime');
    expect(html).toContain('ms');
    expect(html).toContain('61 samples');
    expect(html).toContain('data-monitor-history-zoom-apply="local-to-query-time"');
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('owns metrics chart ECharts edge chrome for OTLP workbench panels', () => {
    const html = renderToStaticMarkup(
      <HzEChartsPanel
        data-otlp-metrics-echarts-edge-owner="hertzbeat-ui-echarts-panel"
        option={{
          xAxis: { type: 'category', data: ['14:00', '14:05'] },
          yAxis: { type: 'value' },
          series: [{ type: 'line', data: [118, 126] }]
        }}
        edge="metrics-chart"
        height={120}
        tone="operator"
      />
    );

    expect(html).toContain('data-hz-ui="echarts-panel"');
    expect(html).toContain('data-hz-chart-runtime="echarts"');
    expect(html).toContain('data-hz-echarts-edge="metrics-chart"');
    expect(html).toContain('data-otlp-metrics-echarts-edge-owner="hertzbeat-ui-echarts-panel"');
    expect(html).toContain('border-[#252b35]');
    expect(html).toContain('rounded-none');
    expect(html).toContain('border-x-0');
    expect(html).toContain('border-y');
    expect(html).toContain('bg-transparent');
  });

  it('renders monitor history chart grids and card chrome from shared ownership', () => {
    const html = renderToStaticMarkup(
      <HzMonitorHistoryChartGrid layout="single">
        <HzMonitorHistoryChartCard
          cardKey="summary:responseTime"
          heading="summary.responseTime"
          unit="ms"
          selected
          option={{
            xAxis: { type: 'category', data: ['14:00', '14:05'] },
            yAxis: { type: 'value' },
            series: [{ type: 'line', data: [118, 126] }]
          }}
          footer="61 samples"
          zoomActionLabel="Apply as query time"
          zoomActionProps={{ 'data-monitor-history-zoom-apply': 'local-to-query-time' } as React.ButtonHTMLAttributes<HTMLButtonElement>}
        />
      </HzMonitorHistoryChartGrid>
    );

    expect(html).toContain('data-hz-ui="monitor-history-chart-grid"');
    expect(html).toContain('data-monitor-history-chart-grid-owner="hertzbeat-ui-history-chart-grid"');
    expect(html).toContain('data-monitor-history-chart-grid="shared-history-chart-grid"');
    expect(html).toContain('data-monitor-history-chart-grid-layout="single"');
    expect(html).toContain('xl:grid-cols-1');
    expect(html).toContain('data-hz-ui="monitor-history-chart-card"');
    expect(html).toContain('data-monitor-history-card-owner="hertzbeat-ui-history-chart-card"');
    expect(html).toContain('data-monitor-history-card-chrome="hertzbeat-ui-history-chart-inline"');
    expect(html).toContain('data-monitor-history-card-height="content-driven"');
    expect(html).toContain('data-monitor-history-card-selected="true"');
    expect(html).toContain('data-hz-ui="metric-time-series-panel"');
    expect(html).toContain('data-hz-metric-timeseries-variant="inline"');
    expect(html).toContain('data-hz-chart-surface-variant="inline"');
    expect(html).toContain('data-monitor-history-chart-treatment="collector-latency-inline"');
    expect(html).toContain('data-monitor-history-zoom-apply="local-to-query-time"');
    expect(html).not.toContain('angular-chart-cards');
    expect(html).not.toContain('angular-card-box');
    expect(html).not.toContain('angular-460px');
    expect(html).not.toContain('data-selected');
    expect(html).not.toContain('var(--ops-primary)');
  });

  it('renders monitor history selectable rows with shared left-rail row chrome', () => {
    const html = renderToStaticMarkup(
      <HzSelectableRows
        heading="Series samples"
        rows={[
          { key: 'origin', title: 'origin', copy: '128', meta: '14:20' },
          { key: 'p95', title: 'p95', copy: '144', meta: '14:25' }
        ]}
        selectedKey="origin"
        selectionAttrName="data-series-selected"
        onSelect={() => {}}
      />
    );

    expect(html).toContain('data-hz-ui="selectable-rows"');
    expect(html).toContain('data-hz-selectable-row-owner="hertzbeat-ui-selectable-rows"');
    expect(html).toContain('data-hz-selectable-row="true"');
    expect(html).toContain('data-series-selected="true"');
    expect(html).toContain('data-hz-selectable-row-style="left-rail"');
    expect(html).toContain('Series samples');
    expect(html).toContain('origin');
    expect(html).not.toContain('var(--ops-primary)');
    expect(html).not.toContain('ObservabilitySelectableRows');
  });

  it('renders monitor history detail rows with shared flat evidence chrome', () => {
    const html = renderToStaticMarkup(
      <>
        <HzDetailRows
          padding="compact-y"
          heading="Selected point"
          rows={[
            { key: 'latest', title: 'Latest value', copy: '128', meta: '14:20' },
            {
              key: 'delta',
              title: 'Delta',
              copy: '+8',
              meta: 'origin',
              action: (
                <button type="button" data-monitor-history-row-action="delta">
                  Inspect
                </button>
              )
            }
          ]}
          data-monitor-history-summary-owner="hertzbeat-ui-detail-rows"
        />
        <HzDetailRows
          boundary="top"
          heading="Evidence"
          rows={[{ key: 'window', title: 'Window', copy: 'last 30m' }]}
          data-metrics-detail-boundary-owner="hertzbeat-ui-detail-rows"
        />
        <HzDetailRows
          offset="top"
          heading="Context"
          rows={[{ key: 'service', title: 'Service', copy: 'checkout-api' }]}
          data-metrics-detail-offset-owner="hertzbeat-ui-detail-rows"
        />
      </>
    );

    expect(html).toContain('data-hz-ui="detail-rows"');
    expect(html).toContain('data-hz-detail-rows-owner="hertzbeat-ui-detail-rows"');
    expect(html).toContain('data-hz-detail-rows-style="flat-evidence"');
    expect(html).toContain('data-hz-detail-rows-boundary="none"');
    expect(html).toContain('data-hz-detail-rows-boundary="top"');
    expect(html).toContain('data-hz-detail-rows-offset="top"');
    expect(html).toContain('data-hz-detail-rows-padding="compact-y"');
    expect(html).toContain('data-hz-detail-row-action-owner="hertzbeat-ui-detail-row-action"');
    expect(html).toContain('data-monitor-history-row-action="delta"');
    expect(html).toContain('py-2');
    expect(html).toContain('data-monitor-history-summary-owner="hertzbeat-ui-detail-rows"');
    expect(html).toContain('data-metrics-detail-boundary-owner="hertzbeat-ui-detail-rows"');
    expect(html).toContain('data-metrics-detail-offset-owner="hertzbeat-ui-detail-rows"');
    expect(html).toContain('Selected point');
    expect(html).toContain('Evidence');
    expect(html).toContain('Context');
    expect(html).toContain('Latest value');
    expect(html).toContain('128');
    expect(html).toContain('14:20');
    expect(html).toContain('mt-3');
    expect(html).toContain('border-t border-[#252b35]');
    expect(html).toContain('pt-3');
    expect(html).not.toContain('var(--ops-border-color)');
    expect(html).not.toContain('ObservabilityDetailRows');
  });

  it('renders a reusable workbench surface shell for business detail cards', () => {
    const html = renderToStaticMarkup(
      <HzWorkbenchSurface heading="Monitoring Basic" selected actions={<HzButton>Edit</HzButton>}>
        <div data-table-runtime="monitor-data-table" />
      </HzWorkbenchSurface>
    );

    expect(html).toContain('data-hz-ui="workbench-surface"');
    expect(html).toContain('data-hz-workbench-surface-selected="true"');
    expect(html).toContain('Monitoring Basic');
    expect(html).toContain('Edit');
    expect(html).toContain('data-table-runtime="monitor-data-table"');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a reusable panel surface shell for compact workbench bands', () => {
    const html = renderToStaticMarkup(
      <>
        <HzPanelSurface data-test-panel="query-band" padding="query" clip>
          <div data-test-panel-body="query-controls" />
        </HzPanelSurface>
        <HzPanelSurface data-test-panel="header-band" padding="header">
          <div data-test-panel-body="header-controls" />
        </HzPanelSurface>
        <HzPanelSurface data-test-panel="chart-band" padding="chart">
          <div data-test-panel-body="chart-controls" />
        </HzPanelSurface>
        <HzPanelSurface data-test-panel="chart-inner" padding="chart-inner" variant="chart-inner">
          <div data-test-panel-body="chart-inner-controls" />
        </HzPanelSurface>
        <HzPanelSurface data-test-panel="view-switch-band" padding="view-switch">
          <div data-test-panel-body="view-switch-controls" />
        </HzPanelSurface>
        <HzPanelSurface data-test-panel="sticky-inspector" stickiness="top-4">
          <div data-test-panel-body="sticky-inspector-controls" />
        </HzPanelSurface>
        <HzPanelSection data-test-panel-section="summary">
          <HzStatStrip columns={4} frame="panel-inset" spacing="compact" data-test-stat-strip="summary">
            <HzStatCell label="Service" value="checkout-api" variant="tile" density="compact" />
          </HzStatStrip>
        </HzPanelSection>
        <HzStatStrip columns={3} frame="panel-solid" data-test-stat-strip="solid-summary">
          <HzStatCell label="Samples" value="42" variant="tile" density="compact" frame="flush" />
        </HzStatStrip>
        <HzStatCell label="Entity" value="Checkout API" variant="tile" density="compact" frame="inset" />
        <HzPanelSection divider="none" data-test-panel-section="body">
          <HzDetailRows heading="Selected" rows={[{ label: 'Metric', value: 'http.server.duration' }]} />
        </HzPanelSection>
        <HzPanelSection divider="top" spacing="stack-2" data-test-panel-section="stack">
          <div data-test-panel-body="stack-a" />
          <div data-test-panel-body="stack-b" />
        </HzPanelSection>
      </>
    );

    expect(html).toContain('data-hz-ui="panel-surface"');
    expect(html).toContain('data-hz-panel-surface-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-hz-panel-surface-density="operator-compact"');
    expect(html).toContain('data-hz-panel-surface-clip="true"');
    expect(html).toContain('data-hz-panel-surface-padding="query"');
    expect(html).toContain('data-hz-panel-surface-padding="header"');
    expect(html).toContain('data-hz-panel-surface-padding="chart"');
    expect(html).toContain('data-hz-panel-surface-padding="chart-inner"');
    expect(html).toContain('data-hz-panel-surface-padding="view-switch"');
    expect(html).toContain('data-hz-panel-surface-variant="chart-inner"');
    expect(html).toContain('data-hz-panel-surface-stickiness="top-4"');
    expect(html).toContain('xl:sticky xl:top-4 xl:self-start');
    expect(html).toContain('data-hz-ui="panel-section"');
    expect(html).toContain('data-hz-panel-section-owner="hertzbeat-ui-panel-section"');
    expect(html).toContain('data-hz-panel-section-density="operator-compact"');
    expect(html).toContain('data-hz-panel-section-padding="summary"');
    expect(html).toContain('data-hz-panel-section-divider="bottom"');
    expect(html).toContain('data-hz-panel-section-divider="none"');
    expect(html).toContain('data-hz-panel-section-divider="top"');
    expect(html).toContain('data-hz-panel-section-spacing="stack-2"');
    expect(html).toContain('data-hz-stat-strip-frame="panel-inset"');
    expect(html).toContain('data-hz-stat-strip-frame="panel-solid"');
    expect(html).toContain('data-hz-stat-strip-spacing="compact"');
    expect(html).toContain('data-hz-stat-frame="flush"');
    expect(html).toContain('data-hz-stat-frame="inset"');
    expect(html).toContain('bg-[#0d1015]');
    expect(html).toContain('data-hz-panel-surface-selected="false"');
    expect(html).toContain('data-test-panel="query-band"');
    expect(html).toContain('data-test-panel="header-band"');
    expect(html).toContain('data-test-panel="chart-band"');
    expect(html).toContain('data-test-panel="chart-inner"');
    expect(html).toContain('data-test-panel="sticky-inspector"');
    expect(html).toContain('data-test-panel-section="summary"');
    expect(html).toContain('data-test-panel-section="body"');
    expect(html).toContain('data-test-panel-section="stack"');
    expect(html).toContain('data-test-stat-strip="summary"');
    expect(html).toContain('data-test-stat-strip="solid-summary"');
    expect(html).toContain('data-test-panel-body="query-controls"');
    expect(html).toContain('data-test-panel-body="header-controls"');
    expect(html).toContain('data-test-panel-body="chart-controls"');
    expect(html).toContain('data-test-panel-body="chart-inner-controls"');
    expect(html).toContain('rounded-[4px]');
    expect(html).toContain('overflow-hidden');
    expect(html).toContain('px-4 py-3');
    expect(html).toContain('px-5 py-4');
    expect(html).toContain('px-4 py-4');
    expect(html).toContain('px-3 py-3');
    expect(html).toContain('rounded-[3px]');
    expect(html).toContain('gap-1');
    expect(html).toContain('space-y-2');
    expect(html).toContain('bg-[#10141b]');
    expect(html).toContain('shadow-none');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders the next three-signal visualization primitives for heatmaps, logs, and traces', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzHeatmapChart
          title="Latency heatmap"
          buckets={[
            {
              id: '14:00',
              label: '14:00',
              cells: [
                { id: 'fast', label: '<50ms', value: 22, tone: 'success' },
                { id: 'slow', label: '>250ms', value: 3, tone: 'warning' }
              ]
            },
            {
              id: '14:05',
              label: '14:05',
              cells: [
                { id: 'fast', label: '<50ms', value: 18, tone: 'success' },
                { id: 'slow', label: '>250ms', value: 7, tone: 'critical' }
              ]
            }
          ]}
        />
        <HzLogStream
          title="Log stream"
          rows={[
            {
              id: 'log-1',
              timestamp: '14:00:02',
              level: 'warn',
              source: 'collector-a',
              message: 'mysql-prod-01 response time above threshold'
            },
            {
              id: 'log-2',
              timestamp: '14:00:08',
              level: 'error',
              source: 'collector-b',
              message: 'linux-edge-03 scrape timeout'
            }
          ]}
        />
        <HzTraceWaterfall
          title="Trace waterfall"
          spans={[
            { id: 'root', service: 'hertzbeat-api', operation: 'POST /api/monitors/detect', startMs: 0, durationMs: 118, tone: 'info' },
            { id: 'collector', service: 'collector-a', operation: 'mysql.collect', startMs: 24, durationMs: 72, tone: 'warning' }
          ]}
        />
      </div>
    );

    expect(html).toContain('data-hz-ui="heatmap-chart"');
    expect(html).toContain('data-hz-chart-kind="heatmap"');
    expect(html).toContain('Latency heatmap');
    expect(html).toContain('data-hz-heatmap-cell="14:05-slow"');
    expect(html).toContain('data-hz-ui="log-stream"');
    expect(html).toContain('data-hz-chart-kind="logs"');
    expect(html).toContain('data-hz-log-level="error"');
    expect(html).toContain('scrape timeout');
    expect(html).toContain('data-hz-ui="trace-waterfall"');
    expect(html).toContain('data-hz-chart-kind="traces"');
    expect(html).toContain('data-hz-span="collector"');
    expect(html).toContain('mysql.collect');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders expanded logs and traces chart primitives for signal coverage', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzLogVolumeChart
          title="Log volume"
          buckets={[
            {
              id: '14:00',
              label: '14:00',
              segments: [
                { id: 'info', label: 'info', value: 32, tone: 'info' },
                { id: 'error', label: 'error', value: 3, tone: 'critical' }
              ]
            },
            {
              id: '14:05',
              label: '14:05',
              segments: [
                { id: 'warn', label: 'warn', value: 8, tone: 'warning' },
                { id: 'error', label: 'error', value: 6, tone: 'critical' }
              ]
            }
          ]}
        />
        <HzLogLevelDistribution
          title="Log level distribution"
          levels={[
            { id: 'info', label: 'info', value: 72, tone: 'info' },
            { id: 'warn', label: 'warn', value: 18, tone: 'warning' },
            { id: 'error', label: 'error', value: 9, tone: 'critical' }
          ]}
        />
        <HzTraceLatencyDistribution
          title="Trace latency distribution"
          buckets={[
            { id: 'under-50', label: '<50ms', value: 18, tone: 'success' },
            { id: '50-100', label: '50-100ms', value: 24, tone: 'info' },
            { id: 'over-250', label: '>250ms', value: 5, tone: 'critical' }
          ]}
        />
        <HzTraceSpanTable
          title="Span table"
          spans={[
            { id: 'api', service: 'hertzbeat-api', operation: 'POST /api/monitors/detect', startMs: 0, durationMs: 118, tone: 'info' },
            { id: 'collector', service: 'collector-a', operation: 'mysql.collect', startMs: 20, durationMs: 72, tone: 'warning' }
          ]}
        />
      </div>
    );

    expect(html).toContain('data-hz-ui="log-volume-chart"');
    expect(html).toContain('data-hz-chart-kind="log-volume"');
    expect(html).toContain('data-hz-log-volume-bucket="14:05"');
    expect(html).toContain('data-hz-log-volume-segment="error"');
    expect(html).toContain('data-hz-ui="log-level-distribution"');
    expect(html).toContain('data-hz-log-level-bar="warn"');
    expect(html).toContain('data-hz-ui="trace-latency-distribution"');
    expect(html).toContain('data-hz-trace-latency-bucket="over-250"');
    expect(html).toContain('data-hz-ui="trace-span-table"');
    expect(html).toContain('data-hz-trace-span-row="collector"');
    expect(html).toContain('mysql.collect');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders trace span events and a diagnostic waterfall with hierarchy and markers', () => {
    const traceEvents = [
      {
        id: 'retry',
        spanId: 'collector',
        timestampMs: 68,
        name: 'mysql.connection.retry',
        tone: 'warning' as const,
        attributes: [
          { label: 'attempt', value: '2' },
          { label: 'peer', value: '10.0.4.21:3306' }
        ]
      },
      {
        id: 'error',
        spanId: 'collector',
        timestampMs: 101,
        name: 'db.statement.timeout',
        tone: 'critical' as const,
        attributes: [{ label: 'timeout', value: '120ms' }]
      }
    ];
    const html = renderToStaticMarkup(
      <div>
        <HzTraceEventTimeline title="Span events" totalMs={126} events={traceEvents} />
        <HzTraceWaterfall
          title="Trace waterfall"
          onSpanSelect={vi.fn()}
          selectedSpanId="collector"
          criticalPathSpanIds={['api', 'collector']}
          events={traceEvents}
          spans={[
            { id: 'api', service: 'hertzbeat-api', operation: 'POST /api/monitors/detect', startMs: 0, durationMs: 126, selfMs: 18, depth: 0, tone: 'info' },
            { id: 'scheduler', service: 'scheduler', operation: 'dispatch.collector-a', startMs: 18, durationMs: 22, selfMs: 9, depth: 1, parentId: 'api', tone: 'neutral' },
            { id: 'collector', service: 'collector-a', operation: 'mysql.collect', startMs: 42, durationMs: 68, selfMs: 52, depth: 1, parentId: 'api', tone: 'warning', status: 'retrying' }
          ]}
        />
      </div>
    );

    expect(html).toContain('data-hz-ui="trace-event-timeline"');
    expect(html).toContain('data-hz-chart-kind="trace-events"');
    expect(html).toContain('data-hz-trace-event="retry"');
    expect(html).toContain('data-hz-trace-event-marker="retry"');
    expect(html).toContain('mysql.connection.retry');
    expect(html).toContain('data-hz-waterfall-scale="global"');
    expect(html).toContain('data-hz-waterfall-ruler="true"');
    expect(html).toContain('data-hz-span-start-ms="42"');
    expect(html).toContain('data-hz-span-end-ms="110"');
    expect(html).toContain('data-hz-span-start-ratio="33.333"');
    expect(html).toContain('data-hz-span-end-ratio="87.302"');
    expect(html).toContain('data-hz-span-link="api-&gt;collector"');
    expect(html).toContain('data-hz-span-parent-connector="collector"');
    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-label="Select trace span collector"');
    expect(html).toContain('data-hz-span-interactive="true"');
    expect(html).toContain('data-hz-span-depth="1"');
    expect(html).toContain('data-hz-span-selected="true"');
    expect(html).toContain('data-hz-span-critical-path="true"');
    expect(html).toContain('data-hz-span-event-marker="error"');
    expect(html).toContain('retrying');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('highlights span events that belong to the selected trace span', () => {
    const html = renderToStaticMarkup(
      <HzTraceEventTimeline
        title="Span events"
        selectedSpanId="collector"
        totalMs={126}
        events={[
          { id: 'root-start', spanId: 'api', timestampMs: 4, name: 'request.start', tone: 'info' },
          { id: 'retry', spanId: 'collector', timestampMs: 68, name: 'mysql.connection.retry', tone: 'warning' }
        ]}
      />
    );

    expect(html).toContain('data-hz-trace-event-selected="true"');
    expect(html).toContain('data-hz-trace-event-selected="false"');
    expect(html).toContain('data-hz-trace-event-marker-selected="true"');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a trace service dependency graph with call edges and operator metrics', () => {
    const html = renderToStaticMarkup(
      <HzServiceDependencyGraph
        title="Service dependency"
        nodes={[
          { id: 'api', label: 'hertzbeat-api', role: 'entrypoint', tone: 'info' },
          { id: 'collector', label: 'collector-a', role: 'collector', tone: 'warning', value: '68ms' },
          { id: 'warehouse', label: 'warehouse', role: 'storage', tone: 'success' }
        ]}
        edges={[
          { id: 'api-collector', from: 'api', to: 'collector', label: 'mysql.collect', latencyMs: 68, calls: 128, errorRate: 3.1, tone: 'warning' },
          { id: 'collector-warehouse', from: 'collector', to: 'warehouse', label: 'greptime.write', latencyMs: 18, calls: 124, errorRate: 0, tone: 'success' }
        ]}
      />
    );

    expect(html).toContain('data-hz-ui="service-dependency-graph"');
    expect(html).toContain('data-hz-chart-kind="service-dependency"');
    expect(html).toContain('data-hz-service-node="collector"');
    expect(html).toContain('data-hz-service-node-tone="warning"');
    expect(html).toContain('data-hz-service-edge="api-&gt;collector"');
    expect(html).toContain('data-hz-service-edge-latency-ms="68"');
    expect(html).toContain('data-hz-service-edge-calls="128"');
    expect(html).toContain('data-hz-service-edge-error-rate="3.1"');
    expect(html).toContain('mysql.collect');
    expect(html).toContain('error 3.1%');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a RED-ranked topology metric table for large graph investigation', () => {
    const html = renderToStaticMarkup(
      <HzTopologyMetricTable
        title="Topology edges"
        density="graph-first"
        boundary="framed"
        selectedRowId="checkout-payment"
        renderWindowCompanion={{
          mode: 'windowed',
          totalNodeCount: 500,
          renderedNodeCount: 200,
          hiddenNodeCount: 300,
          totalEdgeCount: 2,
          renderedEdgeCount: 1,
          visibleNodeBudget: 200,
          tableCompanion: 'required',
          priorityNodeIds: ['payment-api'],
          renderedNodeIds: ['checkout-api', 'payment-api']
        }}
        labels={{
          edgeCount: '2 relation edges',
          requestRate: 'requests/s',
          errorRate: 'error ratio',
          latencyP95: 'p95 latency',
          rowAction: 'Inspect edge',
          renderWindowEdgeSummary: 'Canvas renders 1 of 2 table edges',
          rowAriaLabel: row => `Inspect relation ${row.id}`
        }}
        rows={[
          {
            id: 'checkout-payment',
            sourceNodeId: 'checkout-api',
            targetNodeId: 'payment-api',
            source: 'checkout-api',
            target: 'payment-api',
            relationType: 'trace-call',
            sourceKind: 'otlp-trace-call',
            requestRatePerSecond: 2.4,
            requestCount: 144,
            errorRate: 0.125,
            errorCount: 18,
            latencyP95Ms: 320,
            latencyAvgMs: 120,
            evidenceBadges: ['trace', 'alert'],
            tone: 'warning'
          },
          {
            id: 'payment-db',
            sourceNodeId: 'payment-api',
            targetNodeId: 'orders-db',
            source: 'payment-api',
            target: 'orders-db',
            relationType: 'database-connection',
            sourceKind: 'monitor-ownership',
            requestRatePerSecond: 1.1,
            requestCount: 66,
            errorRate: 0,
            latencyP95Ms: 42,
            evidenceBadges: ['monitor'],
            tone: 'success'
          }
        ]}
      />
    );

    expect(html).toContain('data-hz-ui="topology-metric-table"');
    expect(html).toContain('data-hz-topology-primitive="metric-table"');
    expect(html).toContain('data-hz-topology-metric-table-root="true"');
    expect(html).toContain('data-hz-topology-metric-table-density="graph-first"');
    expect(html).toContain('data-hz-topology-metric-table-density-owner="hertzbeat-ui-metric-table-density"');
    expect(html).toContain('data-hz-topology-metric-table-visual-weight="low-interruption"');
    expect(html).toContain('data-hz-topology-metric-table-row-density="compressed-red"');
    expect(html).toContain('data-hz-topology-metric-table-boundary="framed"');
    expect(html).toContain('data-hz-topology-metric-table-boundary-owner="hertzbeat-ui-metric-table-boundary"');
    expect(html).toContain('data-hz-topology-metric-table-header-owner="hertzbeat-ui-metric-table-header"');
    expect(html).toContain('data-hz-topology-metric-table-title-owner="hertzbeat-ui-metric-table-title"');
    expect(html).toContain('data-hz-topology-metric-table-count-owner="hertzbeat-ui-metric-table-count"');
    expect(html).toContain('data-hz-topology-metric-rows="2"');
    expect(html).toContain('data-hz-topology-metric-table-total-rows="2"');
    expect(html).toContain('data-hz-topology-metric-table-interaction="row-select-detail"');
    expect(html).toContain('data-hz-topology-metric-table-live-selection-owner="hertzbeat-ui-metric-table-selection"');
    expect(html).toContain(
      'data-hz-topology-metric-table-live-selection-invariants="row-click-drawer no-url-change no-remount no-refit viewport-preserved render-key-stable"'
    );
    expect(html).toContain('data-hz-topology-metric-table-render-window-owner="hertzbeat-ui-metric-table-render-window"');
    expect(html).toContain('data-hz-topology-metric-table-render-window-mode="windowed"');
    expect(html).toContain('data-hz-topology-metric-table-render-window-total-node-count="500"');
    expect(html).toContain('data-hz-topology-metric-table-render-window-rendered-node-count="200"');
    expect(html).toContain('data-hz-topology-metric-table-render-window-hidden-node-count="300"');
    expect(html).toContain('data-hz-topology-metric-table-render-window-total-edge-count="2"');
    expect(html).toContain('data-hz-topology-metric-table-render-window-rendered-edge-count="1"');
    expect(html).toContain('data-hz-topology-metric-table-edge-count-policy="canvas-rendered-vs-table-total"');
    expect(html).toContain('data-hz-topology-metric-table-canvas-rendered-edge-count="1"');
    expect(html).toContain('data-hz-topology-metric-table-table-edge-count="2"');
    expect(html).toContain('data-hz-topology-metric-table-edge-summary-owner="hertzbeat-ui-metric-table-edge-summary"');
    expect(html).toContain('Canvas renders 1 of 2 table edges');
    expect(html).toContain('data-hz-topology-metric-table-render-window-visible-node-budget="200"');
    expect(html).toContain('data-hz-topology-metric-table-render-window-visible-node-count="2"');
    expect(html).toContain('data-hz-topology-metric-table-hidden-node-companion="required"');
    expect(html).toContain('data-hz-topology-metric-table-priority-node-ids="payment-api"');
    expect(html).toContain('data-hz-topology-metric-table-visible-row-count="1"');
    expect(html).toContain('data-hz-topology-metric-table-partial-row-count="1"');
    expect(html).toContain('data-hz-topology-metric-table-hidden-row-count="0"');
    expect(html).toContain('data-hz-topology-metric-table-unknown-row-count="0"');
    expect(html).toContain('data-hz-topology-metric-table-render-window-filter-owner="hertzbeat-ui-metric-table-render-window-filter"');
    expect(html).toContain('data-hz-topology-metric-table-render-window-filter="all"');
    expect(html).toContain('data-hz-topology-metric-table-filter-invariants="in-page no-url-change no-g6-remount viewport-preserved selection-preserved"');
    expect(html).toContain('data-hz-topology-metric-table-filter-url-policy="preserve-current-url"');
    expect(html).toContain('data-hz-topology-metric-table-filtered-row-count="2"');
    expect(html).toContain('data-hz-topology-metric-table-filtered-out-row-count="0"');
    expect(html).toContain('data-hz-topology-metric-table-filter-control-owner="hertzbeat-ui-metric-table-filter-control"');
    expect(html).toContain('data-hz-topology-metric-table-filter-control-url-policy="preserve-current-url"');
    expect(html).toContain('data-hz-topology-metric-table-filter-control-selection-policy="preserve-selected-edge"');
    expect(html).toContain('data-hz-topology-metric-table-filter-control="all"');
    expect(html).toContain('data-hz-topology-metric-table-filter-control="visible"');
    expect(html).toContain('data-hz-topology-metric-table-filter-control="partial"');
    expect(html).toContain('data-hz-topology-metric-table-filter-control="hidden"');
    expect(html).toContain('data-hz-topology-metric-table-filter-active="true"');
    expect(html).toContain('data-hz-topology-metric-table-filter-control-active="true"');
    expect(html).toContain('data-hz-topology-metric-table-filter-count="1"');
    expect(html).toContain('data-hz-topology-metric-table-row-owner="hertzbeat-ui-metric-table-row"');
    expect(html).toContain('data-hz-topology-edge-row-selection-owner="hertzbeat-ui-metric-table-row-selection"');
    expect(html).toContain('data-hz-topology-edge-row-selection-mode="table-row-click-drawer"');
    expect(html).toContain('data-hz-topology-edge-row-selection-url-policy="preserve-current-url"');
    expect(html).toContain('data-hz-topology-edge-row-tabstop-policy="single-active-row"');
    expect(html).toContain('data-hz-topology-edge-row="checkout-payment"');
    expect(html).toContain('data-hz-topology-edge-row-tabstop="true"');
    expect(html).toContain('data-hz-topology-edge-row-render-window-visibility="visible"');
    expect(html).toContain('data-hz-topology-edge-row-source-node-id="checkout-api"');
    expect(html).toContain('data-hz-topology-edge-row-target-node-id="payment-api"');
    expect(html).toContain('data-hz-topology-edge-row-source-visible="true"');
    expect(html).toContain('data-hz-topology-edge-row-target-visible="true"');
    expect(html).toContain('data-hz-topology-edge-row="payment-db"');
    expect(html).toContain('data-hz-topology-edge-row-tabstop="false"');
    expect(html).toContain('data-hz-topology-edge-row-render-window-visibility="partial"');
    expect(html).toContain('data-hz-topology-edge-row-source-visible="true"');
    expect(html).toContain('data-hz-topology-edge-row-target-visible="false"');
    expect(html).toContain('data-hz-topology-edge-row-window-context="partial"');
    expect(html).toContain('data-hz-topology-edge-row-window-context-source-visible="true"');
    expect(html).toContain('data-hz-topology-edge-row-window-context-target-visible="false"');
    expect(html).toContain('data-hz-topology-edge-selected="true"');
    expect(html).toContain('aria-current="true"');
    expect(html).toContain('data-hz-topology-metric-table-endpoints-owner="hertzbeat-ui-metric-table-endpoints"');
    expect(html).toContain('data-hz-topology-metric-table-route-owner="hertzbeat-ui-metric-table-route"');
    expect(html).toContain('data-hz-topology-metric-table-source-owner="hertzbeat-ui-metric-table-source"');
    expect(html).toContain('data-hz-topology-metric-table-target-owner="hertzbeat-ui-metric-table-target"');
    expect(html).toContain('data-hz-topology-metric-table-relation-owner="hertzbeat-ui-metric-table-relation"');
    expect(html).toContain('data-hz-topology-metric-table-source-kind-owner="hertzbeat-ui-metric-table-source-kind"');
    expect(html).toContain('data-hz-topology-metric-table-badge-owner="hertzbeat-ui-metric-table-badge"');
    expect(html).toContain('data-hz-topology-metric-table-cell-owner="hertzbeat-ui-metric-table-cell"');
    expect(html).toContain('data-hz-topology-metric-table-value-owner="hertzbeat-ui-metric-table-value"');
    expect(html).toContain('data-hz-topology-metric-table-label-owner="hertzbeat-ui-metric-table-label"');
    expect(html).toContain('data-hz-topology-edge-action="checkout-payment"');
    expect(html).toContain('data-hz-topology-metric-table-action-owner="hertzbeat-ui-metric-table-action"');
    expect(html).toContain('data-hz-topology-request-rate="2.4"');
    expect(html).toContain('data-hz-topology-error-rate="0.125"');
    expect(html).toContain('data-hz-topology-latency-p95-ms="320"');
    expect(html).toContain('checkout-api');
    expect(html).toContain('payment-api');
    expect(html).toContain('12.5%');
    expect(html).toContain('320ms');
    expect(html).toContain('data-hz-topology-evidence-badge="0"');
    expect(html).toContain('2 relation edges');
    expect(html).toContain('requests/s');
    expect(html).toContain('error ratio');
    expect(html).toContain('p95 latency');
    expect(html).toContain('Inspect edge');
    expect(html).toContain('aria-label="Inspect relation checkout-payment"');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('filters topology metric rows by render-window visibility without changing the graph route', () => {
    const html = renderToStaticMarkup(
      <HzTopologyMetricTable
        title="Topology edges"
        selectedRowId="payment-db"
        renderWindowFilter="partial"
        renderWindowCompanion={{
          mode: 'windowed',
          totalNodeCount: 500,
          renderedNodeCount: 200,
          hiddenNodeCount: 300,
          visibleNodeBudget: 200,
          tableCompanion: 'required',
          renderedNodeIds: ['checkout-api', 'payment-api']
        }}
        labels={{
          renderWindowFilterPartial: 'One endpoint on canvas'
        }}
        rows={[
          {
            id: 'checkout-payment',
            sourceNodeId: 'checkout-api',
            targetNodeId: 'payment-api',
            source: 'checkout-api',
            target: 'payment-api',
            relationType: 'trace-call',
            sourceKind: 'otlp-trace-call',
            requestRatePerSecond: 2.4,
            requestCount: 144,
            errorRate: 0.125,
            latencyP95Ms: 320,
            tone: 'warning'
          },
          {
            id: 'payment-db',
            sourceNodeId: 'payment-api',
            targetNodeId: 'orders-db',
            source: 'payment-api',
            target: 'orders-db',
            relationType: 'database-connection',
            sourceKind: 'monitor-ownership',
            requestRatePerSecond: 1.1,
            requestCount: 66,
            errorRate: 0,
            latencyP95Ms: 42,
            tone: 'success'
          }
        ]}
      />
    );

    expect(html).toContain('data-hz-topology-metric-table-render-window-filter="partial"');
    expect(html).toContain('data-hz-topology-metric-table-filtered-row-count="1"');
    expect(html).toContain('data-hz-topology-metric-table-filtered-out-row-count="1"');
    expect(html).toContain('data-hz-topology-metric-table-filter-control="partial"');
    expect(html).toMatch(/data-hz-topology-metric-table-filter-control="partial"[^>]+data-hz-topology-metric-table-filter-active="true"/);
    expect(html).toMatch(/data-hz-topology-metric-table-filter-control="partial"[^>]+data-hz-topology-metric-table-filter-control-active="true"/);
    expect(html).toContain('data-hz-topology-edge-row="payment-db"');
    expect(html).toContain('data-hz-topology-edge-selected="true"');
    expect(html).toContain('data-hz-topology-edge-row-window-context-owner="hertzbeat-ui-metric-table-row-window-context"');
    expect(html).toContain('data-hz-topology-edge-row-window-context="partial"');
    expect(html).toContain('data-hz-topology-edge-row-window-context-source-visible="true"');
    expect(html).toContain('data-hz-topology-edge-row-window-context-target-visible="false"');
    expect(html).toContain('One endpoint on canvas');
    expect(html).not.toContain('data-hz-topology-edge-row="checkout-payment"');
  });

  it('budgets dense windowed topology metric table rows without losing counts or selected context', () => {
    const rows = Array.from({ length: 150 }, (_, index) => ({
      id: `edge-${index}`,
      sourceNodeId: index % 2 === 0 ? `rendered-${index}` : `hidden-${index}`,
      targetNodeId: `hidden-target-${index}`,
      source: `source-${index}`,
      target: `target-${index}`,
      relationType: 'trace-call',
      sourceKind: 'otlp-trace-call',
      requestRatePerSecond: 1 + index,
      requestCount: 10 + index,
      errorRate: 0,
      latencyP95Ms: 40 + index,
      tone: 'neutral' as const
    }));
    const html = renderToStaticMarkup(
      <HzTopologyMetricTable
        title="Topology edges"
        selectedRowId="edge-149"
        rows={rows}
        renderWindowCompanion={{
          mode: 'windowed',
          totalNodeCount: 500,
          renderedNodeCount: 200,
          hiddenNodeCount: 300,
          totalEdgeCount: 150,
          renderedEdgeCount: 80,
          visibleNodeBudget: 200,
          tableCompanion: 'required',
          renderedNodeIds: rows.slice(0, 80).map(row => row.sourceNodeId ?? '')
        }}
      />
    );

    const renderedRows = html.match(/data-hz-topology-edge-row="/g) ?? [];
    expect(html).toContain('data-hz-topology-metric-rows="150"');
    expect(html).toContain('data-hz-topology-metric-table-filtered-row-count="150"');
    expect(html).toContain('data-hz-topology-metric-table-row-render-policy="windowed-dom-budget"');
    expect(html).toContain('data-hz-topology-metric-table-row-render-budget="120"');
    expect(html).toContain('data-hz-topology-metric-table-row-render-page="1"');
    expect(html).toContain('data-hz-topology-metric-table-row-render-next-count="150"');
    expect(html).toContain('data-hz-topology-metric-table-row-render-can-show-more="true"');
    expect(html).toContain('data-hz-topology-metric-table-hidden-row-count="70"');
    expect(html).toContain('data-hz-topology-metric-table-hidden-row-proof-owner="hertzbeat-ui-metric-table-hidden-row-proof"');
    expect(html).toContain('data-hz-topology-metric-table-hidden-row-proof="available"');
    expect(html).toContain('data-hz-topology-metric-table-hidden-row-proof-filter="hidden"');
    expect(html).toContain('data-hz-topology-metric-table-hidden-row-proof-count="70"');
    expect(html).toContain('data-hz-topology-metric-table-rendered-row-count="121"');
    expect(html).toContain('data-hz-topology-metric-table-rendered-hidden-row-count="29"');
    expect(renderedRows).toHaveLength(121);
    expect(html).toContain('data-hz-topology-edge-row="edge-0"');
    expect(html).toContain('data-hz-topology-edge-row="edge-119"');
    expect(html).not.toContain('data-hz-topology-edge-row="edge-120"');
    expect(html).toContain('data-hz-topology-edge-row="edge-149"');
    expect(html).toContain('data-hz-topology-edge-selected="true"');
    expect(html).toContain('data-hz-topology-metric-table-row-render-summary-owner="hertzbeat-ui-metric-table-row-render-summary"');
    expect(html).toContain('data-hz-topology-metric-table-row-render-action-owner="hertzbeat-ui-metric-table-row-render-action"');
    expect(html).toContain('data-hz-topology-metric-table-row-render-action="show-more"');
    expect(html).toContain('data-hz-topology-metric-table-row-render-action-url-policy="preserve-current-url"');
    expect(html).toContain('data-hz-topology-metric-table-row-render-action-selection-policy="preserve-selected-edge"');
    expect(html).toContain('Showing 121 of 150 rows');
    expect(html).toContain('Show 150 of 150 rows');
  });

  it('renders a shared topology companion rail for table, timeline, and drawer layout ownership', () => {
    const html = renderToStaticMarkup(
      <HzTopologyCompanionRail
        density="compact"
        placement="side"
        boundary="side"
        priority="graph-first"
        data-testid="topology-companion-rail"
      >
        <section data-demo-section="legend">Legend</section>
        <section data-demo-section="metrics">Metric table</section>
        <section data-demo-section="drawer">Detail drawer</section>
      </HzTopologyCompanionRail>
    );

    expect(html).toContain('data-hz-ui="topology-companion-rail"');
    expect(html).toContain('data-hz-topology-primitive="companion-rail"');
    expect(html).toContain('data-hz-topology-companion-density="compact"');
    expect(html).toContain('data-hz-topology-companion-placement="side"');
    expect(html).toContain('data-hz-topology-companion-priority="graph-first"');
    expect(html).toContain('data-hz-topology-companion-priority-owner="hertzbeat-ui-companion-rail-priority"');
    expect(html).toContain('data-hz-topology-companion-visual-weight="low-interruption"');
    expect(html).toContain('data-hz-topology-companion-visual-weight-owner="hertzbeat-ui-companion-rail-visual-weight"');
    expect(html).toContain('data-hz-topology-companion-scroll="contained"');
    expect(html).toContain('data-hz-topology-companion-scroll-owner="hertzbeat-ui-companion-rail-scroll"');
    expect(html).toContain('data-hz-topology-companion-viewport-contract="graph-height"');
    expect(html).toContain('data-hz-topology-companion-sticky-context="first-section"');
    expect(html).toContain('data-hz-topology-companion-sticky-context-owner="hertzbeat-ui-companion-rail-sticky-context"');
    expect(html).toContain('[&amp;&gt;[data-hz-ui=topology-section-label]:first-child]:sticky');
    expect(html).toContain('[&amp;&gt;[data-hz-ui=topology-section-label]:first-child]:top-0');
    expect(html).toContain('[&amp;&gt;[data-hz-ui=topology-section-label]:first-child]:z-10');
    expect(html).toContain('max-h-[680px]');
    expect(html).toContain('overflow-y-auto');
    expect(html).toContain('hb-scrollbar');
    expect(html).toContain('data-hz-topology-companion-spacing="shared-stack"');
    expect(html).toContain('data-hz-topology-companion-spacing-owner="hertzbeat-ui-companion-rail-spacing"');
    expect(html).toContain('data-hz-topology-companion-boundary="side"');
    expect(html).toContain('data-hz-topology-companion-boundary-owner="hertzbeat-ui-companion-rail-boundary"');
    expect(html).toContain('data-hz-topology-companion-content-owner="hertzbeat-ui-companion-rail-content"');
    expect(html).toContain('data-testid="topology-companion-rail"');
    expect(html).toContain('data-demo-section="legend"');
    expect(html).toContain('data-demo-section="metrics"');
    expect(html).toContain('data-demo-section="drawer"');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a shared topology companion rail with jump-list sticky context ownership', () => {
    const html = renderToStaticMarkup(
      <HzTopologyCompanionRail
        density="compact"
        placement="side"
        boundary="side"
        priority="graph-first"
        stickyContext="jump-list"
        data-testid="topology-companion-rail-jump"
      >
        <HzTopologyCompanionJumpList
          density="graph-first"
          items={[
            { id: 'legend', href: '#topology-companion-legend', label: 'Legend', active: true },
            { id: 'edge-red', href: '#topology-companion-edge-red', label: 'RED' }
          ]}
        />
        <section data-demo-section="legend">Legend</section>
      </HzTopologyCompanionRail>
    );

    expect(html).toContain('data-hz-ui="topology-companion-rail"');
    expect(html).toContain('data-hz-topology-companion-sticky-context="jump-list"');
    expect(html).toContain('data-hz-topology-companion-sticky-context-owner="hertzbeat-ui-companion-rail-sticky-context"');
    expect(html).toContain('data-hz-topology-companion-sticky-target="topology-companion-jump-list"');
    expect(html).toContain('data-hz-topology-companion-sticky-target-owner="hertzbeat-ui-companion-rail-sticky-target"');
    expect(html).toContain('[&amp;&gt;[data-hz-ui=topology-companion-jump-list]:first-child]:sticky');
    expect(html).toContain('[&amp;&gt;[data-hz-ui=topology-companion-jump-list]:first-child]:top-0');
    expect(html).toContain('[&amp;&gt;[data-hz-ui=topology-companion-jump-list]:first-child]:z-20');
    expect(html).toContain('data-hz-ui="topology-companion-jump-list"');
    expect(html).toContain('data-testid="topology-companion-rail-jump"');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders shared topology companion sections with anchor ownership for right-rail evidence blocks', () => {
    const html = renderToStaticMarkup(
      <HzTopologyCompanionSection
        sectionId="legend"
        anchorId="topology-companion-legend"
        density="graph-first"
        collapsible
        collapsed
        collapseLabel="Hide"
        expandLabel="Show"
        data-testid="topology-companion-section"
      >
        <HzTopologySectionLabel>Legend</HzTopologySectionLabel>
        <div>Health and evidence source keys</div>
      </HzTopologyCompanionSection>
    );

    expect(html).toContain('data-hz-ui="topology-companion-section"');
    expect(html).toContain('data-hz-topology-primitive="companion-section"');
    expect(html).toContain('data-hz-topology-companion-section-id="legend"');
    expect(html).toContain('data-hz-topology-companion-section-anchor="topology-companion-legend"');
    expect(html).toContain('data-hz-topology-companion-section-owner="hertzbeat-ui-companion-section"');
    expect(html).toContain('data-hz-topology-companion-section-anchor-owner="hertzbeat-ui-companion-section-anchor"');
    expect(html).toContain('data-hz-topology-companion-section-density="graph-first"');
    expect(html).toContain('data-hz-topology-companion-section-collapsible="true"');
    expect(html).toContain('data-hz-topology-companion-section-collapsed="true"');
    expect(html).toContain('data-hz-topology-companion-section-toggle-owner="hertzbeat-ui-companion-section-toggle"');
    expect(html).toContain('data-hz-topology-companion-section-body-owner="hertzbeat-ui-companion-section-body"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('hidden=""');
    expect(html).toContain('Show');
    expect(html).toContain('scroll-mt-2');
    expect(html).toContain('data-testid="topology-companion-section"');
    expect(html).toContain('Health and evidence source keys');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a shared topology companion jump list for anchored right-rail evidence navigation', () => {
    const html = renderToStaticMarkup(
      <HzTopologyCompanionJumpList
        ariaLabel="Topology evidence sections"
        density="graph-first"
        activeMode="contained-rail-scroll"
        items={[
          { id: 'view-mode', href: '#topology-companion-view-mode', label: 'View', active: true },
          { id: 'legend', href: '#topology-companion-legend', label: 'Legend' },
          { id: 'edge-red', href: '#topology-companion-edge-red', label: 'RED' }
        ]}
        data-testid="topology-companion-jump-list"
      />
    );

    expect(html).toContain('data-hz-ui="topology-companion-jump-list"');
    expect(html).toContain('data-hz-topology-primitive="companion-jump-list"');
    expect(html).toContain('data-hz-topology-companion-jump-list-owner="hertzbeat-ui-companion-jump-list"');
    expect(html).toContain('data-hz-topology-companion-jump-list-density="graph-first"');
    expect(html).toContain('data-hz-topology-companion-jump-list-interaction="anchor-jump"');
    expect(html).toContain('data-hz-topology-companion-jump-list-interaction-owner="hertzbeat-ui-companion-jump-list-interaction"');
    expect(html).toContain('data-hz-topology-companion-jump-list-sticky="top"');
    expect(html).toContain('data-hz-topology-companion-jump-list-sticky-owner="hertzbeat-ui-companion-jump-list-sticky"');
    expect(html).toContain('data-hz-topology-companion-jump-list-scroll-scope="contained-rail"');
    expect(html).toContain('data-hz-topology-companion-jump-list-scroll-scope-owner="hertzbeat-ui-companion-jump-list-scroll-scope"');
    expect(html).toContain('data-hz-topology-companion-jump-list-active-mode="contained-rail-scroll"');
    expect(html).toContain('data-hz-topology-companion-jump-list-active-mode-owner="hertzbeat-ui-companion-jump-list-active-mode"');
    expect(html).toContain('data-hz-topology-companion-jump-item="view-mode"');
    expect(html).toContain('data-hz-topology-companion-jump-href="#topology-companion-view-mode"');
    expect(html).toContain('data-hz-topology-companion-jump-item-owner="hertzbeat-ui-companion-jump-item"');
    expect(html).toContain('data-hz-topology-companion-jump-scroll-owner="hertzbeat-ui-companion-jump-scroll"');
    expect(html).toContain('data-hz-topology-companion-jump-active="true"');
    expect(html).toContain('data-hz-topology-companion-jump-active-source="manual"');
    expect(html).toContain('aria-current="location"');
    expect(html).toContain('sticky');
    expect(html).toContain('top-0');
    expect(html).toContain('overflow-x-auto');
    expect(html).toContain('hb-scrollbar');
    expect(html).toContain('data-testid="topology-companion-jump-list"');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a compact topology section label for companion headings', () => {
    const html = renderToStaticMarkup(
      <HzTopologySectionLabel density="compact" data-testid="topology-section-label">
        View mode
      </HzTopologySectionLabel>
    );

    expect(html).toContain('data-hz-ui="topology-section-label"');
    expect(html).toContain('data-hz-topology-primitive="section-label"');
    expect(html).toContain('data-hz-topology-section-label-density="compact"');
    expect(html).toContain('data-hz-topology-section-label-owner="hertzbeat-ui-section-label"');
    expect(html).toContain('data-hz-topology-section-label-text-owner="hertzbeat-ui-section-label-text"');
    expect(html).toContain('data-testid="topology-section-label"');
    expect(html).toContain('View mode');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a shared topology workbench frame, header, and grid shell', () => {
    const html = renderToStaticMarkup(
      <HzTopologyWorkbenchFrame as="main" density="compact" boundary="section" data-testid="topology-workbench-frame">
        <HzTopologyWorkbenchHeader
          data-testid="topology-workbench-header"
          eyebrow="Topology"
          title="Entity graph"
          copy="Evidence-first topology shell."
          density="operational-compact"
          copyVisibility="assistive"
          boundary="none"
          scopeSlot={<div data-demo-section="scope">Scope</div>}
          sourceSlot={<div data-demo-section="source">Sources</div>}
        />
        <HzTopologyWorkbenchGrid data-testid="topology-workbench-grid">
          <HzTopologyWorkbenchSlot kind="canvas" data-demo-section="canvas">Canvas</HzTopologyWorkbenchSlot>
          <HzTopologyWorkbenchSlot kind="companion" data-demo-section="companion">Companion</HzTopologyWorkbenchSlot>
        </HzTopologyWorkbenchGrid>
      </HzTopologyWorkbenchFrame>
    );

    expect(html).toContain('data-hz-ui="topology-workbench-frame"');
    expect(html).toContain('data-hz-topology-primitive="workbench-frame"');
    expect(html).toContain('data-hz-topology-workbench-density="compact"');
    expect(html).toContain('data-hz-topology-workbench-boundary="section"');
    expect(html).toContain('data-hz-topology-workbench-frame-boundary-owner="hertzbeat-ui-workbench-frame-boundary"');
    expect(html).toContain('data-testid="topology-workbench-frame"');
    expect(html).toContain('data-hz-ui="topology-workbench-header"');
    expect(html).toContain('data-hz-topology-primitive="workbench-header"');
    expect(html).toContain('data-hz-topology-workbench-header-owner="hertzbeat-ui-workbench-header"');
    expect(html).toContain('data-hz-topology-workbench-header-layout="title-scope-source"');
    expect(html).toContain('data-hz-topology-workbench-header-alignment="shared-control-grid"');
    expect(html).toContain('data-hz-topology-workbench-header-inset="16px"');
    expect(html).toContain('data-hz-topology-workbench-header-control-height="28px"');
    expect(html).toContain('data-hz-topology-workbench-header-density="operational-compact"');
    expect(html).toContain('data-hz-topology-workbench-header-density-owner="hertzbeat-ui-workbench-header-density"');
    expect(html).toContain('data-hz-topology-workbench-header-boundary="none"');
    expect(html).toContain('data-hz-topology-workbench-header-boundary-owner="hertzbeat-ui-workbench-header-boundary"');
    expect(html).not.toContain('border-b border-[#252832]');
    expect(html).toContain('data-hz-topology-workbench-copy-visibility="assistive"');
    expect(html).toContain('data-hz-topology-workbench-eyebrow="true"');
    expect(html).toContain('data-hz-topology-workbench-eyebrow-owner="hertzbeat-ui-workbench-eyebrow"');
    expect(html).toContain('data-hz-topology-workbench-title-owner="hertzbeat-ui-workbench-title"');
    expect(html).toContain('data-hz-topology-workbench-copy-owner="hertzbeat-ui-workbench-copy"');
    expect(html).toContain('sr-only');
    expect(html).toContain('text-[20px]');
    expect(html).toContain('data-hz-topology-workbench-scope-slot="true"');
    expect(html).toContain('data-hz-topology-workbench-scope-slot-owner="hertzbeat-ui-workbench-scope-slot"');
    expect(html).toContain('data-hz-topology-workbench-source-slot="true"');
    expect(html).toContain('data-hz-topology-workbench-source-slot-owner="hertzbeat-ui-workbench-source-slot"');
    expect(html).toContain('data-hz-ui="topology-workbench-grid"');
    expect(html).toContain('data-hz-topology-primitive="workbench-grid"');
    expect(html).toContain('data-hz-topology-workbench-grid-owner="hertzbeat-ui-workbench-grid"');
    expect(html).toContain('data-hz-topology-workbench-grid-layout="canvas-companion"');
    expect(html).toContain('lg:grid-cols-[minmax(0,1fr)_320px]');
    expect(html).toContain('lg:sticky');
    expect(html).toContain('lg:top-[64px]');
    expect(html).toContain('data-hz-topology-workbench-grid-canvas-stickiness="sticky-with-companion"');
    expect(html).toContain('data-hz-topology-workbench-grid-canvas-stickiness-owner="hertzbeat-ui-workbench-grid-canvas-stickiness"');
    expect(html).toContain('data-demo-section="canvas"');
    expect(html).toContain('data-demo-section="companion"');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a compact topology node owned by the shared UI lab primitive', () => {
    const html = renderToStaticMarkup(
      <HzTopologyNode
        href="/entities/service-checkout"
        label="checkout-api"
        healthLabel="Health 82"
        healthCopy="1 warning monitor"
        entityType="service"
        source="otlp-trace-call"
        health="warning"
        tone="warning"
        focus="active"
        evidenceBadges={['trace', 'relation']}
        redMetrics={{ requestRatePerSecond: 2.4, errorRate: 0.125, latencyP95Ms: 320 }}
        position={{ x: 42, y: 36, size: 108 }}
      />
    );

    expect(html).toContain('data-hz-ui="topology-node"');
    expect(html).toContain('data-hz-topology-primitive="node"');
    expect(html).toContain('data-hz-topology-node-owner="hertzbeat-ui-node"');
    expect(html).toContain('data-hz-topology-node-tone="warning"');
    expect(html).toContain('data-hz-topology-node-focus="active"');
    expect(html).toContain('data-hz-topology-node-entity-type="service"');
    expect(html).toContain('data-hz-topology-node-source="otlp-trace-call"');
    expect(html).toContain('data-hz-topology-node-health="warning"');
    expect(html).toContain('data-hz-topology-node-evidence-badges="trace relation"');
    expect(html).toContain('data-hz-topology-node-request-rate="2.4"');
    expect(html).toContain('data-hz-topology-node-error-rate="0.125"');
    expect(html).toContain('data-hz-topology-node-latency-p95-ms="320"');
    expect(html).toContain('data-hz-topology-node-label-owner="hertzbeat-ui-node-label"');
    expect(html).toContain('data-hz-topology-node-health-owner="hertzbeat-ui-node-health"');
    expect(html).toContain('data-hz-topology-node-health-label-owner="hertzbeat-ui-node-health-label"');
    expect(html).toContain('data-hz-topology-node-health-copy-owner="hertzbeat-ui-node-health-copy"');
    expect(html).toContain('data-hz-topology-node-red-owner="hertzbeat-ui-node-red"');
    expect(html).toContain('data-hz-topology-node-red-metric-owner="hertzbeat-ui-node-red-metric"');
    expect(html).toContain('data-hz-topology-node-red-metric="request-rate"');
    expect(html).toContain('data-hz-topology-node-red-metric="error-rate"');
    expect(html).toContain('data-hz-topology-node-red-metric="latency-p95"');
    expect(html).toContain('data-hz-topology-node-badge-list-owner="hertzbeat-ui-node-badge-list"');
    expect(html).toContain('data-hz-topology-node-badge-owner="hertzbeat-ui-node-badge"');
    expect(html).toContain('checkout-api');
    expect(html).toContain('Health 82');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders compact topology edge line and drilldown primitives with RED evidence', () => {
    const lineHtml = renderToStaticMarkup(
      <svg viewBox="0 0 100 100">
        <HzTopologyEdge
          id="checkout-payment"
          variant="line"
          tone="orange"
          focus="active-path"
          selected
          from={{ x: 18, y: 42 }}
          to={{ x: 66, y: 42 }}
          relationshipType="trace-call"
          source="otlp-trace-call"
          evidenceBadges={['trace', 'alert']}
          redMetrics={{ requestRatePerSecond: 2.4, errorRate: 0.125, latencyP95Ms: 320 }}
        />
      </svg>
    );
    const drilldownHtml = renderToStaticMarkup(
      <HzTopologyEdge
        id="checkout-payment"
        variant="drilldown"
        tone="orange"
        focus="active-path"
        selected
        href="/trace/manage?edgeId=checkout-payment"
        aria-label="Inspect checkout-payment edge"
        from={{ x: 18, y: 42 }}
        to={{ x: 66, y: 42 }}
        relationshipType="trace-call"
        source="otlp-trace-call"
        evidenceBadges={['trace', 'alert']}
        redMetrics={{ requestRatePerSecond: 2.4, errorRate: 0.125, latencyP95Ms: 320 }}
      />
    );

    expect(lineHtml).toContain('data-hz-ui="topology-edge"');
    expect(lineHtml).toContain('data-hz-topology-primitive="edge"');
    expect(lineHtml).toContain('data-hz-topology-edge-owner="hertzbeat-ui-edge"');
    expect(lineHtml).toContain('data-hz-topology-edge-variant="line"');
    expect(lineHtml).toContain('data-hz-topology-edge-line-owner="hertzbeat-ui-edge-line"');
    expect(lineHtml).toContain('data-hz-topology-edge-path-owner="hertzbeat-ui-edge-path"');
    expect(lineHtml).toContain('data-hz-topology-edge-arrow-owner="hertzbeat-ui-edge-arrow"');
    expect(lineHtml).toContain('data-hz-topology-edge-tone="orange"');
    expect(lineHtml).toContain('data-hz-topology-edge-focus="active-path"');
    expect(lineHtml).toContain('data-hz-topology-edge-selected="true"');
    expect(lineHtml).toContain('data-hz-topology-edge-relationship-type="trace-call"');
    expect(lineHtml).toContain('data-hz-topology-edge-source="otlp-trace-call"');
    expect(lineHtml).toContain('data-hz-topology-edge-evidence-badges="trace alert"');
    expect(lineHtml).toContain('data-hz-topology-edge-request-rate="2.4"');
    expect(lineHtml).toContain('data-hz-topology-edge-error-rate="0.125"');
    expect(lineHtml).toContain('data-hz-topology-edge-latency-p95-ms="320"');
    expect(lineHtml).toContain('data-hz-topology-edge-red-owner="hertzbeat-ui-edge-red"');
    expect(lineHtml).toContain('data-hz-topology-edge-badge-owner="hertzbeat-ui-edge-badge"');
    expect(lineHtml).toContain('stroke-width="0.25"');
    expect(drilldownHtml).toContain('data-hz-ui="topology-edge"');
    expect(drilldownHtml).toContain('data-hz-topology-edge-variant="drilldown"');
    expect(drilldownHtml).toContain('data-hz-topology-edge-drilldown-owner="hertzbeat-ui-edge-drilldown"');
    expect(drilldownHtml).toContain('data-hz-topology-edge-hit-target-owner="hertzbeat-ui-edge-hit-target"');
    expect(drilldownHtml).toContain('href="/trace/manage?edgeId=checkout-payment"');
    expect(drilldownHtml).toContain('aria-label="Inspect checkout-payment edge"');
    expect(drilldownHtml).not.toContain('rounded-[16px]');
    expect(drilldownHtml).not.toContain('rounded-[14px]');
    expect(drilldownHtml).not.toContain('rounded-[12px]');
  });

  it('renders a compact topology hover tooltip for node and edge investigation evidence', () => {
    const html = renderToStaticMarkup(
      <HzTopologyHoverTooltip
        kind="edge"
        title="checkout-api -> orders-db"
        summary="OTLP trace-call edge"
        visibility="hover"
        trigger="live-edge-hover"
        placement="canvas-anchor"
        anchor={{ x: 240, y: 188, source: 'g6-pointer' }}
        size="compact"
        facts={[
          { id: 'source', label: 'Source', value: 'checkout-api', meta: 'service:commerce/checkout' },
          { id: 'target', label: 'Target', value: 'orders-db', meta: 'database:commerce/orders' },
          { id: 'relation-type', label: 'Relation', value: 'database-connection' },
          { id: 'last-seen', label: 'Last seen', value: '2026/04/29 13:20:00' },
          { id: 'sample-trace', label: 'Sample trace', value: 'trace-123' }
        ]}
        metrics={[
          { id: 'request-rate', label: 'Request rate', value: '2.4/s', tone: 'info' },
          { id: 'error-rate', label: 'Error rate', value: '12.5%', tone: 'warning' },
          { id: 'latency-p95', label: 'P95', value: '320ms', tone: 'warning' }
        ]}
        evidenceBadges={['trace', 'alert']}
      />
    );

    expect(html).toContain('role="tooltip"');
    expect(html).toContain('data-hz-ui="topology-hover-tooltip"');
    expect(html).toContain('data-hz-topology-primitive="hover-tooltip"');
    expect(html).toContain('data-hz-topology-hover-kind="edge"');
    expect(html).toContain('data-hz-topology-hover-visibility="hover"');
    expect(html).toContain('data-hz-topology-hover-trigger="live-edge-hover"');
    expect(html).toContain('data-hz-topology-hover-trigger-owner="hertzbeat-ui-hover-trigger"');
    expect(html).toContain('data-hz-topology-hover-placement="canvas-anchor"');
    expect(html).toContain('data-hz-topology-hover-collision-safe="cursor-anchor-clamped"');
    expect(html).toContain('data-hz-topology-hover-anchor-collision-boundary="canvas"');
    expect(html).toContain('data-hz-topology-hover-anchor-owner="hertzbeat-ui-hover-anchor"');
    expect(html).toContain('data-hz-topology-hover-anchor-source="g6-pointer"');
    expect(html).toContain('data-hz-topology-hover-anchor-x="240"');
    expect(html).toContain('data-hz-topology-hover-anchor-y="188"');
    expect(html).toContain('--hz-topology-hover-x:240px');
    expect(html).toContain('--hz-topology-hover-y:188px');
    expect(html).toContain('--hz-topology-hover-width:292px');
    expect(html).toContain('--hz-topology-hover-height:180px');
    expect(html).toContain('left:clamp(12px,var(--hz-topology-hover-x),calc(100% - var(--hz-topology-hover-width)))');
    expect(html).toContain('top:clamp(52px,var(--hz-topology-hover-y),calc(100% - var(--hz-topology-hover-height)))');
    expect(html).not.toContain('left-[var(--hz-topology-hover-x)]');
    expect(html).not.toContain('absolute right-4 top-4 z-10');
    expect(html).not.toContain('top-[96px]');
    expect(html).toContain('data-hz-topology-hover-size="compact"');
    expect(html).toContain('data-hz-topology-hover-surface-owner="hertzbeat-ui-hover-surface"');
    expect(html).toContain('data-hz-topology-hover-header-owner="hertzbeat-ui-hover-header"');
    expect(html).toContain('data-hz-topology-hover-title-owner="hertzbeat-ui-hover-title"');
    expect(html).toContain('data-hz-topology-hover-summary-owner="hertzbeat-ui-hover-summary"');
    expect(html).toContain('data-hz-topology-hover-fact-grid-owner="hertzbeat-ui-hover-fact-grid"');
    expect(html).toContain('data-hz-topology-hover-fact="source"');
    expect(html).toContain('data-hz-topology-hover-fact-owner="hertzbeat-ui-hover-fact"');
    expect(html).toContain('data-hz-topology-hover-fact-label-owner="hertzbeat-ui-hover-fact-label"');
    expect(html).toContain('data-hz-topology-hover-fact-value-owner="hertzbeat-ui-hover-fact-value"');
    expect(html).toContain('data-hz-topology-hover-fact-meta-owner="hertzbeat-ui-hover-fact-meta"');
    expect(html).toContain('data-hz-topology-hover-fact="target"');
    expect(html).toContain('data-hz-topology-hover-fact="relation-type"');
    expect(html).toContain('data-hz-topology-hover-fact="last-seen"');
    expect(html).toContain('data-hz-topology-hover-fact="sample-trace"');
    expect(html).toContain('data-hz-topology-hover-metric-grid-owner="hertzbeat-ui-hover-metric-grid"');
    expect(html).toContain('data-hz-topology-hover-metric="request-rate"');
    expect(html).toContain('data-hz-topology-hover-metric-owner="hertzbeat-ui-hover-metric"');
    expect(html).toContain('data-hz-topology-hover-metric-indicator-owner="hertzbeat-ui-hover-metric-indicator"');
    expect(html).toContain('data-hz-topology-hover-metric-label-owner="hertzbeat-ui-hover-metric-label"');
    expect(html).toContain('data-hz-topology-hover-metric-value-owner="hertzbeat-ui-hover-metric-value"');
    expect(html).toContain('data-hz-topology-hover-metric="error-rate"');
    expect(html).toContain('data-hz-topology-hover-metric="latency-p95"');
    expect(html).toContain('data-hz-topology-hover-badge-list-owner="hertzbeat-ui-hover-badge-list"');
    expect(html).toContain('data-hz-topology-hover-badge="trace"');
    expect(html).toContain('data-hz-topology-hover-badge-owner="hertzbeat-ui-hover-badge"');
    expect(html).toContain('checkout-api -&gt; orders-db');
    expect(html).toContain('trace-123');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a compact topology legend for health, source, confidence, and stale evidence semantics', () => {
    const source = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <HzTopologyLegend
        title="Topology legend"
        boundary="framed"
        sections={[
          {
            id: 'health',
            label: 'Health',
            items: [
              { id: 'healthy', label: 'Healthy', tone: 'success', value: 'good' },
              { id: 'warning', label: 'Warning', tone: 'warning', value: 'watch' },
              { id: 'critical', label: 'Critical', tone: 'critical', value: 'act' }
            ]
          },
          {
            id: 'source-kind',
            label: 'Evidence source',
            items: [
              { id: 'trace', label: 'Trace calls', tone: 'info', value: 'trace' },
              { id: 'relation', label: 'Entity relation', tone: 'neutral', value: 'relation' }
            ]
          },
          {
            id: 'confidence',
            label: 'Confidence',
            items: [
              { id: 'live', label: 'Current evidence', tone: 'success', pattern: 'solid' },
              { id: 'stale', label: 'Stale evidence', tone: 'warning', pattern: 'dashed' }
            ]
          }
        ]}
      />
    );

    expect(html).toContain('data-hz-ui="topology-legend"');
    expect(html).toContain('data-hz-topology-primitive="legend"');
    expect(html).toContain('data-hz-topology-legend-boundary="framed"');
    expect(html).toContain('data-hz-topology-legend-boundary-owner="hertzbeat-ui-legend-boundary"');
    expect(html).toContain('data-hz-topology-legend-header-owner="hertzbeat-ui-legend-header"');
    expect(html).toContain('data-hz-topology-legend-title-owner="hertzbeat-ui-legend-title"');
    expect(html).toContain('data-hz-topology-legend-summary-owner="hertzbeat-ui-legend-summary"');
    expect(html).toContain('data-hz-topology-legend-section="health"');
    expect(html).toContain('data-hz-topology-legend-section-owner="hertzbeat-ui-legend-section"');
    expect(html).toContain('data-hz-topology-legend-section-label-owner="hertzbeat-ui-legend-section-label"');
    expect(html).toContain('data-hz-topology-legend-section="source-kind"');
    expect(html).toContain('data-hz-topology-legend-section="confidence"');
    expect(html).toContain('data-hz-topology-legend-item="stale"');
    expect(html).toContain('data-hz-topology-legend-item-owner="hertzbeat-ui-legend-item"');
    expect(html).toContain('data-hz-topology-legend-visual-mode="source-backed-text"');
    expect(html).toContain('data-hz-topology-legend-source-label="edge token"');
    expect(html).toContain('data-hz-topology-legend-item-label-owner="hertzbeat-ui-legend-item-label"');
    expect(html).toContain('data-hz-topology-legend-item-value-owner="hertzbeat-ui-legend-item-value"');
    expect(html).toContain('data-hz-topology-legend-tone="warning"');
    expect(html).toContain('data-hz-topology-legend-pattern="dashed"');
    expect(html).toContain('Topology legend');
    expect(html).toContain('Current evidence');
    expect(source).not.toContain("swatch?: 'line'");
    expect(source).not.toContain('data-hz-topology-legend-swatch-owner');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a low-occlusion topology legend density for in-canvas G6 docks', () => {
    const html = renderToStaticMarkup(
      <HzTopologyLegend
        title="Canvas legend"
        density="canvas-dock"
        boundary="flush"
        sections={[
          {
            id: 'status',
            label: 'Status',
	            items: [
	              {
	                id: 'service-node',
	                label: 'Service node',
	                iconSrc: 'data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2024%2024%22%3E%3C/svg%3E',
	                iconLibrary: 'lucide-react',
	                iconName: 'server-cog',
	                iconSource: 'entity-type-catalog',
	                visualSource: 'lucide-react'
	              },
	              { id: 'healthy-node', label: 'Healthy node', color: '#22c55e', visualSource: 'hertzbeat-status-token' },
	              { id: 'critical-node', label: 'Critical node', color: '#ef4444', visualSource: 'hertzbeat-status-token' }
	            ]
	          },
          {
            id: 'interaction',
            label: 'Interaction',
            items: [
              { id: 'selected-node', label: 'Selected node', color: '#e5edf8', visualSource: 'hertzbeat-interaction-token' },
              { id: 'dimmed-edge', label: 'Dimmed edge', color: '#94a3b8', pattern: 'muted', visualSource: 'hertzbeat-edge-token' }
            ]
          }
        ]}
      />
    );

    expect(html).toContain('data-hz-topology-legend-density="canvas-dock"');
    expect(html).toContain('data-hz-topology-legend-density-owner="hertzbeat-ui-legend-density"');
    expect(html).toContain('data-hz-topology-legend-layout="inline-g6-dock"');
    expect(html).toContain('data-hz-topology-legend-occlusion="low"');
    expect(html).toContain('data-hz-topology-legend-border="none"');
    expect(html).toContain('data-hz-topology-legend-summary-visibility="hidden"');
    expect(html).toContain('data-hz-topology-legend-section="status"');
    expect(html).toContain('data-hz-topology-legend-section="interaction"');
	    expect(html).toContain('data-hz-topology-legend-visual-mode="source-backed-text"');
	    expect(html).toContain('data-hz-topology-legend-visual-source="lucide-react"');
	    expect(html).toContain('data-hz-topology-legend-source-label="lucide-react"');
	    expect(html).toContain('data-hz-topology-legend-icon-owner="hertzbeat-ui-legend-source-icon"');
	    expect(html).toContain('data-hz-topology-legend-icon-library="lucide-react"');
	    expect(html).toContain('data-hz-topology-legend-icon-name="server-cog"');
	    expect(html).toContain('data-hz-topology-legend-icon-source="entity-type-catalog"');
	    expect(html).toContain('data-hz-topology-legend-icon-no-handdrawn="true"');
	    expect(html).toContain('data-hz-topology-legend-visual-source="hertzbeat-status-token"');
	    expect(html).toContain('data-hz-topology-legend-visual-source="hertzbeat-interaction-token"');
	    expect(html).toContain('data-hz-topology-legend-visual-source="hertzbeat-edge-token"');
    expect(html).toContain('data-hz-topology-legend-source-label="status token"');
    expect(html).toContain('data-hz-topology-legend-source-label="interaction token"');
    expect(html).toContain('data-hz-topology-legend-source-label="edge token"');
    expect(html).toContain('data-hz-topology-legend-no-handdrawn-icon="true"');
    expect(html).not.toContain('data-hz-topology-legend-swatch-owner=');
    expect(html).not.toContain('data-hz-topology-legend-swatch-shape=');
    expect(html).not.toContain('data-hz-topology-legend-swatch-shape="node-ring"');
    expect(html).not.toContain('data-hz-topology-legend-swatch-shape="selected-ring"');
    expect(html).toContain('data-hz-topology-legend-color="#22c55e"');
    expect(html).toContain('data-hz-topology-legend-color="#e5edf8"');
    expect(html).toContain('Canvas legend');
    expect(html).toContain('Selected node');
    expect(html).not.toContain('2 groups');
  });

  it('omits empty topology legend sections so graph-scoped legends do not advertise absent node types', () => {
    const html = renderToStaticMarkup(
      <HzTopologyLegend
        title="Legend"
        boundary="flush"
        density="canvas-dock"
        sections={[
          { id: 'node-type', label: 'Node type', items: [] },
          {
            id: 'status',
            label: 'Status',
            items: [{ id: 'healthy-node', label: 'Healthy', value: 'healthy', visualSource: 'hertzbeat-status-token' }]
          }
        ]}
      />
    );

    expect(html).not.toContain('data-hz-topology-legend-section="node-type"');
    expect(html).not.toContain('Node type');
    expect(html).toContain('data-hz-topology-legend-section="status"');
    expect(html).toContain('data-hz-topology-legend-item="healthy-node"');
  });

  it('does not render a topology legend shell when every section is empty', () => {
    const html = renderToStaticMarkup(
      <HzTopologyLegend
        title="Legend"
        boundary="flush"
        density="canvas-dock"
        sections={[{ id: 'node-type', label: 'Node type', items: [] }]}
      />
    );

    expect(html).toBe('');
  });

  it('renders a topology detail drawer for edge evidence and cross-signal handoffs', () => {
    const html = renderToStaticMarkup(
      <HzTopologyDetailDrawer
        kind="edge"
        density="graph-first"
        surface="framed"
        subjectId="checkout-orders"
        sourceId="svc-checkout"
        targetId="db-orders"
        relationType="trace-call"
        sourceKind="otlp-trace-call"
        eyebrow="Relationship evidence"
        title="checkout-api to orders-db"
        subtitle="Trace call · collector-a"
        boundary="This relationship is backed by selected-window evidence."
        facts={[
          { id: 'source', label: 'Source entity', value: 'checkout-api', meta: 'service:checkout' },
          { id: 'target', label: 'Target entity', value: 'orders-db', meta: 'database:orders' },
          { id: 'request-rate', label: 'Request rate', value: '7.25/s', meta: 'Trace graph', tone: 'info' },
          { id: 'error-rate', label: 'Error rate', value: '2.1%', meta: 'Trace graph', tone: 'warning' }
        ]}
        actions={[
          { id: 'from-entity', href: '/entities/source', label: 'Source entity' },
          { id: 'alert-impact', href: '/alert/center', label: 'Alert impact', emphasis: 'primary', copy: 'Open with current edge context.' }
        ]}
        signalActions={[
          { id: 'metrics', href: '/ingestion/otlp/metrics', label: 'Metrics evidence', emphasis: 'primary' },
          { id: 'logs', href: '/log/manage', label: 'Logs evidence' },
          { id: 'traces', href: '/trace/manage', label: 'Traces evidence' }
        ]}
      />
    );

    expect(html).toContain('data-hz-ui="topology-detail-drawer"');
    expect(html).toContain('data-hz-topology-primitive="detail-drawer"');
    expect(html).toContain('data-hz-topology-detail-kind="edge"');
    expect(html).toContain('data-hz-topology-detail-density="graph-first"');
    expect(html).toContain('data-hz-topology-detail-density-owner="hertzbeat-ui-detail-density"');
    expect(html).toContain('data-hz-topology-detail-visual-weight="low-interruption"');
    expect(html).toContain('data-hz-topology-detail-fact-density="compressed"');
    expect(html).toContain('data-hz-topology-detail-rail-fit="compact-side-rail"');
    expect(html).toContain('data-hz-topology-detail-rail-fit-owner="hertzbeat-ui-detail-rail-fit"');
    expect(html).toContain('data-hz-topology-detail-rail-max-block="bounded-560px"');
    expect(html).toContain('data-hz-topology-detail-overflow-policy="internal-scroll"');
    expect(html).toContain('data-hz-topology-detail-scroll-reset="identity-change"');
    expect(html).toContain('data-hz-topology-detail-scroll-reset-owner="hertzbeat-ui-detail-scroll-reset"');
    expect(html).toContain('data-hz-topology-detail-scroll-reset-key="edge:checkout-orders:svc-checkout:db-orders:trace-call:otlp-trace-call:unknown"');
    expect(html).toContain('data-hz-topology-detail-surface="framed"');
    expect(html).toContain('data-hz-topology-detail-surface-owner="hertzbeat-ui-detail-surface"');
    expect(html).toContain('data-hz-topology-detail-identity-owner="hertzbeat-ui-detail-identity"');
    expect(html).toContain('data-hz-topology-detail-subject-id="checkout-orders"');
    expect(html).toContain('data-hz-topology-detail-source-id="svc-checkout"');
    expect(html).toContain('data-hz-topology-detail-target-id="db-orders"');
    expect(html).toContain('data-hz-topology-detail-relation-type="trace-call"');
    expect(html).toContain('data-hz-topology-detail-source-kind="otlp-trace-call"');
    expect(html).toContain('data-hz-topology-detail-header-owner="hertzbeat-ui-detail-header"');
    expect(html).toContain('data-hz-topology-detail-eyebrow-owner="hertzbeat-ui-detail-eyebrow"');
    expect(html).toContain('data-hz-topology-detail-title-owner="hertzbeat-ui-detail-title"');
    expect(html).toContain('data-hz-topology-detail-subtitle-owner="hertzbeat-ui-detail-subtitle"');
    expect(html).toContain('data-hz-topology-detail-boundary="context"');
    expect(html).toContain('data-hz-topology-detail-boundary-owner="hertzbeat-ui-detail-boundary"');
    expect(html).toContain('data-hz-topology-detail-boundary-copy-owner="hertzbeat-ui-detail-boundary-copy"');
    expect(html).toContain('data-hz-topology-detail-fact-group-owner="hertzbeat-ui-detail-fact-group"');
    expect(html).toContain('data-hz-topology-detail-fact-owner="hertzbeat-ui-detail-fact"');
    expect(html).toContain('data-hz-topology-detail-fact-label-owner="hertzbeat-ui-detail-fact-label"');
    expect(html).toContain('data-hz-topology-detail-fact-value-owner="hertzbeat-ui-detail-fact-value"');
    expect(html).toContain('data-hz-topology-detail-fact-meta-owner="hertzbeat-ui-detail-fact-meta"');
    expect(html).toContain('data-hz-topology-detail-fact="request-rate"');
    expect(html).toContain('data-hz-topology-detail-fact-tone="info"');
    expect(html).toContain('data-hz-topology-detail-action-group-owner="hertzbeat-ui-detail-action-group"');
    expect(html).toContain('data-hz-topology-detail-action-link-owner="hertzbeat-ui-detail-action-link"');
    expect(html).toContain('data-hz-topology-detail-action-label-owner="hertzbeat-ui-detail-action-label"');
    expect(html).toContain('data-hz-topology-detail-action="alert-impact"');
    expect(html).toContain('data-hz-topology-detail-action-emphasis="primary"');
    expect(html).toContain('data-hz-topology-detail-action-copy-owner="hertzbeat-ui-detail-action-copy"');
    expect(html).toContain('data-hz-topology-detail-signal-action-group-owner="hertzbeat-ui-detail-signal-action-group"');
    expect(html).toContain('data-hz-topology-detail-signal-action-link-owner="hertzbeat-ui-detail-signal-action-link"');
    expect(html).toContain('data-hz-topology-detail-signal-action-label-owner="hertzbeat-ui-detail-signal-action-label"');
    expect(html).toContain('data-hz-topology-detail-signal-action="traces"');
    expect(html).toContain('Relationship evidence');
    expect(html).toContain('checkout-api to orders-db');
    expect(html).toContain('Open with current edge context.');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a topology detail drawer for focused node evidence and signal sections', () => {
    const html = renderToStaticMarkup(
      <HzTopologyDetailDrawer
        kind="node"
        density="graph-first"
        surface="flush"
        subjectId="svc-checkout"
        entityType="service"
        sourceKind="otlp-trace-call"
        eyebrow="Current entity"
        title="checkout-api"
        subtitle="service:checkout · prod"
        boundary="Open signals with the current topology scope."
        facts={[
          { id: 'entity-id', label: 'Entity id', value: 'service:checkout' },
          { id: 'health', label: 'Health', value: '82', meta: '1 unhealthy monitor', tone: 'warning' },
          { id: 'request-rate', label: 'Request rate', value: '12.34/s', tone: 'info' }
        ]}
        actions={[
          { id: 'entity', href: '/entities/service:checkout', label: 'Entity detail', emphasis: 'primary' }
        ]}
        signalActions={[
          { id: 'metrics', href: '/metrics', label: 'Metrics', emphasis: 'primary' },
          { id: 'logs', href: '/logs', label: 'Logs' },
          { id: 'traces', href: '/traces', label: 'Traces' }
        ]}
        signalActionsLabel="Open signals"
      />
    );

    expect(html).toContain('data-hz-ui="topology-detail-drawer"');
    expect(html).toContain('data-hz-topology-primitive="detail-drawer"');
    expect(html).toContain('data-hz-topology-detail-kind="node"');
    expect(html).toContain('data-hz-topology-detail-density="graph-first"');
    expect(html).toContain('data-hz-topology-detail-density-owner="hertzbeat-ui-detail-density"');
    expect(html).toContain('data-hz-topology-detail-visual-weight="low-interruption"');
    expect(html).toContain('data-hz-topology-detail-rail-fit="compact-side-rail"');
    expect(html).toContain('data-hz-topology-detail-rail-fit-owner="hertzbeat-ui-detail-rail-fit"');
    expect(html).toContain('data-hz-topology-detail-rail-max-block="bounded-560px"');
    expect(html).toContain('data-hz-topology-detail-overflow-policy="internal-scroll"');
    expect(html).toContain('data-hz-topology-detail-scroll-reset="identity-change"');
    expect(html).toContain('data-hz-topology-detail-scroll-reset-owner="hertzbeat-ui-detail-scroll-reset"');
    expect(html).toContain('data-hz-topology-detail-scroll-reset-key="node:svc-checkout:none:none:unknown:otlp-trace-call:service"');
    expect(html).toContain('data-hz-topology-detail-signal-action-placement="header-dock"');
    expect(html).toContain('data-hz-topology-detail-signal-action-placement-owner="hertzbeat-ui-detail-signal-action-placement"');
    expect(html).toContain('data-hz-topology-detail-signal-action-sticky="top-with-header-context"');
    expect(html).toContain('data-hz-topology-detail-surface="flush"');
    expect(html).toContain('data-hz-topology-detail-surface-owner="hertzbeat-ui-detail-surface"');
    expect(html).toContain('data-hz-topology-detail-identity-owner="hertzbeat-ui-detail-identity"');
    expect(html).toContain('data-hz-topology-detail-subject-id="svc-checkout"');
    expect(html).toContain('data-hz-topology-detail-entity-type="service"');
    expect(html).toContain('data-hz-topology-detail-source-kind="otlp-trace-call"');
    expect(html).toContain('data-hz-topology-detail-header-owner="hertzbeat-ui-detail-header"');
    expect(html).toContain('data-hz-topology-detail-eyebrow-owner="hertzbeat-ui-detail-eyebrow"');
    expect(html).toContain('data-hz-topology-detail-title-owner="hertzbeat-ui-detail-title"');
    expect(html).toContain('data-hz-topology-detail-subtitle-owner="hertzbeat-ui-detail-subtitle"');
    expect(html).toContain('data-hz-topology-detail-boundary="context"');
    expect(html).toContain('data-hz-topology-detail-boundary-owner="hertzbeat-ui-detail-boundary"');
    expect(html).toContain('data-hz-topology-detail-boundary-copy-owner="hertzbeat-ui-detail-boundary-copy"');
    expect(html).toContain('data-hz-topology-detail-fact-group-owner="hertzbeat-ui-detail-fact-group"');
    expect(html).toContain('data-hz-topology-detail-fact-owner="hertzbeat-ui-detail-fact"');
    expect(html).toContain('data-hz-topology-detail-fact-label-owner="hertzbeat-ui-detail-fact-label"');
    expect(html).toContain('data-hz-topology-detail-fact-value-owner="hertzbeat-ui-detail-fact-value"');
    expect(html).toContain('data-hz-topology-detail-fact-meta-owner="hertzbeat-ui-detail-fact-meta"');
    expect(html).toContain('data-hz-topology-detail-fact="health"');
    expect(html).toContain('data-hz-topology-detail-fact-tone="warning"');
    expect(html).toContain('data-hz-topology-detail-action-group-owner="hertzbeat-ui-detail-action-group"');
    expect(html).toContain('data-hz-topology-detail-action-link-owner="hertzbeat-ui-detail-action-link"');
    expect(html).toContain('data-hz-topology-detail-action-label-owner="hertzbeat-ui-detail-action-label"');
    expect(html).toContain('data-hz-topology-detail-action="entity"');
    expect(html).toContain('data-hz-topology-detail-signal-action-group-owner="hertzbeat-ui-detail-signal-action-group"');
    expect(html).toContain('data-hz-topology-detail-signal-label="signals"');
    expect(html).toContain('data-hz-topology-detail-signal-label-owner="hertzbeat-ui-detail-signal-label"');
    expect(html).toContain('data-hz-topology-detail-signal-action-link-owner="hertzbeat-ui-detail-signal-action-link"');
    expect(html).toContain('data-hz-topology-detail-signal-action-label-owner="hertzbeat-ui-detail-signal-action-label"');
    expect(html).toContain('data-hz-topology-detail-signal-action="metrics"');
    expect(html).toContain('data-hz-topology-detail-signal-action="logs"');
    expect(html).toContain('data-hz-topology-detail-signal-action="traces"');
    expect(html.indexOf('data-hz-topology-detail-actions="signals"')).toBeLessThan(
      html.indexOf('data-hz-topology-detail-boundary="context"')
    );
    expect(html.indexOf('data-hz-topology-detail-actions="signals"')).toBeLessThan(
      html.indexOf('data-hz-topology-detail-fact-group-owner="hertzbeat-ui-detail-fact-group"')
    );
  });

  it('renders a compact topology filter strip for source and focus controls', () => {
    const sourceHtml = renderToStaticMarkup(
      <HzTopologyFilterStrip
        variant="source-grid"
        boundary="section"
        items={[
          {
            id: 'otlp-trace-call',
            href: '/topology?sourceKind=otlp-trace-call',
            label: 'Trace calls',
            copy: 'Observed service edges',
            active: true
          },
          {
            id: 'monitor-bind',
            href: '/topology?sourceKind=monitor-bind',
            label: 'Monitor binds',
            copy: 'Ownership evidence'
          }
        ]}
      />
    );
    const viewHtml = renderToStaticMarkup(
      <HzTopologyFilterStrip
        variant="view-list"
        boundary="none"
        copyVisibility="assistive"
        items={[
          {
            id: 'service-call',
            href: '/topology?viewMode=service-call',
            label: 'Service calls',
            copy: 'Layered trace graph',
            active: true
          }
        ]}
      />
    );

    expect(sourceHtml).toContain('data-hz-ui="topology-filter-strip"');
    expect(sourceHtml).toContain('data-hz-topology-primitive="filter-strip"');
    expect(sourceHtml).toContain('data-hz-topology-filter-strip-density="compact"');
    expect(sourceHtml).toContain('data-hz-topology-filter-strip-variant="source-grid"');
    expect(sourceHtml).toContain('data-hz-topology-filter-strip-boundary="section"');
    expect(sourceHtml).toContain(
      'data-hz-topology-filter-strip-boundary-owner="hertzbeat-ui-filter-strip-boundary"'
    );
    expect(sourceHtml).toContain('data-hz-topology-filter-item="otlp-trace-call"');
    expect(sourceHtml).toContain('data-hz-topology-filter-item-owner="hertzbeat-ui-filter-strip-item"');
    expect(sourceHtml).toContain('data-hz-topology-filter-item-active="true"');
    expect(sourceHtml).toContain('data-hz-topology-filter-item-label-owner="hertzbeat-ui-filter-strip-label"');
    expect(sourceHtml).toContain('data-hz-topology-filter-item-copy-owner="hertzbeat-ui-filter-strip-copy"');
    expect(sourceHtml).toContain('Trace calls');
    expect(sourceHtml).toContain('Observed service edges');
    expect(viewHtml).toContain('data-hz-topology-filter-strip-variant="view-list"');
    expect(viewHtml).toContain('data-hz-topology-filter-strip-boundary="none"');
    expect(viewHtml).toContain('data-hz-topology-filter-strip-copy-visibility="assistive"');
    expect(viewHtml).toContain('data-hz-topology-filter-strip-copy-visibility-owner="hertzbeat-ui-filter-strip-copy-visibility"');
    expect(viewHtml).toContain(
      'data-hz-topology-filter-strip-boundary-owner="hertzbeat-ui-filter-strip-boundary"'
    );
    expect(viewHtml).toContain('data-hz-topology-filter-item="service-call"');
    expect(viewHtml).toContain('data-hz-topology-filter-item-owner="hertzbeat-ui-filter-strip-item"');
    expect(viewHtml).toContain('data-hz-topology-filter-item-label-owner="hertzbeat-ui-filter-strip-label"');
    expect(viewHtml).toContain('data-hz-topology-filter-item-copy-owner="hertzbeat-ui-filter-strip-copy"');
    expect(viewHtml).toContain('sr-only');
    expect(sourceHtml).not.toContain('rounded-[16px]');
    expect(sourceHtml).not.toContain('rounded-[14px]');
    expect(sourceHtml).not.toContain('rounded-[12px]');
  });

  it('renders a single-line topology source rail for first-viewport graph density', () => {
    const html = renderToStaticMarkup(
      <HzTopologyFilterStrip
        variant="source-rail"
        boundary="none"
        items={[
          {
            id: 'otlp-trace-call',
            href: '/topology?sourceKind=otlp-trace-call',
            label: 'Trace calls',
            active: true
          },
          {
            id: 'monitor-bind',
            href: '/topology?sourceKind=monitor-bind',
            label: 'Monitor binds'
          },
          {
            id: 'entity-relation',
            href: '/topology?sourceKind=entity-relation',
            label: 'Entity relations'
          }
        ]}
      />
    );

    expect(html).toContain('data-hz-topology-filter-strip-variant="source-rail"');
    expect(html).toContain('data-hz-topology-filter-strip-layout="single-line-wrap"');
    expect(html).toContain('data-hz-topology-filter-strip-density="compact-rail"');
    expect(html).toContain('data-hz-topology-filter-strip-height-contract="one-control-row-preferred"');
    expect(html).toContain('data-hz-topology-filter-item-label-owner="hertzbeat-ui-filter-strip-label"');
    expect(html).not.toContain('data-hz-topology-filter-item-copy-owner="hertzbeat-ui-filter-strip-copy"');
    expect(html).not.toContain('md:grid-cols-2');
    expect(html).not.toContain('xl:grid-cols-4');
  });

  it('renders a compact topology action link for standalone investigation actions', () => {
    const html = renderToStaticMarkup(
      <HzTopologyActionLink
        id="alert-impact"
        href="/alert/center?source=topology"
        label="Open alert impact"
        copy="Keep the selected topology scope."
        emphasis="primary"
        spacing="inset"
      />
    );

    expect(html).toContain('data-hz-ui="topology-action-link"');
    expect(html).toContain('data-hz-topology-primitive="action-link"');
    expect(html).toContain('data-hz-topology-action-link-density="compact"');
    expect(html).toContain('data-hz-topology-action-link-spacing="inset"');
    expect(html).toContain('data-hz-topology-action-link-spacing-owner="hertzbeat-ui-action-link-spacing"');
    expect(html).toContain('data-hz-topology-action-link="alert-impact"');
    expect(html).toContain('data-hz-topology-action-link-emphasis="primary"');
    expect(html).toContain('data-hz-topology-action-link-label-owner="hertzbeat-ui-action-link-label"');
    expect(html).toContain('data-hz-topology-action-link-copy-owner="hertzbeat-ui-action-link-copy"');
    expect(html).toContain('href="/alert/center?source=topology"');
    expect(html).toContain('Open alert impact');
    expect(html).toContain('Keep the selected topology scope.');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a compact topology scope bar for time, environment, and refresh state', () => {
    const html = renderToStaticMarkup(
      <HzTopologyScopeBar
        boundary="section"
        items={[
          { id: 'environment', label: 'Environment', value: 'prod' },
          { id: 'time-range', label: 'Time range', value: 'last 1 hour' }
        ]}
        actions={[
          { id: 'refresh', label: 'Refresh topology', emphasis: 'neutral' }
        ]}
      />
    );

    expect(html).toContain('data-hz-ui="topology-scope-bar"');
    expect(html).toContain('data-hz-topology-primitive="scope-bar"');
    expect(html).toContain('data-hz-topology-scope-bar-density="compact"');
    expect(html).toContain('data-hz-topology-scope-bar-boundary="section"');
    expect(html).toContain('data-hz-topology-scope-bar-boundary-owner="hertzbeat-ui-scope-bar-boundary"');
    expect(html).toContain('data-hz-topology-scope-item="environment"');
    expect(html).toContain('data-hz-topology-scope-item-owner="hertzbeat-ui-scope-item"');
    expect(html).toContain('data-hz-topology-scope-item-label-owner="hertzbeat-ui-scope-item-label"');
    expect(html).toContain('data-hz-topology-scope-item-value-owner="hertzbeat-ui-scope-item-value"');
    expect(html).toContain('data-hz-topology-scope-item="time-range"');
    expect(html).toContain('data-hz-topology-scope-action="refresh"');
    expect(html).toContain('data-hz-topology-scope-action-owner="hertzbeat-ui-scope-action"');
    expect(html).toContain('flex-nowrap');
    expect(html).toContain('overflow-x-auto');
    expect(html).toContain('prod');
    expect(html).toContain('last 1 hour');
    expect(html).toContain('Refresh topology');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');

    const actionOnlyHtml = renderToStaticMarkup(
      <HzTopologyScopeBar
        summaryVisibility="assistive"
        summaryDedupedBy="topology-toolbar"
        items={[
          { id: 'environment', label: 'Environment', value: 'prod' },
          { id: 'time-range', label: 'Time range', value: 'last 1 hour' }
        ]}
        actions={[
          { id: 'refresh', label: 'Refresh topology', emphasis: 'neutral' }
        ]}
      />
    );

    expect(actionOnlyHtml).toContain('data-hz-topology-scope-summary-visibility="assistive"');
    expect(actionOnlyHtml).toContain('data-hz-topology-scope-summary-deduped-by="topology-toolbar"');
    expect(actionOnlyHtml).toContain('data-hz-topology-scope-item-visibility="assistive"');
    expect(actionOnlyHtml).toContain('class="sr-only"');
    expect(actionOnlyHtml).toContain('data-hz-topology-scope-action="refresh"');
  });

  it('renders a compact topology focus trail for focused graph context and filters', () => {
    const html = renderToStaticMarkup(
      <HzTopologyFocusTrail
        label="Focused topology"
        boundary="section"
        focusMode="focused"
        focusDepth="2"
        focusEntityId="checkout-api"
        crumbs={[
          { id: 'all', href: '/topology', label: 'All entities' },
          { id: 'checkout-api', href: '/topology?entityId=checkout', label: 'checkout-api', value: '2-hop', active: true }
        ]}
        filters={[
          { id: 'environment', label: 'Environment', value: 'prod' },
          { id: 'time-range', label: 'Time range', value: 'last 1 hour' },
          { id: 'source', label: 'Source', value: 'Trace calls' },
          { id: 'view', label: 'View', value: 'Service calls' }
        ]}
        hiddenCountLabel="0 hidden by scope"
        exitAction={{ href: '/topology?environment=prod&timeRange=last-1h&depth=2', label: 'Exit focus' }}
      />
    );

    expect(html).toContain('data-hz-ui="topology-focus-trail"');
    expect(html).toContain('data-hz-topology-primitive="focus-trail"');
    expect(html).toContain('data-hz-topology-focus-trail-mode="focused"');
    expect(html).toContain('data-hz-topology-focus-trail-mode-owner="hertzbeat-ui-focus-trail-mode"');
    expect(html).toContain('data-hz-topology-focus-trail-depth="2"');
    expect(html).toContain('data-hz-topology-focus-trail-depth-owner="hertzbeat-ui-focus-trail-depth"');
    expect(html).toContain('data-hz-topology-focus-trail-entity="checkout-api"');
    expect(html).toContain('data-hz-topology-focus-trail-entity-owner="hertzbeat-ui-focus-trail-entity"');
    expect(html).toContain('data-hz-topology-focus-trail-density="compact"');
    expect(html).toContain('data-hz-topology-focus-trail-boundary="section"');
    expect(html).toContain('data-hz-topology-focus-trail-boundary-owner="hertzbeat-ui-focus-trail-boundary"');
    expect(html).toContain('data-hz-topology-focus-trail-label-owner="hertzbeat-ui-focus-trail-label"');
    expect(html).toContain('data-hz-topology-focus-crumbs-owner="hertzbeat-ui-focus-trail-crumbs"');
    expect(html).toContain('data-hz-topology-focus-crumb="all"');
    expect(html).toContain('data-hz-topology-focus-crumb-owner="hertzbeat-ui-focus-trail-crumb"');
    expect(html).toContain('data-hz-topology-focus-crumb-active="true"');
    expect(html).toContain('data-hz-topology-focus-crumb-label-owner="hertzbeat-ui-focus-trail-crumb-label"');
    expect(html).toContain('data-hz-topology-focus-crumb-value-owner="hertzbeat-ui-focus-trail-crumb-value"');
    expect(html).toContain('data-hz-topology-focus-filters-owner="hertzbeat-ui-focus-trail-filters"');
    expect(html).toContain('data-hz-topology-focus-filter="environment"');
    expect(html).toContain('data-hz-topology-focus-filter-owner="hertzbeat-ui-focus-trail-filter"');
    expect(html).toContain('data-hz-topology-focus-filter-label-owner="hertzbeat-ui-focus-trail-filter-label"');
    expect(html).toContain('data-hz-topology-focus-filter-value-owner="hertzbeat-ui-focus-trail-filter-value"');
    expect(html).toContain('data-hz-topology-focus-hidden-count-owner="hertzbeat-ui-focus-trail-hidden-count"');
    expect(html).toContain('data-hz-topology-focus-exit-owner="hertzbeat-ui-focus-trail-exit"');
    expect(html).toContain('data-hz-topology-focus-exit-href="/topology?environment=prod&amp;timeRange=last-1h&amp;depth=2"');
    expect(html).toContain('data-hz-topology-focus-exit-href-owner="hertzbeat-ui-focus-trail-exit-href"');
    expect(html).toContain('Focused topology');
    expect(html).toContain('checkout-api');
    expect(html).toContain('0 hidden by scope');
    expect(html).toContain('Exit focus');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a topology focus rail for first-viewport investigation context', () => {
    const html = renderToStaticMarkup(
      <HzTopologyFocusTrail
        label="Focused topology"
        density="rail"
        boundary="section"
        crumbs={[
          { id: 'all', href: '/topology', label: 'All entities' },
          { id: 'checkout-api', href: '/topology?entityId=checkout', label: 'checkout-api', value: '2-hop', active: true }
        ]}
        filters={[
          { id: 'environment', label: 'Environment', value: 'prod' },
          { id: 'source', label: 'Source', value: 'Trace calls' }
        ]}
        hiddenCountLabel="0 hidden"
        exitAction={{ href: '/topology', label: 'Exit' }}
      />
    );

    expect(html).toContain('data-hz-topology-focus-trail-density="rail"');
    expect(html).toContain('data-hz-topology-focus-trail-layout="single-line-wrap"');
    expect(html).toContain('data-hz-topology-focus-trail-height-contract="one-control-row-preferred"');
    expect(html).toContain('data-hz-topology-focus-trail-label-owner="hertzbeat-ui-focus-trail-label"');
    expect(html).toContain('sr-only');
    expect(html).toContain('data-hz-topology-focus-crumbs-owner="hertzbeat-ui-focus-trail-crumbs"');
    expect(html).toContain('data-hz-topology-focus-filters-owner="hertzbeat-ui-focus-trail-filters"');
    expect(html).toContain('data-hz-topology-focus-hidden-count-owner="hertzbeat-ui-focus-trail-hidden-count"');
    expect(html).toContain('data-hz-topology-focus-exit-owner="hertzbeat-ui-focus-trail-exit"');
    expect(html).toContain('h-7');
  });

  it('renders a graph-dock topology focus trail without canvas occlusion', () => {
    const html = renderToStaticMarkup(
      <HzTopologyFocusTrail
        label="Focused topology"
        density="graph-dock"
        boundary="section"
        focusMode="focused"
        focusDepth="1"
        focusEntityId="checkout-api"
        crumbs={[
          { id: 'all', href: '/topology', label: 'All entities' },
          { id: 'checkout-api', href: '/topology?entityId=checkout', label: 'checkout-api', value: '1-hop', active: true }
        ]}
        filters={[
          { id: 'environment', label: 'Environment', value: 'prod' },
          { id: 'source', label: 'Source', value: 'Entity relation' }
        ]}
        hiddenCountLabel="0 hidden"
        exitAction={{ href: '/topology?depth=2', label: 'Exit' }}
      />
    );

    expect(html).toContain('data-hz-topology-focus-trail-density="graph-dock"');
    expect(html).toContain('data-hz-topology-focus-trail-layout="single-line-nowrap"');
    expect(html).toContain('data-hz-topology-focus-trail-height-contract="one-compact-row"');
    expect(html).toContain('data-hz-topology-focus-trail-occlusion="none"');
    expect(html).toContain('data-hz-topology-focus-trail-position-contract="document-flow"');
    expect(html).toContain('data-hz-topology-focus-trail-priority="canvas"');
    expect(html).toContain('data-hz-topology-focus-trail-alignment="shared-control-grid"');
    expect(html).toContain('data-hz-topology-focus-trail-inset="0px"');
    expect(html).toContain('data-hz-topology-focus-trail-control-height="28px"');
    expect(html).toContain('data-hz-topology-focus-trail-visual-weight="low-interruption"');
    expect(html).toContain('data-hz-topology-focus-trail-visual-weight-owner="hertzbeat-ui-focus-trail-visual-weight"');
    expect(html).toContain('data-hz-topology-focus-filter-visibility="assistive"');
    expect(html).toContain('data-hz-topology-focus-filter-visibility-owner="hertzbeat-ui-focus-trail-filter-visibility"');
    expect(html).toContain('data-hz-topology-focus-filter-deduped-by="topology-toolbar"');
    expect(html).toContain('sr-only');
    expect(html).toContain('py-1');
    expect(html).toContain('h-6');
    expect(html).not.toContain('absolute');
  });

  it('renders a compact topology group panel for large graph grouping and collapsed clusters', () => {
    const html = renderToStaticMarkup(
      <HzTopologyGroupPanel
        title="Grouped topology"
        copy="Collapse low-signal services while keeping worst health visible."
        groupByLabel="Group by environment"
        boundary="framed"
        items={[
          {
            id: 'prod-services',
            label: 'prod services',
            value: '24 services',
            count: 24,
            collapsedCount: 7,
            worstTone: 'danger',
            active: true,
            meta: 'worst p95 420ms'
          },
          {
            id: 'shared-resources',
            label: 'shared resources',
            value: '6 resources',
            count: 6,
            collapsedCount: 2,
            worstTone: 'warning',
            meta: 'databases and queues'
          }
        ]}
        actions={[
          { id: 'clear-group', href: '/topology?group=none', label: 'Clear group' },
          { id: 'open-table', href: '/topology?view=table', label: 'Open table' }
        ]}
      />
    );

    expect(html).toContain('data-hz-ui="topology-group-panel"');
    expect(html).toContain('data-hz-topology-primitive="group-panel"');
    expect(html).toContain('data-hz-topology-group-panel-density="compact"');
    expect(html).toContain('data-hz-topology-group-panel-boundary="framed"');
    expect(html).toContain('data-hz-topology-group-panel-boundary-owner="hertzbeat-ui-group-panel-boundary"');
    expect(html).toContain('data-hz-topology-group-panel-header-owner="hertzbeat-ui-group-panel-header"');
    expect(html).toContain('data-hz-topology-group-panel-title-owner="hertzbeat-ui-group-panel-title"');
    expect(html).toContain('data-hz-topology-group-panel-copy-owner="hertzbeat-ui-group-panel-copy"');
    expect(html).toContain('data-hz-topology-group-panel-group-by-owner="hertzbeat-ui-group-panel-group-by"');
    expect(html).toContain('data-hz-topology-group-panel-items-owner="hertzbeat-ui-group-panel-items"');
    expect(html).toContain('data-hz-topology-group-panel-item="prod-services"');
    expect(html).toContain('data-hz-topology-group-panel-item-owner="hertzbeat-ui-group-panel-item"');
    expect(html).toContain('data-hz-topology-group-panel-item-active="true"');
    expect(html).toContain('data-hz-topology-group-panel-item-worst-tone="danger"');
    expect(html).toContain('data-hz-topology-group-panel-item-count="24"');
    expect(html).toContain('data-hz-topology-group-panel-item-collapsed-count="7"');
    expect(html).toContain('data-hz-topology-group-panel-label-owner="hertzbeat-ui-group-panel-label"');
    expect(html).toContain('data-hz-topology-group-panel-value-owner="hertzbeat-ui-group-panel-value"');
    expect(html).toContain('data-hz-topology-group-panel-count-owner="hertzbeat-ui-group-panel-count"');
    expect(html).toContain('data-hz-topology-group-panel-meta-owner="hertzbeat-ui-group-panel-meta"');
    expect(html).toContain('data-hz-topology-group-panel-actions-owner="hertzbeat-ui-group-panel-actions"');
    expect(html).toContain('data-hz-topology-group-panel-action="clear-group"');
    expect(html).toContain('data-hz-topology-group-panel-action-owner="hertzbeat-ui-group-panel-action"');
    expect(html).toContain('Grouped topology');
    expect(html).toContain('Group by environment');
    expect(html).toContain('7 collapsed');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a compact topology path summary for selected edge direction and drilldown', () => {
    const html = renderToStaticMarkup(
      <HzTopologyPathSummary
        title="Selected path"
        boundary="section"
        selectedEdgeId="checkout-orders"
        hoveredEdgeId="checkout-orders"
        sourceId="svc-checkout"
        targetId="db-orders"
        relationType="HTTP call"
        sourceKind="otlp-trace-call"
        source={{ label: 'Source', value: 'checkout-api', meta: 'service:checkout' }}
        target={{ label: 'Target', value: 'orders-db', meta: 'database:orders' }}
        relation={{ label: 'Relation', value: 'HTTP call' }}
        directionLabel="upstream to downstream"
        metrics={[
          { id: 'request-rate', label: 'Request rate', value: '12.34/s', tone: 'info' },
          { id: 'error-rate', label: 'Error rate', value: '4.2%', tone: 'warning' },
          { id: 'latency-p95', label: 'P95', value: '180ms', tone: 'warning' }
        ]}
        evidenceBadges={['trace', 'alert']}
        actions={[
          { id: 'focus-path', href: '/topology?edgeId=checkout-orders', label: 'Focus path' },
          { id: 'open-trace', href: '/trace/manage?edgeId=checkout-orders', label: 'Open trace' }
        ]}
      />
    );

    expect(html).toContain('data-hz-ui="topology-path-summary"');
    expect(html).toContain('data-hz-topology-primitive="path-summary"');
    expect(html).toContain('data-hz-topology-path-summary-density="compact"');
    expect(html).toContain('data-hz-topology-path-summary-boundary="section"');
    expect(html).toContain('data-hz-topology-path-summary-boundary-owner="hertzbeat-ui-path-summary-boundary"');
    expect(html).toContain('data-hz-topology-path-interaction-owner="hertzbeat-ui-path-summary-interaction"');
    expect(html).toContain('data-topology-path-summary-interaction-state="selected"');
    expect(html).toContain('data-hz-topology-path-summary-interaction-state="selected"');
    expect(html).toContain('data-topology-path-summary-selected-edge-id="checkout-orders"');
    expect(html).toContain('data-topology-path-summary-hovered-edge-id="checkout-orders"');
    expect(html).toContain('data-hz-topology-path-selected-edge="checkout-orders"');
    expect(html).toContain('data-hz-topology-path-hovered-edge="checkout-orders"');
    expect(html).toContain('data-hz-topology-path-source-id="svc-checkout"');
    expect(html).toContain('data-hz-topology-path-target-id="db-orders"');
    expect(html).toContain('data-hz-topology-path-relation-type="HTTP call"');
    expect(html).toContain('data-hz-topology-path-source-kind="otlp-trace-call"');
    expect(html).toContain('data-hz-topology-path-summary-header-owner="hertzbeat-ui-path-summary-header"');
    expect(html).toContain('data-hz-topology-path-summary-title-owner="hertzbeat-ui-path-summary-title"');
    expect(html).toContain('data-hz-topology-path-summary-direction-owner="hertzbeat-ui-path-summary-direction"');
    expect(html).toContain('data-hz-topology-path-endpoints-owner="hertzbeat-ui-path-summary-endpoints"');
    expect(html).toContain('data-hz-topology-path-endpoint="source"');
    expect(html).toContain('data-hz-topology-path-endpoint-owner="hertzbeat-ui-path-summary-endpoint"');
    expect(html).toContain('data-hz-topology-path-endpoint-label-owner="hertzbeat-ui-path-summary-endpoint-label"');
    expect(html).toContain('data-hz-topology-path-endpoint-value-owner="hertzbeat-ui-path-summary-endpoint-value"');
    expect(html).toContain('data-hz-topology-path-endpoint-meta-owner="hertzbeat-ui-path-summary-endpoint-meta"');
    expect(html).toContain('data-hz-topology-path-arrow-owner="hertzbeat-ui-path-summary-arrow"');
    expect(html).toContain('data-hz-topology-path-relation-owner="hertzbeat-ui-path-summary-relation"');
    expect(html).toContain('data-hz-topology-path-metrics-owner="hertzbeat-ui-path-summary-metrics"');
    expect(html).toContain('data-hz-topology-path-metric="request-rate"');
    expect(html).toContain('data-hz-topology-path-metric-owner="hertzbeat-ui-path-summary-metric"');
    expect(html).toContain('data-hz-topology-path-badge="trace"');
    expect(html).toContain('data-hz-topology-path-badge-owner="hertzbeat-ui-path-summary-badge"');
    expect(html).toContain('data-hz-topology-path-action="focus-path"');
    expect(html).toContain('data-hz-topology-path-action-owner="hertzbeat-ui-path-summary-action"');
    expect(html).toContain('checkout-api');
    expect(html).toContain('orders-db');
    expect(html).toContain('upstream to downstream');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a compact topology evidence list for context and timeline evidence', () => {
    const html = renderToStaticMarkup(
      <HzTopologyEvidenceList
        kind="impact-timeline"
        boundary="companion-timeline"
        title="Impact timeline"
        copy="Selected-window topology evidence."
        items={[
          {
            id: 'activity:901',
            label: 'CMDB',
            value: 'Definition updated',
            meta: 'owner changed - alice',
            tone: 'info',
            'data-topology-impact-timeline-event': 'activity:901'
          },
          {
            id: 'relation:101',
            label: 'Relation',
            value: 'depends_on updated',
            meta: 'manual - system',
            tone: 'warning',
            'data-topology-impact-timeline-event': 'relation:101'
          }
        ]}
      />
    );

    expect(html).toContain('data-hz-ui="topology-evidence-list"');
    expect(html).toContain('data-hz-topology-primitive="evidence-list"');
    expect(html).toContain('data-hz-topology-evidence-list-kind="impact-timeline"');
    expect(html).toContain('data-hz-topology-evidence-list-density="compact"');
    expect(html).toContain('data-hz-topology-evidence-list-boundary="companion-timeline"');
    expect(html).toContain('data-hz-topology-evidence-list-boundary-owner="hertzbeat-ui-evidence-list-boundary"');
    expect(html).toContain('data-hz-topology-evidence-header-owner="hertzbeat-ui-evidence-list-header"');
    expect(html).toContain('data-hz-topology-evidence-title-owner="hertzbeat-ui-evidence-list-title"');
    expect(html).toContain('data-hz-topology-evidence-copy-owner="hertzbeat-ui-evidence-list-copy"');
    expect(html).toContain('data-hz-topology-evidence-count-owner="hertzbeat-ui-evidence-list-count"');
    expect(html).toContain('data-hz-topology-evidence-item="activity:901"');
    expect(html).toContain('data-hz-topology-evidence-item-owner="hertzbeat-ui-evidence-list-item"');
    expect(html).toContain('data-hz-topology-evidence-item-tone="info"');
    expect(html).toContain('data-hz-topology-evidence-item-label-owner="hertzbeat-ui-evidence-list-item-label"');
    expect(html).toContain('data-hz-topology-evidence-item-value-owner="hertzbeat-ui-evidence-list-item-value"');
    expect(html).toContain('data-hz-topology-evidence-item-meta-owner="hertzbeat-ui-evidence-list-item-meta"');
    expect(html).toContain('data-hz-topology-evidence-item="relation:101"');
    expect(html).toContain('data-hz-topology-evidence-item-tone="warning"');
    expect(html).toContain('data-topology-impact-timeline-event="activity:901"');
    expect(html).toContain('Impact timeline');
    expect(html).toContain('Definition updated');
    expect(html).toContain('owner changed - alice');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a compact topology empty state owned by the shared UI lab primitive', () => {
    const html = renderToStaticMarkup(
      <HzTopologyEmptyState
        title="No topology relationships found"
        copy="The API returned no relationship evidence for this time scope."
        sourceLabel="Greptime trace graph"
        timeScope="last-1h"
        environment="prod"
        sourceKind="otlp-trace-call"
        relationType="trace-call"
        focusEntityId="service:commerce/checkout"
        depth={2}
        resultCount={0}
        evidenceSources={['trace', 'relation', 'monitor', 'incident']}
        boundary="flush"
      />
    );

    expect(html).toContain('data-hz-ui="topology-empty-state"');
    expect(html).toContain('data-hz-topology-primitive="empty-state"');
    expect(html).toContain('data-hz-topology-empty-kind="api-empty"');
    expect(html).toContain('data-hz-topology-empty-boundary="flush"');
    expect(html).toContain('data-hz-topology-empty-boundary-owner="hertzbeat-ui-empty-boundary"');
    expect(html).toContain('data-hz-topology-empty-source="Greptime trace graph"');
    expect(html).toContain('data-hz-topology-empty-time-scope="last-1h"');
    expect(html).toContain('data-hz-topology-empty-scope-owner="hertzbeat-ui-empty-scope"');
    expect(html).toContain('data-hz-topology-empty-environment="prod"');
    expect(html).toContain('data-hz-topology-empty-source-kind="otlp-trace-call"');
    expect(html).toContain('data-hz-topology-empty-relation-type="trace-call"');
    expect(html).toContain('data-hz-topology-empty-focus-entity-id="service:commerce/checkout"');
    expect(html).toContain('data-hz-topology-empty-depth="2"');
    expect(html).toContain('data-hz-topology-empty-result-count="0"');
    expect(html).toContain('data-hz-topology-empty-evidence-sources="trace relation monitor incident"');
    expect(html).toContain('data-hz-topology-empty-title-owner="hertzbeat-ui-empty-title"');
    expect(html).toContain('data-hz-topology-empty-copy-owner="hertzbeat-ui-empty-copy"');
    expect(html).toContain('data-hz-topology-empty-meta-owner="hertzbeat-ui-empty-meta"');
    expect(html).toContain('data-hz-topology-empty-source-owner="hertzbeat-ui-empty-source"');
    expect(html).toContain('data-hz-topology-empty-time-scope-owner="hertzbeat-ui-empty-time-scope"');
    expect(html).toContain('No topology relationships found');
    expect(html).toContain('The API returned no relationship evidence for this time scope.');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders canvas topology empty states without an extra framed card surface', () => {
    const html = renderToStaticMarkup(
      <HzTopologyEmptyState
        title="No topology evidence"
        copy="No trace edges were found."
        sourceLabel="Greptime trace graph"
        timeScope="last-1h"
        boundary="canvas"
        placement="canvas-center"
        copyVisibility="assistive"
      />
    );

    expect(html).toContain('data-hz-topology-empty-boundary="canvas"');
    expect(html).toContain('data-hz-topology-empty-boundary-visual="frameless-canvas"');
    expect(html).toContain('bg-transparent');
    expect(html).toContain('shadow-none');
    expect(html).not.toContain('border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] shadow-[0_16px_48px_rgba(0,0,0,0.28)]');
  });

  it('renders a compact topology loading state owned by the shared UI lab primitive', () => {
    const html = renderToStaticMarkup(
      <HzTopologyLoadingState
        title="Loading topology evidence"
        copy="Fetching API, Greptime, trace, and relation evidence for this scope."
        sourceLabel="Topology API"
        timeScope="last-1h"
        environment="prod"
        sourceKind="otlp-trace-call"
        relationType="trace-call"
        focusEntityId="service:commerce/checkout"
        depth={2}
        evidenceSources={['api', 'greptime', 'trace', 'relation']}
        rows={3}
        boundary="flush"
      />
    );

    expect(html).toContain('data-hz-ui="topology-loading-state"');
    expect(html).toContain('data-hz-topology-primitive="loading-state"');
    expect(html).toContain('data-hz-topology-loading-boundary="flush"');
    expect(html).toContain('data-hz-topology-loading-boundary-owner="hertzbeat-ui-loading-boundary"');
    expect(html).toContain('data-hz-topology-loading-scope-owner="hertzbeat-ui-loading-scope"');
    expect(html).toContain('data-hz-topology-loading-environment="prod"');
    expect(html).toContain('data-hz-topology-loading-source-kind="otlp-trace-call"');
    expect(html).toContain('data-hz-topology-loading-relation-type="trace-call"');
    expect(html).toContain('data-hz-topology-loading-focus-entity-id="service:commerce/checkout"');
    expect(html).toContain('data-hz-topology-loading-depth="2"');
    expect(html).toContain('data-hz-topology-loading-evidence-sources="api greptime trace relation"');
    expect(html).toContain('data-hz-topology-loading-source="Topology API"');
    expect(html).toContain('data-hz-topology-loading-time-scope="last-1h"');
    expect(html).toContain('data-hz-topology-loading-title-owner="hertzbeat-ui-loading-title"');
    expect(html).toContain('data-hz-topology-loading-copy-owner="hertzbeat-ui-loading-copy"');
    expect(html).toContain('data-hz-topology-loading-meta-owner="hertzbeat-ui-loading-meta"');
    expect((html.match(/data-hz-topology-loading-row/g) || []).length).toBe(3);
  });

  it('renders a compact topology toolbar owned by the shared UI lab primitive', () => {
    const html = renderToStaticMarkup(
      <HzTopologyToolbar
        data-test-topology-toolbar="shared"
        boundary="none"
        density="graph-first"
        environmentLabel="Environment"
        environmentValue="prod"
        environmentOptions={[
          { value: 'all', label: 'All environments' },
          { value: 'prod', label: 'prod' }
        ]}
        searchLabel="Filter topology"
        searchPlaceholder="Search entities"
        searchValue="checkout-api"
        sourceKindLabel="Evidence source"
        sourceKindValue="otlp-trace-call"
        sourceKindOptions={[
          { value: 'all', label: 'All sources' },
          { value: 'otlp-trace-call', label: 'Trace calls' }
        ]}
        depthLabel="Depth"
        depthValue="2"
        depthOptions={[
          { value: '1', label: '1-hop' },
          { value: '2', label: '2-hop' }
        ]}
        groupByLabel="Group by"
        groupByValue="none"
        groupByOptions={[
          { value: 'none', label: 'None' },
          { value: 'environment', label: 'Environment' }
        ]}
        resetLabel="Reset"
        resetHref="/topology"
        summaryLabel="Current filter"
        summaryItems={['checkout-api', 'prod', 'last-1h', 'service-call']}
        stateLabel="Investigation state"
        stateItems={[
          { id: 'focus', label: 'Focus', value: 'checkout-api' },
          { id: 'depth', label: 'Depth', value: '2-hop' },
          { id: 'group', label: 'Group', value: 'None' }
        ]}
      />
    );

    expect(html).toContain('data-hz-ui="topology-toolbar"');
    expect(html).toContain('data-hz-topology-primitive="toolbar"');
    expect(html).toContain('data-hz-topology-toolbar-density="graph-first"');
    expect(html).toContain('data-hz-topology-toolbar-density-owner="hertzbeat-ui-toolbar-density"');
    expect(html).toContain('data-hz-topology-toolbar-first-viewport-priority="canvas"');
    expect(html).toContain('data-hz-topology-toolbar-first-viewport-owner="hertzbeat-ui-toolbar-first-viewport"');
    expect(html).toContain('data-hz-topology-toolbar-row-contract="single-row-overflow"');
    expect(html).toContain('data-hz-topology-toolbar-row-contract-owner="hertzbeat-ui-toolbar-row-contract"');
    expect(html).toContain('data-hz-topology-toolbar-alignment="flush-control-grid"');
    expect(html).toContain('data-hz-topology-toolbar-inset="0px"');
    expect(html).toContain('data-hz-topology-toolbar-control-height="28px"');
    expect(html).toContain('data-hz-topology-toolbar-select-padding="compact-flush"');
    expect(html).toContain('data-hz-topology-toolbar-row-separator="none"');
    expect(html).toContain('data-hz-topology-toolbar-control-gap="6px"');
    expect(html).toContain('data-hz-topology-toolbar-control-flow="single-grid-row"');
    expect(html).toContain('data-hz-topology-toolbar-empty-offset="none"');
    expect(html).toContain('[grid-template-columns:112px_minmax(260px,1fr)_148px_88px_132px_auto]');
    expect(html).not.toContain('overflow-x-auto px-4 py-1');
    expect(html).toContain('overflow-x-auto px-0 py-1');
    expect(html).toContain('h-7 !gap-1.5 !px-2');
    expect(html).not.toContain('h-7 !gap-1.5 !pl-1 !pr-1.5');
    expect(html).toContain('data-hz-topology-toolbar-action-policy="scope-controls-only"');
    expect(html).toContain('data-hz-topology-toolbar-canvas-action-policy="in-canvas-g6-toolbar"');
    expect(html).toContain('data-hz-topology-toolbar-chrome="frameless"');
    expect(html).toContain('data-hz-topology-toolbar-frame="none"');
    expect(html).toContain('bg-transparent');
    expect(html).toContain('data-hz-topology-toolbar-visual-weight="low-interruption"');
    expect(html).toContain('data-hz-topology-toolbar-visual-weight-owner="hertzbeat-ui-toolbar-visual-weight"');
    expect(html).toContain('data-hz-topology-toolbar-secondary-visibility="assistive"');
    expect(html).toContain('data-hz-topology-toolbar-secondary-visibility-owner="hertzbeat-ui-toolbar-secondary-visibility"');
    expect(html).toContain('data-hz-topology-toolbar-boundary="none"');
    expect(html).toContain('data-hz-topology-toolbar-boundary-owner="hertzbeat-ui-toolbar-boundary"');
    expect(html).toContain('data-hz-topology-control="environment"');
    expect(html).toContain('data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"');
    expect(html).toContain('data-hz-topology-control="search"');
    expect(html).toContain('data-hz-topology-control="source-kind"');
    expect(html).toContain('data-hz-topology-control-source-kind-owner="hertzbeat-ui-toolbar-source-kind-control"');
    expect(html).toContain('data-hz-topology-control-source-kind-value="otlp-trace-call"');
    expect(html).not.toContain('data-hz-topology-control="fit-view"');
    expect(html).not.toContain('data-hz-topology-control="locate-entity"');
    expect(html).toContain('data-hz-topology-toolbar-control-strip="source-depth-group-reset"');
    expect(html).toContain('data-hz-topology-toolbar-control-strip-owner="hertzbeat-ui-toolbar-control-strip"');
    expect(html).toContain('data-hz-topology-toolbar-control-strip-layout="inline-overflow"');
    expect(html).toContain('data-hz-topology-toolbar-control-strip-display="contents"');
    expect(html).toContain('data-hz-topology-toolbar-control-strip-layout-owner="hertzbeat-ui-toolbar-control-strip-layout"');
    expect(html).toContain('data-hz-topology-control="depth"');
    expect(html).toContain('data-hz-topology-control-depth-owner="hertzbeat-ui-toolbar-depth-control"');
    expect(html).toContain('data-hz-topology-control-depth-value="2"');
    expect(html).not.toContain('data-hz-topology-control="layout"');
    expect(html).toContain('data-hz-topology-control="group-by"');
    expect(html).toContain('data-hz-topology-control-group-owner="hertzbeat-ui-toolbar-group-control"');
    expect(html).toContain('data-hz-topology-control-group-value="none"');
    expect(html).toContain('data-hz-topology-control="reset-scope"');
    expect(html).toContain('data-hz-topology-control-reset-owner="hertzbeat-ui-toolbar-reset-control"');
    expect(html).toContain('href="/topology"');
    expect(html).toContain('data-hz-topology-toolbar-summary="incoming-context"');
    expect(html).toContain('data-hz-topology-toolbar-summary-visibility="assistive"');
    expect(html).toContain('data-hz-topology-toolbar-summary-owner="hertzbeat-ui-toolbar-summary"');
    expect(html).toContain('data-hz-topology-toolbar-summary-label-owner="hertzbeat-ui-toolbar-summary-label"');
    expect(html).toContain('data-hz-topology-summary-item-owner="hertzbeat-ui-toolbar-summary-item"');
    expect(html).toContain('data-hz-topology-toolbar-state="focus-depth-group"');
    expect(html).toContain('data-hz-topology-toolbar-state-visibility="assistive"');
    expect(html).toContain('data-hz-topology-toolbar-state-owner="hertzbeat-ui-toolbar-state"');
    expect(html).toContain('data-hz-topology-state-label="Investigation state"');
    expect(html).toContain('data-hz-topology-state-label-owner="hertzbeat-ui-toolbar-state-label"');
    expect(html).toContain('data-hz-topology-state-item="focus"');
    expect(html).toContain('data-hz-topology-state-item-owner="hertzbeat-ui-toolbar-state-item"');
    expect(html).toContain('data-hz-topology-state-indicator-owner="hertzbeat-ui-toolbar-state-indicator"');
    expect(html).toContain('data-hz-topology-state-item-label-owner="hertzbeat-ui-toolbar-state-item-label"');
    expect(html).toContain('data-hz-topology-state-item-value-owner="hertzbeat-ui-toolbar-state-item-value"');
    expect(html).toContain('data-hz-topology-state-item="depth"');
    expect(html).not.toContain('data-hz-topology-state-item="layout"');
    expect(html).toContain('data-hz-topology-state-item="group"');
    expect(html).toContain('checkout-api');
    expect(html).toContain('prod');
    expect(html).toContain('last-1h');
    expect(html).toContain('2-hop');
    expect(html).toContain('overflow-x-auto');
    expect(html).toContain('py-1');
    expect(html).not.toContain('lg:col-span-4');
    expect(html).not.toContain('border-t border-[var(--hz-ui-line-faint)] sm:grid-cols-2');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a compact topology canvas owned by the shared UI lab primitive', () => {
    const html = renderToStaticMarkup(
      <HzTopologyCanvas
        data-test-topology-canvas="shared"
        layout="layered-service"
        interactionMode="inspect"
        interactionScope="hover-group"
        hoverMode="neighbor-highlight"
        drawerMode="node-edge"
        focusDepth="2-hop"
        minHeight="compact"
        boundary="section"
      >
        <div data-test-topology-canvas-child="graph-layer" />
      </HzTopologyCanvas>
    );

    expect(html).toContain('data-hz-ui="topology-canvas"');
    expect(html).toContain('data-hz-topology-primitive="canvas"');
    expect(html).toContain('data-hz-topology-canvas-layout="layered-service"');
    expect(html).toContain('data-hz-topology-canvas-layout-owner="hertzbeat-ui-canvas-layout"');
    expect(html).toContain('data-hz-topology-canvas-interaction-mode="inspect"');
    expect(html).toContain('data-hz-topology-canvas-interaction-owner="hertzbeat-ui-canvas-interaction"');
    expect(html).toContain('data-hz-topology-canvas-hover-mode="neighbor-highlight"');
    expect(html).toContain('data-hz-topology-canvas-drawer-mode="node-edge"');
    expect(html).toContain('data-hz-topology-canvas-focus-depth="2-hop"');
    expect(html).toContain('data-hz-topology-canvas-min-height="compact"');
    expect(html).toContain('data-hz-topology-canvas-min-height-owner="hertzbeat-ui-canvas-min-height"');
    expect(html).toContain('data-hz-topology-canvas-interaction-scope="hover-group"');
    expect(html).toContain('data-hz-topology-canvas-interaction-scope-owner="hertzbeat-ui-canvas-interaction-scope"');
    expect(html).toContain('data-hz-topology-canvas-boundary="section"');
    expect(html).toContain('data-hz-topology-canvas-boundary-owner="hertzbeat-ui-canvas-boundary"');
    expect(html).toContain('data-test-topology-canvas-child="graph-layer"');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders topology workbench slots owned by the shared grid primitive', () => {
    const html = renderToStaticMarkup(
      <HzTopologyWorkbenchGrid data-test-topology-grid="shared">
        <HzTopologyWorkbenchSlot data-test-topology-slot="canvas" kind="canvas" surface="placeholder">
          Canvas slot
        </HzTopologyWorkbenchSlot>
        <HzTopologyWorkbenchSlot data-test-topology-slot="companion" kind="companion" surface="content">
          Companion slot
        </HzTopologyWorkbenchSlot>
      </HzTopologyWorkbenchGrid>
    );

    expect(html).toContain('data-hz-ui="topology-workbench-slot"');
    expect(html).toContain('data-hz-topology-primitive="workbench-slot"');
    expect(html).toContain('data-hz-topology-workbench-slot-owner="hertzbeat-ui-workbench-slot"');
    expect(html).toContain('data-hz-topology-workbench-slot-kind="canvas"');
    expect(html).toContain('data-hz-topology-workbench-slot-kind="companion"');
    expect(html).toContain('data-hz-topology-workbench-slot-surface="placeholder"');
    expect(html).toContain('data-hz-topology-workbench-slot-surface="content"');
    expect(html).toContain('Canvas slot');
    expect(html).toContain('Companion slot');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a topology graph layer owned by the shared canvas primitive', () => {
    const html = renderToStaticMarkup(
      <HzTopologyGraphLayer data-test-topology-graph-layer="shared">
        <line data-test-topology-line="edge" x1="0" y1="0" x2="100" y2="100" />
      </HzTopologyGraphLayer>
    );

    expect(html).toContain('data-hz-ui="topology-graph-layer"');
    expect(html).toContain('data-hz-topology-primitive="graph-layer"');
    expect(html).toContain('data-hz-topology-graph-layer="svg-edge-layer"');
    expect(html).toContain('data-hz-topology-graph-layer-owner="hertzbeat-ui-graph-layer"');
    expect(html).toContain('viewBox="0 0 100 100"');
    expect(html).toContain('preserveAspectRatio="none"');
    expect(html).toContain('data-test-topology-line="edge"');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders a topology canvas annotation owned by the shared canvas primitive', () => {
    const html = renderToStaticMarkup(
      <HzTopologyCanvasAnnotation data-test-topology-canvas-annotation="shared" title="Layered service graph" copy="2-hop inspect" />
    );

    expect(html).toContain('data-hz-ui="topology-canvas-annotation"');
    expect(html).toContain('data-hz-topology-primitive="canvas-annotation"');
    expect(html).toContain('data-hz-topology-canvas-annotation-placement="top-left"');
    expect(html).toContain('data-hz-topology-canvas-annotation-owner="hertzbeat-ui-canvas-annotation"');
    expect(html).toContain('data-hz-topology-canvas-annotation-visibility="visible"');
    expect(html).toContain('data-hz-topology-canvas-annotation-occlusion="overlay"');
    expect(html).toContain('data-hz-topology-canvas-annotation-hit-test="pass-through"');
    expect(html).toContain('pointer-events-none');
    expect(html).toContain('data-hz-topology-canvas-annotation-title-owner="hertzbeat-ui-canvas-annotation-title"');
    expect(html).toContain('data-hz-topology-canvas-annotation-copy-owner="hertzbeat-ui-canvas-annotation-copy"');
    expect(html).toContain('data-test-topology-canvas-annotation="shared"');
    expect(html).toContain('Layered service graph');
    expect(html).toContain('2-hop inspect');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders an assistive topology canvas annotation without visual canvas occlusion', () => {
    const html = renderToStaticMarkup(
      <HzTopologyCanvasAnnotation
        data-test-topology-canvas-annotation="assistive"
        title="Layered service graph"
        copy="2-hop inspect"
        visibility="assistive"
      />
    );

    expect(html).toContain('data-hz-topology-canvas-annotation-visibility="assistive"');
    expect(html).toContain('data-hz-topology-canvas-annotation-occlusion="none"');
    expect(html).toContain('data-hz-topology-canvas-annotation-hit-test="pass-through"');
    expect(html).toContain('sr-only');
    expect(html).toContain('Layered service graph');
    expect(html).toContain('2-hop inspect');
    expect(html).not.toContain('absolute z-10 grid max-w-[260px]');
  });

  it('renders a trace list with selectable rows and a reusable trace detail drawer', () => {
    const traces = [
      {
        id: 'trace-001',
        service: 'hertzbeat-api',
        operation: 'POST /api/monitors/detect',
        startTime: '14:28:04',
        durationMs: 126,
        spanCount: 4,
        errorCount: 1,
        tone: 'warning' as const,
        rootCause: 'collector retry'
      },
      {
        id: 'trace-002',
        service: 'collector-a',
        operation: 'mysql.collect',
        startTime: '14:29:10',
        durationMs: 54,
        spanCount: 3,
        errorCount: 0,
        tone: 'success' as const
      }
    ];
    const html = renderToStaticMarkup(
      <div>
        <HzTraceList title="Recent traces" traces={traces} selectedTraceId="trace-001" onTraceSelect={vi.fn()} />
        <HzTraceDetailDrawer
          open
          trace={traces[0]}
          facts={[
            { label: 'Duration', value: '126ms', tone: 'warning' },
            { label: 'Spans', value: '4' }
          ]}
          sections={[
            {
              id: 'evidence',
              title: 'Trace evidence',
              items: [{ id: 'retry', label: 'mysql.connection.retry', value: 'collector span', tone: 'warning' }]
            }
          ]}
        />
      </div>
    );

    expect(html).toContain('data-hz-ui="trace-list"');
    expect(html).toContain('data-hz-trace-row="trace-001"');
    expect(html).toContain('data-hz-trace-row-selected="true"');
    expect(html).toContain('aria-label="Open trace trace-001"');
    expect(html).toContain('data-hz-trace-duration-ms="126"');
    expect(html).toContain('data-hz-trace-error-count="1"');
    expect(html).toContain('collector retry');
    expect(html).toContain('data-hz-ui="trace-detail-drawer"');
    expect(html).toContain('data-hz-trace-detail-open="true"');
    expect(html).toContain('data-hz-trace-detail-id="trace-001"');
    expect(html).toContain('Trace evidence');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders operational state feedback for partial data, empty results, and loading states', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzAssistiveMarker data-otlp-metrics-detail-panel-empty-owner="hertzbeat-ui-assistive-marker" />
        <HzStateNotice
          tone="warning"
          title="Query partially delayed"
          description="Trace aggregates lag behind metrics and logs."
          meta="lag 42s"
          variant="embedded"
          actions={<HzButton size="sm">Retry</HzButton>}
        />
        <HzStateNotice
          tone="info"
          title="Alert and trace handoff context stays attached to the selected signal."
          variant="hint"
          data-signal-handoff-hint-owner="hertzbeat-ui-state-notice"
        />
        <HzStateNotice
          tone="info"
          title="No metrics trend"
          description="Run a query to show real sample points."
          variant="hint"
          frame="trend-empty"
          data-metrics-trend-empty-state-owner="hertzbeat-ui-state-notice"
        />
        <HzEmptyState
          title="No matching logs"
          description="Widen the time range or clear the status filter."
          actions={<HzButton size="sm">Clear filters</HzButton>}
          data-monitor-manage-empty-owner="hertzbeat-ui-empty-state"
        />
        <HzEmptyState
          title="No trace rows"
          description="Widen the trace query."
          layout="table-panel"
          data-trace-manage-empty-state-owner="hertzbeat-ui-empty-state"
        />
        <HzLoadingState title="Loading history" description="Fetching recent metrics and logs." rows={3} />
      </div>
    );

    expect(html).toContain('data-hz-ui="assistive-marker"');
    expect(html).toContain('data-hz-assistive-marker-owner="hertzbeat-ui-assistive-marker"');
    expect(html).toContain('data-hz-assistive-marker-visibility="sr-only"');
    expect(html).toContain('data-otlp-metrics-detail-panel-empty-owner="hertzbeat-ui-assistive-marker"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('sr-only');
    expect(html).toContain('data-hz-ui="state-notice"');
    expect(html).toContain('data-hz-state-tone="warning"');
    expect(html).toContain('data-hz-state-variant="embedded"');
    expect(html).toContain('Query partially delayed');
    expect(html).toContain('lag 42s');
    expect(html).toContain('data-hz-state-variant="hint"');
    expect(html).toContain('data-hz-state-frame="trend-empty"');
    expect(html).toContain('data-hz-state-hint-owner="hertzbeat-ui-state-notice"');
    expect(html).toContain('data-signal-handoff-hint-owner="hertzbeat-ui-state-notice"');
    expect(html).toContain('Alert and trace handoff context stays attached to the selected signal.');
    expect(html).toContain('data-metrics-trend-empty-state-owner="hertzbeat-ui-state-notice"');
    expect(html).toContain('flex h-full min-w-0 flex-1 flex-col justify-center border-dashed border-[#2a303a] bg-[#0c1016] text-center');
    expect(html).toContain('data-hz-ui="empty-state"');
    expect(html).toContain('data-hz-empty-state-layout="default"');
    expect(html).toContain('data-hz-empty-state-layout="table-panel"');
    expect(html).toContain('data-monitor-manage-empty-owner="hertzbeat-ui-empty-state"');
    expect(html).toContain('data-trace-manage-empty-state-owner="hertzbeat-ui-empty-state"');
    expect(html).toContain('No matching logs');
    expect(html).toContain('No trace rows');
    expect(html).toContain('h-[260px]');
    expect(html).toContain('max-w-[420px]');
    expect(html).toContain('border-y-0');
    expect(html).toContain('text-left');
    expect(html).toContain('Clear filters');
    expect(html).toContain('data-hz-ui="loading-state"');
    expect(html).toContain('Loading history');
    expect((html.match(/data-hz-loading-row/g) || []).length).toBe(3);
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('owns dialog event notice chrome for selected span event details', () => {
    const html = renderToStaticMarkup(
      <HzDialogEventNotice
        data-trace-manage-event-detail="span-event-detail"
        data-trace-manage-event-detail-owner="hertzbeat-ui-dialog-event-notice"
        title="exception"
        description={(
          <HzDialogEventText
            data-trace-manage-event-detail-copy="span-event-not-span"
            data-trace-manage-event-detail-text-owner="hertzbeat-ui-dialog-event-text"
          >
            Not a new span
          </HzDialogEventText>
        )}
        meta={(
          <HzDialogEventText
            variant="meta"
            data-trace-manage-event-detail-meta="span-event-label"
            data-trace-manage-event-detail-text-owner="hertzbeat-ui-dialog-event-text"
          >
            Span event
          </HzDialogEventText>
        )}
        actions={<HzButton size="xs" intent="ghost">View span</HzButton>}
      />
    );

    expect(html).toContain('data-hz-ui="state-notice"');
    expect(html).toContain('data-hz-state-hint-owner="hertzbeat-ui-state-notice"');
    expect(html).toContain('data-hz-dialog-event-notice-owner="hertzbeat-ui-dialog-event-notice"');
    expect(html).toContain('data-hz-dialog-event-notice-layout="side-stack"');
    expect(html).toContain('data-trace-manage-event-detail-owner="hertzbeat-ui-dialog-event-notice"');
    expect(html).toContain('border-x-0 border-b border-t-0 bg-transparent px-0 pb-2 pt-0');
    expect(html).toContain('data-hz-ui="dialog-event-text"');
    expect(html).toContain('data-hz-dialog-event-text-owner="hertzbeat-ui-dialog-event-text"');
    expect(html).toContain('data-hz-dialog-event-text-variant="copy"');
    expect(html).toContain('data-hz-dialog-event-text-variant="meta"');
    expect(html).toContain('data-trace-manage-event-detail-text-owner="hertzbeat-ui-dialog-event-text"');
    expect(html).toContain('data-trace-manage-event-detail-copy="span-event-not-span"');
    expect(html).toContain('data-trace-manage-event-detail-meta="span-event-label"');
    expect(html).toContain('data-hz-control-height="24"');
  });

  it('renders monitor favorite surfaces through the shared select-menu owner', () => {
    const html = renderToStaticMarkup(
      <HzMonitorFavoriteSurface
        value="realtime"
        options={[
          { value: 'realtime', label: 'Realtime' },
          { value: 'history', label: 'History' }
        ]}
        selectorLabel="Favorite scope"
        message="Favorite saved"
        error="Favorite sync failed"
        data-monitor-detail-favorite-owner="hertzbeat-ui-favorite-surface"
      >
        <div data-favorite-content="realtime" />
      </HzMonitorFavoriteSurface>
    );

    expect(html).toContain('data-hz-ui="monitor-favorite-surface"');
    expect(html).toContain('data-hz-monitor-favorite-mode="realtime"');
    expect(html).toContain('data-hz-monitor-favorite-selector="select-menu"');
    expect(html).toContain('data-hz-ui="select-menu"');
    expect(html).toContain('data-hz-ui="select-trigger"');
    expect(html).toContain('data-monitor-detail-favorite-owner="hertzbeat-ui-favorite-surface"');
    expect(html).toContain('data-favorite-content="realtime"');
    expect(html).toContain('Favorite saved');
    expect(html).toContain('role="status"');
    expect(html).toContain('text-[#b9c6d8]');
    expect(html).toContain('Favorite sync failed');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('text-emerald-300');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders monitor favorite panes as shared flat content wrappers', () => {
    const html = renderToStaticMarkup(
      <HzMonitorFavoritePane kind="realtime" data-monitor-detail-favorite-realtime="shared-pane">
        <div>favorite row</div>
      </HzMonitorFavoritePane>
    );

    expect(html).toContain('data-hz-ui="monitor-favorite-pane"');
    expect(html).toContain('data-hz-monitor-favorite-pane-kind="realtime"');
    expect(html).toContain('data-monitor-detail-favorite-pane-owner="hertzbeat-ui-favorite-pane"');
    expect(html).toContain('data-monitor-detail-favorite-realtime="shared-pane"');
    expect(html).toContain('grid min-w-0');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders monitor detail console shells through the shared tight page owner', () => {
    const html = renderToStaticMarkup(
      <HzMonitorDetailConsoleShell data-monitor-console-layout="angular-workbench">
        <div data-monitor-console-child="tabs" />
      </HzMonitorDetailConsoleShell>
    );

    expect(html).toContain('data-hz-ui="monitor-detail-console-shell"');
    expect(html).toContain('data-monitor-detail-console-shell-owner="hertzbeat-ui-detail-console-shell"');
    expect(html).toContain('data-monitor-console-layout="angular-workbench"');
    expect(html).toContain('data-monitor-console-child="tabs"');
    expect(html).toMatch(/class=\"[^\"]*-mx-4[^\"]*space-y-2[^\"]*px-3[^\"]*pb-3[^\"]*pt-0[^\"]*sm:-mx-6[^\"]*sm:px-3/);
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders monitor detail workbench frames with shared tabset spacing ownership', () => {
    const html = renderToStaticMarkup(
      <HzMonitorDetailWorkbenchFrame
        tabs={<div data-frame-tabs="tabs" />}
        data-monitor-workbench-stage="angular-layout"
      >
        <div data-frame-panel="panel" />
      </HzMonitorDetailWorkbenchFrame>
    );

    expect(html).toContain('data-hz-ui="monitor-detail-workbench-frame"');
    expect(html).toContain('data-monitor-workbench-stage-owner="hertzbeat-ui-detail-workbench-frame"');
    expect(html).toContain('data-monitor-detail-tabset-owner="hertzbeat-ui-detail-workbench-frame"');
    expect(html).toContain('data-monitor-workbench-stage="angular-layout"');
    expect(html).toContain('data-monitor-workbench-stage-chrome="angular-tabset-direct"');
    expect(html).toContain('data-monitor-workbench-stage-rhythm="direct-tab-body"');
    expect(html).toContain('data-monitor-detail-tabset-type="bottom-underline-switch"');
    expect(html).toContain('data-frame-tabs="tabs"');
    expect(html).toContain('data-frame-panel="panel"');
    expect(html).toMatch(/class=\"[^\"]*overflow-visible[^\"]*bg-transparent/);
    expect(html).toMatch(/class=\"pb-2\"/);
    expect(html).not.toContain('monitor-detail-workbench-layout');
    expect(html).not.toContain('monitor-detail-workbench-tabs');
  });

  it('renders monitor detail stages through the shared flat section owner', () => {
    const html = renderToStaticMarkup(
      <HzMonitorDetailStage
        title="Realtime metrics"
        description="Latest collector sample"
        rhythm="stack"
        data-monitor-detail-stage-owner="hertzbeat-ui-detail-stage"
      >
        <div data-detail-stage-content="metrics" />
      </HzMonitorDetailStage>
    );

    expect(html).toContain('data-hz-ui="monitor-detail-stage"');
    expect(html).toContain('data-monitor-detail-stage-owner="hertzbeat-ui-detail-stage"');
    expect(html).toContain('data-monitor-detail-flat-stage="true"');
    expect(html).toContain('data-monitor-detail-stage-rhythm="shared-stack"');
    expect(html).toContain('grid min-w-0 gap-3');
    expect(html).not.toContain('border-t border-[var(--hz-ui-line-soft)] pt-3');
    expect(html).toContain('Realtime metrics');
    expect(html).toContain('Latest collector sample');
    expect(html).toContain('data-detail-stage-content="metrics"');
    expect(html).not.toMatch(/class=\"[^\"]*monitor-detail-stage/);
    expect(html).not.toMatch(/class=\"[^\"]*monitor-detail-stage--tight/);
    expect(html).not.toContain('angular-tight');
    expect(html).not.toContain('var(--ops-border-color)');
    expect(html).not.toContain('var(--ops-text-primary)');
    expect(html).not.toContain('var(--ops-text-secondary)');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders monitor detail tab sequences through the shared tight owner', () => {
    const html = renderToStaticMarkup(
      <HzMonitorDetailTabSequence data-monitor-detail-tab-sequence-owner="hertzbeat-ui-detail-tab-sequence">
        <div data-detail-tab-content="realtime" />
      </HzMonitorDetailTabSequence>
    );

    expect(html).toContain('data-hz-ui="monitor-detail-tab-sequence"');
    expect(html).toContain('data-monitor-detail-tab-sequence-owner="hertzbeat-ui-detail-tab-sequence"');
    expect(html).toContain('data-monitor-detail-tab-sequence="shared-tight"');
    expect(html).toContain('data-detail-tab-content="realtime"');
    const sequenceClassMatch = html.match(/data-monitor-detail-tab-sequence-owner="hertzbeat-ui-detail-tab-sequence" class="([^"]+)"/);
    expect(sequenceClassMatch?.[1]).not.toContain('monitor-detail-tab-sequence');
    expect(html).not.toContain('angular-tight');
    expect(html).not.toContain('monitor-detail-tab-sequence--angular-tight');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders monitor detail tab panels through the shared panel owner', () => {
    const html = renderToStaticMarkup(
      <HzMonitorDetailTabPanel
        id="panel-realtime"
        tabId="tab-realtime"
        active
        data-monitor-console-tab-panel-owner="hertzbeat-ui-detail-tab-panel"
      >
        <div data-panel-content="realtime" />
      </HzMonitorDetailTabPanel>
    );

    expect(html).toContain('data-hz-ui="monitor-detail-tab-panel"');
    expect(html).toContain('data-monitor-console-tab-panel="true"');
    expect(html).toContain('data-monitor-console-tab-panel-owner="hertzbeat-ui-detail-tab-panel"');
    expect(html).toContain('data-monitor-console-tab-panel-rhythm="shared-tight"');
    expect(html).toContain('data-monitor-tab-body-surface="hertzbeat-ui-detail-tab-panel"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('id="panel-realtime"');
    expect(html).toContain('aria-labelledby="tab-realtime"');
    expect(html).toContain('data-panel-content="realtime"');
    expect(html).not.toContain('angular-tight');
    expect(html).not.toContain('angular-tab-content-direct');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders monitor basic cards through the shared realtime owner', () => {
    const html = renderToStaticMarkup(
      <HzMonitorBasicCard
        heading="Monitoring Basic"
        editHref="/monitors/42/edit"
        editLabel="Edit monitor"
        data-monitor-basic-owner="hertzbeat-ui-basic-card"
      >
        <div data-monitor-basic-summary="business-content">mysql-prod-01</div>
      </HzMonitorBasicCard>
    );

    expect(html).toContain('data-hz-ui="monitor-basic-card"');
    expect(html).toContain('data-hz-ui="workbench-surface"');
    expect(html).toContain('data-monitor-basic-owner="hertzbeat-ui-basic-card"');
    expect(html).toContain('data-monitor-basic-stage-surface="hertzbeat-ui-basic-card"');
    expect(html).toContain('data-monitor-basic-grid-item="shared-first-card"');
    expect(html).toContain('data-monitor-basic-card-chrome="hertzbeat-ui-basic-card"');
    expect(html).toContain('data-monitor-basic-card-tone="neutral-graphite"');
    expect(html).toContain('bg-[var(--hz-ui-surface-graphite)]');
    expect(html).not.toContain('bg-[var(--hz-ui-surface-raised)]');
    expect(html).not.toContain('bg-[var(--hz-ui-active)]');
    expect(html).not.toContain('bg-[var(--hz-ui-active-soft)]');
    expect(html).toContain('data-monitor-basic-edit-action="hertzbeat-ui-icon-action"');
    expect(html).toContain('data-monitor-basic-edit-action-density="compact-icon"');
    expect(html).toContain('href="/monitors/42/edit"');
    expect(html).toContain('aria-label="Edit monitor"');
    expect(html).toContain('mysql-prod-01');
    expect(html).not.toContain('angular-first-card');
    expect(html).not.toContain('angular-card-box');
    expect(html).not.toContain('monitor-detail-card');
    expect(html).not.toContain('monitor-detail-card--overview');
    expect(html).not.toContain('monitor-workbench-surface');
    expect(html).not.toContain('monitor-workbench-surface--plain');
    expect(html).not.toContain('monitor-workbench-surface__edit');
    expect(html).not.toContain('monitor-workbench-surface__header');
    expect(html).not.toContain('monitor-workbench-card-title__copy');
    expect(html).not.toContain('monitor-workbench-card-title__title');
    expect(html).not.toContain('var(--ops-border-color)');
    expect(html).not.toContain('var(--ops-surface-raised)');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders monitor basic summaries without old observability row chrome', () => {
    const html = renderToStaticMarkup(
      <HzMonitorBasicSummary
        name="mysql-prod-01"
        statusLabel="online"
        statusTone="success"
        facts={[
          { label: 'ID', value: '42' },
          { label: 'Period', value: '60s' },
          { label: 'Labels', value: '2' },
          { label: 'Annotations', value: '1' }
        ]}
        metaRows={[
          { label: 'Instance', value: '127.0.0.1:3306' },
          { label: 'Updated', value: '2026-05-15 11:12:02' }
        ]}
        labels={[
          { label: 'region', value: 'cn' },
          { label: 'env', value: 'prod' }
        ]}
        annotations={[{ label: 'owner', value: 'sre' }]}
        labelHeading="Labels"
        annotationHeading="Annotations"
      />
    );

    expect(html).toContain('data-hz-ui="monitor-basic-summary"');
    expect(html).toContain('data-monitor-basic-summary-owner="hertzbeat-ui-basic-summary"');
    expect(html).toContain('data-monitor-basic-density="shared-basic-summary"');
    expect(html).toContain('data-monitor-basic-content-inset="hertzbeat-ui-basic-summary"');
    expect(html).toContain('data-monitor-basic-facts-density="hertzbeat-ui-fact-grid"');
    expect(html).toContain('data-monitor-basic-meta-density="hertzbeat-ui-rows"');
    expect(html).toContain('data-monitor-basic-token-kind="label"');
    expect(html).toContain('data-monitor-basic-token-kind="annotation"');
    expect(html).toContain('data-hz-ui="status-badge"');
    expect(html).toContain('mysql-prod-01');
    expect(html).toContain('127.0.0.1:3306');
    expect(html).not.toContain('angular-cardless');
    expect(html).not.toContain('angular-card-padding');
    expect(html).not.toContain('angular-compact');
    expect(html).not.toContain('angular-rows');
    expect(html).not.toContain('var(--ops-border-color)');
    expect(html).not.toContain('var(--ops-text-primary)');
    expect(html).not.toContain('var(--ops-text-tertiary)');
  });

  it('renders monitor metric cards through the shared realtime owner', () => {
    const html = renderToStaticMarkup(
      <HzMonitorMetricCard
        title="basic"
        selected
        actions={<HzMonitorMetricFavoriteAction active label="Remove favorite" />}
        columns={[
          { key: 'responseTime', title: 'responseTime' },
          { key: 'status', title: 'status' }
        ]}
        rows={[
          { key: 'mysql-prod-01', label: 'mysql-prod-01', values: ['118ms', 'available'] },
          { key: 'linux-edge-03', label: 'linux-edge-03', values: ['72ms', 'collecting'] }
        ]}
        labelHeader="Resource"
        data-monitor-detail-metric-card-owner="hertzbeat-ui-metric-card"
        data-monitor-detail-signal-card="true"
        data-monitor-detail-signal-row="basic"
        data-monitor-detail-signal-row-density="shared-metric-card"
      />
    );

    expect(html).toContain('data-hz-ui="monitor-metric-card"');
    expect(html).toContain('data-hz-ui="workbench-surface"');
    expect(html).toContain('data-hz-workbench-surface-selected="true"');
    expect(html).toContain('data-monitor-detail-metric-card-owner="hertzbeat-ui-metric-card"');
    expect(html).toContain('data-monitor-detail-signal-row-density="shared-metric-card"');
    expect(html).toContain('data-monitor-detail-signal-card-table="true"');
    expect(html).toContain('data-monitor-detail-signal-card-body-density="shared-metric-table"');
    expect(html).toContain('data-monitor-detail-metric-card-tone="neutral-graphite"');
    expect(html).toContain('bg-[var(--hz-ui-surface-graphite)]');
    expect(html).toContain('data-hz-ui="monitor-metric-favorite-action"');
    expect(html).toContain('data-hz-monitor-favorite-active="true"');
    expect(html).toContain('aria-label="Remove favorite"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-hz-monitor-metric-table-row="metric-fields"');
    expect(html).toContain('data-hz-monitor-metric-card-selected="true"');
    expect(html).toContain('shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]');
    expect(html).toContain('basic');
    expect(html).toContain('responseTime');
    expect(html).toContain('mysql-prod-01');
    expect(html).toContain('118ms');
    expect(html).not.toContain('angular-card-table');
    expect(html).not.toContain('angular-metric-card');
    expect(html).not.toContain('monitor-detail-card');
    expect(html).not.toContain('monitor-detail-card--signal-flat');
    expect(html).not.toContain('monitor-detail-card--signal-metric');
    expect(html).not.toContain('monitor-workbench-metric-table');
    expect(html).not.toContain('monitor-workbench-surface__header');
    expect(html).not.toContain('monitor-workbench-card-title__copy');
    expect(html).not.toContain('monitor-workbench-card-title__title');
    expect(html).not.toContain('var(--ops-border-color)');
    expect(html).not.toContain('var(--ops-surface-panel)');
    expect(html).not.toContain('bg-[var(--hz-ui-surface-raised)]');
    expect(html).not.toContain('bg-[var(--hz-ui-active-soft)]');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders monitor metric card grids through the shared realtime owner', () => {
    const html = renderToStaticMarkup(
      <HzMonitorMetricCardGrid data-monitor-detail-card-grid-rhythm="shared-tight">
        <HzMonitorMetricCard
          title="basic"
          selected
          columns={[{ key: 'responseTime', title: 'responseTime' }]}
          rows={[{ key: 'mysql-prod-01', label: 'mysql-prod-01', values: ['118ms'] }]}
          labelHeader="Resource"
          data-monitor-detail-metric-card-owner="hertzbeat-ui-metric-card"
          data-monitor-detail-signal-card="true"
          data-monitor-detail-signal-row="basic"
          data-monitor-detail-signal-row-density="shared-metric-card"
        />
      </HzMonitorMetricCardGrid>
    );

    expect(html).toContain('data-hz-ui="monitor-metric-card-grid"');
    expect(html).toContain('data-monitor-detail-realtime-card-flow="shared-metric-card-grid"');
    expect(html).toContain('data-monitor-detail-realtime-card-chrome="hertzbeat-ui-card-grid"');
    expect(html).toContain('data-monitor-detail-card-grid-rhythm="shared-tight"');
    expect(html).toContain('data-hz-ui="monitor-metric-card"');
    const gridClassMatch = html.match(/data-monitor-detail-card-grid-rhythm="shared-tight" class="([^"]+)"/);
    expect(gridClassMatch?.[1]).not.toContain('monitor-detail-card-grid');
    expect(gridClassMatch?.[1]).not.toContain('monitor-detail-card-grid--realtime');
    expect(gridClassMatch?.[1]).not.toContain('monitor-detail-signal-card-grid');
    expect(html).not.toContain('angular-cards-list');
    expect(html).not.toContain('angular-card-box');
    expect(html).not.toContain('data-selected=');
  });

  it('renders monitor incremental load footers through the shared realtime owner', () => {
    const html = renderToStaticMarkup(
      <HzMonitorIncrementalLoadFooter
        visibleCount={10}
        totalCount={24}
        hasMore
        loadMoreLabel="Load more"
        completeLabel="All metrics loaded"
        data-monitor-detail-incremental-owner="hertzbeat-ui-incremental-load-footer"
      />
    );

    expect(html).toContain('data-hz-ui="monitor-incremental-load-footer"');
    expect(html).toContain('data-hz-monitor-incremental-owner="hertzbeat-ui-incremental-load-footer"');
    expect(html).toContain('data-monitor-detail-incremental-owner="hertzbeat-ui-incremental-load-footer"');
    expect(html).toContain('data-hz-monitor-incremental-visible="10"');
    expect(html).toContain('data-hz-monitor-incremental-total="24"');
    expect(html).toContain('data-hz-monitor-incremental-has-more="true"');
    expect(html).toContain('data-hz-monitor-incremental-sentinel="true"');
    expect(html).toContain('data-hz-monitor-incremental-action="load-more"');
    expect(html).toContain('10 / 24');
    expect(html).toContain('Load more');
    expect(html).not.toContain('metrics-load-sentinel');
    expect(html).not.toContain('monitor-detail-card-grid--realtime');
  });

  it('renders monitor detail signal lists through a shared realtime shell', () => {
    const html = renderToStaticMarkup(
      <HzMonitorDetailSignalList data-monitor-detail-signal-list-owner="hertzbeat-ui-signal-list">
        <HzMonitorMetricCardGrid data-monitor-detail-card-grid-rhythm="shared-tight">
          <HzMonitorMetricCard
            title="basic"
            columns={[{ key: 'responseTime', title: 'responseTime' }]}
            rows={[{ key: 'mysql-prod-01', label: 'mysql-prod-01', values: ['118ms'] }]}
            labelHeader="Resource"
            data-monitor-detail-metric-card-owner="hertzbeat-ui-metric-card"
          />
        </HzMonitorMetricCardGrid>
      </HzMonitorDetailSignalList>
    );

    expect(html).toContain('data-hz-ui="monitor-detail-signal-list"');
    expect(html).toContain('data-monitor-detail-signal-list-owner="hertzbeat-ui-signal-list"');
    expect(html).toContain('data-monitor-detail-signal-list-rhythm="shared-tight"');
    expect(html).toContain('data-monitor-detail-signal-list-geometry="shared-two-column-metric-cards"');
    expect(html).toContain('data-hz-ui="monitor-metric-card-grid"');
    const listClassMatch = html.match(/data-hz-ui="monitor-detail-signal-list"[^>]*class="([^"]+)"/);
    expect(listClassMatch?.[1]).toContain('grid min-w-0 gap-2 pt-0.5');
    expect(listClassMatch?.[1]).not.toContain('space-y-2');
    expect(html).not.toContain('angular-two-column-metric-cards');
    expect(html).not.toContain('angular-tight');
  });

  it('renders mutation, validation, confirmation, toast, and batch-action primitives for operator workflows', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzMutationBar
          title="Template changes"
          status="dirty"
          dirtyFields={['app-mysql.yml', 'metrics.basic.fields']}
          validationIssues={[
            { id: 'missing-required', field: 'params.host', message: 'Host remains required before save.', tone: 'warning' },
            { id: 'schema-error', field: 'metrics.basic', message: 'Metric field type is invalid.', tone: 'critical' }
          ]}
          feedback={<HzInlineFeedback tone="critical" title="Save failed" description="Fix schema errors before applying." variant="embedded" />}
          onSave={vi.fn()}
          onDiscard={vi.fn()}
        />
        <HzMonitorEditorActionBar
          title="Monitor form"
          status="clean"
          statusLabel="Ready"
          actions={[
            { id: 'detect', label: 'Detect', intent: 'ghost', buttonProps: { 'data-monitor-editor-detect-action': 'true' } },
            { id: 'submit', label: 'OK', type: 'submit', intent: 'primary', buttonProps: { 'data-monitor-editor-submit-action': 'true' } },
            { id: 'cancel', label: 'Cancel', intent: 'ghost', buttonProps: { 'data-monitor-editor-cancel-action': 'true' } }
          ]}
        />
        <HzMutationBar title="Saved state" status="saved" statusLabel="Saved 14:31" />
        <HzDangerConfirm
          open
          title="Delete selected templates"
          description="This removes 3 template drafts from the local workspace."
          triggerLabel="Delete drafts"
          confirmLabel="Delete 3 drafts"
          cancelLabel="Keep drafts"
          onConfirm={vi.fn()}
        />
        <HzConfirmDialog
          open
          tone="critical"
          kicker="Monitor center"
          title="Delete selected monitors"
          bodyRhythm="stack"
          cancelLabel="Cancel"
          confirmLabel="Delete selected"
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          data-monitor-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
        >
          <div data-monitors-delete-confirm="hertzbeat-ui-modal">3 monitors selected</div>
        </HzConfirmDialog>
        <HzBatchToolbar
          selectionCount={3}
          selectionLabel="templates selected"
          actions={[
            { id: 'hide', label: 'Hide', tone: 'neutral', onSelect: vi.fn() },
            { id: 'apply', label: 'Apply', busy: true, busyLabel: 'Applying', tone: 'info', onSelect: vi.fn() },
            {
              id: 'delete',
              label: 'Delete',
              tone: 'critical',
              onSelect: vi.fn(),
              help: {
                label: 'Explain delete',
                body: 'Deletes selected records.',
                impact: 'This cannot be undone.',
                rootProps: { 'data-test-batch-help-root': 'delete' },
                triggerProps: { 'data-test-batch-help-trigger': 'delete' },
                tooltipProps: { 'data-test-batch-help-tooltip': 'delete' }
              }
            }
          ]}
        />
        <HzToastStack
          items={[
            { id: 'saved', tone: 'success', title: 'Template saved', description: 'app-mysql.yml updated locally.', meta: 'now' },
            { id: 'failed', tone: 'critical', title: 'Apply failed', description: 'Collector rejected one validation field.' }
          ]}
        />
      </div>
    );

    expect(html).toContain('data-hz-ui="mutation-bar"');
    expect(html).toContain('data-hz-feedback-variant="embedded"');
    expect(html).toContain('data-hz-ui="monitor-editor-action-bar"');
    expect(html).toContain('data-monitor-editor-action-bar-owner="hertzbeat-ui-monitor-editor-action-bar"');
    expect(html).toContain('data-monitor-editor-action="detect"');
    expect(html).toContain('data-monitor-editor-action="submit"');
    expect(html).toContain('data-monitor-editor-action="cancel"');
    expect(html).toContain('data-monitor-editor-action-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-hz-mutation-status="dirty"');
    expect(html).toContain('data-hz-mutation-status="saved"');
    expect(html).toContain('data-hz-mutation-summary="hidden"');
    expect(html).toContain('data-hz-mutation-action-align="center"');
    expect(html).toContain('data-hz-dirty-field="app-mysql.yml"');
    expect(html).toContain('data-hz-validation-issue="schema-error"');
    expect(html).toContain('data-hz-validation-tone="critical"');
    expect(html).toContain('aria-label="Save Template changes"');
    expect(html).toContain('aria-label="Discard Template changes"');
    expect(html).toContain('data-hz-ui="inline-feedback"');
    expect(html).toContain('data-hz-feedback-tone="critical"');
    expect(html).toContain('data-hz-ui="danger-confirm"');
    expect(html).toContain('data-hz-confirm-open="true"');
    expect(html).toContain('data-hz-ui="confirm-dialog"');
    expect(html).toContain('data-hz-confirm-tone="critical"');
    expect(html).toContain('data-hz-confirm-closable="false"');
    expect(html).toContain('data-hz-confirm-ok-danger="true"');
    expect(html).toContain('data-hz-confirm-ok-type="primary"');
    expect(html).toContain('data-hz-confirm-body="true"');
    expect(html).toContain('data-hz-confirm-body-rhythm="stack"');
    expect(html).toContain('space-y-3');
    expect(html).toContain('data-hz-confirm-action="cancel"');
    expect(html).toContain('data-hz-confirm-action="confirm"');
    expect(html).toContain('min-h-8 min-w-16');
    expect(html).toContain('data-monitor-delete-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-monitors-delete-confirm="hertzbeat-ui-modal"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('Delete 3 drafts');
    expect(html).toContain('Delete selected monitors');
    expect(html).toContain('data-hz-ui="batch-toolbar"');
    expect(html).toContain('data-hz-batch-selection-count="3"');
    expect(html).toContain('data-hz-batch-action="delete"');
    expect(html).toContain('data-hz-batch-action-help="delete"');
    expect(html).toContain('data-hz-batch-action-help-trigger="hertzbeat-ui-action-help"');
    expect(html).toContain('data-hz-batch-action-help-style="icon-after-action"');
    expect(html).toContain('data-hz-batch-action-help-visual="circle-help-icon"');
    expect(html).toContain('data-hz-batch-action-help-icon="lucide-circle-help"');
    expect(html).toContain('data-hz-batch-action-help-tooltip="hertzbeat-ui-action-tooltip"');
    expect(html).toContain('data-test-batch-help-root="delete"');
    expect(html).toContain('data-test-batch-help-trigger="delete"');
    expect(html).toContain('data-test-batch-help-tooltip="delete"');
    expect(html).toContain('rounded-none border-0 bg-transparent');
    expect(html).not.toContain('rounded-full border border-[#2b3039] bg-[#101217]');
    expect(html).not.toContain('<span aria-hidden="true">?</span>');
    expect(html).toContain('Deletes selected records.');
    expect(html).toContain('This cannot be undone.');
    expect(html).toContain('data-hz-batch-action-busy="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Applying');
    expect(html).toContain('data-hz-ui="toast-stack"');
    expect(html).toContain('data-hz-toast="failed"');
    expect(html).toContain('data-hz-toast-tone="critical"');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('keeps non-critical batch actions visually identical so enable/apply actions do not become primary cards', () => {
    const html = renderToStaticMarkup(
      <HzBatchToolbar
        selectionCount={3}
        selectionLabel="monitors selected"
        actions={[
          { id: 'select-page', label: 'Select page' },
          { id: 'enable', label: 'Enable selected', tone: 'info' },
          { id: 'pause', label: 'Pause selected' },
          { id: 'delete', label: 'Delete selected', tone: 'critical' }
        ]}
      />
    );

    const enableButton = html.match(/<button[^>]*data-hz-batch-action="enable"[^>]*>/)?.[0] ?? '';
    const pauseButton = html.match(/<button[^>]*data-hz-batch-action="pause"[^>]*>/)?.[0] ?? '';
    const deleteButton = html.match(/<button[^>]*data-hz-batch-action="delete"[^>]*>/)?.[0] ?? '';

    expect(enableButton).toContain('data-hz-control-edge="flat"');
    expect(enableButton).toContain('data-hz-button-tier="flat-neutral"');
    expect(enableButton).toContain('bg-[var(--hz-ui-control)]');
    expect(enableButton).toContain('text-[#98a2b3]');
    expect(enableButton).not.toContain('shadow-[inset_0_-1px_0_var(--hz-ui-accent)]');
    expect(enableButton).toBe(pauseButton.replace('data-hz-batch-action="pause"', 'data-hz-batch-action="enable"'));
    expect(deleteButton).toContain('data-hz-button-tier="solid-danger"');
  });

  it('keeps batch toolbar actions on the shared flat button tier instead of card-like lined buttons', () => {
    const source = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <HzBatchToolbar
        data-monitor-manage-batch-owner="hertzbeat-ui-batch-toolbar"
        variant="embedded"
        selectionCount={2}
        selectionLabel="monitors selected"
        actions={[
          { id: 'select-page', label: 'Select page' },
          { id: 'clear-selection', label: 'Clear selection' },
          { id: 'export-json', label: 'Export JSON' }
        ]}
      />
    );

    const actionButtons = html.match(/<button[^>]*data-hz-batch-action="[^"]+"[^>]*>/g) ?? [];

    expect(html).toContain('data-hz-batch-toolbar-surface="transparent-lined"');
    expect(html).toContain('data-hz-batch-toolbar-variant="embedded"');
    expect(html).toContain('data-monitor-manage-batch-owner="hertzbeat-ui-batch-toolbar"');
    expect(source).not.toContain('bg-[var(--hz-ui-active-soft)] px-3 py-2');
    expect(actionButtons).toHaveLength(3);
    for (const button of actionButtons) {
      expect(button).toContain('data-hz-ui="button"');
      expect(button).toContain('data-hz-control-height="28"');
      expect(button).toContain('data-hz-control-edge="flat"');
      expect(button).toContain('data-hz-button-tier="flat-neutral"');
      expect(button).toContain('data-hz-batch-action-owner="hertzbeat-ui-button"');
      expect(button).not.toContain('shadow-[inset_0_-1px_0_var(--hz-ui-accent)]');
    }
  });

  it('can place legacy batch operations behind an Angular ellipsis overflow menu', () => {
    const html = renderToStaticMarkup(
      <HzBatchToolbar
        selectionCount={2}
        selectionLabel="monitors selected"
        overflowLabel="More monitor operations"
        actions={[
          { id: 'select-page', label: 'Select page' },
          { id: 'clear-selection', label: 'Clear selection' },
          { id: 'enable', label: 'Enable', presentation: 'menu' },
          { id: 'pause', label: 'Pause', presentation: 'menu' },
          { id: 'delete', label: 'Delete', tone: 'critical', presentation: 'menu' },
          { id: 'export-selected', label: 'Export', presentation: 'menu' },
          { id: 'import', label: 'Import', presentation: 'menu' }
        ]}
      />
    );

    expect(html).toContain('data-hz-batch-overflow-mode="angular-ellipsis-menu"');
    expect(html).toContain('data-hz-batch-overflow-count="5"');
    expect(html).toContain('data-hz-batch-overflow="angular-ellipsis-menu"');
    expect(html).toContain('data-hz-batch-overflow-trigger="angular-ellipsis-menu"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('data-hz-batch-overflow-panel="angular-nz-dropdown-menu"');
    expect(html).toContain('data-hz-batch-overflow-panel-open="false"');
    expect(html).toContain('data-hz-batch-overflow-clearance="floating-overlay-no-table-crop"');
    const overflowPanel = html.match(/<div[^>]*data-hz-batch-overflow-panel="angular-nz-dropdown-menu"[^>]*>/)?.[0] ?? '';
    expect(overflowPanel).toContain('hidden');
    expect(overflowPanel).not.toContain(' grid ');
    expect(html).toContain('data-hz-batch-action="select-page"');
    expect(html).toContain('data-hz-batch-action-presentation="inline"');
    expect(html).toContain('data-hz-batch-action="enable"');
    expect(html).toContain('data-hz-batch-action-presentation="menu"');
    expect(html).toContain('data-hz-batch-action="import"');
  });

  it('keeps shared UI production code free of locale-specific Chinese literals', () => {
    const source = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');

    expect(source).not.toMatch(/[\u4E00-\u9FFF]/);
  });

  it('renders monitor editor sections with shared compact form chrome', () => {
    const html = renderToStaticMarkup(
      <HzMonitorEditorSection
        title="Base parameters"
        copy="Collector, scrape, schedule, and monitor identity."
        titleMeta={<span data-test-section-meta="true">Optional</span>}
        help={{
          label: 'Explain base parameters',
          body: 'Use these fields to define the target and schedule.',
          impact: 'Changing them affects collection behavior.'
        }}
        data-monitor-editor-section-owner="hertzbeat-ui-editor-section"
      >
        <label>
          Host
          <input value="127.0.0.1" readOnly />
        </label>
      </HzMonitorEditorSection>
    );

    expect(html).toContain('data-hz-ui="monitor-editor-section"');
    expect(html).toContain('data-hz-monitor-editor-section-body="true"');
    expect(html).toContain('data-monitor-editor-section-owner="hertzbeat-ui-editor-section"');
    expect(html).toContain('data-monitor-editor-section-help-placement="inline-title"');
    expect(html).toContain('data-monitor-editor-section-help-trigger="hertzbeat-ui-section-help"');
    expect(html).toContain('type="button"');
    expect(html).toContain('data-monitor-editor-section-help-style="icon-after-title"');
    expect(html).toContain('data-monitor-editor-section-help-visual="circle-help-icon"');
    expect(html).toContain('data-monitor-editor-section-help-icon="lucide-circle-help"');
    expect(html).toContain('data-monitor-editor-section-help="hertzbeat-ui-section-tooltip"');
    expect(html).toContain('aria-describedby=');
    expect(html).not.toContain('data-monitor-editor-section-help-style="literal-question-after-title"');
    expect(html).not.toContain('<span aria-hidden="true">?</span>');
    expect(html).toContain('Explain base parameters');
    expect(html).toContain('Use these fields to define the target and schedule.');
    expect(html).toContain('Changing them affects collection behavior.');
    expect(html).toContain('data-test-section-meta="true"');
    expect(html).toContain('Optional');
    expect(html).toContain('Base parameters');
    expect(html).toContain('Collector, scrape, schedule, and monitor identity.');
    expect(html).toContain('127.0.0.1');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders monitor editor forms with shared linear shell ownership', () => {
    const html = renderToStaticMarkup(
      <HzMonitorEditorForm
        data-monitor-editor-form-owner="hertzbeat-ui-monitor-editor-form"
        actionBar={<HzMonitorEditorActionBar title="New monitor" actions={[{ id: 'save', label: 'Save' }]} />}
      >
        <HzMonitorEditorHeader title="New monitor" />
        <HzMonitorEditorSection title="Base parameters">Fields</HzMonitorEditorSection>
      </HzMonitorEditorForm>
    );

    expect(html).toContain('data-hz-ui="monitor-editor-form"');
    expect(html).toContain('data-monitor-editor-form-owner="hertzbeat-ui-monitor-editor-form"');
    expect(html).toContain('data-monitor-editor-layout="linear"');
    expect(html).toContain('data-monitor-editor-linear-shell="true"');
    expect(html).toContain('data-hz-ui="monitor-editor-header"');
    expect(html).toContain('data-hz-ui="monitor-editor-section"');
    expect(html).toContain('data-hz-ui="monitor-editor-action-bar"');
    expect(html).not.toContain('data-monitor-editor-fact=');
    expect(html).not.toContain('data-monitor-editor-payload-row=');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders monitor editor field grids with shared form density ownership', () => {
    const html = renderToStaticMarkup(
      <HzMonitorEditorFieldGrid data-monitor-editor-field-grid-owner="hertzbeat-ui-monitor-editor-field-grid">
        <HzField label="Host">
          <HzInput value="127.0.0.1" readOnly />
        </HzField>
        <HzField label="Port">
          <HzInput value="9091" readOnly />
        </HzField>
      </HzMonitorEditorFieldGrid>
    );

    expect(html).toContain('data-hz-ui="monitor-editor-field-grid"');
    expect(html).toContain('data-monitor-editor-field-grid-owner="hertzbeat-ui-monitor-editor-field-grid"');
    expect(html).toContain('data-hz-monitor-editor-field-grid-columns="2"');
    expect(html).toContain('Host');
    expect(html).toContain('Port');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders monitor editor headers with shared compact title chrome', () => {
    const html = renderToStaticMarkup(
      <HzMonitorEditorHeader
        title="New monitor"
        data-monitor-editor-header-owner="hertzbeat-ui-monitor-editor-header"
      />
    );

    expect(html).toContain('data-hz-ui="monitor-editor-header"');
    expect(html).toContain('data-monitor-editor-header-owner="hertzbeat-ui-monitor-editor-header"');
    expect(html).toContain('New monitor');
    expect(html).not.toContain('Monitor Configuration');
    expect(html).not.toContain('MODE');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders monitor editor key-value rows with shared compact row chrome', () => {
    const html = renderToStaticMarkup(
      <HzKeyValueEditor
        title="Labels"
        rows={[
          { key: 'team', value: 'platform' },
          { key: 'env', value: 'prod' }
        ]}
        addLabel="Add label"
        removeLabel="Remove"
        keyPlaceholder="key"
        valuePlaceholder="value"
        data-monitor-editor-key-value-owner="hertzbeat-ui-key-value-editor"
      />
    );

    expect(html).toContain('data-hz-ui="key-value-editor"');
    expect(html).toContain('data-hz-key-value-rows="true"');
    expect(html).toContain('data-hz-key-value-row="0"');
    expect(html).toContain('data-hz-key-value-input="key"');
    expect(html).toContain('data-hz-key-value-input="value"');
    expect(html).toContain('data-hz-key-value-action="remove"');
    expect(html).toContain('data-hz-key-value-action="add"');
    expect(html).toContain('data-hz-key-value-action-visibility="inline"');
    expect(html).toContain('data-hz-key-value-action-visibility="emphasized"');
    expect(html).toContain('data-hz-key-value-footer="action-row"');
    expect(html).toContain('data-hz-key-value-action-layout="footer-command"');
    expect(html).toContain('w-full');
    expect(html).toContain('border-[var(--hz-ui-accent-muted)]');
    expect(html).not.toContain('data-hz-key-value-action="add" class="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[3px] border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 outline-none focus-visible:border-[var(--hz-ui-accent)] focus-visible:ring-1 focus-visible:ring-[var(--hz-ui-accent-muted)] border-transparent bg-transparent');
    expect(html).toContain('data-monitor-editor-key-value-owner="hertzbeat-ui-key-value-editor"');
    expect(html).toContain('team');
    expect(html).toContain('platform');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders configurable field rows with shared compact multi-column chrome', () => {
    const html = renderToStaticMarkup(
      <HzConfigurableFieldEditor
        rows={[
          { field: 'usage', unit: '%', type: 'number' }
        ]}
        columns={[
          { key: 'field', placeholder: 'Field' },
          { key: 'unit', placeholder: 'Unit', className: 'minmax(50px,90px)' },
          { key: 'type', placeholder: 'Type' }
        ]}
        addLabel="Add metric"
        removeLabel="Remove"
        data-plugin-param-metrics-field-owner="hertzbeat-ui-configurable-field-editor"
      />
    );

    expect(html).toContain('data-hz-ui="configurable-field-editor"');
    expect(html).toContain('data-hz-configurable-field-rows="true"');
    expect(html).toContain('data-hz-configurable-field-row="0"');
    expect(html).toContain('data-hz-configurable-field-input="field"');
    expect(html).toContain('data-hz-configurable-field-input="unit"');
    expect(html).toContain('data-hz-configurable-field-input="type"');
    expect(html).toContain('data-hz-configurable-field-action="remove"');
    expect(html).toContain('data-hz-configurable-field-action="add"');
    expect(html).toContain('data-hz-configurable-field-footer="action-row"');
    expect(html).toContain('data-hz-configurable-field-action-layout="footer-command"');
    expect(html).toContain('minmax(50px,90px)');
    expect(html).toContain('data-plugin-param-metrics-field-owner="hertzbeat-ui-configurable-field-editor"');
    expect(html).toContain('usage');
    expect(html).toContain('number');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders monitor editor field controls with shared compact form chrome', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzField label="App" data-monitor-editor-field-owner="hertzbeat-ui-field">
          <HzInput value="mysql" readOnly />
        </HzField>
        <HzField as="div" label="Scrape" data-monitor-editor-field-owner="hertzbeat-ui-field">
          <HzSelect value="static" aria-label="Scrape" options={[{ value: 'static', label: 'static' }]} />
        </HzField>
      </div>
    );

    expect(html).toContain('data-hz-ui="field"');
    expect(html).toContain('data-hz-ui="input"');
    expect(html).toContain('data-hz-ui="select"');
    expect(html).toContain('data-hz-ui="select-menu"');
    expect(html).toContain('data-monitor-editor-field-owner="hertzbeat-ui-field"');
    expect(html).toContain('App');
    expect(html).toContain('Scrape');
    expect(html).toContain('mysql');
    expect(html).toContain('static');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders field help directly beside the label instead of at the far edge of the form row', () => {
    const html = renderToStaticMarkup(
      <HzField
        label="Host"
        labelMeta={<span data-test-field-meta="required-manual">Required Manual</span>}
        help={{
          label: 'Explain Host',
          body: 'Target address collected by this monitor.',
          impact: 'Required for static collection.'
        }}
      >
        <HzInput value="127.0.0.1" readOnly />
      </HzField>
    );

    expect(html).toContain('data-hz-field-help-placement="inline-label"');
    expect(html).toContain('data-hz-field-help-trigger="hertzbeat-ui-field-help"');
    expect(html).toContain('data-hz-field-help-button="icon-after-label"');
    expect(html).toContain('data-hz-field-help-visual="circle-help-icon"');
    expect(html).toContain('data-hz-field-help-icon="lucide-circle-help"');
    expect(html).toContain('data-hz-field-help="hertzbeat-ui-field-tooltip"');
    expect(html).toContain('aria-label="Explain Host"');
    expect(html).toContain('aria-describedby="');
    expect(html).toContain('role="button"');
    expect(html).toContain('role="tooltip"');
    expect(html).toContain('id="');
    expect(html).toContain('tabindex="0"');
    expect(html).not.toContain('>?</span>');
    expect(html).not.toContain('data-hz-field-help-button="literal-question-after-label"');
    expect(html).not.toContain('data-hz-field-help-visual="borderless-question"');
    expect(html).toContain('Target address collected by this monitor.');
    expect(html).toContain('Required for static collection.');
    expect(html).toContain('Host');
    expect(html).toContain('data-test-field-meta="required-manual"');
    expect(html.indexOf('Host')).toBeLessThan(html.indexOf('data-hz-field-help-trigger="hertzbeat-ui-field-help"'));
    expect(html.indexOf('data-hz-field-help-trigger="hertzbeat-ui-field-help"')).toBeLessThan(html.indexOf('data-test-field-meta="required-manual"'));
    expect(html).not.toContain('justify-end');
  });

  it('renders monitor editor action help directly beside footer actions', () => {
    const html = renderToStaticMarkup(
      <HzMonitorEditorActionBar
        title="New monitor"
        actions={[
          {
            id: 'detect',
            label: 'Detect',
            help: {
              label: 'Explain Detect',
              body: 'Validate without saving.',
              impact: 'Useful before changing collection behavior.'
            }
          }
        ]}
      />
    );

    expect(html).toContain('data-monitor-editor-action="detect"');
    expect(html).toContain('data-monitor-editor-action-help-placement="inline-action"');
    expect(html).toContain('data-monitor-editor-action-help-trigger="hertzbeat-ui-action-help"');
    expect(html).toContain('data-monitor-editor-action-help-style="icon-after-action"');
    expect(html).toContain('data-monitor-editor-action-help-visual="circle-help-icon"');
    expect(html).toContain('data-monitor-editor-action-help-icon="lucide-circle-help"');
    expect(html).toContain('data-monitor-editor-action-help="hertzbeat-ui-action-tooltip"');
    expect(html).toContain('aria-label="Explain Detect"');
    expect(html).toContain('Validate without saving.');
    expect(html).toContain('Useful before changing collection behavior.');
  });

  it('renders monitor editor textarea controls with shared compact multiline chrome', () => {
    const html = renderToStaticMarkup(
      <HzField as="div" label="Description" span="wide" data-monitor-editor-textarea-owner="hertzbeat-ui-textarea">
        <HzTextarea height="tall" value="Primary MySQL endpoint." maxCharacterCount={100} readOnly />
      </HzField>
    );

    expect(html).toContain('data-hz-ui="field"');
    expect(html).toContain('data-hz-field-span="wide"');
    expect(html).toContain('md:col-span-2');
    expect(html).toContain('data-hz-ui="textarea"');
    expect(html).toContain('data-hz-ui="textarea-count"');
    expect(html).toContain('data-hz-textarea-height="tall"');
    expect(html).toContain('data-hz-textarea-count-owner="hertzbeat-ui-textarea"');
    expect(html).toContain('data-hz-textarea-count-max="100"');
    expect(html).toContain('data-hz-textarea-count-input="true"');
    expect(html).toContain('data-hz-textarea-count-value="23/100"');
    expect(html).toContain('min-h-[120px]');
    expect(html).toContain('data-monitor-editor-textarea-owner="hertzbeat-ui-textarea"');
    expect(html).toContain('Description');
    expect(html).toContain('Primary MySQL endpoint.');
    expect(html).not.toContain('data-hz-textarea-owner');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders monitor editor checkbox controls with shared compact boolean chrome', () => {
    const html = renderToStaticMarkup(
      <HzField as="div" label="Enabled" data-monitor-editor-checkbox-owner="hertzbeat-ui-checkbox">
        <HzCheckbox defaultChecked label="Collect this resource" />
      </HzField>
    );

    expect(html).toContain('data-hz-ui="field"');
    expect(html).toContain('data-hz-ui="checkbox"');
    expect(html).toContain('data-hz-checkbox-control="native-hidden"');
    expect(html).toContain('data-hz-checkbox-box="indicator"');
    expect(html).toContain('data-hz-checkbox-label="true"');
    expect(html).toContain('data-monitor-editor-checkbox-owner="hertzbeat-ui-checkbox"');
    expect(html).toContain('Collect this resource');
    expect(html).not.toContain('data-hz-checkbox-owner');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders switch controls with shared compact boolean chrome', () => {
    const html = renderToStaticMarkup(
      <HzField as="div" label="Enabled" data-plugin-upload-status-control-owner="hertzbeat-ui-switch">
        <HzSwitch checked label="Enable plugin" data-plugin-upload-status-control="angular-nz-switch" />
      </HzField>
    );

    expect(html).toContain('data-hz-ui="field"');
    expect(html).toContain('data-hz-ui="switch"');
    expect(html).toContain('data-hz-switch-owner="hertzbeat-ui-switch"');
    expect(html).toContain('data-hz-switch-checked="true"');
    expect(html).toContain('data-hz-switch-control="button"');
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('data-hz-switch-thumb="indicator"');
    expect(html).toContain('data-hz-switch-label="true"');
    expect(html).toContain('data-plugin-upload-status-control="angular-nz-switch"');
    expect(html).toContain('data-plugin-upload-status-control-owner="hertzbeat-ui-switch"');
    expect(html).not.toContain('data-hz-checkbox-owner');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders radio button groups with shared compact state chrome', () => {
    const html = renderToStaticMarkup(
      <HzRadioButtonGroup
        name="incident-state"
        value="2"
        options={[
          { value: '0', label: 'Investigating' },
          { value: '1', label: 'Identified' },
          { value: '2', label: 'Monitoring' },
          { value: '3', label: 'Resolved' }
        ]}
        data-status-incident-state-owner="hertzbeat-ui-radio-button-group"
      />
    );

    expect(html).toContain('data-hz-ui="radio-button-group"');
    expect(html).toContain('data-hz-radio-button-group-owner="hertzbeat-ui-radio-button-group"');
    expect(html).toContain('data-hz-radio-button-option="2"');
    expect(html).toContain('data-hz-radio-button-checked="true"');
    expect(html).toContain('data-hz-radio-button-control="native-hidden"');
    expect(html).toContain('data-status-incident-state-owner="hertzbeat-ui-radio-button-group"');
  });

  it('renders monitor editor number stepper controls with shared compact numeric chrome', () => {
    const html = renderToStaticMarkup(
      <HzField as="div" label="Interval" data-monitor-editor-number-stepper-owner="hertzbeat-ui-number-stepper">
        <HzNumberStepper value="60" min="1" step="1" onValueChange={() => undefined} />
      </HzField>
    );

    expect(html).toContain('data-hz-ui="field"');
    expect(html).toContain('data-hz-ui="number-stepper"');
    expect(html).toContain('data-hz-number-stepper-input="true"');
    expect(html).toContain('data-hz-number-stepper-actions="true"');
    expect(html).toContain('data-hz-number-stepper-action="decrement"');
    expect(html).toContain('data-hz-number-stepper-action="increment"');
    expect(html).toContain('data-monitor-editor-number-stepper-owner="hertzbeat-ui-number-stepper"');
    expect(html).toContain('value="60"');
    expect(html).not.toContain('data-hz-number-stepper-owner');
    expect(html).not.toContain('type="number"');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders monitor editor code editor frames with shared compact editor ownership', () => {
    const html = renderToStaticMarkup(
      <HzField as="div" label="Structured params" rhythm="section">
        <HzCodeEditorFrame data-monitor-editor-code-editor-owner="hertzbeat-ui-code-editor" meta="json">
          <pre data-hz-code-editor="codemirror">{'{"ssl":true}'}</pre>
        </HzCodeEditorFrame>
      </HzField>
    );

    expect(html).toContain('data-hz-ui="field"');
    expect(html).toContain('data-hz-field-rhythm="section"');
    expect(html).toContain('mt-3');
    expect(html).toContain('data-hz-ui="code-editor-frame"');
    expect(html).toContain('data-hz-code-editor-body="true"');
    expect(html).toContain('data-hz-code-editor-meta="true"');
    expect(html).toContain('data-monitor-editor-code-editor-owner="hertzbeat-ui-code-editor"');
    expect(html).toContain('data-hz-code-editor="codemirror"');
    expect(html).toContain('{&quot;ssl&quot;:true}');
    expect(html).not.toContain('data-hz-code-editor-owner');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders monitor editor CodeMirror runtimes with shared editor ownership', () => {
    const html = renderToStaticMarkup(
      <HzField as="div" label="Structured params">
        <HzCodeEditor
          data-monitor-editor-code-editor-owner="hertzbeat-ui-code-editor"
          name="grafana_dashboard_template"
          value={'{"panels":[]}'}
          language="json"
          minHeight="120px"
          ariaLabel="Grafana template"
        />
      </HzField>
    );

    expect(html).toContain('data-hz-ui="field"');
    expect(html).toContain('data-hz-ui="code-editor-frame"');
    expect(html).toContain('data-hz-code-editor-body="true"');
    expect(html).toContain('data-hz-code-editor-runtime="codemirror"');
    expect(html).toContain('data-hz-code-editor-language="json"');
    expect(html).toContain('data-hz-code-editor-license="codemirror-mit"');
    expect(html).toContain('data-hz-code-editor-value="hidden"');
    expect(html).toContain('data-hz-hidden-input-control="native-form-value"');
    expect(html).toContain('name="grafana_dashboard_template"');
    expect(html).toContain('data-mocked-codemirror="true"');
    expect(html).toContain('data-min-height="120px"');
    expect(html).toContain('data-monitor-editor-code-editor-owner="hertzbeat-ui-code-editor"');
    expect(html).not.toContain('data-hz-code-editor="codemirror"');
    expect(html).not.toContain('data-hz-code-editor-owner');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders compact summary primitives for stats, gauges, and threshold distance', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzStatCell
          label="Collection success"
          value="99.2"
          unit="%"
          detail="last 15m"
          trend="+0.4"
          tone="success"
        />
        <HzStatCell
          label="Trace count"
          value="12"
          detail="current query"
          tone="neutral"
          variant="tile"
          data-signal-summary-stat-owner="hertzbeat-ui-stat-cell"
        />
        <HzStatCell
          label="Events"
          value="3"
          tone="neutral"
          variant="tile"
          density="compact"
          data-trace-manage-drawer-stage-stat-owner="hertzbeat-ui-stat-cell"
        />
        <HzSignalSummaryStrip
          data-signal-summary-strip-owner="hertzbeat-ui-signal-summary-strip"
          items={[
            { id: 'total', label: 'Total', value: 8 },
            { id: 'errors', label: 'Errors', value: 2, tone: 'critical', trend: '+1' },
            { id: 'latest', label: 'Latest', value: 'now', detail: 'last event' }
          ]}
        />
        <HzSignalSummaryStrip
          layout="toolbar"
          density="compact"
          data-signal-toolbar-summary-owner="hertzbeat-ui-signal-summary-strip"
          items={[{ id: 'series', label: 'Series', value: 12 }]}
        />
        <HzSignalTrendBars
          title="Signal trend"
          meta="4 points"
          bars={[
            { id: '00:00', label: '00:00', value: 2, tone: 'info' },
            { id: '00:05', label: '00:05', value: 5, tone: 'success' },
            { id: '00:10', label: '00:10', value: 3, tone: 'warning' },
            { id: '00:15', label: '00:15', value: 7, tone: 'critical' }
          ]}
          data-signal-trend-bars-owner="hertzbeat-ui-signal-trend-bars"
        />
        <HzAttributeDiagnostics
          title="Attribution diagnostics"
          namespaceLabel="hertzbeat.*"
          frame="embedded"
          data-signal-attribute-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"
          rows={[
            {
              key: 'entity',
              label: 'hertzbeat.entity_id',
              value: 'entity-1',
              meta: 'present',
              state: 'present',
              stateLabel: 'Present',
              tone: 'success'
            },
            {
              key: 'collector',
              label: 'hertzbeat.collector',
              value: '-',
              meta: 'missing',
              state: 'missing',
              stateLabel: 'Missing',
              tone: 'critical'
            }
          ]}
        />
        <HzBarGauge
          title="Collector saturation"
          value={68}
          min={0}
          max={100}
          unit="%"
          tone="info"
          thresholds={[
            { value: 80, label: 'warn', tone: 'warning' },
            { value: 90, label: 'critical', tone: 'critical' }
          ]}
        />
        <HzThresholdRail
          title="p95 latency"
          value={118}
          min={0}
          max={200}
          unit="ms"
          thresholds={[
            { value: 120, label: 'warn', tone: 'warning' },
            { value: 180, label: 'critical', tone: 'critical' }
          ]}
        />
      </div>
    );

    expect(html).toContain('data-hz-ui="stat-cell"');
    expect(html).toContain('data-hz-stat-tone="success"');
    expect(html).toContain('data-hz-stat-variant="band"');
    expect(html).toContain('data-hz-stat-variant="tile"');
    expect(html).toContain('data-hz-stat-density="default"');
    expect(html).toContain('data-hz-stat-density="compact"');
    expect(html).toContain('data-trace-manage-drawer-stage-stat-owner="hertzbeat-ui-stat-cell"');
    expect(html).toContain('min-h-[64px]');
    expect(html).toContain('data-signal-summary-stat-owner="hertzbeat-ui-stat-cell"');
    expect(html).toContain('Collection success');
    expect(html).toContain('Trace count');
    expect(html).toContain('99.2');
    expect(html).toContain('data-hz-ui="signal-summary-strip"');
    expect(html).toContain('data-hz-signal-summary-layout="panel"');
    expect(html).toContain('data-hz-signal-summary-layout="toolbar"');
    expect(html).toContain('data-hz-signal-summary-item="errors"');
    expect(html).toContain('data-hz-signal-summary-item-tone="critical"');
    expect(html).toContain('data-signal-summary-strip-owner="hertzbeat-ui-signal-summary-strip"');
    expect(html).toContain('data-signal-toolbar-summary-owner="hertzbeat-ui-signal-summary-strip"');
    expect(html).toContain('data-hz-ui="signal-trend-bars"');
    expect(html).toContain('data-hz-signal-trend-count="4"');
    expect(html).toContain('data-signal-trend-bars-owner="hertzbeat-ui-signal-trend-bars"');
    expect(html).toContain('data-hz-signal-trend-tone="critical"');
    expect(html).toContain('data-hz-ui="attribute-diagnostics"');
    expect(html).toContain('data-hz-attribute-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"');
    expect(html).toContain('data-hz-attribute-diagnostics-frame="embedded"');
    expect(html).toContain('data-hz-attribute-diagnostics-count="2"');
    expect(html).toContain('rounded-none');
    expect(html).toContain('bg-transparent');
    expect(html).toContain('data-signal-attribute-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"');
    expect(html).toContain('data-hz-attribute-diagnostic-state="missing"');
    expect(html).toContain('data-hz-attribute-diagnostic-badge="true"');
    expect(html).toContain('data-hz-ui="bar-gauge"');
    expect(html).toContain('data-hz-gauge-value="68"');
    expect(html).toContain('Collector saturation');
    expect(html).toContain('data-hz-threshold="80"');
    expect(html).toContain('data-hz-ui="threshold-rail"');
    expect(html).toContain('data-hz-threshold-value="118"');
    expect(html).toContain('p95 latency');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('owns responsive stat strip layout around reusable stat cells', () => {
    const html = renderToStaticMarkup(
      <HzStatStrip data-signal-dialog-stage-stats-owner="hertzbeat-ui-stat-strip">
        <HzStatCell
          data-signal-dialog-stage-stat-owner="hertzbeat-ui-stat-cell"
          label="Current span"
          value="db.query"
          tone="info"
          variant="tile"
        />
        <HzStatCell
          data-signal-dialog-stage-stat-owner="hertzbeat-ui-stat-cell"
          label="Error spans"
          value="1"
          tone="critical"
          variant="tile"
        />
      </HzStatStrip>
    );

    expect(html).toContain('data-hz-ui="stat-strip"');
    expect(html).toContain('data-hz-stat-strip-owner="hertzbeat-ui-stat-strip"');
    expect(html).toContain('data-hz-stat-strip-columns="4"');
    expect(html).toContain('data-hz-stat-strip-density="tile"');
    expect(html).toContain('sm:grid-cols-2');
    expect(html).toContain('xl:grid-cols-4');
    expect(html).toContain('data-signal-dialog-stage-stats-owner="hertzbeat-ui-stat-strip"');
    expect(html).toContain('data-hz-ui="stat-cell"');
    expect(html).toContain('data-signal-dialog-stage-stat-owner="hertzbeat-ui-stat-cell"');
  });

  it('renders compact panel headers for table and detail surfaces', () => {
    const html = renderToStaticMarkup(
      <HzPanelHeader
        data-signal-panel-header-owner="hertzbeat-ui-panel-header"
        eyebrow="Detail"
        title="Recent logs"
        subtitle="Live and historical evidence"
        meta={<HzStatusBadge tone="neutral" size="xs">8 rows</HzStatusBadge>}
      />
    );

    expect(html).toContain('data-hz-ui="panel-header"');
    expect(html).toContain('data-hz-panel-header-owner="hertzbeat-ui-panel-header"');
    expect(html).toContain('data-hz-panel-header-density="operator-compact"');
    expect(html).toContain('data-hz-panel-header-chrome="default"');
    expect(html).toContain('data-signal-panel-header-owner="hertzbeat-ui-panel-header"');
    expect(html).toContain('data-hz-panel-header-eyebrow="true"');
    expect(html).toContain('data-hz-panel-header-title="true"');
    expect(html).toContain('data-hz-panel-header-subtitle="true"');
    expect(html).toContain('data-hz-panel-header-actions="true"');
    expect(html).toContain('Detail');
    expect(html).toContain('Recent logs');
    expect(html).toContain('8 rows');
  });

  it('renders transparent topless panel header chrome from the shared primitive', () => {
    const html = renderToStaticMarkup(
      <>
        <HzPanelHeader
          chrome="transparent"
          title="Metrics detail"
          data-metrics-detail-panel-header-owner="hertzbeat-ui-panel-header"
        />
        <HzPanelHeader
          chrome="transparent-topless"
          title="Metrics series"
          data-metrics-series-table-header-owner="hertzbeat-ui-panel-header"
        />
        <HzPanelHeader
          chrome="transparent-framed"
          title="Metrics detail demo"
          data-metrics-detail-panel-demo-header-owner="hertzbeat-ui-panel-header"
        />
      </>
    );

    expect(html).toContain('data-hz-ui="panel-header"');
    expect(html).toContain('data-hz-panel-header-chrome="transparent"');
    expect(html).toContain('data-metrics-detail-panel-header-owner="hertzbeat-ui-panel-header"');
    expect(html).toContain('data-hz-panel-header-chrome="transparent-topless"');
    expect(html).toContain('border-x-0 border-t-0 bg-transparent');
    expect(html).toContain('data-metrics-series-table-header-owner="hertzbeat-ui-panel-header"');
    expect(html).toContain('data-hz-panel-header-chrome="transparent-framed"');
    expect(html).toContain('border-x-0 border-b border-t border-[var(--hz-ui-line-soft)] bg-transparent');
    expect(html).toContain('data-metrics-detail-panel-demo-header-owner="hertzbeat-ui-panel-header"');
  });

  it('renders compact panel title labels with shared icon typography', () => {
    const PanelIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />;
    const html = renderToStaticMarkup(
      <HzPanelTitleLabel
        icon={PanelIcon}
        data-signal-panel-title-label-owner="hertzbeat-ui-panel-title-label"
      >
        Time series
      </HzPanelTitleLabel>
    );

    expect(html).toContain('data-hz-ui="panel-title-label"');
    expect(html).toContain('data-hz-panel-title-label-owner="hertzbeat-ui-panel-title-label"');
    expect(html).toContain('data-hz-panel-title-label-density="operator-compact"');
    expect(html).toContain('data-hz-panel-title-label-icon="true"');
    expect(html).toContain('data-hz-panel-title-label-text="true"');
    expect(html).toContain('inline-flex min-w-0 items-center gap-2');
    expect(html).toContain('text-[12px] font-semibold text-[#c6cfdd]');
    expect(html).toContain('h-4 w-4 shrink-0');
    expect(html).toContain('Time series');
  });

  it('renders compact trend frames for empty and fallback chart bands', () => {
    const html = renderToStaticMarkup(
      <HzTrendFrame data-metrics-trend-frame-owner="hertzbeat-ui-trend-frame">
        <span data-test-trend-bar="true" />
      </HzTrendFrame>
    );

    expect(html).toContain('data-hz-ui="trend-frame"');
    expect(html).toContain('data-hz-trend-frame-owner="hertzbeat-ui-trend-frame"');
    expect(html).toContain('data-hz-trend-frame-density="operator-compact"');
    expect(html).toContain('data-hz-trend-frame-variant="compact-bars"');
    expect(html).toContain('data-metrics-trend-frame-owner="hertzbeat-ui-trend-frame"');
    expect(html).toContain('flex h-16 items-end gap-1.5');
    expect(html).toContain('data-test-trend-bar="true"');
  });

  it('renders compact trend bars for fallback metric samples', () => {
    const html = renderToStaticMarkup(
      <HzTrendBar
        heightPct={72}
        data-metrics-trend-bar-owner="hertzbeat-ui-trend-bar"
        title="checkout.latency"
      />
    );

    expect(html).toContain('data-hz-ui="trend-bar"');
    expect(html).toContain('data-hz-trend-bar-owner="hertzbeat-ui-trend-bar"');
    expect(html).toContain('data-hz-trend-bar-density="operator-compact"');
    expect(html).toContain('data-hz-trend-bar-height-pct="72"');
    expect(html).toContain('data-metrics-trend-bar-owner="hertzbeat-ui-trend-bar"');
    expect(html).toContain('min-w-0 flex-1 rounded-t-[3px] border border-[#2f3b4d] bg-[#182232]');
    expect(html).toContain('height:72%');
    expect(html).toContain('title="checkout.latency"');
  });

  it('renders monitor panel stat and signal primitives without observability bridge chrome', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzMonitorStatGrid
          items={[
            { label: 'Latest value', value: '25' },
            { label: 'Delta', value: '+10', tone: 'success' },
            { label: 'Range', value: '10 - 29' }
          ]}
        />
        <HzMonitorSignalBars
          items={[
            { label: 'usage', value: '72 %', widthPercent: 72 },
            { label: 'idle', value: '28 %', widthPercent: 28, tone: 'neutral' }
          ]}
        />
      </div>
    );

    expect(html).toContain('data-hz-ui="monitor-stat-grid"');
    expect(html).toContain('data-monitor-stat-grid-owner="hertzbeat-ui-monitor-stat-grid"');
    expect(html).toContain('data-hz-ui="monitor-signal-bars"');
    expect(html).toContain('data-monitor-signal-bars-owner="hertzbeat-ui-monitor-signal-bars"');
    expect(html).toContain('Latest value');
    expect(html).toContain('usage');
    expect(html).not.toContain('data-observability-stat-grid');
    expect(html).not.toContain('rounded-full');
  });

  it('renders investigation workflow primitives for query history, saved view compare, and notes', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzQueryHistory
          title="Query history"
          items={[
            {
              id: 'q1',
              query: "resource.type IN 'mysql'",
              time: '14:28',
              duration: '118ms',
              resultCount: 128,
              tone: 'success',
              active: true
            },
            {
              id: 'q2',
              query: "status = 'down'",
              time: '14:20',
              duration: '96ms',
              resultCount: 5,
              tone: 'critical'
            }
          ]}
          actions={<HzButton size="sm">Clear</HzButton>}
        />
        <HzSavedViewCompare
          title="Saved view compare"
          baseline={{
            label: 'Baseline',
            meta: '2 filters',
            items: ['resource.type', 'status != down']
          }}
          candidate={{
            label: 'Open alerts',
            meta: '1 filter',
            items: ['status IN warning, collecting']
          }}
          deltas={[
            { label: 'Active monitors', value: '-12', tone: 'warning' },
            { label: 'Open alerts', value: '+7', tone: 'critical' }
          ]}
        />
        <HzInvestigationNotes
          title="Investigation notes"
          notes={[
            {
              id: 'n1',
              author: 'SRE',
              time: '14:31',
              body: 'collector-a p95 spike aligns with Greptime write lag.',
              tone: 'warning',
              tags: ['collector-a', 'greptime']
            }
          ]}
          actions={<HzButton size="sm">Add note</HzButton>}
        />
      </div>
    );

    expect(html).toContain('data-hz-ui="query-history"');
    expect(html).toContain('data-hz-query-history-row="q1"');
    expect(html).toContain('Query history');
    expect(html).toContain('Restore');
    expect(html).toContain('Compare');
    expect(html).toContain('data-hz-ui="saved-view-compare"');
    expect(html).toContain('data-hz-compare-side="baseline"');
    expect(html).toContain('data-hz-compare-side="candidate"');
    expect(html).toContain('data-hz-compare-delta="Open alerts"');
    expect(html).toContain('data-hz-ui="investigation-notes"');
    expect(html).toContain('data-hz-note="n1"');
    expect(html).toContain('collector-a p95 spike aligns with Greptime write lag.');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders handoff primitives for command navigation and evidence context jumps', () => {
    const html = renderToStaticMarkup(
      <div>
        <HzCommandPalette
          title="Command palette"
          query="collector-a"
          items={[
            {
              id: 'entity',
              title: 'Open entity mysql-prod-01',
              description: 'Jump to entity detail with the current query context.',
              shortcut: 'G E',
              tone: 'info',
              active: true
            },
            {
              id: 'alert',
              title: 'Create alert from current filter',
              description: 'Carry resource.type and collector filters into alert authoring.',
              shortcut: 'A N',
              tone: 'warning'
            }
          ]}
          actions={<HzButton size="sm">Run</HzButton>}
        />
        <HzContextHandoff
          title="Context handoff"
          context="mysql-prod-01 · collector-a · last 15m"
          frame="flush"
          targets={[
            {
              id: 'entity-detail',
              label: 'Entity detail',
              description: 'Metrics, logs, traces, alerts, and owner context.',
              meta: '5 signals',
              tone: 'info',
              current: true
            },
            {
              id: 'alert-evidence',
              label: 'Alert evidence',
              description: 'Open alerts constrained to the same entity and time range.',
              meta: '7 open',
              tone: 'critical'
            }
          ]}
          actions={<HzButton size="sm">Copy context</HzButton>}
        />
      </div>
    );

    expect(html).toContain('data-hz-ui="command-palette"');
    expect(html).toContain('data-hz-command-item="entity"');
    expect(html).toContain('Command palette');
    expect(html).toContain('collector-a');
    expect(html).toContain('G E');
    expect(html).toContain('Create alert from current filter');
    expect(html).toContain('data-hz-ui="context-handoff"');
    expect(html).toContain('data-hz-context-handoff-owner="hertzbeat-ui-context-handoff"');
    expect(html).toContain('data-hz-context-handoff-frame="flush"');
    expect(html).toContain('border-0');
    expect(html).toContain('data-hz-context-target="entity-detail"');
    expect(html).toContain('data-hz-context-target-current="true"');
    expect(html).toContain('Entity detail');
    expect(html).toContain('Alert evidence');
    expect(html).toContain('Copy context');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders an inspector drawer for selected evidence without card chrome', () => {
    const html = renderToStaticMarkup(
      <HzInspectorDrawer
        open
        title="mysql-prod-01"
        subtitle="MySQL · collector-a · last 15m"
        status={<HzStatusBadge tone="warning">Warning</HzStatusBadge>}
        facts={[
          { label: 'Latency p95', value: '118ms', tone: 'warning' },
          { label: 'Owner', value: 'DB platform' }
        ]}
        sections={[
          {
            id: 'evidence',
            title: 'Evidence',
            items: [
              { id: 'metric', label: 'Metric', value: 'responseTime > 120ms', tone: 'warning' },
              { id: 'log', label: 'Log', value: 'slow query detected', tone: 'critical' }
            ]
          },
          {
            id: 'actions',
            title: 'Safe actions',
            items: [{ id: 'runbook', label: 'Runbook', value: 'Open rollback checklist', meta: 'safe' }]
          }
        ]}
        actions={<HzButton size="sm">Open entity</HzButton>}
      />
    );

    expect(html).toContain('data-hz-ui="inspector-drawer"');
    expect(html).toContain('data-hz-inspector-open="true"');
    expect(html).toContain('data-hz-inspector-fact="Latency p95"');
    expect(html).toContain('data-hz-inspector-section="evidence"');
    expect(html).toContain('data-hz-inspector-item="metric"');
    expect(html).toContain('mysql-prod-01');
    expect(html).toContain('Evidence');
    expect(html).toContain('Safe actions');
    expect(html).toContain('Open entity');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('renders field insights for distribution and context drilldown without card chrome', () => {
    const html = renderToStaticMarkup(
      <HzFieldInsights
        field="collector"
        selectedValue="collector-a"
        values={[
          { id: 'collector-a', label: 'collector-a', count: 58, tone: 'success' },
          { id: 'collector-b', label: 'collector-b', count: 44, tone: 'info' }
        ]}
      />
    );

    expect(html).toContain('data-hz-ui="field-insights"');
    expect(html).toContain('Field stats');
    expect(html).toContain('collector');
    expect(html).toContain('collector-a');
    expect(html).toContain('58');
    expect(html).toContain('Show context');
    expect(html).toContain('Drilldown');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
  });

  it('uses soft boundary tokens instead of hard fixed divider colors for workbench regions', () => {
    const html = renderToStaticMarkup(
      <HzExplorerFrame
        title="Explorer"
        actions={<HzButton intent="primary">Apply</HzButton>}
        tabs={<span>Monitors</span>}
        filterRail={<HzFilterRail groups={[{ id: 'domain', label: 'Domain', options: [{ id: 'all', label: 'All', active: true }] }]} />}
        queryBar={<HzQueryBar query="resource.type = mysql" />}
        metricStrip={<HzMetricStrip items={[{ label: 'Active', value: '123' }, { label: 'Alerts', value: '7' }]} />}
      >
        <HzYamlWorkspace
          categories={categories}
          selectedId="mysql"
          search=""
          onSearchChange={vi.fn()}
          title="MySQL"
          filename="app-mysql.yml"
          code="app: mysql"
        />
      </HzExplorerFrame>
    );

    expect(html).toContain('var(--hz-ui-line-soft)');
    expect(html).toContain('var(--hz-ui-line-faint)');
    expect(html).toContain('var(--hz-ui-control)');
    expect(html).toContain('var(--hz-ui-code)');
    expect(html).toContain('var(--hz-ui-accent-muted)');
    expect(html).not.toContain('border-[#242a34]');
    expect(html).not.toContain('border-[#2b3039]');
    expect(html).not.toContain('border-[#1f252e]');
    expect(html).not.toContain('#4e74f8');
    expect(html).not.toContain('#182238');
    expect(html).not.toContain('#202a42');
  });

  it('renders the monitor type dialog as a categorized list, not a secondary menu wall', () => {
    const html = renderToStaticMarkup(
      <HzTypePickerDialog
        open
        title={localizedFixtures.newMonitor}
        description={localizedFixtures.chooseTemplateByResource}
        categories={categories}
        search=""
        onSearchChange={vi.fn()}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        searchInputProps={{
          'data-monitor-app-picker-search-owner': 'hertzbeat-ui-input',
          'data-monitor-app-picker-search-action': 'filter'
        } as React.ComponentProps<typeof HzTypePickerDialog>['searchInputProps']}
        labels={{
          close: localizedFixtures.close,
          catalogTitle: localizedFixtures.catalogTitle,
          templatePicker: {
            itemCount: localizedItemCount,
            searchPlaceholder: localizedFixtures.searchVisibleName,
            empty: localizedFixtures.noMatches
          }
        }}
      />
    );

    expect(html).toContain('data-hz-ui="type-picker-dialog"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby=');
    expect(html).toContain('data-hz-template-search-input="true"');
    expect(html).toContain('data-hz-template-search-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-monitor-app-picker-search-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-monitor-app-picker-search-action="filter"');
    expect(html).toContain(localizedFixtures.catalogTitle);
    expect(html).toContain(localizedFixtures.dbMonitor);
    expect(html).toContain(localizedFixtures.osMonitor);
  });

  it('filters monitor type picker categories by visible label like the old Angular select menu', () => {
    const html = renderToStaticMarkup(
      <HzTypePickerDialog
        open
        title={localizedFixtures.newMonitor}
        categories={categories}
        search="linux"
        onSearchChange={vi.fn()}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(html).toContain('data-hz-template-search-input="true"');
    expect(html).toContain('data-hz-template-item="linux"');
    expect(html).toContain('Linux');
    expect(html).not.toContain('data-hz-template-item="mysql"');
    expect(html).not.toContain('MySQL');
  });

  it('matches the legacy Angular monitor type picker grid without per-type icons or trailing metadata', () => {
    const html = renderToStaticMarkup(
      <HzTypePickerDialog
        open
        title={localizedFixtures.newMonitor}
        description={localizedFixtures.chooseTemplateByResource}
        categories={[
          {
            id: 'db',
            label: localizedFixtures.dbMonitor,
            items: [
              { id: 'mysql', label: 'MySQL', meta: 'legacy-app-mysql-yml', status: <span>LEGACY_HIDDEN_STATUS</span>, icon: <span>db</span> },
              { id: 'postgresql', label: 'PostgreSQL', meta: 'legacy-app-postgresql-yml', status: <span>LEGACY_SHOWN_STATUS</span> },
              { id: 'oracle', label: 'Oracle', meta: 'app-oracle.yml' },
              { id: 'redis', label: 'Redis', meta: 'app-redis.yml' },
              { id: 'mongodb', label: 'MongoDB', meta: 'app-mongodb.yml' }
            ]
          }
        ]}
        search=""
        onSearchChange={vi.fn()}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        labels={{
          close: localizedFixtures.close,
          catalogTitle: localizedFixtures.catalogTitle,
          templatePicker: {
            itemCount: localizedItemCount,
            searchPlaceholder: localizedFixtures.searchVisibleName,
            empty: localizedFixtures.noMatches
          }
        }}
      />
    );

    expect(html).toContain('data-hz-type-picker-layout="legacy-angular-grid"');
    expect(html).toContain('data-hz-template-grid-columns="5"');
    expect(html).toContain('data-hz-template-item="mysql"');
    expect(html).not.toContain('data-hz-template-item-icon');
    expect(html).not.toContain('legacy-app-mysql-yml');
    expect(html).not.toContain('LEGACY_HIDDEN_STATUS');
    expect(html).not.toContain('LEGACY_SHOWN_STATUS');
  });

  it('renders the legacy Angular monitor export type chooser as a shared dialog', () => {
    const html = renderToStaticMarkup(
      <HzExportTypeDialog
        open
        title={localizedFixtures.chooseExportType}
        scope="selected"
        selectedCount={2}
        jsonDescription="Export selected monitors as JSON"
        excelDescription="Export selected monitors as EXCEL"
        onClose={vi.fn()}
        onSelect={vi.fn()}
        jsonButtonProps={{ 'data-monitor-export-type-option-owner': 'hertzbeat-ui-export-type-dialog' } as React.ButtonHTMLAttributes<HTMLButtonElement>}
        excelButtonProps={{ 'data-monitor-export-type-option-owner': 'hertzbeat-ui-export-type-dialog' } as React.ButtonHTMLAttributes<HTMLButtonElement>}
      />
    );

    expect(html).toContain('data-hz-ui="export-type-dialog"');
    expect(html).toContain('data-hz-export-scope="selected"');
    expect(html).toContain('data-hz-export-selected-count="2"');
    expect(html).toContain('data-hz-export-type-options="json-excel"');
    expect(html).toContain('data-hz-export-type-option="JSON"');
    expect(html).toContain('data-hz-export-type-option="EXCEL"');
    expect(html).toContain('data-monitor-export-type-option-owner="hertzbeat-ui-export-type-dialog"');
  });

  it('does not render template descriptions in YML template lists because custom templates cannot promise curated copy', () => {
    const html = renderToStaticMarkup(
      <HzTemplatePicker
        categories={categories}
        selectedId="mysql"
        search=""
        onSearchChange={vi.fn()}
      />
    );

    expect(html).toContain('data-hz-ui="template-picker"');
    expect(html).toContain('data-hz-template-filter-contract="angular-monitor-select-list-label-only"');
    expect(html).toContain('data-hz-template-filter-owner="hertzbeat-ui-template-picker"');
    expect(html).toContain('data-hz-template-filter-match="label"');
    expect(html).toContain('data-hz-template-filter-state="all-groups"');
    expect(html).toContain('MySQL');
    expect(html).toContain('yml');
    expect(html).not.toContain('JDBC + availability');
    expect(html).not.toContain('JDBC + connections');
    expect(html).not.toContain('SSH + process');
  });

  it('filters YML template lists by visible label only like Angular monitor-select-list', () => {
    const html = renderToStaticMarkup(
      <HzTemplatePicker
        categories={categories}
        selectedId="postgresql"
        search="db"
        onSearchChange={vi.fn()}
        labels={{
          empty: 'No matched labels'
        }}
      />
    );

    expect(html).toContain('data-hz-template-filter-contract="angular-monitor-select-list-label-only"');
    expect(html).toContain('data-hz-template-filter-owner="hertzbeat-ui-template-picker"');
    expect(html).toContain('data-hz-template-filter-match="label"');
    expect(html).toContain('data-hz-template-filter-state="matched-groups"');
    expect(html).toContain('data-hz-template-empty-state="angular-no-matched-children"');
    expect(html).toContain('No matched labels');
    expect(html).not.toContain('data-hz-template-item="postgresql"');
    expect(html).not.toContain('PostgreSQL');
    expect(html).not.toContain(localizedFixtures.dbMonitor);
  });

  it('renders Angular monitor-select-list loading through the shared template picker', () => {
    const html = renderToStaticMarkup(
      <HzTemplatePicker
        categories={categories}
        selectedId="mysql"
        search=""
        onSearchChange={vi.fn()}
        loading
        labels={{
          loading: 'Loading menu'
        }}
      />
    );

    expect(html).toContain('data-hz-ui="template-picker"');
    expect(html).toContain('data-hz-template-loading="true"');
    expect(html).toContain('data-hz-template-loading-owner="hertzbeat-ui-template-picker"');
    expect(html).toContain('data-hz-template-loading-state="angular-monitor-select-list-loading"');
    expect(html).toContain('data-hz-template-loading-state-owner="hertzbeat-ui-template-picker"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Loading menu');
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('data-hz-template-item="mysql"');
  });

  it('can hide template picker counts for dense editor workspaces', () => {
    const html = renderToStaticMarkup(
      <HzTemplatePicker
        categories={categories}
        selectedId="mysql"
        search=""
        onSearchChange={vi.fn()}
        labels={{
          itemCount: localizedItemCount,
          showCounts: false
        }}
      />
    );

    expect(html).toContain('data-hz-ui="template-picker"');
    expect(html).not.toContain('data-hz-template-total-count="visible"');
    expect(html).not.toContain('data-hz-template-category-count="visible"');
    expect(html).not.toContain(localizedItemCount(3));
  });

  it('renders the YML workspace as a split editor surface', () => {
    const html = renderToStaticMarkup(
      <HzYamlWorkspace
        categories={categories}
        selectedId="mysql"
        search=""
        onSearchChange={vi.fn()}
        title="MySQL"
        filename="app-mysql.yml"
        code={'app: mysql\nmetrics:\n  - name: availability'}
        actions={<HzButton intent="primary">Apply</HzButton>}
      />
    );

    expect(html).toContain('data-hz-ui="yaml-workspace"');
    expect(html).toContain('data-hz-ui="yaml-editor"');
    expect(html).toContain('data-hz-ui="yaml-editor-shell"');
    expect(html).toContain('data-hz-ui="yaml-line-gutter"');
    expect(html).toContain('data-hz-ui="yaml-editor-overlay"');
    expect(html).toContain('data-hz-ui="yaml-editor-status"');
    expect(html).toContain('data-hz-yaml-editor-lines="3"');
    expect(html).toContain('data-hz-yaml-line="1"');
    expect(html).toContain('data-hz-yaml-line="3"');
    expect(html).toContain('data-hz-yaml-token="key"');
    expect(html).toContain('data-hz-yaml-token="value"');
    expect(html).toContain('data-hz-yaml-indent="2"');
    expect(html).toContain('3 lines');
    expect(html).toContain('app-mysql.yml');
    expect(html).toContain('YML definitions');
  });

  it('supports a rail YML workspace layout for narrow side panels', () => {
    const html = renderToStaticMarkup(
      <HzYamlWorkspace
        layout="rail"
        categories={categories}
        selectedId="mysql"
        search=""
        onSearchChange={vi.fn()}
        title="MySQL"
        filename="app-mysql.yml"
        code={'app: mysql\nmetrics:\n  - name: availability'}
      />
    );

    expect(html).toContain('data-hz-yaml-layout="rail"');
    expect(html).toContain('data-hz-ui="yaml-editor-shell"');
    expect(html).toContain('data-hz-yaml-editor-lines="3"');
    expect(html).toContain('grid-rows-[minmax(180px,260px)_minmax(320px,1fr)]');
    expect(html).toContain('max-h-none');
    expect(html).toContain('min-h-0');
    expect(html).toContain('flex-1');
    expect(html).not.toContain('lg:grid-cols-[320px_minmax(0,1fr)]');
  });

  it('lets real YML workspaces localize the embedded template picker chrome', () => {
    const html = renderToStaticMarkup(
      <HzYamlWorkspace
        categories={[]}
        selectedId={undefined}
        search="linux"
        onSearchChange={vi.fn()}
        title={localizedFixtures.newTemplateDraft}
        filename="app-custom.yml"
        code="app: custom"
        templatePickerLabels={{
          defaultTitle: localizedFixtures.definition,
          itemCount: localizedItemCount,
          searchPlaceholder: localizedFixtures.search,
          empty: localizedFixtures.noTemplateMatches
        }}
      />
    );

    expect(html).toContain('data-hz-ui="yaml-workspace"');
    expect(html).toContain(localizedFixtures.definition);
    expect(html).toContain(localizedItemCount(0));
    expect(html).toContain(`placeholder="${localizedFixtures.search}"`);
    expect(html).toContain(localizedFixtures.noTemplateMatches);
    expect(html).not.toContain('YML definitions');
    expect(html).not.toContain('No matches');
    expect(html).not.toContain('Search visible names');
  });

  it('can host an external code editor runtime for real YAML editing', () => {
    const html = renderToStaticMarkup(
      <HzYamlWorkspace
        categories={categories}
        selectedId="mysql"
        search=""
        onSearchChange={vi.fn()}
        title="MySQL"
        filename="app-mysql.yml"
        code={'app: mysql\nmetrics:\n  - name: availability'}
        editor={
          <div data-hz-code-editor="codemirror" data-hz-code-editor-language="yaml" data-hz-ui="yaml-editor">
            app: mysql
          </div>
        }
      />
    );

    expect(html).toContain('data-hz-ui="yaml-editor-shell"');
    expect(html).toContain('data-hz-yaml-editor-runtime="external"');
    expect(html).toContain('data-hz-code-editor="codemirror"');
    expect(html).toContain('data-hz-code-editor-language="yaml"');
    expect(html).toContain('data-hz-ui="yaml-editor"');
  });

  it('renders the explorer frame with quick filters, query bar, metrics, and dense content', () => {
    const html = renderToStaticMarkup(
      <HzExplorerFrame
        title="Explorer"
        tabs={<span>List view</span>}
        filterRail={
          <HzFilterRail
            groups={[
              {
                id: 'status',
                label: 'Status',
                options: [
                  { id: 'up', label: 'Available', count: 10, active: true },
                  { id: 'down', label: 'Down', count: 2 }
                ]
              }
            ]}
          />
        }
        queryBar={<HzQueryBar query="status != down" />}
        metricStrip={<HzMetricStrip items={[{ label: 'Active', value: '10', hint: '+2' }]} />}
      >
        <div>Dense rows</div>
      </HzExplorerFrame>
    );

    expect(html).toContain('data-hz-ui="explorer-frame"');
    expect(html).toContain('data-hz-density="operator-compact"');
    expect(html).toContain('data-hz-viewport-guard="single-column-first"');
    expect(html).toContain('data-hz-ui="skip-link"');
    expect(html).toContain('Skip to workbench');
    expect(html).toContain('href="#hz-ui-main"');
    expect(html).toContain('id="hz-ui-main"');
    expect(html).toContain('aria-label="Explorer workbench"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('data-hz-layout-region="filter-rail"');
    expect(html).toContain('aria-label="Workbench filters"');
    expect(html).toContain('overflow-hidden');
    expect(html).toContain('data-hz-ui="filter-rail"');
    expect(html).toContain('data-hz-ui="query-bar"');
    expect(html).toContain('data-hz-ui="metric-strip"');
    expect(html).not.toContain('rounded-[16px]');
    expect(html).not.toContain('rounded-[14px]');
    expect(html).not.toContain('rounded-[12px]');
  });

  it('lets product surfaces localize the explorer frame skip link', () => {
    const html = renderToStaticMarkup(
      <HzExplorerFrame title="Explorer" skipLinkLabel="Zum Arbeitsbereich">
        <div>Dense rows</div>
      </HzExplorerFrame>
    );

    expect(html).toContain('data-hz-ui="skip-link"');
    expect(html).toContain('Zum Arbeitsbereich');
    expect(html).not.toContain('Skip to workbench');
  });

  it('lets product surfaces localize the query bar label without changing the compact chrome', () => {
    const html = renderToStaticMarkup(<HzQueryBar query="service.name=checkout" queryLabel="Localized filter" />);

    expect(html).toContain('data-hz-ui="query-bar"');
    expect(html).toContain('Localized filter');
    expect(html).not.toContain('Filter');
    expect(html).toContain('grid-cols-[78px_minmax(0,1fr)]');
  });
});
