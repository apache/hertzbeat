import { redirect } from 'next/navigation';
import { buildAlertCompatRouteUrl } from '../../../lib/alert-manage/query-state';
import { createCompatSearchParamReader, type SearchParamsRecord } from '../../../lib/compat/search-params';

export default async function AlertCenterAliasPage(props: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = await props?.searchParams;
  redirect(buildAlertCompatRouteUrl(createCompatSearchParamReader(resolvedSearchParams)));
}
