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

> **Scheduled Threshold Rules** refer to rules where the system evaluates an expression (such as PromQL) at specified periodic intervals to determine whether monitoring data within a given time range meets alert conditions. These rules are suitable for scenarios requiring trend analysis or aggregated data evaluation, rather than immediate reactions to single real-time data points.

### Syntax for Scheduled Threshold Expressions

Scheduled threshold rules use a dedicated expression language based on ANTLR syntax, supporting PromQL-style queries. The syntax includes:

1. **Query Expressions**: Used to reference monitoring data, supporting PromQL style. For specific syntax, refer to the documentation of your configured time-series database.

    ```text
        cpu_usage
        memory{\__field\__="field1"}
    ```

2. **Comparison Expressions**: Used to compare values against thresholds.

    ```text
        cpu_usage > 80
        memory_usage >= 90.5
        response_time < 1000
    ```

3. **Logical Expressions**: Used to combine multiple conditions.

    ```text
        cpu_usage > 80 and memory_usage > 70
        disk_usage > 90 or inode_usage > 85
        cpu_usage > 80 unless maintenance_mode == 1
    ```

4. **Parenthesis Expressions**: Used to control the order of evaluation.

    ```text
        (cpu_usage > 80 or memory_usage > 90) and service_status == 1
    ```

### Creating a Scheduled Threshold Rule

To configure a threshold rule, for example: define the expression `cpu_usage{instance="server1"} > 80` for a group of CPU metrics, and trigger an alert when the expression is satisfied. You can also configure the evaluation interval, alert severity level, notification template, and more.

![threshold](/img/docs/help/alert-threshold-2.png)

Configuration Items Explained:

- **Rule Name**：A unique identifier for the threshold rule.
- **Threshold Expression**：The expression that defines the alert condition. It will be evaluated periodically according to the "Execution Interval". Supported elements include:
  - **Query Identifiers**: References to monitoring metrics (e.g., `cpu_usage`, `memory{instance="server1"}`)
  - **Comparison Operators**: `>`, `>=`, `<`, `<=`, `==`, `!=`
  - **Logical Operators**: `and`, `or`, `unless`
  - **Parentheses**: Used for grouping and controlling evaluation order
  - **Numeric Literals**: Threshold values (e.g., `80`, `90.5`)
- **Execution Interval**: The time interval (in seconds) at which the expression is evaluated. For example, `300` means the rule is checked every 5 minutes.
- **Alert Level**: The severity level triggered when the condition is met. Available levels: `warning`, `critical`, `emergency`.
- **Trigger Count**: The number of consecutive times the expression must evaluate to true before an alert is actually triggered.
- **Notification Content**: The message template sent when an alert is triggered. Template variables are available on the configuration page.
- **Additional Labels**: Custom labels that will be attached to the alert when it is generated.
- **Additional Annotations**: Custom annotation information (supports environment variables) that will be rendered and attached to the alert.
- **Enable Alerting**: Controls whether this threshold rule is active or not.

**Once configured, successfully triggered alerts will be displayed in the \[Alert Center].**
**To send alert notifications via Email, WeCom, DingTalk, or Feishu, please go to \[Notification Configuration] to set up the appropriate channels.**
