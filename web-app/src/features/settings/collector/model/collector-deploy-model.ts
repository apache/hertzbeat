/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { CollectorMutationFailure } from './collector-model';

export type CollectorDeployInfo = {
  identity: string;
  host: string;
};

export const collectorReleasesUrl = 'https://github.com/apache/hertzbeat/releases';

// Keep the established Angular deployment and published Collector conventions.
const collectorManagerPort = 1158;
const collectorImage = 'apache/hertzbeat-collector';
const collectorContainerName = 'hertzbeat-collector';

export type CollectorDeployFailure = CollectorMutationFailure | 'contract';

export type CollectorDeployState =
  | { kind: 'closed' }
  | { kind: 'editing'; collector: string }
  | { kind: 'submitting'; collector: string }
  | { kind: 'failed'; collector: string; failure: CollectorDeployFailure }
  | { kind: 'ready'; collector: string; deployment: CollectorDeployInfo };

export function collectorDeployDockerCommand(deployment: CollectorDeployInfo) {
  return [
    'docker run -d \\',
    `  -e IDENTITY=${quotePosixShell(deployment.identity)} \\`,
    `  -e MANAGER_HOST=${quotePosixShell(deployment.host)} \\`,
    `  -e MODE=${quotePosixShell('public')} \\`,
    `  --name ${collectorContainerName} ${collectorImage}`
  ].join('\n');
}

export function collectorDeployPackageConfig(deployment: CollectorDeployInfo) {
  return [
    'collector:',
    '  dispatch:',
    '    entrance:',
    '      netty:',
    '        enabled: true',
    '        mode: public',
    `        identity: ${quoteYamlScalar(deployment.identity)}`,
    `        manager-host: ${quoteYamlScalar(deployment.host)}`,
    `        manager-port: ${collectorManagerPort}`
  ].join('\n');
}

function quotePosixShell(value: string) {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function quoteYamlScalar(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}
