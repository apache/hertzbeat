---
id: ping  
title: Monitoring：PING connectivity       
sidebar_label: PING connectivity       
keywords: [open source monitoring tool, open source network monitoring tool, monitoring ping metrics]
---

> Ping the opposite end HOST address and judge its connectivity.

### Configuration parameter

|   Parameter name    |                                                                        Parameter help description                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Ping timeout        | Set the timeout when Ping does not respond to data, unit:ms, default: 3000ms                                                                                              |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                   |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                    |

### Collection Metric

#### Metric set：summary

| Metric name  | Metric unit | Metric help description |
|--------------|-------------|-------------------------|
| responseTime | ms          | Website response time   |

### Common Problem

1. Ping connectivity monitoring exception when installing hertzbeat for package deployment.  
   The hertzbeat installed and deployed by the installation package is not available for ping connectivity monitoring, but local direct ping is available 。

> The deployment of the installation package requires configuring the root permission of the Java virtual machine to start hertzbeat to use ICMP. If the root permission is not enabled, judge whether port 7 of telnet opposite end is opened.
> When you install HertzBeat via DockerDocker root is enabled by default. No such problem.
> See <https://stackoverflow.com/questions/11506321/how-to-ping-an-ip-address>
