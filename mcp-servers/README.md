# Introduction
This file has a short description of each mcp server in `mcp-servers` directory

# MCP servers

## mcp-bash-server

This MCP server provides seven fixed, parameterless system diagnostic tools for
the machine running the server. General shell command, script, and Python
execution has been removed and cannot be re-enabled through configuration.

Uses OAuth 2.0 for authentication in production. See the server's README for
Linux dependencies, execution boundaries, and resource-control limitations.

## mcp-log-server

This mcp server provide the ability to query log from greptime db.
