---
id: mcp_sse_server
title: MCP SSE Server
sidebar_label: MCP SSE Server
keywords: [MCP, SSE, streaming, server]
---

This page explains how connect to the HertzBeat MCP SSE server. The MCP server auto starts on the default port 1157 when you start the HertzBeat server.

### Overview

- Provides a Server‑Sent Events (SSE) stream for tool calling.
- Intended for MCP integrations and clients that consume streaming events.

### Connect to the MCP server

Make sure that hertzbeat server is up and running. If you are using any other port than 1157, replace the following accordingly
- URL: `http://localhost:1157/api/sse`

### Authentication

You must authenticate each request using one of the following methods:

- JWT bearer token

     - Header: `Authorization: Bearer <your-jwt-token>`

- Basic authentication
     - Header: `Authorization: Basic <base64(username:password)>`

### Cursor MCP configuration

Create or edit `.cursor/mcp.json` in your home directory or project root.

Basic auth:

```json
{
      "Hertzbeat-MCP": {
            "url": "http://localhost:1157/api/sse",
            "headers": {
                  "Authorization": "Basic <base64(username:password)>"
            }
      }
}
```

JWT bearer:

```json
{
      "Hertzbeat-MCP": {
            "url": "http://localhost:1157/api/sse",
            "headers": {
                  "Authorization": "Bearer <your-jwt-token>"
            }
      }
}
```

After saving, reload MCP in Cursor or restart the editor.

### Tools available

- list_monitors: Returns the list of names of all configured monitors.

More tools are coming soon to expand management and query capabilities.

### Notes

- If the connection drops, reconnect using the same headers.
