---
id: alert_notification_overview
title: 告警通知概览
sidebar_label: 告警通知概览
keywords: [开源监控工具, 开源告警系统, 告警通知, 通知渠道, 通知策略]
---

> 阈值触发后，除在告警中心展示外，HertzBeat 还可通过邮件、钉钉、企业微信、飞书、Telegram、Slack、Discord、短信、WebHook 等多种渠道通知指定接收人。

## 工作原理

告警通知需完成以下两步才能生效：

1. **新增接收人** — 配置接收人并选择通知渠道（邮件、钉钉机器人、Telegram Bot 等）。
2. **配置通知策略** — 将接收人关联到通知策略，策略决定哪些告警发送给哪些接收人。

> **注意⚠️ 新增了接收人并不代表已经生效可以接收告警信息，还需配置关联的告警通知策略，即指定哪些消息发给哪些接收人。**

## 支持的通知渠道

| 渠道 | 文档 |
|---|---|
| 邮件 | [告警邮件通知](alert_email) |
| 短信 | [告警短信通知](alert_sms) |
| WebHook | [告警 WebHook 通知](alert_webhook) |
| Discord 机器人 | [告警 Discord 通知](alert_discord) |
| Slack Webhook | [告警 Slack 通知](alert_slack) |
| Telegram 机器人 | [告警 Telegram 通知](alert_telegram) |
| 企业微信机器人 | [告警企业微信机器人通知](alert_wework) |
| 企业微信应用 | [告警企业微信应用通知](alert_enterprise_wechat_app) |
| 钉钉机器人 | [告警钉钉机器人通知](alert_dingtalk) |
| 飞书机器人 | [告警飞书机器人通知](alert_feishu) |
| 飞书应用 | [告警飞书应用通知](alert_feishu_app) |
| 华为云 SMN | [告警华为云 SMN 通知](alert_smn) |

如需自定义告警消息的内容与格式，请参考 [通知模板](alert_notification_template)。

## 操作步骤

1. **【告警通知】->【新增接收人】->【选择通知方式】->【填写渠道配置】->【确定】**

    ![email](/img/docs/help/alert-notice-1.png)

2. **配置关联的告警通知策略⚠️ 【新增通知策略】->【将刚设置的接收人关联】->【确定】**

    > **注意⚠️ 新增了接收人并不代表已经生效可以接收告警信息，还需配置关联的告警通知策略，即指定哪些消息发给哪些接收人。**

    ![email](/img/docs/help/alert-notice-policy.png)

### 告警通知常见问题

1. 新增了接收人，但未收到任何告警通知。

    > 请排查在告警中心是否已有触发的告警信息。
    > 请确认已配置告警通知策略，并将该接收人关联至策略中。

2. 自建 HertzBeat 无法发送邮件通知。

    > HertzBeat 需要自己配置邮件服务器，请确认是否在 `application.yml` 中配置了邮件服务器相关参数。

其它问题可以通过交流群ISSUE反馈哦！
