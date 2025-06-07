>將華為雲監控服務(CES)的告警通過 Webhook 方式發送到 HertzBeat 告警平臺。

### 步驟一: 在雲監控服務控制檯設置通知模板
1. 登錄華為雲監控服務控制檯
2. 選擇 **告警** > **告警通知** > **通知內容模板** > **創建通知內容模板**
3. 渠道類型：設置為 HTTP/HTTPS 、通知類型：按需選擇、數據格式： JSON
4. 確保如下 JSON 正確預覽
```
{
  "version": "v1",
  "data": {
    "AccountName": "RDS_test",
    "Namespace": "彈性雲服務器",
    "DimensionName": "雲服務器",
    "ResourceName": "ecs-test",
    "MetricName": "CPU使用率",
    "IsAlarm": true,
    "AlarmLevel": "重要",
    "Region": "華北-烏蘭察布-二零三",
    "RegionId": "cn-north-4",
    "ResourceId": "xxxx-xxxx",
    "PrivateIp": "127.0.0.0",
    "PublicIp": "100.0.0.0",
    "CurrentData": "1.06%",
    "AlarmTime": "2024/08/0514:45:16GMT+08:00",
    "AlarmRecordID": "ah1722xxxxxx",
    "AlarmRuleName": "test-xxx",
    "IsOriginalValue": true,
    "Filter": "原始值",
    "ComparisonOperator": "u003e=",
    "Value": "0%",
    "Unit": "%",
    "Count": 1,
    "EpName": "default"
  }
}
```

### 步驟二: 在雲監控服務控制檯設置通知對象
1. 登錄華為雲監控服務控制檯
2. 選擇 **告警** > **告警通知** > **通知對象** > **創建通知對象**
3. 選擇渠道：HTTP 或者 HTTPS
4. 添加 HertzBeat 作為告警接收端配置
- 請求地址: http://{hertzbeat_host}:1157/api/alerts/report/huaweicloud-ces

### 步驟三: 在雲監控服務控制檯設置通知組
1. 登錄華為雲監控服務控制檯
2. 選擇 **告警** > **告警通知** > **通知組** > **創建通知組**
3. 選擇通知對象：步驟二設置的 **通知對象**
- 您也可以在已有的通知組添加 **通知對象**

### 步驟四: 在雲監控服務控制檯設置通知策略
1. 登錄華為雲監控服務控制檯
2. 選擇 **告警** > **告警通知** > **通知策略** > **創建通知策略**
3. 選擇 **通知範圍** > **接收對象** > **通知組** > 選擇步驟三設置的 **通知組**
4. 選擇 **通知內容模板** > **指標模板** 跟 **事件模板** -> 選擇步驟一設置的 **通知模板**
5. 其他的請按需選擇配置

### 常見問題

#### 告警未觸發
- 確保 Webhook URL 可以被 華為雲監控服務(CES) 通知訪問
- 確保 **通知策略**、**通知組**、**通知對象**、**通知內容模板** 設置的正確性
- 確保 **告警** > **告警規則** 設置的正確性/是否已啟用，可查閱 **告警記錄** 是否有觸發告警
- 注意：已創建的 **通知對象** 加入到 **通知組** 後，**消息通知服務(SMN)** 會向訂閱終端發送訂閱確認信息，需確認後方可收到告警通知。
  - 創建完通知組以後，會在 **消息通知服務(SMN)** > **主題管理** > **主題** 中同步創建主題，並在 **消息通知服務(SMN)** > **主題管理** > **訂閱** 中創建訂閱信息。HertzBeat 添加了自動訂閱的功能，如果狀態不是(已確認)，請手動請求訂閱
- 注意：若多個 **通知對象** 創建名稱不一致，但通知渠道的對象一致，則只會收到一次訂閱確認信息。

#### 其他
- HertzBeat 添加了加入到 **通知組** 後自動訂閱的功能。
- 為了確保安全，HertzBeat 支持了 **消息簽名認證**，通過簽名串驗證消息的合法性。

#### 更多信息請參考
- [告警](https://support.huaweicloud.com/usermanual-ces/ces_01_0067.html)
- [校驗消息簽名](https://support.huaweicloud.com/usermanual-smn/smn_ug_a9003.html)
- [請求訂閱](https://support.huaweicloud.com/usermanual-smn/smn_ug_0046.html)
- [HTTP(S)消息格式](https://support.huaweicloud.com/usermanual-smn/smn_ug_a9002.html)
