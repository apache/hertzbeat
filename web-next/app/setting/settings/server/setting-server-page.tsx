'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { HzInlineFeedback } from '@hertzbeat/ui';
import { ClientWorkbench } from '../../../../components/workbench/client-workbench';
import { useI18n } from '../../../../components/providers/i18n-provider';
import { OverlayDialog } from '../../../../components/workbench/overlay-dialog';
import { SettingsConsoleTitle } from '../../../../components/settings/settings-console-shell';
import {
  SettingsDialogField,
  SettingsDialogFooter,
  SettingsDialogForm,
  SettingsDialogInput,
  SettingsDialogSelect,
  SettingsDialogToggle
} from '../../../../components/settings/settings-dialog-form';
import { SettingsSummaryList } from '../../../../components/settings/settings-summary-list';
import { Button } from '../../../../components/ui/button';
import { NumberStepper } from '../../../../components/ui/number-stepper';
import { hzOpsCatalogVisual } from '../../../../lib/hz-ops-visual';
import { apiMessageGet, apiMessagePost } from '../../../../lib/api-client';
import { loadMessageServerData, saveEmailConfig, saveSmsConfig } from '../../../../lib/setting-server/controller';
import {
  SMS_PROVIDER_OPTIONS,
  UNISMS_AUTH_MODE_OPTIONS,
  buildMessageServerSummaryItems,
  canSaveEmailSender,
  canSaveSmsSender,
  cloneSmsSender,
  isUniSmsAccessKeySecretRequired,
  normalizeEmailSender,
  normalizeSmsProviderType,
  normalizeSmsSender,
  updateSmsProviderField,
  updateSmsType
} from '../../../../lib/setting-server/view-model';
import type { EmailNoticeSender, SmsNoticeSender } from '../../../../lib/types';

type MessageServerData = {
  email: EmailNoticeSender;
  sms: SmsNoticeSender;
};

const coldServerVisual = hzOpsCatalogVisual;

const SETTING_SERVER_SETTLED_CACHE_TTL_MS = 10_000;

const coldPrimaryButtonClassName =
  'h-8 min-w-[96px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-[#f8fafc]';

const coldSecondaryButtonClassName =
  'h-8 min-w-[96px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151923] hover:text-[#f8fafc]';

