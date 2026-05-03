import {
  Activity,
  BellRing,
  Boxes,
  ChevronRight,
  CircleGauge,
  Compass,
  LayoutDashboard,
  Logs,
  Network,
  Orbit,
  type LucideIcon,
  RadioTower,
  Settings2,
  Siren,
  Tags,
  Waypoints
} from 'lucide-react';
import { isActiveRoute } from '../app-frame-state';
import { navSections } from '../nav';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type ShellSidebarItem = {
  key: string;
  href: string;
  title: string;
  active: boolean;
  Icon: LucideIcon;
};

export type ShellSidebarSection = {
  key: string;
  title: string;
  items: ShellSidebarItem[];
};

const shellNavIconMap: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  bulletin: BellRing,
  entities: Boxes,
  trace: Waypoints,
  log: Logs,
  monitor: CircleGauge,
  otlp: RadioTower,
  'otlp-metrics': Activity,
  incidents: Siren,
  actions: ChevronRight,
  topology: Orbit,
  explorer: Compass,
  alert: BellRing,
  'alert-setting': Settings2,
  settings: Settings2,
  token: Tags,
  status: Network
};

export function resolveShellNavIcon(icon?: string) {
  if (!icon) return Compass;
  return shellNavIconMap[icon] || Compass;
}

export function buildShellSidebarSections(pathname: string, t: Translator): ShellSidebarSection[] {
  return navSections.map(section => ({
    key: section.key,
    title: section.titleKey ? t(section.titleKey) : section.title,
    items: section.items.map(item => ({
      key: item.key,
      href: item.href,
      title: item.labelKey ? t(item.labelKey) : item.label,
      active: isActiveRoute(pathname, item.href),
      Icon: resolveShellNavIcon(item.icon)
    }))
  }));
}
