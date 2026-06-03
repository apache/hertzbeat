> 將火山引擎雲監控的告警通過 Webhook 方式發送到 HertzBeat 告警平台。

### 配置火山引擎告警回調

1. 登錄火山引擎雲監控[回調地址管理頁面](https://console.volcengine.com/cloud-monitor/notice/webhook)
2. 點擊**創建回調地址**
3. 在回調地址創建頁面填寫基礎信息，回調類型選擇`通用地址回調`
4. 回調地址輸入框中填寫 HertzBeat 提供的 Webhook 接口地址 URL:

```
http://{your_system_host}/api/alerts/report/volcengine
```

### 綁定告警策略

1. 登錄火山引擎雲監控[告警策略配置頁面](https://console.volcengine.com/cloud-monitor/alert/strategy)
2. 創建新策略或編輯已有策略，在告警方式配置中
   - 選擇通知方式為**手動通知**
   - 告警渠道勾選**告警回調**
   - 告警回調中選擇上一步創建的回調地址
3. 保存告警策略

### 常見問題

#### 未收到告警
- 確保 Webhook URL 可以被公網訪問
- 檢查服務器日誌是否有請求記錄
- 在火山引擎回調地址頁面測試 Webhook 是否可用

#### 告警未觸發
- 確保告警策略的條件正確，並且綁定正確的回調地址作為通知渠道
- 確保告警策略為`啟用`狀態
- 在火山引擎雲監控控制台中查看告警歷史，確保策略被觸發

更多信息請參考 [火山引擎告警配置文檔](https://www.volcengine.com/docs/6408/68122)
