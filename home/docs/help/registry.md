---
id: registry
title: Monitoring Registry
sidebar_label: Registry Monitor
keywords: [open source monitoring tool, open source java monitoring tool, monitoring registry metrics]
---

> Collect and monitor the general performance Metrics of Registry.

**Protocol Use：registry**

## Steps to monitor micro services

1. Make sure your **Register center** is available

   > We currently support for `Consul` and `Nacos`.

2. Add http_sd monitor and enter necessary info about **Register center** on Hertzbeat, such as host, port and so on.
3. Click **OK**

## Configuration parameter

|    Parameter name     |                                                                        Parameter help description                                                                         |
|-----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Host                  | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Task name             | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Port                  | Port provided by Register center                                                                                                                                          |
| Discovery Client Type | Select one Register center that you want to monitor                                                                                                                       |
| Collection interval   | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                   |
| Whether to detect     | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks   | For more information about identifying and describing this monitoring, users can note information here                                                                    |

## Collection Metrics

## Metrics Set：server

|  Metric name  | Metric unit | Metric help description |
|---------------|-------------|-------------------------|
| Address       |             |                         |
| Port          |             |                         |
| Response Time | ms          |                         |

## Metrics Set：service

|  Metric name  | Metric unit |     Metric help description      |
|---------------|-------------|----------------------------------|
| Service Id    |             |                                  |
| Service Name  |             |                                  |
| Address       |             |                                  |
| Port          |             |                                  |
| Health Status |             | Current health status of service |
