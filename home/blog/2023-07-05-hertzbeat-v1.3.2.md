---
title: Open source monitoring HertzBeat v1.3.2 released, Easier to use 
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

### v1.3.2

Hi guys! Major release. HertzBeat v1.3.2 has published.

**This delightful version came out of the hard work of 27 friends. Thank them! Love 💗**

In this version, we support new monitoring types and metrics for **freebsd, debian, opensuse, redhat, apache doris**, etc.

- Support WEB page configuration mail server, replace the previous file configuration
- Supports alarm convergence. If repeated alarms are frequently sent, it will be resolved immediately with alarm convergence
- The public message queue supports Kafka. In addition to our default built-in memory message queue, it also supports an external Kafka message queue to improve system performance.
- The new monitoring center page aggregates all monitoring types, no need to switch back and forth like before.
- Support label group display, group and mark monitors of the same business category for unified management.
- Threshold configuration not only has expressions, but also supports a more user-friendly operation UI. The previous expressions were not friendly to newcomers and were prone to errors. Now you can directly operate the UI, and it can switch between expressions.
- There are many more functions such as HTTP ipv6.

Fixed a large number of BUG, improved the document code, and improved the overall stability and usability. More new features are welcome to explore!

Let's Try Now!

Only one docker command is needed to install and experience hertzbeat：

`docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`

```or use quay.io (if dockerhub network connect timeout)```

```docker run -d -p 1157:1157 --name hertzbeat quay.io/tancloud/hertzbeat```

---

Upgrade Note⚠️.

For h2 database users, sholud exec sql below:

```sql
ALTER TABLE HZB_PARAM DROP CONSTRAINT CONSTRAINT_82;;
```

How to Enable H2 WEB Console:
Modify `application.yml` and restart, access `ip:1157/h2-console`

```yaml
spring:
  h2:
    console:
      path: /h2-console
      enabled: true
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
