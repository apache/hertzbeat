---
id: prometheus
title: Monitoring Prometheus Task
sidebar_label: Prometheus Task Monitor
keywords: [ open source monitoring tool,  Prometheus protocol monitoring ]
---

> Collect metric data of applications that support the Prometheus protocol.

### Configuration parameter

|   Parameter name    |                                                Parameter help description                                                |
|---------------------|--------------------------------------------------------------------------------------------------------------------------|
| Target Host         | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                               |
| Task Name           | Identify the name of this monitoring. The name needs to be unique.                                                       |
| Port                | Monitor HTTP port.                                                                                                       |
| Endpoint Path       | Monitor the path of HTTP interfaces, Note ⚠️ It needs to start with /.                                                   |
| Query Timeout       | Set the data collection timeout, unit: ms, default: 6000ms.                                                              |
| HTTPS               | HTTPS enable,optional,default:false.                                                                                     |
| Headers             | HTTP request headers,optional.                                                                                           |
| Params              | Request params,optional.                                                                                                 |
| Content-Type        | ContentType,optional.                                                                                                    |
| BODY                | Request body,optional.                                                                                                   |
| Auth Type           | Authentication methods, optional values include: `Basic Auth`, `Digest Auth`,optional.                                   |
| Username            | Username,optional.                                                                                                       |
| Password            | Password,optional.                                                                                                       |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds. |
| Bind Tags           | Used to classify and manage monitoring resources.                                                                        |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here.                  |

### Example of usage

The exposed monitoring address of the application is: `http://127.0.0.1:8080/actuator/prometheus`

You can use the following configuration:

- Target Host: `127.0.0.1`
- Port: `8080`
- Endpoint Path: `/actuator/prometheus`

Keep the rest of the settings default.
