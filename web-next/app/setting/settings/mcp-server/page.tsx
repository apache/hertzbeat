import { redirect } from 'next/navigation';
import { buildSettingsCompatRouteUrl, type SearchParamsRecord } from '../../../../lib/setting-settings-layout/navigation';

export default async function SettingMcpServerAliasPage(props: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = await props?.searchParams;
  redirect(buildSettingsCompatRouteUrl(resolvedSearchParams));
}
