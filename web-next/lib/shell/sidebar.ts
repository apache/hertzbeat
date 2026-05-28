import {
  Activity,
  BellDot,
  BellOff,
  BellRing,
  Boxes,
  ChevronRight,
  CircleGauge,
  CircleHelp,
  Compass,
  FileCode2,
  FileCog,
  GitMerge,
  LayoutDashboard,
  ListTree,
  Logs,
  Network,
  Orbit,
  Plug,
  RadioReceiver,
  type LucideIcon,
  RadioTower,
  Search,
  Send,
  ServerCog,
  Settings2,
  ShieldOff,
  Siren,
  Tags,
  Waypoints,
  Webhook
} from 'lucide-react';
import { isActiveRoute } from '../app-frame-state';
import { navSections } from '../nav';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type ShellSidebarItem = {
  key: string;
  href: string;
  title: string;
  active: boolean;
  iconKey: string;
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
  'entity-discovery': Search,
  'entity-definition': ListTree,
  trace: Waypoints,
  log: Logs,
  monitor: CircleGauge,
  collector: RadioReceiver,
  'monitor-template': FileCode2,
  otlp: RadioTower,
  'otlp-metrics': Activity,
  incidents: Siren,
  actions: ChevronRight,
  topology: Orbit,
  explorer: Compass,
  alert: BellRing,
  'alert-setting': Settings2,
  'alert-integration': Webhook,
  'alert-group': GitMerge,
  'alert-inhibit': ShieldOff,
  'alert-silence': BellOff,
  'alert-notice': Send,
  settings: Settings2,
  'mcp-server': ServerCog,
  'settings-config': FileCog,
  plugins: Plug,
  help: CircleHelp,
  'alert-bulletin': BellDot,
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
    title: t(section.titleKey),
    items: section.items.map(item => ({
      key: item.key,
      href: item.href,
      title: t(item.labelKey),
      active: isActiveRoute(pathname, item.href),
      iconKey: item.icon,
      Icon: resolveShellNavIcon(item.icon)
    }))
  }));
}
