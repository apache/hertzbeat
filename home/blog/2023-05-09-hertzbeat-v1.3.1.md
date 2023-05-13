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


![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a9629ef5bb6e486cacddb899f1495c6e~tplv-k3u1fbpfcp-zoom-1.image)



### What is HertzBeat?

> HertzBeat is an open source real-time monitoring and alerting tool with powerful custom monitoring capabilities and no Agent required.     
> It supports monitoring of application services, database, operating system, middleware, cloud native, network and other metrics, and threshold alert notification in one step.   
> Support more liberal threshold rules (calculation expressions), `email` `Discord` `Slack` `Telegram` `Pegging` `WeChat` `FlyBook` `SMS` `Webhook` and other ways to timely delivery.

> We have made the protocol specifications such as `Http,Jmx,Ssh,Snmp,Jdbc` configurable so that you can simply configure `YML` to use these protocols to customize the collection of any metrics you want.

> Do you believe that you can immediately adapt a new monitoring type such as K8s or Docker just by defining YML?


![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4236e748f5ac4352b7cf4bb65ccf97aa~tplv-k3u1fbpfcp-zoom-1.image)


**Github: https://github.com/dromara/hertzbeat**

**Gitee: https://gitee.com/dromara/hertzbeat**

### v1.3.1 release is here

Hi guys! Major release. HertzBeat v1.3.1 is coming. **So excited that more than 30 friends have contributed this version.**.   
We support **greptimeDB, tedngine3.0 and opengauss influxdb** to store to metrics data.    
New feature **monitoring export and import by excel json yaml** ,  **alert silence**,  **new monitoring template** and more.    
Support monitoring EulerOS metrics and SpringBoot3 metrics. Fixed several bugs, imporved document and improved the overall stable usability.

Let's Try Now!

Only one docker command is needed to install and experience hertzbeat：
`docker run -d -p 1157:1157 --name hertzbeat tancloud/hertzbeat`

## Upgrade Note⚠️.

If use tdengine before, please upgrade tdengine to 3.0+

Please Run SQL Script When Upgrade.
```
ALTER table hzb_alert_define modify field varchar(255) default null;
COMMIT;
```

----

## ⛄ Supported

- Site Monitor, Port Availability, Http Api, Ping Connectivity, Jvm, SiteMap Full Site, Ssl Certificate, SpringBoot, FTP Server
- Mysql, PostgreSQL, MariaDB, Redis, ElasticSearch, SqlServer, Oracle, MongoDB, Damon, OpenGauss, ClickHouse, IoTDB, Redis Cluster
- Linux, Ubuntu, CentOS, Windows
- Tomcat, Nacos, Zookeeper, RabbitMQ, Flink, Kafka, ShenYu, DynamicTp, Jetty, ActiveMQ
- Kubernetes, Docker
- Huawei Switch, HPE Switch, TP-LINK Switch, Cisco Switch
- and more for your custom monitoring.
- Notifications support `Discord` `Slack` `Telegram` `Mail` `Pinning` `WeChat` `FlyBook` `SMS` `Webhook`.

----

**Github: https://github.com/dromara/hertzbeat**      
**Gitee: https://gitee.com/dromara/hertzbeat**
