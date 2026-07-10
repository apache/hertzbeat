'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { HzInlineFeedback } from '@hertzbeat/ui';
import { ClientWorkbench } from '../../../../components/workbench/client-workbench';
import { useI18n } from '../../../../components/providers/i18n-provider';
import { OverlayDialog } from '../../../../components/workbench/overlay-dialog';
import { HzConfirmDialog } from '../../../../components/ui/hz-confirm-dialog';
import { SettingsConsoleTitle } from '../../../../components/settings/settings-console-shell';
import {
  SettingsDialogActionHelp,
  SettingsDialogField,
  SettingsDialogFooter,
  SettingsDialogForm,
  SettingsDialogInput,
  SettingsDialogSelect,
  SettingsDialogToggle
} from '../../../../components/settings/settings-dialog-form';
import { SettingsSummaryList } from '../../../../components/settings/settings-summary-list';
import { SettingsFormFeedback } from '../../../../components/settings/settings-form';
import { Button } from '../../../../components/ui/button';
import { NumberStepper } from '../../../../components/ui/number-stepper';
import { hzOpsCatalogVisual } from '../../../../lib/hz-ops-visual';
import { apiMessageGet, apiMessagePost } from '../../../../lib/api-client';
import { loadMessageServerData, saveEmailConfig, saveSmsConfig } from '../../../../lib/setting-server/controller';
import {
  SMS_PROVIDER_OPTIONS,
  UNISMS_AUTH_MODE_OPTIONS,
  buildMessageServerSummaryItems,
  buildEmailSenderMissingFields,
  buildSmsSenderMissingFields,
  canSaveEmailSender,
  canSaveSmsSender,
  cloneSmsSender,
  isEmailSenderDirty,
  isSmsSenderDirty,
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

type SettingsServerTranslator = (key: string, vars?: Record<string, string>) => string;

function serverDialogFieldHelp(t: SettingsServerTranslator, fieldKey: string, label: string) {
  return {
    label: t('settings.server.field.help-aria', { field: label }),
    body: t(`settings.server.field.${fieldKey}.help`),
    impact: t(`settings.server.field.${fieldKey}.impact`)
  };
}

function serverSummaryActionHelp(t: SettingsServerTranslator, target: 'email' | 'sms', label: string) {
  return {
    label: t('settings.server.action.help-aria', { action: label }),
    body: t(`settings.server.action.${target}.configure.help`),
    impact: t(`settings.server.action.${target}.configure.impact`)
  };
}

function serverSaveActionHelp(t: SettingsServerTranslator, target: 'email' | 'sms') {
  const actionLabel = t('common.button.save');
  return {
    label: t('settings.server.action.help-aria', { action: actionLabel }),
    body: t(`settings.server.action.${target}.save.help`),
    impact: t(`settings.server.action.${target}.save.impact`)
  };
}

function serverRequiredDialogMeta() {
  return {
    required: true
  };
}

export default function SettingServerPage() {
  const { t } = useI18n();
  const [emailDraft, setEmailDraft] = useState<EmailNoticeSender | null>(null);
  const [smsDraft, setSmsDraft] = useState<SmsNoticeSender | null>(null);
  const [smsSnapshot, setSmsSnapshot] = useState<SmsNoticeSender | null>(null);
  const [openDialog, setOpenDialog] = useState<'email' | 'sms' | null>(null);
  const [discardDialog, setDiscardDialog] = useState<'email' | 'sms' | null>(null);
  const [savingDialog, setSavingDialog] = useState<'email' | 'sms' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'error' | 'info' | null>(null);
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
        const emailBaseline = normalizeEmailSender(data.email || {});
        const smsBaseline = normalizeSmsSender(smsSnapshot || data.sms || {});
        const emailDirty = isEmailSenderDirty(email, emailBaseline);
        const smsDirty = isSmsSenderDirty(sms, smsBaseline);
        const canSaveEmail = canSaveEmailSender(email);
        const canSaveSms = canSaveSmsSender(sms);
        const emailHasTlsModeConflict = Boolean(email.emailSsl && email.emailStarttls);
        const emailMissingFields = buildEmailSenderMissingFields(email, t);
        const smsMissingFields = buildSmsSenderMissingFields(sms, t);
        const emailSaveDisabledReason = !canSaveEmail ? 'invalid' : !emailDirty ? 'unchanged' : undefined;
        const smsSaveDisabledReason = !canSaveSms ? 'invalid' : !smsDirty ? 'unchanged' : undefined;
        const canSubmitEmail = canSaveEmail && emailDirty;
        const canSubmitSms = canSaveSms && smsDirty;
        const smsType = normalizeSmsProviderType(sms.type);
        const unismsNeedsSecret = isUniSmsAccessKeySecretRequired(sms);

        function discardEmailDialog() {
          setEmailDraft(null);
          setDiscardDialog(null);
          setOpenDialog(null);
        }

        function requestCloseEmailDialog() {
          if (emailDirty && savingDialog !== 'email') {
            setDiscardDialog('email');
            return;
          }

          discardEmailDialog();
        }

        function discardSmsDialog() {
          setSmsDraft(cloneSmsSender(smsSnapshot || data.sms || {}));
          setDiscardDialog(null);
          setOpenDialog(null);
        }

        function requestCloseSmsDialog() {
          if (smsDirty && savingDialog !== 'sms') {
            setDiscardDialog('sms');
            return;
          }

          discardSmsDialog();
        }

        async function saveEmail() {
          if (!canSubmitEmail) {
            if (canSaveEmail && !emailDirty) {
              setMessage(t('settings.server.no-changes'));
              setMessageTone('info');
            }
            return;
          }

          setSavingDialog('email');
          setMessage(null);
          setMessageTone(null);
          try {
            await saveEmailConfig(apiMessagePost, email);
            setOpenDialog(null);
            setDiscardDialog(null);
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
          if (!canSubmitSms) {
            if (canSaveSms && !smsDirty) {
              setMessage(t('settings.server.no-changes'));
              setMessageTone('info');
            }
            return;
          }

          setSavingDialog('sms');
          setMessage(null);
          setMessageTone(null);
          try {
            await saveSmsConfig(apiMessagePost, sms);
            setOpenDialog(null);
            setDiscardDialog(null);
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

            <div
              data-settings-server-summary="hertzbeat-ui-summary-list"
              data-settings-server-summary-nesting-contract="flat-inside-settings-console-content"
            >
              <SettingsSummaryList
                className="border-0 bg-transparent shadow-none"
                items={buildMessageServerSummaryItems(email, sms, t).map(item => {
                  const title = String(item.title);
                  const target = item.key === 'sms' ? 'sms' : 'email';
                  const actionLabel = t('common.button.setting');

                  return {
                    ...item,
                    actionLabel,
                    actionAriaLabel: t('settings.server.summary.configure-action', { title }),
                    actionHelp: serverSummaryActionHelp(t, target, actionLabel),
                    actionButtonProps: {
                      'data-settings-server-command-action': `open-${target}`
                    } as React.ButtonHTMLAttributes<HTMLButtonElement>,
                    onAction: () => {
                      setMessage(null);
                      setMessageTone(null);
                      if (item.key === 'email') {
                        setDiscardDialog(null);
                        setOpenDialog('email');
                        return;
                      }

                      setSmsSnapshot(cloneSmsSender(sms));
                      setDiscardDialog(null);
                      setOpenDialog('sms');
                    }
                  };
                })}
              />
            </div>

            {message ? (
              <SettingsFormFeedback
                tone={messageTone === 'success' ? 'success' : messageTone === 'info' ? 'info' : 'error'}
                data-settings-server-apply-feedback="angular-apply-notify"
                data-settings-server-apply-feedback-owner="hertzbeat-ui-settings-feedback"
              >
                {message}
              </SettingsFormFeedback>
            ) : null}

            <OverlayDialog
              open={openDialog === 'email'}
              title={t('settings.server.email.setting')}
              onClose={requestCloseEmailDialog}
              maxWidthClassName="w-[min(92vw,520px)] md:w-[40vw] md:max-w-[40vw]"
              overlayProps={{
                'data-settings-server-email-dialog-width': 'angular-width-40-percent',
                'data-settings-server-email-dialog-mask': 'angular-mask-closable-false'
              }}
              footer={
                <SettingsDialogFooter>
                  <Button
                    type="button"
                    variant="default"
                    className={coldSecondaryButtonClassName}
                    data-settings-server-command-action="email-cancel"
                    onClick={requestCloseEmailDialog}
                  >
                    {t('common.button.cancel')}
                  </Button>
                  {canSaveEmail && !emailDirty ? (
                    <span
                      className="text-[11px] font-medium text-[#9fb0cc]"
                      data-settings-server-email-unchanged-feedback="true"
                    >
                      {t('settings.server.no-changes')}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <Button
                      type="button"
                      variant="default"
                      className={coldPrimaryButtonClassName}
                      disabled={!canSubmitEmail || savingDialog === 'email'}
                      data-settings-server-command-action="email-save"
                      data-settings-server-email-save-dirty={emailDirty ? 'changed' : 'unchanged'}
                      data-settings-server-email-save-disabled-reason={emailSaveDisabledReason}
                      onClick={() => void saveEmail()}
                    >
                      {savingDialog === 'email' ? t('common.saving') : t('common.button.save')}
                    </Button>
                    <SettingsDialogActionHelp id="email-save" {...serverSaveActionHelp(t, 'email')} />
                  </span>
                </SettingsDialogFooter>
              }
            >
              <SettingsDialogForm data-settings-server-email-apply-contract="angular-apply-notify">
                {!canSaveEmail && emailMissingFields.length ? (
                  <HzInlineFeedback
                    tone="warning"
                    title={t('settings.server.validation.required-fields-title', { count: emailMissingFields.length })}
                    description={
                      <span
                        className="block whitespace-normal break-words"
                        data-settings-server-email-validation-fields="wrapped-field-list"
                      >
                        {emailMissingFields.join(', ')}
                      </span>
                    }
                    variant="embedded"
                    data-settings-server-email-validation-summary="missing-required-fields"
                    data-settings-server-validation-summary-layout="wrapped-description"
                    data-settings-server-validation-summary-owner="hertzbeat-ui-inline-feedback"
                  />
                ) : null}
                {emailHasTlsModeConflict ? (
                  <HzInlineFeedback
                    tone="warning"
                    title={t('settings.server.email.tls-conflict.title')}
                    description={t('settings.server.email.tls-conflict.description')}
                    variant="embedded"
                    data-settings-server-email-tls-conflict="ssl-and-starttls-enabled"
                    data-settings-server-email-tls-conflict-owner="hertzbeat-ui-inline-feedback"
                  />
                ) : null}
                <SettingsDialogField
                  label={t('alert.notice.sender.mail.host')}
                  help={serverDialogFieldHelp(t, 'email.host', t('alert.notice.sender.mail.host'))}
                  {...serverRequiredDialogMeta()}
                >
                  <SettingsDialogInput
                    value={email.emailHost || ''}
                    onChange={event => setEmailDraft(prev => ({ ...(prev || email), emailHost: event.target.value }))}
                  />
                </SettingsDialogField>
                <SettingsDialogField
                  label={t('alert.notice.sender.mail.port')}
                  help={serverDialogFieldHelp(t, 'email.port', t('alert.notice.sender.mail.port'))}
                  {...serverRequiredDialogMeta()}
                >
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
                <SettingsDialogField
                  label={t('alert.notice.sender.mail.username')}
                  help={serverDialogFieldHelp(t, 'email.username', t('alert.notice.sender.mail.username'))}
                  {...serverRequiredDialogMeta()}
                >
                  <SettingsDialogInput
                    value={email.emailUsername || ''}
                    onChange={event => setEmailDraft(prev => ({ ...(prev || email), emailUsername: event.target.value }))}
                  />
                </SettingsDialogField>
                <SettingsDialogField
                  label={t('alert.notice.sender.mail.password')}
                  help={serverDialogFieldHelp(t, 'email.password', t('alert.notice.sender.mail.password'))}
                  {...serverRequiredDialogMeta()}
                >
                  <SettingsDialogInput
                    type="password"
                    value={email.emailPassword || ''}
                    onChange={event => setEmailDraft(prev => ({ ...(prev || email), emailPassword: event.target.value }))}
                  />
                </SettingsDialogField>
                <SettingsDialogField
                  label={t('alert.notice.sender.mail.ssl')}
                >
                  <SettingsDialogToggle
                    checked={Boolean(email.emailSsl)}
                    onCheckedChange={checked => setEmailDraft(prev => ({ ...(prev || email), emailSsl: checked }))}
                  />
                </SettingsDialogField>
                <SettingsDialogField
                  label={t('alert.notice.sender.mail.starttls')}
                >
                  <SettingsDialogToggle
                    checked={Boolean(email.emailStarttls)}
                    onCheckedChange={checked => setEmailDraft(prev => ({ ...(prev || email), emailStarttls: checked }))}
                  />
                </SettingsDialogField>
                <SettingsDialogField
                  label={t('common.enable')}
                >
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
              onClose={requestCloseSmsDialog}
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
                    data-settings-server-command-action="sms-cancel"
                    onClick={requestCloseSmsDialog}
                  >
                    {t('common.button.cancel')}
                  </Button>
                  {canSaveSms && !smsDirty ? (
                    <span
                      className="text-[11px] font-medium text-[#9fb0cc]"
                      data-settings-server-sms-unchanged-feedback="true"
                    >
                      {t('settings.server.no-changes')}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <Button
                      type="button"
                      variant="default"
                      className={coldPrimaryButtonClassName}
                      disabled={!canSubmitSms || savingDialog === 'sms'}
                      data-settings-server-command-action="sms-save"
                      data-settings-server-sms-save-dirty={smsDirty ? 'changed' : 'unchanged'}
                      data-settings-server-sms-save-disabled-reason={smsSaveDisabledReason}
                      onClick={() => void saveSms()}
                    >
                      {savingDialog === 'sms' ? t('common.saving') : t('common.button.save')}
                    </Button>
                    <SettingsDialogActionHelp id="sms-save" {...serverSaveActionHelp(t, 'sms')} />
                  </span>
                </SettingsDialogFooter>
              }
            >
              <SettingsDialogForm data-settings-server-sms-apply-contract="angular-apply-notify">
                {!canSaveSms && smsMissingFields.length ? (
                  <HzInlineFeedback
                    tone="warning"
                    title={t('settings.server.validation.required-fields-title', { count: smsMissingFields.length })}
                    description={
                      <span
                        className="block whitespace-normal break-words"
                        data-settings-server-sms-validation-fields="wrapped-field-list"
                      >
                        {smsMissingFields.join(', ')}
                      </span>
                    }
                    variant="embedded"
                    data-settings-server-sms-validation-summary="missing-required-fields"
                    data-settings-server-validation-summary-layout="wrapped-description"
                    data-settings-server-validation-summary-owner="hertzbeat-ui-inline-feedback"
                  />
                ) : null}
                <SettingsDialogField
                  label={t('alert.notice.sender.sms.type')}
                  help={serverDialogFieldHelp(t, 'sms.type', t('alert.notice.sender.sms.type'))}
                >
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
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.tencent.secretId')}
                      help={serverDialogFieldHelp(t, 'sms.tencent.secretId', t('alert.notice.sender.sms.tencent.secretId'))}
                      {...serverRequiredDialogMeta()}
                    >
                      <SettingsDialogInput
                        type="password"
                        value={String((sms.tencent as Record<string, unknown>)?.secretId || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'tencent', 'secretId', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.tencent.secretKey')}
                      help={serverDialogFieldHelp(t, 'sms.tencent.secretKey', t('alert.notice.sender.sms.tencent.secretKey'))}
                      {...serverRequiredDialogMeta()}
                    >
                      <SettingsDialogInput
                        type="password"
                        value={String((sms.tencent as Record<string, unknown>)?.secretKey || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'tencent', 'secretKey', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.tencent.signName')}
                      help={serverDialogFieldHelp(t, 'sms.tencent.signName', t('alert.notice.sender.sms.tencent.signName'))}
                      {...serverRequiredDialogMeta()}
                    >
                      <SettingsDialogInput
                        value={String((sms.tencent as Record<string, unknown>)?.signName || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'tencent', 'signName', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.tencent.appId')}
                      help={serverDialogFieldHelp(t, 'sms.tencent.appId', t('alert.notice.sender.sms.tencent.appId'))}
                      {...serverRequiredDialogMeta()}
                    >
                      <SettingsDialogInput
                        value={String((sms.tencent as Record<string, unknown>)?.appId || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'tencent', 'appId', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.tencent.templateId')}
                      help={serverDialogFieldHelp(t, 'sms.tencent.templateId', t('alert.notice.sender.sms.tencent.templateId'))}
                      {...serverRequiredDialogMeta()}
                    >
                      <SettingsDialogInput
                        value={String((sms.tencent as Record<string, unknown>)?.templateId || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'tencent', 'templateId', event.target.value))}
                      />
                    </SettingsDialogField>
                  </>
                ) : null}

                {smsType === 'alibaba' ? (
                  <>
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.alibaba.accessKeyId')}
                      help={serverDialogFieldHelp(t, 'sms.alibaba.accessKeyId', t('alert.notice.sender.sms.alibaba.accessKeyId'))}
                      {...serverRequiredDialogMeta()}
                    >
                      <SettingsDialogInput
                        type="password"
                        value={String((sms.alibaba as Record<string, unknown>)?.accessKeyId || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'alibaba', 'accessKeyId', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.alibaba.accessKeySecret')}
                      help={serverDialogFieldHelp(t, 'sms.alibaba.accessKeySecret', t('alert.notice.sender.sms.alibaba.accessKeySecret'))}
                      {...serverRequiredDialogMeta()}
                    >
                      <SettingsDialogInput
                        type="password"
                        value={String((sms.alibaba as Record<string, unknown>)?.accessKeySecret || '')}
                        onChange={event =>
                          setSmsDraft(prev => updateSmsProviderField(prev || sms, 'alibaba', 'accessKeySecret', event.target.value))
                        }
                      />
                    </SettingsDialogField>
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.alibaba.signName')}
                      help={serverDialogFieldHelp(t, 'sms.alibaba.signName', t('alert.notice.sender.sms.alibaba.signName'))}
                      {...serverRequiredDialogMeta()}
                    >
                      <SettingsDialogInput
                        value={String((sms.alibaba as Record<string, unknown>)?.signName || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'alibaba', 'signName', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.alibaba.templateCode')}
                      help={serverDialogFieldHelp(t, 'sms.alibaba.templateCode', t('alert.notice.sender.sms.alibaba.templateCode'))}
                      {...serverRequiredDialogMeta()}
                    >
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
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.unisms.accessKeyId')}
                      help={serverDialogFieldHelp(t, 'sms.unisms.accessKeyId', t('alert.notice.sender.sms.unisms.accessKeyId'))}
                      {...serverRequiredDialogMeta()}
                    >
                      <SettingsDialogInput
                        type="password"
                        value={String((sms.unisms as Record<string, unknown>)?.accessKeyId || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'unisms', 'accessKeyId', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.unisms.authMode')}
                      help={serverDialogFieldHelp(t, 'sms.unisms.authMode', t('alert.notice.sender.sms.unisms.authMode'))}
                    >
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
                      <SettingsDialogField
                        label={t('alert.notice.sender.sms.unisms.accessKeySecret')}
                        help={serverDialogFieldHelp(t, 'sms.unisms.accessKeySecret', t('alert.notice.sender.sms.unisms.accessKeySecret'))}
                        {...serverRequiredDialogMeta()}
                      >
                        <SettingsDialogInput
                          type="password"
                          value={String((sms.unisms as Record<string, unknown>)?.accessKeySecret || '')}
                          onChange={event =>
                            setSmsDraft(prev => updateSmsProviderField(prev || sms, 'unisms', 'accessKeySecret', event.target.value))
                          }
                        />
                      </SettingsDialogField>
                    ) : null}
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.unisms.signature')}
                      help={serverDialogFieldHelp(t, 'sms.unisms.signature', t('alert.notice.sender.sms.unisms.signature'))}
                      {...serverRequiredDialogMeta()}
                    >
                      <SettingsDialogInput
                        value={String((sms.unisms as Record<string, unknown>)?.signature || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'unisms', 'signature', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.unisms.templateId')}
                      help={serverDialogFieldHelp(t, 'sms.unisms.templateId', t('alert.notice.sender.sms.unisms.templateId'))}
                      {...serverRequiredDialogMeta()}
                    >
                      <SettingsDialogInput
                        value={String((sms.unisms as Record<string, unknown>)?.templateId || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'unisms', 'templateId', event.target.value))}
                      />
                    </SettingsDialogField>
                  </>
                ) : null}

                {smsType === 'smslocal' ? (
                  <SettingsDialogField
                    label={t('alert.notice.sender.sms.smslocal.apiKey')}
                    help={serverDialogFieldHelp(t, 'sms.smslocal.apiKey', t('alert.notice.sender.sms.smslocal.apiKey'))}
                    {...serverRequiredDialogMeta()}
                  >
                    <SettingsDialogInput
                      type="password"
                      value={String((sms.smslocal as Record<string, unknown>)?.apiKey || '')}
                      onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'smslocal', 'apiKey', event.target.value))}
                    />
                  </SettingsDialogField>
                ) : null}

                {smsType === 'aws' ? (
                  <>
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.aws.accessKeyId')}
                      help={serverDialogFieldHelp(t, 'sms.aws.accessKeyId', t('alert.notice.sender.sms.aws.accessKeyId'))}
                      {...serverRequiredDialogMeta()}
                    >
                      <SettingsDialogInput
                        type="password"
                        value={String((sms.aws as Record<string, unknown>)?.accessKeyId || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'aws', 'accessKeyId', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.aws.accessKeySecret')}
                      help={serverDialogFieldHelp(t, 'sms.aws.accessKeySecret', t('alert.notice.sender.sms.aws.accessKeySecret'))}
                      {...serverRequiredDialogMeta()}
                    >
                      <SettingsDialogInput
                        type="password"
                        value={String((sms.aws as Record<string, unknown>)?.accessKeySecret || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'aws', 'accessKeySecret', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.aws.region')}
                      help={serverDialogFieldHelp(t, 'sms.aws.region', t('alert.notice.sender.sms.aws.region'))}
                      {...serverRequiredDialogMeta()}
                    >
                      <SettingsDialogInput
                        value={String((sms.aws as Record<string, unknown>)?.region || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'aws', 'region', event.target.value))}
                      />
                    </SettingsDialogField>
                  </>
                ) : null}

                {smsType === 'twilio' ? (
                  <>
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.twilio.accountSid')}
                      help={serverDialogFieldHelp(t, 'sms.twilio.accountSid', t('alert.notice.sender.sms.twilio.accountSid'))}
                      {...serverRequiredDialogMeta()}
                    >
                      <SettingsDialogInput
                        type="password"
                        value={String((sms.twilio as Record<string, unknown>)?.accountSid || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'twilio', 'accountSid', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.twilio.authToken')}
                      help={serverDialogFieldHelp(t, 'sms.twilio.authToken', t('alert.notice.sender.sms.twilio.authToken'))}
                      {...serverRequiredDialogMeta()}
                    >
                      <SettingsDialogInput
                        type="password"
                        value={String((sms.twilio as Record<string, unknown>)?.authToken || '')}
                        onChange={event => setSmsDraft(prev => updateSmsProviderField(prev || sms, 'twilio', 'authToken', event.target.value))}
                      />
                    </SettingsDialogField>
                    <SettingsDialogField
                      label={t('alert.notice.sender.sms.twilio.twilioPhoneNumber')}
                      help={serverDialogFieldHelp(t, 'sms.twilio.twilioPhoneNumber', t('alert.notice.sender.sms.twilio.twilioPhoneNumber'))}
                      {...serverRequiredDialogMeta()}
                    >
                      <SettingsDialogInput
                        value={String((sms.twilio as Record<string, unknown>)?.twilioPhoneNumber || '')}
                        onChange={event =>
                          setSmsDraft(prev => updateSmsProviderField(prev || sms, 'twilio', 'twilioPhoneNumber', event.target.value))
                        }
                      />
                    </SettingsDialogField>
                  </>
                ) : null}

                <SettingsDialogField
                  label={t('common.enable')}
                >
                  <SettingsDialogToggle
                    checked={Boolean(sms.enable)}
                    onCheckedChange={checked => setSmsDraft(prev => ({ ...(prev || sms), enable: checked }))}
                  />
                </SettingsDialogField>
              </SettingsDialogForm>
            </OverlayDialog>

            <div
              data-settings-server-unsaved-cancel="hertzbeat-ui-confirm-dialog"
              data-settings-server-unsaved-cancel-state={discardDialog || 'closed'}
            >
              <HzConfirmDialog
                open={discardDialog === 'email'}
                title={t('settings.server.email.unsaved-cancel.title')}
                kicker={t('settings.server.email.unsaved-cancel.kicker')}
                copy={t('settings.server.email.unsaved-cancel.copy')}
                confirmLabel={t('settings.server.email.unsaved-cancel.discard')}
                cancelLabel={t('settings.server.email.unsaved-cancel.keep-editing')}
                onCancel={() => setDiscardDialog(null)}
                onConfirm={discardEmailDialog}
              />
              <HzConfirmDialog
                open={discardDialog === 'sms'}
                title={t('settings.server.sms.unsaved-cancel.title')}
                kicker={t('settings.server.sms.unsaved-cancel.kicker')}
                copy={t('settings.server.sms.unsaved-cancel.copy')}
                confirmLabel={t('settings.server.sms.unsaved-cancel.discard')}
                cancelLabel={t('settings.server.sms.unsaved-cancel.keep-editing')}
                onCancel={() => setDiscardDialog(null)}
                onConfirm={discardSmsDialog}
              />
            </div>
          </div>
        );
      }}
    </ClientWorkbench>
  );
}
