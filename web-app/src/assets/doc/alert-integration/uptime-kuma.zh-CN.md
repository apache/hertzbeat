>将 Uptime-Kuma 的告警通过 Webhook 方式发送到 HertzBeat 告警平台。

### 配置 Uptime Kuma 告警回调

#### 进入通知配置
1. 登录 Uptime Kuma web 管理界面
2. 进入 **设置** > **通知** > **设置通知**
3. 选择 **Webhook** 通知类型
4. 在 **Post URL** 中，填写 HertzBeat 提供的 Webhook 接口地址 URL：
   ```
   http://{your_system_host}/api/alerts/report/uptime-kuma
   ```
5. 在 **请求体** 选择 **预设-application/json**,其他请按需配置
6. 保存设置通知


### 常见问题

#### 未收到告警
- 确保 Webhook URL 可以被 uptime kuma 服务访问
- 检查服务器日志是否有请求记录

#### 告警未触发
- 确保告警策略的条件正确，并已绑定通知

更多信息请参考 [Uptime Kuma Wiki](https://github.com/louislam/uptime-kuma/wiki)
