>Send Huawei Cloud `Cloud Eye` alerts to the HertzBeat alert platform via Webhook.

### Step 1: Configure Notification Template in `Cloud Eye` Console
1. Log in to Huawei Cloud `Cloud Eye` Console
2. Select **Alarm Management** > **Alarm Notifications** > **Notification Templates** > **Create**
3. Protocol: Set to HTTP/HTTPS, Notification Type: Choose as needed, Format: JSON
4. Ensure the following JSON preview is correct:
```json
{
  "version": "v1",
  "data": {
    "AccountName": "RDS_test",
    "Namespace": "Elastic Cloud Server",
    "DimensionName": "Cloud Server",
    "ResourceName": "ecs-test",
    "MetricName": "CPU Usage",
    "IsAlarm": true,
    "AlarmLevel": "Important",
    "Region": "North China-Ulanqab-203",
    "RegionId": "cn-north-4",
    "ResourceId": "xxxx-xxxx",
    "PrivateIp": "127.0.0.0",
    "PublicIp": "100.0.0.0",
    "CurrentData": "1.06%",
    "AlarmTime": "2024/08/0514:45:16GMT+08:00",
    "AlarmRecordID": "ah1722xxxxxx",
    "AlarmRuleName": "test-xxx",
    "IsOriginalValue": true,
    "Filter": "Original Value",
    "ComparisonOperator": "u003e=",
    "Value": "0%",
    "Unit": "%",
    "Count": 1,
    "EpName": "default"
  }
}
```

### Step 2: Configure Notification Recipients in `Cloud Eye` Console
1. Log in to Huawei Cloud `Cloud Eye` Console
2. Select **Alarm Management** > **Alarm Notifications** > **Recipients** > **Create**
3. Select Channel: HTTP or HTTPS
4. Add HertzBeat as the alert receiver configuration
   - Request URL: `http://{hertzbeat_host}:1157/api/alerts/report/huaweicloud-ces`

### Step 3: Configure Notification Groups in `Cloud Eye` Console
1. Log in to Huawei Cloud `Cloud Eye` Console
2. Select **Alarm Management** > **Alarm Notifications** > **Notification Groups** > **Create**
3. Select Recipients: The **Recipients** set in Step 2
   - You can also add the **NoRecipients** to existing notification groups

### Step 4: Configure Notification Policies in `Cloud Eye` Console
1. Log in to Huawei Cloud `Cloud Eye` Console
2. Select **Alarm Management** > **Alarm Notifications** > **Notification Policies** > **Create**
3. Select **Notification Scope** > **Recipients** > **Notification Group** > Choose the **Notification Group** set in Step 3
4. Select **Notification Templates** > **Templates for Metric Monitoring** and **Templates for Event Monitoring** -> Choose the **Notification Recipients** set in Step 1
5. Configure other settings as needed

### Common Issues

#### Alerts Not Triggering
- Ensure the Webhook URL is accessible by Huawei Cloud Monitor Service (CES) notifications
- Verify the correctness of **Notification Policies**, **Notification Groups**, **Recipients**, and **Notification Templates** settings
- Verify the correctness/enablement of **Alarm Management** > **Alarm Rules**, check **Alarm Records** for triggered alarms
- Note: After adding a created **Recipients** to a **Notification Groups**, the **Simple Message Notification (SMN)** will send a subscription confirmation message to the subscription endpoint, which must be confirmed before receiving alarm notifications.
  - After creating a notification group, a topic will be automatically created in **Simple Message Notification (SMN)** > **Topic Management** > **Topics**, and a subscription will be created in **Simple Message Notification (SMN)** > **Topic Management** > **Subscriptions**. HertzBeat has added automatic subscription functionality. If the status is not (Confirmed), please manually request the subscription
- Note: If multiple **Recipientss** are created with different names but the same notification channel object, you will only receive one subscription confirmation message.

#### Other Notes
- HertzBeat has added automatic subscription functionality after being added to a **Notification Groups**.
- For security purposes, HertzBeat supports **Message Signature Verification** to verify the legitimacy of messages through signature strings.

#### For More Information, Please Refer to
- [Alarm Management](https://support.huaweicloud.com/intl/en-us/usermanual-ces/ces_01_0067.html)
- [Message Signature Verification](https://support.huaweicloud.com/intl/en-us/usermanual-smn/smn_ug_a9003.html)
- [Requesting Subscription Confirmation](https://support.huaweicloud.com/intl/en-us/usermanual-smn/smn_ug_0009.html)
- [HTTP or HTTPS Message Format](https://support.huaweicloud.com/intl/en-us/usermanual-smn/smn_ug_a9002.html)
