> HertzBeat 支持 OpenTelemetry Logs Protocol (OTLP) 协议，外部系统可以通过 OTLP 方式将日志数据推送到 HertzBeat 日志平台。

### 接口端点

`POST /api/logs/otlp/v1/logs`

### 请求头

- `Content-Type`: `application/json` or `application/x-protobuf`
- `Authorization`: `Bearer {token}`

### 请求体

支持标准的 OTLP JSON-Protobuf 格式日志数据或者 Binary Protobuf 格式日志数据:

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

### 配置示例

#### OpenTelemetry Collector 配置

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

### 配置验证

1. 配置外部系统发送OTLP日志到HertzBeat指定接口
2. 在HertzBeat日志平台中查看接收到的日志数据
3. 验证日志数据格式和内容是否正确

### 常见问题

#### 日志发送失败
- 确保HertzBeat服务地址可以被外部系统访问
- 检查Token是否正确配置

#### 日志格式错误
- 检查时间戳格式是否为纳秒精度
- 验证severityNumber值范围（1-24）

#### 性能优化建议
- 使用批处理方式发送日志，减少网络请求
- 合理设置日志级别，避免发送过多DEBUG日志

更多信息请参考 [OpenTelemetry日志规范](https://opentelemetry.io/docs/specs/otel/logs/)