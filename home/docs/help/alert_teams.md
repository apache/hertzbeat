---
id: alert_teams
title: Alert Microsoft Teams Workflows Notifications
sidebar_label: Alert Microsoft Teams Notification
keywords: [open source monitoring tool, open source alerter, microsoft teams workflows notification]
---

> Send an alarm message after the threshold is triggered, and notify a Microsoft Teams channel through a Workflows webhook as an Adaptive Card.

## Steps

### Create a Teams Workflows webhook

Microsoft has retired Office 365 connectors. Create an HTTPS webhook with Teams Workflows (Power Automate):

1. In the target Teams channel, select **Workflows**.
2. Create a flow from the template **Post to a channel when a webhook request is received**, or build one with the **When a Teams webhook request is received** trigger.
3. Copy the generated HTTPS URL. It looks like `https://<region>.logic.azure.com/workflows/.../triggers/manual/paths/invoke?...&sig=...`.

### Add a HertzBeat receiver

1. **Alarm notification -> Add receiver -> Microsoft Teams -> paste the Workflows webhook URL -> OK**.
2. **Add a notification policy and associate the receiver**. A receiver does not receive alerts until a policy selects it.

> The webhook URL contains a signature and is stored as a secret. HertzBeat sends the Adaptive Card to the URL as given, without re-encoding the signature query.

### FAQ

The channel did not receive the card:

- Confirm the alert was triggered in the alert center.
- Confirm the URL is HTTPS and its host is `logic.azure.com` or a subdomain of it.
- Confirm the notification policy is associated with this receiver.
