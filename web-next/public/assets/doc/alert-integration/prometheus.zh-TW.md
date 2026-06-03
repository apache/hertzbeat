可以在 Prometheus Server 的 Alertmanager 配置中直接配置 HertzBeat 的服務地址，使用 HertzBeat 替換 Alertmanager 直接來接收處理 Prometheus Server 的告警信息。

### Prometheus 服務配置

- 編輯 Prometheus 配置文件 `prometheus.yml`，添加 HertzBeat 作為告警接收端配置
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
- `{hertzbeat_host}:1157` 為 HertzBeat Server 地址和端口，根據實際情況修改，需要保證網絡連通性。
- `{token}` 為 HertzBeat Server 的授權 Token，申請新 Token 後替換值。

- 重新加載啟動 Prometheus Server 

## 驗證配置

1. 確保 Prometheus 配置正確並重新加載配置
    ```bash
    curl -X POST http://localhost:9090/-/reload
    ```
2. 檢查 Prometheus 告警規則狀態
    ```bash
    curl http://localhost:9090/api/v1/rules
    ```
3. 觸發測試告警並在 HertzBeat 告警中心查看。

## 常見問題

- 確保 HertzBeat URL 可以被 Prometheus 伺服器訪問。
- 檢查 Prometheus 日誌中是否有告警發送失敗的錯誤信息。
- 驗證告警規則表達式的正確性。

更多信息請參考 [Prometheus 告警配置文檔](https://prometheus.io/docs/alerting/latest/configuration/)
