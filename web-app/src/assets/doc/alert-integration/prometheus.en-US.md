# Prometheus Alert Integration

HertzBeat is fully compatible with Prometheus alert data format. You can configure Prometheus alerting rules to send alerts to HertzBeat.

## Prometheus Alert Configuration

> Since Prometheus Server itself doesn't support sending alerts via HTTP API, external scripts or Alertmanager are needed to implement alert sending.  
> If using Alertmanager, please refer to the **Alertmanager Integration Documentation**. Here we provide the alert configuration method for Prometheus Server without deploying Alertmanager.

### Prometheus Alert Configuration

1. Edit Prometheus configuration file `prometheus.yml`, add alert rules configuration
    ```yaml
    rule_files:
      - "rules/*.rules.yml"
    ```
    > `rules/*.rules.yml` is the path to alert rule files, which can be modified according to actual situations
> 2. Create alert rules folder `rules` and create alert rule files `rules/*.rules.yml`
> 3. Edit alert rule files, add alert rule configurations
> 4. Reload Prometheus configuration

### Write Scripts to Send Alerts Automatically

> Since Prometheus Server itself doesn't support sending alerts via HTTP API, we'll use Python scripts to implement alert sending.

1. Install Python requests library
    ```bash
    pip install requests
    ```
2. Write Python script `send_alerts.py`
```python
import requests

PROMETHEUS_URL = "http://<prometheus-host>:9090/api/v1/alerts"
WEBHOOK_URL = "http://<hertzbeat-host>:1157/api/alerts/report/prometheus"

def get_prometheus_alerts():
    response = requests.get(PROMETHEUS_URL)
    alerts = response.json()["data"]["alerts"]
    return alerts

def send_to_webhook(alert):
    requests.post(WEBHOOK_URL, json=alert)

if __name__ == "__main__":
    alerts = get_prometheus_alerts()
    for alert in alerts:
        send_to_webhook(alert)
        
```
3. Run Python script
    ```bash
    python send_alerts.py
    ```
    > This script will fetch alert data from Prometheus Server and push it to HertzBeat alert platform via Webhook.

## Verify Configuration

1. Ensure Prometheus configuration is correct and reload configuration
    ```bash
    curl -X POST http://localhost:9090/-/reload
    ```
2. Check Prometheus alert rules status
    ```bash
    curl http://localhost:9090/api/v1/rules
    ```
3. Trigger test alerts and check in HertzBeat alert center

## Common Issues

- Ensure HertzBeat URL is accessible from Prometheus server
- Check Prometheus logs for alert sending failure error messages
- Verify the correctness of alert rule expressions

For more information, please refer to [Prometheus Alerting Documentation](https://prometheus.io/docs/alerting/latest/configuration/)
