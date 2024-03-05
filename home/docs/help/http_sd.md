---
id: httpsd
title: Monitoring Httpsd
sidebar_label: Httpsd Monitor
keywords: [open source monitoring tool, open source java monitoring tool, monitoring httpsd metrics]
---

> Collect and monitor the general performance Metrics of Httpsd.

**Protocol Use：httpsd**

# Steps to monitor micro services

1. Make sure your **Register center** is available

   > We currently support for `Consul` and `Nacos`.

2. Add http_sd monitor and enter necessary info about **Register center** on Hertzbeat, such as host, port and so on.

3. Click **OK**

# Configuration parameter

| Parameter name        | Parameter help description                                   |
| --------------------- | ------------------------------------------------------------ |
| Host                  | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://) |
| Task name             | Identify the name of this monitoring. The name needs to be unique |
| Port                  | Port provided by Register center                             |
| Discovery Client Type | Select one Register center that you want to monitor          |
| Collection interval   | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds |
| Whether to detect     | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks   | For more information about identifying and describing this monitoring, users can note information here |

# Collection Metrics

#### Metrics Set：nginx_status

| Metric name | Metric unit | Metric help description                  |
|-------------|-------------|------------------------------------------|
| accepts     |             | Accepted connections                     |
| handled     |             | Successfully processed connections       |
| active      |             | Currently active connections             |
| dropped     |             | Discarded connections                    |
| requests    |             | Client requests                          |
| reading     |             | Connections performing read operations   |
| writing     |             | Connections performing write operations  |
| waiting     |             | Waiting connections                      |

#### Metrics Set：req_status

| Metric name | Metric unit | Metric help description         |
|-------------|-------------|---------------------------------|
| zone_name   |             | Group category                  |
| key         |             | Group name                      |
| max_active  |             | Maximum concurrent connections  |
| max_bw      | kb          | Maximum bandwidth               |
| traffic     | kb          | Total traffic                   |
| requests    |             | Total requests                  |
| active      |             | Current concurrent connections  |
| bandwidth   | kb          | Current bandwidth               |


