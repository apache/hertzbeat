import { redirect } from 'next/navigation';
import { buildAlertCompatRouteUrlFromSearchParams, type SearchParamsRecord } from '../../../lib/alert-manage/query-state';

export default async function AlertCenterAliasPage(props: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = await props?.searchParams;
  redirect(buildAlertCompatRouteUrlFromSearchParams(resolvedSearchParams));
}
