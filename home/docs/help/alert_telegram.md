---
id: alert_telegram  
title: 告警Telegram机器人通知      
sidebar_label: 告警Telegram机器人通知      
---

> 阈值触发后发送告警信息，通过 Telegram 机器人通知到接收人。      

### 操作步骤   

#### 在 Telegram 创建机器人, 获取 Bot Token 和 UserId

1. 使用 [@BotFather](https://t.me/BotFather) 创建自己的机器人并获取访问令牌`Token`   

![telegram-bot](/img/docs/help/telegram-bot-1.png)

2. 获取 `User ID`   

**给刚创建 Bot 随便发送一个信息**        
访问 ```https://api.telegram.org/bot<TOKEN>/getUpdates```, 响应`Json`数据中`result.message.from.id` 值即为 `User ID`    

```json
{
    "ok":true,
    "result":[
        {
            "update_id":632299191,
            "message":{
                "from":{
                    "id": "User ID"
                },
                "chat":{
                },
                "date":1673858065,
                "text":"111"
            }
        }
    ]
}
```

3. 记录保存我们获得的 `Token` 和 `User Id`   

#### 在 HertzBeat 新增告警通知人，通知方式为 Telegram Bot   

1. **【告警通知】->【新增接收人】 ->【选择 Telegram 机器人通知方式】->【设置机器人Token和UserId】-> 【确定】**

![email](/img/docs/help/telegram-bot-2.png)

4. **配置关联的告警通知策略⚠️ 【新增通知策略】-> 【将刚设置的接收人关联】-> 【确定】**  

> **注意⚠️ 新增了接收人并不代表已经生效可以接收告警信息，还需配置关联的告警通知策略，即指定哪些消息发给哪些接收人**。   

![email](/img/docs/help/telegram-bot-3.png)    


### Telegram 机器人通知常见问题   

1. Telegram 未收到机器人告警通知  

> 请排查在告警中心是否已有触发的告警信息   
> 请排查是否配置正确机器人Token, UserId，是否已配置告警策略关联   

其它问题可以通过交流群ISSUE反馈哦！  
