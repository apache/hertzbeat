---
id: introduce  
title: HertzBeat     
sidebar_label: Introduce
slug: /
---

> An open source, real-time monitoring tool with custom-monitor and agentless.  

[![discord](https://img.shields.io/badge/chat-on%20discord-brightgreen)](https://discord.gg/Fb6M73htGr)
[![Gitter](https://badges.gitter.im/hertzbeat/community.svg)](https://gitter.im/hertzbeat/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
[![QQ](https://img.shields.io/badge/qq-236915833-orange)](https://jq.qq.com/?_wv=1027&k=aVIVB2K9)
![hertzbeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/web-monitor.svg)
![hertzbeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/ping-connect.svg)
![hertzbeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/port-available.svg)
![hertzbeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/database-monitor.svg)
![hertzbeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/os-monitor.svg)
![hertzbeat](https://img.shields.io/badge/monitor-cloud%20native-brightgreen)
![hertzbeat](https://img.shields.io/badge/monitor-middleware-blueviolet)
![hertzbeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/custom-monitor.svg)
![hertzbeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/threshold.svg)
![hertzbeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/alert.svg)



## 🎡 <font color="green">Introduction</font>

> [HertzBeat](https://github.com/dromara/hertzbeat) is an open source, real-time monitoring tool with custom-monitor and agentless. Support web service, database, os, middleware and more.          
> We also provide **[Monitoring Cloud For Saas](https://console.tancloud.cn)**, people no longer need to deploy a cumbersome monitoring tool in order to monitor their website resources. **[Sign in to get started for free](https://console.tancloud.cn)**.   
> HertzBeat supports more liberal threshold alarm configuration (calculation expression), supports alarm notification, alarm template, `Discord` `Slack` `Telegram` `Email` `DingDing` `WeChat` `FeiShu` `Webhook` `SMS` and more.  
> Most important is HertzBeat supports [Custom Monitoring](https://hertzbeat.com/docs/advanced/extend-point), just by configuring the YML file, we can customize the monitoring types and metrics what we need.      
> HertzBeat is modular, `manager, collector, scheduler, warehouse, alerter` modules are decoupled for easy understanding and custom development.   
> Welcome to join us to build hertzbeat together.  

> `HertzBeat`'s multi-type support, easy expansion, low coupling, hope to help developers and micro teams to quickly build their own monitoring tool.

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

![hertzBeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat/home/static/img/docs/hertzbeat-stru-en.svg)     

![hertzBeat](/img/docs/hertzbeat-arch.png)  

## ⛄ Supported

- [Website](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-website.yml), [Port Telnet](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-port.yml),
  [Http Api](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-api.yml), [Ping Connect](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-ping.yml),
  [Jvm](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-jvm.yml), [SiteMap](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-fullsite.yml),
  [Ssl Certificate](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-ssl_cert.yml), [SpringBoot](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-springboot2.yml),
  [FTP Server](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-ftp.yml)
- [Mysql](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-mysql.yml), [PostgreSQL](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-postgresql.yml),
  [MariaDB](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-mariadb.yml), [Redis](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-redis.yml),
  [ElasticSearch](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-elasticsearch.yml), [SqlServer](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-sqlserver.yml),
  [Oracle](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-oracle.yml), [MongoDB](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-mongodb.yml),
  [DM](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-dm.yml), [OpenGauss](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-opengauss.yml),
  [ClickHouse](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-clickhouse.yml), [IoTDB](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-iotdb.yml)
- [Linux](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-linux.yml), [Ubuntu](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-ubuntu.yml),
  [CentOS](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-centos.yml), [Windows](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-windows.yml)
- [Tomcat](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-tomcat.yml), [Nacos](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-nacos.yml),
  [Zookeeper](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-zookeeper.yml), [RabbitMQ](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-rabbitmq.yml),
  [Flink](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-flink.yml), [Kafka](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-kafka.yml),
  [ShenYu](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-shenyu.yml), [DynamicTp](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-dynamic_tp.yml),
  [Jetty](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-jetty.yml), [ActiveMQ](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-activemq.yml)
- [Kubernetes](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-kubernetes.yml), [Docker](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-docker.yml)
- And More Your Custom Define.
- Notified Support `Discord` `Slack` `Telegram` `Email` `DingDing` `WeChat` `FeiShu` `Webhook` `SMS`.

