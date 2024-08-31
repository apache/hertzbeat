---
id: alert_smn
title: Alert Huawei Cloud SMN Notifications
sidebar_label: Alert Huawei Cloud SMN Notifications
keywords: [ open source monitoring tool, open source alerter, open source Huawei Cloud SMN notification ]
---

> Send an alarm message after the threshold is triggered, and notify the recipient through the Huawei Cloud SMN.

### 操作步骤

1. **According to [Huawei Cloud SMN Official Document](https://support.huaweicloud.com/qs-smn/smn_json.html) activate the SMN service and configure SMN**

    ![alert-notice-10](/img/docs/help/alert-notice-10.png)

2. **Save topic URN for SMN**

    ![alert-notice-11](/img/docs/help/alert-notice-11.png)

3. **According to [Huawei Cloud Signature Document](https://support.huaweicloud.com/devg-apisign/api-sign-provide.html) obtain AK, SK, and project ID**

    ![alert-notice-12](/img/docs/help/alert-notice-12.png)

    ![alert-notice-13](/img/docs/help/alert-notice-13.png)

4. **【Alarm Notification】->【Add Recipient】->【Select Slack Webhook Notification Method】->【Set Huawei Cloud SMN AK, SK and other configurations】-> 【OK】**

    ![alert-notice-14](/img/docs/help/alert-notice-14.png)

5. **Configure the associated alarm notification strategy⚠️ [Add notification strategy] -> [Associate the recipient just set] -> [OK]**

    > **Note ⚠️ Adding a new recipient does not mean that it has taken effect and can receive alarm information. It is also necessary to configure the associated alarm notification strategy, that is, specify which messages are sent to which recipients**.

    ![email](/img/docs/help/alert-notice-4.png)

### Huawei Cloud SMN Notification FAQ

1. Huawei Cloud SMN did not receive the robot warning notification

    > Please check whether the alarm information has been triggered in the alarm center  
    > Please check whether the Huawei Cloud SMN AK, SK and other configurations are configured correctly, and whether the alarm policy association has been configured

Other questions can be fed back through the communication group ISSUE!
