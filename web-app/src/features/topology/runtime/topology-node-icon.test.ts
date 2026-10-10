/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it } from 'vitest';

import { resolveTopologyExternalIcon, resolveTopologyNodeIcon } from './topology-node-icon';

describe('topology node icon resolver', () => {
  it.each([
    ['application', 'application', 'app-window'],
    ['app', 'application', 'app-window'],
    ['service', 'service', 'cube'],
    ['api', 'service', 'cube'],
    ['endpoint', 'endpoint', 'path'],
    ['/checkout', 'endpoint', 'path'],
    ['database', 'database', 'database'],
    ['db', 'database', 'database'],
    ['cache', 'cache', 'stack'],
    ['queue', 'queue', 'queue'],
    ['mq', 'queue', 'queue'],
    ['broker', 'queue', 'queue'],
    ['topic', 'queue', 'queue'],
    ['middleware', 'middleware', 'share-network'],
    ['deployment', 'k8s-workload', 'cube-focus'],
    ['collector', 'monitor', 'pulse'],
    ['host', 'resource', 'hard-drives'],
    ['event', 'alert', 'warning']
  ] as const)('maps %s to the maintained %s Phosphor icon', (entityType, iconKind, iconName) => {
    expect(resolveTopologyNodeIcon(entityType, '#102030')).toMatchObject({
      iconKind,
      iconName,
      iconLibrary: '@phosphor-icons/core',
      iconLibraryVersion: '2.1.1',
      assetPackageLicense: 'MIT',
      iconSource: 'entity-type-catalog'
    });
  });

  it.each([
    ['spring-boot-service', 'service', 'spring-original'],
    ['docker-container', 'k8s-workload', 'docker-original'],
    ['java-service', 'service', 'java-original'],
    ['nodejs-service', 'service', 'nodejs-original'],
    ['python-service', 'service', 'python-original'],
    ['php-service', 'service', 'php-original'],
    ['postgresql-database', 'database', 'postgresql-original'],
    ['postgres', 'database', 'postgresql-original'],
    ['mysql-database', 'database', 'mysql-original'],
    ['mongodb-database', 'database', 'mongodb-original'],
    ['mongo', 'database', 'mongodb-original'],
    ['redis-cache', 'cache', 'redis-original'],
    ['rabbitmq-queue', 'queue', 'rabbitmq-original'],
    ['rabbit', 'queue', 'rabbitmq-original'],
    ['kubernetes-workload', 'k8s-workload', 'kubernetes-original']
  ] as const)('uses the exact %s technology identity from Devicon', (entityType, iconKind, iconName) => {
    expect(resolveTopologyNodeIcon(entityType, '#102030')).toMatchObject({
      iconKind,
      iconName,
      iconLibrary: 'devicon',
      iconLibraryVersion: '2.17.0',
      assetPackageLicense: 'MIT',
      iconSource: 'technology-catalog'
    });
  });

  it('treats Kafka as explicit technology identity while using the readable maintained queue glyph', () => {
    expect(resolveTopologyNodeIcon('kafka-topic', '#102030')).toMatchObject({
      iconKind: 'queue',
      iconName: 'queue',
      iconLibrary: '@phosphor-icons/core',
      iconLibraryVersion: '2.1.1',
      assetPackageLicense: 'MIT',
      iconSource: 'technology-fallback'
    });
  });

  it('uses explicit unknown and external fallbacks', () => {
    expect(resolveTopologyNodeIcon('vendor-private-kind', '#102030')).toMatchObject({
      iconKind: 'unknown',
      iconName: 'question',
      iconSource: 'entity-type-catalog'
    });
    expect(resolveTopologyExternalIcon('#102030')).toMatchObject({
      iconKind: 'unknown',
      iconName: 'question',
      iconLibrary: '@phosphor-icons/core',
      iconSource: 'external-fallback'
    });
  });

  it('normalizes official assets into one padded 24px visual box and applies the entity color to Phosphor only', () => {
    const light = resolveTopologyNodeIcon('service', '#102030').iconSrc;
    const dark = resolveTopologyNodeIcon('service', '#e8edf5').iconSrc;
    const spring = decodeURIComponent(resolveTopologyNodeIcon('spring-service', '#102030').iconSrc);

    expect(light).not.toBe(dark);
    expect(decodeURIComponent(light)).toContain('viewBox="0 0 24 24"');
    expect(decodeURIComponent(light)).toContain('x="2" y="2" width="20" height="20"');
    expect(decodeURIComponent(light)).toContain('fill="#102030"');
    expect(decodeURIComponent(dark)).toContain('fill="#e8edf5"');
    expect(spring).toContain('viewBox="0 0 24 24"');
    expect(spring).toContain('#77bc1f');
    expect(spring).not.toContain('#102030');
  });
});
