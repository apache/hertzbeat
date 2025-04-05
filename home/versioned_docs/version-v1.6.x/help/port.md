---
id: port  
title: Monitoring：TCP port availability      
sidebar_label: TCP Port availability    
keywords: [open source monitoring tool, open source port monitoring tool, monitoring TCP port metrics]
---

> Judge whether the exposed port of the opposite end service is available, then judge whether the opposite end service is available, and collect Metrics such as response time for monitoring.

### Configuration parameter

|   Parameter name    |                                                                        Parameter help description                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Port                | Ports provided by website, http generally defaults to 80 and https generally defaults to 443                                                                              |
| Connection timeout  | Waiting timeout for port connection, unit:ms, default: 3000ms                                                                                                             |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                   |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                    |

### Collection Metric

#### Metric set：summary

| Metric name  | Metric unit | Metric help description |
|--------------|-------------|-------------------------|
| responseTime | ms          | Website response time   |
