---
id: mcp_server
title: MCP 服务器
sidebar_label: MCP 服务器
keywords: [MCP, StreamabelHttp, 流式传输, 服务器]
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

本页面介绍如何连接到 HertzBeat MCP 服务器。当您启动 HertzBeat 服务器时，MCP 服务器会自动在默认端口 1157 上启动。

### 概述

- 提供 StreamabelHttp 协议的 MCP服务器。
- 专为 MCP 集成和消费流式事件的客户端而设计。

### 连接到 MCP 服务器

确保 HertzBeat 服务器已启动并正在运行。如果您使用的端口不是 1157，请相应地替换以下内容：

- URL: `http://your-hertzbeat-server-host:1157/api/mcp`

### 身份验证

您必须使用以下方法之一对每个请求进行身份验证：

- JWT Bearer 令牌

  - 请求头: `Authorization: Bearer <your-jwt-token>`

注意：您可以在 HertzBeat Web UI 的日志集成或告警集成页面点击生成 JWT 令牌。

- 基本身份验证
  - 请求头: `Authorization: Basic <base64(username:password)>`

### MCP 配置

<Tabs>
  <TabItem value="claude-code" label="Claude Code MCP">

Claude Code 使用一个全局配置文件 `~/.claude.json` 来管理 MCP 服务器，你可以通过 CLI 或直接编辑这个文件来添加 HertzBeat MCP：

方式一: 使用 CLI 快速创建：

```bash
claude mcp add -s user -t http hertzbeat-mcp http://your-hertzbeat-server-host:1157/api/mcp --header "Authorization: Bearer your_jwt_key"
```

方式二：打开 `~/.claude.json`，在顶层的 `mcpServers` 下添加 HertzBeat MCP 配置。

Basic auth:

```jsonc
{
  "mcpServers": {
    "hertzbeat-mcp": {
      "type": "sse",
      "url": "http://your-hertzbeat-server-host:1157/api/mcp",
      "headers": {
        "Authorization": "Basic <base64(username:password)>"
      }
    }
  }
}
```

JWT bearer:

```jsonc
{
  "mcpServers": {
    "hertzbeat-mcp": {
      "type": "sse",
      "url": "http://your-hertzbeat-server-host:1157/api/mcp",
      "headers": {
        "Authorization": "Bearer <your-jwt-token>"
      }
    }
  }
}
```

保存 `~/.claude.json` 后，重启或重新加载 Claude Code，让新的 MCP 配置生效。

  </TabItem>
  <TabItem value="cursor" label="Cursor MCP" default>

Cursor 使用配置文件 `.cursor/mcp.json` 来管理 MCP 服务器，在用户目录或者项目目录下创建或者编辑这个文件：

Basic auth:

```json
{
      "hertzbeat-mcp": {
            "url": "http://your-hertzbeat-server-host:1157/api/mcp",
            "headers": {
                  "Authorization": "Basic <base64(username:password)>"
            }
      }
}
```

JWT bearer:

```json
{
      "hertzbeat-mcp": {
            "url": "http://your-hertzbeat-server-host:1157/api/mcp",
            "headers": {
                  "Authorization": "Bearer <your-jwt-token>"
            }
      }
}
```

After saving, reload MCP in Cursor or restart the editor.

  </TabItem>
</Tabs>

### 可用工具

#### 监控管理工具

- **query_monitors**: 查询现有/已配置的监控器，支持全面的过滤、分页和状态概览。支持按 ID、类型、状态、主机、标签进行过滤和排序。
- **add_monitor**: 向 HertzBeat 添加新的监控目标，支持全面配置。处理每种监控器类型的不同参数要求。
- **list_monitor_types**: 列出所有可添加到 HertzBeat 的监控器类型。显示所有支持的监控器类型及其显示名称。
- **get_monitor_additional_params**: 获取特定监控器类型所需的参数定义。显示添加监控器时需要的参数。

#### 指标数据工具

- **query_realtime_metrics**: 获取特定监控器的实时指标数据。返回当前指标值，包括 CPU、内存、磁盘使用率等。
- **get_historical_metrics**: 获取用于分析和趋势的历史指标数据。返回指定时间范围内指定指标的时间序列数据。
- **get_warehouse_status**: 检查指标存储仓库系统的状态。返回指标存储是否可操作和可访问。

#### 告警管理工具

- **query_alerts**: 查询告警，支持全面的过滤和分页选项。支持按告警类型（单个/组）、状态（触发/已解决）、搜索词进行过滤和排序。
- **get_alerts_summary**: 获取告警摘要统计信息，包括总数、状态分布和所有监控器的优先级分解。

#### 告警规则定义工具

- **create_alert_rule**: 基于应用层次结构和用户需求创建 HertzBeat 告警规则。支持阈值、字段条件和全面的告警配置。
- **list_alert_rules**: 列出现有的告警规则，支持过滤选项。显示已配置的阈值和告警定义，支持搜索和分页。
- **get_alert_rule_details**: 获取特定告警规则的详细信息。显示完整的阈值配置和规则设置。
- **toggle_alert_rule**: 启用或禁用告警规则。允许激活或停用特定规则的阈值监控。
- **get_apps_metrics_hierarchy**: 获取所有可用应用及其指标的层次结构，用于告警规则创建。返回带有字段参数的结构化 JSON 数据。
- **bind_monitors_to_alert_rule**: 将监控器绑定到告警规则。将特定监控器与告警规则关联以启用监控和告警。

### 注意事项

- 如果连接断开，请使用相同的请求头重新连接。
