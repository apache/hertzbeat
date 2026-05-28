import { redirect } from 'next/navigation';

import { buildOverviewCompatRouteUrl, type SearchParamsRecord } from '../lib/overview/navigation';

interface HomePageProps {
  searchParams?: Promise<SearchParamsRecord>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;

  redirect(buildOverviewCompatRouteUrl(resolvedSearchParams));
}
