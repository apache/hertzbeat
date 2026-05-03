import { redirect } from 'next/navigation';
import { buildLogIntegrationIngestionHref, createSearchParamReader, type SearchParamsRecord } from '../../../lib/log-integration/navigation';

export default async function LogIntegrationAliasPage({
  searchParams
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = await searchParams;
  redirect(buildLogIntegrationIngestionHref(createSearchParamReader(resolvedSearchParams)));
}
