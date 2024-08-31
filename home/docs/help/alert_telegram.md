---
id: alert_telegram
title: Alert Telegram Bot Notification
sidebar_label: Alert Telegram bot notification
keywords: [open source monitoring tool, open source alerter, open source Telegram bot notification]
---

> Send an alarm message after the threshold is triggered, and notify the recipient through the Telegram robot.

## Steps

### Create a bot in Telegram, get Bot Token and UserId

1. Use [@BotFather](https://t.me/BotFather) to create your own bot and get an access token `Token`

    ![telegram-bot](/img/docs/help/telegram-bot-1.png)

2. Get the `User ID` of the recipient

    **Use the recipient account you want to notify to send a message to the newly created Bot account**,
    Visit ```https://api.telegram.org/bot<TOKEN>/getUpdates```, **`use the Bot Token from the previous step to replace the <TOKEN>`**, and respond to the first in the `Json` data A `result.message.from.id` value is the recipient's `User ID`

    ```json
    {
         "ok": true,
         "result": [
             {
                 "update_id": 632299191,
                 "message": {
                     "from":{
                         "id": "User ID"
                     },
                     "chat":{
                     },
                     "date": 1673858065,
                     "text": "111"
                 }
             }
         ]
    }
    ```

3. Record and save the `Token` and `User Id` we got

### Add an alarm notification person to HertzBeat, the notification method is Telegram Bot

1. **【Alarm Notification】->【Add Recipient】->【Select Telegram Robot Notification Method】->【Set Robot Token and UserId】-> 【OK】**

    ![email](/img/docs/help/telegram-bot-2.png)

2. **Configure the associated alarm notification strategy⚠️ [Add notification strategy] -> [Associate the recipient just set] -> [OK]**

    > **Note ⚠️ Adding a new recipient does not mean that it has taken effect and can receive alarm information. It is also necessary to configure the associated alarm notification strategy, that is, specify which messages are sent to which recipients**.

    ![email](/img/docs/help/alert-notice-policy.png)

### Telegram Bot Notification FAQ

1. Telegram did not receive the robot warning notification

    > Please check whether the alarm information has been triggered in the alarm center  
    > Please check whether the robot Token and UserId are configured correctly, and whether the alarm policy association has been configured  
    > UserId should be the UserId of the recipient of the message  

Other questions can be fed back through the communication group ISSUE!
