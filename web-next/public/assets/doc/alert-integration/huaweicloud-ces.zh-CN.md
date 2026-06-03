>将华为云监控服务(CES)的告警通过 Webhook 方式发送到 HertzBeat 告警平台。

### 步骤一: 在云监控服务控制台设置通知模板
1. 登录华为云监控服务控制台
2. 选择 **告警** > **告警通知** > **通知内容模板** > **创建通知内容模板**
3. 渠道类型：设置为 HTTP/HTTPS 、通知类型：按需选择、数据格式： JSON
4. 确保如下 JSON 正确预览
```
{
  "version": "v1",
  "data": {
    "AccountName": "RDS_test",
    "Namespace": "弹性云服务器",
    "DimensionName": "云服务器",
    "ResourceName": "ecs-test",
    "MetricName": "CPU使用率",
    "IsAlarm": true,
    "AlarmLevel": "重要",
    "Region": "华北-乌兰察布-二零三",
    "RegionId": "cn-north-4",
    "ResourceId": "xxxx-xxxx",
    "PrivateIp": "127.0.0.0",
    "PublicIp": "100.0.0.0",
    "CurrentData": "1.06%",
    "AlarmTime": "2024/08/0514:45:16GMT+08:00",
    "AlarmRecordID": "ah1722xxxxxx",
    "AlarmRuleName": "test-xxx",
    "IsOriginalValue": true,
    "Filter": "原始值",
    "ComparisonOperator": "u003e=",
    "Value": "0%",
    "Unit": "%",
    "Count": 1,
    "EpName": "default"
  }
}
```

### 步骤二: 在云监控服务控制台设置通知对象
1. 登录华为云监控服务控制台
2. 选择 **告警** > **告警通知** > **通知对象** > **创建通知对象**
3. 选择渠道：HTTP 或者 HTTPS
4. 添加 HertzBeat 作为告警接收端配置
- 请求地址: http://{hertzbeat_host}:1157/api/alerts/report/huaweicloud-ces

### 步骤三: 在云监控服务控制台设置通知组
1. 登录华为云监控服务控制台
2. 选择 **告警** > **告警通知** > **通知组** > **创建通知组**
3. 选择通知对象：步骤二设置的 **通知对象**
- 您也可以在已有的通知组添加 **通知对象**

### 步骤四: 在云监控服务控制台设置通知策略
1. 登录华为云监控服务控制台
2. 选择 **告警** > **告警通知** > **通知策略** > **创建通知策略**
3. 选择 **通知范围** > **接收对象** > **通知组** > 选择步骤三设置的 **通知组**
4. 选择 **通知内容模板** > **指标模板** 跟 **事件模板** -> 选择步骤一设置的 **通知模板**
5. 其他的请按需选择配置

### 常见问题

#### 告警未触发
- 确保 Webhook URL 可以被 华为云监控服务(CES) 通知访问
- 确保 **通知策略**、**通知组**、**通知对象**、**通知内容模板** 设置的正确性
- 确保 **告警** > **告警规则** 设置的正确性/是否已启用，可查阅 **告警记录** 是否有触发告警
- 注意：已创建的 **通知对象** 加入到 **通知组** 后，**消息通知服务(SMN)** 会向订阅终端发送订阅确认信息，需确认后方可收到告警通知。
  - 创建完通知组以后，会在 **消息通知服务(SMN)** > **主题管理** > **主题** 中同步创建主题，并在 **消息通知服务(SMN)** > **主题管理** > **订阅** 中创建订阅信息。HertzBeat 添加了自动订阅的功能，如果状态不是(已确认)，请手动请求订阅
- 注意：若多个 **通知对象** 创建名称不一致，但通知渠道的对象一致，则只会收到一次订阅确认信息。

#### 其他
- HertzBeat 添加了加入到 **通知组** 后自动订阅的功能。
- 为了确保安全，HertzBeat 支持了 **消息签名认证**，通过签名串验证消息的合法性。

#### 更多信息请参考
- [告警](https://support.huaweicloud.com/usermanual-ces/ces_01_0067.html)
- [校验消息签名](https://support.huaweicloud.com/usermanual-smn/smn_ug_a9003.html)
- [请求订阅](https://support.huaweicloud.com/usermanual-smn/smn_ug_0046.html)
- [HTTP(S)消息格式](https://support.huaweicloud.com/usermanual-smn/smn_ug_a9002.html)



