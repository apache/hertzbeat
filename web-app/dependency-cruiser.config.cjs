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

const productionSource = '[.](?:test|spec)[.](?:ts|tsx)$';
const featurePresentationSource = [
  '^src/features/[^/]+/(?:components|pages)/',
  '^src/features/[^/]+/[^/]+/(?:components|pages)/',
  '^src/features/[^/]+/[^/]+-page[.]tsx?$'
].join('|');

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular-production-dependencies',
      severity: 'error',
      from: { path: '^src/', pathNot: productionSource },
      to: { circular: true }
    },
    {
      name: 'no-production-to-test-dependencies',
      severity: 'error',
      from: { path: '^src/', pathNot: productionSource },
      to: { path: productionSource }
    },
    {
      name: 'no-feature-to-app-or-layout',
      severity: 'error',
      from: { path: '^src/features/', pathNot: productionSource },
      to: { path: '^src/(?:app|layout)/' }
    },
    {
      name: 'no-shared-to-outer-layers',
      severity: 'error',
      from: { path: '^src/shared/', pathNot: productionSource },
      to: { path: '^src/(?:app|layout|features)/' }
    },
    {
      name: 'no-core-to-outer-layers',
      severity: 'error',
      from: { path: '^src/core/', pathNot: productionSource },
      to: { path: '^src/(?:app|layout|features|shared)/' }
    },
    {
      name: 'no-layout-to-app',
      severity: 'error',
      from: { path: '^src/layout/', pathNot: productionSource },
      to: { path: '^src/app/' }
    },
    {
      name: 'session-provider-single-production-owner',
      severity: 'error',
      from: {
        path: '^src/',
        pathNot: `(?:${productionSource}|^src/app/refine/refine-runtime[.]tsx$)`
      },
      to: { path: '^src/core/auth/session-provider[.]tsx$' }
    },
    {
      name: 'auth-gate-single-production-owner',
      severity: 'error',
      from: {
        path: '^src/',
        pathNot: `(?:${productionSource}|^src/app/router[.]tsx$)`
      },
      to: { path: '^src/core/auth/auth-gate[.]tsx$' }
    },
    {
      name: 'shell-header-composition-only',
      severity: 'error',
      from: { path: '^src/layout/shell/shell-header[.]tsx$' },
      to: {
        path: [
          '^(?:node_modules/)?(?:@refinedev/core|@tanstack/react-query)',
          '^src/core/auth/(?:session-api|session-identity-context)[.]tsx?$',
          '^src/core/i18n/i18n[.]ts$',
          '^src/core/runtime-(?:preferences|theme-context)[.]tsx?$',
          '^src/shared/navigation/app-paths[.]ts$'
        ].join('|')
      }
    },
    {
      name: 'no-presentation-to-api',
      severity: 'error',
      from: {
        path: '^src/features/instrumentation/(?:components|pages)/',
        pathNot: productionSource
      },
      to: {
        path: '^src/features/instrumentation/api/',
        dependencyTypesNot: ['type-only']
      }
    },
    {
      name: 'no-feature-api-to-react-runtime',
      severity: 'error',
      from: { path: '^src/features/[^/]+/(?:api|[^/]+/api)/', pathNot: productionSource },
      to: {
        dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled', 'npm-no-pkg', 'unknown'],
        path: '^(?:node_modules/)?(?:react|react-dom|react-router|react-router-dom|antd|@refinedev/)'
      }
    },
    {
      name: 'no-feature-presentation-to-orchestration-runtime',
      severity: 'error',
      from: {
        path: featurePresentationSource,
        pathNot: productionSource
      },
      to: {
        dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled', 'npm-no-pkg', 'unknown'],
        path: '^(?:node_modules/)?(?:@tanstack/react-query|react-router|react-router-dom|@refinedev)(?:/|$)'
      }
    },
    {
      name: 'no-feature-presentation-to-http-transport',
      severity: 'error',
      from: {
        path: featurePresentationSource,
        pathNot: productionSource
      },
      to: {
        path: '^src/core/http(?:[.]tsx?$|/)'
      }
    },
    {
      name: 'no-feature-model-to-ui-runtime',
      severity: 'error',
      from: {
        path: [
          '^src/features/[^/]+/model/',
          '^src/features/[^/]+/[^/]+/model/',
          '^src/features/[^/]+/[^/]+-model[.]tsx?$'
        ].join('|'),
        pathNot: productionSource
      },
      to: {
        dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled', 'npm-no-pkg', 'unknown'],
        path: '^(?:node_modules/)?(?:react|react-dom|react-router|react-router-dom|@tanstack/react-query|antd|@refinedev/)(?:/|$)'
      }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
      dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled', 'npm-no-pkg']
    },
    exclude: { path: '^(?:coverage|dist|node_modules|[.]tmp)/' },
    tsConfig: { fileName: 'tsconfig.app.json' },
    tsPreCompilationDeps: true
  }
};
