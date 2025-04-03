---
id: ntp
title: Monitoring NTP
sidebar_label: NTP Monitor
keywords: [ open source monitoring tool, open source NTP monitoring tool, monitoring NTP metrics ]
---

> Collect and monitor the general performance Metrics of NTP.

**Protocol Use：NTP**

### Configuration parameter

|   Parameter name    |                                                                        Parameter help description                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                   |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                    |

### Collection Metrics

#### Metrics Set：summary

| Metric name  | Metric unit |                                 Metric help description                                  |
|--------------|-------------|------------------------------------------------------------------------------------------|
| responseTime | ms          | The time it takes for the NTP server to respond to a request).                           |
| time         | ms          | The current time reported by the NTP server).                                            |
| date         |             | The date corresponding to the current time reported by the NTP server).                  |
| offset       | ms          | The time difference between the NTP server's clock and the client's clock).              |
| delay        | ms          | The time it takes for a request to reach the NTP server and for the response to return). |
| version      |             | The version number of the NTP protocol used by the server).                              |
| mode         |             | The operating mode of the NTP server, such as client, server, or broadcast).             |
| stratum      |             | The stratumevel of the NTP server, indicating its distance from a reference clock).      |
| referenceId  |             | An identifier that indicates the reference clock or time source used by the NTP server). |
| precision    |             | The precision of the NTP server's clock, indicating its accuracy).                       |
