import type { EmailNoticeSender, SmsNoticeSender } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiPoster = <T>(url: string, payload: unknown) => Promise<T>;

export async function loadMessageServerData(apiGet: ApiGetter) {
  const [email, sms] = await Promise.all([
    apiGet<EmailNoticeSender>('/config/email'),
    apiGet<SmsNoticeSender>('/config/sms')
  ]);

  return { email, sms };
}

export async function saveEmailConfig(apiPost: ApiPoster, email: EmailNoticeSender) {
  return apiPost<string>('/config/email', email);
}

export async function saveSmsConfig(apiPost: ApiPoster, sms: SmsNoticeSender) {
  return apiPost<string>('/config/sms', sms);
}
