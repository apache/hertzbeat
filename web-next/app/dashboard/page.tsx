import { redirect } from 'next/navigation';
import { buildDashboardCompatRouteUrl, type SearchParamsRecord } from '../../lib/dashboard/navigation';

export default async function DashboardAliasPage({
  searchParams
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = await searchParams;
  redirect(buildDashboardCompatRouteUrl(resolvedSearchParams));
}
