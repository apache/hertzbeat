---
id: mcp_server
title: MCP 服务器
sidebar_label: MCP 服务器
keywords: [MCP, 服务器, 可用性]
mcp_availability: unavailable
mcp_activation_requires: trusted-transport-identity-and-gateway-run-ledger
---

### 2.0.0 可用性

Apache HertzBeat 2.0.0 不提供可调用的 MCP 服务。MCP 服务器及其工具回调转换器默认关闭。

在可信传输身份接入 Agent Gateway 的运行与工具台账边界之前，MCP 将保持不可用。这样可以防止 MCP 客户端绕过 Agent Gateway 已有的工作空间、目标授权、审批和审计控制。

因此，HertzBeat 2.0.0 不提供客户端连接地址、认证方法、编辑器配置或可调用工具列表。当前支持的预览流程请使用 HertzBeat Web 界面及由 Agent Gateway 支持的 AI 工作台。
