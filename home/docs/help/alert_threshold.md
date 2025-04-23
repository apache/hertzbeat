---
id: alert_threshold
title: Alarm Threshold Configuration
sidebar_label: Alarm Threshold
---

:::tip
Alarm Threshold are the core function of `HertzBeat`, users can configure the trigger conditions of the alarm through the threshold rules.  
Support real-time threshold and scheduled threshold, real-time threshold can directly trigger the alarm when monitoring data is collected, scheduled threshold supports PromQL and other expressions to calculate the trigger alarm within a specified time period.  
Support visual page configuration or more flexible expression rule configuration, support configuring trigger times, alarm levels, notification templates, associated specified monitoring and so on.
:::

![threshold](/img/docs/help/alert-threshold-1.png)

## Real-time Threshold

> Real-time threshold means that the alarm is triggered directly when the monitoring data is collected, which is suitable for scenarios with high real-time requirements.

### Creating Threshold Rules

    > HertzBeat Page -> Alerting -> Threshold -> New Threshold -> ReadTime Threshold Rule

Configure the threshold, for example: Select the SSL certificate metric object, configure the alarm expression-triggered when the metric `expired` is `true`, that is, `equals(expired,"true")`, set the alarm level notification template information, etc.

![HertzBeat](/img/docs/start/ssl_5.png)

Configuration item details:

- **Rule Name**：Unique name defining this threshold rule
- **Metric Object**: Select the monitoring metric object for which we need to configure the threshold. For example: Under website monitoring type -> under the summary metric set -> responseTime metric.
- **Threshold Rule**: Configure the alarm trigger rules for specific indicators, support graphical interface and expression rules. For expression environment variables and operators, see the page prompts. For detailed help on threshold expressions, see [Threshold Expression Help](alert_threshold_expr).
- **Associated Monitors**：Apply this threshold rule to the specified monitoring object (support direct binding and label association). If not configured, it will be applied to all monitoring objects that meet this threshold type rule.
- **Alert Level**: The alert level triggered by the threshold, from low to high: warning, critical, emergency.
- **Trigger Count**: Set how many times the threshold must be triggered before the alert is actually triggered.
- **Notification Template**: The template for the notification message sent after the alert is triggered. Template variables are provided on the page. For example: `${app}.${metrics}.${metric} metric value is ${responseTime}, which is greater than 50 triggering the alert`.
- **Bind Label**: Select the label we need to apply. If no label is selected, it will apply to all services corresponding to the set metric object.
- **Bing Annotation**：Add annotation information to this threshold rule (the annotation content supports environment variables). When an alarm is generated, this annotation information will be rendered and attached to the alarm.
- **Enable Alert**: Enable or disable this alert threshold configuration.

**The threshold alert configuration is complete, and alerts that have been successfully triggered can be viewed in the [Alarm Center].**
**If you need to send alert notifications via email, WeChat, DingTalk, or Feishu, you can configure it in [Notification].**

## Scheduled Threshold
