---
id: alert_webhook
title: Alert WebHook callback notification     
sidebar_label: Alert webHook notification   
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
    "monitorId":5739609486000128,
    "monitorName":"API_poetry.apiopen.top",
    "priority":0,
    "content":"Monitor emergency availability alarm: UN_CONNECTABLE",
    "status":0,
    "times":1,
    "tenantId":10000,
    "gmtCreate":"2022-02-25T13:32:13",
    "gmtUpdate":"2022-02-25T13:32:13"
}
```


### Webhook notification common issues   

1. WebHook callback did not take effect  
> Please check whether there is any triggered alarm information in the alarm center.  
> Please check whether the configured webhook callback address is correct.

Other issues can be fed back through the communication group ISSUE!  
