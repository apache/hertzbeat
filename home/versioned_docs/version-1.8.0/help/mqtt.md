---
id: mqtt
title: Monitoring MQTT Connection
sidebar_label: MQTT Connection
keywords: [ Open Source Monitoring System, MQTT Connection Monitoring ]
---

> Monitor MQTT connection status, supporting MQTT5 and MQTT3.1.1 protocols.

**Protocol used: mqtt**

:::tip
To check if topics can be subscribed to normally, HertzBeat will subscribe to a topic and then immediately unsubscribe; to verify if messages can be published correctly, HertzBeat will send a test
message to a topic (if the test message parameter is empty, this check will not be performed).  
Please ensure that these operations will not affect your system.
:::

### Configuration Parameters

| Parameter Name         | Parameter Description                                                                                                              |
|------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| Target Host            | The monitored target's IPv4, IPv6, or domain name. Note ⚠️: Do not include protocol headers (e.g., https://, http://).             |
| Task Name              | The name of this monitoring task, which needs to be unique.                                                                        |
| Port                   | The port where the MQTT service is open, default is 1883.                                                                          |
| Protocol Version       | The MQTT protocol version, supporting MQTT5 and MQTT3.1.1.                                                                         |
| Connection Timeout(ms) | Connection timeout in milliseconds, default is 6000 ms.                                                                            |
| Client Id              | MQTT client ID, default is `hertzbeat-mqtt-client`.                                                                                |
| Topic                  | The topic to be monitored.                                                                                                         |
| Test Message           | Message content used to test whether a topic can be published to normally (optional; if empty, `canPublish` will always be false). |
| Username               | MQTT authentication username (optional).                                                                                           |
| Password               | MQTT authentication password (optional).                                                                                           |
| Intervals              | Interval for periodic data collection, in seconds; the minimum interval that can be set is 30 seconds.                             |
| Binding Tag            | Used for classification and management of monitoring resources.                                                                    |
| Description            | Additional notes to identify and describe this monitoring task, users can leave notes here.                                        |

### Collected Metrics

#### Metric Set: Summary

| Metric Name  | Unit | Metric Description                                      |
|--------------|------|---------------------------------------------------------|
| responseTime | none | Response time                                           |
| canPublish   | none | Whether messages can be published to the topic normally |
| canSubscribe | none | Whether the topic can be subscribed to normally         |
