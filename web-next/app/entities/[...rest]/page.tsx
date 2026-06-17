import { redirect } from 'next/navigation';
import { buildEntityListCompatRouteUrl, type SearchParamsRecord } from '../../../lib/entity-manage/query-state';

export default async function EntityUnknownRoutePage(props: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = await props?.searchParams;
  redirect(buildEntityListCompatRouteUrl(resolvedSearchParams));
}
