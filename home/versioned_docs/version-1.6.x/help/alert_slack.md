---
id: alert_slack
title: Alert Slack Webhook Notifications
sidebar_label: Alert Slack Webhook Notification
keywords: [open source monitoring tool, open source alerter, open source slack webhook notification]
---

> Send an alarm message after the threshold is triggered, and notify the recipient through the Slack Webhook.

## Steps

### Open Webhook in Slack, get Webhook URL

Refer to the official website document [Sending messages using Incoming Webhooks](https://api.slack.com/messaging/webhooks)

### Add an alarm notifier to HertzBeat, and the notification method is Slack Webhook

1. **【Alarm Notification】->【Add Recipient】->【Select Slack Webhook Notification Method】->【Set Webhook URL】-> 【OK】**

    ![email](/img/docs/help/slack-bot-1.png)

2. **Configure the associated alarm notification strategy⚠️ [Add notification strategy] -> [Associate the recipient just set] -> [OK]**

    > **Note ⚠️ Adding a new recipient does not mean that it has taken effect and can receive alarm information. It is also necessary to configure the associated alarm notification strategy, that is, specify which messages are sent to which recipients**.

    ![email](/img/docs/help/alert-notice-policy.png)

### Slack Notification FAQ

1. Slack did not receive the robot warning notification

   > Please check whether the alarm information has been triggered in the alarm center  
   > Please check whether the slack webhook url are configured correctly, and whether the alarm policy association has been configured

Other questions can be fed back through the communication group ISSUE!