export default function SettingServerPage() {
  const { t } = useI18n();
  const [emailDraft, setEmailDraft] = useState<EmailNoticeSender | null>(null);
  const [smsDraft, setSmsDraft] = useState<SmsNoticeSender | null>(null);
  const [smsSnapshot, setSmsSnapshot] = useState<SmsNoticeSender | null>(null);
  const [openDialog, setOpenDialog] = useState<'email' | 'sms' | null>(null);
  const [savingDialog, setSavingDialog] = useState<'email' | 'sms' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'error' | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const settingServerCacheKey = useMemo(
    () => ['setting-server', '/config/email', '/config/sms', reloadVersion].join(':'),
    [reloadVersion]
  );

  const load = useCallback(async (): Promise<MessageServerData> => {
    void reloadVersion;
    return loadMessageServerData(apiMessageGet);
  }, [reloadVersion]);

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('setting.settings.server.loading')}
      cacheKey={settingServerCacheKey}
      cacheSettledTtlMs={SETTING_SERVER_SETTLED_CACHE_TTL_MS}
    >
      {data => {
        const email = normalizeEmailSender(emailDraft || data.email || {});
        const sms = normalizeSmsSender(smsDraft || data.sms || {});
        const canSaveEmail = canSaveEmailSender(email);
        const canSaveSms = canSaveSmsSender(sms);
        const smsType = normalizeSmsProviderType(sms.type);
        const unismsNeedsSecret = isUniSmsAccessKeySecretRequired(sms);

        async function saveEmail() {
          setSavingDialog('email');
          setMessage(null);
          setMessageTone(null);
          try {
            await saveEmailConfig(apiMessagePost, email);
            setOpenDialog(null);
            setMessage(t('common.notify.apply-success'));
            setMessageTone('success');
            setReloadVersion(version => version + 1);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : t('common.notify.apply-fail'));
            setMessageTone('error');
          } finally {
            setSavingDialog(null);
          }
        }

        async function saveSms() {
          setSavingDialog('sms');
          setMessage(null);
          setMessageTone(null);
          try {
            await saveSmsConfig(apiMessagePost, sms);
            setOpenDialog(null);
            setSmsSnapshot(cloneSmsSender(sms));
            setMessage(t('common.notify.apply-success'));
            setMessageTone('success');
            setReloadVersion(version => version + 1);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : t('common.notify.apply-fail'));
            setMessageTone('error');
          } finally {
            setSavingDialog(null);
          }
        }

        return (
          <div
            className="space-y-4"
            data-settings-server-page="otlp-hertzbeat-ui-message-server"
            data-settings-server-style-baseline={coldServerVisual.canvasName}
            data-settings-server-layout="full-width-settings-summary"
            data-settings-server-dialog-width-contract="angular-width-40-percent"
            data-settings-server-dialog-field-layout-contract="angular-label-7-control-12"
          >
            <SettingsConsoleTitle>{t('settings.server')}</SettingsConsoleTitle>

            <div data-settings-server-summary="hertzbeat-ui-summary-list">
              <SettingsSummaryList
                items={buildMessageServerSummaryItems(email, sms, t).map(item => {
                  const title = String(item.title);

                  return {
                    ...item,
                    actionLabel: t('common.button.setting'),
                    actionAriaLabel: t('settings.server.summary.configure-action', { title }),
                    onAction: () => {
                      setMessage(null);
                      setMessageTone(null);
                      if (item.key === 'email') {
                        setOpenDialog('email');
                        return;
                      }

                      setSmsSnapshot(cloneSmsSender(sms));
                      setOpenDialog('sms');
                    }
                  };
                })}
              />
            </div>

            {message ? (
              <HzInlineFeedback
                tone={messageTone === 'success' ? 'success' : 'critical'}
                title={message}
                variant="embedded"
                data-settings-server-apply-feedback="angular-apply-notify"
                data-settings-server-apply-feedback-owner="hertzbeat-ui-inline-feedback"
              />
            ) : null}

            <OverlayDialog
              open={openDialog === 'email'}
              title={t('settings.server.email.setting')}
              onClose={() => setOpenDialog(null)}
              maxWidthClassName="w-[min(92vw,520px)] md:w-[40vw] md:max-w-[40vw]"
              overlayProps={{
                'data-settings-server-email-dialog-width': 'angular-width-40-percent',
                'data-settings-server-email-dialog-mask': 'angular-mask-closable-false'
              }}
              footer={
                <SettingsDialogFooter>
                  <Button type="button" variant="default" className={coldSecondaryButtonClassName} onClick={() => setOpenDialog(null)}>
                    {t('common.button.cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className={coldPrimaryButtonClassName}
                    disabled={!canSaveEmail || savingDialog === 'email'}
                    onClick={() => void saveEmail()}
                  >
                    {savingDialog === 'email' ? t('common.saving') : t('common.button.save')}
                  </Button>
                </SettingsDialogFooter>
              }
            >
              <SettingsDialogForm data-settings-server-email-apply-contract="angular-apply-notify">
                <SettingsDialogField label={t('alert.notice.sender.mail.host')} required>
                  <SettingsDialogInput
                    value={email.emailHost || ''}
                    onChange={event => setEmailDraft(prev => ({ ...(prev || email), emailHost: event.target.value }))}
                  />
                </SettingsDialogField>
                <SettingsDialogField label={t('alert.notice.sender.mail.port')} required>
                  <NumberStepper
                    data-settings-server-email-port-stepper="hertzbeat-ui-number-stepper"
                    min="1"
                    max="65535"
                    value={email.emailPort?.toString() || ''}
                    onValueChange={value =>
                      setEmailDraft(prev => ({ ...(prev || email), emailPort: Number(value) || undefined }))
                    }
                  />
                </SettingsDialogField>
                <SettingsDialogField label={t('alert.notice.sender.mail.username')} required>
                  <SettingsDialogInput
                    value={email.emailUsername || ''}
                    onChange={event => setEmailDraft(prev => ({ ...(prev || email), emailUsername: event.target.value }))}
                  />
                </SettingsDialogField>
                <SettingsDialogField label={t('alert.notice.sender.mail.password')} required>
                  <SettingsDialogInput
                    type="password"
                    value={email.emailPassword || ''}
                    onChange={event => setEmailDraft(prev => ({ ...(prev || email), emailPassword: event.target.value }))}
                  />
                </SettingsDialogField>
                <SettingsDialogField label={t('alert.notice.sender.mail.ssl')} required>
                  <SettingsDialogToggle
                    checked={Boolean(email.emailSsl)}
                    onCheckedChange={checked => setEmailDraft(prev => ({ ...(prev || email), emailSsl: checked }))}
                  />
                </SettingsDialogField>
                <SettingsDialogField label={t('alert.notice.sender.mail.starttls')} required>
                  <SettingsDialogToggle
                    checked={Boolean(email.emailStarttls)}
                    onCheckedChange={checked => setEmailDraft(prev => ({ ...(prev || email), emailStarttls: checked }))}
                  />
                </SettingsDialogField>
                <SettingsDialogField label={t('common.enable')} required>
                  <SettingsDialogToggle
                    checked={Boolean(email.enable)}
                    onCheckedChange={checked => setEmailDraft(prev => ({ ...(prev || email), enable: checked }))}
                  />
                </SettingsDialogField>
              </SettingsDialogForm>
            </OverlayDialog>

            <OverlayDialog
              open={openDialog === 'sms'}
              title={t('settings.server.sms.setting')}
              onClose={() => {
                setSmsDraft(cloneSmsSender(smsSnapshot || data.sms || {}));
                setOpenDialog(null);
              }}
              maxWidthClassName="w-[min(92vw,520px)] md:w-[40vw] md:max-w-[40vw]"
              overlayProps={{
                'data-settings-server-sms-dialog-width': 'angular-width-40-percent',
                'data-settings-server-sms-dialog-mask': 'angular-mask-closable-false'
              }}
              footer={
                <SettingsDialogFooter>
                  <Button
                    type="button"
                    variant="default"
                    className={coldSecondaryButtonClassName}
                    onClick={() => {
                      setSmsDraft(cloneSmsSender(smsSnapshot || data.sms || {}));
                      setOpenDialog(null);
                    }}
                  >
                    {t('common.button.cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className={coldPrimaryButtonClassName}
                    disabled={!canSaveSms || savingDialog === 'sms'}
                    onClick={() => void saveSms()}
                  >
                    {savingDialog === 'sms' ? t('common.saving') : t('common.button.save')}
                  </Button>
                </SettingsDialogFooter>
              }
            >
              <SettingsDialogForm data-settings-server-sms-apply-contract="angular-apply-notify">
                <SettingsDialogField label={t('alert.notice.sender.sms.type')} required>
                  <SettingsDialogSelect
                    value={smsType}
                    onChange={event => setSmsDraft(prev => updateSmsType(prev || sms, normalizeSmsProviderType(event.target.value)))}
                  >
                    {SMS_PROVIDER_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </SettingsDialogSelect>
                </SettingsDialogField>

                {smsType === 'tencent' ? (
                  <>
                    <SettingsDialogField label={t('alert.notice.sender.sms.tencent.secretId')} required>
                      <SettingsDialogInput
                        type="password"
                        value={String((sms.tencent as Record<string, unknown>)?.secretId || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'tencent', 'secretId', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField label={t('alert.notice.sender.sms.tencent.secretKey')} required>
                      <SettingsDialogInput
                        type="password"
                        value={String((sms.tencent as Record<string, unknown>)?.secretKey || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'tencent', 'secretKey', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField label={t('alert.notice.sender.sms.tencent.signName')} required>
                      <SettingsDialogInput
                        value={String((sms.tencent as Record<string, unknown>)?.signName || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'tencent', 'signName', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField label={t('alert.notice.sender.sms.tencent.appId')} required>
                      <SettingsDialogInput
                        value={String((sms.tencent as Record<string, unknown>)?.appId || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'tencent', 'appId', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField label={t('alert.notice.sender.sms.tencent.templateId')} required>
                      <SettingsDialogInput
                        value={String((sms.tencent as Record<string, unknown>)?.templateId || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'tencent', 'templateId', event.target.value))}
                      />
                    </SettingsDialogField>
                  </>
                ) : null}

                {smsType === 'alibaba' ? (
                  <>
                    <SettingsDialogField label={t('alert.notice.sender.sms.alibaba.accessKeyId')} required>
                      <SettingsDialogInput
                        type="password"
                        value={String((sms.alibaba as Record<string, unknown>)?.accessKeyId || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'alibaba', 'accessKeyId', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField label={t('alert.notice.sender.sms.alibaba.accessKeySecret')} required>
                      <SettingsDialogInput
                        type="password"
                        value={String((sms.alibaba as Record<string, unknown>)?.accessKeySecret || '')}
                        onChange={event =>
                          setSmsDraft(prev => updateSmsProviderField(prev || sms, 'alibaba', 'accessKeySecret', event.target.value))
                        }
                      />
                    </SettingsDialogField>
                    <SettingsDialogField label={t('alert.notice.sender.sms.alibaba.signName')} required>
                      <SettingsDialogInput
                        value={String((sms.alibaba as Record<string, unknown>)?.signName || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'alibaba', 'signName', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField label={t('alert.notice.sender.sms.alibaba.templateCode')} required>
                      <SettingsDialogInput
                        value={String((sms.alibaba as Record<string, unknown>)?.templateCode || '')}
                        onChange={event =>
                          setSmsDraft(prev => updateSmsProviderField(prev || sms, 'alibaba', 'templateCode', event.target.value))
                        }
                      />
                    </SettingsDialogField>
                  </>
                ) : null}

                {smsType === 'unisms' ? (
                  <>
                    <SettingsDialogField label={t('alert.notice.sender.sms.unisms.accessKeyId')} required>
                      <SettingsDialogInput
                        type="password"
                        value={String((sms.unisms as Record<string, unknown>)?.accessKeyId || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'unisms', 'accessKeyId', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField label={t('alert.notice.sender.sms.unisms.authMode')} required>
                      <SettingsDialogSelect
                        value={String((sms.unisms as Record<string, unknown>)?.authMode || 'hmac')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'unisms', 'authMode', event.target.value))}
                      >
                        {UNISMS_AUTH_MODE_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {t(option.labelKey)}
                          </option>
                        ))}
                      </SettingsDialogSelect>
                    </SettingsDialogField>
                    {unismsNeedsSecret ? (
                      <SettingsDialogField label={t('alert.notice.sender.sms.unisms.accessKeySecret')} required>
                        <SettingsDialogInput
                          type="password"
                          value={String((sms.unisms as Record<string, unknown>)?.accessKeySecret || '')}
                          onChange={event =>
                            setSmsDraft(prev => updateSmsProviderField(prev || sms, 'unisms', 'accessKeySecret', event.target.value))
                          }
                        />
                      </SettingsDialogField>
                    ) : null}
                    <SettingsDialogField label={t('alert.notice.sender.sms.unisms.signature')} required>
                      <SettingsDialogInput
                        value={String((sms.unisms as Record<string, unknown>)?.signature || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'unisms', 'signature', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField label={t('alert.notice.sender.sms.unisms.templateId')} required>
                      <SettingsDialogInput
                        value={String((sms.unisms as Record<string, unknown>)?.templateId || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'unisms', 'templateId', event.target.value))}
                      />
                    </SettingsDialogField>
                  </>
                ) : null}

                {smsType === 'smslocal' ? (
                  <SettingsDialogField label={t('alert.notice.sender.sms.smslocal.apiKey')} required>
                    <SettingsDialogInput
                      type="password"
                      value={String((sms.smslocal as Record<string, unknown>)?.apiKey || '')}
                      onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'smslocal', 'apiKey', event.target.value))}
                    />
                  </SettingsDialogField>
                ) : null}

                {smsType === 'aws' ? (
                  <>
                    <SettingsDialogField label={t('alert.notice.sender.sms.aws.accessKeyId')} required>
                      <SettingsDialogInput
                        type="password"
                        value={String((sms.aws as Record<string, unknown>)?.accessKeyId || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'aws', 'accessKeyId', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField label={t('alert.notice.sender.sms.aws.accessKeySecret')} required>
                      <SettingsDialogInput
                        type="password"
                        value={String((sms.aws as Record<string, unknown>)?.accessKeySecret || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'aws', 'accessKeySecret', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField label={t('alert.notice.sender.sms.aws.region')} required>
                      <SettingsDialogInput
                        value={String((sms.aws as Record<string, unknown>)?.region || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'aws', 'region', event.target.value))}
                      />
                    </SettingsDialogField>
                  </>
                ) : null}

                {smsType === 'twilio' ? (
                  <>
                    <SettingsDialogField label={t('alert.notice.sender.sms.twilio.accountSid')} required>
                      <SettingsDialogInput
                        type="password"
                        value={String((sms.twilio as Record<string, unknown>)?.accountSid || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'twilio', 'accountSid', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField label={t('alert.notice.sender.sms.twilio.authToken')} required>
                      <SettingsDialogInput
                        type="password"
                        value={String((sms.twilio as Record<string, unknown>)?.authToken || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'twilio', 'authToken', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField label={t('alert.notice.sender.sms.twilio.twilioPhoneNumber')} required>
                      <SettingsDialogInput
                        value={String((sms.twilio as Record<string, unknown>)?.twilioPhoneNumber || '')}
                        onChange={event =>
                          setSmsDraft(prev => updateSmsProviderField(prev || sms, 'twilio', 'twilioPhoneNumber', event.target.value))
                        }
                      />
                    </SettingsDialogField>
                  </>
                ) : null}

                <SettingsDialogField label={t('common.enable')} required>
                  <SettingsDialogToggle
                    checked={Boolean(sms.enable)}
                    onCheckedChange={checked => setSmsDraft(prev => ({ ...(prev || sms), enable: checked }))}
                  />
                </SettingsDialogField>
              </SettingsDialogForm>
            </OverlayDialog>
          </div>
        );
      }}
    </ClientWorkbench>
  );
}
