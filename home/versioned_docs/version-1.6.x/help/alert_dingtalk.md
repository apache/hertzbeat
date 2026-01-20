---
id: alert_dingtalk  
title: Alert DingDing robot notification      
sidebar_label: Alert DingDing robot notification      
keywords: [open source monitoring tool, open source alerter, open source DingDing robot notification]
---

> After the threshold is triggered send alarm information and notify the recipient by DingDing robot.

### Operation steps

1. **【DingDing desktop client】-> 【Group settings】-> 【Intelligent group assistant】-> 【Add new robot-select custom】-> 【Set robot name and avatar】-> 【Note⚠️Set custom keywords: HertzBeat】 ->【Copy its webhook address after adding successfully】**

    > Note⚠️ When adding a robot, its custom keywords need to be set in the security setting block: HertzBeat. Other security settings or the IP segment don't need to be filled in.

    ![email](/img/docs/help/alert-notice-8.png)

2. **【Save access_token value of the WebHook address of the robot】**

    > eg： webHook address：`https://oapi.dingtalk.com/robot/send?access_token=43aac28a236e001285ed84e473f8eabee70f63c7a70287acb0e0f8b65fade64f`
    > Its robot access_token value is `43aac28a236e001285ed84e473f8eabee70f63c7a70287acb0e0f8b65fade64f`

3. **【Alarm notification】->【Add new recipient】 ->【Select DingDing robot notification method】->【Set DingDing robot ACCESS_TOKEN】-> 【Confirm】**

    ![email](/img/docs/help/alert-notice-9.png)

4. **Configure the associated alarm notification strategy⚠️ 【Add new notification strategy】-> 【Associate the recipient just set】-> 【Confirm】**

    > **Note⚠️ Adding a new recipient does not mean that it is effective to receive alarm information. It is also necessary to configure the associated alarm notification strategy, that is, to specify which messages are sent to which recipients.**

    ![email](/img/docs/help/alert-notice-4.png)

### DingDing robot common issues

1. DingDing group did not receive the robot alarm notification.

   > Please check whether there is any triggered alarm information in the alarm center.  
   > Please check whether DingDing robot is configured with security custom keywords ：HertzBeat.  
   > Please check whether the robot ACCESS_TOKEN is configured correctly and whether the alarm strategy association is configured.

Other issues can be fed back through the communication group ISSUE!
