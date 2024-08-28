---
id: websocket
title: Monitoring Websocket
sidebar_label: Websocket Monitor
keywords: [ open source monitoring tool,  Websocket监控 ]
---

> Monitor metrics such as the response of the WebSocket service's first handshake.

### Configuration parameter

|      Parameter name       |                                                Parameter help description                                                |
|---------------------------|--------------------------------------------------------------------------------------------------------------------------|
| Host of WebSocket service | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://).                              |
| Monitoring name           | Identify the name of this monitoring. The name needs to be unique.                                                       |
| Port                      | Port of websocket service.                                                                                               |
| Path of WebSocket service | WebSocket endpoint path.                                                                                                 |
| Collection interval       | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds. |
| Bind Tags                 | Used to classify and manage monitoring resources.                                                                        |
| Description remarks       | For more information about identifying and describing this monitoring, users can note information here.                  |

### Collection Metric

#### Metric set：Summary

|  Metric name  | Metric unit | Metric help description |
|---------------|-------------|-------------------------|
| responseTime  | ms          | Response time           |
| httpVersion   | none        | HTTP version            |
| responseCode  | none        | Response status code    |
| statusMessage | none        | Status messages         |
| connection    | none        | Connect type            |
| upgrade       | none        | Upgraded protocols      |
