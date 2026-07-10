import { redirect } from 'next/navigation';
import {
  buildMonitorListCompatRouteUrl,
  type SearchParamsRecord
} from '../../../lib/monitor-manage/navigation';

export default async function LegacyMonitorsPage(props: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = await props.searchParams;
  redirect(buildMonitorListCompatRouteUrl(resolvedSearchParams));
}
