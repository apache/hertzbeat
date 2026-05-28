import type { CollectorSummary, PageResult } from '@/lib/types';
import { buildCollectorUrl, type CollectorQueryState } from './query-state';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiDelete = <T>(url: string) => Promise<T>;
type ApiPut = <T>(url: string, body: unknown) => Promise<T>;
type ApiPost = <T>(url: string, body: unknown) => Promise<T>;
type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
type CollectorOperateAction = 'online' | 'offline';
export type CollectorIdentityResponse = {
  identity?: string;
  host?: string;
};
export type CollectorDeployCommands = {
  dockerShell: string;
  packageShell: string;
};

export async function loadCollectorData(apiGet: ApiGetter, query: CollectorQueryState) {
  const list = await apiGet<PageResult<CollectorSummary>>(buildCollectorUrl(query));
  return { list };
}

export function buildCollectorDeleteUrl(collectors: string[]): string {
  const params = new URLSearchParams();
  collectors.forEach(collector => {
    params.append('collectors', collector);
  });
  return `/collector?${params.toString()}`;
}

export async function deleteCollectors(apiDelete: ApiDelete, collectors: string[]) {
  return apiDelete(buildCollectorDeleteUrl(collectors));
}

export function buildCollectorOperateUrl(action: CollectorOperateAction, collectors: string[]): string {
  const params = new URLSearchParams();
  collectors.forEach(collector => {
    params.append('collectors', collector);
  });
  return `/collector/${action}?${params.toString()}`;
}

export async function goOnlineCollectors(apiPut: ApiPut, collectors: string[]) {
  return apiPut(buildCollectorOperateUrl('online', collectors), null);
}

export async function goOfflineCollectors(apiPut: ApiPut, collectors: string[]) {
  return apiPut(buildCollectorOperateUrl('offline', collectors), null);
}

export function buildCollectorGenerateIdentityUrl(collector: string): string {
  return `/collector/generate/${encodeURIComponent(collector.trim())}`;
}

export async function generateCollectorIdentity(apiPost: ApiPost, collector: string) {
  return apiPost<CollectorIdentityResponse>(buildCollectorGenerateIdentityUrl(collector), null);
}

export function buildCollectorDeployCommands(t: Translator, identity: string, managerHost: string): CollectorDeployCommands {
  return {
    dockerShell:
      `${t('collector.deploy.docker.help')}\n` +
      `$ docker run -d \\\n` +
      `    -e IDENTITY=${identity} \\\n` +
      `    -e MANAGER_HOST=${managerHost} \\\n` +
      `    -e MODE=public \\\n` +
      `    --name hertzbeat-collector apache/hertzbeat-collector\n` +
      `${t('collector.deploy.docker.help.1')}\n` +
      `${t('collector.deploy.docker.help.2')}\n` +
      `${t('collector.deploy.docker.help.3')}\n` +
      `${t('collector.deploy.docker.help.4')}\n` +
      `${t('collector.deploy.docker.help.5')}\n` +
      `${t('collector.deploy.docker.help.6')}\n`,
    packageShell:
      `${t('collector.deploy.package.help')}\n` +
      `${t('collector.deploy.package.help.1')}\n` +
      `${t('collector.deploy.package.help.2')}\n` +
      `collector:\n` +
      `  dispatch:\n` +
      `    entrance:\n` +
      `      netty:\n` +
      `        enabled: true\n` +
      `        mode: public\n` +
      `        identity: ${identity}\n` +
      `        manager-host: ${managerHost}\n` +
      `        manager-port: 1158\n` +
      `${t('collector.deploy.package.help.3')}\n`
  };
}
