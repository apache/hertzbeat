import { redirect } from 'next/navigation';
import { buildLoginCompatRouteUrl, type SearchParamsRecord } from '../../lib/passport-login/controller';

export default async function LoginAliasPage({
  searchParams
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = await searchParams;
  redirect(buildLoginCompatRouteUrl(resolvedSearchParams));
}
