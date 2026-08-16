> HertzBeat supports OpenTelemetry Logs Protocol (OTLP), allowing external systems to push log data to the HertzBeat log platform via OTLP.

In HertzBeat 1.9.0, metrics, logs, and traces share the canonical `/api/otlp/v1/{signal}` ingestion contract. This transition is intentionally Entity-free: receiving telemetry does not create or bind Entity records, and external OTLP data is kept separate from HertzBeat's internal self-telemetry.

### API Endpoint

`POST /api/otlp/v1/logs`

> Upgrading from 1.8.x: the former `POST /api/logs/otlp/v1/logs` / `POST /api/logs/ingest/otlp` endpoints still work on 1.9.x as deprecated aliases (responses carry `Deprecation: true`) and will be removed in 2.0. Point your exporters at `/api/otlp/v1/logs`.

### Request Headers

- `Content-Type`: `application/json` or `application/x-protobuf`
- `Authorization`: `Bearer {token}`

### Request Body

Supports standard OTLP JSON-Protobuf format or Binary Protobuf format log data:

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
              ]
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

```yaml
exporters:
  otlphttp:
    logs_endpoint: http://{hertzbeat_host}:1157/api/otlp/v1/logs
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

### Configuration Verification

1. Configure external systems to send OTLP logs to HertzBeat specified interface
2. Check received log data in HertzBeat log platform
3. Verify log data format and content correctness

### Common Issues

#### Log Sending Failures
- Ensure HertzBeat service address is accessible from external systems
- Check if Token is correctly configured

#### Log Format Errors
- Check timestamp format is nanosecond precision
- Verify severityNumber value range (1-24)

#### Performance Optimization Tips
- Use batch processing to send logs, reducing network requests
- Set appropriate log levels, avoid sending too many DEBUG logs

For more information, please refer to [OpenTelemetry Logs Specification](https://opentelemetry.io/docs/specs/otel/logs/)
