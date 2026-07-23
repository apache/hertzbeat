/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import appWindowSvg from '@phosphor-icons/core/assets/duotone/app-window-duotone.svg?raw';
import cubeFocusSvg from '@phosphor-icons/core/assets/duotone/cube-focus-duotone.svg?raw';
import cubeSvg from '@phosphor-icons/core/assets/duotone/cube-duotone.svg?raw';
import databaseSvg from '@phosphor-icons/core/assets/duotone/database-duotone.svg?raw';
import hardDrivesSvg from '@phosphor-icons/core/assets/duotone/hard-drives-duotone.svg?raw';
import pathSvg from '@phosphor-icons/core/assets/duotone/path-duotone.svg?raw';
import pulseSvg from '@phosphor-icons/core/assets/duotone/pulse-duotone.svg?raw';
import questionSvg from '@phosphor-icons/core/assets/duotone/question-duotone.svg?raw';
import queueSvg from '@phosphor-icons/core/assets/duotone/queue-duotone.svg?raw';
import shareNetworkSvg from '@phosphor-icons/core/assets/duotone/share-network-duotone.svg?raw';
import stackSvg from '@phosphor-icons/core/assets/duotone/stack-duotone.svg?raw';
import warningSvg from '@phosphor-icons/core/assets/duotone/warning-duotone.svg?raw';
import dockerSvg from 'devicon/icons/docker/docker-original.svg?raw';
import javaSvg from 'devicon/icons/java/java-original.svg?raw';
import kubernetesSvg from 'devicon/icons/kubernetes/kubernetes-original.svg?raw';
import mongodbSvg from 'devicon/icons/mongodb/mongodb-original.svg?raw';
import mysqlSvg from 'devicon/icons/mysql/mysql-original.svg?raw';
import nodejsSvg from 'devicon/icons/nodejs/nodejs-original.svg?raw';
import phpSvg from 'devicon/icons/php/php-original.svg?raw';
import postgresqlSvg from 'devicon/icons/postgresql/postgresql-original.svg?raw';
import pythonSvg from 'devicon/icons/python/python-original.svg?raw';
import rabbitmqSvg from 'devicon/icons/rabbitmq/rabbitmq-original.svg?raw';
import redisSvg from 'devicon/icons/redis/redis-original.svg?raw';
import springSvg from 'devicon/icons/spring/spring-original.svg?raw';

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
export type TopologyNodeIcon = {
  assetPackageLicense: 'MIT';
  iconKind: TopologyNodeIconKind;
  iconName: string;
  iconLibrary: '@phosphor-icons/core' | 'devicon';
  iconLibraryVersion: '2.1.1' | '2.17.0';
  iconSource: 'entity-type-catalog' | 'technology-catalog' | 'technology-fallback' | 'external-fallback';
  iconSrc: string;
};
type IconCatalogEntry = Omit<TopologyNodeIcon, 'iconSource' | 'iconSrc'> & {
  aliases: readonly string[];
  rawSvg: string;
};

const genericCatalog: readonly IconCatalogEntry[] = [
  phosphor('application', 'app-window', ['application', 'app'], appWindowSvg),
  phosphor('service', 'cube', ['service', 'api'], cubeSvg),
  phosphor('endpoint', 'path', ['endpoint', 'route', 'path', 'url', '/api/'], pathSvg),
  phosphor('database', 'database', ['database', 'db'], databaseSvg),
  phosphor('cache', 'stack', ['cache', 'memcached'], stackSvg),
  phosphor('queue', 'queue', ['queue', 'mq', 'broker', 'topic', 'messaging'], queueSvg),
  phosphor('middleware', 'share-network', ['middleware'], shareNetworkSvg),
  phosphor(
    'k8s-workload',
    'cube-focus',
    ['workload', 'pod', 'deployment', 'daemonset', 'statefulset', 'job', 'cronjob'],
    cubeFocusSvg
  ),
  phosphor('monitor', 'pulse', ['monitor', 'collector', 'agent', 'probe', 'check'], pulseSvg),
  phosphor('resource', 'hard-drives', ['resource', 'host', 'node', 'server', 'vm', 'device'], hardDrivesSvg),
  phosphor('alert', 'warning', ['alert', 'incident', 'event'], warningSvg),
  phosphor('unknown', 'question', [], questionSvg)
];
// Devicon is an MIT-licensed asset package; its technology marks remain property of their respective owners.
// Match those marks from explicit entityType tokens only, never from an entity's display name.
const technologyCatalog: readonly IconCatalogEntry[] = [
  devicon('service', 'spring-original', ['spring', 'springboot'], springSvg),
  devicon('k8s-workload', 'docker-original', ['docker'], dockerSvg),
  devicon('service', 'java-original', ['java'], javaSvg),
  devicon('service', 'nodejs-original', ['nodejs'], nodejsSvg),
  devicon('service', 'python-original', ['python'], pythonSvg),
  devicon('service', 'php-original', ['php'], phpSvg),
  devicon('database', 'postgresql-original', ['postgresql', 'postgres'], postgresqlSvg),
  devicon('database', 'mysql-original', ['mysql'], mysqlSvg),
  devicon('database', 'mongodb-original', ['mongodb', 'mongo'], mongodbSvg),
  devicon('cache', 'redis-original', ['redis'], redisSvg),
  devicon('queue', 'rabbitmq-original', ['rabbitmq', 'rabbit'], rabbitmqSvg),
  devicon('k8s-workload', 'kubernetes-original', ['kubernetes', 'k8s'], kubernetesSvg)
];
const technologyFallbackCatalog: readonly IconCatalogEntry[] = [phosphor('queue', 'queue', ['kafka'], queueSvg)];
const unknownIcon = genericCatalog[genericCatalog.length - 1]!;
const iconSrcCache = new Map<string, string>();
const MAXIMUM_CACHED_ICON_SOURCES = 64;

