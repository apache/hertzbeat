---
id: alert_discord
title: Alert Discord Bot Notifications
sidebar_label: Alert Discord bot notification
keywords: [open source monitoring tool, open source alerter, open source Discord bot notification]
---

> Send an alarm message after the threshold is triggered, and notify the recipient through the Discord robot.

## Steps

### Create an application in Discord, create a robot under the application, and get the robot Token

1. Visit [https://discord.com/developers/applications](https://discord.com/developers/applications) to create an application

    ![bot](/img/docs/help/discord-bot-1.png)

2. Create a robot under the application and get the robot Token

    ![bot](/img/docs/help/discord-bot-2.png)

    ![bot](/img/docs/help/discord-bot-3.png)

3. Authorize the bot to the chat server

    > Authorize the robot under the OAuth2 menu, select `bot` for `SCOPES`, `BOT PERMISSIONS` select `Send Messages`

    ![bot](/img/docs/help/discord-bot-4.png)

    > Obtain the URL generated at the bottom, and the browser accesses this URL to officially authorize the robot, that is, to set which chat server the robot will join.

4. Check if your chat server has joined robot members

    ![bot](/img/docs/help/discord-bot-5.png)

### Enable developer mode and get Channel ID

1. Personal Settings -> Advanced Settings -> Enable Developer Mode

    ![bot](/img/docs/help/discord-bot-6.png)

2. Get channel Channel ID

    > Right-click the chat channel you want to send the robot message to, click the COPY ID button to get the Channel ID

    ![bot](/img/docs/help/discord-bot-7.png)

### Add an alarm notification person in HertzBeat, the notification method is Discord Bot

1. **[Alarm notification] -> [Add recipient] -> [Select Discord robot notification method] -> [Set robot Token and ChannelId] -> [OK]**

    ![email](/img/docs/help/discord-bot-8.png)

2. **Configure the associated alarm notification strategy⚠️ [Add notification strategy] -> [Associate the recipient just set] -> [OK]**

    > **Note ⚠️ Adding a new recipient does not mean that it has taken effect and can receive alarm information. It is also necessary to configure the associated alarm notification strategy, that is, specify which messages are sent to which recipients**.

    ![email](/img/docs/help/alert-notice-policy.png)

### Discord Bot Notification FAQ

1. Discord doesn't receive bot alert notifications

   > Please check whether the alarm information has been triggered in the alarm center  
   > Please check whether the robot Token and ChannelId are configured correctly, and whether the alarm policy association has been configured  
   > Please check whether the bot is properly authorized by the Discord chat server  

Other questions can be fed back through the communication group ISSUE!
