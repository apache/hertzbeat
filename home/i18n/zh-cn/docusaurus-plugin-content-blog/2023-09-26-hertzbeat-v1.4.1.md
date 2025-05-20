---
title: 更好的用户体验, 开源实时监控 HertzBeat v1.4.1 发布
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system, Linux monitoring]
---

哈喽大家好，时间很快两个月又过去了，HertzBeat 经过近两个月的迭代终于发布了 v1.4.1 版本。为什么是终于，因为有点难哈哈。我们参考 rocketmq 重构了 netty 的 server client 端模块，重构了采集器集群调度。比起上一版本有了更优雅的通讯代码，更完善全面的集群。
采集任务一致性hash调度，集群心跳保活，断开主动重连，主动上线下线，主动停机等等这些都有。设计了新的控制台登陆界面和欢迎页面，支持了采集器集群的UI管理，合并了开源之夏两位同学的帮助提示头特性和阈值表达式特性，很多用户需要的监控指标名称国际化等等，最重要的当然是修复若干BUG，体验下来确实增强了用户体验。

![hertzBeat](/img/home/0.png)

### 总结起来如下

- **重构netty client server, 采集器集群调度** @Ceilzcx @tomsun28
- **采集器集群的UI界面管理** @Ceilzcx @tomsun28
- **功能页面帮助信息模块和阈值表达式增强** 开源之夏和GLCC课题 @YutingNie @mikezzb
- **新的控制台登陆界面和欢迎页面**
- **监控指标名称国际化** 用户可以看指标的中英文名称啦，欢迎一起完善监控模板里面的i18n国际化资源
- **支持kubernetes helm charts一键部署** 见 <https://artifacthub.io/packages/search?repo=hertzbeat>

**更多的特性和BUG修复，稳定性提示** 感谢 @zqr10159 @Carpe-Wang @luxx-lq @l646505418 @LINGLUOJUN @luelueking @qyaaaa @novohit @gcdd1993

### 上效果图

- 新的登陆页面UI

  <img width="1952" alt="image" src="https://github.com/apache/hertzbeat/assets/24788200/5bc5015a-9343-472d-9754-6b06b9138893"/>

  <img width="1950" alt="image" src="https://github.com/apache/hertzbeat/assets/24788200/71a29284-9cad-4ed2-983a-50430ddb1e2f"/>

- 支持采集器集群管理

<img width="1943" alt="image" src="https://github.com/apache/hertzbeat/assets/24788200/ba79f743-a450-4b01-adf0-5f15f3722c19"/>

<img width="1901" alt="image" src="https://github.com/apache/hertzbeat/assets/24788200/b090ec18-5aae-444e-9ef6-e62fd1d8d239"/>

- 友好的帮助文档头

<img width="1942" alt="image" src="https://github.com/apache/hertzbeat/assets/24788200/c635fab6-504b-47de-9b7e-0c2df86f7e6a"/>

- 监控指标名称国际化

<img width="1802" alt="image" src="https://github.com/apache/hertzbeat/assets/24788200/d5c74647-6c18-4b12-b858-f29cf1c61661"/>

### 什么是 HertzBeat?

[HertzBeat 赫兹跳动](https://github.com/apache/hertzbeat) 是一个拥有强大自定义监控能力，高性能集群，无需 Agent 的开源实时监控告警系统。

### 特点

- 集 **监控+告警+通知** 为一体，支持对应用服务，应用程序，数据库，缓存，操作系统，大数据，中间件，Web服务器，云原生，网络，自定义等监控阈值告警通知一步到位。
- 易用友好，无需 `Agent`，全 `WEB` 页面操作，鼠标点一点就能监控告警，零上手学习成本。
- 将 `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` 等协议规范可配置化，只需在浏览器配置监控模板 `YML` 就能使用这些协议去自定义采集想要的指标。您相信只需配置下就能立刻适配一款 `K8s` 或 `Docker` 等新的监控类型吗？
- 高性能，支持多采集器集群横向扩展，支持多隔离网络监控，云边协同。
- 自由的告警阈值规则，`邮件` `Discord` `Slack` `Telegram` `钉钉` `微信` `飞书` `短信` `Webhook` 等方式消息及时送达。

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

更多配置详细步骤参考 [通过Docker方式安装HertzBeat](https://hertzbeat.com/docs/start/docker-deploy)

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
