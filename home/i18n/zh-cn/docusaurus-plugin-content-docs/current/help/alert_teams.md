---
id: alert_teams
title: 告警 Microsoft Teams 通知
sidebar_label: 告警 Microsoft Teams 通知
keywords: [告警 Microsoft Teams 通知, 开源告警系统, 开源监控告警系统]
---

> 阈值触发后发送告警信息，通过 Microsoft Teams Workflows Webhook 通知到接收人。

## 操作步骤

### 在 Microsoft Teams 创建 Workflows Webhook

Office 365 Incoming Webhook 已退役，请改用 Teams Workflows：

1. 打开目标 Teams 频道
2. 选择 **Workflows** → **Post to a channel when a webhook request is received**
3. 复制生成的 HTTPS Webhook URL

参考微软文档：[Retirement of Office 365 connectors within Microsoft Teams](https://devblogs.microsoft.com/microsoft365dev/retirement-of-office-365-connectors-within-microsoft-teams/)

### 在 HertzBeat 新增告警通知人

1. **【告警通知】->【新增接收人】 ->【选择 Microsoft Teams】->【设置 Teams Workflows Webhook URL】-> 【确定】**

2. **配置关联的告警通知策略⚠️ 【新增通知策略】-> 【将刚设置的接收人关联】-> 【确定】**

   > **注意⚠️ 新增了接收人并不代表已经生效可以接收告警信息，还需配置关联的告警通知策略，即指定哪些消息发给哪些接收人**。

### Microsoft Teams 通知常见问题

1. Teams 未收到告警通知

> 请排查在告警中心是否已有触发的告警信息  
> 请排查是否配置正确 Teams Workflows Webhook URL，是否已配置告警策略关联  
> 请不要使用已退役的 `webhook.office.com` Incoming Webhook URL

其它问题可以通过交流群 ISSUE 反馈哦！
