import { buildMonitorListReturnHref, type MonitorNavigationContext } from '../monitor-manage/navigation';

export type MonitorEditorReturnContext = Omit<MonitorNavigationContext, 'app'>;

export function buildMonitorEditorReturnUrl(app?: string | null, returnContext?: MonitorEditorReturnContext | null) {
  return buildMonitorListReturnHref({
    ...returnContext,
    app
  });
}
