---
id: alert_dingtalk  
title: 告警钉钉机器人通知      
sidebar_label: 告警钉钉机器人通知      
keywords: [告警钉钉机器人通知, 开源告警系统, 开源监控告警系统]
---

> 阈值触发后发送告警信息，通过钉钉机器人通知到接收人。

### 操作步骤

1. **【钉钉桌面客户端】-> 【群设置】-> 【智能群助手】-> 【添加新建机器人-选自定义】-> 【设置机器人名称头像】-> 【注意⚠️设置自定义关键字: HertzBeat】 ->【添加成功后复制其WebHook地址】**

    > 注意⚠️ 新增机器人时需在安全设置块需设置其自定义关键字: HertzBeat ，其它安全设置加签或IP段不填写

    ![email](/img/docs/help/alert-notice-8.png)

2. **【保存机器人的WebHook地址access_token值】**

    > 例如： webHook地址：`https://oapi.dingtalk.com/robot/send?access_token=43aac28a236e001285ed84e473f8eabee70f63c7a70287acb0e0f8b65fade64f`
    > 其机器人access_token值为 `43aac28a236e001285ed84e473f8eabee70f63c7a70287acb0e0f8b65fade64f`

3. **【告警通知】->【新增接收人】 ->【选择钉钉机器人通知方式】->【设置钉钉机器人ACCESS_TOKEN】-> 【确定】**

    ![email](/img/docs/help/alert-notice-9.png)

4. **配置关联的告警通知策略⚠️ 【新增通知策略】-> 【将刚设置的接收人关联】-> 【确定】**

    > **注意⚠️ 新增了接收人并不代表已经生效可以接收告警信息，还需配置关联的告警通知策略，即指定哪些消息发给哪些接收人**。

    ![email](/img/docs/help/alert-notice-4.png)

### 钉钉机器人通知常见问题

1. 钉钉群未收到机器人告警通知

> 请排查在告警中心是否已有触发的告警信息  
> 请排查钉钉机器人是否配置了安全自定义关键字：HertzBeat  
> 请排查是否配置正确机器人ACCESS_TOKEN，是否已配置告警策略关联

其它问题可以通过交流群ISSUE反馈哦！
