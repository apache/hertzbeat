> Send Volcano Engine Cloud Monitor alerts to the HertzBeat alert platform via Webhook.

### Configure Volcano Engine Alert Callback

1. Log in to the Volcano Engine Cloud Monitor [Callback Address Management page](https://console.volcengine.com/cloud-monitor/notice/webhook)
2. Click **Create Callback Address**
3. On the creation page:
   - Select `General Address Callback` as the Callback Type
   - Enter HertzBeat's Webhook URL in the Callback Address field:
     ```
     http://{your_system_host}/api/alerts/report/volcengine
     ```

### Bind Alert Policy

1. Log in to the Volcano Engine Cloud Monitor [Alert Policy Configuration page](https://console.volcengine.com/cloud-monitor/alert/strategy)
2. Create a new policy or edit an existing one. In the notification settings:

   - Set Notification Method to **Manual Notification**
   - Check **Alert Callback** under Notification Channel
   - Select the callback address created earlier

3. Save the alert policy

### Common Issues

#### No Alerts Received

- Ensure the Webhook URL is publicly accessible
- Check server logs for incoming requests
- Test Webhook connectivity via the Callback Address page

#### Alerts Not Triggering

- Verify policy conditions and correct callback address binding
- Confirm the alert policy is **Enabled**
- Check Alert History in Volcano Engine console for trigger events

For more details, refer to the [Volcano Engine Alert Configuration Documentation](https://www.volcengine.com/docs/6408/68122)
