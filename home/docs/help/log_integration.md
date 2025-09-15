---
id: log_integration
title: Log Integration
sidebar_label: Log Integration
keywords: [open source monitoring, log integration, log management, multi-source logs]
---

> HertzBeat's log integration module aims to achieve unified reception, standardized processing of log data from different third-party log systems and observability platforms. As a centralized "log center", HertzBeat can efficiently integrate log information from external systems and provide real-time log monitoring and analysis capabilities.

### Core Capabilities

- **Multi-source Log Integration**: Support receiving log data from mainstream platforms such as OpenTelemetry, Filebeat, Vector, Loki
- **Log Format Standardization**: Convert log data from different platforms to HertzBeat's internal unified format for subsequent processing and analysis
- **Real-time Log Processing**: Provide real-time log stream processing capabilities, supporting instant storage and distribution of log data
- **Intelligent Log Analysis**: Provide log search, filtering and other analysis functions

### Supported Log Sources

HertzBeat currently supports data integration from the following third-party log platforms:

- **OTLP**: Support standard OpenTelemetry Log Protocol (OTLP) HTTP/JSON format, can directly receive log data from OpenTelemetry Collector and various applications that support OTLP.
- **More Protocol Support**: HertzBeat is actively expanding its log integration support, including Filebeat, Vector, Loki, etc. If you can't find the integration you need temporarily, the active community can also help you add it.

You can view specific integration methods and configuration examples through HertzBeat's "Log Integration" interface.

![log_integration](/img/docs/help/log_integration_en.png)

## OpenTelemetry OTLP Protocol Integration

### API Endpoints

HertzBeat provides the following interfaces for receiving OTLP log data:

**Protocol-specific Interface**:

```text
POST /api/logs/ingest/otlp
```

**Default Interface** (automatically uses OTLP protocol):

```text
POST /api/logs/ingest
```

### Request Configuration

#### Request Headers

- `Content-Type`: `application/json`
- `Authorization`: `Bearer {token}`

#### Request Body Format

Support standard OTLP JSON format log data:

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

### Configuration Examples

#### OpenTelemetry Collector Configuration

Add HertzBeat as a log export target in the OpenTelemetry Collector configuration file:

```yaml
exporters:
  otlphttp:
    logs_endpoint: http://{hertzbeat_host}:1157/api/logs/ingest/otlp
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

### Log Data Format Description

#### Core Fields

- **timeUnixNano**: Log timestamp (nanosecond precision)
- **severityNumber**: Log level numeric value (1-24, corresponding to TRACE to FATAL)
- **severityText**: Log level text (such as "INFO", "ERROR", etc.)
- **body**: Log message content
- **attributes**: Log attribute key-value pairs
- **traceId**: Trace ID (optional)
- **spanId**: Span ID (optional)

#### Resource Attributes

Application and environment information can be set through `resource.attributes`:

- `service.name`: Service name
- `service.version`: Service version
- `deployment.environment`: Deployment environment (dev/test/prod)
- `host.name`: Host name

### Configuration Verification

1. **Configure Log Sender**: Configure external systems to send OTLP logs to HertzBeat specified interface
2. **View Received Logs**: View received log data in HertzBeat real-time log module
3. **Verify Data Integrity**: Verify whether log data format, timestamp, attributes and other information are correct

![log_stream](/img/docs/help/log_stream_en.png)

### Common Issues

#### Log Sending Failed

- **Network Connection Issues**: Ensure HertzBeat service address can be accessed by external systems
- **Request Header Error**: Verify that request header Content-Type is set to `application/json`

#### Log Format Error

- **OTLP Format**: Ensure standard OTLP JSON format is sent
- **Timestamp Format**: Check if timestamp format is Unix timestamp with nanosecond precision
- **Log Level**: Verify severityNumber value range (1-24)
- **Data Type**: Ensure data types of each field comply with OTLP specification

### Related Resources

- [OpenTelemetry Log Specification](https://opentelemetry.io/docs/specs/otel/logs/)
- [OpenTelemetry Collector Configuration Guide](https://opentelemetry.io/docs/collector/configuration/)

For more log integration methods or technical issues, feel free to communicate with the community through [GitHub Issues](https://github.com/apache/hertzbeat/issues).
