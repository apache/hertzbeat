---
id: pop3  
title: Monitoring POP3      
sidebar_label: POP3 Monitor
keywords: [open source monitoring tool, open source java monitoring tool, monitoring POP3 metrics]
---

> Collect and monitor the general performance Metrics of POP3.

**Protocol Use：POP3**

### Enable POP3 Service

If you want to monitor information in 'POP3' with this monitoring type, you just need to open `POP3` service in your mail server.

**1、Open `POP3` Service:**

```text
Using QQ Mail as an example [similar for other email services]:
    1. Click the "Settings" option
    2. Select "Account"
    3. Find the option to enable SMTP/POP3/IMAP, and turn it on
    4. Obtain the POP3 server domain name, port number, and authorization code [provided by QQ Mail after enabling SMTP/POP3/IMAP services]
    5. Connect to the POP3 server using the POP3 server domain name, port number, QQ email account, and authorization code to collect monitoring metrics
```

### Configuration parameter

|   Parameter name    |                                                                        Parameter help description                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Port                | Port provided by POP3                                                                                                                                                     |
| SSL                 | POP3 If enabled SSL                                                                                                                                                       |
| Timeout             | Allow collection response time                                                                                                                                            |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                   |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                    |

### Collection Metrics

#### Metrics Set：email_status

| Metric name  | Metric unit |         Metric help description         |
|--------------|-------------|-----------------------------------------|
| email_count  |             | Number of emails                        |
| mailbox_size | kb          | The total size of emails in the mailbox |
