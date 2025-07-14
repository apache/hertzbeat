---
title: HertzBeat v1.4.4 released now! 
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system]
---

### What is HertzBeat?

[HertzBeat](https://github.com/apache/hertzbeat) is an open source, real-time monitoring system with custom monitoring, high performance cluster, prometheus-compatible and agentless capabilities.

### Features

* Combines **monitoring, alarm, and notification** features into one platform, and supports monitoring for web service, program, database, cache, os, webserver, middleware, bigdata, cloud-native, network, custom and more.
* Easy to use and agentless, web-based and with one-click monitoring and alerting, zero learning curve.
* Makes protocols such as `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` configurable, allowing you to collect any metrics by simply configuring the template `YML` file online. Imagine being able to quickly adapt to a new monitoring type like K8s or Docker simply by configuring online with HertzBeat.
* Compatible with the `Prometheus` ecosystem and more, can monitoring what `Prometheus` can monitoring with few clicks on webui.
* High performance, supports horizontal expansion of multi-collector clusters, multi-isolated network monitoring and cloud-edge collaboration.
* Provides flexible alarm threshold rules and timely notifications delivered via  `Discord` `Slack` `Telegram` `Email` `Dingtalk` `WeChat` `FeiShu` `Webhook` `SMS` `ServerChan`.

> HertzBeat's powerful customization, multi-type support, high performance, easy expansion, and low coupling, aims to help developers and teams quickly build their own monitoring system.

![HertzBeat](/img/docs/hertzbeat-arch.png)

**Github: <https://github.com/apache/hertzbeat>**

**Gitee: <https://gitee.com/hertzbeat/hertzbeat>**

### HertzBeat's 1.4.4 Version Release

* support snmp v3 monitoring protocol @TJxiaobao
* support monitoring NebulaGraph metrics @ZY945
* support monitoring pop3 metrics @a-little-fool
* support monitoring memcached metrics @ZY945
* support monitoring nginx metrics @a-little-fool
* support monitoring hive metrics  @a-little-fool
* feature: support for dns monitoring by @Calvin979
* monitoring the availability of websockets through handshake. by @ZY945
* add ntp protocol and support ntp monitoring by @ZY945
* add smtp protocol and support smtp monitoring by @ZY945
* more feature, document and bugfix

### Install Quickly Via Docker

1. Just one command to get started:

    ```docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat```

    ```or use quay.io (if dockerhub network connect timeout)```

    ```docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat quay.io/tancloud/hertzbeat```

2. Access `http://localhost:1157` to start, default account: `admin/hertzbeat`

3. Deploy collector clusters

    ```shell
    docker run -d -e IDENTITY=custom-collector-name -e MANAGER_HOST=127.0.0.1 -e MANAGER_PORT=1158 --name hertzbeat-collector apache/hertzbeat-collector
    ```

   * `-e IDENTITY=custom-collector-name` : set the collector unique identity name.
   * `-e MANAGER_HOST=127.0.0.1` : set the main hertzbeat server ip.
   * `-e MANAGER_PORT=1158` : set the main hertzbeat server port, default 1158.

Detailed config refer to [Install HertzBeat via Docker](https://hertzbeat.apache.org/docs/start/docker-deploy)

---

### What's Changed

> Welcome to explore more new version updates, thanks to the hard work of the community partners, love 💗!

* bugfix metrics tags value store jpa data-storage error by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1403>
* add smtp protocol and support smtp monitoring by @ZY945 in <https://github.com/apache/hertzbeat/pull/1407>
* add ZY945 as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1409>
* support new parse type 'log' in ssh collect protocol by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1410>
* add ntp protocol and support ntp monitoring by @ZY945 in <https://github.com/apache/hertzbeat/pull/1411>
* monitoring the availability of websockets through handshake. by @ZY945 in <https://github.com/apache/hertzbeat/pull/1413>
* [Task-1386] When adding tags in tag management, random colors are given by default. by @prolevel1 in <https://github.com/apache/hertzbeat/pull/1412>
* add prolevel1 as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1415>
*

## 1397 feature: support for dns monitoring by @Calvin979 in <https://github.com/apache/hertzbeat/pull/1416>

* Support monitoring hive metrics by @a-little-fool in <https://github.com/apache/hertzbeat/pull/1417>
* support legend pageable in history data charts by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1414>
* update component tip and help tip doc by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1418>
* feature: support monitoring nginx metrics and add a help doc by @a-little-fool in <https://github.com/apache/hertzbeat/pull/1420>
* update parser to parse from prometheus txt metrics data by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1421>
* support monitoring memcached metrics and add a help doc by @ZY945 in <https://github.com/apache/hertzbeat/pull/1423>
* support all ssh connect key exchange by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1424>
* [doc] add code of conduct by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1425>
* update label structure store in victoria metrics, make it prometheus like by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1426>
* feature: support monitoring pop3 metrics and add help doc by @a-little-fool in <https://github.com/apache/hertzbeat/pull/1427>
* Update sidebars.json by @a-little-fool in <https://github.com/apache/hertzbeat/pull/1428>
* Add zh-cn help doc by @a-little-fool in <https://github.com/apache/hertzbeat/pull/1429>
* update monitoring state un-manage to unmonitored, update pic by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1430>
* Add jpa to date type storage by @Clownsw in <https://github.com/apache/hertzbeat/pull/1431>
* bugfix ^o^ token error, protect metrics api auth by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1434>
* Add relevant documents for SMTP and NTP by @ZY945 in <https://github.com/apache/hertzbeat/pull/1437>
* bugfix threshold init error in mysql env by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1435>
* app-rabbitmq.yml support for international name aliases by @ZY945 in <https://github.com/apache/hertzbeat/pull/1439>
* fix(*): error create lru-cache-timeout-cleaner thread by @Clownsw in <https://github.com/apache/hertzbeat/pull/1438>
* app-rabbitmq.yml Modifying Error Fields. by @ZY945 in <https://github.com/apache/hertzbeat/pull/1440>
* support monitoring NebulaGraph metrics and add help doc by @ZY945 in <https://github.com/apache/hertzbeat/pull/1441>
* Fix Nginx Collect validateParams function NPE by @Clownsw in <https://github.com/apache/hertzbeat/pull/1442>
* feature: add metrics i18n for app-springboot3.yml by @liyin in <https://github.com/apache/hertzbeat/pull/1445>
* feat: add metrics i18n for app-docker.yml by @liyin in <https://github.com/apache/hertzbeat/pull/1446>
* update docker-compose script and fix version by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1447>
* bugfix java.lang.IllegalArgumentException: Illegal character in query… by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1443>
* bugfix delete monitor error after monitor canceled by @ZhangZixuan1994 in <https://github.com/apache/hertzbeat/pull/1451>
* add ZhangZixuan1994 as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1454>
* remove sleep, probably busy-waiting by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1456>
* [doc] add new committer ZY945 by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1453>
* Update app-zookeeper.yml by @hurenjie1 in <https://github.com/apache/hertzbeat/pull/1458>
* add hurenjie1 as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1459>
* update dashboard ui, remove ssh custom SignatureFactories, update app name by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1460>
* [Task] Monitoring Template Yml Metrics I18n | 监控模板指标国际化任务认领 #1212 by @tslj1024 in <https://github.com/apache/hertzbeat/pull/1461>
* add tslj1024 as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1462>
* Add alarm trigger time for alarm restore by @Calvin979 in <https://github.com/apache/hertzbeat/pull/1464>
* bugfix history range query not work when victoria-metrics store by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1463>
* bugfix springboot3 translation by @liyin in <https://github.com/apache/hertzbeat/pull/1467>
* bugfix telegram-notice can not input bot-token by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1465>
* feat: support hostname target by @ldysdu in <https://github.com/apache/hertzbeat/pull/1455>
* add ldysdu as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1471>
* [feature] support snmp v3 monitoring protocol by @TJxiaobao in <https://github.com/apache/hertzbeat/pull/1469>
* bugfix alarm trigger-times not work when alarm and recovered trigger cyclically by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1468>
* update switch monitoring metrics i18n by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1472>
* fixed: snmpv3 contextName bug by @TJxiaobao in <https://github.com/apache/hertzbeat/pull/1473>
* Fix npt of webhook notify by @Calvin979 in <https://github.com/apache/hertzbeat/pull/1474>
* [hertzbeat] release hertzbeat version v1.4.4 by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1475>
* bugfix nginx collect http deadlock error by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1476>
* alarm calculate ignore metrics collect code - TIMEOUT by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1478>

## New Contributors

* @ZY945 made their first contribution in <https://github.com/apache/hertzbeat/pull/1407>
* @prolevel1 made their first contribution in <https://github.com/apache/hertzbeat/pull/1412>
* @ZhangZixuan1994 made their first contribution in <https://github.com/apache/hertzbeat/pull/1451>
* @hurenjie1 made their first contribution in <https://github.com/apache/hertzbeat/pull/1458>
* @tslj1024 made their first contribution in <https://github.com/apache/hertzbeat/pull/1461>
* @ldysdu made their first contribution in <https://github.com/apache/hertzbeat/pull/1455>

---

## ⛄ Supported

* Site Monitor, Port Availability, Http Api, Ping Connectivity, Jvm, SiteMap Full Site, Ssl Certificate, SpringBoot, FTP Server
* Mysql, PostgreSQL, MariaDB, Redis, ElasticSearch, SqlServer, Oracle, MongoDB, Damon, OpenGauss, ClickHouse, IoTDB, Redis Cluster
* Linux, Ubuntu, CentOS, Windows
* Tomcat, Nacos, Zookeeper, RabbitMQ, Flink, Kafka, ShenYu, DynamicTp, Jetty, ActiveMQ
* Kubernetes, Docker
* Huawei Switch, HPE Switch, TP-LINK Switch, Cisco Switch
* and more for your custom monitoring.
* Notifications support `Discord` `Slack` `Telegram` `Mail` `Pinning` `WeChat` `FlyBook` `SMS` `Webhook` `ServerChan`.

---

**Github: <https://github.com/apache/hertzbeat>**
**Gitee: <https://gitee.com/hertzbeat/hertzbeat>**
