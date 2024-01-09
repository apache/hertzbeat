---
id: alert_webhook
title: 告警 Webhook 回调通知      
sidebar_label: 告警 Webhook 回调通知    
keywords: [告警 Webhook 回调通知, 开源告警系统, 开源监控告警系统]
---

> 阈值触发后发送告警信息，通过post请求方式调用WebHook接口通知到接收人。          

## 操作步骤   

1. **【告警通知】->【新增接收人】 ->【选择WebHook通知方式】-> 【设置WebHook回调地址】 -> 【确定】** 

![email](/img/docs/help/alert-notice-5.png)

2. ** 配置关联的告警通知策略⚠️ 【新增通知策略】-> 【将刚设置的接收人关联】-> 【确定】**  

> ** 注意⚠️ 新增了接收人并不代表已经生效可以接收告警信息，还需配置关联的告警通知策略，即指定哪些消息发给哪些接收人 **。   

![email](/img/docs/help/alert-notice-4.png)    

### WebHook回调POST请求体BODY内容   

内容格式：JSON   
```json
{
    "id":76456,
    "target":"available",
    "alertDefineId":232,
    "priority":0,
    "content":"监控紧急可用性告警: UN_CONNECTABLE",
    "tag": {
      "monitorId": 3543534545,
      "monitorName":"API_poetry.didi.top"
    },
    "status":0,
    "times":1,
    "gmtCreate":"2022-02-25T13:32:13",
    "gmtUpdate":"2022-02-25T13:32:13"
}
```

|     |     |
|-----|-----|
| id |	integer($int64) title: Alarm record entity primary key index ID 告警记录实体主键索引ID |
| target |	string title: Alert target object: monitor availability-available metrics-app.metrics.field 告警目标对象: 监控可用性-available 指标-app.metrics.field |
| alertDefineId	integer($int64) title: Alarm definition ID associated with the alarm 告警关联的告警定义ID |
| priority |	string($byte) title: Alarm level 0: high-emergency-critical alarm-red 1: medium-critical-critical alarm-orange 2: low-warning-warning alarm-yellow 告警级别 0:高-emergency-紧急告警-红色 1:中-critical-严重告警-橙色 2:低-warning-警告告警-黄色 |
| content |	string title: The actual content of the alarm notification 告警通知实际内容 |
| status |	string($byte) title: Alarm status: 0-normal alarm (to be processed) 1-threshold triggered but not reached the number of alarms 2-recovered alarm 3-processed 告警状态: 0-正常告警(待处理) 1-阈值触发但未达到告警次数 2-恢复告警 3-已处理 |
| times | integer($int32) title: Alarm threshold trigger times 告警阈值触发次数 |
| firstTriggerTime |	integer($int64) title: Alarm trigger time (timestamp in milliseconds) 首次告警触发时间(毫秒时间戳) |
| lastTriggerTime |	integer($int64) title: Alarm trigger time (timestamp in milliseconds) 最近告警触发时间(毫秒时间戳) |
| nextEvalInterval |	integer($int64) title: Alarm evaluation interval (milliseconds) 告警评估时间间隔(单位毫秒) |
| tags	| example: {key1:value1} |
| gmtCreate |	string($date-time) title: Record the latest creation time (timestamp in milliseconds) 记录最新创建时间(毫秒时间戳) |
| gmtUpdate	|string($date-time) title: Record modify time(毫秒时间戳) |

### webhook通知常见问题   

1. WebHook回调未生效   
> 请查看告警中心是否已经产生此条告警信息   
> 请排查配置的WebHook回调地址是否正确

其它问题可以通过交流群ISSUE反馈哦！  
