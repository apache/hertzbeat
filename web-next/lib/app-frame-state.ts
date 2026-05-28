export function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isStandaloneRoute(pathname: string) {
  const isPassportRoute = pathname.startsWith('/passport/');
  const isPublicStatusRoute = pathname === '/status' || pathname.startsWith('/status/');
  const isPublicExceptionRoute = pathname === '/exception/403' || pathname === '/exception/404';
  return pathname === '/login' || isPassportRoute || isPublicStatusRoute || isPublicExceptionRoute;
}

export function shouldLoadHeaderState(pathname: string) {
  const pathOnly = pathname.split('?')[0] || pathname;
  const isMonitorCrudRoute = pathOnly === '/monitors' || pathOnly.startsWith('/monitors/');
  return !isStandaloneRoute(pathOnly) && !isMonitorCrudRoute;
}
