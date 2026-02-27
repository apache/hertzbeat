>將 SkyWalking 的告警透過 Webhook 方式發送到 HertzBeat 告警平台。

### SkyWalking 服務配置

- 編輯 SkyWalking 配置文件 `alarm-settings.yml`，添加 HertzBeat 作為告警接收端配置
```yaml
hooks:
  webhook:
    default:
      is-default: true
      urls:
        - http://{hertzbeat_host}:1157/api/alerts/report/skywalking

```
- `{hertzbeat_host}:1157` 為 HertzBeat Server 地址和端口，根據實際情況修改，需要保證網絡連通性
- 重新加載啟動 SkyWalking OAP Server

### 驗證配置

1. 確保 SkyWalking 配置正確並重新加載配置
    ```bash
    curl -X POST http://localhost:9090/-/reload
    ```
2. 檢查 SkyWalking 告警規則狀態
    ```bash
    curl http://localhost:9090/api/v1/rules
    ```
3. 觸發測試告警並在 HertzBeat 告警中心查看

### 常見問題

- 確保 HertzBeat URL 可以被 SkyWalking 伺服器訪問
- 檢查 SkyWalking 日誌中是否有告警發送失敗的錯誤信息
- 驗證告警規則表達式的正確性

更多信息請參考 [SkyWalking 告警配置文檔](https://skywalking.apache.org/docs/main/latest/en/setup/backend/backend-alarm/)
