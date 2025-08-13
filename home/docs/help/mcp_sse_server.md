---
id: mcp_sse_server
title: MCP SSE Server
sidebar_label: MCP SSE Server
keywords: [MCP, SSE, streaming, server]
---

This page explains how to run and connect to the HertzBeat MCP SSE server.

### Overview

- Provides a Server‑Sent Events (SSE) stream for tool calling.
- Intended for MCP integrations and clients that consume streaming events.

### Connect to the MCP server

- URL: `http://localhost:1157/api/sse`
- Method: `GET`

### Authentication

You must authenticate each request using one of the following methods:

- JWT bearer token

     - Header: `Authorization: Bearer <your-jwt-token>`

- Basic authentication
     - Header: `Authorization: Basic <base64(username:password)>`

### Examples

JWT:

```bash
curl -N \
  -H "Accept: text/event-stream" \
  -H "Authorization: Bearer <jwt-token>" \
  http://localhost:1157/api/sse
```

Basic auth:

```bash
curl -N \
  -H "Accept: text/event-stream" \
  -H "Authorization: Basic $(printf '%s' 'username:password' | base64)" \
  http://localhost:1157/api/sse
```

### Notes


- If the connection drops, reconnect using the same headers.
