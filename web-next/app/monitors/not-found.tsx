import { redirect } from 'next/navigation';
import { buildMonitorListCompatRouteUrl } from '../../lib/monitor-manage/navigation';

export default function MonitorsNotFound() {
  redirect(buildMonitorListCompatRouteUrl());
}
