---
id: alert_discord  
title: 告警 Discord 机器人通知      
sidebar_label: 告警 Discord 机器人通知      
keywords: [告警 Discord 机器人通知, 开源告警系统, 开源监控告警系统]
---

> 阈值触发后发送告警信息，通过 Discord 机器人通知到接收人。

## 操作步骤

> 部署网络本身需支持科学上网，不支持设置代理

### 在 Discord 创建应用, 应用下创建机器人, 获取机器人 Token

1. 访问 [https://discord.com/developers/applications](https://discord.com/developers/applications) 创建应用

    ![bot](/img/docs/help/discord-bot-1.png)

2. 在应用下创建机器人，获取机器人 Token

    ![bot](/img/docs/help/discord-bot-2.png)

    ![bot](/img/docs/help/discord-bot-3.png)

3. 授权机器人到聊天服务器

    > 在 OAuth2 菜单下给此机器人授权，`SCOPES` 范围选 `bot`, `BOT PERMISSIONS` 选发送消息 `Send Messages`

    ![bot](/img/docs/help/discord-bot-4.png)

    > 获取到最下方生成的 URL, 浏览器访问此 URL 给机器人正式授权，即设置将机器人加入哪个聊天服务器。

4. 查看您的聊天服务器是否已经加入机器人成员

    ![bot](/img/docs/help/discord-bot-5.png)

### 开启开发者模式，获取频道 Channel ID

1. 个人设置 -> 高级设置 -> 开启开发者模式

    ![bot](/img/docs/help/discord-bot-6.png)

2. 获取频道 Channel ID

> 右键选中您想要发送机器人消息的聊天频道，点击 COPY ID 按钮获取 Channel ID

![bot](/img/docs/help/discord-bot-7.png)

### 在 HertzBeat 新增告警通知人，通知方式为 Discord Bot

1. **【告警通知】->【新增接收人】 ->【选择 Discord 机器人通知方式】->【设置机器人Token和ChannelId】-> 【确定】**

    ![email](/img/docs/help/discord-bot-8.png)

2. **配置关联的告警通知策略⚠️ 【新增通知策略】-> 【将刚设置的接收人关联】-> 【确定】**

    > **注意⚠️ 新增了接收人并不代表已经生效可以接收告警信息，还需配置关联的告警通知策略，即指定哪些消息发给哪些接收人**。

    ![email](/img/docs/help/alert-notice-policy.png)

### Discord 机器人通知常见问题

1. Discord 未收到机器人告警通知

> 请排查在告警中心是否已有触发的告警信息
> 请排查是否配置正确机器人Token, ChannelId，是否已配置告警策略关联
> 请排查机器人是否被 Discord聊天服务器正确赋权

其它问题可以通过交流群ISSUE反馈哦！
