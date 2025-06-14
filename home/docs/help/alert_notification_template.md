---
id: alert_notification_template
title: Notification Template
sidebar_label: Notification Template
keywords: [Template, Alert Template, Alarm Template, Notification Template, Message Notification, Alert Webhook Callback Notification]
---

> HertzBeat supports custom notification templates. Templates use placeholder variables for rendering, and the system automatically replaces variables with actual alert data during push notifications.

## Template Configuration

【Notification】->【Notice Template】->【Template Configuration】

![Template Configuration](/img/docs/help/alert-notification-template-1-en.png)

## Template Rendering

HertzBeat notification templates are based on FreeMarker syntax, supporting variable placeholders, conditional judgments, loops, formatting, and other advanced features. During template rendering, the system injects alert data objects (e.g., GroupAlert, SingleAlert) into the template, and variables are automatically replaced with actual values.

## Available Variables and Data Structures

### GroupAlert Structure Fields

[GroupAlert Definition](https://github.com/apache/hertzbeat/blob/master/hertzbeat-common/src/main/java/org/apache/hertzbeat/common/entity/alerter/GroupAlert.java)

- `id`：Primary key of the alert group
- `groupKey`： Unique identifier for the group
- `status`：Group status (e.g., firing, resolved)
- `groupLabels`：Group labels (Map)
- `commonLabels`：Common labels (Map)
- `commonAnnotations`：Common annotations (Map)
- `alertFingerprints`：List of alert fingerprints
- `creator`、`modifier`、`gmtCreate`、`gmtUpdate`：Metadata
- `alerts`：List of alert details （`List<SingleAlert>`）

### SingleAlert Structure Fields

[SingleAlert Definition](https://github.com/apache/hertzbeat/blob/master/hertzbeat-common/src/main/java/org/apache/hertzbeat/common/entity/alerter/SingleAlert.java)

- `id`：Primary key of the detail
- `fingerprint`：Unique fingerprint
- `labels`：Labels (Map)
- `annotations`：Annotations (Map)
- `content`：Alert content
- `status`：Status (firing|resolved)
- `triggerTimes`：Number of triggers
- `startAt`、`activeAt`、`endAt`：Timestamps
- `creator`、`modifier`、`gmtCreate`、`gmtUpdate`：Metadata

## Template Variables and Syntax Explanation

- **Global Variables**：
  - `${status}`：Alert status (e.g., alert, recovery, etc.)
  - `${groupKey}`：Unique identifier for the group
  - `${commonLabels.xxx}`、`${commonAnnotations.xxx}`：Common labels and annotations, accessed via `xxx`

- **Alert Details List**：
  - `${alerts}`：Collection of alert details, usually traversed with `<#list alerts as alert>`
  - `${alert.labels.xxx}`、`${alert.annotations.xxx}`：Labels and annotations for a single alert
  - `${alert.content}`：Alert content
  - `${alert.triggerTimes}`：Number of triggers
  - `${alert.startAt}`：First trigger time

- **Template Syntax Support**：
  - Supports FreeMarker syntax, including conditional statements `<#if>`, loops `<#list>`, JSON stringification `?json_string`, time formatting `?number_to_datetime`, string formatting `?string('yyyy-MM-dd HH:mm:ss')`, etc.
  - Allows flexible combination of variables and template syntax to achieve complex message customization.
  - For more syntax, refer to the [FreeMarker Documentation](https://freemarker.apache.org/)

## Template Example

```json
{
  "title": "🔔 HertzBeat Alert Notification",
  "status": "${status!"UNKNOWN"}",
  "commonLabels": {
    <#if commonLabels?? && commonLabels.severity??>
    "severity": "${commonLabels.severity?switch("critical", "❤️ Critical", "warning", "💛 Warning", "info", "💚 Info", "Unknown")}"<#if commonLabels.alertname??>,</#if>
    </#if>
    <#if commonLabels?? && commonLabels.alertname??>
    "alertName": "${commonLabels.alertname}"
    </#if>
  },
  "alerts": [
    <#if alerts?? && alerts?size gt 0>
    <#list alerts as alert>
    {
      "index": ${alert?index + 1},
      "labels": {
        <#if alert.labels?? && alert.labels?size gt 0>
        <#list alert.labels?keys as key>
        "${key}": "${alert.labels[key]?json_string}"<#if key?has_next>,</#if>
        </#list>
        </#if>
      },
      <#if alert.content?? && alert.content != "">
      "content": "${alert.content?json_string}",
      </#if>
      "triggerTimes": ${alert.triggerTimes!0},
      "startAt": "${((alert.startAt!0)?number_to_datetime)?string('yyyy-MM-dd HH:mm:ss')}",
      <#if alert.activeAt?? && alert.activeAt gt 0>
      "activeAt": "${((alert.activeAt!0)?number_to_datetime)?string('yyyy-MM-dd HH:mm:ss')}",
      </#if>
      <#if alert.endAt?? && alert.endAt gt 0>
      "endAt": "${(alert.endAt?number_to_datetime)?string('yyyy-MM-dd HH:mm:ss')}"<#if alert.annotations?? && alert.annotations?size gt 0>,</#if>
      </#if>
      <#if alert.annotations?? && alert.annotations?size gt 0>
      "annotations": {
        <#list alert.annotations?keys as key>
        "${key}": "${alert.annotations[key]?json_string}"<#if key?has_next>,</#if>
        </#list>
      }
      </#if>
    }<#if alert?has_next>,</#if>
    </#list>
    </#if>
  ],
  "commonAnnotations": {
    <#if commonAnnotations?? && commonAnnotations?size gt 0>
    <#list commonAnnotations?keys as key>
    "${key}": "${commonAnnotations[key]?json_string}"<#if key?has_next>,</#if>
    </#list>
    </#if>
  }
}
