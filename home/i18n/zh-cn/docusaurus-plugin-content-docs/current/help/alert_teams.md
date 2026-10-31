---
id: alert_teams
title: 告警 Microsoft Teams Workflows 通知
sidebar_label: 告警 Microsoft Teams 通知
keywords: [开源监控, 开源告警, Microsoft Teams Workflows 通知]
---

> 阈值触发后，通过 Teams Workflows webhook 以 Adaptive Card 将告警发送到 Microsoft Teams 频道。

## 操作步骤

### 创建 Teams Workflows webhook

Office 365 连接器已停用。请使用 Teams Workflows（Power Automate）创建 HTTPS webhook：

1. 在目标 Teams 频道中选择 **Workflows**。
2. 使用模板 **Post to a channel when a webhook request is received**，或使用触发器 **When a Teams webhook request is received** 创建流程。
3. 复制生成的 HTTPS 地址，形如 `https://<region>.logic.azure.com/workflows/.../triggers/manual/paths/invoke?...&sig=...`。

### 在 HertzBeat 添加接收人

1. **告警通知 -> 新增接收人 -> Microsoft Teams -> 粘贴 Workflows webhook 地址 -> 确定**。
2. **新增通知策略并关联该接收人**。只新增接收人不会生效，还必须用策略指定哪些告警发给它。

> webhook 地址包含签名，按密钥保存。HertzBeat 会按原始地址发送 Adaptive Card，不会重新编码签名参数。

### 常见问题

频道没有收到卡片：

- 确认告警中心已经触发告警。
- 确认地址是 HTTPS，且主机是 `logic.azure.com` 或其子域名。
- 确认通知策略已关联该接收人。
