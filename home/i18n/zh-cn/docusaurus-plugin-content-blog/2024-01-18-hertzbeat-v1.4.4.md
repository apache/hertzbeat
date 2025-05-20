---
title: HertzBeat v1.4.4 发布! 
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system]
---

### 什么是 HertzBeat?

[HertzBeat 赫兹跳动](https://github.com/apache/hertzbeat) 是一个拥有强大自定义监控能力，高性能集群，兼容 Prometheus，无需 Agent 的开源实时监控告警系统。

### 特点

- 集 **监控+告警+通知** 为一体，支持对应用服务，应用程序，数据库，缓存，操作系统，大数据，中间件，Web服务器，云原生，网络，自定义等监控阈值告警通知一步到位。
- 易用友好，无需 `Agent`，全 `WEB` 页面操作，鼠标点一点就能监控告警，零上手学习成本。
- 将 `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` 等协议规范可配置化，只需在浏览器配置监控模板 `YML` 就能使用这些协议去自定义采集想要的指标。您相信只需配置下就能立刻适配一款 `K8s` 或 `Docker` 等新的监控类型吗？
- 兼容 `Prometheus` 的系统生态并且更多，只需页面操作就可以监控 `Prometheus` 所能监控的。
- 高性能，支持多采集器集群横向扩展，支持多隔离网络监控，云边协同。
- 自由的告警阈值规则，`邮件` `Discord` `Slack` `Telegram` `钉钉` `微信` `飞书` `短信` `Webhook` `Server酱` 等方式消息及时送达。

**Github: <https://github.com/apache/hertzbeat>**

**Gitee: <https://gitee.com/hertzbeat/hertzbeat>**

### HertzBeat's 1.4.4 新版本发布啦

- support snmp v3 monitoring protocol @TJxiaobao
- support monitoring NebulaGraph metrics @ZY945
- support monitoring pop3 metrics @a-little-fool
- support monitoring memcached metrics @ZY945
- support monitoring nginx metrics @a-little-fool
- support monitoring hive metrics  @a-little-fool
- feature: support for dns monitoring by @Calvin979
- monitoring the availability of websockets through handshake. by @ZY945
- add ntp protocol and support ntp monitoring by @ZY945
- add smtp protocol and support smtp monitoring by @ZY945
- more feature, document and bugfix

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

---

### What's Changed

> Welcome to explore more new version updates, thanks to the hard work of the community partners, love 💗!

- bugfix metrics tags value store jpa data-storage error by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1403>
- add smtp protocol and support smtp monitoring by @ZY945 in <https://github.com/apache/hertzbeat/pull/1407>
- add ZY945 as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1409>
- support new parse type 'log' in ssh collect protocol by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1410>
- add ntp protocol and support ntp monitoring by @ZY945 in <https://github.com/apache/hertzbeat/pull/1411>
- monitoring the availability of websockets through handshake. by @ZY945 in <https://github.com/apache/hertzbeat/pull/1413>
- Task-1386 When adding tags in tag management, random colors are given by default. by @prolevel1 in <https://github.com/apache/hertzbeat/pull/1412>
- add prolevel1 as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1415>
-

## 1397 feature: support for dns monitoring by @Calvin979 in <https://github.com/apache/hertzbeat/pull/1416>

- Support monitoring hive metrics by @a-little-fool in <https://github.com/apache/hertzbeat/pull/1417>
- support legend pageable in history data charts by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1414>
- update component tip and help tip doc by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1418>
- feature: support monitoring nginx metrics and add a help doc by @a-little-fool in <https://github.com/apache/hertzbeat/pull/1420>
- update parser to parse from prometheus txt metrics data by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1421>
- support monitoring memcached metrics and add a help doc by @ZY945 in <https://github.com/apache/hertzbeat/pull/1423>
- support all ssh connect key exchange by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1424>
- doc add code of conduct by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1425>
- update label structure store in victoria metrics, make it prometheus like by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1426>
- feature: support monitoring pop3 metrics and add help doc by @a-little-fool in <https://github.com/apache/hertzbeat/pull/1427>
- Update sidebars.json by @a-little-fool in <https://github.com/apache/hertzbeat/pull/1428>
- Add zh-cn help doc by @a-little-fool in <https://github.com/apache/hertzbeat/pull/1429>
- update monitoring state un-manage to unmonitored, update pic by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1430>
- Add jpa to date type storage by @Clownsw in <https://github.com/apache/hertzbeat/pull/1431>
- bugfix ^o^ token error, protect metrics api auth by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1434>
- Add relevant documents for SMTP and NTP by @ZY945 in <https://github.com/apache/hertzbeat/pull/1437>
- bugfix threshold init error in mysql env by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1435>
- app-rabbitmq.yml support for international name aliases by @ZY945 in <https://github.com/apache/hertzbeat/pull/1439>
- fix: error create lru-cache-timeout-cleaner thread by @Clownsw in <https://github.com/apache/hertzbeat/pull/1438>
- app-rabbitmq.yml Modifying Error Fields. by @ZY945 in <https://github.com/apache/hertzbeat/pull/1440>
- support monitoring NebulaGraph metrics and add help doc by @ZY945 in <https://github.com/apache/hertzbeat/pull/1441>
- Fix Nginx Collect validateParams function NPE by @Clownsw in <https://github.com/apache/hertzbeat/pull/1442>
- feature: add metrics i18n for app-springboot3.yml by @liyin in <https://github.com/apache/hertzbeat/pull/1445>
- feat: add metrics i18n for app-docker.yml by @liyin in <https://github.com/apache/hertzbeat/pull/1446>
- update docker-compose script and fix version by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1447>
- bugfix java.lang.IllegalArgumentException: Illegal character in query… by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1443>
- bugfix delete monitor error after monitor canceled by @ZhangZixuan1994 in <https://github.com/apache/hertzbeat/pull/1451>
- add ZhangZixuan1994 as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1454>
- remove sleep, probably busy-waiting by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1456>
- doc add new committer ZY945 by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1453>
- Update app-zookeeper.yml by @hurenjie1 in <https://github.com/apache/hertzbeat/pull/1458>
- add hurenjie1 as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1459>
- update dashboard ui, remove ssh custom SignatureFactories, update app name by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1460>
- Task Monitoring Template Yml Metrics I18n | 监控模板指标国际化任务认领 #1212 by @tslj1024 in <https://github.com/apache/hertzbeat/pull/1461>
- add tslj1024 as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1462>
- Add alarm trigger time for alarm restore by @Calvin979 in <https://github.com/apache/hertzbeat/pull/1464>
- bugfix history range query not work when victoria-metrics store by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1463>
- bugfix springboot3 translation by @liyin in <https://github.com/apache/hertzbeat/pull/1467>
- bugfix telegram-notice can not input bot-token by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1465>
- feat: support hostname target by @ldysdu in <https://github.com/apache/hertzbeat/pull/1455>
- add ldysdu as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1471>
- feature support snmp v3 monitoring protocol by @TJxiaobao in <https://github.com/apache/hertzbeat/pull/1469>
- bugfix alarm trigger-times not work when alarm and recovered trigger cyclically by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1468>
- update switch monitoring metrics i18n by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1472>
- fixed: snmpv3 contextName bug by @TJxiaobao in <https://github.com/apache/hertzbeat/pull/1473>
- Fix npt of webhook notify by @Calvin979 in <https://github.com/apache/hertzbeat/pull/1474>
- hertzbeat release hertzbeat version v1.4.4 by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1475>
- bugfix nginx collect http deadlock error by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1476>
- alarm calculate ignore metrics collect code - TIMEOUT by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1478>

## New Contributors

- @ZY945 made their first contribution in <https://github.com/apache/hertzbeat/pull/1407>
- @prolevel1 made their first contribution in <https://github.com/apache/hertzbeat/pull/1412>
- @ZhangZixuan1994 made their first contribution in <https://github.com/apache/hertzbeat/pull/1451>
- @hurenjie1 made their first contribution in <https://github.com/apache/hertzbeat/pull/1458>
- @tslj1024 made their first contribution in <https://github.com/apache/hertzbeat/pull/1461>
- @ldysdu made their first contribution in <https://github.com/apache/hertzbeat/pull/1455>

---

## Supported

- Site Monitor, Port Availability, Http Api, Ping Connectivity, Jvm, SiteMap Full Site, Ssl Certificate, SpringBoot, FTP Server
- Mysql, PostgreSQL, MariaDB, Redis, ElasticSearch, SqlServer, Oracle, MongoDB, Damon, OpenGauss, ClickHouse, IoTDB, Redis Cluster
- Linux, Ubuntu, CentOS, Windows
- Tomcat, Nacos, Zookeeper, RabbitMQ, Flink, Kafka, ShenYu, DynamicTp, Jetty, ActiveMQ
- Kubernetes, Docker
- Huawei Switch, HPE Switch, TP-LINK Switch, Cisco Switch
- and more for your custom monitoring.
- Notifications support `Discord` `Slack` `Telegram` `Mail` `Pinning` `WeChat` `FlyBook` `SMS` `Webhook` `ServerChan`.

---

**Github: <https://github.com/apache/hertzbeat>**
**Gitee: <https://gitee.com/hertzbeat/hertzbeat>**
