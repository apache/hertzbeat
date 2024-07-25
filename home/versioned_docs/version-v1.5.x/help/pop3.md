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
以qq邮箱为例【其它邮箱类似】：
    1. 点击`设置`选项
    2. 选择`账号`
    3. 找到开启SMTP/POP3/IMAP选项，并开启
    4. 得到POP3服务器域名，端口号，以及授权码【开启SMTP/POP3/IMAP服务后，qq邮箱提供】
    5. 通过POP3服务器域名，端口号，qq邮箱账号以及授权码连接POP3服务器，采集监控指标
```


### Configuration parameter

| Parameter name      | Parameter help description                                                                                                                                                |
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

| Metric name  | Metric unit | Metric help description                  |
|--------------|-------------|------------------------------------------|
| email_count  |             | Number of emails                         |
| mailbox_size | kb          | The total size of emails in the mailbox  |


