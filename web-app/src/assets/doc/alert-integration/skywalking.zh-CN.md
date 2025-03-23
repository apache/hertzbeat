>将 SkyWalking 的告警通过 Webhook 方式发送到 HertzBeat 告警平台。

### SkyWalking 服务配置

- 编辑 SkyWalking 配置文件 `alarm-settings.yml`，添加 HertzBeat 作为告警接收端配置
```yaml
hooks:
  webhook:
    default:
      is-default: true
      urls:
        - http://{hertzbeat_host}:1157/api/alerts/report/skywalking
```
- `http://{hertzbeat_host}:1157/api/alerts/report/skywalking` 为 HertzBeat 提供的 webhook 接口地址
- 重新加载启动 SkyWalking OAP Server

### 验证配置

1. 确保 SkyWalking 配置正确并重新加载配置
2. 检查 SkyWalking 告警规则状态
3. 触发测试告警并在 HertzBeat 告警中心查看

### 常见问题

- 确保 HertzBeat URL 可以被 SkyWalking 服务器访问
- 检查 SkyWalking 日志中是否有告警发送失败的错误信息
- 验证告警规则表达式的正确性

更多信息请参考 [SkyWalking 告警配置文档](https://skywalking.apache.org/docs/main/latest/en/setup/backend/backend-alarm/)
