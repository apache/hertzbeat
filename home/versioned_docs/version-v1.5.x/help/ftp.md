---
id: ftp
title: Monitoring FTP
sidebar_label: FTP Monitor
keywords: [ open source monitoring tool, open source ftp server monitoring tool, monitoring ftp metrics ]
---

> Collect and monitor the general performance Metrics of FTP server.

**Protocol Use：FTP**

### Configuration parameter

|   Parameter name    |                                                Parameter help description                                                |
|---------------------|--------------------------------------------------------------------------------------------------------------------------|
| Target Host         | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: ftp://).                                         |
| Monitoring name     | Identify the name of this monitoring, The name needs to be unique.                                                       |
| Port                | Port provided by FTP server ,default is 21.                                                                              |
| Direction           | Directory on the FTP server.                                                                                             |
| Timeout             | Timeout for connecting to FTP server.                                                                                    |
| Username            | Username for connecting to the FTP server, optional.                                                                     |
| Password            | Password for connecting to the FTP server, optional.                                                                     |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds. |
| Bind Tags           | Used to classify and manage monitoring resources.                                                                        |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here.                  |

### Collection Metrics

#### Metrics Set：Basic

|  Metric name  | Metric unit |                 Metric help description                  |
|---------------|-------------|----------------------------------------------------------|
| Is Active     | none        | Check if the directory exists and has access permission. |
| Response Time | ms          | Response Time                                            |
