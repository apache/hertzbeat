---
id: website  
title: Monitoring Website         
sidebar_label: Website Monitor   
keywords: [open source monitoring tool, open source website monitoring tool, monitoring website metrics]
---

> Monitor whether the website is available, response time and other Metrics.

### Configuration parameter

|   Parameter name    |                                                                        Parameter help description                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Port                | Ports provided by website, http generally defaults to 80 and https generally defaults to 443                                                                              |
| Relative path       | Suffix path of website address except IP port. For example, the relative path of `www.tancloud.io/console` website is `/console`                                          |
| Enable HTTPS        | Whether to access the website through HTTPS. Note⚠️When HTTPS is enabled, the default corresponding port needs to be changed to 443                                       |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                   |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                    |

### Collection Metric

#### Metric set：summary

| Metric name  | Metric unit | Metric help description |
|--------------|-------------|-------------------------|
| responseTime | ms          | Website response time   |
