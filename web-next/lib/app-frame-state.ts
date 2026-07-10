function normalizeActivePathname(pathname: string) {
  const pathOnly = pathname.split('?')[0] || pathname;
  if (pathOnly === '/log/stream' || pathOnly.startsWith('/log/stream/')) {
    return '/log/manage';
  }
  return pathOnly;
}

export function isActiveRoute(pathname: string, href: string) {
  const activePathname = normalizeActivePathname(pathname);
  return activePathname === href || activePathname.startsWith(`${href}/`);
}

export function isStandaloneRoute(pathname: string) {
  const isPassportRoute = pathname.startsWith('/passport/');
  const isPublicStatusRoute = pathname === '/status' || pathname.startsWith('/status/');
  const isPublicExceptionRoute = pathname === '/exception/403' || pathname === '/exception/404' || pathname === '/exception/500';
  return pathname === '/login' || isPassportRoute || isPublicStatusRoute || isPublicExceptionRoute;
}

export function shouldLoadHeaderState(pathname: string) {
  const pathOnly = pathname.split('?')[0] || pathname;
  const isMonitorCrudRoute = pathOnly === '/monitors' || pathOnly.startsWith('/monitors/');
  const isTopologyRoute = pathOnly === '/topology' || pathOnly.startsWith('/topology/');
  return !isStandaloneRoute(pathOnly) && !isMonitorCrudRoute && !isTopologyRoute;
}

export function shouldLoadHeaderRealtime(pathname: string) {
  const pathOnly = pathname.split('?')[0] || pathname;
  return shouldLoadHeaderState(pathOnly);
}
