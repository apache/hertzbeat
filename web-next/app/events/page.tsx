import { redirect } from 'next/navigation';
import { buildLogCompatRouteUrlFromSearchParams, type SearchParamsRecord } from '../../lib/log-manage/query-state';

export default async function EventsAliasPage({
  searchParams
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = await searchParams;
  redirect(buildLogCompatRouteUrlFromSearchParams(resolvedSearchParams, { view: 'list' }));
}
