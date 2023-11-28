---
id: introduce  
title: HertzBeat赫兹跳动     
sidebar_label: 介绍
slug: /
---

> 易用友好的开源实时监控告警工具，无需Agent，强大自定义监控能力。

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


## 🎡 <font color="green">介绍</font>

> [HertzBeat赫兹跳动](https://github.com/dromara/hertzbeat) 是一个拥有强大自定义监控能力，无需Agent的实时监控工具。应用服务，数据库，操作系统，中间件，云原生等监控，阈值告警，告警通知(邮件微信钉钉飞书)。  
> 我们也提供了对应的 **[SAAS版本监控云](https://console.tancloud.cn)**，中小团队和个人无需再为了监控自己的网站资源，而去部署一套繁琐的监控系统，**[登录即可免费开始](https://console.tancloud.cn)**。     
> HertzBeat 支持[自定义监控](https://hertzbeat.com/docs/advanced/extend-point) ,只用通过配置YML文件我们就可以自定义需要的监控类型和指标，来满足常见的个性化需求。   
> HertzBeat 模块化，`manager, collector, warehouse, alerter` 各个模块解耦合，方便理解与定制开发。       
> HertzBeat 支持更自由化的告警配置(计算表达式)，支持告警通知，告警模版，`邮件` `Discord` `Slack` `Telegram` `钉钉` `微信` `飞书` `短信` `Webhook` 等及时通知送达。            
> 我们正在快速迭代中，欢迎参与加入一起共建项目开源生态。

> 我们将`Http, Jmx, Ssh, Snmp, Jdbc, Prometheus`等协议规范可配置化，您仅仅只需配置YML就能使用这些协议去自定义采集任何您想要采集的指标。    
> 您相信只需配置YML就能立刻适配一个K8s或Docker等新的监控类型吗？

> `HertzBeat`的强大自定义，多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。

----   

[![hertzbeat](/img/home/1.png)](https://www.bilibili.com/video/BV1LY4y1m7rH/)

[![hertzbeat](/img/home/9.png)](https://www.bilibili.com/video/BV1LY4y1m7rH/)

----   

## 🥐 模块  

- **[manager](https://github.com/dromara/hertzbeat/tree/master/manager)** 提供监控管理,系统管理基础服务
> 提供对监控的管理，监控应用配置的管理，系统用户租户后台管理等。
- **[collector](https://github.com/dromara/hertzbeat/tree/master/collector)** 提供监控数据采集服务
> 使用通用协议远程采集获取对端指标数据。
- **[warehouse](https://github.com/dromara/hertzbeat/tree/master/warehouse)** 提供监控数据仓储服务
> 采集指标结果数据管理，数据落盘，查询，计算统计。
- **[alerter](https://github.com/dromara/hertzbeat/tree/master/alerter)** 提供告警服务
> 告警计算触发，任务状态联动，告警配置，告警通知。
- **[web-app](https://github.com/dromara/hertzbeat/tree/master/web-app)** 提供可视化控制台页面
> 监控告警系统可视化控制台前端(angular+ts+zorro)  

![hertzBeat](https://tancloud.gd2.qingstor.com/img/docs/hertzbeat-stru.svg)   

----

![hertzBeat](/img/docs/hertzbeat-arch.png)    

## ⛄ Supported

- [网站监控](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-website.yml), [端口可用性](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-port.yml),
  [Http Api](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-api.yml), [Ping连通性](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-ping.yml),
  [Jvm](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-jvm.yml), [SiteMap全站](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-fullsite.yml),
  [Ssl证书](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-ssl_cert.yml), [SpringBoot](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-springboot2.yml),
  [FTP服务器](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-ftp.yml)
- [Mysql](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-mysql.yml), [PostgreSQL](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-postgresql.yml),
  [MariaDB](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-mariadb.yml), [Redis](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-redis.yml),
  [ElasticSearch](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-elasticsearch.yml), [SqlServer](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-sqlserver.yml),
  [Oracle](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-oracle.yml), [MongoDB](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-mongodb.yml),
  [达梦](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-dm.yml), [OpenGauss](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-opengauss.yml),
  [ClickHouse](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-clickhouse.yml), [IoTDB](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-iotdb.yml)
- [Linux](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-linux.yml), [Ubuntu](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-ubuntu.yml),
  [CentOS](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-centos.yml), [Windows](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-windows.yml)
- [Tomcat](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-tomcat.yml), [Nacos](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-nacos.yml),
  [Zookeeper](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-zookeeper.yml), [RabbitMQ](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-rabbitmq.yml),
  [Flink](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-flink.yml), [Kafka](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-kafka.yml),
  [ShenYu](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-shenyu.yml), [DynamicTp](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-dynamic_tp.yml),
  [Jetty](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-jetty.yml), [ActiveMQ](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-activemq.yml)
- [Kubernetes](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-kubernetes.yml), [Docker](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-docker.yml)
- 和更多您的自定义监控。
- 通知支持 `Discord` `Slack` `Telegram` `邮件` `钉钉` `微信` `飞书` `短信` `Webhook`。
