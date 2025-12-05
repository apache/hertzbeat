---
id: log_integration
title: 日志集成
sidebar_label: 日志集成
keywords: [开源监控, 日志集成, 日志管理, 多源日志]
---

> HertzBeat 的日志集成模块旨在实现对来自不同第三方日志系统和可观测性平台的日志数据进行统一接收、标准化处理。作为一个集中式"日志中心"，HertzBeat 能够高效地接入外部系统的日志信息，并提供实时日志监控与分析能力。

### 核心能力

- **多源日志接入**：支持从 OpenTelemetry、Filebeat、Vector、Loki 等主流平台接收日志数据
- **日志格式标准化**：将来自不同平台的日志数据转换为 HertzBeat 内部统一格式，便于后续处理和分析
- **实时日志处理**：提供实时日志流处理能力，支持日志数据的即时存储和分发
- **智能日志分析**：提供日志搜索、过滤等分析功能

### 已支持的日志来源

HertzBeat 当前已支持以下协议进行日志数据接入：

- **OTLP**：支持标准的 OpenTelemetry 日志协议 (OTLP) HTTP 格式，可直接接收来自 OpenTelemetry Collector 和各种支持 OTLP 的应用程序的日志数据。
- **更多协议支持**：HertzBeat 正在积极扩展其日志集成支持，包括 Filebeat、Vector、Loki 等。如果暂时没有找到你需要的集成，活跃的社区也可以协助你添加。

你可以通过 HertzBeat 的"日志集成"界面查看具体的接入方式和配置示例。

![log_integration](/img/docs/help/log_integration_cn.png)

## OpenTelemetry OTLP 协议接入

### 接口端点

HertzBeat 提供以下接口用于接收 OTLP 日志数据：

```text
POST /api/logs/otlp/v1/logs
```

### 请求配置

#### 请求头

- `Content-Type`: `application/json` 或 `application/x-protobuf`
- `Authorization`: `Bearer {token}` 
-  或者不使用 `Bearer` 而是 `Basic` (根据 HertzBeat 配置的认证配置)

#### 请求体格式

支持标准的 OTLP JSON-Protobuf 格式日志数据或者 Binary Protobuf 格式日志数据：

```json
{
  "resourceLogs": [
    {
      "resource": {
        "attributes": [
          {
            "key": "service.name",
            "value": {
              "stringValue": "my-service"
            }
          },
          {
            "key": "service.version", 
            "value": {
              "stringValue": "1.0.0"
            }
          }
        ]
      },
      "scopeLogs": [
        {
          "scope": {
            "name": "my-logger",
            "version": "1.0.0"
          },
          "logRecords": [
            {
              "timeUnixNano": "1640995200000000000",
              "severityNumber": 9,
              "severityText": "INFO",
              "body": {
                "stringValue": "This is a log message"
              },
              "attributes": [
                {
                  "key": "user.id",
                  "value": {
                    "stringValue": "12345"
                  }
                }
              ],
              "traceId": "12345678901234567890123456789012",
              "spanId": "1234567890123456"
            }
          ]
        }
      ]
    }
  ]
}
```

### 配置示例

#### OpenTelemetry Collector 配置

在 OpenTelemetry Collector 的配置文件中添加 HertzBeat 作为日志导出目标：

```yaml
exporters:
  otlphttp:
    logs_endpoint: http://{hertzbeat_host}:1157/api/logs/otlp/v1/logs
    compression: none
    encoding: json
    headers:
      Authorization: "Bearer {token}"

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

### 日志数据格式说明

#### 核心字段

- **timeUnixNano**: 日志时间戳（纳秒精度）
- **severityNumber**: 日志级别数值（1-24，对应 TRACE 到 FATAL）
- **severityText**: 日志级别文本（如 "INFO", "ERROR" 等）
- **body**: 日志消息内容
- **attributes**: 日志属性键值对
- **traceId**: 链路追踪 ID（可选）
- **spanId**: 跨度 ID（可选）

#### 资源属性

通过 `resource.attributes` 可以设置应用程序和环境信息：

- `service.name`: 服务名称
- `service.version`: 服务版本
- `deployment.environment`: 部署环境（dev/test/prod）
- `host.name`: 主机名

### 配置验证

1. **配置日志发送端**：在外部系统中配置发送 OTLP 日志到 HertzBeat 指定接口
2. **查看接收日志**：在 HertzBeat 实时日志模块中查看接收到的日志数据
3. **验证数据完整性**：验证日志数据格式、时间戳、属性等信息是否正确

![log_stream](/img/docs/help/log_stream_cn.png)

### 常见问题

#### 日志发送失败

- **网络连接问题**：确保HertzBeat服务地址可以被外部系统访问
- **请求头错误**：验证请求头 Content-Type 设置为 `application/json`

#### 日志格式错误

- **OTLP格式**：确保发送的是标准 OTLP JSON-Protobuf 或 Binary Protobuf 格式
- **时间戳格式**：检查时间戳格式是否为纳秒精度的Unix时间戳
- **日志级别**：验证 severityNumber 值范围（1-24）
- **数据类型**：确保各字段的数据类型符合OTLP规范

### 相关资源

- [OpenTelemetry 日志规范](https://opentelemetry.io/docs/specs/otel/logs/)
- [OpenTelemetry Collector 配置指南](https://opentelemetry.io/docs/collector/configuration/)

如需了解更多日志集成方式或遇到技术问题，欢迎通过 [GitHub Issues](https://github.com/apache/hertzbeat/issues) 与社区交流。
