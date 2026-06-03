>Send Alibaba Cloud Simple Log Service(SLS) alerts to the HertzBeat alert platform via Webhook.

### Step 1: Setup Webhook Integration in SLS
1. Login to AliCloud SLS Console > Project List
2. Select **Alerts** > **Notification objects** > **Webhook integration**
3. Adding HertzBeat as an Alert Receiver Configuration
- Type: Universal Webhook
- Request Method: POST
- Request URL: http://{hertzbeat_host}:1157/api/alerts/report/alibabacloud-sls

### Step 2: Setting up Notification Policies in SLS
1. Login to AliCloud SLS Console > Project List
2. Select **Alerts** > **Notification Management** > **Alert Template**
3. Add or modify **Alert Template** > **Webhook-Custom**
- Add the following content templates, or leave them blank to use them as default content templates as well
```
{
    "aliuid": {{ alert.aliuid | quote }},
    "alert_instance_id": {{ alert.alert_instance_id | quote }},
    "alert_id": {{ alert.alert_id | quote }},
    "alert_name": {{ alert.alert_name | quote }},
    "region": {{ alert.region | quote }},
    "project": {{ alert.project | quote }},
    "alert_time": {{ alert.alert_time }},
    "fire_time": {{ alert.fire_time }},
    "resolve_time": {{ alert.resolve_time }},
    "status": {{ alert.status | quote }},
    "results": {{ alert.results | to_json }},
    "fire_results": {{ alert.fire_results | to_json }},
    "fire_results_count": {{ alert.fire_results_count }},
    "labels": {{ alert.labels | to_json }},
    "annotations": {{ alert.annotations | to_json }},
    "severity": {{ alert.severity }},
    "fingerprint": {{ alert.fingerprint | quote }}
}
```

### Step 3: Setting up an Action Policy in SLS
1. Login to AliCloud SLS Console > Project List
2. Select **Alerts** > **Notification Management** > **Action Policy**
3. If you are adding a **Universal Webhook**, you can skip this step and just focus on **Selecting a Webhook**, **Alert Template** Keeping it the same as step 2
4. If you are adding **Webhook-Custom**, you need to add HertzBeat as the alert receiver configuration.
- Request Method: POST
- Request URL: http://{hertzbeat_host}:1157/api/alerts/report/alibabacloud-sls
- Alert Template: Template for Step 2 Setup

### Other configurations

#### View alert details in logon-free mode
The log service provides a no-login feature, allowing you to view alarm details and manage alarm rules and alarm incidents without logging into the console after receiving an alarm notification.
1. Add the following configuration in **Alert Template** > **Webhook-Custom** > **Content**
```
"signin_url": {{ alert.signin_url }}
```


### Common Issues

#### The alarm is not triggered
- Ensure correctness of **Notification Objects**、**Notification Management** settings
- Ensure that the Webhook URL is accessible for SLS notifications
- Ensure that the conditions of the alert policy are correct by checking the **Alert Overview** or **Alert History Statistics** for triggered alerts.

#### For more information

- [default-alert-templates](https://www.alibabacloud.com/help/en/sls/user-guide/default-alert-templates)
- [sls-alerting](https://www.alibabacloud.com/help/en/sls/user-guide/sls-alerting/?spm=a2c63.p38356.help-menu-28958.d_2_8.56f869daRhPz8f&scm=20140722.H_207608._.OR_help-T_intl~en-V_1)
- [View alert details in logon-free mode](https://www.alibabacloud.com/help/en/sls/user-guide/view-alert-details-in-logon-free-mode#task-2139631)
