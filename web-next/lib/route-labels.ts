import { routeCatalog } from './nav';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRoutePattern(pattern: string) {
  return new RegExp(
    `^${escapeRegex(pattern)
      .replace(/\\\[\\.\\.\\\.([^\]]+)\\\]/g, '.+')
      .replace(/\\\[([^\]]+)\\\]/g, '[^/]+')}$`
  );
}

export function routeLabel(pathname: string, t: Translator) {
  const normalized = pathname.split('?')[0].split('#')[0] || '/';
  const rankedRoutes = [...routeCatalog].sort((left, right) => right.href.length - left.href.length);
  const matchedRoute = rankedRoutes.find(route => buildRoutePattern(route.href).test(normalized));
  if (matchedRoute) {
    return t(matchedRoute.labelKey);
  }
  return t('menu.dashboard');
}
