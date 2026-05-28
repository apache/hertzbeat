import { redirect } from 'next/navigation';
import { buildLogIntegrationIngestionHref, createSearchParamReader, type SearchParamsRecord } from '../../../../lib/log-integration/navigation';

export default async function LogIntegrationSourceAliasPage({
  searchParams
}: {
  params: Promise<{ source: string }>;
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = await searchParams;
  const searchParamReader = createSearchParamReader(resolvedSearchParams);

  redirect(buildLogIntegrationIngestionHref(searchParamReader));
}
