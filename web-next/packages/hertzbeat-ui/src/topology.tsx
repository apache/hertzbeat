'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const controlFocusClassName =
  'focus-visible:border-[var(--hz-ui-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hz-ui-active-soft)]';

export type HzStatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'critical';

const chartToneColor: Record<HzStatusTone, { stroke: string; fill: string; soft: string }> = {
  neutral: { stroke: '#8f99ab', fill: 'rgba(143,153,171,0.16)', soft: 'rgba(143,153,171,0.28)' },
  info: { stroke: '#6aa6ff', fill: 'rgba(69,124,255,0.18)', soft: 'rgba(69,124,255,0.28)' },
  success: { stroke: '#45c16f', fill: 'rgba(38,171,94,0.18)', soft: 'rgba(38,171,94,0.28)' },
  warning: { stroke: '#f6b547', fill: 'rgba(245,158,11,0.18)', soft: 'rgba(245,158,11,0.28)' },
  critical: { stroke: '#ff6b7d', fill: 'rgba(239,68,68,0.2)', soft: 'rgba(239,68,68,0.3)' }
};

type HzButtonIntent = 'secondary' | 'primary' | 'ghost' | 'danger';
type HzButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

const buttonIntentClassName: Record<HzButtonIntent, string> = {
  secondary: 'border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-control)] text-[#d6d9e2] hover:bg-[var(--hz-ui-control-hover)]',
  primary: 'border-transparent bg-[var(--hz-ui-accent)] text-white hover:bg-[var(--hz-ui-accent-strong)]',
  ghost: 'border-transparent bg-transparent text-[#aab4c4] hover:bg-[var(--hz-ui-control-hover)] hover:text-[#f3f6fb]',
  danger: 'border-transparent bg-[var(--hz-ui-action-danger)] text-[#ffe3e8] hover:bg-[var(--hz-ui-action-danger-hover)] hover:text-white'
};

const buttonSizeClassName: Record<HzButtonSize, string> = {
  xs: 'h-6 min-w-0 px-1.5 text-[10px]',
  sm: 'h-7 min-w-0 px-2 text-[11px]',
  md: 'h-8 min-w-0 px-3 text-[12px]',
  lg: 'h-10 min-w-0 px-4 text-[13px]',
  icon: 'h-7 w-7 min-w-0 px-0 text-[12px]'
};

const buttonSizeHeight: Record<HzButtonSize, string> = {
  xs: '24',
  sm: '28',
  md: '32',
  lg: '40',
  icon: '28'
};

type HzButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  intent?: HzButtonIntent;
  layout?: 'default' | 'full';
  size?: HzButtonSize;
};

const HzButton = React.forwardRef<HTMLButtonElement, HzButtonProps>(
  ({ className, intent = 'secondary', layout = 'default', size = 'sm', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[3px] border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45',
        controlFocusClassName,
        buttonIntentClassName[intent],
        buttonSizeClassName[size],
        layout === 'full' ? 'w-full px-2' : null,
        className
      )}
      data-hz-ui="button"
      data-hz-control-height={buttonSizeHeight[size]}
      {...props}
    />
  )
);
HzButton.displayName = 'HzButton';

type HzButtonLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  component?: React.ElementType<any>;
  intent?: HzButtonIntent;
  layout?: 'default' | 'full';
  size?: Exclude<HzButtonSize, 'icon'>;
};

const HzButtonLink = React.forwardRef<HTMLAnchorElement, HzButtonLinkProps>(
  ({ className, component: Component = 'a', intent = 'secondary', layout = 'default', size = 'sm', children, ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[3px] border font-semibold transition-colors aria-disabled:pointer-events-none aria-disabled:opacity-45',
        controlFocusClassName,
        buttonIntentClassName[intent],
        buttonSizeClassName[size],
        layout === 'full' ? 'w-full px-2' : null,
        className
      )}
      data-hz-ui="button-link"
      data-hz-control-height={buttonSizeHeight[size]}
      {...props}
    >
      {children}
    </Component>
  )
);
HzButtonLink.displayName = 'HzButtonLink';

type HzInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const HzInput = React.forwardRef<HTMLInputElement, HzInputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-8 w-full min-w-0 rounded-[3px] border border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-control)] px-3 text-[12px] font-semibold text-[#eef2f7] outline-none placeholder:text-[#6f7788]',
      'shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition-colors',
      controlFocusClassName,
      className
    )}
    data-hz-ui="input"
    data-hz-control-height="32"
    data-hz-control-edge="lined"
    {...props}
  />
));
HzInput.displayName = 'HzInput';

type HzSelectOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

type HzSelectProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onChange' | 'defaultValue'> & {
  options: HzSelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  triggerClassName?: string;
};

const HzSelect = React.forwardRef<HTMLDivElement, HzSelectProps>(
  ({ className, triggerClassName, options, value, defaultValue, placeholder, onChange, ...props }, ref) => (
    <div ref={ref} className={cn('relative min-w-0', className)} data-hz-ui="select" {...props}>
      <select
        value={value}
        defaultValue={defaultValue}
        aria-label={props['aria-label']}
        onChange={onChange}
        className={cn(
          'h-8 w-full min-w-0 appearance-none rounded-[3px] border border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-control)] px-3 pr-7 text-[12px] font-semibold text-[#eef2f7] outline-none transition-colors',
          controlFocusClassName,
          triggerClassName
        )}
        data-hz-select-trigger="native-topology"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map(option => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#8f99ab]" aria-hidden="true" />
    </div>
  )
);
HzSelect.displayName = 'HzSelect';

export type HzTopologyMetricRow = {
  id: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  source: React.ReactNode;
  target: React.ReactNode;
  relationType: React.ReactNode;
  sourceKind?: React.ReactNode;
  requestRatePerSecond?: number;
  requestCount?: number;
  errorRate?: number;
  errorCount?: number;
  latencyP95Ms?: number;
  latencyAvgMs?: number;
  evidenceBadges?: React.ReactNode[];
  tone?: HzStatusTone;
};

export type HzTopologyNodeTone = 'success' | 'warning' | 'danger';
export type HzTopologyNodeFocus = 'normal' | 'active' | 'related' | 'dimmed';

export type HzTopologyNodePosition = {
  x: number;
  y: number;
  size: number | string;
};

export type HzTopologyNodeRedMetrics = {
  requestRatePerSecond?: number;
  errorRate?: number;
  latencyP95Ms?: number;
};

export type HzTopologyEdgeTone = 'green' | 'blue' | 'orange' | 'purple' | 'red';
export type HzTopologyEdgeFocus = 'normal' | 'active-path' | 'context-muted';

export type HzTopologyEdgePoint = {
  x: number;
  y: number;
};

export type HzTopologyEdgeRedMetrics = {
  requestRatePerSecond?: number;
  errorRate?: number;
  latencyP95Ms?: number;
};

type HzTopologyEdgeBaseProps = {
  id: string;
  tone?: HzTopologyEdgeTone;
  focus?: HzTopologyEdgeFocus;
  selected?: boolean;
  from: HzTopologyEdgePoint;
  to: HzTopologyEdgePoint;
  relationshipType?: string;
  source?: string;
  evidenceBadges?: string[];
  redMetrics?: HzTopologyEdgeRedMetrics;
};

export type HzTopologyEdgeLineProps = Omit<React.SVGProps<SVGLineElement>, 'id' | 'from' | 'to'> &
  HzTopologyEdgeBaseProps & {
    variant: 'line';
  };

export type HzTopologyEdgeDrilldownProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'id'> &
  HzTopologyEdgeBaseProps & {
    variant: 'drilldown';
  };

export type HzTopologyEdgeProps = HzTopologyEdgeLineProps | HzTopologyEdgeDrilldownProps;

export type HzTopologyLegendItem = {
  id: string;
  label: React.ReactNode;
  value?: React.ReactNode;
  tone?: HzStatusTone;
  pattern?: 'solid' | 'dashed' | 'muted';
  color?: string;
  fill?: string;
  visualSource?: 'hertzbeat-status-token' | 'hertzbeat-interaction-token' | 'hertzbeat-edge-token' | 'lucide-react';
  iconSrc?: string;
  iconAlt?: string;
  iconLibrary?: 'lucide-react';
  iconName?: string;
  iconSource?: 'entity-type-catalog';
};

export type HzTopologyLegendSection = {
  id: string;
  label: React.ReactNode;
  items: HzTopologyLegendItem[];
};

export type HzTopologyLegendBoundary = 'default' | 'framed' | 'flush';

export type HzTopologyLegendDensity = 'default' | 'canvas-dock';

export type HzTopologyLegendProps = React.HTMLAttributes<HTMLElement> & {
  title: React.ReactNode;
  sections: HzTopologyLegendSection[];
  summaryLabel?: React.ReactNode;
  boundary?: HzTopologyLegendBoundary;
  density?: HzTopologyLegendDensity;
};

const topologyLegendBoundaryClassName: Record<HzTopologyLegendBoundary, string> = {
  default: 'border-y border-[var(--hz-ui-line-soft)]',
  framed: 'border border-[var(--hz-ui-line-soft)]',
  flush: 'border-y border-[var(--hz-ui-line-soft)] border-x-0'
};

const topologyLegendVisualSourceLabel: Record<NonNullable<HzTopologyLegendItem['visualSource']>, string> = {
  'hertzbeat-status-token': 'status token',
  'hertzbeat-interaction-token': 'interaction token',
  'hertzbeat-edge-token': 'edge token',
  'lucide-react': 'lucide-react'
};

export type HzTopologyHoverTooltipKind = 'node' | 'edge';
export type HzTopologyHoverTooltipVisibility = 'preview' | 'hover';
export type HzTopologyHoverTooltipTrigger = 'preview' | 'live-edge-hover';
export type HzTopologyHoverTooltipPlacement = 'inline' | 'canvas-top-right' | 'canvas-right-under-toolbar' | 'canvas-anchor';
export type HzTopologyHoverTooltipSize = 'auto' | 'compact' | 'standard';
export type HzTopologyHoverTooltipAnchor = {
  x: number;
  y: number;
  source?: 'g6-pointer' | 'fallback';
};

export type HzTopologyHoverTooltipFact = Omit<React.HTMLAttributes<HTMLDivElement>, 'id'> & {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  meta?: React.ReactNode;
};

export type HzTopologyHoverTooltipMetric = {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: HzStatusTone;
};

export type HzTopologyHoverTooltipProps = React.HTMLAttributes<HTMLElement> & {
  kind: HzTopologyHoverTooltipKind;
  title: React.ReactNode;
  summary?: React.ReactNode;
  facts?: HzTopologyHoverTooltipFact[];
  metrics?: HzTopologyHoverTooltipMetric[];
  evidenceBadges?: string[];
  visibility?: HzTopologyHoverTooltipVisibility;
  trigger?: HzTopologyHoverTooltipTrigger;
  placement?: HzTopologyHoverTooltipPlacement;
  size?: HzTopologyHoverTooltipSize;
  anchor?: HzTopologyHoverTooltipAnchor;
};

export type HzTopologyDetailDrawerFact = {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  meta?: React.ReactNode;
  tone?: HzStatusTone;
  factProps?: React.HTMLAttributes<HTMLDivElement>;
};

export type HzTopologyDetailDrawerAction = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & {
  id: string;
  label: React.ReactNode;
  emphasis?: 'primary' | 'neutral';
  copy?: React.ReactNode;
  copyProps?: React.HTMLAttributes<HTMLSpanElement>;
};

export type HzTopologyDetailDrawerSurface = 'default' | 'framed' | 'flush';
export type HzTopologyDetailDrawerDensity = 'compact' | 'graph-first';

export type HzTopologyDetailDrawerProps = React.HTMLAttributes<HTMLElement> & {
  kind: 'node' | 'edge';
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  boundary?: React.ReactNode;
  boundaryProps?: React.HTMLAttributes<HTMLDivElement>;
  surface?: HzTopologyDetailDrawerSurface;
  density?: HzTopologyDetailDrawerDensity;
  facts?: HzTopologyDetailDrawerFact[];
  actions?: HzTopologyDetailDrawerAction[];
  signalActions?: HzTopologyDetailDrawerAction[];
  signalActionsLabel?: React.ReactNode;
  subjectId?: string;
  sourceId?: string;
  targetId?: string;
  relationType?: string;
  sourceKind?: string;
  entityType?: string;
};

export type HzTopologyEvidenceListKind = 'fault-context' | 'impact-timeline' | 'evidence';

export type HzTopologyEvidenceListItem = Omit<React.HTMLAttributes<HTMLDivElement>, 'id'> & {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  meta?: React.ReactNode;
  tone?: HzStatusTone;
};

export type HzTopologyEvidenceListProps = React.HTMLAttributes<HTMLElement> & {
  kind?: HzTopologyEvidenceListKind;
  title: React.ReactNode;
  copy?: React.ReactNode;
  items: HzTopologyEvidenceListItem[];
  boundary?: HzTopologyEvidenceListBoundary;
};

export type HzTopologyEvidenceListBoundary = 'default' | 'flush' | 'toolbar-context' | 'companion-timeline';

const topologyEvidenceListBoundaryClassName: Record<HzTopologyEvidenceListBoundary, string> = {
  default: 'border-y border-[var(--hz-ui-line-soft)]',
  flush: 'border-y border-[var(--hz-ui-line-soft)] border-x-0',
  'toolbar-context': 'border-b border-[var(--hz-ui-line-soft)] border-x-0 border-t-0 px-4 py-3',
  'companion-timeline': 'border border-[var(--hz-ui-line-soft)]'
};

export type HzTopologyFilterStripVariant = 'source-grid' | 'source-rail' | 'view-list';
export type HzTopologyFilterStripBoundary = 'none' | 'section';
export type HzTopologyFilterStripCopyVisibility = 'visible' | 'assistive';

const topologyFilterStripBoundaryClassName: Record<HzTopologyFilterStripBoundary, string> = {
  none: '',
  section: 'border-t border-[var(--hz-ui-line-soft)] px-3 py-2'
};

export type HzTopologyFilterStripItem = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'id'> & {
  id: string;
  label: React.ReactNode;
  copy?: React.ReactNode;
  active?: boolean;
};

export type HzTopologyFilterStripProps = React.HTMLAttributes<HTMLElement> & {
  variant?: HzTopologyFilterStripVariant;
  boundary?: HzTopologyFilterStripBoundary;
  copyVisibility?: HzTopologyFilterStripCopyVisibility;
  items: HzTopologyFilterStripItem[];
};

export type HzTopologyActionLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'id'> & {
  id: string;
  label: React.ReactNode;
  copy?: React.ReactNode;
  emphasis?: 'primary' | 'neutral';
  spacing?: HzTopologyActionLinkSpacing;
};

export type HzTopologyActionLinkSpacing = 'none' | 'inset';

const topologyActionLinkSpacingClassName: Record<HzTopologyActionLinkSpacing, string> = {
  none: '',
  inset: 'mx-3 my-2'
};

export type HzTopologyFocusTrailCrumb = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'id'> & {
  id: string;
  label: React.ReactNode;
  value?: React.ReactNode;
  active?: boolean;
};

export type HzTopologyFocusTrailFilter = Omit<React.HTMLAttributes<HTMLSpanElement>, 'children' | 'id'> & {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
};

export type HzTopologyFocusTrailAction = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & {
  label: React.ReactNode;
};

export type HzTopologyFocusTrailBoundary = 'none' | 'section';
export type HzTopologyFocusTrailDensity = 'compact' | 'rail' | 'graph-dock';
export type HzTopologyFocusTrailMode = 'overview' | 'focused';

const topologyFocusTrailBoundaryClassName: Record<HzTopologyFocusTrailBoundary, string> = {
  none: '',
  section: 'border-t border-[var(--hz-ui-line-soft)] px-3 py-2'
};

export type HzTopologyFocusTrailProps = React.HTMLAttributes<HTMLElement> & {
  label: React.ReactNode;
  crumbs: HzTopologyFocusTrailCrumb[];
  filters?: HzTopologyFocusTrailFilter[];
  hiddenCountLabel?: React.ReactNode;
  hiddenCountProps?: React.HTMLAttributes<HTMLSpanElement>;
  exitAction?: HzTopologyFocusTrailAction;
  boundary?: HzTopologyFocusTrailBoundary;
  density?: HzTopologyFocusTrailDensity;
  focusMode?: HzTopologyFocusTrailMode;
  focusDepth?: string | number;
  focusEntityId?: string;
};

export type HzTopologyGroupPanelTone = HzStatusTone | 'danger';
export type HzTopologyGroupPanelBoundary = 'default' | 'framed' | 'flush' | 'section';

export type HzTopologyGroupPanelItem = Omit<React.HTMLAttributes<HTMLDivElement>, 'id'> & {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  count: number;
  collapsedCount?: number;
  collapsedLabel?: React.ReactNode;
  worstTone?: HzTopologyGroupPanelTone;
  active?: boolean;
  meta?: React.ReactNode;
};

export type HzTopologyGroupPanelAction = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'id'> & {
  id: string;
  label: React.ReactNode;
};

export type HzTopologyGroupPanelProps = React.HTMLAttributes<HTMLElement> & {
  title: React.ReactNode;
  copy?: React.ReactNode;
  groupByLabel: React.ReactNode;
  items: HzTopologyGroupPanelItem[];
  actions?: HzTopologyGroupPanelAction[];
  boundary?: HzTopologyGroupPanelBoundary;
};

const topologyGroupPanelBoundaryClassName: Record<HzTopologyGroupPanelBoundary, string> = {
  default: 'border-y border-[var(--hz-ui-line-soft)]',
  framed: 'border border-[var(--hz-ui-line-soft)]',
  flush: 'border-y border-[var(--hz-ui-line-soft)] border-x-0',
  section: 'border-t border-[var(--hz-ui-line-soft)] px-3 py-2'
};

const topologyGroupPanelToneClassName: Record<HzTopologyGroupPanelTone, string> = {
  neutral: 'border-[#323744] bg-[#181b22] text-[#cbd3df]',
  info: 'border-[#244069] bg-[#101d30] text-[#9ec4ff]',
  success: 'border-[#254634] bg-[#11251b] text-[#9de0b3]',
  warning: 'border-[#5f4a24] bg-[#251c10] text-[#f3c46d]',
  critical: 'border-[#61323a] bg-[#2a1318] text-[#ff9aa9]',
  danger: 'border-[#61323a] bg-[#2a1318] text-[#ff9aa9]'
};

export type HzTopologyPathSummaryEndpoint = {
  label: React.ReactNode;
  value: React.ReactNode;
  meta?: React.ReactNode;
};

export type HzTopologyPathSummaryMetric = {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: HzStatusTone;
};

export type HzTopologyPathSummaryAction = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'id'> & {
  id: string;
  label: React.ReactNode;
};

export type HzTopologyPathSummaryBoundary = 'none' | 'section' | 'framed' | 'flush';
export type HzTopologyPathSummaryInteractionState = 'preview' | 'hovered' | 'selected';

export type HzTopologyPathSummaryProps = React.HTMLAttributes<HTMLElement> & {
  title: React.ReactNode;
  source: HzTopologyPathSummaryEndpoint;
  target: HzTopologyPathSummaryEndpoint;
  relation?: HzTopologyPathSummaryEndpoint;
  directionLabel?: React.ReactNode;
  metrics?: HzTopologyPathSummaryMetric[];
  evidenceBadges?: string[];
  actions?: HzTopologyPathSummaryAction[];
  boundary?: HzTopologyPathSummaryBoundary;
  interactionState?: HzTopologyPathSummaryInteractionState;
  selectedEdgeId?: string;
  hoveredEdgeId?: string;
  sourceId?: string;
  targetId?: string;
  relationType?: string;
  sourceKind?: string;
};

const topologyPathSummaryBoundaryClassName: Record<HzTopologyPathSummaryBoundary, string> = {
  none: '',
  section: 'border-t border-[var(--hz-ui-line-soft)] px-3 py-2',
  framed: 'border border-[var(--hz-ui-line-soft)]',
  flush: 'border-y border-[var(--hz-ui-line-soft)] border-x-0'
};

const topologyPathSummaryMetricClassName: Record<HzStatusTone, string> = {
  neutral: 'border-[#303542] bg-[#151821] text-[#d6d9e2]',
  info: 'border-[#244069] bg-[#101d30] text-[#9ec4ff]',
  success: 'border-[#254634] bg-[#11251b] text-[#9de0b3]',
  warning: 'border-[#5f4a24] bg-[#251c10] text-[#f3c46d]',
  critical: 'border-[#61323a] bg-[#2a1318] text-[#ff9aa9]'
};

export type HzTopologyScopeBarItem = React.HTMLAttributes<HTMLSpanElement> & {
  id: string;
  label?: React.ReactNode;
  value: React.ReactNode;
};

export type HzTopologyScopeBarAction = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  id: string;
  label: React.ReactNode;
  emphasis?: 'primary' | 'neutral';
};

export type HzTopologyScopeBarBoundary = 'none' | 'section';

const topologyScopeBarBoundaryClassName: Record<HzTopologyScopeBarBoundary, string> = {
  none: '',
  section: 'border-t border-[var(--hz-ui-line-soft)] px-3'
};

export type HzTopologyScopeBarProps = React.HTMLAttributes<HTMLElement> & {
  items: HzTopologyScopeBarItem[];
  actions?: HzTopologyScopeBarAction[];
  boundary?: HzTopologyScopeBarBoundary;
  summaryVisibility?: 'visible' | 'assistive';
  summaryDedupedBy?: string;
};

export type HzTopologyNodeProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & {
  label: React.ReactNode;
  healthLabel?: React.ReactNode;
  healthCopy?: string;
  entityType?: string;
  source?: string;
  health?: string;
  tone?: HzTopologyNodeTone;
  focus?: HzTopologyNodeFocus;
  evidenceBadges?: string[];
  redMetrics?: HzTopologyNodeRedMetrics;
  position?: HzTopologyNodePosition;
  healthMetaProps?: React.HTMLAttributes<HTMLSpanElement>;
};

