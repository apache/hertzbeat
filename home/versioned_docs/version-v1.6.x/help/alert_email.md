---
id: alert_email  
title: Alert email notification       
sidebar_label: Alert email notification   
keywords: [open source monitoring tool, open source alerter, open source email notification]
---

> After the threshold is triggered send alarm information and notify the recipient by email.

### Operation steps

1. **【Alarm notification】->【Add new recipient】 ->【Select email notification method】**

   ![email](/img/docs/help/alert-notice-1.png)

2. **【Get verification code】-> 【Enter email verification code】-> 【Confirm】**
   ![email](/img/docs/help/alert-notice-2.png)

   ![email](/img/docs/help/alert-notice-3.png)

3. **Configure the associated alarm notification strategy⚠️ 【Add new notification strategy】-> 【Associate the recipient just set】-> 【Confirm】**

   > **Note⚠️ Adding a new recipient does not mean that it is effective to receive alarm information. It is also necessary to configure the associated alarm notification strategy, that is, to specify which messages are sent to which recipients.**

   ![email](/img/docs/help/alert-notice-4.png)

### Email notification common issues

1. Hertzbeat deployed on its own intranet cannot receive email notifications

   > Hertzbeat needs to configure its own mail server. Please confirm whether you have configured its own mail server in application.yml

Other issues can be fed back through the communication group ISSUE!
