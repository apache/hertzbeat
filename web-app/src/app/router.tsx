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

import { Skeleton } from 'antd';
import { Navigate, createBrowserRouter, RouterProvider, useLocation, type RouteObject } from 'react-router-dom';

import { AuthGate } from '@/core/auth/auth-gate';
import { RouteErrorBoundary } from '@/features/errors/route-error-boundary';
import { loadTokenPageRoute } from '@/features/settings/token';
import { BasicLayout } from '@/layout/basic/basic-layout';
import { legacySettingsPaths } from '@/shared/settings/settings-routes';

import { RefineRuntime } from './refine/refine-runtime';
import { applicationRootPath, getAppRoute, getAppRouteIdentity } from './route-registry';

function LegacySettingsRedirect({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate replace to={`${to}${location.search}${location.hash}`} />;
}

// Static route metadata is exported so architecture tests can inspect the data-router boundary.
// eslint-disable-next-line react-refresh/only-export-components
export const appRoutes: RouteObject[] = [
  {
    id: 'application',
    path: applicationRootPath,
    element: <RefineRuntime />,
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <Skeleton active paragraph={{ rows: 6 }} />,
    children: [
      { index: true, element: <Navigate replace to={getAppRoute('dashboard').path} /> },
      {
        ...getAppRouteIdentity('login'),
        lazy: async () => {
          const { LoginPage } = await import('@/features/auth');
          return { Component: LoginPage };
        }
      },
      {
        ...getAppRouteIdentity('status'),
        lazy: async () => {
          const { PublicStatusPage } = await import('@/features/status');
          return { Component: PublicStatusPage };
        }
      },
      {
        id: 'authenticated',
        element: <AuthGate />,
        children: [
          {
            id: 'basic-layout',
            element: <BasicLayout />,
            children: [
              {
                ...getAppRouteIdentity('dashboard'),
                lazy: async () => {
                  const { DashboardPage } = await import('@/features/dashboard');
                  return { Component: DashboardPage };
                }
              },
              {
                ...getAppRouteIdentity('monitors'),
                lazy: async () => {
                  const { MonitorListPage } = await import('@/features/monitor');
                  return { Component: MonitorListPage };
                }
              },
              {
                ...getAppRouteIdentity('explore'),
                lazy: async () => {
                  const { ExplorePage } = await import('@/features/explore');
                  return { Component: ExplorePage };
                }
              },
              {
                ...getAppRouteIdentity('instrumentation'),
                lazy: async () => {
                  const { InstrumentationPage } = await import('@/features/instrumentation');
                  return { Component: InstrumentationPage };
                }
              },
              {
                ...getAppRouteIdentity('monitor-new'),
                lazy: async () => {
                  const { MonitorEditorPage } = await import('@/features/monitor');
                  return { Component: () => <MonitorEditorPage mode="new" /> };
                }
              },
              {
                ...getAppRouteIdentity('monitor-edit'),
                lazy: async () => {
                  const { MonitorEditorPage } = await import('@/features/monitor');
                  return { Component: () => <MonitorEditorPage mode="edit" /> };
                }
              },
              {
                ...getAppRouteIdentity('monitor-detail'),
                lazy: async () => {
                  const { MonitorDetailPage } = await import('@/features/monitor');
                  return { Component: MonitorDetailPage };
                }
              },
              {
                ...getAppRouteIdentity('alerts'),
                lazy: async () => {
                  const { AlertCenterPage } = await import('@/features/alert/pages/alert-center-page');
                  return { Component: AlertCenterPage };
                }
              },
              {
                ...getAppRouteIdentity('alert-rules'),
                lazy: async () => {
                  const { AlertRuleListPage } = await import('@/features/alert/pages/alert-rule-list-page');
                  return { Component: AlertRuleListPage };
                }
              },
              {
                ...getAppRouteIdentity('alert-rule-new'),
                lazy: async () => {
                  const { AlertRuleEditorPage } = await import('@/features/alert/pages/alert-rule-editor-page');
                  return { Component: () => <AlertRuleEditorPage mode="new" /> };
                }
              },
              {
                ...getAppRouteIdentity('alert-rule-edit'),
                lazy: async () => {
                  const { AlertRuleEditorPage } = await import('@/features/alert/pages/alert-rule-editor-page');
                  return { Component: () => <AlertRuleEditorPage mode="edit" /> };
                }
              },
              {
                ...getAppRouteIdentity('alert-groups'),
                lazy: async () => {
                  const { AlertGroupPage } = await import('@/features/alert/pages/alert-group-page');
                  return { Component: AlertGroupPage };
                }
              },
              {
                ...getAppRouteIdentity('alert-inhibits'),
                lazy: async () => {
                  const { AlertInhibitPage } = await import('@/features/alert/pages/alert-inhibit-page');
                  return { Component: AlertInhibitPage };
                }
              },
              {
                ...getAppRouteIdentity('alert-silences'),
                lazy: async () => {
                  const { AlertSilencePage } = await import('@/features/alert/pages/alert-silence-page');
                  return { Component: AlertSilencePage };
                }
              },
              {
                ...getAppRouteIdentity('notice-receivers'),
                lazy: async () => {
                  const { NoticeReceiverPage } = await import('@/features/alert/notice-receiver');
                  return { Component: NoticeReceiverPage };
                }
              },
              {
                ...getAppRouteIdentity('notice-templates'),
                lazy: async () => {
                  const { NoticeTemplatePage } = await import('@/features/alert/notice-template-page');
                  return { Component: NoticeTemplatePage };
                }
              },
              {
                ...getAppRouteIdentity('notice-rules'),
                lazy: async () => {
                  const { NoticeRulePage } = await import('@/features/alert/notice-rule');
                  return { Component: NoticeRulePage };
                }
              },
              {
                ...getAppRouteIdentity('message-server'),
                lazy: async () => {
                  const { MessageServerPage } = await import('@/features/settings/message-server');
                  return { Component: MessageServerPage };
                }
              },
              {
                ...getAppRouteIdentity('tokens'),
                lazy: loadTokenPageRoute
              },
              {
                ...getAppRouteIdentity('system-settings'),
                lazy: async () => {
                  const { SystemConfigPage } = await import('@/features/settings/system-config');
                  return { Component: SystemConfigPage };
                }
              },
              {
                ...getAppRouteIdentity('labels'),
                lazy: async () => {
                  const { LabelPage } = await import('@/features/settings/label');
                  return { Component: LabelPage };
                }
              },
              {
                ...getAppRouteIdentity('object-store'),
                lazy: async () => {
                  const { ObjectStorePage } = await import('@/features/settings/object-store');
                  return { Component: ObjectStorePage };
                }
              },
              {
                ...getAppRouteIdentity('status-management'),
                lazy: async () => {
                  const { StatusManagementPage } = await import('@/features/status');
                  return { Component: StatusManagementPage };
                }
              },
              {
                ...getAppRouteIdentity('settings'),
                element: <Navigate replace to={getAppRoute('notice-receivers').path} />
              },
              {
                id: 'legacy-notice-receivers',
                path: legacySettingsPaths.receivers,
                element: <LegacySettingsRedirect to={getAppRoute('notice-receivers').path} />
              },
              {
                id: 'legacy-notice-templates',
                path: legacySettingsPaths.templates,
                element: <LegacySettingsRedirect to={getAppRoute('notice-templates').path} />
              },
              {
                id: 'legacy-notice-rules',
                path: legacySettingsPaths.rules,
                element: <LegacySettingsRedirect to={getAppRoute('notice-rules').path} />
              },
              {
                id: 'legacy-message-server',
                path: legacySettingsPaths.channels,
                element: <LegacySettingsRedirect to={getAppRoute('message-server').path} />
              },
              {
                id: 'legacy-system-settings',
                path: legacySettingsPaths.system,
                element: <LegacySettingsRedirect to={getAppRoute('system-settings').path} />
              },
              {
                id: 'legacy-labels',
                path: legacySettingsPaths.labels,
                element: <LegacySettingsRedirect to={getAppRoute('labels').path} />
              },
              {
                id: 'legacy-object-store',
                path: legacySettingsPaths.objectStore,
                element: <LegacySettingsRedirect to={getAppRoute('object-store').path} />
              },
              {
                id: 'legacy-status-management',
                path: legacySettingsPaths.statusPage,
                element: <LegacySettingsRedirect to={getAppRoute('status-management').path} />
              },
              {
                ...getAppRouteIdentity('bulletin'),
                lazy: async () => {
                  const { BulletinPage } = await import('@/features/bulletin');
                  return { Component: BulletinPage };
                }
              },
              {
                ...getAppRouteIdentity('not-found'),
                lazy: async () => {
                  const { NotFoundPage } = await import('@/features/errors/not-found-page');
                  return { Component: NotFoundPage };
                }
              }
            ]
          }
        ]
      }
    ]
  }
];

const router = createBrowserRouter(appRoutes);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