const topologyNodeToneClassName: Record<HzTopologyNodeTone, string> = {
  success: 'border-[#365a45] bg-[#122017] text-[#d9f7df]',
  warning: 'border-[#786032] bg-[#221b0d] text-[#f6e4b0]',
  danger: 'border-[#80464f] bg-[#241115] text-[#ffd6dc]'
};

const topologyNodeFocusClassName: Record<HzTopologyNodeFocus, string> = {
  normal: '',
  active: 'z-20 ring-2 ring-[#4e74f8] ring-offset-2 ring-offset-[#08090c]',
  related: 'z-10 shadow-[0_18px_54px_rgba(78,116,248,0.22)]',
  dimmed: 'opacity-45'
};

const topologyEdgeToneColor: Record<HzTopologyEdgeTone, string> = {
  green: '#2fa84f',
  blue: '#2f8ed8',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  red: '#ef4444'
};

function formatTopologyNodeMetricAttribute(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : undefined;
}

function topologyEvidenceBadgesAttribute(evidenceBadges: string[] | undefined) {
  return evidenceBadges && evidenceBadges.length > 0 ? evidenceBadges.join(' ') : 'none';
}

function formatTopologyEdgeMetricAttribute(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : undefined;
}

function topologyEdgeCommonAttributes({
  id,
  variant,
  tone,
  focus,
  selected,
  relationshipType,
  source,
  evidenceBadges,
  redMetrics
}: HzTopologyEdgeBaseProps & { variant: HzTopologyEdgeProps['variant']; tone: HzTopologyEdgeTone; focus: HzTopologyEdgeFocus }) {
  return {
    'data-hz-ui': 'topology-edge',
    'data-hz-topology-primitive': 'edge',
    'data-hz-topology-edge-owner': 'hertzbeat-ui-edge',
    'data-hz-topology-edge-id': id,
    'data-hz-topology-edge-variant': variant,
    'data-hz-topology-edge-tone': tone,
    'data-hz-topology-edge-focus': focus,
    'data-hz-topology-edge-selected': selected ? 'true' : 'false',
    'data-hz-topology-edge-relationship-type': relationshipType,
    'data-hz-topology-edge-source': source,
    'data-hz-topology-edge-evidence-badges': topologyEvidenceBadgesAttribute(evidenceBadges),
    'data-hz-topology-edge-badge-owner': 'hertzbeat-ui-edge-badge',
    'data-hz-topology-edge-red-owner': 'hertzbeat-ui-edge-red',
    'data-hz-topology-edge-request-rate': formatTopologyEdgeMetricAttribute(redMetrics?.requestRatePerSecond),
    'data-hz-topology-edge-error-rate': formatTopologyEdgeMetricAttribute(redMetrics?.errorRate),
    'data-hz-topology-edge-latency-p95-ms': formatTopologyEdgeMetricAttribute(redMetrics?.latencyP95Ms)
  };
}

export function HzTopologyEdge({
  id,
  variant,
  tone = 'blue',
  focus = 'normal',
  selected = false,
  from,
  to,
  relationshipType,
  source,
  evidenceBadges = [],
  redMetrics,
  ...props
}: HzTopologyEdgeProps) {
  const color = topologyEdgeToneColor[tone];
  const commonAttributes = topologyEdgeCommonAttributes({
    id,
    variant,
    tone,
    focus,
    selected,
    from,
    to,
    relationshipType,
    source,
    evidenceBadges,
    redMetrics
  });

  if (variant === 'line') {
    const { className, ...lineProps } = props as Omit<HzTopologyEdgeLineProps, keyof HzTopologyEdgeBaseProps | 'variant'>;
    return (
      <line
        {...lineProps}
        {...commonAttributes}
        className={className}
        data-hz-topology-edge-line-owner="hertzbeat-ui-edge-line"
        data-hz-topology-edge-path-owner="hertzbeat-ui-edge-path"
        data-hz-topology-edge-arrow-owner="hertzbeat-ui-edge-arrow"
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={color}
        strokeWidth="0.25"
        strokeLinecap="round"
        opacity={focus === 'context-muted' ? '0.32' : '0.92'}
      />
    );
  }

  const { className, style, ...anchorProps } = props as Omit<HzTopologyEdgeDrilldownProps, keyof HzTopologyEdgeBaseProps | 'variant'>;
  return (
    <a
      {...anchorProps}
      {...commonAttributes}
      className={cn(
        'absolute h-2 w-2 rounded-[2px] border',
        selected ? 'border-[#c8d5ff] shadow-[0_0_0_4px_rgba(78,116,248,0.22)]' : 'border-transparent',
        className
      )}
      data-hz-topology-edge-drilldown-owner="hertzbeat-ui-edge-drilldown"
      data-hz-topology-edge-hit-target-owner="hertzbeat-ui-edge-hit-target"
      style={{
        left: `${(from.x + to.x) / 2}%`,
        top: `${(from.y + to.y) / 2}%`,
        backgroundColor: color,
        transform: 'translate(-50%, -50%)',
        ...style
      }}
    />
  );
}

const topologyHoverTooltipPlacementClassName: Record<HzTopologyHoverTooltipPlacement, string> = {
  inline: '',
  'canvas-top-right': 'absolute right-4 top-4 z-10',
  'canvas-right-under-toolbar': 'absolute right-4 top-[96px] z-10',
  'canvas-anchor': 'absolute z-10'
};

const topologyHoverTooltipSizeClassName: Record<HzTopologyHoverTooltipSize, string> = {
  auto: '',
  compact: 'w-[280px]',
  standard: 'w-[300px]'
};

function topologyHoverTooltipClampSize(size: HzTopologyHoverTooltipSize) {
  if (size === 'standard') return { width: '312px', height: '220px' };
  if (size === 'compact') return { width: '292px', height: '180px' };
  return { width: '300px', height: '200px' };
}

