---
id: mcp_server
title: MCP Server
sidebar_label: MCP Server
keywords: [MCP, server, availability]
mcp_availability: unavailable
mcp_activation_requires: trusted-transport-identity-and-gateway-run-ledger
---

### Availability in 2.0.0

Apache HertzBeat 2.0.0 does not provide a callable MCP endpoint. The MCP
server and its tool callback converter are disabled by default.

MCP will remain unavailable until trusted transport identity is integrated
with the Agent Gateway run and tool ledger boundaries. This prevents an MCP
client from bypassing the same workspace, target authorization, approval, and
audit controls used by the Agent Gateway.

No client connection URL, authentication recipe, editor configuration, or
callable tool catalog applies to HertzBeat 2.0.0. Use the HertzBeat web
interface and its Agent Gateway-backed AI workspace for the supported preview
workflow.
