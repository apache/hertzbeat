import { redirect } from 'next/navigation';
import { buildCompatRedirectTarget, type SearchParamsRecord } from '../../lib/compat/search-params';

export default async function SettingIndexPage(props: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = await props?.searchParams;
  redirect(buildCompatRedirectTarget('/setting/settings/config', resolvedSearchParams));
}
