>Send Tencent Cloud alerts to the HertzBeat alert platform via Webhook.

### Configure Tencent Cloud Alert Callback

#### Configure Notification Template
1. Log in to [Tencent Cloud Observability Platform](https://console.cloud.tencent.com/monitorv2)
2. Navigate to **Alarm Management** > **Alarm Configuration** > **Notification Templates**
3. Click **Create Notification Template**
4. On the new notification template page, fill in the basic information
5. In the **API Callback** module, enter the HertzBeat Webhook API URL:
   ```
   http://{your_system_host}/api/alerts/report/tencent
   ```
6. Save the notification template

#### Bind Alert Policy
1. Go to **Alert Policy List**
2. Select the alert policy that needs to be bound with the Webhook callback, click the policy name to enter the management page
3. In the notification template configuration, bind the notification template created in the previous step
4. Save the policy configuration

### Common Issues

#### Not Receiving Alerts
- Ensure the Webhook URL is accessible from the public network
- Check if there are request records in the server logs
- Test if the Webhook is available on the Tencent Cloud notification template page

#### Alerts Not Triggered
- Ensure the alert policy conditions are correct and the notification template is bound
- Check the alert history on the Tencent Cloud monitoring page to confirm if the policy was triggered

For more information, please refer to [Tencent Cloud Alert Configuration Documentation](https://cloud.tencent.com/document/product/248/50409)

