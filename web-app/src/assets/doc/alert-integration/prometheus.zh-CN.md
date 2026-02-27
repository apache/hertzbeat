> 可以在 Prometheus Server 的 Alertmanager 配置中直接配置 HertzBeat 的服务地址，使用 HertzBeat 替换 Alertmanager 直接来接收处理 Prometheus Server 的告警信息。

### Prometheus 服务配置

- 编辑 Prometheus 配置文件 `prometheus.yml`，添加 HertzBeat 作为告警接收端配置

```yaml
# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - {hertzbeat_host}:1157
      authorization:
        type: 'Bearer'
        credentials: '{token}'

```

- `{hertzbeat_host}:1157` 為 HertzBeat Server 地址和端口，根据实际情况修改，需要保证网络连通性
- `{token}` 为 HertzBeat Server 的授权 Token，申请新 Token 后替换值

- 重新加载启动 Prometheus Server

## 验证配置

1. 确保 Prometheus 配置正确并重新加载配置
    ```bash
    curl -X POST http://localhost:9090/-/reload
    ```
2. 检查 Prometheus 告警规则状态
    ```bash
    curl http://localhost:9090/api/v1/rules
    ```
3. 触发测试告警并在 HertzBeat 告警中心查看

## 常见问题

- 确保 HertzBeat URL 可以被 Prometheus 服务器访问
- 检查 Prometheus 日志中是否有告警发送失败的错误信息
- 验证告警规则表达式的正确性

更多信息请参考 [Prometheus 告警配置文档](https://prometheus.io/docs/alerting/latest/configuration/)
