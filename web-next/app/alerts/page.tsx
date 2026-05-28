import { redirect } from 'next/navigation';
import { buildAlertCompatRouteUrlFromSearchParams, type SearchParamsRecord } from '../../lib/alert-manage/query-state';

export default async function AlertsAliasPage({
  searchParams
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = await searchParams;
  redirect(buildAlertCompatRouteUrlFromSearchParams(resolvedSearchParams));
}
