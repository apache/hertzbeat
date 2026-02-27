>將 Uptime-Kuma 的告警通過 Webhook 方式發送到 HertzBeat 告警平台。

### 配置 Uptime Kuma 告警回調

#### 進入通知配置
1. 登錄 Uptime Kuma web 管理界面
2. 進入 **設置** > **通知** > **設置通知**
3. 選擇 **Webhook** 通知類型
4. 在 **Post URL** 中，填寫 HertzBeat 提供的 Webhook 接口地址 URL：
   ```
   http://{your_system_host}/api/alerts/report/uptime-kuma
   ```
5. 在 **請求體** 選擇 **預設-application/json**，其他請按需配置
6. 保存設置通知


### 常見問題

#### 未收到告警
- 確保 Webhook URL 可以被 uptime kuma 服務訪問
- 檢查服務器日誌是否有請求記錄

#### 告警未觸發
- 確保告警策略的條件正確，並已綁定通知

更多信息請參考 
