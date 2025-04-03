---
id: imap
title: Monitoring detailed mailbox info
sidebar_label: mailbox Monitor
keywords: [Open Source Monitoring System, Open Source Network Monitoring, mailbox Monitor]
---

> IMAP, or Internet Message Access Protocol, allows you to retrieve detailed information from your email server.
> You can click on `Create New QQ Email Monitoring` or `Create New Netease Email Monitoring` to configure, or select `More Actions` to import existing configurations.

### Enable IMAP Service

If you want to use this monitoring type to monitor your email information, please first enable the IMAP service in your email:

For example, in QQ Mail (other emails are similar):

1. Go to `Mail Settings`
2. Find and enable the `IMAP/SMTP option` in `General`
3. Obtain the IMAP server domain, port number, whether to use SSL, and authorization code from the help section
4. Use the above information to configure in HertzBeat and collect monitoring metrics

### Configuration Parameters

| Parameter Name      |                                         Parameter Help Description                                         |
|:--------------------|------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | IMAP mail server domain. Note ⚠️ do not include protocol headers (e.g., https://, http://).                |
| Task Name           | The name that identifies this monitoring task, which needs to be unique.                                   |
| Enable SSL          | Whether to enable SSL.                                                                                     |
| Port                | The port provided by the website.                                                                          |
| Connection Timeout  | The wait timeout for the port connection, in milliseconds, default is 6000 ms.                             |
| IMAP Email Address  | The email address to be monitored.                                                                         |
| Authorization Code  | The authorization code provided by the email server.                                                       |
| Monitoring Interval | The interval time for periodic data collection, in seconds, the minimum interval can be set to 30 seconds. |
| Binding Tags        | Classification management tags for monitoring resources.                                                   |
| Description Notes   | Additional identification and description notes for this monitoring task, users can leave notes here.      |

### Collection Metrics

Collect information on each folder in the email (custom folders can be configured), as the metrics collected for each folder are the same, only a common set of metrics is listed below

#### Metrics Collection: (Folder Name in Email)

|     Metric Name      | Metric Unit |                Metric Help Description                |
|----------------------|-------------|-------------------------------------------------------|
| Total message count  | None        | The total number of emails in this folder             |
| Recent message count | None        | The number of recently received emails in this folder |
| Unseen message count | None        | The number of unread emails in this folder            |
