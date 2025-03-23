Users can directly configure the HertzBeat service address in the Alertmanager configuration of the Prometheus Server to replace the Alertmanager for receiving and processing alerts from the Prometheus Server.

### Prometheus Service Configuration

- Edit the Prometheus configuration file `prometheus.yml` to add HertzBeat as the alert receiver configuration
```yaml
# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - {hertzbeat_host}:1157
      authorization:
        type: 'Bearer'
        credentials: '{token}'

```
- `{hertzbeat_host}:1157` is the address and port of the HertzBeat Server, modify according to the actual situation, and ensure network connectivity.
- `{token}` is the authorization Token for the HertzBeat Server, replace the value after applying for a new Token.

- Reload and start the Prometheus Server 

## Verify Configuration

1. Ensure the Prometheus configuration is correct and reload the configuration
    ```bash
    curl -X POST http://localhost:9090/-/reload
    ```
2. Check the status of Prometheus alert rules
    ```bash
    curl http://localhost:9090/api/v1/rules
    ```
3. Trigger a test alert and check in the HertzBeat alert center.

## Common Issues

- Ensure the HertzBeat URL is accessible from the Prometheus server.
- Check the Prometheus logs for any error messages regarding alert sending failures.
- Verify the correctness of the alert rule expressions.

For more information, please refer to the [Prometheus Alert Configuration Documentation](https://prometheus.io/docs/alerting/latest/configuration/)