export function HzTopologyHoverTooltip({
  kind,
  title,
  summary,
  facts = [],
  metrics = [],
  evidenceBadges = [],
  visibility = 'preview',
  trigger = 'preview',
  placement = 'inline',
  size = 'auto',
  anchor,
  className,
  style,
  ...props
}: HzTopologyHoverTooltipProps) {
  const anchorClampSize = topologyHoverTooltipClampSize(size);
  const anchorStyle =
    anchor && placement === 'canvas-anchor'
      ? ({
          '--hz-topology-hover-x': `${Math.round(anchor.x)}px`,
          '--hz-topology-hover-y': `${Math.round(anchor.y)}px`,
          '--hz-topology-hover-width': anchorClampSize.width,
          '--hz-topology-hover-height': anchorClampSize.height,
          left: 'clamp(12px,var(--hz-topology-hover-x),calc(100% - var(--hz-topology-hover-width)))',
          top: 'clamp(52px,var(--hz-topology-hover-y),calc(100% - var(--hz-topology-hover-height)))',
          ...style
        } as React.CSSProperties)
      : anchor
        ? ({
            '--hz-topology-hover-x': `${Math.round(anchor.x)}px`,
            '--hz-topology-hover-y': `${Math.round(anchor.y)}px`,
            ...style
          } as React.CSSProperties)
        : style;

  return (
    <section
      {...props}
      role={props.role ?? 'tooltip'}
      style={anchorStyle}
      className={cn(
        'grid min-w-0 gap-2 rounded-[3px] border border-[#252832] bg-[#0d1016]/95 px-3 py-2 text-left shadow-[0_18px_42px_rgba(0,0,0,0.36)]',
        topologyHoverTooltipPlacementClassName[placement],
        topologyHoverTooltipSizeClassName[size],
        visibility === 'hover' ? 'pointer-events-none opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100' : null,
        className
      )}
      data-hz-ui="topology-hover-tooltip"
      data-hz-topology-primitive="hover-tooltip"
      data-hz-topology-hover-kind={kind}
      data-hz-topology-hover-visibility={visibility}
      data-hz-topology-hover-trigger={trigger}
      data-hz-topology-hover-trigger-owner="hertzbeat-ui-hover-trigger"
      data-hz-topology-hover-placement={placement}
      data-hz-topology-hover-size={size}
      data-hz-topology-hover-collision-safe={
        placement === 'canvas-anchor' ? 'cursor-anchor-clamped' : placement === 'canvas-right-under-toolbar' ? 'toolbar' : undefined
      }
      data-hz-topology-hover-offset-owner={placement === 'canvas-right-under-toolbar' ? 'hertzbeat-ui-hover-offset' : undefined}
      data-hz-topology-hover-anchor-owner={anchor ? 'hertzbeat-ui-hover-anchor' : undefined}
      data-hz-topology-hover-anchor-collision-boundary={placement === 'canvas-anchor' ? 'canvas' : undefined}
      data-hz-topology-hover-anchor-source={anchor?.source}
      data-hz-topology-hover-anchor-x={anchor ? Math.round(anchor.x) : undefined}
      data-hz-topology-hover-anchor-y={anchor ? Math.round(anchor.y) : undefined}
      data-hz-topology-hover-surface-owner="hertzbeat-ui-hover-surface"
    >
      <header className="grid min-w-0 gap-0.5" data-hz-topology-hover-header-owner="hertzbeat-ui-hover-header">
        <div
          className="truncate text-[12px] font-semibold text-[#eef2f7]"
          data-hz-topology-hover-title-owner="hertzbeat-ui-hover-title"
        >
          {title}
        </div>
        {summary ? (
          <div
            className="truncate text-[10px] font-medium text-[#8f99ab]"
            data-hz-topology-hover-summary-owner="hertzbeat-ui-hover-summary"
          >
            {summary}
          </div>
        ) : null}
      </header>
      {facts.length > 0 ? (
        <div
          className="grid min-w-0 grid-cols-2 gap-px border border-[var(--hz-ui-line-faint)] bg-[var(--hz-ui-line-faint)]"
          data-hz-topology-hover-fact-grid-owner="hertzbeat-ui-hover-fact-grid"
        >
          {facts.map(fact => {
            const { id, label, value, meta, className: factClassName, ...factProps } = fact;
            return (
              <div
                key={id}
                {...factProps}
                className={cn('grid min-w-0 gap-0.5 bg-[#0b0d12] px-2 py-1.5', factClassName)}
                data-hz-topology-hover-fact={id}
                data-hz-topology-hover-fact-owner="hertzbeat-ui-hover-fact"
              >
                <span
                  className="truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-[#727b8c]"
                  data-hz-topology-hover-fact-label-owner="hertzbeat-ui-hover-fact-label"
                >
                  {label}
                </span>
                <span
                  className="truncate text-[11px] font-semibold text-[#dfe6f2]"
                  data-hz-topology-hover-fact-value-owner="hertzbeat-ui-hover-fact-value"
                >
                  {value}
                </span>
                {meta ? (
                  <span
                    className="truncate font-mono text-[9px] text-[#727b8c]"
                    data-hz-topology-hover-fact-meta-owner="hertzbeat-ui-hover-fact-meta"
                  >
                    {meta}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {metrics.length > 0 ? (
        <div
          className="grid min-w-0 grid-cols-3 gap-px border border-[var(--hz-ui-line-faint)] bg-[var(--hz-ui-line-faint)]"
          data-hz-topology-hover-metric-grid-owner="hertzbeat-ui-hover-metric-grid"
        >
          {metrics.map(metric => {
            const tone = metric.tone ?? 'neutral';
            const toneColor = chartToneColor[tone];
            return (
              <div
                key={metric.id}
                className="grid min-w-0 gap-0.5 bg-[#0b0d12] px-2 py-1.5"
                data-hz-topology-hover-metric={metric.id}
                data-hz-topology-hover-metric-owner="hertzbeat-ui-hover-metric"
                data-hz-topology-hover-metric-tone={tone}
              >
                <span className="flex min-w-0 items-center gap-1">
                  <span
                    className="h-1.5 w-1.5 shrink-0"
                    style={{ backgroundColor: toneColor.stroke }}
                    aria-hidden="true"
                    data-hz-topology-hover-metric-indicator-owner="hertzbeat-ui-hover-metric-indicator"
                  />
                  <span
                    className="truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-[#727b8c]"
                    data-hz-topology-hover-metric-label-owner="hertzbeat-ui-hover-metric-label"
                  >
                    {metric.label}
                  </span>
                </span>
                <span
                  className="truncate text-[11px] font-semibold text-[#dfe6f2]"
                  data-hz-topology-hover-metric-value-owner="hertzbeat-ui-hover-metric-value"
                >
                  {metric.value}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
      {evidenceBadges.length > 0 ? (
        <div className="flex min-w-0 flex-wrap gap-1" data-hz-topology-hover-badge-list-owner="hertzbeat-ui-hover-badge-list">
          {evidenceBadges.map(badge => (
            <span
              key={badge}
              className="inline-flex h-5 items-center border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-control)] px-1.5 font-mono text-[9px] text-[#a9b0bb]"
              data-hz-topology-hover-badge={badge}
              data-hz-topology-hover-badge-owner="hertzbeat-ui-hover-badge"
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function HzTopologyLegend({
  title,
  sections,
  summaryLabel,
  boundary = 'default',
  density = 'default',
  className,
  ...props
}: HzTopologyLegendProps) {
  const isCanvasDock = density === 'canvas-dock';
  const visibleSections = sections.filter(section => section.items.length > 0);

  if (visibleSections.length === 0) {
    return null;
  }

  return (
    <section
      {...props}
      className={cn(
        'min-w-0 bg-[var(--hz-ui-surface)]',
        !isCanvasDock && topologyLegendBoundaryClassName[boundary],
        isCanvasDock && 'max-w-[360px] bg-transparent',
        className
      )}
      data-hz-ui="topology-legend"
      data-hz-topology-primitive="legend"
      data-hz-topology-legend-boundary={boundary}
      data-hz-topology-legend-boundary-owner="hertzbeat-ui-legend-boundary"
      data-hz-topology-legend-density={density}
      data-hz-topology-legend-density-owner="hertzbeat-ui-legend-density"
      data-hz-topology-legend-layout={isCanvasDock ? 'inline-g6-dock' : 'section-list'}
      data-hz-topology-legend-occlusion={isCanvasDock ? 'low' : 'standard'}
      data-hz-topology-legend-border={isCanvasDock ? 'none' : boundary}
      data-hz-topology-legend-summary-visibility={isCanvasDock ? 'hidden' : 'visible'}
    >
      <header
        className={cn(
          'flex items-center justify-between gap-3',
          !isCanvasDock && 'border-b border-[var(--hz-ui-line-soft)]',
          isCanvasDock ? 'min-h-6 px-2 pb-1 pt-0' : 'min-h-9 px-3 py-2'
        )}
        data-hz-topology-legend-header-owner="hertzbeat-ui-legend-header"
      >
        <div
          className={cn(
            'min-w-0 truncate font-semibold text-[#f3f6fb]',
            isCanvasDock ? 'text-[10px]' : 'text-[12px]'
          )}
          data-hz-topology-legend-title-owner="hertzbeat-ui-legend-title"
        >
          {title}
        </div>
        {!isCanvasDock ? (
          <span
            className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]"
            data-hz-topology-legend-summary-owner="hertzbeat-ui-legend-summary"
          >
            {summaryLabel ?? `${visibleSections.length} groups`}
          </span>
        ) : null}
      </header>
      <div
        className={cn(
          'min-w-0',
          isCanvasDock ? 'flex flex-wrap gap-x-3 gap-y-1 px-2 py-1.5' : 'grid divide-y divide-[var(--hz-ui-line-faint)]'
        )}
      >
        {visibleSections.map(section => (
          <div
            key={section.id}
            className={cn(
              'min-w-0',
              isCanvasDock ? 'flex items-center gap-1.5' : 'grid gap-2 px-3 py-2'
            )}
            data-hz-topology-legend-section={section.id}
            data-hz-topology-legend-section-owner="hertzbeat-ui-legend-section"
          >
            <div
              className={cn(
                'truncate text-[10px] font-semibold uppercase text-[#727b8c]',
                isCanvasDock ? 'tracking-normal' : 'tracking-[0.08em]'
              )}
              data-hz-topology-legend-section-label-owner="hertzbeat-ui-legend-section-label"
            >
              {section.label}
            </div>
            <div className={cn(isCanvasDock ? 'flex flex-wrap items-center gap-1.5' : 'grid min-w-0 gap-1.5')}>
              {section.items.map(item => {
                const tone = item.tone ?? 'neutral';
                const pattern = item.pattern ?? 'solid';
                const color = item.color ?? chartToneColor[tone].stroke;
                const fill = item.fill ?? chartToneColor[tone].soft;
                const visualSource =
                  item.visualSource ??
                  (item.id.includes('edge') || pattern !== 'solid'
                    ? 'hertzbeat-edge-token'
                    : item.id.includes('selected')
                      ? 'hertzbeat-interaction-token'
                      : 'hertzbeat-status-token');
                const sourceLabel = topologyLegendVisualSourceLabel[visualSource];
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex min-w-0 items-center text-[11px]',
                      isCanvasDock ? 'min-h-4 gap-1' : 'min-h-5 gap-2'
                    )}
                    data-hz-topology-legend-item={item.id}
                    data-hz-topology-legend-item-owner="hertzbeat-ui-legend-item"
                    data-hz-topology-legend-tone={tone}
                    data-hz-topology-legend-pattern={pattern}
                    data-hz-topology-legend-color={color}
                    data-hz-topology-legend-fill={fill}
                    data-hz-topology-legend-visual-source={visualSource}
                    data-hz-topology-legend-visual-mode="source-backed-text"
                    data-hz-topology-legend-source-label={sourceLabel}
                    data-hz-topology-legend-no-handdrawn-icon="true"
                  >
                    {item.iconSrc ? (
                      <span
                        aria-label={item.iconAlt}
                        role={item.iconAlt ? 'img' : undefined}
                        className={cn(
                          'h-3.5 w-3.5 shrink-0 bg-contain bg-center bg-no-repeat opacity-80',
                          isCanvasDock ? 'mr-1 inline-block' : 'mr-1.5 inline-block'
                        )}
                        style={{ backgroundImage: `url("${item.iconSrc}")` }}
                        data-hz-topology-legend-icon-owner="hertzbeat-ui-legend-source-icon"
                        data-hz-topology-legend-icon-library={item.iconLibrary}
                        data-hz-topology-legend-icon-name={item.iconName}
                        data-hz-topology-legend-icon-source={item.iconSource}
                        data-hz-topology-legend-icon-no-handdrawn="true"
                      />
                    ) : null}
                    <span
                      className="min-w-0 truncate text-[#cbd3df]"
                      data-hz-topology-legend-item-label-owner="hertzbeat-ui-legend-item-label"
                    >
                      {item.label}
                    </span>
                    {item.value ? (
                      <span
                        className={cn(
                          'shrink-0 truncate font-mono text-[10px] text-[#727b8c]',
                          isCanvasDock && 'sr-only'
                        )}
                        data-hz-topology-legend-item-value-owner="hertzbeat-ui-legend-item-value"
                      >
                        {item.value}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function topologyDetailActionClassName(emphasis: HzTopologyDetailDrawerAction['emphasis']) {
  return emphasis === 'primary'
    ? 'border-[#31405c] bg-[#182238] text-[#d8e4ff]'
    : 'border-[#303542] bg-[#151821] text-[#dfe3ec]';
}

const topologyDetailDrawerSurfaceClassName: Record<HzTopologyDetailDrawerSurface, string> = {
  default: 'border border-[#252832]',
  framed: 'border border-[#252832]',
  flush: 'border-y border-x-0 border-[#252832]'
};

function HzTopologyDetailDrawerActionLink({
  action,
  attributeName
}: {
  action: HzTopologyDetailDrawerAction;
  attributeName: 'data-hz-topology-detail-action' | 'data-hz-topology-detail-signal-action';
}) {
  const {
    id,
    label,
    emphasis = 'neutral',
    copy,
    copyProps,
    className,
    ...anchorProps
  } = action;
  const { className: copyClassName, ...copyRestProps } = copyProps ?? {};
  const isSignalAction = attributeName === 'data-hz-topology-detail-signal-action';

  return (
    <>
      <a
        {...anchorProps}
        className={cn(
          'rounded-[3px] border px-3 py-1.5 text-[12px] font-semibold',
          topologyDetailActionClassName(emphasis),
          className
        )}
        data-hz-topology-detail-action-emphasis={emphasis}
        {...(isSignalAction
          ? { 'data-hz-topology-detail-signal-action-link-owner': 'hertzbeat-ui-detail-signal-action-link' }
          : { 'data-hz-topology-detail-action-link-owner': 'hertzbeat-ui-detail-action-link' })}
        {...{ [attributeName]: id }}
      >
        <span
          {...(isSignalAction
            ? { 'data-hz-topology-detail-signal-action-label-owner': 'hertzbeat-ui-detail-signal-action-label' }
            : { 'data-hz-topology-detail-action-label-owner': 'hertzbeat-ui-detail-action-label' })}
        >
          {label}
        </span>
      </a>
      {copy ? (
        <span
          {...copyRestProps}
          className={cn('basis-full text-[11px] leading-5 text-[#8f99ab]', copyClassName)}
          data-hz-topology-detail-action-copy-owner="hertzbeat-ui-detail-action-copy"
        >
          {copy}
        </span>
      ) : null}
    </>
  );
}

export function HzTopologyDetailDrawer({
  kind,
  eyebrow,
  title,
  subtitle,
  boundary,
  boundaryProps,
  surface = 'default',
  facts = [],
  actions = [],
  signalActions = [],
  signalActionsLabel,
  subjectId,
  sourceId,
  targetId,
  relationType,
  sourceKind,
  entityType,
  density = 'compact',
  className,
  ...props
}: HzTopologyDetailDrawerProps) {
  const { className: boundaryClassName, ...boundaryRestProps } = boundaryProps ?? {};
  const graphFirst = density === 'graph-first';
  const scrollResetKey = `${kind}:${subjectId ?? 'none'}:${sourceId ?? 'none'}:${targetId ?? 'none'}:${relationType ?? 'unknown'}:${sourceKind ?? 'unknown'}:${entityType ?? 'unknown'}`;
  const drawerRef = React.useRef<HTMLElement | null>(null);
  const previousScrollResetKeyRef = React.useRef(scrollResetKey);

  React.useEffect(() => {
    const drawer = drawerRef.current;

    if (!drawer || previousScrollResetKeyRef.current === scrollResetKey) {
      return;
    }

    drawer.scrollTop = 0;
    previousScrollResetKeyRef.current = scrollResetKey;
  }, [scrollResetKey]);

  const signalActionGroup =
    signalActions.length > 0 ? (
      <div
        className={cn(
          'grid',
          graphFirst
            ? 'sticky top-0 z-10 -mx-2 mt-2 gap-1 border-y border-[#252832] bg-[#0b0c0f] px-2 py-2'
            : 'mt-3 gap-2'
        )}
        data-hz-topology-detail-actions="signals"
        data-hz-topology-detail-signal-action-group-owner="hertzbeat-ui-detail-signal-action-group"
        data-hz-topology-detail-signal-action-placement={graphFirst ? 'header-dock' : 'footer'}
        data-hz-topology-detail-signal-action-placement-owner="hertzbeat-ui-detail-signal-action-placement"
        data-hz-topology-detail-signal-action-sticky={graphFirst ? 'top-with-header-context' : 'none'}
      >
        {signalActionsLabel ? (
          <div
            className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#727b8c]"
            data-hz-topology-detail-signal-label="signals"
            data-hz-topology-detail-signal-label-owner="hertzbeat-ui-detail-signal-label"
          >
            {signalActionsLabel}
          </div>
        ) : null}
        {signalActions.map(action => (
          <HzTopologyDetailDrawerActionLink key={action.id} action={action} attributeName="data-hz-topology-detail-signal-action" />
        ))}
      </div>
    ) : null;

  return (
    <section
      {...props}
      ref={drawerRef}
      className={cn(
        'min-w-0',
        graphFirst ? 'hb-scrollbar max-h-[560px] overflow-y-auto overscroll-contain bg-[#0b0c0f] p-2 text-[12px]' : 'bg-[#101217] p-3',
        topologyDetailDrawerSurfaceClassName[surface],
        className
      )}
      data-hz-ui="topology-detail-drawer"
      data-hz-topology-primitive="detail-drawer"
      data-hz-topology-detail-kind={kind}
      data-hz-topology-detail-density={density}
      data-hz-topology-detail-density-owner="hertzbeat-ui-detail-density"
      data-hz-topology-detail-visual-weight={graphFirst ? 'low-interruption' : 'balanced'}
      data-hz-topology-detail-visual-weight-owner="hertzbeat-ui-detail-visual-weight"
      data-hz-topology-detail-rail-fit={graphFirst ? 'compact-side-rail' : 'standard'}
      data-hz-topology-detail-rail-fit-owner="hertzbeat-ui-detail-rail-fit"
      data-hz-topology-detail-rail-max-block={graphFirst ? 'bounded-560px' : 'unbounded'}
      data-hz-topology-detail-overflow-policy={graphFirst ? 'internal-scroll' : 'document-flow'}
      data-hz-topology-detail-scroll-reset={graphFirst ? 'identity-change' : 'none'}
      data-hz-topology-detail-scroll-reset-owner="hertzbeat-ui-detail-scroll-reset"
      data-hz-topology-detail-scroll-reset-key={scrollResetKey}
      data-hz-topology-detail-surface={surface}
      data-hz-topology-detail-surface-owner="hertzbeat-ui-detail-surface"
      data-hz-topology-detail-identity-owner="hertzbeat-ui-detail-identity"
      data-hz-topology-detail-subject-id={subjectId ?? 'none'}
      data-hz-topology-detail-source-id={sourceId ?? 'none'}
      data-hz-topology-detail-target-id={targetId ?? 'none'}
      data-hz-topology-detail-relation-type={relationType ?? 'unknown'}
      data-hz-topology-detail-source-kind={sourceKind ?? 'unknown'}
      data-hz-topology-detail-entity-type={entityType ?? 'unknown'}
    >
      <div className="min-w-0" data-hz-topology-detail-header-owner="hertzbeat-ui-detail-header">
        <div
          className={cn('font-semibold tracking-[0.12em] text-[#7e8494]', graphFirst ? 'text-[10px]' : 'text-[12px]')}
          data-hz-topology-detail-eyebrow-owner="hertzbeat-ui-detail-eyebrow"
        >
          {eyebrow}
        </div>
        <div
          className={cn('font-semibold text-[#f5f7fb]', graphFirst ? 'mt-1 text-[13px]' : 'mt-2 text-[15px]')}
          data-hz-topology-detail-title-owner="hertzbeat-ui-detail-title"
        >
          {title}
        </div>
        {subtitle ? (
          <div
            className={cn('mt-1 text-[#8f99ab]', graphFirst ? 'text-[11px]' : 'text-[12px]')}
            data-hz-topology-detail-subtitle-owner="hertzbeat-ui-detail-subtitle"
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      {graphFirst ? signalActionGroup : null}
      {boundary ? (
        <div
          {...boundaryRestProps}
          className={cn(
            'border-l border-[#4b5566] bg-[#0b0c0f] text-[#a9b0bb]',
            graphFirst ? 'mt-2 px-2 py-1 text-[11px] leading-4' : 'mt-3 px-3 py-2 text-[12px] leading-5',
            boundaryClassName
          )}
          data-hz-topology-detail-boundary="context"
          data-hz-topology-detail-boundary-owner="hertzbeat-ui-detail-boundary"
          data-hz-topology-detail-boundary-copy-owner="hertzbeat-ui-detail-boundary-copy"
        >
          {boundary}
        </div>
      ) : null}
      {facts.length > 0 ? (
        <div
          className={cn('grid', graphFirst ? 'mt-2 gap-1' : 'mt-3 gap-2')}
          data-hz-topology-detail-facts={facts.length}
          data-hz-topology-detail-fact-group-owner="hertzbeat-ui-detail-fact-group"
          data-hz-topology-detail-fact-density={graphFirst ? 'compressed' : 'standard'}
        >
          {facts.map(fact => {
            const { className: factClassName, ...factRestProps } = fact.factProps ?? {};
            const tone = fact.tone ?? 'neutral';
            return (
              <div
                key={fact.id}
                {...factRestProps}
                className={cn('border border-[#252832] bg-[#0b0c0f] px-2', graphFirst ? 'py-1' : 'py-2', factClassName)}
                data-hz-topology-detail-fact={fact.id}
                data-hz-topology-detail-fact-owner="hertzbeat-ui-detail-fact"
                data-hz-topology-detail-fact-tone={tone}
              >
                <div
                  className={cn('font-semibold text-[#7e8494]', graphFirst ? 'text-[10px]' : 'text-[11px]')}
                  data-hz-topology-detail-fact-label-owner="hertzbeat-ui-detail-fact-label"
                >
                  {fact.label}
                </div>
                <div
                  className={cn('mt-1 font-semibold text-[#e3e8f0]', graphFirst ? 'text-[11px]' : 'text-[12px]')}
                  data-hz-topology-detail-fact-value-owner="hertzbeat-ui-detail-fact-value"
                >
                  {fact.value}
                </div>
                {fact.meta ? (
                  <div
                    className={cn('mt-1 text-[#8f99ab]', graphFirst ? 'text-[10px]' : 'text-[11px]')}
                    data-hz-topology-detail-fact-meta-owner="hertzbeat-ui-detail-fact-meta"
                  >
                    {fact.meta}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {actions.length > 0 ? (
        <div
          className={cn('flex flex-wrap', graphFirst ? 'mt-2 gap-1' : 'mt-3 gap-2')}
          data-hz-topology-detail-actions="entity-alert"
          data-hz-topology-detail-action-group-owner="hertzbeat-ui-detail-action-group"
        >
          {actions.map(action => (
            <HzTopologyDetailDrawerActionLink key={action.id} action={action} attributeName="data-hz-topology-detail-action" />
          ))}
        </div>
      ) : null}
      {!graphFirst ? signalActionGroup : null}
    </section>
  );
}

export function HzTopologyEvidenceList({
  kind = 'evidence',
  title,
  copy,
  items,
  boundary = 'default',
  className,
  ...props
}: HzTopologyEvidenceListProps) {
  return (
    <section
      {...props}
      className={cn('min-w-0 bg-[var(--hz-ui-surface)]', topologyEvidenceListBoundaryClassName[boundary], className)}
      data-hz-ui="topology-evidence-list"
      data-hz-topology-primitive="evidence-list"
      data-hz-topology-evidence-list-kind={kind}
      data-hz-topology-evidence-list-density="compact"
      data-hz-topology-evidence-list-boundary={boundary}
      data-hz-topology-evidence-list-boundary-owner="hertzbeat-ui-evidence-list-boundary"
    >
      <header
        className="flex min-h-9 items-center justify-between gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2"
        data-hz-topology-evidence-header-owner="hertzbeat-ui-evidence-list-header"
      >
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold text-[#f3f6fb]" data-hz-topology-evidence-title-owner="hertzbeat-ui-evidence-list-title">
            {title}
          </div>
          {copy ? (
            <div className="mt-0.5 truncate text-[11px] text-[#8f99ab]" data-hz-topology-evidence-copy-owner="hertzbeat-ui-evidence-list-copy">
              {copy}
            </div>
          ) : null}
        </div>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]" data-hz-topology-evidence-count-owner="hertzbeat-ui-evidence-list-count">
          {items.length}
        </span>
      </header>
      <div className="grid min-w-0 divide-y divide-[var(--hz-ui-line-faint)]" data-hz-topology-evidence-items={items.length}>
        {items.map(item => {
          const {
            id,
            label,
            value,
            meta,
            tone = 'neutral',
            className: itemClassName,
            ...itemProps
          } = item;
          const toneColor = chartToneColor[tone];
          return (
            <div
              key={id}
              {...itemProps}
              className={cn('grid min-h-10 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-3 py-2', itemClassName)}
              data-hz-topology-evidence-item={id}
              data-hz-topology-evidence-item-owner="hertzbeat-ui-evidence-list-item"
              data-hz-topology-evidence-item-tone={tone}
            >
              <span
                className="h-2 w-2 shrink-0"
                style={{ backgroundColor: toneColor.stroke, boxShadow: `0 0 0 3px ${toneColor.soft}` }}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-[#727b8c]"
                    data-hz-topology-evidence-item-label-owner="hertzbeat-ui-evidence-list-item-label"
                  >
                    {label}
                  </span>
                  <span
                    className="min-w-0 truncate text-[12px] font-semibold text-[#e3e8f0]"
                    data-hz-topology-evidence-item-value-owner="hertzbeat-ui-evidence-list-item-value"
                  >
                    {value}
                  </span>
                </span>
                {meta ? (
                  <span
                    className="mt-0.5 block truncate text-[11px] leading-5 text-[#8f99ab]"
                    data-hz-topology-evidence-item-meta-owner="hertzbeat-ui-evidence-list-item-meta"
                  >
                    {meta}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function HzTopologyFilterStrip({
  variant = 'source-grid',
  boundary = 'none',
  copyVisibility = 'visible',
  items,
  className,
  ...props
}: HzTopologyFilterStripProps) {
  const isSourceRail = variant === 'source-rail';
  return (
    <nav
      {...props}
      className={cn(
        isSourceRail ? 'flex min-w-0 flex-wrap items-center gap-1.5' : 'grid min-w-0 gap-2',
        variant === 'source-grid' ? 'md:grid-cols-2 xl:grid-cols-4' : null,
        variant === 'view-list' ? 'grid-cols-1' : null,
        topologyFilterStripBoundaryClassName[boundary],
        className
      )}
      data-hz-ui="topology-filter-strip"
      data-hz-topology-primitive="filter-strip"
      data-hz-topology-filter-strip-density={isSourceRail ? 'compact-rail' : 'compact'}
      data-hz-topology-filter-strip-layout={isSourceRail ? 'single-line-wrap' : undefined}
      data-hz-topology-filter-strip-height-contract={isSourceRail ? 'one-control-row-preferred' : undefined}
      data-hz-topology-filter-strip-variant={variant}
      data-hz-topology-filter-strip-boundary={boundary}
      data-hz-topology-filter-strip-boundary-owner="hertzbeat-ui-filter-strip-boundary"
      data-hz-topology-filter-strip-copy-visibility={copyVisibility}
      data-hz-topology-filter-strip-copy-visibility-owner="hertzbeat-ui-filter-strip-copy-visibility"
    >
      {items.map(item => {
        const {
          id,
          label,
          copy,
          active = false,
          className: itemClassName,
          ...anchorProps
        } = item;
        return (
          <a
            key={id}
            {...anchorProps}
            className={cn(
              isSourceRail
                ? 'inline-flex h-7 min-w-0 max-w-[172px] items-center rounded-[3px] border px-2.5 text-left transition-colors'
                : 'grid min-w-0 gap-1 rounded-[3px] border px-3 py-2 text-left transition-colors',
              active
                ? 'border-[#4e74f8] bg-[#182238]'
                : 'border-[#252832] bg-[#101217] hover:border-[#364052] hover:bg-[#131821]',
              itemClassName
            )}
            data-hz-topology-filter-item={id}
            data-hz-topology-filter-item-owner="hertzbeat-ui-filter-strip-item"
            data-hz-topology-filter-item-active={active ? 'true' : 'false'}
          >
            <span
              className={cn(
                'min-w-0 truncate font-semibold text-[#e3e8f0]',
                isSourceRail ? 'text-[11px]' : 'text-[12px]'
              )}
              data-hz-topology-filter-item-label-owner="hertzbeat-ui-filter-strip-label"
            >
              {label}
            </span>
            {copy ? (
              <span
                className={cn(
                  copyVisibility === 'assistive' ? 'sr-only' : 'min-w-0 text-[11px] leading-5 text-[#8f99ab]'
                )}
                data-hz-topology-filter-item-copy-owner="hertzbeat-ui-filter-strip-copy"
              >
                {copy}
              </span>
            ) : null}
          </a>
        );
      })}
    </nav>
  );
}

export function HzTopologyActionLink({
  id,
  label,
  copy,
  emphasis = 'neutral',
  spacing = 'none',
  className,
  ...props
}: HzTopologyActionLinkProps) {
  return (
    <a
      {...props}
      className={cn(
        'grid min-w-0 gap-1 rounded-[3px] border px-3 py-2 text-[12px] font-semibold transition-colors',
        emphasis === 'primary'
          ? 'border-[#31405c] bg-[#182238] text-[#d8e4ff] hover:border-[#4e74f8] hover:bg-[#1d2941]'
          : 'border-[#252832] bg-[#101217] text-[#dfe3ec] hover:border-[#364052] hover:bg-[#131821]',
        topologyActionLinkSpacingClassName[spacing],
        className
      )}
      data-hz-ui="topology-action-link"
      data-hz-topology-primitive="action-link"
      data-hz-topology-action-link-density="compact"
      data-hz-topology-action-link-spacing={spacing}
      data-hz-topology-action-link-spacing-owner="hertzbeat-ui-action-link-spacing"
      data-hz-topology-action-link={id}
      data-hz-topology-action-link-emphasis={emphasis}
    >
      <span className="min-w-0 truncate" data-hz-topology-action-link-label-owner="hertzbeat-ui-action-link-label">
        {label}
      </span>
      {copy ? (
        <span
          className="min-w-0 text-[11px] font-normal leading-5 text-[#8f99ab]"
          data-hz-topology-action-link-copy-owner="hertzbeat-ui-action-link-copy"
        >
          {copy}
        </span>
      ) : null}
    </a>
  );
}

export function HzTopologyFocusTrail({
  label,
  crumbs,
  filters = [],
  hiddenCountLabel,
  hiddenCountProps,
  exitAction,
  boundary = 'none',
  density = 'compact',
  focusMode = 'overview',
  focusDepth,
  focusEntityId,
  className,
  ...props
}: HzTopologyFocusTrailProps) {
  const { className: hiddenCountClassName, ...hiddenCountRestProps } = hiddenCountProps ?? {};
  const isRail = density === 'rail';
  const isGraphDock = density === 'graph-dock';
  const isLinear = isRail || isGraphDock;
  const chrome = isGraphDock && boundary === 'none' ? 'frameless' : 'surface';

  return (
    <section
      {...props}
      className={cn(
        isGraphDock
          ? cn('flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto text-[11px]', chrome === 'frameless' ? 'bg-transparent' : 'bg-[var(--hz-ui-surface)]')
          : isRail
            ? 'flex min-w-0 flex-wrap items-center gap-1.5 bg-[var(--hz-ui-surface)] text-[12px]'
            : 'grid min-w-0 gap-2 bg-[var(--hz-ui-surface)] text-[12px] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center',
        isGraphDock && boundary === 'section'
          ? 'border-t border-[var(--hz-ui-line-soft)] py-1'
          : isRail && boundary === 'section'
          ? 'border-t border-[var(--hz-ui-line-soft)] px-3 py-1'
          : topologyFocusTrailBoundaryClassName[boundary],
        className
      )}
      data-hz-ui="topology-focus-trail"
      data-hz-topology-primitive="focus-trail"
      data-hz-topology-focus-trail-density={density}
      data-hz-topology-focus-trail-mode={focusMode}
      data-hz-topology-focus-trail-mode-owner="hertzbeat-ui-focus-trail-mode"
      data-hz-topology-focus-trail-depth={focusDepth ?? 'unknown'}
      data-hz-topology-focus-trail-depth-owner="hertzbeat-ui-focus-trail-depth"
      data-hz-topology-focus-trail-entity={focusEntityId ?? 'none'}
      data-hz-topology-focus-trail-entity-owner="hertzbeat-ui-focus-trail-entity"
      data-hz-topology-focus-trail-layout={isGraphDock ? 'single-line-nowrap' : isRail ? 'single-line-wrap' : undefined}
      data-hz-topology-focus-trail-height-contract={isGraphDock ? 'one-compact-row' : isRail ? 'one-control-row-preferred' : undefined}
      data-hz-topology-focus-trail-occlusion={isGraphDock ? 'none' : undefined}
      data-hz-topology-focus-trail-position-contract={isGraphDock ? 'document-flow' : undefined}
      data-hz-topology-focus-trail-priority={isGraphDock ? 'canvas' : undefined}
      data-hz-topology-focus-trail-alignment={isGraphDock ? 'shared-control-grid' : undefined}
      data-hz-topology-focus-trail-inset={isGraphDock ? '0px' : undefined}
      data-hz-topology-focus-trail-control-height={isGraphDock ? '28px' : undefined}
      data-hz-topology-focus-trail-visual-weight={isGraphDock ? 'low-interruption' : undefined}
      data-hz-topology-focus-trail-visual-weight-owner={isGraphDock ? 'hertzbeat-ui-focus-trail-visual-weight' : undefined}
      data-hz-topology-focus-trail-chrome={isGraphDock ? chrome : undefined}
      data-hz-topology-focus-trail-frame={isGraphDock && chrome === 'frameless' ? 'none' : undefined}
      data-hz-topology-focus-trail-boundary={boundary}
      data-hz-topology-focus-trail-boundary-owner="hertzbeat-ui-focus-trail-boundary"
    >
      <div className={cn(isLinear ? 'contents' : 'grid min-w-0 gap-2')}>
        <div
          className={cn(
            'truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#727b8c]',
            isLinear ? 'sr-only' : null
          )}
          data-hz-topology-focus-trail-label-owner="hertzbeat-ui-focus-trail-label"
        >
          {label}
        </div>
        <nav
          className={cn(
            'flex min-w-0 items-center gap-1 overflow-x-auto',
            isGraphDock ? 'flex-nowrap' : isRail ? 'flex-wrap overflow-x-visible' : 'flex-nowrap'
          )}
          data-hz-topology-focus-crumbs-owner="hertzbeat-ui-focus-trail-crumbs"
        >
          {crumbs.map((crumb, index) => {
            const { id, label: crumbLabel, value, active = false, className: crumbClassName, href = '#', ...anchorProps } = crumb;
            return (
              <React.Fragment key={id}>
                {index > 0 ? (
                  <span className="shrink-0 text-[#4f5665]" aria-hidden="true">
                    /
                  </span>
                ) : null}
                <a
                  {...anchorProps}
                  href={href}
                  className={cn(
                    'inline-flex min-w-0 items-center gap-1 rounded-[3px] border px-2 transition-colors',
                    isGraphDock ? 'h-6 max-w-[156px]' : isRail ? 'h-7 max-w-[180px]' : 'h-7 max-w-[220px]',
                    active
                      ? 'border-[#4e74f8] bg-[#182238] text-[#d8e4ff]'
                      : 'border-[#252832] bg-[#101217] text-[#cbd3df] hover:border-[#364052] hover:bg-[#131821]',
                    crumbClassName
                  )}
                  data-hz-topology-focus-crumb={id}
                  data-hz-topology-focus-crumb-owner="hertzbeat-ui-focus-trail-crumb"
                  data-hz-topology-focus-crumb-active={active ? 'true' : 'false'}
                >
                  <span className="min-w-0 truncate font-semibold" data-hz-topology-focus-crumb-label-owner="hertzbeat-ui-focus-trail-crumb-label">
                    {crumbLabel}
                  </span>
                  {value ? (
                    <span
                      className="shrink-0 font-mono text-[10px] text-[#8f99ab]"
                      data-hz-topology-focus-crumb-value-owner="hertzbeat-ui-focus-trail-crumb-value"
                    >
                      {value}
                    </span>
                  ) : null}
                </a>
              </React.Fragment>
            );
          })}
        </nav>
        {filters.length > 0 ? (
          <div
            className={cn(
              'flex min-w-0 items-center gap-1 overflow-x-auto',
              isGraphDock ? 'sr-only flex-nowrap' : isRail ? 'flex-wrap overflow-x-visible' : 'flex-nowrap'
            )}
            data-hz-topology-focus-filters-owner="hertzbeat-ui-focus-trail-filters"
            data-hz-topology-focus-filter-visibility={isGraphDock ? 'assistive' : 'visible'}
            data-hz-topology-focus-filter-visibility-owner="hertzbeat-ui-focus-trail-filter-visibility"
            data-hz-topology-focus-filter-deduped-by={isGraphDock ? 'topology-toolbar' : undefined}
          >
            {filters.map(filter => {
              const { id, label: filterLabel, value, className: filterClassName, ...filterProps } = filter;
              return (
                <span
                  key={id}
                  {...filterProps}
                  className={cn(
                    'inline-flex h-6 min-w-0 items-center gap-1 rounded-[3px] border border-[#252832] bg-[#151821] px-2 text-[#9ca3b4]',
                    isGraphDock ? 'max-w-[136px]' : null,
                    filterClassName
                  )}
                  data-hz-topology-focus-filter={id}
                  data-hz-topology-focus-filter-owner="hertzbeat-ui-focus-trail-filter"
                >
                  <span className="truncate text-[#727b8c]" data-hz-topology-focus-filter-label-owner="hertzbeat-ui-focus-trail-filter-label">
                    {filterLabel}
                  </span>
                  <span className="truncate font-semibold text-[#d6d9e2]" data-hz-topology-focus-filter-value-owner="hertzbeat-ui-focus-trail-filter-value">
                    {value}
                  </span>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
      {(hiddenCountLabel || exitAction) ? (
        <div className={cn('flex min-w-0 flex-nowrap items-center gap-2', isLinear ? 'ml-auto' : 'lg:justify-end')}>
          {hiddenCountLabel ? (
            <span
              {...hiddenCountRestProps}
              className={cn(
                'shrink-0 font-mono uppercase tracking-[0.08em] text-[#727b8c]',
                isGraphDock ? 'text-[9px]' : 'text-[10px]',
                hiddenCountClassName
              )}
              data-hz-topology-focus-hidden-count-owner="hertzbeat-ui-focus-trail-hidden-count"
            >
              {hiddenCountLabel}
            </span>
          ) : null}
          {exitAction ? (
            (() => {
              const { label: exitLabel, className: exitClassName, ...exitProps } = exitAction;
              return (
                <a
                  {...exitProps}
                  className={cn(
                    'inline-flex shrink-0 items-center justify-center rounded-[3px] border border-[#303542] bg-[#151821] font-semibold text-[#dfe3ec] transition-colors hover:border-[#4e74f8]',
                    isGraphDock ? 'h-6 px-2 text-[11px]' : 'h-7 px-3 text-[12px]',
                    exitClassName
                  )}
                  data-hz-topology-focus-exit-owner="hertzbeat-ui-focus-trail-exit"
                  data-hz-topology-focus-exit-href={exitProps.href}
                  data-hz-topology-focus-exit-href-owner="hertzbeat-ui-focus-trail-exit-href"
                >
                  {exitLabel}
                </a>
              );
            })()
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function HzTopologyGroupPanel({
  title,
  copy,
  groupByLabel,
  items,
  actions = [],
  boundary = 'default',
  className,
  ...props
}: HzTopologyGroupPanelProps) {
  return (
    <section
      {...props}
      className={cn(
        'grid min-w-0 gap-3 bg-[var(--hz-ui-surface)] p-3 text-[12px] text-[#cbd3df]',
        topologyGroupPanelBoundaryClassName[boundary],
        className
      )}
      data-hz-ui="topology-group-panel"
      data-hz-topology-primitive="group-panel"
      data-hz-topology-group-panel-density="compact"
      data-hz-topology-group-panel-boundary={boundary}
      data-hz-topology-group-panel-boundary-owner="hertzbeat-ui-group-panel-boundary"
    >
      <div className="grid min-w-0 gap-1" data-hz-topology-group-panel-header-owner="hertzbeat-ui-group-panel-header">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span
            className="min-w-0 truncate text-[12px] font-semibold text-[#eef2f8]"
            data-hz-topology-group-panel-title-owner="hertzbeat-ui-group-panel-title"
          >
            {title}
          </span>
          <span
            className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]"
            data-hz-topology-group-panel-group-by-owner="hertzbeat-ui-group-panel-group-by"
          >
            {groupByLabel}
          </span>
        </div>
        {copy ? (
          <span className="text-[11px] leading-5 text-[#8f99ab]" data-hz-topology-group-panel-copy-owner="hertzbeat-ui-group-panel-copy">
            {copy}
          </span>
        ) : null}
      </div>
      <div className="grid min-w-0 gap-2" data-hz-topology-group-panel-items-owner="hertzbeat-ui-group-panel-items">
        {items.map(item => {
          const {
            id,
            label: itemLabel,
            value,
            count,
            collapsedCount = 0,
            collapsedLabel,
            worstTone = 'neutral',
            active = false,
            meta,
            className: itemClassName,
            ...itemProps
          } = item;
          return (
            <div
              key={id}
              {...itemProps}
              className={cn(
                'grid min-w-0 gap-1 rounded-[3px] border px-2 py-2',
                topologyGroupPanelToneClassName[worstTone],
                active ? 'shadow-[inset_2px_0_0_#4e74f8]' : '',
                itemClassName
              )}
              data-hz-topology-group-panel-item={id}
              data-hz-topology-group-panel-item-owner="hertzbeat-ui-group-panel-item"
              data-hz-topology-group-panel-item-active={active ? 'true' : 'false'}
              data-hz-topology-group-panel-item-worst-tone={worstTone}
              data-hz-topology-group-panel-item-count={count}
              data-hz-topology-group-panel-item-collapsed-count={collapsedCount}
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="min-w-0 truncate font-semibold" data-hz-topology-group-panel-label-owner="hertzbeat-ui-group-panel-label">
                  {itemLabel}
                </span>
                <span className="shrink-0 font-mono text-[10px]" data-hz-topology-group-panel-count-owner="hertzbeat-ui-group-panel-count">
                  {count}
                </span>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px]">
                <span className="min-w-0 truncate text-[#d6d9e2]" data-hz-topology-group-panel-value-owner="hertzbeat-ui-group-panel-value">
                  {value}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-[#8f99ab]">
                  {collapsedLabel ?? `${collapsedCount} collapsed`}
                </span>
              </div>
              {meta ? (
                <span className="min-w-0 truncate text-[11px] text-[#8f99ab]" data-hz-topology-group-panel-meta-owner="hertzbeat-ui-group-panel-meta">
                  {meta}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {actions.length > 0 ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2" data-hz-topology-group-panel-actions-owner="hertzbeat-ui-group-panel-actions">
          {actions.map(action => {
            const { id, label: actionLabel, className: actionClassName, href = '#', ...actionProps } = action;
            return (
              <a
                key={id}
                {...actionProps}
                href={href}
                className={cn(
                  'inline-flex h-7 items-center rounded-[3px] border border-[#303542] bg-[#151821] px-2 text-[11px] font-semibold text-[#dfe3ec] transition-colors hover:border-[#4e74f8]',
                  actionClassName
                )}
                data-hz-topology-group-panel-action={id}
                data-hz-topology-group-panel-action-owner="hertzbeat-ui-group-panel-action"
              >
                {actionLabel}
              </a>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function HzTopologyPathEndpoint({
  kind,
  endpoint
}: {
  kind: 'source' | 'target';
  endpoint: HzTopologyPathSummaryEndpoint;
}) {
  return (
    <div
      className="grid min-w-0 gap-1 rounded-[3px] border border-[#252832] bg-[#101217] px-2 py-2"
      data-hz-topology-path-endpoint={kind}
      data-hz-topology-path-endpoint-owner="hertzbeat-ui-path-summary-endpoint"
    >
      <span
        className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#727b8c]"
        data-hz-topology-path-endpoint-label-owner="hertzbeat-ui-path-summary-endpoint-label"
      >
        {endpoint.label}
      </span>
      <span className="min-w-0 truncate text-[12px] font-semibold text-[#eef2f8]" data-hz-topology-path-endpoint-value-owner="hertzbeat-ui-path-summary-endpoint-value">
        {endpoint.value}
      </span>
      {endpoint.meta ? (
        <span className="min-w-0 truncate text-[11px] text-[#8f99ab]" data-hz-topology-path-endpoint-meta-owner="hertzbeat-ui-path-summary-endpoint-meta">
          {endpoint.meta}
        </span>
      ) : null}
    </div>
  );
}

export function HzTopologyPathSummary({
  title,
  source,
  target,
  relation,
  directionLabel,
  metrics = [],
  evidenceBadges = [],
  actions = [],
  boundary = 'none',
  interactionState,
  selectedEdgeId,
  hoveredEdgeId,
  sourceId,
  targetId,
  relationType,
  sourceKind,
  className,
  ...props
}: HzTopologyPathSummaryProps) {
  const resolvedInteractionState: HzTopologyPathSummaryInteractionState =
    interactionState ?? (selectedEdgeId ? 'selected' : hoveredEdgeId ? 'hovered' : 'preview');

  return (
    <section
      {...props}
      className={cn(
        'grid min-w-0 gap-3 bg-[var(--hz-ui-surface)] p-3 text-[12px] text-[#cbd3df]',
        topologyPathSummaryBoundaryClassName[boundary],
        className
      )}
      data-hz-ui="topology-path-summary"
      data-hz-topology-primitive="path-summary"
      data-hz-topology-path-summary-density="compact"
      data-hz-topology-path-summary-boundary={boundary}
      data-hz-topology-path-summary-boundary-owner="hertzbeat-ui-path-summary-boundary"
      data-hz-topology-path-interaction-owner="hertzbeat-ui-path-summary-interaction"
      data-topology-path-summary-interaction-state={resolvedInteractionState}
      data-hz-topology-path-summary-interaction-state={resolvedInteractionState}
      data-hz-topology-path-summary-interaction-state-owner="hertzbeat-ui-path-summary-interaction-state"
      data-topology-path-summary-selected-edge-id={selectedEdgeId ?? 'none'}
      data-topology-path-summary-hovered-edge-id={hoveredEdgeId ?? 'none'}
      data-hz-topology-path-selected-edge={selectedEdgeId ?? 'none'}
      data-hz-topology-path-hovered-edge={hoveredEdgeId ?? 'none'}
      data-hz-topology-path-source-id={sourceId ?? 'none'}
      data-hz-topology-path-target-id={targetId ?? 'none'}
      data-hz-topology-path-relation-type={relationType ?? 'unknown'}
      data-hz-topology-path-source-kind={sourceKind ?? 'unknown'}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2" data-hz-topology-path-summary-header-owner="hertzbeat-ui-path-summary-header">
        <span className="min-w-0 truncate text-[12px] font-semibold text-[#eef2f8]" data-hz-topology-path-summary-title-owner="hertzbeat-ui-path-summary-title">
          {title}
        </span>
        {directionLabel ? (
          <span
            className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]"
            data-hz-topology-path-summary-direction-owner="hertzbeat-ui-path-summary-direction"
          >
            {directionLabel}
          </span>
        ) : null}
      </div>
      <div
        className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"
        data-hz-topology-path-endpoints-owner="hertzbeat-ui-path-summary-endpoints"
      >
        <HzTopologyPathEndpoint kind="source" endpoint={source} />
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-[3px] border border-[#303542] bg-[#151821] text-[#8f99ab]"
          aria-hidden="true"
          data-hz-topology-path-arrow-owner="hertzbeat-ui-path-summary-arrow"
        >
          {'->'}
        </span>
        <HzTopologyPathEndpoint kind="target" endpoint={target} />
      </div>
      {relation ? (
        <div className="flex min-w-0 items-center gap-2 rounded-[3px] border border-[#252832] bg-[#151821] px-2 py-2" data-hz-topology-path-relation-owner="hertzbeat-ui-path-summary-relation">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#727b8c]">
            {relation.label}
          </span>
          <span className="min-w-0 truncate font-semibold text-[#d6d9e2]">
            {relation.value}
          </span>
          {relation.meta ? <span className="min-w-0 truncate text-[11px] text-[#8f99ab]">{relation.meta}</span> : null}
        </div>
      ) : null}
      {metrics.length > 0 ? (
        <div className="grid min-w-0 gap-2 sm:grid-cols-3" data-hz-topology-path-metrics-owner="hertzbeat-ui-path-summary-metrics">
          {metrics.map(metric => (
            <div
              key={metric.id}
              className={cn('grid min-w-0 gap-1 rounded-[3px] border px-2 py-2', topologyPathSummaryMetricClassName[metric.tone ?? 'neutral'])}
              data-hz-topology-path-metric={metric.id}
              data-hz-topology-path-metric-owner="hertzbeat-ui-path-summary-metric"
            >
              <span className="truncate text-[10px] uppercase tracking-[0.08em] text-[#727b8c]">{metric.label}</span>
              <span className="truncate font-mono text-[12px] font-semibold">{metric.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {(evidenceBadges.length > 0 || actions.length > 0) ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {evidenceBadges.map(badge => (
              <span
                key={badge}
                className="inline-flex h-6 items-center rounded-[3px] border border-[#303542] bg-[#151821] px-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[#9ca3b4]"
                data-hz-topology-path-badge={badge}
                data-hz-topology-path-badge-owner="hertzbeat-ui-path-summary-badge"
              >
                {badge}
              </span>
            ))}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {actions.map(action => {
              const { id, label: actionLabel, className: actionClassName, href = '#', ...actionProps } = action;
              return (
                <a
                  key={id}
                  {...actionProps}
                  href={href}
                  className={cn(
                    'inline-flex h-7 items-center rounded-[3px] border border-[#303542] bg-[#151821] px-2 text-[11px] font-semibold text-[#dfe3ec] transition-colors hover:border-[#4e74f8]',
                    actionClassName
                  )}
                  data-hz-topology-path-action={id}
                  data-hz-topology-path-action-owner="hertzbeat-ui-path-summary-action"
                >
                  {actionLabel}
                </a>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function HzTopologyScopeBar({
  items,
  actions = [],
  boundary = 'none',
  summaryVisibility = 'visible',
  summaryDedupedBy,
  className,
  ...props
}: HzTopologyScopeBarProps) {
  return (
    <section
      {...props}
      className={cn(
        'flex min-w-0 flex-nowrap items-center justify-end gap-2 overflow-x-auto text-[12px]',
        topologyScopeBarBoundaryClassName[boundary],
        className
      )}
      data-hz-ui="topology-scope-bar"
      data-hz-topology-primitive="scope-bar"
      data-hz-topology-scope-bar-density="compact"
      data-hz-topology-scope-bar-boundary={boundary}
      data-hz-topology-scope-bar-boundary-owner="hertzbeat-ui-scope-bar-boundary"
      data-hz-topology-scope-summary-visibility={summaryVisibility}
      data-hz-topology-scope-summary-deduped-by={summaryDedupedBy}
    >
      {items.map(item => {
        const { id, label, value, className: itemClassName, ...itemProps } = item;
        return (
          <span
            key={id}
            {...itemProps}
            className={cn(
              summaryVisibility === 'assistive'
                ? 'sr-only'
                : 'inline-flex h-7 min-w-0 items-center gap-1 rounded-[3px] border border-[#252832] bg-[#151821] px-2 text-[#9ca3b4]',
              itemClassName
            )}
            data-hz-topology-scope-item={id}
            data-hz-topology-scope-item-owner="hertzbeat-ui-scope-item"
            data-hz-topology-scope-item-visibility={summaryVisibility}
          >
            {label ? (
              <span className="truncate text-[#727b8c]" data-hz-topology-scope-item-label-owner="hertzbeat-ui-scope-item-label">
                {label}
              </span>
            ) : null}
            <span className="truncate font-semibold text-[#d6d9e2]" data-hz-topology-scope-item-value-owner="hertzbeat-ui-scope-item-value">
              {value}
            </span>
          </span>
        );
      })}
      {actions.map(action => {
        const {
          id,
          label,
          emphasis = 'neutral',
          className: actionClassName,
          type,
          ...buttonProps
        } = action;
        return (
          <button
            key={id}
            {...buttonProps}
            type={type ?? 'button'}
            className={cn(
              'inline-flex h-7 items-center justify-center rounded-[3px] border px-3 text-[12px] font-semibold transition-colors',
              emphasis === 'primary'
                ? 'border-[#31405c] bg-[#182238] text-[#d8e4ff] hover:border-[#4e74f8]'
                : 'border-[#303542] bg-[#151821] text-[#dfe3ec] hover:border-[#4e74f8]',
              actionClassName
            )}
            data-hz-topology-scope-action={id}
            data-hz-topology-scope-action-owner="hertzbeat-ui-scope-action"
            data-hz-topology-scope-action-emphasis={emphasis}
          >
            {label}
          </button>
        );
      })}
    </section>
  );
}

export function HzTopologyNode({
  label,
  healthLabel,
  healthCopy,
  entityType,
  source,
  health,
  tone = 'success',
  focus = 'normal',
  evidenceBadges = [],
  redMetrics,
  position,
  healthMetaProps,
  className,
  style,
  ...props
}: HzTopologyNodeProps) {
  const positionedStyle = position
    ? {
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: position.size,
        height: position.size,
        transform: 'translate(-50%, -50%)',
        ...style
      }
    : style;
  const redMetricOwners = [
    { id: 'request-rate', value: formatTopologyNodeMetricAttribute(redMetrics?.requestRatePerSecond) },
    { id: 'error-rate', value: formatTopologyNodeMetricAttribute(redMetrics?.errorRate) },
    { id: 'latency-p95', value: formatTopologyNodeMetricAttribute(redMetrics?.latencyP95Ms) }
  ];

  return (
    <a
      {...props}
      className={cn(
        'absolute flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[4px] border px-2 py-1 text-center text-[12px] font-semibold shadow-[0_16px_48px_rgba(0,0,0,0.35)]',
        topologyNodeToneClassName[tone],
        topologyNodeFocusClassName[focus],
        className
      )}
      style={positionedStyle}
      data-hz-ui="topology-node"
      data-hz-topology-primitive="node"
      data-hz-topology-node-owner="hertzbeat-ui-node"
      data-hz-topology-node-tone={tone}
      data-hz-topology-node-focus={focus}
      data-hz-topology-node-entity-type={entityType}
      data-hz-topology-node-source={source}
      data-hz-topology-node-health={health}
      data-hz-topology-node-evidence-badges={evidenceBadges.length > 0 ? evidenceBadges.join(' ') : 'none'}
      data-hz-topology-node-request-rate={formatTopologyNodeMetricAttribute(redMetrics?.requestRatePerSecond)}
      data-hz-topology-node-error-rate={formatTopologyNodeMetricAttribute(redMetrics?.errorRate)}
      data-hz-topology-node-latency-p95-ms={formatTopologyNodeMetricAttribute(redMetrics?.latencyP95Ms)}
    >
      <span className="w-full truncate leading-tight" data-hz-topology-node-label-owner="hertzbeat-ui-node-label">
        {label}
      </span>
      {healthLabel ? (
        <span
          {...healthMetaProps}
          className={cn('w-full truncate text-[10px] font-medium leading-3 text-[#a9b0bb]', healthMetaProps?.className)}
          title={healthCopy}
          data-hz-topology-node-health-owner="hertzbeat-ui-node-health"
          data-hz-topology-node-health-label-owner="hertzbeat-ui-node-health-label"
          data-hz-topology-node-health-copy-owner="hertzbeat-ui-node-health-copy"
        >
          {healthLabel}
        </span>
      ) : null}
      <span className="sr-only" data-hz-topology-node-red-owner="hertzbeat-ui-node-red">
        {redMetricOwners.map(metric => (
          <span
            key={metric.id}
            data-hz-topology-node-red-metric={metric.id}
            data-hz-topology-node-red-metric-owner="hertzbeat-ui-node-red-metric"
          >
            {metric.value ?? 'unavailable'}
          </span>
        ))}
      </span>
      <span className="sr-only" data-hz-topology-node-badge-list-owner="hertzbeat-ui-node-badge-list">
        {(evidenceBadges.length > 0 ? evidenceBadges : ['none']).map(badge => (
          <span key={badge} data-hz-topology-node-badge={badge} data-hz-topology-node-badge-owner="hertzbeat-ui-node-badge">
            {badge}
          </span>
        ))}
      </span>
    </a>
  );
}

export type HzTopologyCanvasLayout = 'layered-service' | 'force' | 'grid-table';
export type HzTopologyCanvasInteractionMode = 'inspect' | 'focus' | 'pan-zoom';
export type HzTopologyCanvasHoverMode = 'none' | 'neighbor-highlight';
export type HzTopologyCanvasDrawerMode = 'none' | 'node' | 'edge' | 'node-edge';
export type HzTopologyCanvasFocusDepth = 'none' | '1-hop' | '2-hop' | 'auto';
export type HzTopologyCanvasMinHeight = 'compact' | 'workbench' | 'full';
export type HzTopologyCanvasInteractionScope = 'none' | 'hover-group';
export type HzTopologyCanvasBoundary = 'none' | 'section';
export type HzTopologyCanvasAnnotationPlacement = 'top-left' | 'top-right';
export type HzTopologyCanvasAnnotationVisibility = 'visible' | 'assistive';
export type HzTopologyWorkbenchDensity = 'compact' | 'roomy';
export type HzTopologyWorkbenchFrameBoundary = 'route' | 'section';

const topologyWorkbenchFrameBoundaryClassName: Record<HzTopologyWorkbenchFrameBoundary, string> = {
  route: '',
  section: 'border-t border-[var(--hz-ui-line-soft)]'
};

export type HzTopologyWorkbenchFrameProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType;
  density?: HzTopologyWorkbenchDensity;
  boundary?: HzTopologyWorkbenchFrameBoundary;
};

export function HzTopologyWorkbenchFrame({
  as: Component = 'section',
  density = 'compact',
  boundary = 'route',
  className,
  children,
  ...props
}: HzTopologyWorkbenchFrameProps) {
  return (
    <Component
      {...props}
      className={cn(
        'min-h-[calc(100vh-56px)] bg-[#08090c] text-[#f1f3f7]',
        density === 'compact' ? 'text-[13px]' : 'text-[14px]',
        topologyWorkbenchFrameBoundaryClassName[boundary],
        className
      )}
      data-hz-ui="topology-workbench-frame"
      data-hz-topology-primitive="workbench-frame"
      data-hz-topology-workbench-density={density}
      data-hz-topology-workbench-boundary={boundary}
      data-hz-topology-workbench-frame-boundary-owner="hertzbeat-ui-workbench-frame-boundary"
    >
      {children}
    </Component>
  );
}

export type HzTopologyWorkbenchHeaderDensity = 'standard' | 'operational-compact';
export type HzTopologyWorkbenchHeaderCopyVisibility = 'visible' | 'assistive';
export type HzTopologyWorkbenchHeaderBoundary = 'default' | 'none';

const topologyWorkbenchHeaderBoundaryClassName: Record<HzTopologyWorkbenchHeaderBoundary, string> = {
  default: 'border-b border-[#252832]',
  none: ''
};

export type HzTopologyWorkbenchHeaderProps = React.HTMLAttributes<HTMLElement> & {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  copy?: React.ReactNode;
  density?: HzTopologyWorkbenchHeaderDensity;
  copyVisibility?: HzTopologyWorkbenchHeaderCopyVisibility;
  boundary?: HzTopologyWorkbenchHeaderBoundary;
  scopeSlot?: React.ReactNode;
  sourceSlot?: React.ReactNode;
};

export function HzTopologyWorkbenchHeader({
  eyebrow,
  title,
  copy,
  density = 'standard',
  copyVisibility = density === 'operational-compact' ? 'assistive' : 'visible',
  boundary = 'default',
  scopeSlot,
  sourceSlot,
  className,
  children,
  ...props
}: HzTopologyWorkbenchHeaderProps) {
  const compact = density === 'operational-compact';
  return (
    <header
      {...props}
      className={cn(
        'bg-[#0b0c0f] px-4',
        topologyWorkbenchHeaderBoundaryClassName[boundary],
        compact ? 'grid gap-2 py-2' : 'py-4',
        className
      )}
      data-hz-ui="topology-workbench-header"
      data-hz-topology-primitive="workbench-header"
      data-hz-topology-workbench-header-owner="hertzbeat-ui-workbench-header"
      data-hz-topology-workbench-header-layout="title-scope-source"
      data-hz-topology-workbench-header-alignment="shared-control-grid"
      data-hz-topology-workbench-header-inset="16px"
      data-hz-topology-workbench-header-control-height="28px"
      data-hz-topology-workbench-header-density={density}
      data-hz-topology-workbench-header-density-owner="hertzbeat-ui-workbench-header-density"
      data-hz-topology-workbench-header-boundary={boundary}
      data-hz-topology-workbench-header-boundary-owner="hertzbeat-ui-workbench-header-boundary"
      data-hz-topology-workbench-copy-visibility={copyVisibility}
      data-hz-topology-workbench-eyebrow={eyebrow ? 'true' : 'false'}
      data-hz-topology-workbench-scope-slot={scopeSlot ? 'true' : 'false'}
      data-hz-topology-workbench-source-slot={sourceSlot ? 'true' : 'false'}
    >
      <div className={cn(compact ? 'grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start' : 'flex flex-wrap items-start justify-between gap-4')}>
        <div className={compact ? 'min-w-[180px]' : 'min-w-[260px]'}>
          {eyebrow ? (
            <div
              className={cn('font-semibold tracking-[0.12em] text-[#7e8494]', compact ? 'text-[10px]' : 'text-[11px]')}
              data-hz-topology-workbench-eyebrow-owner="hertzbeat-ui-workbench-eyebrow"
            >
              {eyebrow}
            </div>
          ) : null}
          <h1
            className={cn('font-semibold leading-tight text-[#f5f7fb]', compact ? 'mt-0.5 text-[20px]' : 'mt-1 text-[26px]')}
            data-hz-topology-workbench-title-owner="hertzbeat-ui-workbench-title"
          >
            {title}
          </h1>
          {copy ? (
            <p
              className={cn(
                copyVisibility === 'assistive'
                  ? 'sr-only'
                  : compact
                    ? 'mt-1 max-w-[520px] text-[12px] leading-5 text-[#8f99ab]'
                    : 'mt-2 max-w-[760px] text-[13px] leading-6 text-[#a9b0bb]'
              )}
              data-hz-topology-workbench-copy-owner="hertzbeat-ui-workbench-copy"
            >
              {copy}
            </p>
          ) : null}
        </div>
        {scopeSlot ? (
          <div className={cn('min-w-0', compact && 'lg:justify-self-end')} data-hz-topology-workbench-scope-slot-owner="hertzbeat-ui-workbench-scope-slot">
            {scopeSlot}
          </div>
        ) : null}
      </div>
      {sourceSlot ? (
        <div className={compact ? 'min-w-0' : 'mt-4'} data-hz-topology-workbench-source-slot-owner="hertzbeat-ui-workbench-source-slot">
          {sourceSlot}
        </div>
      ) : null}
      {children}
    </header>
  );
}

export type HzTopologyWorkbenchGridProps = React.HTMLAttributes<HTMLElement> & {
  layout?: 'canvas-companion' | 'canvas-only';
};

export type HzTopologyWorkbenchSlotKind = 'canvas' | 'companion';
export type HzTopologyWorkbenchSlotSurface = 'content' | 'placeholder';

export type HzTopologyWorkbenchSlotProps = React.HTMLAttributes<HTMLDivElement> & {
  kind: HzTopologyWorkbenchSlotKind;
  surface?: HzTopologyWorkbenchSlotSurface;
};

export function HzTopologyWorkbenchGrid({
  layout = 'canvas-companion',
  className,
  children,
  ...props
}: HzTopologyWorkbenchGridProps) {
  const canvasStickiness = layout === 'canvas-companion' ? 'sticky-with-companion' : 'none';
  return (
    <section
      {...props}
      className={cn(
        'grid min-h-[760px] bg-[#08090c]',
        layout === 'canvas-companion' ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : '',
        className
      )}
      data-hz-ui="topology-workbench-grid"
      data-hz-topology-primitive="workbench-grid"
      data-hz-topology-workbench-grid-owner="hertzbeat-ui-workbench-grid"
      data-hz-topology-workbench-grid-layout={layout}
      data-hz-topology-workbench-grid-canvas-stickiness={canvasStickiness}
      data-hz-topology-workbench-grid-canvas-stickiness-owner="hertzbeat-ui-workbench-grid-canvas-stickiness"
    >
      {children}
    </section>
  );
}

const topologyWorkbenchSlotSurfaceClassName: Record<HzTopologyWorkbenchSlotSurface, string> = {
  content: '',
  placeholder: 'min-h-[120px] border-t border-[var(--hz-ui-line-soft)] bg-[#08090c] px-3 py-2 text-[12px] text-[#8f99ab]'
};

const topologyWorkbenchSlotKindClassName: Record<HzTopologyWorkbenchSlotKind, string> = {
  canvas: 'min-w-0 lg:sticky lg:top-[64px] lg:self-start',
  companion: 'min-w-0'
};

export function HzTopologyWorkbenchSlot({
  kind,
  surface = 'content',
  className,
  children,
  ...props
}: HzTopologyWorkbenchSlotProps) {
  return (
    <div
      {...props}
      className={cn(
        topologyWorkbenchSlotKindClassName[kind],
        topologyWorkbenchSlotSurfaceClassName[surface],
        className
      )}
      data-hz-ui="topology-workbench-slot"
      data-hz-topology-primitive="workbench-slot"
      data-hz-topology-workbench-slot-owner="hertzbeat-ui-workbench-slot"
      data-hz-topology-workbench-slot-kind={kind}
      data-hz-topology-workbench-slot-surface={surface}
      data-hz-topology-workbench-slot-stickiness={kind === 'canvas' ? 'sticky-with-companion' : 'normal'}
    >
      {children}
    </div>
  );
}

export type HzTopologyCanvasProps = React.HTMLAttributes<HTMLElement> & {
  layout?: HzTopologyCanvasLayout;
  interactionMode?: HzTopologyCanvasInteractionMode;
  interactionScope?: HzTopologyCanvasInteractionScope;
  hoverMode?: HzTopologyCanvasHoverMode;
  drawerMode?: HzTopologyCanvasDrawerMode;
  focusDepth?: HzTopologyCanvasFocusDepth;
  minHeight?: HzTopologyCanvasMinHeight;
  boundary?: HzTopologyCanvasBoundary;
};

const topologyCanvasMinHeightClassName: Record<HzTopologyCanvasMinHeight, string> = {
  compact: 'min-h-[220px]',
  workbench: 'min-h-[680px]',
  full: 'min-h-[760px]'
};

const topologyCanvasInteractionScopeClassName: Record<HzTopologyCanvasInteractionScope, string> = {
  none: '',
  'hover-group': 'group'
};

const topologyCanvasBoundaryClassName: Record<HzTopologyCanvasBoundary, string> = {
  none: '',
  section: 'border-t border-[var(--hz-ui-line-soft)]'
};

export function HzTopologyCanvas({
  layout = 'layered-service',
  interactionMode = 'inspect',
  interactionScope = 'none',
  hoverMode = 'none',
  drawerMode = 'none',
  focusDepth = 'auto',
  minHeight = 'workbench',
  boundary = 'none',
  className,
  children,
  ...props
}: HzTopologyCanvasProps) {
  return (
    <section
      {...props}
      className={cn(
        'relative min-w-0 overflow-hidden bg-[#08090c]',
        topologyCanvasMinHeightClassName[minHeight],
        topologyCanvasInteractionScopeClassName[interactionScope],
        topologyCanvasBoundaryClassName[boundary],
        className
      )}
      data-hz-ui="topology-canvas"
      data-hz-topology-primitive="canvas"
      data-hz-topology-canvas-layout={layout}
      data-hz-topology-canvas-layout-owner="hertzbeat-ui-canvas-layout"
      data-hz-topology-canvas-interaction-mode={interactionMode}
      data-hz-topology-canvas-interaction-owner="hertzbeat-ui-canvas-interaction"
      data-hz-topology-canvas-interaction-scope={interactionScope}
      data-hz-topology-canvas-interaction-scope-owner="hertzbeat-ui-canvas-interaction-scope"
      data-hz-topology-canvas-hover-mode={hoverMode}
      data-hz-topology-canvas-drawer-mode={drawerMode}
      data-hz-topology-canvas-focus-depth={focusDepth}
      data-hz-topology-canvas-min-height={minHeight}
      data-hz-topology-canvas-min-height-owner="hertzbeat-ui-canvas-min-height"
      data-hz-topology-canvas-boundary={boundary}
      data-hz-topology-canvas-boundary-owner="hertzbeat-ui-canvas-boundary"
    >
      {children}
    </section>
  );
}

export type HzTopologyCanvasAnnotationProps = React.HTMLAttributes<HTMLDivElement> & {
  title: React.ReactNode;
  copy?: React.ReactNode;
  placement?: HzTopologyCanvasAnnotationPlacement;
  visibility?: HzTopologyCanvasAnnotationVisibility;
};

const topologyCanvasAnnotationPlacementClassName: Record<HzTopologyCanvasAnnotationPlacement, string> = {
  'top-left': 'left-3 top-3 sm:left-4 sm:top-4',
  'top-right': 'right-3 top-3 sm:right-4 sm:top-4'
};

export function HzTopologyCanvasAnnotation({
  title,
  copy,
  placement = 'top-left',
  visibility = 'visible',
  className,
  ...props
}: HzTopologyCanvasAnnotationProps) {
  const isAssistive = visibility === 'assistive';
  return (
    <div
      {...props}
      className={cn(
        isAssistive
          ? 'sr-only'
          : 'pointer-events-none absolute z-10 grid max-w-[260px] gap-0.5 border border-[var(--hz-ui-line-soft)] bg-[rgba(8,9,12,0.84)] px-2.5 py-1.5 text-[11px] text-[#8f99ab] shadow-[0_10px_28px_rgba(0,0,0,0.24)] backdrop-blur',
        isAssistive ? null : topologyCanvasAnnotationPlacementClassName[placement],
        className
      )}
      data-hz-ui="topology-canvas-annotation"
      data-hz-topology-primitive="canvas-annotation"
      data-hz-topology-canvas-annotation-owner="hertzbeat-ui-canvas-annotation"
      data-hz-topology-canvas-annotation-placement={placement}
      data-hz-topology-canvas-annotation-visibility={visibility}
      data-hz-topology-canvas-annotation-occlusion={isAssistive ? 'none' : 'overlay'}
      data-hz-topology-canvas-annotation-hit-test="pass-through"
    >
      <span className="truncate font-semibold text-[#dbe4f0]" data-hz-topology-canvas-annotation-title-owner="hertzbeat-ui-canvas-annotation-title">
        {title}
      </span>
      {copy ? (
        <span className="truncate font-mono text-[10px] text-[#727b8c]" data-hz-topology-canvas-annotation-copy-owner="hertzbeat-ui-canvas-annotation-copy">
          {copy}
        </span>
      ) : null}
    </div>
  );
}

export type HzTopologyGraphLayerProps = React.SVGAttributes<SVGSVGElement> & {
  layer?: 'svg-edge-layer';
};

export function HzTopologyGraphLayer({
  layer = 'svg-edge-layer',
  className,
  children,
  viewBox = '0 0 100 100',
  preserveAspectRatio = 'none',
  ...props
}: HzTopologyGraphLayerProps) {
  return (
    <svg
      {...props}
      className={cn('absolute inset-0 h-full w-full', className)}
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      aria-hidden={props['aria-hidden'] ?? true}
      data-hz-ui="topology-graph-layer"
      data-hz-topology-primitive="graph-layer"
      data-hz-topology-graph-layer={layer}
      data-hz-topology-graph-layer-owner="hertzbeat-ui-graph-layer"
    >
      {children}
    </svg>
  );
}

export type HzTopologyToolbarOption = {
  value: string;
  label: string;
};

export type HzTopologyToolbarStateItem = React.HTMLAttributes<HTMLSpanElement> & {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: HzStatusTone;
};

export type HzTopologyToolbarBoundary = 'none' | 'default' | 'section';
export type HzTopologyToolbarDensity = 'compact' | 'graph-first';

const topologyToolbarBoundaryClassName: Record<HzTopologyToolbarBoundary, string> = {
  none: '',
  default: 'border-b border-[var(--hz-ui-line-soft)]',
  section: 'border-y border-[var(--hz-ui-line-soft)]'
};

export type HzTopologyToolbarProps = Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> & {
  environmentLabel: string;
  environmentValue: string;
  environmentOptions: HzTopologyToolbarOption[];
  searchLabel: string;
  searchPlaceholder?: string;
  searchValue?: string;
  sourceKindLabel?: string;
  sourceKindValue?: string;
  sourceKindOptions?: HzTopologyToolbarOption[];
  fitLabel?: React.ReactNode;
  locateLabel?: React.ReactNode;
  depthLabel?: string;
  depthValue?: string;
  depthOptions?: HzTopologyToolbarOption[];
  layoutLabel?: string;
  layoutValue?: string;
  layoutOptions?: HzTopologyToolbarOption[];
  groupByLabel?: string;
  groupByValue?: string;
  groupByOptions?: HzTopologyToolbarOption[];
  resetLabel?: React.ReactNode;
  resetHref?: string;
  summaryLabel: React.ReactNode;
  summaryItems?: React.ReactNode[];
  stateLabel?: React.ReactNode;
  stateItems?: HzTopologyToolbarStateItem[];
  onEnvironmentChange?: (value: string) => void;
  onSourceKindChange?: (value: string) => void;
  onDepthChange?: (value: string) => void;
  onLayoutChange?: (value: string) => void;
  onGroupByChange?: (value: string) => void;
  onSearchChange?: React.ChangeEventHandler<HTMLInputElement>;
  onFit?: React.MouseEventHandler<HTMLButtonElement>;
  onLocate?: React.MouseEventHandler<HTMLButtonElement>;
  onReset?: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  boundary?: HzTopologyToolbarBoundary;
  density?: HzTopologyToolbarDensity;
};

export function HzTopologyToolbar({
  environmentLabel,
  environmentValue,
  environmentOptions,
  searchLabel,
  searchPlaceholder,
  searchValue,
  sourceKindLabel,
  sourceKindValue,
  sourceKindOptions = [],
  fitLabel,
  locateLabel,
  depthLabel,
  depthValue,
  depthOptions = [],
  layoutLabel,
  layoutValue,
  layoutOptions = [],
  groupByLabel,
  groupByValue,
  groupByOptions = [],
  resetLabel,
  resetHref,
  summaryLabel,
  summaryItems = [],
  stateLabel,
  stateItems = [],
  onEnvironmentChange,
  onSourceKindChange,
  onDepthChange,
  onLayoutChange,
  onGroupByChange,
  onSearchChange,
  onFit,
  onLocate,
  onReset,
  boundary = 'default',
  density = 'compact',
  className,
  ...props
}: HzTopologyToolbarProps) {
  const graphFirst = density === 'graph-first';
  const hasSourceKindControl = sourceKindOptions.length > 0;
  const hasLayoutControl = !graphFirst && layoutOptions.length > 0;
  const hasCanvasTextActions = !graphFirst && (Boolean(fitLabel) || Boolean(locateLabel));
  const hasScopeControls = depthOptions.length > 0 || hasLayoutControl || groupByOptions.length > 0 || Boolean(resetLabel);
  const secondaryVisibility = graphFirst ? 'assistive' : 'visible';
  const controlStripLayout = graphFirst ? 'inline-overflow' : 'stacked-grid';
  const controlStripDisplay = graphFirst ? 'contents' : 'grid';
  const chrome = graphFirst && boundary === 'none' ? 'frameless' : 'surface';
  const selectTriggerClassName = graphFirst ? 'h-7 !gap-1.5 !px-2' : 'h-8';

  return (
    <section
      {...props}
      className={cn(
        'min-w-0',
        chrome === 'frameless' ? 'bg-transparent' : 'bg-[var(--hz-ui-surface)]',
        graphFirst
          ? 'grid items-center gap-1.5 overflow-x-auto px-0 py-1 [grid-template-columns:112px_minmax(260px,1fr)_148px_88px_132px_auto]'
          : 'grid gap-2 px-4 py-2 lg:grid-cols-[180px_minmax(0,1fr)_104px_104px]',
        topologyToolbarBoundaryClassName[boundary],
        className
      )}
      data-hz-ui="topology-toolbar"
      data-hz-topology-primitive="toolbar"
      data-hz-topology-toolbar-density={density}
      data-hz-topology-toolbar-density-owner="hertzbeat-ui-toolbar-density"
      data-hz-topology-toolbar-first-viewport-priority={graphFirst ? 'canvas' : 'balanced'}
      data-hz-topology-toolbar-first-viewport-owner="hertzbeat-ui-toolbar-first-viewport"
      data-hz-topology-toolbar-row-contract={graphFirst ? 'single-row-overflow' : 'multi-row-grid'}
      data-hz-topology-toolbar-row-contract-owner="hertzbeat-ui-toolbar-row-contract"
      data-hz-topology-toolbar-alignment={graphFirst ? 'flush-control-grid' : 'stacked-grid'}
      data-hz-topology-toolbar-inset={graphFirst ? '0px' : '16px'}
      data-hz-topology-toolbar-control-height={graphFirst ? '28px' : '32px'}
      data-hz-topology-toolbar-select-padding={graphFirst ? 'compact-flush' : 'default'}
      data-hz-topology-toolbar-row-separator={graphFirst ? 'none' : 'soft'}
      data-hz-topology-toolbar-control-gap={graphFirst ? '6px' : '8px'}
      data-hz-topology-toolbar-control-flow={graphFirst ? 'single-grid-row' : 'stacked-grid'}
      data-hz-topology-toolbar-empty-offset={graphFirst ? 'none' : undefined}
      data-hz-topology-toolbar-visual-weight={graphFirst ? 'low-interruption' : 'balanced'}
      data-hz-topology-toolbar-visual-weight-owner="hertzbeat-ui-toolbar-visual-weight"
      data-hz-topology-toolbar-secondary-visibility={secondaryVisibility}
      data-hz-topology-toolbar-secondary-visibility-owner="hertzbeat-ui-toolbar-secondary-visibility"
      data-hz-topology-toolbar-boundary={boundary}
      data-hz-topology-toolbar-boundary-owner="hertzbeat-ui-toolbar-boundary"
      data-hz-topology-toolbar-action-policy={graphFirst ? 'scope-controls-only' : 'scope-and-canvas-actions'}
      data-hz-topology-toolbar-canvas-action-policy={graphFirst ? 'in-canvas-g6-toolbar' : 'toolbar-buttons'}
      data-hz-topology-toolbar-chrome={chrome}
      data-hz-topology-toolbar-frame={chrome === 'frameless' ? 'none' : undefined}
    >
      <HzSelect
        aria-label={environmentLabel}
        data-hz-topology-control="environment"
        data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
        options={environmentOptions}
        value={environmentValue}
        onChange={event => onEnvironmentChange?.(event.currentTarget.value)}
        className={graphFirst ? 'w-[112px] min-w-0' : undefined}
        triggerClassName={selectTriggerClassName}
      />
      <HzInput
        aria-label={searchLabel}
        data-hz-topology-control="search"
        data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
        placeholder={searchPlaceholder}
        value={searchValue ?? ''}
        onChange={onSearchChange}
        readOnly={!onSearchChange}
        className={graphFirst ? 'h-7 min-w-[220px] w-full' : undefined}
      />
      {hasSourceKindControl ? (
        <HzSelect
          aria-label={sourceKindLabel}
          data-hz-topology-control="source-kind"
          data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
          data-hz-topology-control-source-kind-owner="hertzbeat-ui-toolbar-source-kind-control"
          data-hz-topology-control-source-kind-value={sourceKindValue}
          options={sourceKindOptions}
          value={sourceKindValue}
          onChange={event => onSourceKindChange?.(event.currentTarget.value)}
          className={graphFirst ? 'w-[148px] shrink-0' : undefined}
          triggerClassName={selectTriggerClassName}
        />
      ) : null}
      {hasCanvasTextActions && fitLabel ? (
        <HzButton
          type="button"
          size="sm"
          data-hz-topology-control="fit-view"
          data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
          onClick={onFit}
        >
          {fitLabel}
        </HzButton>
      ) : null}
      {hasCanvasTextActions && locateLabel ? (
        <HzButton
          type="button"
          size="sm"
          intent="primary"
          data-hz-topology-control="locate-entity"
          data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
          onClick={onLocate}
        >
          {locateLabel}
        </HzButton>
      ) : null}
      {hasScopeControls ? (
        <div
          className={cn(
            graphFirst
              ? 'contents'
              : 'grid min-w-0 border-t border-[var(--hz-ui-line-faint)] sm:grid-cols-2 lg:col-span-4',
            graphFirst ? '' : 'gap-2 pt-2 xl:grid-cols-[120px_160px_160px_auto]'
          )}
          data-hz-topology-toolbar-control-strip={graphFirst ? 'source-depth-group-reset' : 'depth-layout-group-reset'}
          data-hz-topology-toolbar-control-strip-owner="hertzbeat-ui-toolbar-control-strip"
          data-hz-topology-toolbar-control-strip-layout={controlStripLayout}
          data-hz-topology-toolbar-control-strip-display={controlStripDisplay}
          data-hz-topology-toolbar-control-strip-layout-owner="hertzbeat-ui-toolbar-control-strip-layout"
        >
          {depthOptions.length > 0 ? (
            <HzSelect
              aria-label={depthLabel}
              data-hz-topology-control="depth"
              data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
              data-hz-topology-control-depth-owner="hertzbeat-ui-toolbar-depth-control"
              data-hz-topology-control-depth-value={depthValue}
              options={depthOptions}
              value={depthValue}
              onChange={event => onDepthChange?.(event.currentTarget.value)}
              className={graphFirst ? 'w-[88px] shrink-0' : undefined}
              triggerClassName={selectTriggerClassName}
            />
          ) : null}
          {hasLayoutControl ? (
            <HzSelect
              aria-label={layoutLabel}
              data-hz-topology-control="layout"
              data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
              data-hz-topology-control-layout-owner="hertzbeat-ui-toolbar-layout-control"
              data-hz-topology-control-layout-value={layoutValue}
              options={layoutOptions}
              value={layoutValue}
              onChange={event => onLayoutChange?.(event.currentTarget.value)}
              className={graphFirst ? 'w-[132px] shrink-0' : undefined}
              triggerClassName={selectTriggerClassName}
            />
          ) : null}
          {groupByOptions.length > 0 ? (
            <HzSelect
              aria-label={groupByLabel}
              data-hz-topology-control="group-by"
              data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
              data-hz-topology-control-group-owner="hertzbeat-ui-toolbar-group-control"
              data-hz-topology-control-group-value={groupByValue}
              options={groupByOptions}
              value={groupByValue}
              onChange={event => onGroupByChange?.(event.currentTarget.value)}
              className={graphFirst ? 'w-[132px] shrink-0' : undefined}
              triggerClassName={selectTriggerClassName}
            />
          ) : null}
          {resetLabel && resetHref ? (
            <HzButtonLink
              href={resetHref}
              size="sm"
              onClick={onReset as React.MouseEventHandler<HTMLAnchorElement>}
              data-hz-topology-control="reset-scope"
              data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
              data-hz-topology-control-reset-owner="hertzbeat-ui-toolbar-reset-control"
            >
              {resetLabel}
            </HzButtonLink>
          ) : resetLabel ? (
            <HzButton
              type="button"
              size="sm"
              onClick={onReset as React.MouseEventHandler<HTMLButtonElement>}
              data-hz-topology-control="reset-scope"
              data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"
              data-hz-topology-control-reset-owner="hertzbeat-ui-toolbar-reset-control"
            >
              {resetLabel}
            </HzButton>
          ) : null}
        </div>
      ) : null}
      <div
        className={cn(
          'flex min-w-0 flex-wrap items-center gap-2 text-[12px] text-[#8f99ab]',
          graphFirst ? '' : 'lg:col-span-4',
          graphFirst ? 'sr-only' : ''
        )}
        data-hz-topology-toolbar-summary="incoming-context"
        data-hz-topology-toolbar-summary-visibility={secondaryVisibility}
        data-hz-topology-toolbar-summary-owner="hertzbeat-ui-toolbar-summary"
      >
        <span className="font-semibold text-[#d6d9e2]" data-hz-topology-toolbar-summary-label-owner="hertzbeat-ui-toolbar-summary-label">
          {summaryLabel}
        </span>
        {summaryItems.map((item, index) => (
          <span
            key={index}
            data-hz-topology-summary-item={index}
            data-hz-topology-summary-item-owner="hertzbeat-ui-toolbar-summary-item"
          >
            {item}
          </span>
        ))}
      </div>
      {stateItems.length > 0 ? (
        <div
          className={cn(
            'flex min-w-0 flex-wrap items-center gap-2 border-t border-[var(--hz-ui-line-faint)] pt-2 text-[11px]',
            graphFirst ? '' : 'lg:col-span-4',
            graphFirst ? 'sr-only border-0 pt-0' : ''
          )}
          data-hz-topology-toolbar-state={stateItems.map(item => item.id).join('-')}
          data-hz-topology-toolbar-state-visibility={secondaryVisibility}
          data-hz-topology-toolbar-state-owner="hertzbeat-ui-toolbar-state"
          data-hz-topology-state-label={typeof stateLabel === 'string' ? stateLabel : undefined}
        >
          {stateLabel ? (
            <span
              className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#727b8c]"
              data-hz-topology-state-label-owner="hertzbeat-ui-toolbar-state-label"
            >
              {stateLabel}
            </span>
          ) : null}
          {stateItems.map(item => {
            const {
              id,
              label,
              value,
              tone = 'neutral',
              className: itemClassName,
              ...itemProps
            } = item;
            const toneColor = chartToneColor[tone];
            return (
              <span
                key={id}
                {...itemProps}
                className={cn(
                  'inline-flex h-6 min-w-0 items-center gap-1.5 border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-control)] px-2 text-[#d6d9e2]',
                  itemClassName
                )}
                data-hz-topology-state-item={id}
                data-hz-topology-state-item-tone={tone}
                data-hz-topology-state-item-owner="hertzbeat-ui-toolbar-state-item"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0"
                  style={{ backgroundColor: toneColor.stroke }}
                  aria-hidden="true"
                  data-hz-topology-state-indicator-owner="hertzbeat-ui-toolbar-state-indicator"
                />
                <span className="truncate text-[#727b8c]" data-hz-topology-state-item-label-owner="hertzbeat-ui-toolbar-state-item-label">
                  {label}
                </span>
                <span className="min-w-0 truncate font-semibold" data-hz-topology-state-item-value-owner="hertzbeat-ui-toolbar-state-item-value">
                  {value}
                </span>
              </span>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export type HzTopologyEmptyStateBoundary = 'default' | 'flush' | 'canvas';
export type HzTopologyEmptyStateCopyVisibility = 'visible' | 'assistive';

const topologyEmptyStateBoundaryClassNames: Record<HzTopologyEmptyStateBoundary, string> = {
  default: 'border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] shadow-[0_16px_48px_rgba(0,0,0,0.28)]',
  flush: 'border-y border-x-0 border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] shadow-[0_16px_48px_rgba(0,0,0,0.28)]',
  canvas: 'border-0 bg-transparent shadow-none'
};

export type HzTopologyEmptyStateProps = React.HTMLAttributes<HTMLElement> & {
  title: React.ReactNode;
  copy: React.ReactNode;
  sourceLabel?: React.ReactNode;
  timeScope?: React.ReactNode;
  environment?: string;
  sourceKind?: string;
  relationType?: string;
  focusEntityId?: string;
  depth?: number | string;
  resultCount?: number;
  evidenceSources?: string[];
  kind?: 'api-empty' | 'degraded' | 'filtered-empty';
  placement?: 'inline' | 'canvas-center';
  boundary?: HzTopologyEmptyStateBoundary;
  copyVisibility?: HzTopologyEmptyStateCopyVisibility;
};

export function HzTopologyEmptyState({
  title,
  copy,
  sourceLabel,
  timeScope,
  environment,
  sourceKind,
  relationType,
  focusEntityId,
  depth,
  resultCount,
  evidenceSources,
  kind = 'api-empty',
  placement = 'inline',
  boundary = 'default',
  copyVisibility = 'visible',
  className,
  ...props
}: HzTopologyEmptyStateProps) {
  const normalizedEvidenceSources = evidenceSources && evidenceSources.length > 0 ? evidenceSources.join(' ') : 'none';

  return (
    <section
      {...props}
      className={cn(
        'grid min-w-0 px-4 py-4 text-center',
        topologyEmptyStateBoundaryClassNames[boundary],
        placement === 'canvas-center'
          ? 'absolute left-1/2 top-1/2 w-[min(420px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2'
          : 'w-full',
        className
      )}
      data-hz-ui="topology-empty-state"
      data-hz-topology-primitive="empty-state"
      data-hz-topology-empty-kind={kind}
      data-hz-topology-empty-boundary={boundary}
      data-hz-topology-empty-boundary-owner="hertzbeat-ui-empty-boundary"
      data-hz-topology-empty-boundary-visual={boundary === 'canvas' ? 'frameless-canvas' : 'surface'}
      data-hz-topology-empty-placement={placement}
      data-hz-topology-empty-source={sourceLabel}
      data-hz-topology-empty-time-scope={timeScope}
      data-hz-topology-empty-scope-owner="hertzbeat-ui-empty-scope"
      data-hz-topology-empty-environment={environment ?? 'all'}
      data-hz-topology-empty-source-kind={sourceKind ?? 'all'}
      data-hz-topology-empty-relation-type={relationType ?? 'all'}
      data-hz-topology-empty-focus-entity-id={focusEntityId ?? 'none'}
      data-hz-topology-empty-depth={depth ?? 'unknown'}
      data-hz-topology-empty-result-count={typeof resultCount === 'number' ? resultCount : 'unknown'}
      data-hz-topology-empty-evidence-sources={normalizedEvidenceSources}
      data-hz-topology-empty-copy-visibility={copyVisibility}
    >
      <div className="text-[13px] font-semibold text-[#f3f6fb]" data-hz-topology-empty-title-owner="hertzbeat-ui-empty-title">
        {title}
      </div>
      <div
        className={cn(
          copyVisibility === 'assistive' ? 'sr-only' : 'mt-2 text-[12px] leading-5 text-[#8f99ab]'
        )}
        data-hz-topology-empty-copy-owner="hertzbeat-ui-empty-copy"
      >
        {copy}
      </div>
      {sourceLabel || timeScope ? (
        <div
          className="mt-3 flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]"
          data-hz-topology-empty-meta-owner="hertzbeat-ui-empty-meta"
        >
          {sourceLabel ? (
            <span className="truncate" data-hz-topology-empty-source-owner="hertzbeat-ui-empty-source">
              {sourceLabel}
            </span>
          ) : null}
          {timeScope ? (
            <span className="truncate" data-hz-topology-empty-time-scope-owner="hertzbeat-ui-empty-time-scope">
              {timeScope}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export type HzTopologyLoadingStateProps = React.HTMLAttributes<HTMLElement> & {
  title: React.ReactNode;
  copy: React.ReactNode;
  sourceLabel?: React.ReactNode;
  timeScope?: React.ReactNode;
  environment?: string;
  sourceKind?: string;
  relationType?: string;
  focusEntityId?: string;
  depth?: number | string;
  evidenceSources?: string[];
  rows?: number;
  placement?: 'inline' | 'canvas-center';
  boundary?: HzTopologyEmptyStateBoundary;
};

export function HzTopologyLoadingState({
  title,
  copy,
  sourceLabel,
  timeScope,
  environment,
  sourceKind,
  relationType,
  focusEntityId,
  depth,
  evidenceSources,
  rows = 3,
  placement = 'inline',
  boundary = 'default',
  className,
  ...props
}: HzTopologyLoadingStateProps) {
  const normalizedEvidenceSources = evidenceSources && evidenceSources.length > 0 ? evidenceSources.join(' ') : 'none';
  const skeletonRows = Array.from({ length: Math.max(1, Math.min(6, Math.floor(rows))) });

  return (
    <section
      {...props}
      className={cn(
        'grid min-w-0 px-4 py-4 text-center',
        topologyEmptyStateBoundaryClassNames[boundary],
        placement === 'canvas-center'
          ? 'absolute left-1/2 top-1/2 w-[min(420px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2'
          : 'w-full',
        className
      )}
      data-hz-ui="topology-loading-state"
      data-hz-topology-primitive="loading-state"
      data-hz-topology-loading-boundary={boundary}
      data-hz-topology-loading-boundary-owner="hertzbeat-ui-loading-boundary"
      data-hz-topology-loading-placement={placement}
      data-hz-topology-loading-source={sourceLabel}
      data-hz-topology-loading-time-scope={timeScope}
      data-hz-topology-loading-scope-owner="hertzbeat-ui-loading-scope"
      data-hz-topology-loading-environment={environment ?? 'all'}
      data-hz-topology-loading-source-kind={sourceKind ?? 'all'}
      data-hz-topology-loading-relation-type={relationType ?? 'all'}
      data-hz-topology-loading-focus-entity-id={focusEntityId ?? 'none'}
      data-hz-topology-loading-depth={depth ?? 'unknown'}
      data-hz-topology-loading-evidence-sources={normalizedEvidenceSources}
    >
      <div className="text-[13px] font-semibold text-[#f3f6fb]" data-hz-topology-loading-title-owner="hertzbeat-ui-loading-title">
        {title}
      </div>
      <div className="mt-2 text-[12px] leading-5 text-[#8f99ab]" data-hz-topology-loading-copy-owner="hertzbeat-ui-loading-copy">
        {copy}
      </div>
      {sourceLabel || timeScope ? (
        <div
          className="mt-3 flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]"
          data-hz-topology-loading-meta-owner="hertzbeat-ui-loading-meta"
        >
          {sourceLabel ? (
            <span className="truncate" data-hz-topology-loading-source-owner="hertzbeat-ui-loading-source">
              {sourceLabel}
            </span>
          ) : null}
          {timeScope ? (
            <span className="truncate" data-hz-topology-loading-time-scope-owner="hertzbeat-ui-loading-time-scope">
              {timeScope}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 grid gap-2" data-hz-topology-loading-skeleton-owner="hertzbeat-ui-loading-skeleton">
        {skeletonRows.map((_, index) => (
          <div
            key={index}
            className="h-2 rounded-[2px] bg-[rgba(126,132,148,0.22)]"
            style={{ width: `${100 - index * 14}%` }}
            data-hz-topology-loading-row={index + 1}
            data-hz-topology-skeleton-row-owner="hertzbeat-ui-loading-row"
          />
        ))}
      </div>
    </section>
  );
}

export type HzTopologyCompanionRailDensity = 'compact' | 'roomy';
export type HzTopologyCompanionRailPlacement = 'side' | 'stack';
export type HzTopologyCompanionRailBoundary = 'side' | 'stack-section' | 'none';
export type HzTopologyCompanionRailPriority = 'balanced' | 'graph-first';
export type HzTopologyCompanionRailStickyContext = 'none' | 'first-section' | 'jump-list';
export type HzTopologyCompanionSectionDensity = 'compact' | 'graph-first';
export type HzTopologyCompanionJumpListDensity = 'compact' | 'graph-first';
export type HzTopologyCompanionJumpListActiveMode = 'manual' | 'contained-rail-scroll';

export type HzTopologyCompanionSectionProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
  sectionId: string;
  anchorId?: string;
  density?: HzTopologyCompanionSectionDensity;
  collapsible?: boolean;
  collapsed?: boolean;
  collapseLabel?: React.ReactNode;
  expandLabel?: React.ReactNode;
  onCollapsedChange?: (collapsed: boolean) => void;
};

export type HzTopologySectionLabelProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  density?: 'compact' | 'roomy';
};

export type HzTopologyCompanionJumpListItem = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & {
  id: string;
  href: string;
  label: React.ReactNode;
  active?: boolean;
};

export type HzTopologyCompanionJumpListProps = React.HTMLAttributes<HTMLElement> & {
  items: HzTopologyCompanionJumpListItem[];
  density?: HzTopologyCompanionJumpListDensity;
  activeMode?: HzTopologyCompanionJumpListActiveMode;
  activeResetKey?: string | number;
  ariaLabel?: string;
};

export function HzTopologySectionLabel({
  children,
  density = 'compact',
  className,
  ...rest
}: HzTopologySectionLabelProps) {
  return (
    <div
      {...rest}
      className={cn(
        'min-w-0 truncate font-semibold tracking-[0.12em] text-[#7e8494]',
        density === 'compact' ? 'text-[12px]' : 'text-[13px]',
        className
      )}
      data-hz-ui="topology-section-label"
      data-hz-topology-primitive="section-label"
      data-hz-topology-section-label-density={density}
      data-hz-topology-section-label-owner="hertzbeat-ui-section-label"
      data-hz-topology-section-label-text-owner="hertzbeat-ui-section-label-text"
    >
      {children}
    </div>
  );
}

export function HzTopologyCompanionSection({
  children,
  sectionId,
  anchorId = sectionId,
  density = 'compact',
  collapsible = false,
  collapsed = false,
  collapseLabel = 'Collapse',
  expandLabel = 'Expand',
  onCollapsedChange,
  className,
  ...rest
}: HzTopologyCompanionSectionProps) {
  const isCollapsed = collapsible ? collapsed : false;
  const bodyId = `${anchorId}-body`;

  return (
    <section
      {...rest}
      id={anchorId}
      className={cn(
        'min-w-0 scroll-mt-2',
        density === 'graph-first' ? '[&>*+*]:mt-2' : '[&>*+*]:mt-3',
        className
      )}
      data-hz-ui="topology-companion-section"
      data-hz-topology-primitive="companion-section"
      data-hz-topology-companion-section-id={sectionId}
      data-hz-topology-companion-section-anchor={anchorId}
      data-hz-topology-companion-section-owner="hertzbeat-ui-companion-section"
      data-hz-topology-companion-section-anchor-owner="hertzbeat-ui-companion-section-anchor"
      data-hz-topology-companion-section-density={density}
      data-hz-topology-companion-section-collapsible={collapsible ? 'true' : 'false'}
      data-hz-topology-companion-section-collapsed={isCollapsed ? 'true' : 'false'}
    >
      {collapsible ? (
        <>
          <button
            type="button"
            className={cn(
              'flex h-6 w-full min-w-0 items-center justify-between gap-2 border border-[rgba(126,132,148,0.26)] bg-[rgba(11,16,26,0.78)] px-2 text-left text-[11px] font-semibold text-[#98a2b3] transition-colors hover:border-[rgba(99,127,236,0.58)] hover:text-[#dbe4f0] focus-visible:border-[#5c7cfa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(92,124,250,0.24)]',
              density === 'graph-first' ? 'tracking-[0.08em]' : 'tracking-[0.06em]'
            )}
            aria-controls={bodyId}
            aria-expanded={!isCollapsed}
            data-hz-topology-companion-section-toggle-owner="hertzbeat-ui-companion-section-toggle"
            data-hz-topology-companion-section-toggle-state={isCollapsed ? 'collapsed' : 'expanded'}
            onClick={() => onCollapsedChange?.(!isCollapsed)}
          >
            <span className="min-w-0 truncate" data-hz-topology-companion-section-toggle-label-owner="hertzbeat-ui-companion-section-toggle-label">
              {isCollapsed ? expandLabel : collapseLabel}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={cn('h-3 w-3 shrink-0 transition-transform', isCollapsed ? '-rotate-90' : 'rotate-0')}
              data-hz-topology-companion-section-toggle-icon-owner="hertzbeat-ui-companion-section-toggle-icon"
            />
          </button>
          <div
            id={bodyId}
            hidden={isCollapsed}
            data-hz-topology-companion-section-body-owner="hertzbeat-ui-companion-section-body"
            data-hz-topology-companion-section-body-state={isCollapsed ? 'collapsed' : 'expanded'}
          >
            {children}
          </div>
        </>
      ) : (
        children
      )}
    </section>
  );
}

export function HzTopologyCompanionJumpList({
  items,
  density = 'compact',
  activeMode = 'manual',
  activeResetKey,
  ariaLabel = 'Topology companion sections',
  className,
  ...rest
}: HzTopologyCompanionJumpListProps) {
  const jumpListRef = React.useRef<HTMLElement | null>(null);
  const manualActiveId = React.useMemo(() => items.find(item => item.active)?.id, [items]);
  const manualActiveHref = items.find(item => item.id === manualActiveId)?.href;
  const [scrollActiveId, setScrollActiveId] = React.useState<string | undefined>();
  const resolvedActiveId = activeMode === 'contained-rail-scroll' ? (scrollActiveId ?? manualActiveId) : manualActiveId;
  const didRunSelectionSyncRef = React.useRef(false);

  React.useEffect(() => {
    if (activeMode !== 'contained-rail-scroll') {
      didRunSelectionSyncRef.current = false;
      return;
    }
    const shouldSyncLocation = didRunSelectionSyncRef.current && activeResetKey !== undefined;
    didRunSelectionSyncRef.current = true;
    setScrollActiveId(undefined);
    if (!manualActiveHref?.startsWith('#') || typeof document === 'undefined') return;
    const jumpList = jumpListRef.current;
    const rail = jumpList?.closest<HTMLElement>('[data-hz-ui="topology-companion-rail"][data-hz-topology-companion-scroll="contained"]');
    const target = document.getElementById(manualActiveHref.slice(1));
    if (!jumpList || !rail || !target || !rail.contains(target)) return;
    const railRect = rail.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const jumpListHeight = jumpList.getBoundingClientRect().height;
    const targetTop = Math.max(0, rail.scrollTop + targetRect.top - railRect.top - jumpListHeight - 8);
    if (typeof rail.scrollTo === 'function') {
      rail.scrollTo({ top: targetTop, behavior: 'auto' });
    } else {
      rail.scrollTop = targetTop;
    }
    if (shouldSyncLocation && typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${manualActiveHref}`);
    }
  }, [activeMode, activeResetKey, manualActiveHref, manualActiveId]);

  React.useEffect(() => {
    if (activeMode !== 'contained-rail-scroll' || typeof document === 'undefined') return undefined;
    const jumpList = jumpListRef.current;
    const rail = jumpList?.closest<HTMLElement>('[data-hz-ui="topology-companion-rail"][data-hz-topology-companion-scroll="contained"]');
    if (!jumpList || !rail) return undefined;

    const getNextActiveId = () => {
      const railRect = rail.getBoundingClientRect();
      const jumpListHeight = jumpList.getBoundingClientRect().height;
      const activationTop = railRect.top + jumpListHeight + 12;
      let nextActiveId: string | undefined;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const item of items) {
        if (!item.href.startsWith('#')) continue;
        const target = document.getElementById(item.href.slice(1));
        if (!target || !rail.contains(target)) continue;
        const rect = target.getBoundingClientRect();
        const distance = Math.abs(rect.top - activationTop);
        if (rect.top <= activationTop && distance <= nearestDistance) {
          nextActiveId = item.id;
          nearestDistance = distance;
        }
      }

      if (nextActiveId) return nextActiveId;

      for (const item of items) {
        if (!item.href.startsWith('#')) continue;
        const target = document.getElementById(item.href.slice(1));
        if (!target || !rail.contains(target)) continue;
        const rect = target.getBoundingClientRect();
        const distance = Math.abs(rect.top - activationTop);
        if (distance <= nearestDistance) {
          nextActiveId = item.id;
          nearestDistance = distance;
        }
      }

      return nextActiveId;
    };

    const updateActiveSection = () => {
      const nextActiveId = getNextActiveId();
      if (nextActiveId) setScrollActiveId(current => (current === nextActiveId ? current : nextActiveId));
    };

    rail.addEventListener('scroll', updateActiveSection, { passive: true });
    return () => rail.removeEventListener('scroll', updateActiveSection);
  }, [activeMode, items]);

  return (
    <nav
      {...rest}
      ref={jumpListRef}
      aria-label={ariaLabel}
      className={cn(
        'min-w-0 overflow-x-auto hb-scrollbar',
        density === 'graph-first' ? 'sticky top-0 z-20 -mx-1 bg-[#08090c] px-1 py-1' : 'py-1',
        className
      )}
      data-hz-ui="topology-companion-jump-list"
      data-hz-topology-primitive="companion-jump-list"
      data-hz-topology-companion-jump-list-owner="hertzbeat-ui-companion-jump-list"
      data-hz-topology-companion-jump-list-density={density}
      data-hz-topology-companion-jump-list-interaction="anchor-jump"
      data-hz-topology-companion-jump-list-interaction-owner="hertzbeat-ui-companion-jump-list-interaction"
      data-hz-topology-companion-jump-list-sticky={density === 'graph-first' ? 'top' : 'none'}
      data-hz-topology-companion-jump-list-sticky-owner="hertzbeat-ui-companion-jump-list-sticky"
      data-hz-topology-companion-jump-list-scroll-scope={density === 'graph-first' ? 'contained-rail' : 'document'}
      data-hz-topology-companion-jump-list-scroll-scope-owner="hertzbeat-ui-companion-jump-list-scroll-scope"
      data-hz-topology-companion-jump-list-active-mode={activeMode}
      data-hz-topology-companion-jump-list-active-mode-owner="hertzbeat-ui-companion-jump-list-active-mode"
      data-hz-topology-companion-jump-list-selection-sync="manual-active-resets-scroll-active"
      data-hz-topology-companion-jump-list-selection-sync-owner="hertzbeat-ui-companion-jump-list-selection-sync"
      data-hz-topology-companion-jump-list-selection-scroll="active-section"
      data-hz-topology-companion-jump-list-selection-scroll-owner="hertzbeat-ui-companion-jump-list-selection-scroll"
      data-hz-topology-companion-jump-list-selection-url-policy="replace-active-section-hash"
      data-hz-topology-companion-jump-list-selection-url-policy-owner="hertzbeat-ui-companion-jump-list-selection-url-policy"
      data-hz-topology-companion-jump-list-active-reset-key={activeResetKey ?? manualActiveId ?? 'none'}
    >
      <div className="flex min-w-max items-center gap-1">
        {items.map(({ id, href, label, active = false, className: itemClassName, onClick, ...itemProps }) => {
          const activeFromScroll = activeMode === 'contained-rail-scroll' && scrollActiveId === id;
          const itemActive = activeMode === 'contained-rail-scroll' ? resolvedActiveId === id : active;
          const handleClick: React.MouseEventHandler<HTMLAnchorElement> = event => {
            onClick?.(event);
            if (event.defaultPrevented || !href.startsWith('#') || typeof document === 'undefined') return;
            const target = document.getElementById(href.slice(1));
            if (!target) return;
            event.preventDefault();
            const rail = event.currentTarget.closest<HTMLElement>(
              '[data-hz-ui="topology-companion-rail"][data-hz-topology-companion-scroll="contained"]'
            );
            const jumpList = event.currentTarget.closest<HTMLElement>('[data-hz-ui="topology-companion-jump-list"]');
            if (rail?.contains(target)) {
              const railRect = rail.getBoundingClientRect();
              const targetRect = target.getBoundingClientRect();
              const jumpListHeight = jumpList?.getBoundingClientRect().height ?? 0;
              const targetTop = Math.max(0, rail.scrollTop + targetRect.top - railRect.top - jumpListHeight - 8);
              if (typeof rail.scrollTo === 'function') {
                rail.scrollTo({ top: targetTop, behavior: 'smooth' });
              } else {
                rail.scrollTop = targetTop;
              }
            } else {
              target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
            if (activeMode === 'contained-rail-scroll') setScrollActiveId(id);
            if (typeof window !== 'undefined' && window.history?.replaceState) {
              window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${href}`);
            }
          };

          return (
            <a
              key={id}
              {...itemProps}
              href={href}
              onClick={handleClick}
              aria-current={itemActive ? 'location' : undefined}
              className={cn(
                'inline-flex h-6 shrink-0 items-center border px-2 text-[11px] font-semibold transition-colors',
                itemActive
                  ? 'border-[#5570d9] bg-[rgba(85,112,217,0.18)] text-[#dbe4ff]'
                  : 'border-[rgba(126,132,148,0.24)] bg-[#10131a] text-[#8f99ab] hover:border-[#5570d9] hover:text-[#e8ecf6]',
                itemClassName
              )}
              data-hz-topology-companion-jump-item={id}
              data-hz-topology-companion-jump-href={href}
              data-hz-topology-companion-jump-item-owner="hertzbeat-ui-companion-jump-item"
              data-hz-topology-companion-jump-active={itemActive ? 'true' : 'false'}
              data-hz-topology-companion-jump-active-source={activeFromScroll ? 'contained-rail-scroll' : active ? 'manual' : 'none'}
              data-hz-topology-companion-jump-scroll-owner="hertzbeat-ui-companion-jump-scroll"
            >
              {label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

export function HzTopologyCompanionRail({
  children,
  density = 'compact',
  placement = 'side',
  boundary = placement === 'stack' ? 'none' : 'side',
  priority = 'balanced',
  stickyContext: stickyContextProp,
  className,
  ...rest
}: {
  children: React.ReactNode;
  density?: HzTopologyCompanionRailDensity;
  placement?: HzTopologyCompanionRailPlacement;
  boundary?: HzTopologyCompanionRailBoundary;
  priority?: HzTopologyCompanionRailPriority;
  stickyContext?: HzTopologyCompanionRailStickyContext;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  const lowInterruption = priority === 'graph-first';
  const containedScroll = lowInterruption;
  const defaultStickyContext: HzTopologyCompanionRailStickyContext = containedScroll ? 'first-section' : 'none';
  const stickyContext = stickyContextProp ?? defaultStickyContext;
  const stickyTarget =
    stickyContext === 'jump-list'
      ? 'topology-companion-jump-list'
      : stickyContext === 'first-section'
        ? 'topology-section-label'
        : 'none';
  return (
    <aside
      {...rest}
      className={cn(
        'min-w-0 bg-[#0b0c0f] p-4',
        density === 'compact' ? '[&>*+*]:mt-5' : '[&>*+*]:mt-6',
        lowInterruption ? 'bg-[#08090c] p-3 text-[12px] [&>*+*]:mt-3' : '',
        containedScroll ? 'max-h-[680px] overflow-y-auto hb-scrollbar' : '',
        containedScroll && stickyContext === 'first-section'
          ? '[&>[data-hz-ui=topology-section-label]:first-child]:sticky [&>[data-hz-ui=topology-section-label]:first-child]:top-0 [&>[data-hz-ui=topology-section-label]:first-child]:z-10 [&>[data-hz-ui=topology-section-label]:first-child]:bg-[#08090c] [&>[data-hz-ui=topology-section-label]:first-child]:py-1'
          : '',
        containedScroll && stickyContext === 'jump-list'
          ? '[&>[data-hz-ui=topology-companion-jump-list]:first-child]:sticky [&>[data-hz-ui=topology-companion-jump-list]:first-child]:top-0 [&>[data-hz-ui=topology-companion-jump-list]:first-child]:z-20 [&>[data-hz-ui=topology-companion-jump-list]:first-child]:bg-[#08090c]'
          : '',
        boundary === 'side' ? 'border-l border-[var(--hz-ui-line-soft)]' : '',
        boundary === 'stack-section' ? 'border-t border-[var(--hz-ui-line-soft)]' : '',
        className
      )}
      data-hz-ui="topology-companion-rail"
      data-hz-topology-primitive="companion-rail"
      data-hz-topology-companion-density={density}
      data-hz-topology-companion-placement={placement}
      data-hz-topology-companion-priority={priority}
      data-hz-topology-companion-priority-owner="hertzbeat-ui-companion-rail-priority"
      data-hz-topology-companion-visual-weight={lowInterruption ? 'low-interruption' : 'balanced'}
      data-hz-topology-companion-visual-weight-owner="hertzbeat-ui-companion-rail-visual-weight"
      data-hz-topology-companion-scroll={containedScroll ? 'contained' : 'page'}
      data-hz-topology-companion-scroll-owner="hertzbeat-ui-companion-rail-scroll"
      data-hz-topology-companion-viewport-contract={containedScroll ? 'graph-height' : 'page-flow'}
      data-hz-topology-companion-sticky-context={stickyContext}
      data-hz-topology-companion-sticky-context-owner="hertzbeat-ui-companion-rail-sticky-context"
      data-hz-topology-companion-sticky-target={stickyTarget}
      data-hz-topology-companion-sticky-target-owner="hertzbeat-ui-companion-rail-sticky-target"
      data-hz-topology-companion-boundary={boundary}
      data-hz-topology-companion-boundary-owner="hertzbeat-ui-companion-rail-boundary"
      data-hz-topology-companion-spacing="shared-stack"
      data-hz-topology-companion-spacing-owner="hertzbeat-ui-companion-rail-spacing"
      data-hz-topology-companion-content-owner="hertzbeat-ui-companion-rail-content"
    >
      {children}
    </aside>
  );
}

export type HzTopologyMetricTableLabels = {
  edgeCount?: React.ReactNode;
  requestRate?: React.ReactNode;
  errorRate?: React.ReactNode;
  latencyP95?: React.ReactNode;
  rowAction?: React.ReactNode;
  rowAriaLabel?: (row: HzTopologyMetricRow) => string;
  renderWindowFilterAll?: React.ReactNode;
  renderWindowFilterVisible?: React.ReactNode;
  renderWindowFilterPartial?: React.ReactNode;
  renderWindowFilterHidden?: React.ReactNode;
  renderWindowFilterUnknown?: React.ReactNode;
  renderWindowEdgeSummary?: React.ReactNode;
  renderWindowRowSummary?: (rendered: number, total: number) => React.ReactNode;
  renderWindowShowMore?: (next: number, total: number) => React.ReactNode;
};

export type HzTopologyMetricTableRenderWindowCompanion = {
  mode: 'direct' | 'windowed';
  totalNodeCount: number;
  renderedNodeCount: number;
  hiddenNodeCount: number;
  totalEdgeCount?: number;
  renderedEdgeCount?: number;
  visibleNodeBudget: number;
  tableCompanion?: 'optional' | 'recommended' | 'required';
  priorityNodeIds?: string[];
  renderedNodeIds?: string[];
};

export type HzTopologyMetricTableBoundary = 'default' | 'framed' | 'flush';
export type HzTopologyMetricTableDensity = 'compact' | 'graph-first';
export type HzTopologyMetricRowWindowVisibility = 'visible' | 'partial' | 'hidden' | 'unknown';
export type HzTopologyMetricTableRenderWindowFilter = 'all' | HzTopologyMetricRowWindowVisibility;
const HZ_TOPOLOGY_METRIC_TABLE_ROW_RENDER_BUDGET = 120;

const topologyMetricTableBoundaryClassName: Record<HzTopologyMetricTableBoundary, string> = {
  default: 'border-y border-[var(--hz-ui-line-soft)]',
  framed: 'border border-[var(--hz-ui-line-soft)]',
  flush: 'border-y border-[var(--hz-ui-line-soft)] border-x-0'
};

function formatTopologyNumber(value: number | undefined, maximumFractionDigits = 2) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return value.toLocaleString('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: 0
  });
}

function formatTopologyRate(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${formatTopologyNumber(value)}/s`
    : '-';
}

function formatTopologyPercent(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  const percentValue = Math.abs(value) <= 1 ? value * 100 : value;
  return `${formatTopologyNumber(percentValue)}%`;
}

function formatTopologyLatency(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${formatTopologyNumber(value)}ms`
    : '-';
}

function resolveTopologyMetricEndpointVisibility(
  nodeId: string | undefined,
  mode: HzTopologyMetricTableRenderWindowCompanion['mode'],
  renderedNodeIds: Set<string> | undefined
): 'true' | 'false' | 'unknown' {
  if (!nodeId) return 'unknown';
  if (mode === 'direct') return 'true';
  if (!renderedNodeIds) return 'unknown';
  return renderedNodeIds.has(nodeId) ? 'true' : 'false';
}

function resolveTopologyMetricRowWindowVisibility(
  sourceVisible: 'true' | 'false' | 'unknown',
  targetVisible: 'true' | 'false' | 'unknown'
): HzTopologyMetricRowWindowVisibility {
  if (sourceVisible === 'unknown' || targetVisible === 'unknown') return 'unknown';
  if (sourceVisible === 'true' && targetVisible === 'true') return 'visible';
  if (sourceVisible === 'false' && targetVisible === 'false') return 'hidden';
  return 'partial';
}

function normalizeTopologyMetricTableRenderWindowFilter(
  filter: HzTopologyMetricTableRenderWindowFilter | undefined
): HzTopologyMetricTableRenderWindowFilter {
  if (filter === 'visible' || filter === 'partial' || filter === 'hidden' || filter === 'unknown') return filter;
  return 'all';
}

export function HzTopologyMetricTable({
  title,
  rows,
  selectedRowId,
  selectionSource = 'none',
  emptyLabel = 'No topology evidence',
  labels,
  renderWindowCompanion,
  renderWindowFilter = 'all',
  onRenderWindowFilterChange,
  onRowSelect,
  boundary = 'default',
  density = 'compact',
  className,
  ...rest
}: {
  title: React.ReactNode;
  rows: HzTopologyMetricRow[];
  selectedRowId?: string;
  selectionSource?: string;
  emptyLabel?: React.ReactNode;
  labels?: HzTopologyMetricTableLabels;
  renderWindowCompanion?: HzTopologyMetricTableRenderWindowCompanion;
  renderWindowFilter?: HzTopologyMetricTableRenderWindowFilter;
  onRenderWindowFilterChange?: (filter: HzTopologyMetricTableRenderWindowFilter) => void;
  onRowSelect?: (row: HzTopologyMetricRow) => void;
  boundary?: HzTopologyMetricTableBoundary;
  density?: HzTopologyMetricTableDensity;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  const graphFirst = density === 'graph-first';
  const renderWindowMode = renderWindowCompanion?.mode ?? 'direct';
  const renderWindowTableCompanion = renderWindowCompanion?.tableCompanion ?? 'optional';
  const hiddenNodeCompanion =
    renderWindowCompanion && renderWindowCompanion.hiddenNodeCount > 0
      ? renderWindowTableCompanion
      : 'inactive';
  const priorityNodeIds = renderWindowCompanion?.priorityNodeIds?.length
    ? renderWindowCompanion.priorityNodeIds.join(' ')
    : 'none';
  const renderedNodeIds = renderWindowCompanion?.renderedNodeIds;
  const renderedNodeIdSet = renderedNodeIds?.length ? new Set(renderedNodeIds) : undefined;
  const tableEdgeCount = typeof renderWindowCompanion?.totalEdgeCount === 'number'
    ? renderWindowCompanion.totalEdgeCount
    : rows.length;
  const canvasRenderedEdgeCount = typeof renderWindowCompanion?.renderedEdgeCount === 'number'
    ? renderWindowCompanion.renderedEdgeCount
    : tableEdgeCount;
  const hasCanvasEdgeSummary =
    renderWindowMode === 'windowed' &&
    typeof renderWindowCompanion?.totalEdgeCount === 'number' &&
    typeof renderWindowCompanion?.renderedEdgeCount === 'number';
  const edgeCountPolicy = hasCanvasEdgeSummary ? 'canvas-rendered-vs-table-total' : 'row-window-visibility';
  const renderWindowEdgeSummary =
    labels?.renderWindowEdgeSummary ?? `${canvasRenderedEdgeCount}/${tableEdgeCount} rendered in canvas`;
  const rowsWithWindowVisibility = rows.map(row => {
    const sourceVisible = resolveTopologyMetricEndpointVisibility(row.sourceNodeId, renderWindowMode, renderedNodeIdSet);
    const targetVisible = resolveTopologyMetricEndpointVisibility(row.targetNodeId, renderWindowMode, renderedNodeIdSet);
    const rowWindowVisibility = resolveTopologyMetricRowWindowVisibility(sourceVisible, targetVisible);
    return { row, sourceVisible, targetVisible, rowWindowVisibility };
  });
  const selectedRowWithWindowVisibility = selectedRowId
    ? rowsWithWindowVisibility.find(({ row }) => row.id === selectedRowId)
    : undefined;
  const hasMetricTableSelection = Boolean(selectedRowId && selectionSource !== 'none');
  const renderWindowRowCounts = rowsWithWindowVisibility.reduce<Record<HzTopologyMetricRowWindowVisibility, number>>(
    (counts, row) => {
      counts[row.rowWindowVisibility] += 1;
      return counts;
    },
    { visible: 0, partial: 0, hidden: 0, unknown: 0 }
  );
  const activeRenderWindowFilter = normalizeTopologyMetricTableRenderWindowFilter(renderWindowFilter);
  const [rowRenderPage, setRowRenderPage] = React.useState(1);
  React.useEffect(() => {
    setRowRenderPage(1);
  }, [activeRenderWindowFilter, rows.length]);
  const filteredRowsWithWindowVisibility =
    activeRenderWindowFilter === 'all'
      ? rowsWithWindowVisibility
      : rowsWithWindowVisibility.filter(row => row.rowWindowVisibility === activeRenderWindowFilter);
  const shouldBudgetRenderedRows =
    renderWindowMode === 'windowed' &&
    filteredRowsWithWindowVisibility.length > HZ_TOPOLOGY_METRIC_TABLE_ROW_RENDER_BUDGET;
  const rowRenderBudget = shouldBudgetRenderedRows
    ? Math.min(filteredRowsWithWindowVisibility.length, HZ_TOPOLOGY_METRIC_TABLE_ROW_RENDER_BUDGET * rowRenderPage)
    : filteredRowsWithWindowVisibility.length;
  const budgetedRowsWithWindowVisibility = shouldBudgetRenderedRows
    ? filteredRowsWithWindowVisibility.slice(0, rowRenderBudget)
    : filteredRowsWithWindowVisibility;
  const selectedFilteredRowWithWindowVisibility = selectedRowId
    ? filteredRowsWithWindowVisibility.find(({ row }) => row.id === selectedRowId)
    : undefined;
  const renderedRowsWithWindowVisibility =
    shouldBudgetRenderedRows &&
    selectedFilteredRowWithWindowVisibility &&
    !budgetedRowsWithWindowVisibility.some(({ row }) => row.id === selectedFilteredRowWithWindowVisibility.row.id)
      ? [...budgetedRowsWithWindowVisibility, selectedFilteredRowWithWindowVisibility]
      : budgetedRowsWithWindowVisibility;
  const hiddenRenderedRowCount = Math.max(0, filteredRowsWithWindowVisibility.length - renderedRowsWithWindowVisibility.length);
  const nextRowRenderCount = shouldBudgetRenderedRows
    ? Math.min(filteredRowsWithWindowVisibility.length, rowRenderBudget + HZ_TOPOLOGY_METRIC_TABLE_ROW_RENDER_BUDGET)
    : filteredRowsWithWindowVisibility.length;
  const canShowMoreRenderedRows = shouldBudgetRenderedRows && rowRenderBudget < filteredRowsWithWindowVisibility.length;
  const rowRenderPolicy = shouldBudgetRenderedRows ? 'windowed-dom-budget' : 'all-filtered-rows';
  const renderWindowRowSummary =
    labels?.renderWindowRowSummary?.(renderedRowsWithWindowVisibility.length, filteredRowsWithWindowVisibility.length) ??
    `Showing ${renderedRowsWithWindowVisibility.length} of ${filteredRowsWithWindowVisibility.length} rows`;
  const renderWindowShowMore =
    labels?.renderWindowShowMore?.(nextRowRenderCount, filteredRowsWithWindowVisibility.length) ??
    `Show ${nextRowRenderCount} of ${filteredRowsWithWindowVisibility.length} rows`;
  const renderWindowFilterOptions: Array<{
    id: HzTopologyMetricTableRenderWindowFilter;
    label: React.ReactNode;
    count: number;
  }> = [
    { id: 'all', label: labels?.renderWindowFilterAll ?? 'All', count: rows.length },
    { id: 'visible', label: labels?.renderWindowFilterVisible ?? 'Visible', count: renderWindowRowCounts.visible },
    { id: 'partial', label: labels?.renderWindowFilterPartial ?? 'Partial', count: renderWindowRowCounts.partial },
    { id: 'hidden', label: labels?.renderWindowFilterHidden ?? 'Hidden', count: renderWindowRowCounts.hidden },
    { id: 'unknown', label: labels?.renderWindowFilterUnknown ?? 'Unknown', count: renderWindowRowCounts.unknown }
  ];
  return (
    <section
      {...rest}
      className={cn(
        'min-w-0',
        graphFirst ? 'bg-[#0b0c0f] text-[11px]' : 'bg-[var(--hz-ui-surface)]',
        topologyMetricTableBoundaryClassName[boundary],
        className
      )}
      data-hz-ui="topology-metric-table"
      data-hz-topology-primitive="metric-table"
      data-hz-topology-metric-table-root="true"
      data-hz-topology-metric-table-density={density}
      data-hz-topology-metric-table-density-owner="hertzbeat-ui-metric-table-density"
      data-hz-topology-metric-table-visual-weight={graphFirst ? 'low-interruption' : 'balanced'}
      data-hz-topology-metric-table-visual-weight-owner="hertzbeat-ui-metric-table-visual-weight"
      data-hz-topology-metric-table-row-density={graphFirst ? 'compressed-red' : 'standard-red'}
      data-hz-topology-metric-table-boundary={boundary}
      data-hz-topology-metric-table-boundary-owner="hertzbeat-ui-metric-table-boundary"
      data-hz-topology-metric-rows={rows.length}
      data-hz-topology-metric-table-total-rows={rows.length}
      data-hz-topology-metric-table-interaction="row-select-detail"
      data-hz-topology-metric-table-live-selection-owner="hertzbeat-ui-metric-table-selection"
      data-hz-topology-metric-table-selected-edge-id={hasMetricTableSelection ? selectedRowId : 'none'}
      data-hz-topology-metric-table-selection-source={hasMetricTableSelection ? selectionSource : 'none'}
      data-hz-topology-metric-table-selected-row-render-window-visibility={
        hasMetricTableSelection ? selectedRowWithWindowVisibility?.rowWindowVisibility ?? 'unknown' : 'none'
      }
      data-hz-topology-metric-table-selected-row-source-visible={
        hasMetricTableSelection && selectedRowWithWindowVisibility ? String(selectedRowWithWindowVisibility.sourceVisible) : 'unknown'
      }
      data-hz-topology-metric-table-selected-row-target-visible={
        hasMetricTableSelection && selectedRowWithWindowVisibility ? String(selectedRowWithWindowVisibility.targetVisible) : 'unknown'
      }
      data-hz-topology-metric-table-live-selection-invariants="row-click-drawer no-url-change no-remount no-refit viewport-preserved render-key-stable"
      data-hz-topology-metric-table-filter-invariants="in-page no-url-change no-g6-remount viewport-preserved selection-preserved"
      data-hz-topology-metric-table-filter-url-policy="preserve-current-url"
      data-hz-topology-metric-table-render-window-owner="hertzbeat-ui-metric-table-render-window"
      data-hz-topology-metric-table-render-window-mode={renderWindowMode}
      data-hz-topology-metric-table-render-window-total-node-count={renderWindowCompanion?.totalNodeCount ?? 0}
      data-hz-topology-metric-table-render-window-rendered-node-count={renderWindowCompanion?.renderedNodeCount ?? rows.length}
      data-hz-topology-metric-table-render-window-hidden-node-count={renderWindowCompanion?.hiddenNodeCount ?? 0}
      data-hz-topology-metric-table-render-window-total-edge-count={tableEdgeCount}
      data-hz-topology-metric-table-render-window-rendered-edge-count={canvasRenderedEdgeCount}
      data-hz-topology-metric-table-edge-count-policy={edgeCountPolicy}
      data-hz-topology-metric-table-canvas-rendered-edge-count={canvasRenderedEdgeCount}
      data-hz-topology-metric-table-table-edge-count={tableEdgeCount}
      data-hz-topology-metric-table-render-window-visible-node-budget={renderWindowCompanion?.visibleNodeBudget ?? rows.length}
      data-hz-topology-metric-table-render-window-visible-node-count={renderedNodeIds?.length ?? (renderWindowMode === 'direct' ? renderWindowCompanion?.renderedNodeCount ?? 0 : 0)}
      data-hz-topology-metric-table-render-window-table-companion={renderWindowTableCompanion}
      data-hz-topology-metric-table-hidden-node-companion={hiddenNodeCompanion}
      data-hz-topology-metric-table-priority-node-ids={priorityNodeIds}
      data-hz-topology-metric-table-visible-row-count={renderWindowRowCounts.visible}
      data-hz-topology-metric-table-partial-row-count={renderWindowRowCounts.partial}
      data-hz-topology-metric-table-hidden-row-count={renderWindowRowCounts.hidden}
      data-hz-topology-metric-table-hidden-row-proof-owner="hertzbeat-ui-metric-table-hidden-row-proof"
      data-hz-topology-metric-table-hidden-row-proof={renderWindowRowCounts.hidden > 0 ? 'available' : 'none'}
      data-hz-topology-metric-table-hidden-row-proof-filter="hidden"
      data-hz-topology-metric-table-hidden-row-proof-count={renderWindowRowCounts.hidden}
      data-hz-topology-metric-table-unknown-row-count={renderWindowRowCounts.unknown}
      data-hz-topology-metric-table-render-window-filter-owner="hertzbeat-ui-metric-table-render-window-filter"
      data-hz-topology-metric-table-render-window-filter={activeRenderWindowFilter}
      data-hz-topology-metric-table-filtered-row-count={filteredRowsWithWindowVisibility.length}
      data-hz-topology-metric-table-filtered-out-row-count={rows.length - filteredRowsWithWindowVisibility.length}
      data-hz-topology-metric-table-row-render-policy={rowRenderPolicy}
      data-hz-topology-metric-table-row-render-reset-policy="filter-change-resets-budget-preserve-selected-row"
      data-hz-topology-metric-table-row-render-budget={rowRenderBudget}
      data-hz-topology-metric-table-row-render-page={rowRenderPage}
      data-hz-topology-metric-table-row-render-next-count={nextRowRenderCount}
      data-hz-topology-metric-table-row-render-can-show-more={canShowMoreRenderedRows ? 'true' : 'false'}
      data-hz-topology-metric-table-rendered-row-count={renderedRowsWithWindowVisibility.length}
      data-hz-topology-metric-table-rendered-hidden-row-count={hiddenRenderedRowCount}
    >
      <header
        className={cn(
          'flex items-center justify-between border-b border-[var(--hz-ui-line-soft)]',
          graphFirst ? 'min-h-8 gap-2 px-2 py-1.5' : 'min-h-10 gap-3 px-3 py-2'
        )}
        data-hz-topology-metric-table-header-owner="hertzbeat-ui-metric-table-header"
      >
        <div
          className={cn('min-w-0 truncate font-semibold text-[#f3f6fb]', graphFirst ? 'text-[12px]' : 'text-[13px]')}
          data-hz-topology-metric-table-title-owner="hertzbeat-ui-metric-table-title"
        >
          {title}
        </div>
        <span
          className={cn('font-mono uppercase tracking-[0.08em] text-[#727b8c]', graphFirst ? 'text-[9px]' : 'text-[10px]')}
          data-hz-topology-metric-table-count-owner="hertzbeat-ui-metric-table-count"
        >
          {labels?.edgeCount ?? `${rows.length} edges`}
        </span>
      </header>
      <div
        className={cn(
          'flex min-w-0 flex-wrap items-center border-b border-[var(--hz-ui-line-faint)]',
          graphFirst ? 'gap-1 px-2 py-1.5' : 'gap-1.5 px-3 py-2'
        )}
        data-hz-topology-metric-table-filter-controls-owner="hertzbeat-ui-metric-table-filter-controls"
      >
        {hasCanvasEdgeSummary ? (
          <span
            className={cn(
              'inline-flex min-h-7 items-center border border-[var(--hz-ui-line-soft)] bg-[#08090c] font-mono text-[#8f99ab]',
              graphFirst ? 'px-2 text-[10px]' : 'px-2.5 text-[11px]'
            )}
            data-hz-topology-metric-table-edge-summary-owner="hertzbeat-ui-metric-table-edge-summary"
            data-hz-topology-metric-table-edge-summary-policy={edgeCountPolicy}
          >
            {renderWindowEdgeSummary}
          </span>
        ) : null}
        {renderWindowFilterOptions.map(option => {
          const active = option.id === activeRenderWindowFilter;
          return (
            <button
              key={option.id}
              type="button"
              className={cn(
                'inline-flex min-h-7 items-center gap-1 border font-mono transition-colors',
                graphFirst ? 'px-2 text-[10px]' : 'px-2.5 text-[11px]',
                active
                  ? 'border-[var(--hz-ui-accent-muted)] bg-[var(--hz-ui-active-soft)] text-[#dbe4f0]'
                  : 'border-[var(--hz-ui-line-soft)] bg-[#0b0c0f] text-[#8f99ab] hover:border-[var(--hz-ui-line)] hover:text-[#dbe4f0]'
              )}
              aria-pressed={active}
              onClick={() => onRenderWindowFilterChange?.(option.id)}
              data-hz-topology-metric-table-filter-control-owner="hertzbeat-ui-metric-table-filter-control"
              data-hz-topology-metric-table-filter-control={option.id}
              data-hz-topology-metric-table-filter-active={active ? 'true' : 'false'}
              data-hz-topology-metric-table-filter-control-active={active ? 'true' : 'false'}
              data-hz-topology-metric-table-filter-count={option.count}
              data-hz-topology-metric-table-filter-control-url-policy="preserve-current-url"
              data-hz-topology-metric-table-filter-control-selection-policy="preserve-selected-edge"
              data-hz-topology-metric-table-filter-row-render-reset-policy="reset-row-budget-preserve-selection"
            >
              <span>{option.label}</span>
              <span className="text-[#727b8c]">{option.count}</span>
            </button>
          );
        })}
      </div>
      {filteredRowsWithWindowVisibility.length === 0 ? (
        <div className={cn('text-[#8f99ab]', graphFirst ? 'px-2 py-3 text-[11px]' : 'px-3 py-4 text-[12px]')} data-hz-topology-empty="metric-table">
          {emptyLabel}
        </div>
      ) : (
        <>
        <div className="grid min-w-0 divide-y divide-[var(--hz-ui-line-faint)]">
          {renderedRowsWithWindowVisibility.map(({ row, sourceVisible, targetVisible, rowWindowVisibility }) => {
            const tone = row.tone || (row.errorRate && row.errorRate > 0 ? 'warning' : 'neutral');
            const selected = selectedRowId === row.id;
            const rowActionLabel = labels?.rowAction;
            const rowWindowContextLabel =
              rowWindowVisibility === 'visible'
                ? labels?.renderWindowFilterVisible ?? 'Visible'
                : rowWindowVisibility === 'partial'
                  ? labels?.renderWindowFilterPartial ?? 'Partial'
                  : rowWindowVisibility === 'hidden'
                    ? labels?.renderWindowFilterHidden ?? 'Hidden'
                    : labels?.renderWindowFilterUnknown ?? 'Unknown';
            const showRowWindowContext = renderWindowMode === 'windowed' && (selected || rowWindowVisibility !== 'visible');
            return (
              <button
                key={row.id}
                type="button"
                className={cn(
                  rowActionLabel
                    ? cn(
                        'grid w-full min-w-0',
                        graphFirst
                          ? 'min-h-10 grid-cols-[minmax(0,1fr)_repeat(3,minmax(48px,auto))_auto]'
                          : 'min-h-12 grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(68px,auto))_auto]'
                      )
                    : cn(
                        'grid w-full min-w-0',
                        graphFirst
                          ? 'min-h-10 grid-cols-[minmax(0,1fr)_repeat(3,minmax(48px,auto))]'
                          : 'min-h-12 grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(68px,auto))]'
                      ),
                  graphFirst ? 'items-center gap-2 px-2 py-1.5' : 'items-center gap-3 px-3 py-2',
                  'text-left transition-colors',
                  selected
                    ? 'bg-[var(--hz-ui-active-soft)] shadow-[inset_2px_0_0_var(--hz-ui-accent-muted)]'
                    : 'hover:bg-[var(--hz-ui-surface-soft)]'
                )}
                aria-label={labels?.rowAriaLabel?.(row) ?? `Open topology edge ${row.id}`}
                aria-current={selected ? 'true' : undefined}
                onClick={() => onRowSelect?.(row)}
                data-hz-topology-edge-row={row.id}
                data-hz-topology-edge-row-render-window-visibility={rowWindowVisibility}
                data-hz-topology-edge-row-source-node-id={row.sourceNodeId ?? 'unknown'}
                data-hz-topology-edge-row-target-node-id={row.targetNodeId ?? 'unknown'}
                data-hz-topology-edge-row-source-visible={sourceVisible}
                data-hz-topology-edge-row-target-visible={targetVisible}
                data-hz-topology-edge-selected={selected ? 'true' : 'false'}
                data-hz-topology-edge-tone={tone}
                data-hz-topology-request-rate={row.requestRatePerSecond}
                data-hz-topology-error-rate={row.errorRate}
                data-hz-topology-error-count={row.errorCount}
                data-hz-topology-latency-p95-ms={row.latencyP95Ms}
                data-hz-topology-metric-table-row-owner="hertzbeat-ui-metric-table-row"
                data-hz-topology-edge-row-selection-owner="hertzbeat-ui-metric-table-row-selection"
                data-hz-topology-edge-row-selection-mode="table-row-click-drawer"
                data-hz-topology-edge-row-selection-url-policy="preserve-current-url"
              >
                <span className="min-w-0" data-hz-topology-metric-table-endpoints-owner="hertzbeat-ui-metric-table-endpoints">
                  <span
                    className={cn('flex min-w-0 items-center font-mono text-[#dbe4f0]', graphFirst ? 'gap-1.5 text-[10px]' : 'gap-2 text-[11px]')}
                    data-hz-topology-metric-table-route-owner="hertzbeat-ui-metric-table-route"
                  >
                    <span className="truncate text-[#8f99ab]" data-hz-topology-metric-table-source-owner="hertzbeat-ui-metric-table-source">
                      {row.source}
                    </span>
                    <span
                      className={cn('h-px shrink-0', graphFirst ? 'w-5' : 'w-7')}
                      style={{ backgroundColor: chartToneColor[tone].stroke }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-[#8f99ab]" data-hz-topology-metric-table-target-owner="hertzbeat-ui-metric-table-target">
                      {row.target}
                    </span>
                  </span>
                  <span className={cn('mt-1 flex min-w-0 flex-wrap items-center', graphFirst ? 'gap-1 text-[10px]' : 'gap-1.5 text-[11px]')}>
                    <span className="truncate font-semibold text-[#f3f6fb]" data-hz-topology-metric-table-relation-owner="hertzbeat-ui-metric-table-relation">
                      {row.relationType}
                    </span>
                    {row.sourceKind ? (
                      <span className="text-[#727b8c]" data-hz-topology-metric-table-source-kind-owner="hertzbeat-ui-metric-table-source-kind">
                        {row.sourceKind}
                      </span>
                    ) : null}
                    {showRowWindowContext ? (
                      <span
                        className="border-l border-[var(--hz-ui-line-soft)] pl-1.5 font-semibold text-[#dbe4f0]"
                        data-hz-topology-edge-row-window-context-owner="hertzbeat-ui-metric-table-row-window-context"
                        data-hz-topology-edge-row-window-context={rowWindowVisibility}
                        data-hz-topology-edge-row-window-context-source-visible={sourceVisible}
                        data-hz-topology-edge-row-window-context-target-visible={targetVisible}
                      >
                        {rowWindowContextLabel}
                      </span>
                    ) : null}
                    {row.evidenceBadges?.map((badge, index) => (
                      <span
                        key={index}
                        className="border-l border-[var(--hz-ui-line-soft)] pl-1.5 text-[#8f99ab]"
                        data-hz-topology-evidence-badge={index}
                        data-hz-topology-metric-table-badge-owner="hertzbeat-ui-metric-table-badge"
                      >
                        {badge}
                      </span>
                    ))}
                  </span>
                </span>
                <span className={cn('text-right font-mono text-[#727b8c]', graphFirst ? 'text-[9px]' : 'text-[10px]')} data-hz-topology-metric-table-cell-owner="hertzbeat-ui-metric-table-cell">
                  <span className="block text-[#dbe4f0]" data-hz-topology-metric-table-value-owner="hertzbeat-ui-metric-table-value">
                    {formatTopologyRate(row.requestRatePerSecond)}
                  </span>
                  <span data-hz-topology-metric-table-label-owner="hertzbeat-ui-metric-table-label">
                    {labels?.requestRate ?? 'req/s'}
                  </span>
                </span>
                <span className={cn('text-right font-mono text-[#727b8c]', graphFirst ? 'text-[9px]' : 'text-[10px]')} data-hz-topology-metric-table-cell-owner="hertzbeat-ui-metric-table-cell">
                  <span
                    className="block"
                    style={{ color: row.errorRate && row.errorRate > 0 ? chartToneColor.warning.stroke : '#dbe4f0' }}
                    data-hz-topology-metric-table-value-owner="hertzbeat-ui-metric-table-value"
                  >
                    {formatTopologyPercent(row.errorRate)}
                  </span>
                  <span data-hz-topology-metric-table-label-owner="hertzbeat-ui-metric-table-label">
                    {labels?.errorRate ?? 'errors'}
                  </span>
                </span>
                <span className={cn('text-right font-mono text-[#727b8c]', graphFirst ? 'text-[9px]' : 'text-[10px]')} data-hz-topology-metric-table-cell-owner="hertzbeat-ui-metric-table-cell">
                  <span className="block text-[#dbe4f0]" data-hz-topology-metric-table-value-owner="hertzbeat-ui-metric-table-value">
                    {formatTopologyLatency(row.latencyP95Ms)}
                  </span>
                  <span data-hz-topology-metric-table-label-owner="hertzbeat-ui-metric-table-label">
                    {labels?.latencyP95 ?? 'p95'}
                  </span>
                </span>
                {rowActionLabel ? (
                  <span
                    className={cn(
                      'justify-self-end border-l border-[var(--hz-ui-line-soft)] font-semibold',
                      graphFirst ? 'pl-2 text-[10px]' : 'pl-3 text-[11px]',
                      selected ? 'text-[#dbe4f0]' : 'text-[#8f99ab]'
                    )}
                    data-hz-topology-edge-action={row.id}
                    data-hz-topology-metric-table-action-owner="hertzbeat-ui-metric-table-action"
                  >
                    {rowActionLabel}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {hiddenRenderedRowCount > 0 ? (
          <div
            className={cn(
              'flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--hz-ui-line-faint)] font-mono text-[#8f99ab]',
              graphFirst ? 'px-2 py-2 text-[10px]' : 'px-3 py-2.5 text-[11px]'
            )}
            data-hz-topology-metric-table-row-render-summary-owner="hertzbeat-ui-metric-table-row-render-summary"
          >
            <span>{renderWindowRowSummary}</span>
            {canShowMoreRenderedRows ? (
              <button
                type="button"
                className="inline-flex min-h-7 items-center border border-[var(--hz-ui-line-soft)] bg-[#0b0c0f] px-2 font-semibold text-[#dbe4f0] transition-colors hover:border-[var(--hz-ui-line)]"
                onClick={() => setRowRenderPage(page => page + 1)}
                data-hz-topology-metric-table-row-render-action-owner="hertzbeat-ui-metric-table-row-render-action"
                data-hz-topology-metric-table-row-render-action="show-more"
                data-hz-topology-metric-table-row-render-action-invariants="append-rows-only no-url-change no-g6-remount viewport-preserved selection-preserved"
                data-hz-topology-metric-table-row-render-action-effect="append-row-budget"
                data-hz-topology-metric-table-row-render-action-filter-reset-policy="reset-row-budget-on-filter-change"
                data-hz-topology-metric-table-row-render-action-url-policy="preserve-current-url"
                data-hz-topology-metric-table-row-render-action-selection-policy="preserve-selected-edge"
                data-hz-topology-metric-table-row-render-action-next-count={nextRowRenderCount}
              >
                {renderWindowShowMore}
              </button>
            ) : null}
          </div>
        ) : null}
        </>
      )}
    </section>
  );
}
