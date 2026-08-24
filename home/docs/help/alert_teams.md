---
id: alert_teams
title: Alert Microsoft Teams Notifications
sidebar_label: Alert Microsoft Teams Notification
keywords: [open source monitoring tool, open source alerter, microsoft teams webhook notification]
---

> Send an alarm message after the threshold is triggered, and notify the recipient through Microsoft Teams Workflows webhook.

## Steps

### Create a Workflows webhook in Microsoft Teams

Office 365 Incoming Webhooks have been retired. Use Teams Workflows instead:

1. Open the target Teams channel
2. Choose **Workflows** → **Post to a channel when a webhook request is received**
3. Copy the generated HTTPS webhook URL

Refer to Microsoft documentation: [Retirement of Office 365 connectors within Microsoft Teams](https://devblogs.microsoft.com/microsoft365dev/retirement-of-office-365-connectors-within-microsoft-teams/)

### Add an alarm notifier to HertzBeat

1. **【Alarm Notification】->【Add Recipient】->【Select Microsoft Teams】->【Set Teams Workflows Webhook URL】-> 【OK】**

2. **Configure the associated alarm notification strategy⚠️ [Add notification strategy] -> [Associate the recipient just set] -> [OK]**

   > **Note ⚠️ Adding a new recipient does not mean that it has taken effect and can receive alarm information. It is also necessary to configure the associated alarm notification strategy, that is, specify which messages are sent to which recipients**.

### Microsoft Teams Notification FAQ

1. Teams did not receive the alert notification

   > Please check whether the alarm information has been triggered in the alarm center  
   > Please check whether the Teams Workflows webhook URL is configured correctly, and whether the alarm policy association has been configured  
   > Do not use the retired `webhook.office.com` Incoming Webhook URL

Other questions can be fed back through the communication group ISSUE!