export function resolveTopologyNodeIcon(entityType: string | undefined, color: string): TopologyNodeIcon {
  const normalized = normalizeEntityType(entityType);
  const technology = technologyCatalog.find(icon => icon.aliases.some(alias => normalized.tokens.has(alias)));
  if (technology) return resolvedIcon(technology, color, 'technology-catalog');
  const technologyFallback = technologyFallbackCatalog.find(icon =>
    icon.aliases.some(alias => normalized.tokens.has(alias))
  );
  if (technologyFallback) return resolvedIcon(technologyFallback, color, 'technology-fallback');
  const endpoint = normalized.value.startsWith('/') || normalized.value.includes('/api/');
  const generic = endpoint
    ? genericCatalog.find(icon => icon.iconKind === 'endpoint')
    : genericCatalog.find(
        icon => icon.iconKind !== 'unknown' && icon.aliases.some(alias => normalized.value.includes(alias))
      );
  return resolvedIcon(generic ?? unknownIcon, color, 'entity-type-catalog');
}

export function resolveTopologyExternalIcon(color: string): TopologyNodeIcon {
  return resolvedIcon(unknownIcon, color, 'external-fallback');
}

function phosphor(
  iconKind: TopologyNodeIconKind,
  iconName: string,
  aliases: readonly string[],
  rawSvg: string
): IconCatalogEntry {
  return {
    aliases,
    assetPackageLicense: 'MIT',
    iconKind,
    iconLibrary: '@phosphor-icons/core',
    iconLibraryVersion: '2.1.1',
    iconName,
    rawSvg
  };
}

function devicon(
  iconKind: TopologyNodeIconKind,
  iconName: string,
  aliases: readonly string[],
  rawSvg: string
): IconCatalogEntry {
  return {
    aliases,
    assetPackageLicense: 'MIT',
    iconKind,
    iconLibrary: 'devicon',
    iconLibraryVersion: '2.17.0',
    iconName,
    rawSvg
  };
}

function resolvedIcon(
  icon: IconCatalogEntry,
  color: string,
  iconSource: TopologyNodeIcon['iconSource']
): TopologyNodeIcon {
  return {
    assetPackageLicense: icon.assetPackageLicense,
    iconKind: icon.iconKind,
    iconLibrary: icon.iconLibrary,
    iconLibraryVersion: icon.iconLibraryVersion,
    iconName: icon.iconName,
    iconSource,
    iconSrc: cachedOfficialSvgDataUri(icon, color)
  };
}

function cachedOfficialSvgDataUri(icon: IconCatalogEntry, color: string) {
  const themedColor = icon.iconLibrary === '@phosphor-icons/core' ? color : '';
  const key = `${icon.iconLibrary}\0${icon.iconName}\0${themedColor}`;
  const cached = iconSrcCache.get(key);
  if (cached) return cached;
  const iconSrc = officialSvgDataUri(icon.rawSvg, themedColor);
  if (iconSrcCache.size >= MAXIMUM_CACHED_ICON_SOURCES) iconSrcCache.clear();
  iconSrcCache.set(key, iconSrc);
  return iconSrc;
}

function officialSvgDataUri(rawSvg: string, color: string) {
  const source = color ? rawSvg.replaceAll('currentColor', escapeXml(color)) : rawSvg;
  const normalizedSource = source.replace(
    /<svg\b/,
    '<svg x="2" y="2" width="20" height="20" preserveAspectRatio="xMidYMid meet"'
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${normalizedSource}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function normalizeEntityType(entityType: string | undefined) {
  const value = (entityType ?? '').trim().toLowerCase();
  const words = value.split(/[^a-z0-9]+/).filter(Boolean);
  return { tokens: new Set([...words, words.join('')]), value };
}

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
