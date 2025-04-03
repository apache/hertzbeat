---
id: smtp
title: Monitoring SMTP
sidebar_label: SMTP Monitor
keywords: [ open source monitoring tool, open source SMTP monitoring tool, monitoring SMTP metrics ]
---

> Collect and monitor the general performance Metrics of SMTP.

```text
Determine whether the server is available through the hello command in SMTP
```

> see <https://datatracker.ietf.org/doc/html/rfc821#page-13>

**Protocol Use：SMTP**

### Configuration parameter

|   Parameter name    |                                                                        Parameter help description                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Port                | Port provided by SMTP                                                                                                                                                     |
| Email               | Your email name, parameters for the hello command                                                                                                                         |
| Timeout             | Allow collection response time                                                                                                                                            |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                   |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                    |

### Collection Metrics

#### Metrics Set：summary

| Metric name  | Metric unit |                    Metric help description                     |
|--------------|-------------|----------------------------------------------------------------|
| responseTime | ms          | The time it takes for the SMTP server to respond to a request. |
| response     |             | Response Status.                                               |
| smtpBanner   |             | Banner of SMTP server.                                         |
| heloInfo     |             | Response information returned by helo.                         |
