將 Zabbix 的告警通過 Webhook 方式發送到 HertzBeat 告警平臺。

### 步驟一: 在 Zabbix 創建自定義 Webhook 媒介類型
1. 登錄 Zabbix Web 界面
2. 進入 **告警** > **媒介類型** > **創建媒介類型**
3. 配置基本信息
  - 名稱: HertzBeat Webhook
  - 類型: Webhook
4. 在 **參數** 部分添加以下字段

   | 名稱 | 值 |
      |-----|-----|
   | URL | http://your-hertzbeat-server:1157/api/alerts/report/zabbix |
   | AlertName | {TRIGGER.NAME} |
   | AlertId | {EVENT.ID} |
   | HostName | {HOST.NAME} |
   | HostIp | {HOST.IP} |
   | TriggerDescription | {TRIGGER.DESCRIPTION} |
   | TriggerSeverity | {TRIGGER.SEVERITY} |
   | TriggerStatus | {EVENT.STATUS} |
   | ItemName | {ITEM.NAME} |
   | ItemValue | {ITEM.VALUE} |
   | ItemLastValue | {ITEM.LASTVALUE} |
   | EventDate | {EVENT.DATE} |
   | EventTime | {EVENT.TIME} |
   | EventTags | {EVENT.TAGS} |
   | EventRecoveryDate | {EVENT.RECOVERY.DATE} |
   | EventRecoveryTime | {EVENT.RECOVERY.TIME} |

5. 在 **腳本** 部分添加以下 JavaScript 代碼
```javascript
var Hertzbeat = {
  sendMessage: function(url, alert) {
    request = new HttpRequest();
    request.addHeader('Content-Type: application/json');
    data = JSON.stringify(alert);

    Zabbix.Log(4, '[Hertzbeat Webhook] params: ' + data);
    // 推送告警消息
    response = request.post(url, data);
    Zabbix.Log(4, '[Hertzbeat Webhook] HTTP code: ' + request.Status());
    Zabbix.Log(4, '[Hertzbeat Webhook] response: ' + response);

    // 格式化返回的結果並做出判斷，有異常則拋出異常。
    try {
      response = JSON.parse(response);
    } catch (error) {
      response = null;
      Zabbix.Log(4, '[Hertzbeat Webhook] response parse error');
    }

    if (request.Status() !== 200 ||  response.errcode !== 0 || response.errmsg !== 'ok') {
      if (typeof response.errmsg === 'string') {
        throw response.errmsg;
      }
      else {
        throw 'Unknown error. Check debug log for more information.'
      }
    }
  }
}

try {
  var params = JSON.parse(value);
  // 判斷Webhook_url參數是否定義，未定義拋出錯誤。
  if (typeof params.URL === 'undefined') {
    throw 'Incorrect value is given for parameter "Webhook_url": parameter is missing';
  }

  var currentTimestamp = Date.now();

  // 轉換 zabbix 嚴重性到 HertzBeat 優先級
  function convertSeverity(severity) {
    var severityMap = {
      "信息": "info",
      "Information": "info",
      "警告": "warning",
      "Warning": "warning",
      "一般嚴重": "error",
      "Average": "error",
      "嚴重": "critical",
      "High": "critical",
      "災難": "emergency",
      "Disaster": "emergency"
    };
    return severityMap[severity] || "error";
  }
  // 構建指紋唯一標識
  var fingerprint = "zabbix-event:" + params.AlertId + "-" + params.HostName;

  // 構建 labels
  var labels = {
    "alertname": params.AlertName,
    "source": "zabbix",
    "severity": convertSeverity(params.TriggerSeverity),
    "host": params.HostName,
    "hostip": params.HostIp,
    "itemname": params.ItemName
  };

  // 解析事件標籤
  if (params.EventTags) {
    var tags = params.EventTags.split(',');
    for (var i = 0; i < tags.length; i++) {
      var tagParts = tags[i].split(':');
      if (tagParts.length == 2) {
        var key = tagParts[0].trim();
        var value = tagParts[1].trim();
        labels[key] = value;
      }
    }
  }

  // 構建註解信息
  var annotations = {
    "summary": params.AlertName,
    "description": params.TriggerDescription,
    "value": params.ItemValue,
    "lastValue": params.ItemLastValue
  };

  // 構建告警內容
  var content = "主機: " + params.HostName +
    "\nIP: " + params.HostIp +
    "\n告警: " + params.AlertName +
    "\n級別: " + params.TriggerSeverity +
    "\n描述: " + params.TriggerDescription +
    "\n監控項: " + params.ItemName +
    "\n當前值: " + params.ItemValue +
    "\n上次值: " + params.ItemLastValue +
    "\n時間: " + params.EventDate + " " + params.EventTime;

  // 確定狀態
  var status = params.TriggerStatus === "RESOLVED" ? "resolved" : "firing";

  // 計算時間戳
  var startAt = currentTimestamp;
  var endAt = null;

  // 如果是恢復事件，計算結束時間
  if (status === "resolved" && params.EventRecoveryDate && params.EventRecoveryTime) {
    endAt = currentTimestamp;
  }

  // 構建發送到 HertzBeat 的 payload
  var hertzbeatAlert = {
    "fingerprint": fingerprint,
    "labels": labels,
    "annotations": annotations,
    "content": content,
    "status": status,
    "triggerTimes": 1,
    "startAt": startAt,
    "activeAt": startAt,
    "endAt": endAt
  };

  // 記錄日誌
  Zabbix.Log(4, "HertzBeat webhook payload: " + JSON.stringify(hertzbeatAlert));

  // 執行消息推送函數
  Hertzbeat.sendMessage(params.URL, hertzbeatAlert);
  // 返回給zabbix，ok 在 Zabbix 動作中會被用來標識成功執行。
  return 'OK';
} catch (error) {
  Zabbix.Log(4, '[Hertzbeat Webhook] notification failed: ' + error);
  throw 'Sending failed: ' + error + '.';
}  
```
7. 點擊 **添加** 按鈕保存媒介類型

### 步驟二: 為用戶配置媒介
1. 進入 **用戶** > **用戶** > **選擇要接收告警的用戶** (可以創建一個專門用於告警的用戶)
2. 選擇 **報警媒介** 選項卡 > **添加**
3. 選擇 **HertzBeat Webhook** 類型
4. 啟用時間段按需選擇，報警嚴重性按需選擇，確保狀態為啟用
5. 點擊 **添加** 按鈕保存媒介

### 步驟三: 配置告警動作
1. 進入 **告警** > **動作** > **觸發器動作** > **創建動作**
2. 配置動作選項卡信息
  - 名稱: HertzBeat Webhook
  - 條件: 根據需要配置觸發條件
3. 配置操作選項卡信息
  - 操作步驟持續時間: 根據需要進行設置
  - 在**操作**部分添加，配置用戶或用戶組，選擇之前配置 HertzBeat Webhook 媒介的用戶，發送至媒體類型選擇 **HertzBeat Webhook**，選中自定義消息內容，確保所有宏都被正確傳遞
  - **恢復操作**以及**更新操作**可以根據上述進行類似配置
4. 點擊 **添加** 按鈕保存告警動作


### 常見問題

#### 未收到告警
- 確保 Webhook URL 可以被 zabbix 服務訪問
- 檢查服務器日誌是否有請求記錄

#### 告警未觸發
- 確保告警策略的條件正確，並已綁定通知

更多信息請參考 [Zabbix Webhook](https://www.zabbix.com/documentation/current/manual/config/notifications/webhook) 以及 [Zabbix 宏](https://www.zabbix.com/documentation/current/zh/manual/appendix/macros)
```
