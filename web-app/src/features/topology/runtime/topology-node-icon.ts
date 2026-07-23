/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { __iconNode as activityIconNode } from 'lucide-react/dist/esm/icons/activity.js';
import { __iconNode as appWindowIconNode } from 'lucide-react/dist/esm/icons/app-window.js';
import { __iconNode as circleHelpIconNode } from 'lucide-react/dist/esm/icons/circle-help.js';
import { __iconNode as containerIconNode } from 'lucide-react/dist/esm/icons/container.js';
import { __iconNode as databaseIconNode } from 'lucide-react/dist/esm/icons/database.js';
import { __iconNode as inboxIconNode } from 'lucide-react/dist/esm/icons/inbox.js';
import { __iconNode as memoryStickIconNode } from 'lucide-react/dist/esm/icons/memory-stick.js';
import { __iconNode as routeIconNode } from 'lucide-react/dist/esm/icons/route.js';
import { __iconNode as serverCogIconNode } from 'lucide-react/dist/esm/icons/server-cog.js';
import { __iconNode as serverIconNode } from 'lucide-react/dist/esm/icons/server.js';
import { __iconNode as triangleAlertIconNode } from 'lucide-react/dist/esm/icons/triangle-alert.js';
import { __iconNode as workflowIconNode } from 'lucide-react/dist/esm/icons/workflow.js';
import type { IconNode } from 'lucide-react';

export type TopologyNodeIconKind =
  | 'application'
  | 'service'
  | 'endpoint'
  | 'database'
  | 'cache'
  | 'queue'
  | 'middleware'
  | 'k8s-workload'
  | 'monitor'
  | 'resource'
  | 'alert'
  | 'unknown';
export type TopologyNodeIconName =
  | 'app-window'
  | 'server-cog'
  | 'route'
  | 'database'
  | 'memory-stick'
  | 'inbox'
  | 'workflow'
  | 'container'
  | 'activity'
  | 'server'
  | 'triangle-alert'
  | 'circle-help';
export type TopologyNodeIcon = {
  iconKind: TopologyNodeIconKind;
  iconName: TopologyNodeIconName;
  iconLibrary: 'lucide-react';
  iconSource: 'entity-type-catalog' | 'external-fallback';
  iconSrc: string;
};
type IconCatalogEntry = {
  iconKind: TopologyNodeIconKind;
  iconName: TopologyNodeIconName;
  aliases: readonly string[];
  iconNode: IconNode;
};

const topologyNodeIconCatalog: readonly IconCatalogEntry[] = [
  entry('application', 'app-window', ['application', 'app'], appWindowIconNode),
  entry('service', 'server-cog', ['service', 'api'], serverCogIconNode),
  entry('endpoint', 'route', ['endpoint', 'route', 'path', 'url', '/api/'], routeIconNode),
  entry('database', 'database', ['database', 'db', 'mysql', 'postgres', 'postgresql', 'mongo'], databaseIconNode),
  entry('cache', 'memory-stick', ['cache', 'redis', 'memcached'], memoryStickIconNode),
  entry('queue', 'inbox', ['queue', 'mq', 'broker', 'topic', 'messaging', 'kafka', 'rabbit'], inboxIconNode),
  entry('middleware', 'workflow', ['middleware'], workflowIconNode),
  entry(
    'k8s-workload',
    'container',
    ['k8s', 'kubernetes', 'workload', 'pod', 'deployment', 'daemonset', 'statefulset', 'job', 'cronjob'],
    containerIconNode
  ),
  entry('monitor', 'activity', ['monitor', 'collector', 'agent', 'probe', 'check'], activityIconNode),
  entry('resource', 'server', ['resource', 'host', 'node', 'server', 'vm', 'device'], serverIconNode),
  entry('alert', 'triangle-alert', ['alert', 'incident', 'event'], triangleAlertIconNode),
  entry('unknown', 'circle-help', [], circleHelpIconNode)
];
const unknownIcon = topologyNodeIconCatalog[topologyNodeIconCatalog.length - 1]!;
const iconSrcCache = new Map<string, string>();
const MAXIMUM_CACHED_ICON_SOURCES = 64;

export function resolveTopologyNodeIcon(entityType: string | undefined, textColor: string): TopologyNodeIcon {
  const normalized = (entityType ?? '').toLowerCase();
  const endpoint = normalized.startsWith('/') || normalized.includes('/api/');
  const matched = endpoint
    ? topologyNodeIconCatalog.find(icon => icon.iconKind === 'endpoint')
    : topologyNodeIconCatalog.find(
        icon => icon.iconKind !== 'unknown' && icon.aliases.some(alias => normalized.includes(alias))
      );
  return resolvedIcon(matched ?? unknownIcon, textColor, 'entity-type-catalog');
}

export function resolveTopologyExternalIcon(textColor: string): TopologyNodeIcon {
  return resolvedIcon(unknownIcon, textColor, 'external-fallback');
}

function entry(
  iconKind: TopologyNodeIconKind,
  iconName: TopologyNodeIconName,
  aliases: readonly string[],
  iconNode: IconNode
): IconCatalogEntry {
  return { iconKind, iconName, aliases, iconNode };
}

function resolvedIcon(
  icon: IconCatalogEntry,
  textColor: string,
  iconSource: TopologyNodeIcon['iconSource']
): TopologyNodeIcon {
  return {
    iconKind: icon.iconKind,
    iconName: icon.iconName,
    iconLibrary: 'lucide-react',
    iconSource,
    iconSrc: cachedLucideSvgDataUri(icon, textColor)
  };
}

function cachedLucideSvgDataUri(icon: IconCatalogEntry, textColor: string) {
  const key = `${icon.iconName}\0${textColor}`;
  const cached = iconSrcCache.get(key);
  if (cached) return cached;
  const iconSrc = lucideSvgDataUri(icon.iconNode, textColor);
  // Theme editors may supply arbitrary colors; keep the redraw cache bounded.
  if (iconSrcCache.size >= MAXIMUM_CACHED_ICON_SOURCES) iconSrcCache.clear();
  iconSrcCache.set(key, iconSrc);
  return iconSrc;
}

function lucideSvgDataUri(iconNode: IconNode, textColor: string) {
  const children = iconNode
    .map(([tag, attributes]) => {
      const encoded = Object.entries(attributes)
        .filter(([name]) => name !== 'key')
        .map(([name, value]) => `${name}="${escapeXml(value)}"`)
        .join(' ');
      return `<${tag}${encoded ? ` ${encoded}` : ''}/>`;
    })
    .join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" ` +
    `fill="none" stroke="${escapeXml(textColor)}" stroke-width="2" stroke-linecap="round" ` +
    `stroke-linejoin="round">${children}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
