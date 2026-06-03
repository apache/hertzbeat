Send Zabbix alerts to the HertzBeat alert platform via Webhook.

### Step 1: Create Custom Webhook Media Type in Zabbix
1. Log in to Zabbix Web interface
2. Go to **Administration** > **Media types** > **Create media type**
3. Configure basic information
  - Name: HertzBeat Webhook
  - Type: Webhook
4. Add the following fields in the **Parameters** section

   | Name | Value |
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

5. Add the following JavaScript code in the **Script** section
```javascript
var Hertzbeat = {
  sendMessage: function(url, alert) {
    request = new HttpRequest();
    request.addHeader('Content-Type: application/json');
    data = JSON.stringify(alert);

    Zabbix.Log(4, '[Hertzbeat Webhook] params: ' + data);
    // Push alert message
    response = request.post(url, data);
    Zabbix.Log(4, '[Hertzbeat Webhook] HTTP code: ' + request.Status());
    Zabbix.Log(4, '[Hertzbeat Webhook] response: ' + response);

    // Format the returned result and make a judgment, throw an exception if there is an exception.
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
  // Check if Webhook_url parameter is defined, throw an error if not defined.
  if (typeof params.URL === 'undefined') {
    throw 'Incorrect value is given for parameter "Webhook_url": parameter is missing';
  }

  var currentTimestamp = Date.now();

  // Convert Zabbix severity to HertzBeat priority
  function convertSeverity(severity) {
    var severityMap = {
      "信息": "info",
      "Information": "info",
      "警告": "warning",
      "Warning": "warning",
      "一般严重": "error",
      "Average": "error",
      "严重": "critical",
      "High": "critical",
      "灾难": "emergency",
      "Disaster": "emergency"
    };
    return severityMap[severity] || "error";
  }
  // Build fingerprint unique identifier
  var fingerprint = "zabbix-event:" + params.AlertId + "-" + params.HostName;

  // Build labels
  var labels = {
    "alertname": params.AlertName,
    "source": "zabbix",
    "severity": convertSeverity(params.TriggerSeverity),
    "host": params.HostName,
    "hostip": params.HostIp,
    "itemname": params.ItemName
  };

  // Parse event tags
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

  // Build annotations
  var annotations = {
    "summary": params.AlertName,
    "description": params.TriggerDescription,
    "value": params.ItemValue,
    "lastValue": params.ItemLastValue
  };

  // Build alert content
  var content = "Host: " + params.HostName +
    "\nIP: " + params.HostIp +
    "\nAlert: " + params.AlertName +
    "\nLevel: " + params.TriggerSeverity +
    "\nDescription: " + params.TriggerDescription +
    "\nItem: " + params.ItemName +
    "\nCurrent Value: " + params.ItemValue +
    "\nLast Value: " + params.ItemLastValue +
    "\nTime: " + params.EventDate + " " + params.EventTime;

  // Determine status
  var status = params.TriggerStatus === "RESOLVED" ? "resolved" : "firing";

  // Calculate timestamp
  var startAt = currentTimestamp;
  var endAt = null;

  // If it's a recovery event, calculate end time
  if (status === "resolved" && params.EventRecoveryDate && params.EventRecoveryTime) {
    endAt = currentTimestamp;
  }

  // Build payload to send to HertzBeat
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

  // Log
  Zabbix.Log(4, "HertzBeat webhook payload: " + JSON.stringify(hertzbeatAlert));

  // Execute message push function
  Hertzbeat.sendMessage(params.URL, hertzbeatAlert);
  // Return to Zabbix, 'OK' will be used to identify successful execution in Zabbix actions.
  return 'OK';
} catch (error) {
  Zabbix.Log(4, '[Hertzbeat Webhook] notification failed: ' + error);
  throw 'Sending failed: ' + error + '.';
}
```
7. Click the **Add** button to save the media type

### Step 2: Configure Media for Users
1. Go to **Administration** > **Users** > **Select the user who will receive alerts** (you can create a dedicated user for alerts)
2. Select the **Media** tab > **Add**
3. Select **HertzBeat Webhook** type
4. Choose the time period and alert severity as needed, ensure the status is enabled
5. Click the **Add** button to save the media

### Step 3: Configure Alert Actions
1. Go to **Configuration** > **Actions** > **Trigger actions** > **Create action**
2. Configure the Action tab information
  - Name: HertzBeat Webhook
  - Conditions: Configure trigger conditions as needed
3. Configure Operations tab information
  - Operation step duration: Set as needed
  - In the **Operations** section, add and configure users or user groups, select the user configured with HertzBeat Webhook media, select **HertzBeat Webhook** as the media type, check custom message content, ensure all macros are correctly passed
  - **Recovery operations** and **Update operations** can be configured similarly
4. Click the **Add** button to save the alert action


### Common Issues

#### Alerts Not Received
- Ensure the Webhook URL is accessible by the Zabbix server
- Check server logs for request records

#### Alerts Not Triggered
- Ensure alert policy conditions are correct and notifications are bound

For more information, refer to [Zabbix Webhook](https://www.zabbix.com/documentation/current/manual/config/notifications/webhook) and [Zabbix Macros](https://www.zabbix.com/documentation/current/en/manual/appendix/macros)
```
