---
id: introduce  
title: HertzBeat     
sidebar_label: Introduce
slug: /
---

> An open-source, real-time monitoring system with custom monitoring, high performance cluster and agentless capabilities. | 易用友好的开源实时监控告警系统，无需Agent，高性能集群，强大自定义监控能力.

[![Discord](https://img.shields.io/badge/Chat-Discord-7289DA?logo=discord)](https://discord.gg/Fb6M73htGr)
[![Reddit](https://img.shields.io/badge/Reddit-Community-7289DA?logo=reddit)](https://www.reddit.com/r/hertzbeat/)
[![Twitter](https://img.shields.io/twitter/follow/hertzbeat1024?logo=twitter)](https://twitter.com/hertzbeat1024)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/8139/badge)](https://www.bestpractices.dev/projects/8139)
[![Docker Pulls](https://img.shields.io/docker/pulls/tancloud/hertzbeat?style=%20for-the-badge&logo=docker&label=DockerHub%20Download)](https://hub.docker.com/repository/docker/tancloud/hertzbeat/general)
[![Artifact Hub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/hertzbeat)](https://artifacthub.io/packages/search?repo=hertzbeat)
[![QQ](https://img.shields.io/badge/QQ-236915833-orange)](https://jq.qq.com/?_wv=1027&k=aVIVB2K9)
[![YouTube Channel Subscribers](https://img.shields.io/youtube/channel/subscribers/UCri75zfWX0GHqJFPENEbLow?logo=youtube&label=YouTube%20Channel)](https://www.youtube.com/channel/UCri75zfWX0GHqJFPENEbLow)



## 🎡 <font color="green">Introduction</font>

[HertzBeat](https://github.com/dromara/hertzbeat) is an open source, real-time monitoring system with custom monitoring, high performance cluster and agentless capabilities.

### Features

* Combines **monitoring, alarm, and notification** features into one platform, and supports monitoring for web service, program, database, cache, os, webserver, middleware, bigdata, cloud-native, network, custom and more.
* Easy to use and agentless, web-based and with one-click monitoring and alerting, zero learning curve.
* Makes protocols such as `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` configurable, allowing you to collect any metrics by simply configuring the template `YML` file online. Imagine being able to quickly adapt to a new monitoring type like K8s or Docker simply by configuring online with HertzBeat.
* Compatible with the `Prometheus` ecosystem and more, can monitoring what `Prometheus` can monitoring with few clicks on webui.
* High performance, supports horizontal expansion of multi-collector clusters, multi-isolated network monitoring and cloud-edge collaboration.
* Provides flexible alarm threshold rules and timely notifications delivered via  `Discord` `Slack` `Telegram` `Email` `Dingtalk` `WeChat` `FeiShu` `Webhook` `SMS` `ServerChan`.


> HertzBeat's powerful customization, multi-type support, high performance, easy expansion, and low coupling, aims to help developers and teams quickly build their own monitoring system.      
> We also provide **[SaaS Monitoring Cloud](https://console.tancloud.cn)**, users no longer need to deploy a cumbersome monitoring system to monitor their resources. **[Get started online for free](https://console.tancloud.cn)**.


----   


[![hertzbeat](/img/home/1.png)](https://www.bilibili.com/video/BV1LY4y1m7rH/)

[![hertzbeat](/img/home/9.png)](https://www.bilibili.com/video/BV1LY4y1m7rH/)

----   

## 🥐 Architecture

- **[manager](https://github.com/dromara/hertzbeat/tree/master/manager)** Provide monitoring management, system management basic services.
> Provides monitoring management, monitoring configuration management, system user management, etc.
- **[collector](https://github.com/dromara/hertzbeat/tree/master/collector)** Provide metrics data collection services.
> Use common protocols to remotely collect and obtain peer-to-peer metrics data.
- **[scheduler](https://github.com/dromara/hertzbeat/tree/master/scheduler)** Provide monitoring task scheduling service.
> Collection task management, scheduling and distribution of one-time tasks and periodic tasks.
- **[warehouse](https://github.com/dromara/hertzbeat/tree/master/warehouse)** Provide monitoring data warehousing services.
> Metrics data management, data query, calculation and statistics.
- **[alerter](https://github.com/dromara/hertzbeat/tree/master/alerter)** Provide alert service.
> Alarm calculation trigger, monitoring status linkage, alarm configuration, and alarm notification.
- **[web-app](https://github.com/dromara/hertzbeat/tree/master/web-app)** Provide web ui.
> Angular Web UI.   

![hertzBeat](/img/docs/hertzbeat-arch.png)  

![hertzBeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat/home/static/img/docs/hertzbeat-stru-en.svg)     


## ⛄ Supported

- [Website](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-website.yml), [Port Telnet](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-port.yml),
  [Http Api](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-api.yml), [Ping Connect](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-ping.yml),
  [Jvm](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-jvm.yml), [SiteMap](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-fullsite.yml),
  [Ssl Certificate](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-ssl_cert.yml), [SpringBoot2](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-springboot2.yml),
  [FTP Server](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-ftp.yml), [SpringBoot3](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-springboot3.yml),
  [Udp Port](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-udp.yml), [Dns](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-dns.yml),
  [Pop3](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-pop3.yml), [Ntp](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-ntp.yml),
  [Api Code](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-api_code.yml), [Smtp](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-smtp.yml),
  [Nginx](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-nginx.yml)
- [Mysql](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-mysql.yml), [PostgreSQL](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-postgresql.yml),
  [MariaDB](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-mariadb.yml), [Redis](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-redis.yml),
  [ElasticSearch](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-elasticsearch.yml), [SqlServer](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-sqlserver.yml),
  [Oracle](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-oracle.yml), [MongoDB](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-mongodb.yml),
  [DM](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-dm.yml), [OpenGauss](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-opengauss.yml),
  [ClickHouse](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-clickhouse.yml), [IoTDB](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-iotdb.yml),
  [Redis Cluster](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-redis_cluster.yml), [Redis Sentinel](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-redis_sentinel.yml)
  [Doris BE](https://github.com/dromara/hertzbeat/blob/master/manager/src/main/resources/define/app-doris_be.yml), [Doris FE](https://github.com/dromara/hertzbeat/blob/master/manager/src/main/resources/define/app-doris_fe.yml),
  [Memcached](https://github.com/dromara/hertzbeat/blob/master/manager/src/main/resources/define/app-memcached.yml), [NebulaGraph](https://github.com/dromara/hertzbeat/blob/master/manager/src/main/resources/define/app-nebulaGraph.yml)
- [Linux](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-linux.yml), [Ubuntu](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-ubuntu.yml),
  [CentOS](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-centos.yml), [Windows](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-windows.yml),
  [EulerOS](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-euleros.yml), [Fedora CoreOS](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-coreos.yml),
  [OpenSUSE](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-opensuse.yml), [Rocky Linux](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-rockylinux.yml),
  [Red Hat](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-redhat.yml), [FreeBSD](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-freebsd.yml),
  [AlmaLinux](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-almalinux.yml), [Debian Linux](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-debian.yml)
- [Tomcat](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-tomcat.yml), [Nacos](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-nacos.yml),
  [Zookeeper](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-zookeeper.yml), [RabbitMQ](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-rabbitmq.yml),
  [Flink](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-flink.yml), [Kafka](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-kafka.yml),
  [ShenYu](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-shenyu.yml), [DynamicTp](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-dynamic_tp.yml),
  [Jetty](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-jetty.yml), [ActiveMQ](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-activemq.yml),
  [Spring Gateway](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-spring_gateway.yml), [EMQX MQTT](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-emqx.yml),
  [AirFlow](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-airflow.yml), [Hive](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-hive.yml),
  [Spark](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-spark.yml), [Hadoop](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-hadoop.yml)
- [Kubernetes](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-kubernetes.yml), [Docker](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-docker.yml)
- [CiscoSwitch](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-cisco_switch.yml), [HpeSwitch](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-hpe_switch.yml),
  [HuaweiSwitch](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-huawei_switch.yml), [TpLinkSwitch](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-tplink_switch.yml),
  [H3cSwitch](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-h3c_switch.yml)
- And More Your Custom Define.
- Notified Support `Discord` `Slack` `Telegram` `Email` `DingDing` `WeChat` `FeiShu` `Webhook` `SMS`.

