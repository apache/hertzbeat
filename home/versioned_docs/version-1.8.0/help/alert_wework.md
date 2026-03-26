---
id: alert_wework  
title: Alert enterprise Wechat notification      
sidebar_label: Alert enterprise Wechat notification     
keywords: [open source monitoring tool, open source alerter, open source WeWork notification]
---

> After the threshold is triggered send alarm information and notify the recipient by enterprise Wechat robot.

### Operation steps

1. **【Enterprise Wechat】-> 【Group settings】-> 【Group robot】-> 【Add new robot】-> 【Set robot name and avatar】-> 【Copy its webhook address after adding successfully】**

    ![email](/img/docs/help/alert-notice-6.jpg)

2. **【Save the key value of the WebHook address of the robot】**

    > eg： webHook address：`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=3adafc96-23d0-4cd5-8feb-17f6e0b5fcs4`
    > Its robot KEY value is `3adafc96-23d0-4cd5-8feb-17f6e0b5fcs4`

3. **【Alarm notification】->【Add new recipient】 ->【Select enterprise Wechat robot notification method】->【Set enterprise Wechat robot KEY】-> 【Confirm】**

    ![email](/img/docs/help/alert-notice-7.png)

4. **Configure the associated alarm notification strategy⚠️ 【Add new notification strategy】-> 【Associate the recipient just set】-> 【Confirm】**

    > **Note⚠️ Adding a new recipient does not mean that it is effective to receive alarm information. It is also necessary to configure the associated alarm notification strategy, that is, to specify which messages are sent to which recipients.**

![email](/img/docs/help/alert-notice-4.png)

### Enterprise Wechat robot common issues

1. The enterprise wechat group did not receive the robot alarm notification.

    > Please check whether there is any triggered alarm information in the alarm center.  
    > Please check whether the robot key is configured correctly and whether the alarm strategy association is configured.

Other issues can be fed back through the communication group ISSUE!
