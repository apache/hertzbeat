>将 Zabbix 的告警通过 Webhook 方式发送到 HertzBeat 告警平台。

### 步骤一: 在 Zabbix 创建自定义 Webhook 媒介类型
1. 登录 Zabbix Web 界面
2. 进入 **告警** > **媒介类型** > **创建媒介类型**
3. 配置基本信息
    - 名称: HertzBeat Webhook
    - 类型: Webhook
4. 在 **参数** 部分添加以下字段

   | 名称 | 值 |
   |-----|-----|
   | URL | http://your-hertzbeat-server:1157/api/alerts/report/zabbix |
   | AlertName | {TRIGGER.NAME} |
   | AlertId | {EVENT.ID} |
   | HostName | {HOST.NAME} |
   | HostIp | {HOST.IP} |
   | TriggerDescription | {TRIGGER.DESCRIPTION} |
   | TriggerSeverity | {TRIGGER.SEVERITY} |
   | TriggerStatus | {EVENT.STATUS} |
   | ItemName | {ITEM.NAME} |
   | ItemValue | {ITEM.VALUE} |
   | ItemLastValue | {ITEM.LASTVALUE} |
   | EventDate | {EVENT.DATE} |
   | EventTime | {EVENT.TIME} |
   | EventTags | {EVENT.TAGS} |
   | EventRecoveryDate | {EVENT.RECOVERY.DATE} |
   | EventRecoveryTime | {EVENT.RECOVERY.TIME} |

5. 在 **脚本** 部分添加以下 JavaScript 代码
```javascript
var Hertzbeat = {

  sendMessage: function(url, alert) {
    request = new HttpRequest();
    request.addHeader('Content-Type: application/json');
    data = JSON.stringify(alert);

    Zabbix.Log(4, '[Hertzbeat Webhook] params: ' + data);
    // 推送告警消息
    response = request.post(url, data);
    Zabbix.Log(4, '[Hertzbeat Webhook] HTTP code: ' + request.Status());
    Zabbix.Log(4, '[Hertzbeat Webhook] response: ' + response);

    // 格式化返回的结果并做出判断，有异常则抛出异常。
    try {
      response = JSON.parse(response);
    } catch (error) {
      response = null;
      Zabbix.Log(4, '[Hertzbeat Webhook] response parse error');
    }

    if (request.Status() !== 200 ||  response.errcode !== 0 || response.errmsg !== 'ok') {
      if (typeof response.errmsg === 'string') {
        throw response.errmsg;
      }
      else {
        throw 'Unknown error. Check debug log for more information.'
      }
    }
  }
}

try {
  var params = JSON.parse(value);
  // 判断Webhook_url参数是否定义，未定义抛出错误。
  if (typeof params.URL === 'undefined') {
    throw 'Incorrect value is given for parameter "Webhook_url": parameter is missing';
  }

  var currentTimestamp = Date.now();

  // 转换 zabbix 严重性到 HertzBeat 优先级
  function convertSeverity(severity) {
    var severityMap = {
      "信息": "info",
      "Information": "info",
      "警告": "warning",
      "Warning": "warning",
      "一般严重": "error",
      "Average": "error",
      "严重": "critical",
      "High": "critical",
      "灾难": "emergency",
      "Disaster": "emergency"
    };
    return severityMap[severity] || "error";
  }
  // 构建指纹唯一标识
  var fingerprint = "zabbix-event:" + params.AlertId + "-" + params.HostName;

  // 构建 labels
  var labels = {
    "alertname": params.AlertName,
    "source": "zabbix",
    "severity": convertSeverity(params.TriggerSeverity),
    "host": params.HostName,
    "hostip": params.HostIp,
    "itemname": params.ItemName
  };

  // 解析事件标签
  if (params.EventTags) {
    var tags = params.EventTags.split(',');
    for (var i = 0; i < tags.length; i++) {
      var tagParts = tags[i].split(':');
      if (tagParts.length == 2) {
        var key = tagParts[0].trim();
        var value = tagParts[1].trim();
        labels[key] = value;
      }
    }
  }

  // 构建注解信息
  var annotations = {
    "summary": params.AlertName,
    "description": params.TriggerDescription,
    "value": params.ItemValue,
    "lastValue": params.ItemLastValue
  };

  // 构建告警内容
  var content = "主机: " + params.HostName +
    "\nIP: " + params.HostIp +
    "\n告警: " + params.AlertName +
    "\n级别: " + params.TriggerSeverity +
    "\n描述: " + params.TriggerDescription +
    "\n监控项: " + params.ItemName +
    "\n当前值: " + params.ItemValue +
    "\n上次值: " + params.ItemLastValue +
    "\n时间: " + params.EventDate + " " + params.EventTime;

  // 确定状态
  var status = params.TriggerStatus === "RESOLVED" ? "resolved" : "firing";

  // 计算时间戳
  var startAt = currentTimestamp;
  var endAt = null;

  // 如果是恢复事件，计算结束时间
  if (status === "resolved" && params.EventRecoveryDate && params.EventRecoveryTime) {
    endAt = currentTimestamp;
  }

  // 构建发送到 HertzBeat 的 payload
  var hertzbeatAlert = {
    "fingerprint": fingerprint,
    "labels": labels,
    "annotations": annotations,
    "content": content,
    "status": status,
    "triggerTimes": 1,
    "startAt": startAt,
    "activeAt": startAt,
    "endAt": endAt
  };

  // 记录日志
  Zabbix.Log(4, "HertzBeat webhook payload: " + JSON.stringify(hertzbeatAlert));

  // 执行消息推送函数
  Hertzbeat.sendMessage(params.URL, hertzbeatAlert);
  // 返回给zabbix，ok 在 Zabbix 动作中会被用来标识成功执行。
  return 'OK';
} catch (error) {
  Zabbix.Log(4, '[Hertzbeat Webhook] notification failed: ' + error);
  throw 'Sending failed: ' + error + '.';
}  
```
7. 点击 **添加** 按钮保存媒介类型

### 步骤二: 为用户配置媒介
1. 进入 **用户** > **用户** > **选择要接收告警的用户** (可以创建一个专门用于告警的用户)
2. 选择 **报警媒介** 选项卡 > **添加**
3. 选择 **HertzBeat Webhook** 类型 
4. 启用时间段按需选择，报警严重性按需选择，确保状态为启用
5. 点击 **添加** 按钮保存媒介

### 步骤三: 配置告警动作
1. 进入 **告警** > **动作** > **触发器动作** > **创建动作**
2. 配置动作选项卡信息
    - 名称: HertzBeat Webhook
    - 条件: 根据需要配置触发条件
3. 配置操作选项卡信息
    - 操作步骤持续时间: 根据需要进行设置
    - 在**操作**部分添加，配置用户或用户组，选择之前配置 HertzBeat Webhook 媒介的用户，发送至媒体类型选择 **HertzBeat Webhook**，选中自定义消息内容，确保所有宏都被正确传递
    - **恢复操作**以及**更新操作**可以根据上述进行类似配置
4. 点击 **添加** 按钮保存告警动作


### 常见问题

#### 未收到告警
- 确保 Webhook URL 可以被 zabbix 服务访问
- 检查服务器日志是否有请求记录

#### 告警未触发
- 确保告警策略的条件正确，并已绑定通知

更多信息请参考 [Zabbix Webhook](https://www.zabbix.com/documentation/current/manual/config/notifications/webhook) 以及 [Zabbix 宏](https://www.zabbix.com/documentation/current/zh/manual/appendix/macros)
