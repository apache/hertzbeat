---
id: alert_threshold
title: Threshold Alert Configuration
sidebar_label: Threshold Alert Configuration
---

> Configure alert thresholds for monitoring metrics (warning alert, critical alert, emergency alert). The system triggers alerts based on threshold configuration and collected metric data.

## Operational Steps

### 1. Setting Labels for Monitoring Services (Optional)

If you need to categorize alerts, you can set labels for the monitored targets. For example: If you have multiple Linux systems to monitor, and each system has different monitoring metrics, such as: Server A has available memory greater than 1G, Server B has available memory greater than 2G, then you can set labels for Server A and Server B respectively, and then configure alerts based on these labels.

#### Creating Labels

Navigate to **Label Management -> Add Label**

![threshold](/img/docs/help/alert-threshold-2-en.png)

As shown in the image above, add a new label. Here we set the label as: linux:dev (Linux used in development environment).

#### Configuring Labels

TODO Update image name
![threshold](/img/docs/help/alert-threshold-3-en.png)

As shown in the image above, click on `Add Label`.

![threshold](/img/docs/help/alert-threshold-4-en.png)

Select our label, here demonstrated as selecting the `linux:dev` label.

### Creating Threshold Rules

Navigate to **[Threshold Rules] -> [Add Threshold Rule] -> [Confirm Configuration]**

![threshold](/img/docs/help/alert-threshold-1-en.png)

The above image explains the configuration details:

- **Metric Object**: Select the monitoring metric object for which we need to configure the threshold. For example: Under website monitoring type -> under the summary metric set -> responseTime metric.
- **Threshold Rule**: Use this expression to calculate whether to trigger the threshold. Expression variables and operators are provided on the page for reference. For example: Set an alert to trigger if response time is greater than 50, the expression would be `responseTime > 50`. For detailed help on threshold expressions, see [Threshold Expression Help](alert_threshold_expr).
- **Alert Level**: The alert level triggered by the threshold, from low to high: warning, critical, emergency.
- **Trigger Count**: Set how many times the threshold must be triggered before the alert is actually triggered.
- **Notification Template**: The template for the notification message sent after the alert is triggered. Template variables are provided on the page. For example: `${app}.${metrics}.${metric} metric value is ${responseTime}, which is greater than 50 triggering the alert`.
- **Bind Label**: Select the label we need to apply. If no label is selected, it will apply to all services corresponding to the set metric object.
- **Apply Globally**: Set whether this threshold applies globally to all such metrics, default is no. After adding a threshold, it needs to be associated with the monitoring object for the threshold to take effect.
- **Recovery Notification**: Whether to send a recovery notification after the alert is triggered, default is not to send.
- **Enable Alert**: Enable or disable this alert threshold configuration.

**The threshold alert configuration is complete, and alerts that have been successfully triggered can be viewed in the [Alert Center].**
**If you need to send alert notifications via email, WeChat, DingTalk, or Feishu, you can configure it in [Alert Notifications].**

For other issues, you can provide feedback through the community chat group or issue tracker!
