---
id: mcp_server
title: MCP Server
sidebar_label: MCP Server
keywords: [MCP, StreamableHttp, streaming, server]
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

This page explains how connect to the HertzBeat MCP server. The MCP server auto starts on the default port 1157 when you start the HertzBeat server.

### Overview

- Provides Streamable-Http protocol MCP server.
- Intended for MCP integrations and clients that consume streaming events.

### Connect to the MCP server

Make sure that hertzbeat server is up and running. If you are using any other port than 1157, replace the following accordingly

- URL: `http://your-hertzbeat-server-host:1157/api/mcp`

### Authentication

You must authenticate each request using one of the following methods:

- JWT bearer token

  - Header: `Authorization: Bearer <your-jwt-token>`

Note: You can generate a JWT token from the HertzBeat web UI under the Log Integration or Alarm Integration Page.

- Basic authentication
  - Header: `Authorization: Basic <base64(username:password)>`

### Editor MCP configuration

<Tabs>
  <TabItem value="claude-code" label="Claude Code MCP">

Claude Code use a global config file `~/.claude.json` to config mcp server. You can add HertzBeat MCP by CLI or edit this file directly.

Method A: Use the CLI.

```bash
claude mcp add -s user -t http hertzbeat-mcp http://your-hertzbeat-server-host:1157/api/mcp --header "Authorization: Bearer your_jwt_key"
```

Method B: Edit the file directly.

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

After saving `~/.claude.json`, restart or reload Claude Code to make the new MCP configuration take effect.

  </TabItem>
  <TabItem value="cursor" label="Cursor MCP" default>

Create or edit `.cursor/mcp.json` in your home directory or project root.

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

### Tools available

#### Monitor Management Tools

- **query_monitors**: Query existing/configured monitors with comprehensive filtering, pagination, and status overview. Supports filtering by IDs, type, status, host, labels, and sorting.
- **add_monitor**: Add a new monitoring target to HertzBeat with comprehensive configuration. Handles different parameter requirements for each monitor type.
- **list_monitor_types**: List all available monitor types that can be added to HertzBeat. Shows all supported monitor types with their display names.
- **get_monitor_additional_params**: Get the parameter definitions required for a specific monitor type. Shows what parameters are needed when adding a monitor.

#### Metrics Data Tools

- **query_realtime_metrics**: Get real-time metrics data for a specific monitor. Returns current metrics values including CPU, memory, disk usage, etc.
- **get_historical_metrics**: Get historical metrics data for analysis and trending. Returns time-series data for specified metrics over a time range.
- **get_warehouse_status**: Check the status of the metrics storage warehouse system. Returns whether the metrics storage is operational and accessible.

#### Alert Management Tools

- **query_alerts**: Query alerts with comprehensive filtering and pagination options. Supports filtering by alert type (single/group), status (firing/resolved), search terms, and sorting.
- **get_alerts_summary**: Get alerts summary statistics including total counts, status distribution, and priority breakdown across all monitors.

#### Alert Rule Definition Tools

- **create_alert_rule**: Create a HertzBeat alert rule based on app hierarchy structure and user requirements. Supports threshold values, field conditions, and comprehensive alert configuration.
- **list_alert_rules**: List existing alert rules with filtering options. Shows configured thresholds and alert definitions with search and pagination.
- **get_alert_rule_details**: Get detailed information about a specific alert rule. Shows complete threshold configuration and rule settings.
- **toggle_alert_rule**: Enable or disable an alert rule. Allows activating or deactivating threshold monitoring for specific rules.
- **get_apps_metrics_hierarchy**: Get the hierarchical structure of all available apps and their metrics for alert rule creation. Returns structured JSON data with field parameters.
- **bind_monitors_to_alert_rule**: Bind monitors to an alert rule. Associates specific monitors with alert rules to enable monitoring and alerting.

### Notes

- If the connection drops, reconnect using the same headers.
