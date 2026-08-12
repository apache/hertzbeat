> Send Alibaba Cloud Monitor 2.0 alerts to the HertzBeat alert platform through a webhook.

### Prepare a HertzBeat API token

1. Click **Manage API Tokens** in the upper-right corner of this page.
2. Create a token and save it securely. The complete token is displayed only once.

### Create an Alibaba Cloud Monitor webhook

1. Log on to the [Alibaba Cloud Monitor 2.0 console](https://cmsnext.console.aliyun.com/).
2. Select or create the target workspace, then go to **Alert Center** > **Notification Management** > **Notification Objects**.
3. Open the **Custom Webhook** tab and click **Create Webhook**.
4. Configure the webhook:
   - Name: `HertzBeat`
   - Identifier: for example, `hertzbeat`
   - URL:

     ```text
     http://{hertzbeat_host}:1157/api/alerts/report/alibabacloud-cms
     ```

   - Headers: add `Authorization` with the value `Bearer {token}`
   - Method: `POST`
   - Data format: `JSON`
   - Language: select as needed
5. Save the webhook.

> Use the notification objects in an Alibaba Cloud Monitor 2.0 workspace. Notification objects in Prometheus Monitoring or ARMS Alert Management use a different webhook format and are not supported by this integration.

> `{hertzbeat_host}` must be publicly reachable from Alibaba Cloud Monitor. Expose this endpoint through an HTTPS reverse proxy in production.

### Bind an alert rule

1. Go to **Alert Center** > **Alert Management** > **Alert Rules**.
2. Create or edit an alert rule.
3. Select the HertzBeat custom webhook in the alert notification settings.
4. Enable recovery notifications if alerts should be resolved automatically in HertzBeat.
5. Save and enable the alert rule.

### Field mapping

| Alibaba Cloud Monitor field | HertzBeat field |
| --- | --- |
| `status: OCCURRED/PERSISTENT` | `status: firing` |
| `status: RESOLVED/RECOVERED` | `status: resolved` |
| `subject` | `labels.alertname` |
| `severity` | `labels.severity` |
| `alertMessage` | Alert content |
| `labels`, `resource.tags` | Alert labels |
| `annotations`, threshold, and resource properties | Alert annotations |
| `timestamp` or `time` | Alert time |

### Troubleshooting

#### The webhook returns 401 or 403

- Make sure the HertzBeat API token is active.
- Make sure the header is named `Authorization` and its value starts with `Bearer `.

#### HertzBeat does not receive an alert

- Make sure the webhook URL and port are publicly reachable.
- Make sure the data format is `JSON` and the request method is `POST`.
- Check Alibaba Cloud Monitor alert history and the HertzBeat service logs.
- If source IP allowlisting is enabled, use the latest CIDR list in the Alibaba Cloud documentation.

#### An alert is not resolved automatically

- Make sure recovery notifications are enabled in the alert rule or notification policy.
- Make sure the recovery webhook contains a `status` of `RESOLVED` or `RECOVERED`.

For more information:

- [Alibaba Cloud Monitor notification objects and webhook fields](https://help.aliyun.com/en/cms/cloudmonitor-2-0/notification-object)
- [Alibaba Cloud Monitor alert rules](https://help.aliyun.com/en/cms/cloudmonitor-2-0/alert-rules-cms-2-0)
