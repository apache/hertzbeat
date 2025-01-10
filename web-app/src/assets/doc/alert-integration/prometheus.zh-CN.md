## 告警字段說明

- `alert`: 告警規則名稱
- `expr`: 告警觸發條件表達式
- `for`: 告警持續時間閾值
- `labels`: 告警標籤
  - `severity`: 告警級別 (warning, critical)
- `annotations`: 告警註釋信息
  - `summary`: 告警摘要
  - `description`: 告警詳細描述

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

1. 確保 HertzBeat URL 可以被 Prometheus 服務器訪問
2. 檢查 Prometheus 日誌中是否有告警發送失敗的錯誤信息
3. 驗證告警規則表達式的正確性

更多信息請參考 [Prometheus 告警配置文檔](https://prometheus.io/docs/alerting/latest/configuration/)
