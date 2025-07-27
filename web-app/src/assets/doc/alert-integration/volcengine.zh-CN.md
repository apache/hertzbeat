> 将火山引擎云监控的告警通过 Webhook 方式发送到 HertzBeat 告警平台。

### 配置火山引擎告警回调

1. 登录火山引擎云监控[回调地址管理页面](https://console.volcengine.com/cloud-monitor/notice/webhook)
2. 点击**创建回调地址**
3. 在回调地址创建页面填写基础信息，回调类型选择`通用地址回调`
4. 回调地址输入框中填写 HertzBeat 提供的 Webhook 接口地址 URL:

   ```
   http://{your_system_host}/api/alerts/report/volcengine
   ```

### 绑定告警策略

1. 登录火山引擎云监控[告警策略配置页面](https://console.volcengine.com/cloud-monitor/alert/strategy)
2. 创建新策略或编辑已有策略，在告警方式配置中
   - 选择通知方式为**手动通知**
   - 告警渠道勾选**告警回调**
   - 告警回调中选择上一步创建的回调地址
3. 保存告警策略
yar
### 常见问题

#### 未收到告警
- 确保 Webhook URL 可以被公网访问
- 检查服务器日志是否有请求记录
- 在火山引擎回调地址页面测试 Webhook 是否可用

#### 告警未触发
- 确保告警策略的条件正确，并且绑定正确的回调地址作为通知渠道
- 确保告警策略为`启用`状态
- 在火山引擎云监控控制台中查看告警历史，确保策略被触发

更多信息请参考 [火山引擎告警配置文档](https://www.volcengine.com/docs/6408/68122)
