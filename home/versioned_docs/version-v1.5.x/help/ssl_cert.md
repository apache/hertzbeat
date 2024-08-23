---
id: ssl_cert  
title: Monitoring SSL Certificate      
sidebar_label: SSL Monitor  
keywords: [open source monitoring tool, open source ssl cert monitoring tool, monitoring website ssl metrics]
---

> Monitor the website's SSL certificate expiration time, response time and other Metrics

### Configuration parameters

|    Parameter name    |                                                                           Parameter help description                                                                           |
|----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host      | The peer IPV4, IPV6 or domain name to be monitored. Note ⚠️Without protocol header (eg: https://, http://).                                                                    |
| Monitoring name      | The name that identifies this monitoring, and the name needs to be unique.                                                                                                     |
| Port                 | The port provided by the website, https generally defaults to 443.                                                                                                             |
| Relative path        | The suffix path of the website address except the IP port, for example, `www.tancloud.io/console` The relative path of the website is `/console`.                              |
| Acquisition Interval | Interval time for monitoring periodic data collection, in seconds, the minimum interval that can be set is 30 seconds                                                          |
| Whether to detect    | Whether to detect and check the availability of monitoring before adding monitoring, and the operation of adding and modifying will continue after the detection is successful |
| Description Remarks  | More remark information to identify and describe this monitoring, users can remark information here                                                                            |

### Collect metrics

#### Metric collection: certificate

|   Metric Name   |   Metric Unit   | Metric Help Description  |
|-----------------|-----------------|--------------------------|
| subject         | none            | certificate name         |
| expired         | no              | expired or not           |
| start_time      | None            | Validity start time      |
| start_timestamp | ms millisecond  | Validity start timestamp |
| end_time        | None            | Expiration time          |
| end_timestamp   | ms milliseconds | expiration timestamp     |
