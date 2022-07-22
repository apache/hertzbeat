---
id: port  
title: Monitoring：port availability      
sidebar_label: Port availability    
---

> Judge whether the exposed port of the opposite end service is available, then judge whether the opposite end service is available, and collect indicators such as response time for monitoring.

### Configuration parameter   

| Parameter name      | Parameter help description |
| ----------- | ----------- |
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://) |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique |
| Port        | Ports provided by website, http generally defaults to 80 and https generally defaults to 443 |
| Connection timeout | Waiting timeout for port connection, unit:ms, default: 3000ms |
| Collection interval   | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 10 seconds |
| Whether to detect    | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks    | For more information about identifying and describing this monitoring, users can note information here |

### Collection indicator

#### Indicator set：summary

| Indicator name      | Indicator unit | Indicator help description |
| ----------- | ----------- | ----------- |
| responseTime   | ms | Website response time |



