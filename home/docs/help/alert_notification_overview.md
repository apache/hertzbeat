---
id: alert_notification_overview
title: Alert Notification Overview
sidebar_label: Alert Notification Overview
keywords: [open source monitoring tool, open source alerter, alert notification, notification channel, notification policy]
---

> After the threshold is triggered, in addition to being displayed in the alarm center, HertzBeat can notify the designated recipients through various channels such as Email, DingTalk, WeChat Work, FeiShu, Telegram, Slack, Discord, SMS, WebHook, and more.

## How it works

Alert notification requires two steps to take effect:

1. **Add a recipient** — configure a recipient and select a notification channel (Email, DingTalk robot, Telegram bot, etc.).
2. **Configure a notification strategy** — associate the recipient with a strategy that defines which alerts are routed to which recipients.

> **Note⚠️ Adding a new recipient does not mean that it is effective to receive alarm information. It is also necessary to configure the associated alarm notification strategy, that is, to specify which messages are sent to which recipients.**

## Supported notification channels

| Channel | Doc |
|---|---|
| Email | [Configure Email Notification](alert_email) |
| SMS | [Configure SMS Notification](alert_sms) |
| WebHook | [Configure WebHook Notification](alert_webhook) |
| Discord Bot | [Configure Discord Notification](alert_discord) |
| Slack Webhook | [Configure Slack Notification](alert_slack) |
| Telegram Bot | [Configure Telegram Notification](alert_telegram) |
| WeChat Work Robot | [Configure WeChat Work Robot Notification](alert_wework) |
| Enterprise WeChat App | [Configure Enterprise WeChat App Notification](alert_enterprise_wechat_app) |
| DingTalk Robot | [Configure DingDing Robot Notification](alert_dingtalk) |
| FeiShu Robot | [Configure FeiShu Robot Notification](alert_feishu) |
| FeiShu App | [Configure FeiShu App Notification](alert_feishu_app) |
| Huawei Cloud SMN | [Configure Huawei Cloud SMN Notification](alert_smn) |

For customizing the content and format of notification messages, see [Notification Template](alert_notification_template).

## Operation steps

1. **【Alarm Notification】->【Add Recipient】->【Select notification method】->【Fill in channel configuration】->【Confirm】**

    ![email](/img/docs/help/alert-notice-1.png)

2. **Configure the associated alarm notification strategy⚠️ 【Add new notification strategy】->【Associate the recipient just set】->【Confirm】**

    > **Note⚠️ Adding a new recipient does not mean that it is effective to receive alarm information. It is also necessary to configure the associated alarm notification strategy, that is, to specify which messages are sent to which recipients.**

    ![email](/img/docs/help/alert-notice-policy.png)

### Alert notification common issues

1. Added a recipient but not receiving any alarm notifications.

    > Please check whether there is any triggered alarm information in the alarm center.
    > Please confirm that an alarm notification policy has been configured and is associated with the recipient.

2. Self-hosted HertzBeat cannot send email notifications.

    > HertzBeat needs to configure its own mail server. Please confirm whether the mail server settings are configured in `application.yml`.

Other issues can be fed back through the communication group ISSUE!
