import { redirect } from 'next/navigation';
import { buildPublicStatusCompatRouteUrl, type SearchParamsRecord } from '../../../lib/status-center/controller';

export default async function StatusPublicAliasPage(props: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = await props?.searchParams;
  redirect(buildPublicStatusCompatRouteUrl(resolvedSearchParams));
}
