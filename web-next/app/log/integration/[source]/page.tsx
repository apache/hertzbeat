import { redirect } from 'next/navigation';
import { buildLogIntegrationIngestionHref, createSearchParamReader, type SearchParamsRecord } from '../../../../lib/log-integration/navigation';

export default async function LogIntegrationSourceAliasPage({
  params,
  searchParams
}: {
  params: Promise<{ source: string }>;
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolved = await params;
  const resolvedSearchParams = await searchParams;
  const searchParamReader = createSearchParamReader(resolvedSearchParams, resolved.source);

  redirect(buildLogIntegrationIngestionHref(searchParamReader));
}
