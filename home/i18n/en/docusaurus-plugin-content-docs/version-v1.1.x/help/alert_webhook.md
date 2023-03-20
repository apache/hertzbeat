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
| id |	integer($int64) title: Alarm record entity primary key index ID  |
| target |	string title: Alert target object: monitor availability-available metrics-app.metrics.field  |
| alertDefineId	integer($int64) title: Alarm definition ID associated with the alarm  |
| priority |	string($byte) title: Alarm level 0: high-emergency-critical alarm-red 1: medium-critical-critical alarm-orange 2: low-warning-warning alarm-yellow  |
| content |	string title: The actual content of the alarm notification |
| status |	string($byte) title: Alarm status: 0-normal alarm (to be processed) 1-threshold triggered but not reached the number of alarms 2-recovered alarm 3-processed |
| times | integer($int32) title: Alarm threshold trigger times |
| firstTriggerTime |	integer($int64) title: Alarm trigger time (timestamp in milliseconds) |
| lastTriggerTime |	integer($int64) title: Alarm trigger time (timestamp in milliseconds) |
| nextEvalInterval |	integer($int64) title: Alarm evaluation interval (milliseconds) |
| tags	| example: {key1:value1} |
| gmtCreate |	string($date-time) title: Record the latest creation time (timestamp in milliseconds) |
| gmtUpdate	|   string($date-time) |



### Webhook notification common issues   

1. WebHook callback did not take effect  
> Please check whether there is any triggered alarm information in the alarm center.  
> Please check whether the configured webhook callback address is correct.

Other issues can be fed back through the communication group ISSUE!  
