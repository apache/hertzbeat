---
title: HertzBeat v1.4.2 版本发布，自定义消息通知模板 
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system, Linux monitoring]
---

哈喽大家好，开源实时监控 HertzBeat 新版本 v1.4.2 发布，欢迎了解使用。

![hertzBeat](/img/home/0.png)

### 总结起来如下

- **消息通知模板特性，开源之夏课题**
- **支持华为云OBS存储监控模板文件**
- **支持MQTT消息服务器 emqx 监控**
- **支持对 udp 端口可用性监控**
- **更多的特性功能支持和BUG修复**
- **安装包内置JDK一键启动**

**更多的特性和BUG修复欢迎使用探索，1.4.2 版本共有 13 位社区小伙伴们参与，感谢他们的贡献❤️**

### 什么是 HertzBeat?

[HertzBeat 赫兹跳动](https://github.com/apache/hertzbeat) 是一个拥有强大自定义监控能力，高性能集群，无需 Agent 的开源实时监控告警系统。

### 特点

- 集 **监控+告警+通知** 为一体，支持对应用服务，应用程序，数据库，缓存，操作系统，大数据，中间件，Web服务器，云原生，网络，自定义等监控阈值告警通知一步到位。
- 易用友好，无需 `Agent`，全 `WEB` 页面操作，鼠标点一点就能监控告警，无需学习成本。
- 将 `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` 等协议规范可配置化，只需在浏览器配置监控模板 `YML` 就能使用这些协议去自定义采集想要的指标。您相信只需简单配置即可快速适配一款 `K8s` 或 `Docker` 等新的监控类型吗？
- 高性能，支持多采集器集群横向扩展，支持多隔离网络监控，云边协同。
- 灵活的告警阈值规则，`邮件` `Discord` `Slack` `Telegram` `钉钉` `微信` `飞书` `短信` `Webhook` `Server酱` 等方式消息及时送达。

> `HertzBeat`的强大自定义，多类型支持，高性能，易扩展，低耦合，希望能帮助开发者和团队快速搭建自有监控系统。

![hertzBeat](/img/docs/hertzbeat-arch.png)

**Github: <https://github.com/apache/hertzbeat>**

**Gitee: <https://gitee.com/hertzbeat/hertzbeat>**

### 尝试部署

1. `docker` 环境仅需一条命令即可开始

    ```docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat```

    ```或者使用 quay.io (若 dockerhub 网络链接超时)```

    ```docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat quay.io/tancloud/hertzbeat```

2. 浏览器访问 `http://localhost:1157` 即可开始，默认账号密码 `admin/hertzbeat`

3. 部署采集器集群

    ```shell
    docker run -d -e IDENTITY=custom-collector-name -e MANAGER_HOST=127.0.0.1 -e MANAGER_PORT=1158 --name hertzbeat-collector apache/hertzbeat-collector
    ```

   - `-e IDENTITY=custom-collector-name` : 配置此采集器的唯一性标识符名称，多个采集器名称不能相同，建议自定义英文名称。
   - `-e MANAGER_HOST=127.0.0.1` : 配置连接主HertzBeat服务的对外IP。
   - `-e MANAGER_PORT=1158` : 配置连接主HertzBeat服务的对外端口，默认1158。

更多配置详细步骤参考 [通过Docker方式安装HertzBeat](https://hertzbeat.apache.org/docs/start/docker-deploy)

---

## ⛄ 已支持

> 我们将监控采集类型(mysql,jvm,k8s)都定义为yml监控模板，用户可以导入这些模板来支持对应类型的监控!
> 欢迎大家一起贡献你使用过程中自定义的通用监控类型监控模板。

- Site Monitor, Port Availability, Http Api, Ping Connectivity, Jvm, SiteMap Full Site, Ssl Certificate, SpringBoot, FTP Server
- Mysql, PostgreSQL, MariaDB, Redis, ElasticSearch, SqlServer, Oracle, MongoDB, Damon, OpenGauss, ClickHouse, IoTDB, Redis Cluster
- Linux, Ubuntu, CentOS, Windows
- Tomcat, Nacos, Zookeeper, RabbitMQ, Flink, Kafka, ShenYu, DynamicTp, Jetty, ActiveMQ
- Kubernetes, Docker
- Huawei Switch, HPE Switch, TP-LINK Switch, Cisco Switch
- and more for your custom monitoring.
- Notifications support `Discord` `Slack` `Telegram` `Mail` `Pinning` `WeChat` `FlyBook` `SMS` `Webhook`.
- 和更多自定义监控模板。
- 通知支持 `Discord` `Slack` `Telegram` `邮件` `钉钉` `微信` `飞书` `短信` `Webhook` `Server酱`。

---

**Github: <https://github.com/apache/hertzbeat>**
**Gitee: <https://gitee.com/hertzbeat/hertzbeat>**
