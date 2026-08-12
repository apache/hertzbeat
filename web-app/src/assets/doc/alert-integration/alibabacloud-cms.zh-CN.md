> 将阿里云云监控 2.0 的告警通过 Webhook 发送到 HertzBeat 告警平台。

### 准备 HertzBeat API Token

1. 单击页面右上角的 **管理 API Token**。
2. 创建一个 Token 并立即妥善保存。Token 只会完整显示一次。

### 创建阿里云云监控 Webhook

1. 登录 [阿里云云监控 2.0 控制台](https://cmsnext.console.aliyun.com/)。
2. 选择或创建目标工作空间，然后进入 **告警中心** > **通知管理** > **通知对象**。
3. 选择 **自定义 Webhook** 页签，单击 **新建 Webhook**。
4. 填写 Webhook 配置：
   - 名称：`HertzBeat`
   - 标识符：例如 `hertzbeat`
   - URL：

     ```text
     http://{hertzbeat_host}:1157/api/alerts/report/alibabacloud-cms
     ```

   - Headers：添加 `Authorization`，值为 `Bearer {token}`
   - Method：`POST`
   - 数据格式：`JSON`
   - 语言：按需选择
5. 保存 Webhook。

> 请使用云监控 2.0 工作空间内的通知对象。Prometheus 监控或 ARMS 告警管理中的通知对象使用不同的 Webhook 格式，不适用于此集成。

> `{hertzbeat_host}` 必须是阿里云云监控可以访问的公网地址。生产环境建议通过 HTTPS 反向代理暴露此接口。

### 绑定告警规则

1. 进入 **告警中心** > **告警管理** > **告警规则**。
2. 创建或编辑告警规则。
3. 在告警通知中选择上一步创建的 HertzBeat 自定义 Webhook。
4. 如需在 HertzBeat 中自动恢复告警，请同时启用恢复通知。
5. 保存并启用告警规则。

### 字段映射

| 阿里云云监控字段 | HertzBeat 字段 |
| --- | --- |
| `status: OCCURRED/PERSISTENT` | `status: firing` |
| `status: RESOLVED/RECOVERED` | `status: resolved` |
| `subject` | `labels.alertname` |
| `severity` | `labels.severity` |
| `alertMessage` | 告警内容 |
| `labels`、`resource.tags` | 告警标签 |
| `annotations`、阈值和资源属性 | 告警注解 |
| `timestamp` 或 `time` | 告警时间 |

### 常见问题

#### 返回 401 或 403

- 确认已创建有效的 HertzBeat API Token。
- 确认 Webhook Header 名称为 `Authorization`，值以 `Bearer ` 开头。

#### HertzBeat 未收到告警

- 确认 Webhook URL 可从公网访问，并且端口已放行。
- 确认数据格式选择为 `JSON`，请求方法选择为 `POST`。
- 检查阿里云云监控的告警历史以及 HertzBeat 服务日志。
- 若配置了来源 IP 白名单，请以阿里云官方文档中的最新地址段为准。

#### 告警没有自动恢复

- 确认告警规则或通知策略已启用恢复通知。
- 确认恢复 Webhook 中的 `status` 为 `RESOLVED` 或 `RECOVERED`。

更多信息请参考：

- [阿里云云监控通知对象与 Webhook 字段](https://help.aliyun.com/zh/cms/cloudmonitor-2-0/notification-object)
- [阿里云云监控告警规则](https://help.aliyun.com/zh/cms/cloudmonitor-2-0/alert-rules-cms-2-0)
