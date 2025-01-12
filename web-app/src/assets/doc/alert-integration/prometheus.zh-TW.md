> 由於 Prometheus Server 本身並不支持 HTTP API 的告警發送，因此需要借助外部腳本或者 Alertmanager 來實現告警發送。  
> 若使用 Alertmanager，可參考 **Alertmanager 集成文檔**。這裡提供非部署 Alertmanager 的 Prometheus Server 的告警配置方法。

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

### 編寫腳本自動發送告警

> 由於 Prometheus Server 本身並不支持 HTTP API 的告警發送，這裡我們使用 Python 腳本來實現告警發送。

1. 安裝 Python requests 庫
    ```bash
    pip install requests
    ```
2. 編寫 Python 腳本 `send_alerts.py`
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
    while True:
        alerts = get_prometheus_alerts()
        for alert in alerts:
            send_to_webhook(alert)
        # 设置定时任务，例如每 300 秒即 5 分钟执行一次
        time.sleep(300)  
        
```
3. 運行 Python 腳本
    ```bash
    python send_alerts.py
    ```
    > 該腳本會從 Prometheus Server 獲取告警數據，並通過 Webhook 推送到 HertzBeat 告警平台。

## 驗證配置

1. 確保 Prometheus 配置正確並重新加載配置
    ```bash
    curl -X POST http://localhost:9090/-/reload
    ```
2. 檢查 Prometheus 告警規則狀態
    ```bash
    curl http://localhost:9090/api/v1/rules
    ```
3. 觸發測試告警並在 HertzBeat 告警中心查看

## 常見問題

- 確保 HertzBeat URL 可以被 Prometheus 服務器訪問
- 檢查 Prometheus 日誌中是否有告警發送失敗的錯誤信息
- 驗證告警規則表達式的正確性

更多信息請參考 [Prometheus 告警配置文檔](https://prometheus.io/docs/alerting/latest/configuration/)
