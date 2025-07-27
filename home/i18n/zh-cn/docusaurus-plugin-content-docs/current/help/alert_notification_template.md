---
id: alert_notification_template
title: 通知模板
sidebar_label: 通知模板
keywords: [模板, 告警模板, 通知模板，消息通知, 告警 Webhook 回调通知]
---

> HertzBeat 支持自定义通知模板，模板采用占位符变量进行渲染，系统会在推送时自动将变量替换为实际告警数据。

## 模板配置

【消息通知】->【通知模板】->【模板配置】

![模板管理](/img/docs/help/alert-notification-template-1.png)

## 模板渲染

HertzBeat 通知模板基于 FreeMarker 语法，支持变量占位符、条件判断、循环、格式化等高级用法。模板渲染时，系统会将告警数据对象（如 GroupAlert、SingleAlert）注入模板，变量会被自动替换为实际值。

## 可用变量与数据结构

### GroupAlert 结构体字段

[GroupAlert定义](https://github.com/apache/hertzbeat/blob/master/hertzbeat-common/src/main/java/org/apache/hertzbeat/common/entity/alerter/GroupAlert.java)

- `id`：告警分组主键
- `groupKey`：分组唯一标识
- `status`：分组状态（如 firing、resolved）
- `groupLabels`：分组标签（Map）
- `commonLabels`：公共标签（Map）
- `commonAnnotations`：公共注解（Map）
- `alertFingerprints`：告警指纹列表
- `creator`、`modifier`、`gmtCreate`、`gmtUpdate`：元数据
- `alerts`：告警明细列表（`List<SingleAlert>`）

### SingleAlert 结构体字段

[SingleAlert定义](https://github.com/apache/hertzbeat/blob/master/hertzbeat-common/src/main/java/org/apache/hertzbeat/common/entity/alerter/SingleAlert.java)

- `id`：明细主键
- `fingerprint`：唯一指纹
- `labels`：标签（Map）
- `annotations`：注解（Map）
- `content`：告警内容
- `status`：状态（firing|resolved）
- `triggerTimes`：触发次数
- `startAt`、`activeAt`、`endAt`：时间戳
- `creator`、`modifier`、`gmtCreate`、`gmtUpdate`：元数据

## 模板变量与语法说明

- **全局变量**：
  - `${status}`：告警状态（如告警、恢复等）
  - `${groupKey}`：分组唯一标识
  - `${commonLabels.xxx}`、`${commonAnnotations.xxx}`：公共标签和注解，可通过 `xxx` 访问具体字段

- **告警明细列表**：
  - `${alerts}`：告警明细集合，通常配合 `<#list alerts as alert>` 进行遍历
  - `${alert.labels.xxx}`、`${alert.annotations.xxx}`：单条告警的标签和注解
  - `${alert.content}`：告警内容
  - `${alert.triggerTimes}`：触发次数
  - `${alert.startAt}`：首次触发时间

- **模板语法支持**：
  - 支持 FreeMarker 语法，包括条件判断 `<#if>`、循环 `<#list>`、JSON 字符串化 `?json_string`、时间格式化 `?number_to_datetime`、字符串格式化 `?string('yyyy-MM-dd HH:mm:ss')` 等
  - 可灵活组合变量与模板语法，实现复杂的消息定制
  - 更多语法请参考 [FreeMarker 官方文档](https://freemarker.apache.org/)

## 模板示例

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
