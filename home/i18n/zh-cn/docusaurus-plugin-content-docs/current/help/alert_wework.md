---
id: alert_wework  
title: 告警企业微信通知      
sidebar_label: 告警企业微信通知     
keywords: [告警企业微信通知, 开源告警系统, 开源监控告警系统]
---

> 阈值触发后发送告警信息，通过企业微信机器人通知到接收人。

### 操作步骤

1. **【企业微信端】-> 【群设置】-> 【群机器人】-> 【添加新建机器人】-> 【设置机器人名称头像】-> 【添加成功后复制其WebHook地址】**

    ![email](/img/docs/help/alert-notice-6.jpg)

2. **【保存机器人的WebHook地址的KEY值】**

    > 例如： webHook地址：`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=3adafc96-23d0-4cd5-8feb-17f6e0b5fcs4`
    >
    > 其机器人KEY值为 `3adafc96-23d0-4cd5-8feb-17f6e0b5fcs4`

3. **【告警通知】->【新增接收人】 ->【选择企业微信机器人通知方式】->【设置企业微信机器人KEY】-> 【确定】**

    ![email](/img/docs/help/alert-notice-7.png)

4. **配置关联的告警通知策略⚠️ 【新增通知策略】-> 【将刚设置的接收人关联】-> 【确定】**

    > **注意⚠️ 新增了接收人并不代表已经生效可以接收告警信息，还需配置关联的告警通知策略，即指定哪些消息发给哪些接收人**。

    ![email](/img/docs/help/alert-notice-4.png)

### 企业微信机器人通知常见问题

1. 企业微信群未收到机器人告警通知

> 请排查在告警中心是否已有触发的告警信息  
> 请排查是否配置正确机器人KEY，是否已配置告警策略关联

其它问题可以通过交流群ISSUE反馈哦！
