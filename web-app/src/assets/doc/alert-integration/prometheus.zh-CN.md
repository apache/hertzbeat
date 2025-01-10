> 由于 Prometheus Server 本身并不支持 HTTP API 的告警发送，因此需要借助外部脚本或者 Alertmanager 来实现告警发送。  
> 若使用 Alertmanager，可参考 **Alertmanager 集成文档**。这里提供非部署 Alertmanager 的 Prometheus Server 的告警配置方法。

### Prometheus 告警配置

1. 編輯 Prometheus 配置文件 `prometheus.yml`，添加告警規則配置
    ```yaml
    rule_files:
      - "rules/*.rules.yml"
    ```
    > `rules/*.rules.yml` 為告警規則文件路徑，可以根據實際情況修改
> 2. 創建告警規則文件夾 `rules`，並創建告警規則文件 `rules/*.rules.yml`
> 3. 編輯告警規則文件，添加告警規則配置
> 4. 重新加載 Prometheus 配置

### 编写脚本自动发送告警

> 由于 Prometheus Server 本身并不支持 HTTP API 的告警发送，这里我们使用 Python 脚本来实现告警发送。

1. 安装 Python requests 库
    ```bash
    pip install requests
    ```
2. 编写 Python 脚本 `send_alerts.py`
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
3. 运行 Python 脚本
    ```bash
    python send_alerts.py
    ```
    > 该脚本会从 Prometheus Server 获取告警数据，并通过 Webhook 推送到 HertzBeat 告警平台。

## 验证配置

1. 确保 Prometheus 配置正确并重新加载配置
    ```bash
    curl -X POST http://localhost:9090/-/reload
    ```
2. 检查 Prometheus 告警规则状态
    ```bash
    curl http://localhost:9090/api/v1/rules
    ```
3. 触发测试告警并在 HertzBeat 告警中心查看

## 常见问题

- 确保 HertzBeat URL 可以被 Prometheus 服务器访问
- 检查 Prometheus 日志中是否有告警发送失败的错误信息
- 验证告警规则表达式的正确性

更多信息請參考 [Prometheus 告警配置文檔](https://prometheus.io/docs/alerting/latest/configuration/)
