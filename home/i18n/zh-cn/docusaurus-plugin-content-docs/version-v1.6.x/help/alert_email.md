---
id: alert_email  
title: 告警邮件通知      
sidebar_label: 告警邮件通知   
keywords: [告警邮件通知, 开源告警系统, 开源监控告警系统]
---

> 阈值触发后发送告警信息，通过邮件通知到接收人。

### 操作步骤

1. **【告警通知】->【新增接收人】 ->【选择邮件通知方式】**

   ![email](/img/docs/help/alert-notice-1.png)

2. **【获取验证码】-> 【输入邮箱验证码】-> 【确定】**
   ![email](/img/docs/help/alert-notice-2.png)

   ![email](/img/docs/help/alert-notice-3.png)

3. **配置关联的告警通知策略⚠️ 【新增通知策略】-> 【将刚设置的接收人关联】-> 【确定】**

   > **注意⚠️ 新增了接收人并不代表已经生效可以接收告警信息，还需配置关联的告警通知策略，即指定哪些消息发给哪些接收人**。

   ![email](/img/docs/help/alert-notice-4.png)

### 邮件通知常见问题

1. 自己内网部署的HertzBeat无法接收到邮件通知

   > HertzBeat需要自己配置邮件服务器，TanCloud无需，请确认是否在application.yml配置了自己的邮件服务器

2. 云环境TanCloud无法接收到邮件通知

   > 请排查在告警中心是否已有触发的告警信息  
   > 请排查是否配置正确邮箱，是否已配置告警策略关联  
   > 请查询邮箱的垃圾箱里是否把告警邮件拦截

其它问题可以通过交流群ISSUE反馈哦！
