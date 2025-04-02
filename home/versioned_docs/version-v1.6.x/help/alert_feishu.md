---
id: alert_feishu
title: Alert FeiShu robot notification      
sidebar_label: Alert FeiShu robot notification     
keywords: [open source monitoring tool, open source alerter, open source feishu bot notification]
---

> After the threshold is triggered send alarm information and notify the recipient by FeiShu robot.

### Operation steps

1. **【FeiShu client】-> 【Group settings】-> 【Bots】-> 【Add Bot】-> 【Custom  Bot】 -> 【Set robot name and avatar】-> 【Copy its webhook URL after adding successfully】**

2. **【Save the key value of the WebHook address of the robot】**

    > eg： webHook address：`https://open.feishu.cn/open-apis/bot/v2/hook/3adafc96-23d0-4cd5-8feb-17f6e0b5fcs4`
    > Its robot KEY value is `3adafc96-23d0-4cd5-8feb-17f6e0b5fcs4`

3. **【Alarm notification】->【Add new recipient】 ->【Select FeiShu robot notification method】->【Set FeiShu robot KEY】-> 【Confirm】**

4. **Configure the associated alarm notification strategy⚠️ 【Add new notification strategy】-> 【Associate the recipient just set】-> 【Confirm】**

    > **Note⚠️ Adding a new recipient does not mean that it is effective to receive alarm information. It is also necessary to configure the associated alarm notification strategy, that is, to specify which messages are sent to which recipients.**

    ![email](/img/docs/help/alert-notice-4.png)

### FeiShu robot notification common issues

1. FeiShu group did not receive the robot alarm notification.

    > Please check whether there is any triggered alarm information in the alarm center.  
    > Please check whether the robot key is configured correctly and whether the alarm strategy association is configured.

2. How to @someone in alarm notification

    > In the form for adding recipients, fill in the `User ID`. If you need to @everyone, you can enter `all` in the `User ID` field. Multiple user IDs are also supported, separated by commas `,`. For detailed instructions on how to get the Feishu user ID, please refer to: [Get feishu user id](https://open.feishu.cn/document/faq/trouble-shooting/how-to-get-internal-user-id).

Other issues can be fed back through the communication group ISSUE!
