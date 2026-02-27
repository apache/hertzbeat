> HertzBeat supports OpenTelemetry Logs Protocol (OTLP), allowing external systems to push log data to the HertzBeat log platform via OTLP.

### API Endpoint

`POST /api/logs/otlp/v1/logs`

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