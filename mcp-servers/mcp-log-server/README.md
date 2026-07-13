# HertzBeat 日志 MCP

该 MCP 服务基于 GreptimeDB 查询 HertzBeat 自身运行日志。使用前需要启用 GreptimeDB 日志写入。

## 结构化只读查询

服务只暴露 `query_logs`，不再接收或执行调用方提供的 SQL。服务端生成的查询固定为：

```sql
SELECT timestamp, severity_text, body
FROM hzb_logs
WHERE <结构化过滤条件>
ORDER BY timestamp DESC
LIMIT <1-100>
```

`query_logs` 支持以下可选参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `severity` | 字符串 | `TRACE`、`DEBUG`、`INFO`、`WARN`、`ERROR` 或 `FATAL` |
| `keyword` | 字符串 | 日志正文关键词，最长 256 个字符 |
| `startTime` | 整数 | 开始时间，Unix 毫秒时间戳 |
| `endTime` | 整数 | 结束时间，Unix 毫秒时间戳 |
| `limit` | 整数 | 返回条数，默认为 20，范围为 1～100 |

调用示例：

```json
{
  "severity": "ERROR",
  "keyword": "connection refused",
  "startTime": 1783785600000,
  "endTime": 1783872000000,
  "limit": 20
}
```

当前 `hzb_logs` 表没有 `monitorId` 字段，因此本接口不提供无效的监控 ID 过滤。如果后续需要该能力，应先在 OpenTelemetry 日志写入链中定义并提取统一的监控 ID 字段。

## GreptimeDB 账号

服务支持通过 `greptime.username` 和 `greptime.password` 发送 HTTP Basic Authentication。用户名和密码必须同时配置；建议配合 HTTPS 或可信内网使用。

项目当前 Docker Compose 使用 GreptimeDB `v0.14.3`，该版本只提供身份认证，不能限制用户为只读权限。因此当前真正生效的安全边界是“删除原始 SQL参数并固定生成单条 `SELECT`”。使用 GreptimeDB 1.0 及以上版本时，应为该 MCP 配置独立的 `ro`/`readonly` 账号。

## Claude Desktop 集成（stdio）

```json
{
    "mcpServers": {
        "hertzbeat-mcp": {
            "command": "java",
            "args": [
                "-Dspring.ai.mcp.server.stdio=true",
                "-Dspring.main.web-application-type=none",
                "-Dlogging.pattern.console=",
                "-jar",
                "${PATH}/hertzbeat-mcp-2.0-SNAPSHOT.jar"
            ],
            "env": {
                "GREPTIME_URL": "http://${IP}:4000",
                "GREPTIME_DATABASE": "public",
                "GREPTIME_USERNAME": "${READ_ONLY_USERNAME}",
                "GREPTIME_PASSWORD": "${READ_ONLY_PASSWORD}"
            }
        }
    }
}
```

不启用 GreptimeDB 认证时，可以省略 `GREPTIME_USERNAME` 和 `GREPTIME_PASSWORD`；不能只配置其中一个。

旧的 `getHertzbeatLog({"querySql": "..."})` Tool 已直接移除，不保留兼容入口，以免继续暴露任意 SQL执行能力。
