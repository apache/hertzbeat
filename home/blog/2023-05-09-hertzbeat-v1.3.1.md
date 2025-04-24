---
title: Open source real-time monitoring tool HertzBeat v1.3.1 released
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system, Linux monitoring]
---

Website: hertzbeat.com | tancloud.cn

![HertzBeat](/img/home/0.png)

### What is HertzBeat?

> [HertzBeat](https://github.com/apache/hertzbeat) is an open source, real-time monitoring system with custom-monitoring and agentLess.
> **Monitoring+Alarm+Notify** all in one. Support monitoring web service, database, os, middleware, cloud-native, network and more.
> Easy to use, full web-based operation, monitoring and alerting at the click of a mouse, zero learning cost.
> More flexible threshold rule, timely notification delivery by `Discord` `Slack` `Telegram` `Email` `DingDing` `WeChat` `FeiShu` `Webhook` `SMS`.
>
> We make protocols such as `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` configurable, and you only need to configure `YML` online to collect any metrics you want.
> Do you believe that you can immediately adapt a new monitoring type such as K8s or Docker just by configuring online?
>
> `HertzBeat`'s powerful custom-define, multi-type support, easy expansion, low coupling, hope to help developers and micro teams to quickly build their own monitoring system.
> We also provide **[Monitoring SaaS Cloud](https://console.tancloud.cn)**, users no longer need to deploy a cumbersome monitoring system in order to monitor resources. **[Get started for free](https://console.tancloud.cn)**.

**Github: <https://github.com/apache/hertzbeat>**

**Gitee: <https://gitee.com/hertzbeat/hertzbeat>**

### v1.3.1 release is here

Hi guys! Major release. HertzBeat v1.3.1 is coming. **So excited that more than 30 friends have contributed this version.**.
We support **greptimeDB, tedngine3.0 and opengauss influxdb** to store to metrics data.
New feature **monitoring export and import by excel json yaml** ,  **alert silence**,  **new monitoring template** and more.
Support monitoring EulerOS metrics and SpringBoot3 metrics. Fixed several bugs, imporved document and improved the overall stable usability.

Let's Try Now!

Only one docker command is needed to install and experience hertzbeat：
`docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`

## Upgrade Note⚠️

If use tdengine before, please upgrade tdengine to 3.0+

Please Run SQL Script When Upgrade.

```text
ALTER table hzb_alert_define modify field varchar(255) default null;
COMMIT;
```

---

## ⛄ Supported

- Site Monitor, Port Availability, Http Api, Ping Connectivity, Jvm, SiteMap Full Site, Ssl Certificate, SpringBoot, FTP Server
- Mysql, PostgreSQL, MariaDB, Redis, ElasticSearch, SqlServer, Oracle, MongoDB, Damon, OpenGauss, ClickHouse, IoTDB, Redis Cluster
- Linux, Ubuntu, CentOS, Windows
- Tomcat, Nacos, Zookeeper, RabbitMQ, Flink, Kafka, ShenYu, DynamicTp, Jetty, ActiveMQ
- Kubernetes, Docker
- Huawei Switch, HPE Switch, TP-LINK Switch, Cisco Switch
- and more for your custom monitoring.
- Notifications support `Discord` `Slack` `Telegram` `Mail` `Pinning` `WeChat` `FlyBook` `SMS` `Webhook`.

---

**Github: <https://github.com/apache/hertzbeat>**
**Gitee: <https://gitee.com/hertzbeat/hertzbeat>**
