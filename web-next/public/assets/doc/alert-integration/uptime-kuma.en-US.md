> send Uptime-Kuma alarms to the HertzBeat alerting platform via webhooks.

### Configure the Uptime Kuma alarm callback

#### Go to the notification configuration

1. Log in to the Uptime Kuma web management interface
2. Go to **Settings** > **Notifications** > **Set Notifications**
3. Select the Webhook notification type
4. In the Post URL, fill in the Webhook Interface URL provided by HertzBeat:
   ```
   http://{your_system_host}/api/alerts/report/uptime-kuma
   ```
5. In the request body, select Preset-application/json, and configure the rest as needed
6. Save the settings notification

### Frequently Asked Questions

#### No alerts received

- Make sure that the webhook URL can be accessed by the uptime kuma service
- Check whether the server logs contain request records

#### The alarm is not triggered

- Make sure that the conditions of the alert policy are correct and that notifications are bound

For more information, please refer to [Uptime Kuma Wiki](https://github.com/louislam/uptime-kuma/wiki)
