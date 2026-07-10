import { redirect } from 'next/navigation';
import { buildSettingsCompatRouteUrl, type SearchParamsRecord } from '../../../../lib/setting-settings-layout/navigation';

function withDefaultMcpFocus(searchParams?: SearchParamsRecord): SearchParamsRecord {
  return {
    focus: 'mcp',
    ...(searchParams || {})
  };
}

export default async function SettingMcpServerAliasPage(props: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = await props?.searchParams;
  redirect(buildSettingsCompatRouteUrl(withDefaultMcpFocus(resolvedSearchParams)));
}
