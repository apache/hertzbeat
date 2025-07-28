---
title: Use the open source real-time monitoring tool HertzBeat to monitor and alert Mysql database
author: tom
author_title: tom
author_url: https://github.com/tomsun28
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4
tags: [opensource, practice]
Keywords: [Open source monitoring tool, open source database monitoring, Mysql database monitoring]
---

## Use the open source real-time monitoring tool HertzBeat to monitor and alarm the Mysql database, and it will be done in 5 minutes

### Mysql database introduction

> MySQL is an open source relational database management system developed by the Swedish company MySQL AB and a product of Oracle. MySQL is one of the most popular open source relational database management systems. In terms of WEB applications, MySQL is one of the best RDBMS (Relational Database Management System, relational database management system) application software.

### Introduction to HertzBeat

> HertzBeat is an open source, easy-to-use and friendly real-time monitoring tool that does not require Agent and has powerful custom monitoring capabilities.

- Integrate **monitoring-alarm-notification**, support monitoring of application services, databases, operating systems, middleware, cloud native, etc., threshold alarms, alarm notifications (email WeChat Dingding Feishu SMS Slack Discord Telegram).
- It configurable protocol specifications such as Http, Jmx, Ssh, Snmp, Jdbc, Prometheus, etc. You only need to configure YML to use these protocols to customize and collect any metrics you want to collect. Do you believe that you can immediately adapt to a new monitoring type such as K8s or Docker just by configuring YML?
- HertzBeat's powerful customization, multi-type support, easy expansion, and low coupling, hope to help developers and small and medium teams quickly build their own monitoring tools.

### Get the Mysql database monitoring in HertzBeat in 5 minutes

#### The premise of the operation is that you already have the Mysql environment and the HertzBeat environment

- Mysql [Installation and deployment document](https://www.runoob.com/mysql/mysql-install.html)
- HertzBeat [Installation and deployment documentation](https://hertzbeat.apache.org/docs/start/docker-deploy)

#### Add monitoring of Mysql database on the open source monitoring tool HertzBeat monitoring page

1. Click Add Mysql Monitoring

    Path: Menu -> Database Monitoring -> Mysql Database -> Add Mysql Database Monitoring

   ![HertzBeat](/img/blog/monitor-mysql-1.png)

2. Configure the parameters required for the new monitoring Mysql database

   On the monitoring page, fill in Mysql **service IP**, **monitoring port** (default 3306), **account password, etc.**, and finally click OK to add.
   For other parameters such as **collection interval**, **timeout period**, etc., please refer to [Help Documentation](https://hertzbeat.apache.org/docs/help/mysql/) <https://hertzbeat.apache.org/docs/help> /mysql/

   ![HertzBeat](/img/blog/monitor-mysql-2.png)

3. Complete ✅, now we have added the monitoring of the Mysql database, check the monitoring list to see our added items.

   ![HertzBeat](/img/blog/monitor-mysql-1.png)

4. Click **Operation**->**Monitoring Details Icon** of the monitoring list item to browse the real-time monitoring metric data of the Mysql database.

   ![HertzBeat](/img/blog/monitor-mysql-3.png)

5. Click **Monitoring History Details TAB** to browse the historical monitoring metric data chart of Mysql database📈.

   ![HertzBeat](/img/blog/monitor-mysql-4.png)

**DONE! Done! Through the above steps, in fact, it only takes one step to sum up**

- **On the HertzBeat monitoring page, configure the IP port account password and add Mysql monitoring**

:::tip
Through the above two steps, we have completed the monitoring of the Mysql database. We can view the monitoring details and metrics in HertzBeat at any time to observe its service status.
Of course, just looking at it is definitely not perfect. Monitoring is often accompanied by alarm thresholds. When the metrics of the Mysql database exceed our expectations or are abnormal, we can promptly notify our corresponding person in charge. The person in charge receives the notification and handles the problem. It is a complete monitoring and alarm process.
:::

**Next, we will demonstrate step by step how to configure the threshold alarm notification in the HertzBeat system, so that when the metrics of the Mysql database are found to be abnormal, they will be notified to us in time**

#### 3. Add Mysql database index threshold alarm in HertzBeat system

1. Configure an alarm threshold for an important metric

   Path: Menu -> Threshold Rules -> Add Threshold

   - Select the configured metric object. Mysql database monitoring is mainly about database performance and other related metrics. For example, we set the threshold for the metric `query cache hit rate` `cache` -> `query_cache_hit_rate`. When the query cache hit rate of Mysql is very low An alarm is issued when it is less than 30%.
   - Here we configure to send an alarm when the `query_cache_hit_rate<30` of this metric `cache`, the alarm level is **serious alarm**, and it will be triggered after three times, as shown in the figure below.

   ![HertzBeat](/img/blog/monitor-mysql-5.png)

   ![HertzBeat](/img/blog/monitor-mysql-6.png)

2. Add message notification recipients

   > Configure the receiver to let the alarm message know who to send and how to send it.

   Path: Menu -> Alarm Notification -> Alarm Recipient -> Add New Recipient

   Message notification methods support **email, DingTalk, WeChat Work, Feishu, WebHook, SMS**, etc. Here we take the commonly used DingTalk as an example.

   - Refer to this [Help Documentation](https://hertzbeat.apache.org/docs/help/alert_dingtalk) <https://hertzbeat.apache.org/docs/help/alert_dingtalk> to configure the robot on DingTalk and set the security custom keyword `HertzBeat`, get the corresponding `access_token` value.
   - Configure the receiver parameters in HertzBeat as follows.

   【Alarm Notification】->【New Recipient】->【Select DingTalk Robot Notification Method】->【Set DingTalk Robot ACCESS_TOKEN】->【OK】

   ![HertzBeat](/img/blog/alert-notice-1.png)

3. Configure the associated alarm notification strategy ⚠️ [Add notification strategy] -> [Associate the recipient just set] -> [OK]

   > Configure the alarm notification policy to bind the alarm message with the receiver, so that you can decide which alarms to send to whom.

   ![HertzBeat](/img/blog/alert-notice-2.png)

### Finished, now wait for the warning message to come. ding ding ding ding

```text
[HertzBeat warning notification]
Alarm target object: mysql.cahce.query_cache_hit_rate
Affiliated monitoring ID: 205540620394932
Belonging monitoring name: Mysql_localhost
Alarm level: major alarm
Alarm trigger time: 2023-02-11 21:13:44
Content details: mysql db query_cache_hit_rate is too low, now is 20.
```

## Summary

:::tip
This practical article took us to experience how to use the open source real-time monitoring tool HertzBeat to monitor Mysql database metric data. We can find that HertzBeat, which integrates `monitoring-alarm-notification`, is more convenient in operation and use, just click on the page The Mysql database can be included in the monitoring and alarm notification, and the tedious operations of deploying multiple components and writing configuration files are no longer needed.
:::

Mysql Github: <https://github.com/mysql/mysql-server>
HertzBeat Github: <https://github.com/apache/hertzbeat>

**Welcome to learn, use and star!**

> Only one docker command is needed to install and experience heartbeat:

`docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`
