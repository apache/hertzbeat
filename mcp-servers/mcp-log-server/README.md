# Hertzbeat-MCP

## Hertzbeat-Log-MCP

Log MCP Service Based on GreptimeDB.

- GreptimeDB log writing needs to be enabled.

## Claude Desktop Integration (stdio)

```json
{
    "mcpServers": {
        "hertzbeat-mcp": {
            "command": "java",
            "args": [
                "-Dspring.ai.mcp.server.stdio=true",
                "-Dspring.main.web-application-type=none",
                "-Dlogging.pattern.console=",
                "-Dgreptime.url=http://${IP}:4000",
                "-jar",
                "${PATH}/hertzbeat-mcp-2.0-SNAPSHOT.jar"
            ]
        }
    }
}
```