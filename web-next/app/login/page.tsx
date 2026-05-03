import { redirect } from 'next/navigation';
import { buildCompatRedirectTarget, type SearchParamsRecord } from '../../lib/compat/search-params';

export default async function LoginAliasPage({
  searchParams
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = await searchParams;
  redirect(buildCompatRedirectTarget('/passport/login', resolvedSearchParams));
}
