/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { appRoutes } from './app-routes';

const router = createBrowserRouter(appRoutes);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
