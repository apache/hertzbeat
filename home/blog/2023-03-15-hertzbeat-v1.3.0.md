---
title: Open source real-time monitoring tool HertzBeat v1.3.0 released, online customization is coming
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system, Linux monitoring]
---

Website: hertzbeat.com | tancloud.cn

![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a9629ef5bb6e486cacddb899f1495c6e~tplv-k3u1fbpfcp-zoom-1.image)

### What is HertzBeat?

> HertzBeat is an open source real-time monitoring and alerting tool with powerful custom monitoring capabilities and no Agent required.
> It supports monitoring of application services, database, operating system, middleware, cloud native, network and other metrics, and threshold alert notification in one step.
> Support more liberal threshold rules (calculation expressions), `email` `Discord` `Slack` `Telegram` `Pegging` `WeChat` `FlyBook` `SMS` `Webhook` and other ways to timely delivery.
>
> We have made the protocol specifications such as `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` configurable so that you can simply configure `YML` to use these protocols to customize the collection of any metrics you want.
>
> Do you believe that you can immediately adapt a new monitoring type such as K8s or Docker just by defining YML?

**Github: <https://github.com/apache/hertzbeat>**

**Gitee: <https://gitee.com/hertzbeat/hertzbeat>**

### v1.3.0 release is here

After a month of iterations, HertzBeat v1.3.0 was officially released last weekend, **Recommended upgrade**!

- Hertzbeat has powerful custom monitoring capabilities, all our supported monitoring types are mapped to a YML. This time we bring custom monitoring pagination, welcome to use and share your own monitoring type definition.

- **support for monitoring network switches**.
  hertzbeat supported snmp protocol long time ago, windows monitoring is monitored by snmp protocol, this version we not only support more windows performance metrics, but also support snmp walk, adapt several common network switches monitoring, welcome to contribute more types and metrics to the community.

- **Support for monitoring redis clusters and more database metrics**.
  Community contributors have contributed extended metrics for redis clusters and multiple databases, enriching the performance metrics data.

- **Support iotdb1.0 storage, dependency-free mode**
  and more new features welcome to explore

- Fix several bugs, better documentation, refactored code.

---
Only one docker command is needed to install and experience heartbeat

`docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`

Thanks to the hertzbeat contributors for their contributions! 👍👍👍

We are in desperate need of contributors for various aspects of test cases, new application monitoring, documentation, etc. Contributors are very welcome to join.

Upgrade note ⚠️.

For users who previously used iotdb or tdengine to store metrics data, you need to modify application.yml to disable JPA storage `warehouse.store.jpa.enabled` as follows:

Modify `application.yml` and set `warehouse.store.jpa.enabled` parameter to false

```yaml
warehouse:
  store:
    jpa:
      enabled: false
```

Execute SQL script

```text
ALTER table hzb_monitor modify job_id bigint default null;
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
