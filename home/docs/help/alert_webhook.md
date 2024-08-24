---
id: alert_webhook
title: Alert WebHook callback notification     
sidebar_label: Alert webHook notification   
keywords: [open source monitoring tool, open source alerter, open source webhook notification]
---

> After the threshold is triggered send alarm information and call the Webhook interface through post request to notify the recipient.

### Operation steps

1. **【Alarm notification】->【Add new recipient】 ->【Select WebHook notification method】-> 【Set WebHook callback address】 -> 【Confirm】**

    ![email](/img/docs/help/alert-notice-5.png)

2. **Configure the associated alarm notification strategy⚠️ 【Add new notification strategy】-> 【Associate the recipient just set】-> 【Confirm】**

    > **Note⚠️ Adding a new recipient does not mean that it is effective to receive alarm information. It is also necessary to configure the associated alarm notification strategy, that is, to specify which messages are sent to which recipients.**

    ![email](/img/docs/help/alert-notice-4.png)

### WebHook callback POST body BODY content

Content format：JSON

```json
{
  "alarmId": 76456,
  "target": "${target}",
  "thresholdId": 33455,
  "priority": 0,
  "content": "udp_port monitoring availability alert, code is FAIL",
  "status": 0,
  "times": 1,
  "triggerTime": "2022-02-25T13:32:13",
  "tags": {
    "app": "windows",
    "monitorId": "180427708350720",
    "metrics": "availability",
    "code": "UN_CONNECTABLE",
    "thresholdId": "112",
    "monitorName": "WINDOWS_192.168.124.12"
  }
}
```

|             |                                                                                                                                                                                                                        |
|-------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| alarmId     | integer($int64) title: Alarm record entity primary key index ID 告警记录实体主键索引ID                                                                                                                                           |
| target      | string title: Alert target object: monitor availability-available metrics-app.metrics.field 告警目标对象: 监控可用性-available 指标-app.metrics.field                                                                               |
| thresholdId | integer($int64) title: Alarm definition ID associated with the alarm 告警关联的告警定义ID                                                                                                                                       |
| priority    | string($byte) title: Alarm level 0: high-emergency-critical alarm-red 1: medium-critical-critical alarm-orange 2: low-warning-warning alarm-yellow 告警级别 0:高-emergency-紧急告警-红色 1:中-critical-严重告警-橙色 2:低-warning-警告告警-黄色 |
| content     | string title: The actual content of the alarm notification 告警通知实际内容                                                                                                                                                    |
| status      | string($byte) title: Alarm status: 0-normal alarm (to be processed) 1-threshold triggered but not reached the number of alarms 2-recovered alarm 3-processed 告警状态: 0-正常告警(待处理) 1-阈值触发但未达到告警次数 2-恢复告警 3-已处理             |
| times       | integer($int32) title: Alarm threshold trigger times 告警阈值触发次数                                                                                                                                                          |
| triggerTime | integer($int64) title: Alarm trigger time (timestamp in milliseconds) 首次告警触发时间(毫秒时间戳)                                                                                                                                  |
| tags        | example: {key1:value1}                                                                                                                                                                                                 |

### Webhook notification common issues

1. WebHook callback did not take effect

    > Please check whether there is any triggered alarm information in the alarm center.  
    > Please check whether the configured webhook callback address is correct.

Other issues can be fed back through the communication group ISSUE!
