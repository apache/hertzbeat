---
id: alert_enterprise_wechat_app  
title: Alert Enterprise Wechat App notification      
sidebar_label: Alert Enterprise Wechat App notification      
keywords: [open source monitoring tool, open source alerter, open source Enterprise Wechat App notification]
---

> After the threshold is triggered send alarm information and notify the recipient by enterprise WeChat App.

### Operation steps

1. **【Enterprise Wechat backstage】-> 【App Management】-> 【Create an app】-> 【Set App message】->【Copy AgentId and Secret adding successfully】**

    ![email](/img/docs/help/alert-wechat-1.jpg)

2. **【Alarm notification】->【Add new recipient】 ->【Select Enterprise WeChat App notification method】->【Set Enterprise WeChat ID,Enterprise App ID and Enterprise App Secret 】-> 【Confirm】**

    ![email](/img/docs/help/alert-wechat-2.jpg)

3. **Configure the associated alarm notification strategy⚠️ 【Add new notification strategy】-> 【Associate the recipient just set】-> 【Confirm】**

    > **Note⚠️ Adding a new recipient does not mean that it is effective to receive alarm information. It is also necessary to configure the associated alarm notification strategy, that is, to specify which messages are sent to which recipients.**

    ![email](/img/docs/help/alert-wechat-3.jpg)

### Enterprise WeChat App common issues

1. Enterprise WeChat App did not receive the alarm notification.

   > Please check if the user has application permissions.  
   > Please check if the enterprise application callback address settings are normal.  
   > Please check if the server IP is on the enterprise application whitelist.

Other issues can be fed back through the communication group ISSUE!
