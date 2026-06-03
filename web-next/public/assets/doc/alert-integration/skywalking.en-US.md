>Send SkyWalking Alerts to HertzBeat Alert Platform via Webhook.

### SkyWalking Service Configuration

- Edit the SkyWalking configuration file `alarm-settings.yml` to add HertzBeat as the alert receiver configuration
```yaml
hooks:
  webhook:
    default:
      is-default: true
      urls:
        - http://{hertzbeat_host}:1157/api/alerts/report/skywalking
```
- `http://{hertzbeat_host}:1157/api/alerts/report/skywalking` is the Webhook API endpoint provided by HertzBeat
- Reload and restart the SkyWalking OAP Server

### Verify Configuration

1. Ensure the SkyWalking alarm configuration is correct and reload the configuration
2. Check the status of SkyWalking alert rules
3. Trigger a test alert and check in the HertzBeat alert center

### Common Issues

- Ensure the HertzBeat URL is accessible from the SkyWalking OAP server
- Check the SkyWalking logs for any error messages regarding alert sending failures
- Verify the correctness of the alert rule expressions

For more information, please refer to the [ SkyWalking Alarm Configuration Documentation](https://skywalking.apache.org/docs/main/latest/en/setup/backend/backend-alarm/)
