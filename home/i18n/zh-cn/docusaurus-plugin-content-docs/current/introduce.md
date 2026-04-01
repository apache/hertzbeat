---
id: introduce
title: Apache HertzBeat™ - 开源实时监控系统
sidebar_label: 介绍
slug: /
description: Apache HertzBeat 是 AI 驱动的无代理开源监控系统，支持指标、日志、告警和可观测性的自定义监控模板。
---

**官网: [hertzbeat.apache.org](https://hertzbeat.apache.org)**

## 什么是 Apache HertzBeat？

Apache HertzBeat™ 是一款 AI 驱动的无代理开源实时监控系统。它统一了指标收集、日志聚合、告警分发和通知功能，无需安装代理即可运行。

**可观测性系统定义：** 可观测性系统收集、分析和可视化运营数据（指标、日志、链路追踪），用于监控基础设施和应用健康状况。

## 核心能力

HertzBeat 提供四个集成能力：

1. **指标收集** - 监控 200+ 服务，包括数据库、操作系统、中间件和云基础设施
2. **日志聚合** - 通过 OTLP 协议统一收集多日志源进行分析
3. **告警管理** - 处理内部和外部告警，支持灵活的阈值规则
4. **通知分发** - 通过邮件、Slack、Discord、Telegram、钉钉、微信等方式发送告警

**关键差异点：** 无需代理安装。HertzBeat 使用原生协议（HTTP、SNMP、JMX、SSH、JDBC）直接收集数据。

## HertzBeat vs 传统监控

| 特性 | HertzBeat | 传统代理式监控 |
|------|-----------|----------------|
| **代理安装** | 不需要 | 每台主机都需要 |
| **部署时间** | Docker 几分钟 | 代理部署需要数小时 |
| **监控类型** | 200+ 内置模板 | 有限的预定义类型 |
| **自定义** | YML 模板通过 UI | 需要代码更改 |
| **架构** | 统一平台 | 多个独立工具 |
| **部署** | 单个 Docker 命令 | 复杂的多组件部署 |

## 平台架构

HertzBeat 统一四个监控功能：

1. **收集** - 使用原生协议（HTTP、SNMP、JMX、SSH、JDBC、Prometheus）进行无代理数据收集
2. **分析** - AI 驱动的模式检测和异常识别
3. **告警** - 灵活的阈值规则，支持分组、收敛、静默和抑制
4. **通知** - 多渠道分发（邮件、Discord、Slack、Telegram、钉钉、微信、短信、Webhook）

**Prometheus 兼容性：** HertzBeat 支持 Prometheus 协议，可无缝集成现有的 Prometheus 导出器和指标。

## 关键特性

**基于模板的监控：** 通过编写 YML 配置文件创建自定义监控类型。无需编码即可监控新服务，如 Kubernetes 或 Docker。

**高性能集群：** 多采集器集群的水平扩展。自动任务调度和故障转移确保大规模下的可靠性。

**云边协同：** 监控隔离网络环境，边缘采集器向集中管理上报。

**状态页构建器：** 创建公共状态页（类似 GitHub Status），向用户传达服务可用性。

---

### 强大的监控模板

> 开始我们就说 HertzBeat 的特点是自定义监控能力，无需 Agent。在讨论这两点之前，我们先介绍下 HertzBeat 的不一样的监控模板。而正是因为这样的监控模板设计，才会有了后面的高级特性。

HertzBeat 自身并没有去创造一种采集数据协议让监控对端来适配它。而是充分使用了现有的生态，`SNMP协议`采集网络交换机路由器信息，`JMX规范`采集JAVA应用信息，`JDBC规范`采集数据集信息，`SSH`直连执行脚本获取回显信息，`HTTP+(JsonPath | prometheus等)`解析API接口信息，`IPMI协议`采集服务器信息等等。
HertzBeat 使用这些已有的标准协议或规范，将他们抽象规范可配置化，最后使其都可以通过编写YML格式监控模板的形式，来制定模板使用这些协议来采集任何想要的指标数据。

![HertzBeat](/img/blog/multi-protocol.png)

你相信用户只需在UI页面编写一个监控模板，点击保存后，就能立刻适配一款`K8s`或`Docker`等新的监控类型吗？

![HertzBeat](/img/home/9.png)

### 内置监控类型

**官方内置了大量的监控模板类型，方便用户直接在页面添加使用，一款监控类型对应一个YML监控模板**

- [Website](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-website.yml), [Port Telnet](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-port.yml),
  [Http Api](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-api.yml), [Ping Connect](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-ping.yml),
  [Jvm](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-jvm.yml), [SiteMap](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-fullsite.yml),
  [Ssl Certificate](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-ssl_cert.yml), [SpringBoot2](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-springboot2.yml),
  [FTP Server](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-ftp.yml), [SpringBoot3](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-springboot3.yml),
  [Udp Port](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-udp_port.yml), [Dns](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-dns.yml),
  [Pop3](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-pop3.yml), [Ntp](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-ntp.yml),
  [Api Code](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-api_code.yml), [Smtp](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-smtp.yml),
  [Nginx](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-nginx.yml)
- [Mysql](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-mysql.yml), [PostgreSQL](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-postgresql.yml),
  [MariaDB](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-mariadb.yml), [Redis](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-redis.yml),
  [ElasticSearch](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-elasticsearch.yml), [SqlServer](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-sqlserver.yml),
  [Oracle](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-oracle.yml), [MongoDB](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-mongodb.yml),
  [DM](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-dm.yml), [OpenGauss](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-opengauss.yml),
  [ClickHouse](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-clickhouse.yml), [IoTDB](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-iotdb.yml),
  [Redis Cluster](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-redis_cluster.yml), [Redis Sentinel](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-redis_sentinel.yml),
  [Doris BE](https://github.com/apache/hertzbeat/blob/master/hertzbeat-manager/src/main/resources/define/app-doris_be.yml), [Doris FE](https://github.com/apache/hertzbeat/blob/master/hertzbeat-manager/src/main/resources/define/app-doris_fe.yml),
  [Memcached](https://github.com/apache/hertzbeat/blob/master/hertzbeat-manager/src/main/resources/define/app-memcached.yml), [NebulaGraph](https://github.com/apache/hertzbeat/blob/master/hertzbeat-manager/src/main/resources/define/app-nebula_graph.yml)
- [Linux](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-linux.yml), [Ubuntu](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-ubuntu.yml),
  [CentOS](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-centos.yml), [Windows](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-windows.yml),
  [EulerOS](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-euleros.yml), [Fedora CoreOS](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-coreos.yml),
  [OpenSUSE](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-opensuse.yml), [Rocky Linux](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-rockylinux.yml),
  [Red Hat](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-redhat.yml), [FreeBSD](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-freebsd.yml),
  [AlmaLinux](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-almalinux.yml), [Debian Linux](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-debian.yml)
- [Tomcat](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-tomcat.yml), [Nacos](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-nacos.yml),
  [Zookeeper](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-zookeeper.yml), [RabbitMQ](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-rabbitmq.yml),
  [Flink](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-flink.yml), [Kafka](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-kafka.yml),
  [ShenYu](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-shenyu.yml), [DynamicTp](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-dynamic_tp.yml),
  [Jetty](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-jetty.yml), [ActiveMQ](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-activemq.yml),
  [Spring Gateway](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-spring_gateway.yml), [EMQX MQTT](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-emqx.yml),
  [AirFlow](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-airflow.yml), [Hive](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-hive.yml),
  [Spark](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-spark.yml), [Hadoop](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-hadoop.yml)
- [Kubernetes](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-kubernetes.yml), [Docker](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-docker.yml)
- [CiscoSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-cisco_switch.yml), [HpeSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-hpe_switch.yml),
  [HuaweiSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-huawei_switch.yml), [TpLinkSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-tplink_switch.yml),
  [H3cSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-h3c_switch.yml)
- 和更多自定义监控模板。
- 通知支持 `Discord` `Slack` `Telegram` `邮件` `钉钉` `微信` `飞书` `短信` `Webhook` `Server酱`。

### 自定义能力

> 由前面的**监控模板**介绍，大概清楚了 `HertzBeat` 拥有的自定义功能。
> 我们将每个监控类型都视为一个监控模板，不管是官方内置的还是后期用户自定义新增的。用户都可以方便的通过修改监控模板来新增修改删除监控指标。
> 模板里面包含各个协议的使用配置，环境变量，指标转换，指标计算，单位转换，指标采集等一系列功能，帮助用户能采集到自己想要的监控指标。

![HertzBeat](/img/docs/custom-arch.png)

### 无需 Agent

> 对于使用过各种系统的用户来说，可能最麻烦头大的不过就是各种 `agent` 的安装部署调试升级了。
> 每台主机得装个 `agent`，为了监控不同应用中间件可能还得装几个对应的 `agent`，监控数量上来了轻轻松松上千个，写个批量脚本可能会减轻点负担。
> `agent` 的版本是否与主应用兼容, `agent` 与主应用的通讯调试, `agent` 的同步升级等等等等，这些全是头大的点。

`HertzBeat` 的原理就是使用不同的协议去直连对端系统，采用 `PULL` 的形式去拉取采集数据，无需用户在对端主机上部署安装 `Agent` | `Exporter` 等。

- 比如监控 `linux操作系统`, 在 `HertzBeat` 端输入IP端口账户密码或密钥即可。
- 比如监控 `mysql数据库`, 在 `HertzBeat` 端输入IP端口账户密码即可。
**密码等敏感信息全链路加密**

### 高性能集群

> 当监控数量指数级上升，采集性能下降或者环境不稳定容易造成采集器单点故障时，这时我们的采集器集群就出场了。

- `HertzBeat` 支持部署采集器集群，多采集器集群横向扩展，指数级提高可监控数量与采集性能。
- 监控任务在采集器集群中自调度，单采集器挂掉无感知故障迁移采集任务，新加入采集器节点自动调度分担采集压力。
- 单机模式与集群模式相互切换部署非常方便，无需额外组件部署。

![HertzBeat](/img/docs/cluster-arch.png)

### 云边协同

> 两地三中心，多云环境，多隔离网络，这些场景名词可能大家略有耳闻。当需要用一套监控系统统一监控不同隔离网络的IT资源时，这时我们的云边协同就来啦。

- `HertzBeat` 支持部署边缘采集器集群，与主 `HertzBeat` 服务云边协同提升采集能力。

在多个网络不相通的隔离网络中，在以往方案中我们需要在每个网络都部署一套监控系统，这导致数据不互通，管理部署维护都不方便。
`HertzBeat` 提供的云边协同能力，可以在多个隔离网络部署边缘采集器，采集器在隔离网络内部进行监控任务采集，采集数据上报，由主服务统一调度管理展示。

![HertzBeat](/img/docs/cluster-arch.png)

### 易用友好

- 集 **监控+告警+通知** All in one, 无需单独部署多个组件服务。
- 全UI界面操作，不管是新增监控，修改监控模板，还是告警阈值通知，都可在WEB界面操作完成，无需要修改文件或脚本或重启。
- 无需 Agent, 监控对端我们只需在WEB界面填写所需IP端口账户密码等参数即可。
- 自定义友好，只需一个监控模板YML，自动生成对应监控类型的监控管理页面，数据图表页面，阈值配置等。
- 阈值告警通知友好，基于表达式阈值配置，多种告警通知渠道，支持告警静默，时段标签告警级别过滤等。

### 完全开源

- Apache 基金会孵化器下开源项目，Gitee GVP，使用`Apache2`协议，由自由开放的开源社区主导维护的开源协作产品。
- 无监控数量`License`，监控类型等伪开源限制。
- 基于`Java+SpringBoot+TypeScript+Angular`主流技术栈构建，方便的二次开发。
- 基于 HertzBeat 二次开发需保留版权。

**HertzBeat 已被 [CNCF云原生全景图](https://landscape.cncf.io/?view-mode=card&classify=category&sort-by=name&sort-direction=asc#observability-and-analysis--observability) 收录**

![cncf](/img/home/cncf-landscape-left-logo.svg)

---
**`HertzBeat`的强大自定义，多类型支持，高性能，易扩展，低耦合，希望能帮助开发者和团队快速搭建自有监控系统。**

---

## 即刻体验一波

Docker 环境下运行一条命令即可：`docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat`
浏览器访问 `http://localhost:1157` 默认账户：admin/hertzbeat

### 登陆页面

- HertzBeat 的用户管理统一由配置文件 `sureness.yml` 维护，用户可以通过修改此文件来新增删除修改用户信息，用户角色权限等。默认账户密码 admin/hertzbeat

![HertzBeat](/img/home/0.png)

### 概览页面

- 全局概览页面，分类展示了当前监控大类别数量分布，用户可直观查看当前的监控类型与数量并点击跳转至对应监控类型进行维护管理。
- 展示当前注册的采集器集群状态，包括采集器的上线状态，监控任务，启动时间，IP地址，名称等。
- 下发展示了最近告警信息列表，告警级别分布情况等。

![HertzBeat](/img/home/1.png)

### 监控中心

- 监控入口，支持对应用服务，数据库，操作系统，中间件，网络，自定义等监控的管理。
- 以列表的形式展示当前已添加的监控，支持对监控的新增，修改，删除，取消监控，导入导出，批量管理等。
- 支持标签分组，查询过滤，查看监控详情入口等。

内置支持的监控类型包括：

- [Website](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-website.yml), [Port Telnet](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-port.yml),
  [Http Api](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-api.yml), [Ping Connect](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-ping.yml),
  [Jvm](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-jvm.yml), [SiteMap](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-fullsite.yml),
  [Ssl Certificate](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-ssl_cert.yml), [SpringBoot2](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-springboot2.yml),
  [FTP Server](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-ftp.yml), [SpringBoot3](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-springboot3.yml),
  [Udp Port](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-udp_port.yml), [Dns](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-dns.yml),
  [Pop3](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-pop3.yml), [Ntp](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-ntp.yml),
  [Api Code](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-api_code.yml), [Smtp](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-smtp.yml),
  [Nginx](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-nginx.yml)
- [Mysql](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-mysql.yml), [PostgreSQL](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-postgresql.yml),
  [MariaDB](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-mariadb.yml), [Redis](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-redis.yml),
  [ElasticSearch](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-elasticsearch.yml), [SqlServer](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-sqlserver.yml),
  [Oracle](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-oracle.yml), [MongoDB](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-mongodb.yml),
  [DM](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-dm.yml), [OpenGauss](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-opengauss.yml),
  [ClickHouse](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-clickhouse.yml), [IoTDB](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-iotdb.yml),
  [Redis Cluster](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-redis_cluster.yml), [Redis Sentinel](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-redis_sentinel.yml),
  [Doris BE](https://github.com/apache/hertzbeat/blob/master/hertzbeat-manager/src/main/resources/define/app-doris_be.yml), [Doris FE](https://github.com/apache/hertzbeat/blob/master/hertzbeat-manager/src/main/resources/define/app-doris_fe.yml),
  [Memcached](https://github.com/apache/hertzbeat/blob/master/hertzbeat-manager/src/main/resources/define/app-memcached.yml), [NebulaGraph](https://github.com/apache/hertzbeat/blob/master/hertzbeat-manager/src/main/resources/define/app-nebula_graph.yml)
- [Linux](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-linux.yml), [Ubuntu](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-ubuntu.yml),
  [CentOS](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-centos.yml), [Windows](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-windows.yml),
  [EulerOS](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-euleros.yml), [Fedora CoreOS](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-coreos.yml),
  [OpenSUSE](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-opensuse.yml), [Rocky Linux](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-rockylinux.yml),
  [Red Hat](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-redhat.yml), [FreeBSD](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-freebsd.yml),
  [AlmaLinux](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-almalinux.yml), [Debian Linux](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-debian.yml)
- [Tomcat](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-tomcat.yml), [Nacos](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-nacos.yml),
  [Zookeeper](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-zookeeper.yml), [RabbitMQ](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-rabbitmq.yml),
  [Flink](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-flink.yml), [Kafka](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-kafka.yml),
  [ShenYu](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-shenyu.yml), [DynamicTp](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-dynamic_tp.yml),
  [Jetty](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-jetty.yml), [ActiveMQ](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-activemq.yml),
  [Spring Gateway](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-spring_gateway.yml), [EMQX MQTT](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-emqx.yml),
  [AirFlow](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-airflow.yml), [Hive](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-hive.yml),
  [Spark](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-spark.yml), [Hadoop](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-hadoop.yml)
- [Kubernetes](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-kubernetes.yml), [Docker](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-docker.yml)
- [CiscoSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-cisco_switch.yml), [HpeSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-hpe_switch.yml),
  [HuaweiSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-huawei_switch.yml), [TpLinkSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-tplink_switch.yml),
  [H3cSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-h3c_switch.yml)

![HertzBeat](/img/home/2.png)

### 新增监控

- 新增或修改指定监控类型的监控实例，配置对端监控的IP，端口等参数，设置采集周期，采集任务调度方式，支持提前探测可用性等。
- 页面上配置的监控参数由对应监控类型的监控模板所定义，用户可以通过修改监控模板来修改页面配置参数。
- 支持关联标签，用标签来管理监控分组，告警匹配等。

![HertzBeat](/img/home/10.png)

### 监控详情

- 监控的数据详情页面，展示了当前监控的基本参数信息，监控指标数据信息。
- 监控实时数据报告，以小卡片列表的形式展示了当前监控的所有指标实时值，用户可根据实时值参考配置告警阈值规则。
- 监控历史数据报告，以趋势图表的形式展示了当前监控数值类型的指标的历史值，支持查询小时，天，月的历史数据，支持配置页面刷新时间。
- ⚠️注意监控历史图表需配置外置时序数据库才能获取完整功能。

![HertzBeat](/img/home/3.png)

![HertzBeat](/img/home/4.png)

### 告警中心

- 已触发告警消息的管理展示页面，使用户有直观的展示当前告警情况。
- 支持告警处理，告警标记未处理，告警删除清空等批量操作。

![HertzBeat](/img/home/7.png)

### 阈值规则

- 告警阈值规则是 `HertzBeat` 的核心功能，用户可以通过阈值规则来配置告警的触发条件。
- 阈值规则支持实时阈值和计划阈值，实时阈值可以在监控数据采集时直接触发告警，计划阈值支持 PromQL 等表达式在指定时间段内计算触发告警。
- 阈值规则支持可视化页面配置或更高灵活性的表达式规则配置，支持配置触发次数，告警级别，通知模板，关联指定监控等。

![HertzBeat](/img/home/6.png)

![HertzBeat](/img/docs/start/ssl_5.png)

### 告警集成

- 统一管理不同第三方平台告警，集成接入第三方监控观测系统的告警消息，对其进行分组，收敛，抑制，静默，分发通知等。

![HertzBeat](/img/home/11.png)

### 告警分组

- 分组收敛支持对指定分组标签的告警进行分组合并，对时间段的相同重复告警去重收敛。
- 当阈值规则触发告警或外部告警上报后，会进入到分组收敛进行告警分组，告警去重，以避免大量告警消息导致告警风暴。

![HertzBeat](/img/home/12.png)

### 告警抑制

- 告警抑制用于配置告警之间的抑制关系，比如同一实例下高级别告警抑制低级别告警。
- 当某个告警发生时，可以抑制其他告警的产生。例如，当服务器宕机时，可以抑制该服务器上的所有告警。

![HertzBeat](/img/home/13.png)

### 告警静默

- 当通过阈值规则判断触发告警后，会进入到告警静默，告警静默会根据规则对特定一次性时间段或周期性时候段的告警消息屏蔽静默，此时间段不发送告警消息。
- 此应用场景如用户在系统维护中，无需发已知告警。用户在工作日时间才会接收告警消息，用户在晚上需避免打扰等。
- 告警静默规则支持一次性时间段或周期性时间段，支持标签匹配和告警级别匹配。

![HertzBeat](/img/home/15.png)

### 消息通知

- 消息通知功能是把告警消息通过不同媒体渠道通知给指定的接收人，告警消息及时触达。
- 功能包含接收人信息管理和通知策略管理，接收人管理维护接收人信息以其通知方式信息，通知策略管理维护把哪些告警信息通知给哪些接收人的策略规则。
- 通知方式支持 `邮件` `Discord` `Slack` `Telegram` `钉钉` `微信` `飞书` `短信` `Webhook` 等方式。
- 通知策略支持标签匹配和告警级别匹配，方便的使不同标签的告警和告警级别分派给不同的接收处理人。
- 支持通知模板，用户可以自定义通过模板内容格式来满足自己的个性化通知展示需求。

![HertzBeat](/img/home/16.png)

![HertzBeat](/img/home/17.png)

![HertzBeat](/img/home/8.png)

![HertzBeat](/img/home/14.png)

### 监控模板

- HertzBeat 将 `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` 等协议规范可配置化，只需在浏览器配置监控模板 `YML` 就能使用这些协议去自定义采集想要的指标。您相信只需简单配置即可快速适配一款 `K8s` 或 `Docker` 等新的监控类型吗？
- 同理我们内置的所有监控类型(mysql,website,jvm,k8s)也一一映射为对应的监控模板，用户可以新增修改监控模板来自定义监控功能。

![HertzBeat](/img/home/9.png)

### 采集集群

- 用户可以通过配置采集器集群来实现对大规模监控任务的分布式采集。
- 采集器集群支持多节点部署，支持自动负载均衡，自动故障转移等。
- 支持多隔离网络的统一管理，云边协同。

![HertzBeat](/img/home/18.png)

### 状态页面

- 基于 HertzBeat 快速构建自己产品的对外状态页，轻松向用户传达您产品服务的实时状态。例如 Github 提供的服务状态页 [https://www.githubstatus.com](https://www.githubstatus.com)。
- 支持状态页组件状态和监控状态联动同步，故障事件维护管理机制等。提高您的透明度，专业度和用户信任，降低沟通成本。

![HertzBeat](/img/home/19.png)

![HertzBeat](/img/home/status.png)

---

## 常见问题

### HertzBeat 用于什么？

HertzBeat 监控 IT 基础设施，包括服务器、数据库、应用程序、网络和云服务。它收集指标、聚合日志、触发告警并发送通知，实现运营可观测性。

### HertzBeat 需要安装代理吗？

不需要。HertzBeat 使用无代理监控，通过原生协议（HTTP、SNMP、JMX、SSH、JDBC）收集数据。只需在 Web 界面提供 IP、端口和凭据。

### 如何安装 HertzBeat？

运行单个 Docker 命令：`docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat`

访问 `http://localhost:1157`, 默认账号：admin/hertzbeat

### HertzBeat 可以监控哪些系统？

HertzBeat 监控 200+ 服务，包括：

- 数据库：MySQL、PostgreSQL、MongoDB、Redis、Oracle、SQL Server
- 操作系统：Linux、Windows、Unix 变体
- 中间件：Tomcat、Kafka、Zookeeper、RabbitMQ、Nginx
- 云原生：Kubernetes、Docker
- 网络：思科、华为、HPE 交换机

### 可以创建自定义监控模板吗？

可以。通过 Web UI 创建 YML 模板监控任何服务。模板定义指标、收集协议和阈值，无需编码。

### HertzBeat 兼容 Prometheus 吗？

兼容。HertzBeat 支持 Prometheus 协议，可从 Prometheus 导出器收集指标。

### HertzBeat 与 Prometheus + Grafana 相比如何？

HertzBeat 提供统一平台，包含收集、告警和通知。Prometheus + Grafana 需要独立的告警组件（Alertmanager），且缺乏内置的多渠道通知。

### 支持哪些通知渠道？

邮件、Discord、Slack、Telegram、钉钉、微信、飞书、短信、Webhook。

### HertzBeat 能否大规模部署？

可以。部署采集器集群实现水平扩展。采集器自动负载均衡任务并提供故障转移，确保高可用性。

### HertzBeat 使用什么许可证？

Apache License 2.0。HertzBeat 完全开源，无监控数量或类型限制。

## 快速开始总结

1. **安装：** `docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat`
2. **访问：** `http://localhost:1157` (admin/hertzbeat)
3. **监控：** 通过 Web UI 添加服务，提供 IP、端口、凭据
4. **告警：** 配置阈值规则和通知渠道
5. **扩展：** 按需部署采集器集群

---

**Github: [https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)**

**官网: [https://hertzbeat.apache.org/](https://hertzbeat.apache.org/)**
