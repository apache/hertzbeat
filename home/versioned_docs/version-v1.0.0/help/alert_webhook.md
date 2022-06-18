---
id: alert_webhook
title: 告警WebHook回调通知      
sidebar_label: 告警WebHook通知   
---

> 阈值触发后发送告警信息，通过post请求方式调用WebHook接口通知到接收人。          

### 操作步骤   

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
    "monitorId":5739609486000128,
    "monitorName":"API_poetry.apiopen.top",
    "priority":0,
    "content":"监控紧急可用性告警: UN_CONNECTABLE",
    "status":0,
    "times":1,
    "tenantId":10000,
    "gmtCreate":"2022-02-25T13:32:13",
    "gmtUpdate":"2022-02-25T13:32:13"
}
```


### webhook通知常见问题   

1. WebHook回调未生效   
> 请查看告警中心是否已经产生此条告警信息   
> 请排查配置的WebHook回调地址是否正确

其它问题可以通过交流群ISSUE反馈哦！  
