---
id: alert_slack  
title: 告警 Slack Webhook 通知      
sidebar_label: 告警 Slack Webhook 通知      
keywords: [告警 Slack Webhook 通知, 开源告警系统, 开源监控告警系统]
---

> 阈值触发后发送告警信息，通过 Slack Webhook 通知到接收人。

## 操作步骤

> 部署网络本身需支持科学上网，不支持设置代理

### 在 Slack 开启 Webhook, 获取 Webhook URL

参考官网文档 [Sending messages using Incoming Webhooks](https://api.slack.com/messaging/webhooks)

### 在 HertzBeat 新增告警通知人，通知方式为 Slack Webhook

1. **【告警通知】->【新增接收人】 ->【选择 Slack Webhook 通知方式】->【设置 Webhook URL】-> 【确定】**

    ![email](/img/docs/help/slack-bot-1.png)

2. **配置关联的告警通知策略⚠️ 【新增通知策略】-> 【将刚设置的接收人关联】-> 【确定】**

    > **注意⚠️ 新增了接收人并不代表已经生效可以接收告警信息，还需配置关联的告警通知策略，即指定哪些消息发给哪些接收人**。

    ![email](/img/docs/help/alert-notice-policy.png)

### Slack 机器人通知常见问题

1. Slack 未收到机器人告警通知

> 请排查在告警中心是否已有触发的告警信息  
> 请排查是否配置正确 Slack Webhook URL，是否已配置告警策略关联

其它问题可以通过交流群ISSUE反馈哦！
