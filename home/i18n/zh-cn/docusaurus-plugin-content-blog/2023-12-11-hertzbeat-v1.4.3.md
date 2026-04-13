---
title: HertzBeat v1.4.3 发布，Prometheus兼容! 
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system]
---

## 什么是 HertzBeat?

[HertzBeat 赫兹跳动](https://github.com/apache/hertzbeat) 是一个拥有强大自定义监控能力，高性能集群，兼容 Prometheus，无需 Agent 的开源实时监控告警系统。

### 特点

- 集 **监控+告警+通知** 为一体，支持对应用服务，应用程序，数据库，缓存，操作系统，大数据，中间件，Web服务器，云原生，网络，自定义等监控阈值告警通知一步到位。
- 易用友好，无需 `Agent`，全 `WEB` 页面操作，鼠标点一点就能监控告警，无需学习成本。
- 将 `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` 等协议规范可配置化，只需在浏览器配置监控模板 `YML` 就能使用这些协议去自定义采集想要的指标。您相信只需简单配置即可快速适配一款 `K8s` 或 `Docker` 等新的监控类型吗？
- 兼容 `Prometheus` 的系统生态并且更多，只需页面操作就可以监控 `Prometheus` 所能监控的。
- 高性能，支持多采集器集群横向扩展，支持多隔离网络监控，云边协同。
- 灵活的告警阈值规则，`邮件` `Discord` `Slack` `Telegram` `钉钉` `微信` `飞书` `短信` `Webhook` `Server酱` 等方式消息及时送达。

**Github: [https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)**

**Gitee: [https://gitee.com/hertzbeat/hertzbeat](https://gitee.com/hertzbeat/hertzbeat)**

### HertzBeat's 1.4.3 新版本发布啦

- 三方外部告警上报增强
- 支持 mysql api port website mongodb jvm redis 等监控指标的i18n国际化
- Prometheus生态兼容，支持添加Prometheus任务
- 支持使用 VictoriaMetrics 时序数据库作为系统指标数据存储
- 支持监控 Spring Gateway 指标
- 新增更多 Windows 监控指标
- 添加 e2e 测试模块，由 api-testing 支持
- 更多的特性，文档优化和BUG修复

兼容 `Prometheus` 的系统生态，现在我们只需页面操作就可以监控 `Prometheus` 所监控的。

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

**Github: [https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)**
**Gitee: [https://gitee.com/hertzbeat/hertzbeat](https://gitee.com/hertzbeat/hertzbeat)**

---

### What's Changed

> Welcome to explore more new version updates, thanks to the hard work of the community partners, love 💗!

- update package deploy doc by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1330](https://github.com/apache/hertzbeat/pull/1330)
- bugfix duplicate collect job when update monitor templates by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1332](https://github.com/apache/hertzbeat/pull/1332)
- bugfix number variable in freemarker template display error by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1334](https://github.com/apache/hertzbeat/pull/1334)
- [alerter] Enhanced reporting of external general alert API by @SurryChen in [https://github.com/apache/hertzbeat/pull/1326](https://github.com/apache/hertzbeat/pull/1326)
- [doc] update hertzbeat-mysql-tdengine readme by @jiashu1024 in [https://github.com/apache/hertzbeat/pull/1335](https://github.com/apache/hertzbeat/pull/1335)
- add jiashu1024 as a contributor for doc by @allcontributors in [https://github.com/apache/hertzbeat/pull/1336](https://github.com/apache/hertzbeat/pull/1336)
- app-mysql.yml: Adjust slow query translation by @1036664317 in [https://github.com/apache/hertzbeat/pull/1337](https://github.com/apache/hertzbeat/pull/1337)
- add 1036664317 as a contributor for doc by @allcontributors in [https://github.com/apache/hertzbeat/pull/1338](https://github.com/apache/hertzbeat/pull/1338)
- Bump com.google.guava:guava from 31.0.1-jre to 32.0.0-jre by @dependabot in [https://github.com/apache/hertzbeat/pull/1339](https://github.com/apache/hertzbeat/pull/1339)
- [feature] support auto collect metrics by prometheus task by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1342](https://github.com/apache/hertzbeat/pull/1342)
- [doc] add vinci as new committer by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1341](https://github.com/apache/hertzbeat/pull/1341)
- [feature] add tag word cloud in dashboard by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1345](https://github.com/apache/hertzbeat/pull/1345)
- support custom prometheus endpoint path by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1346](https://github.com/apache/hertzbeat/pull/1346)
- bugfix tdengine query interval history metrics data with instance error by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1348](https://github.com/apache/hertzbeat/pull/1348)
- unlimit Alert.java content field length by @xiaoguolong in [https://github.com/apache/hertzbeat/pull/1351](https://github.com/apache/hertzbeat/pull/1351)
- add xiaoguolong as a contributor for code by @allcontributors in [https://github.com/apache/hertzbeat/pull/1353](https://github.com/apache/hertzbeat/pull/1353)
- update monitor detail table ui layout by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1352](https://github.com/apache/hertzbeat/pull/1352)
- [doc]add star history by @zqr10159 in [https://github.com/apache/hertzbeat/pull/1356](https://github.com/apache/hertzbeat/pull/1356)
- feature: app-mongodb.yml by @a-little-fool in [https://github.com/apache/hertzbeat/pull/1359](https://github.com/apache/hertzbeat/pull/1359)
- alarm threshold support prometheus task metrics by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1354](https://github.com/apache/hertzbeat/pull/1354)
- support victoriametrics as metrics data storage by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1361](https://github.com/apache/hertzbeat/pull/1361)
- Add time type to support query_time of mysql and mariadb by @Clownsw in [https://github.com/apache/hertzbeat/pull/1364](https://github.com/apache/hertzbeat/pull/1364)
- add Clownsw as a contributor for code by @allcontributors in [https://github.com/apache/hertzbeat/pull/1365](https://github.com/apache/hertzbeat/pull/1365)
- Error occurred when I followed running steps to start Front-web by @Calvin979 in [https://github.com/apache/hertzbeat/pull/1366](https://github.com/apache/hertzbeat/pull/1366)
- add Calvin979 as a contributor for doc by @allcontributors in [https://github.com/apache/hertzbeat/pull/1367](https://github.com/apache/hertzbeat/pull/1367)
- enriches the cncf landscape by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1368](https://github.com/apache/hertzbeat/pull/1368)
- Fix flaky test in CollectUtilTest by @bbelide2 in [https://github.com/apache/hertzbeat/pull/1371](https://github.com/apache/hertzbeat/pull/1371)
- add bbelide2 as a contributor for code by @allcontributors in [https://github.com/apache/hertzbeat/pull/1372](https://github.com/apache/hertzbeat/pull/1372)
- Fix flaky test replaceSmilingPlaceholder by @bbelide2 in [https://github.com/apache/hertzbeat/pull/1373](https://github.com/apache/hertzbeat/pull/1373)
- add docker-compose script hertzbeat+mysql+victoria-metrics all in one by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1370](https://github.com/apache/hertzbeat/pull/1370)
- Feature: app-jvm.yml support for international name aliases by @Calvin979 in [https://github.com/apache/hertzbeat/pull/1376](https://github.com/apache/hertzbeat/pull/1376)
- add Calvin979 as a contributor for code by @allcontributors in [https://github.com/apache/hertzbeat/pull/1377](https://github.com/apache/hertzbeat/pull/1377)
- feature: support monitoring spring gateway metrics by @a-little-fool in [https://github.com/apache/hertzbeat/pull/1374](https://github.com/apache/hertzbeat/pull/1374)
- update code comment and doc, bugfix concurrent exception by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1378](https://github.com/apache/hertzbeat/pull/1378)
- update windows define and accept snmp leaf by @jinyaoMa in [https://github.com/apache/hertzbeat/pull/1379](https://github.com/apache/hertzbeat/pull/1379)
- add jinyaoMa as a contributor for code by @allcontributors in [https://github.com/apache/hertzbeat/pull/1380](https://github.com/apache/hertzbeat/pull/1380)
- fix exception when sending email has special chars by @Carpe-Wang in [https://github.com/apache/hertzbeat/pull/1383](https://github.com/apache/hertzbeat/pull/1383)
- test: add e2e testing for some basic APIs by @LinuxSuRen in [https://github.com/apache/hertzbeat/pull/1387](https://github.com/apache/hertzbeat/pull/1387)
- add LinuxSuRen as a contributor for code, and test by @allcontributors in [https://github.com/apache/hertzbeat/pull/1389](https://github.com/apache/hertzbeat/pull/1389)
- bugfix auto generate monitor name error when add monitor by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1384](https://github.com/apache/hertzbeat/pull/1384)
- bugfix CalculateAlarm execAlertExpression NPE by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1388](https://github.com/apache/hertzbeat/pull/1388)
- Feature: app-redis.yml support for international name aliases by @Calvin979 in [https://github.com/apache/hertzbeat/pull/1390](https://github.com/apache/hertzbeat/pull/1390)
- test: add more monitor related e2e testing case by @LinuxSuRen in [https://github.com/apache/hertzbeat/pull/1391](https://github.com/apache/hertzbeat/pull/1391)
- chore: update the pr template about the e2e testing by @LinuxSuRen in [https://github.com/apache/hertzbeat/pull/1392](https://github.com/apache/hertzbeat/pull/1392)
- add help header ui when update or add monitors by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1399](https://github.com/apache/hertzbeat/pull/1399)
- [hertzbeat] release hertzbeat version v1.4.3 by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1400](https://github.com/apache/hertzbeat/pull/1400)

## New Contributors

- @1036664317 made their first contribution in [https://github.com/apache/hertzbeat/pull/1337](https://github.com/apache/hertzbeat/pull/1337)
- @dependabot made their first contribution in [https://github.com/apache/hertzbeat/pull/1339](https://github.com/apache/hertzbeat/pull/1339)
- @xiaoguolong made their first contribution in [https://github.com/apache/hertzbeat/pull/1351](https://github.com/apache/hertzbeat/pull/1351)
- @Clownsw made their first contribution in [https://github.com/apache/hertzbeat/pull/1364](https://github.com/apache/hertzbeat/pull/1364)
- @Calvin979 made their first contribution in [https://github.com/apache/hertzbeat/pull/1366](https://github.com/apache/hertzbeat/pull/1366)
- @bbelide2 made their first contribution in [https://github.com/apache/hertzbeat/pull/1371](https://github.com/apache/hertzbeat/pull/1371)
- @jinyaoMa made their first contribution in [https://github.com/apache/hertzbeat/pull/1379](https://github.com/apache/hertzbeat/pull/1379)
- @LinuxSuRen made their first contribution in [https://github.com/apache/hertzbeat/pull/1387](https://github.com/apache/hertzbeat/pull/1387)

---

## ⛄ Supported

- Site Monitor, Port Availability, Http Api, Ping Connectivity, Jvm, SiteMap Full Site, Ssl Certificate, SpringBoot, FTP Server
- Mysql, PostgreSQL, MariaDB, Redis, ElasticSearch, SqlServer, Oracle, MongoDB, Damon, OpenGauss, ClickHouse, IoTDB, Redis Cluster
- Linux, Ubuntu, CentOS, Windows
- Tomcat, Nacos, Zookeeper, RabbitMQ, Flink, Kafka, ShenYu, DynamicTp, Jetty, ActiveMQ
- Kubernetes, Docker
- Huawei Switch, HPE Switch, TP-LINK Switch, Cisco Switch
- and more for your custom monitoring.
- Notifications support `Discord` `Slack` `Telegram` `Mail` `Pinning` `WeChat` `FlyBook` `SMS` `Webhook` `ServerChan`.

---

**Github: [https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)**
**Gitee: [https://gitee.com/hertzbeat/hertzbeat](https://gitee.com/hertzbeat/hertzbeat)**
