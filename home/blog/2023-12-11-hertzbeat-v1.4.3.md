---
title: HertzBeat v1.4.3 released, prometheus-compatible! 
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

### HertzBeat's 1.4.3 Version Release

* enhanced reporting of external general alert API
* support mysql api port website mongodb jvm redis monitoring metrics name i18n
* support auto collect metrics by prometheus task
* support victoriametrics as metrics data storage
* support monitoring spring gateway metrics
* add more windows monitoring metrics
* add e2e testing module, support by api-testing
* more feature, document and bugfix

Compatible with the Prometheus ecosystem, now we can monitor what Prometheus can monitoring with few clicks on webui.

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

Detailed config refer to [Install HertzBeat via Docker](https://hertzbeat.com/docs/start/docker-deploy)

---

### What's Changed

> Welcome to explore more new version updates, thanks to the hard work of the community partners, love 💗!

* update package deploy doc by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1330>
* bugfix duplicate collect job when update monitor templates by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1332>
* bugfix number variable in freemarker template display error by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1334>
* [alerter] Enhanced reporting of external general alert API by @SurryChen in <https://github.com/apache/hertzbeat/pull/1326>
* [doc] update hertzbeat-mysql-tdengine readme by @jiashu1024 in <https://github.com/apache/hertzbeat/pull/1335>
* add jiashu1024 as a contributor for doc by @allcontributors in <https://github.com/apache/hertzbeat/pull/1336>
* app-mysql.yml: Adjust slow query translation by @1036664317 in <https://github.com/apache/hertzbeat/pull/1337>
* add 1036664317 as a contributor for doc by @allcontributors in <https://github.com/apache/hertzbeat/pull/1338>
* Bump com.google.guava:guava from 31.0.1-jre to 32.0.0-jre by @dependabot in <https://github.com/apache/hertzbeat/pull/1339>
* [feature] support auto collect metrics by prometheus task by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1342>
* [doc] add vinci as new committer by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1341>
* [feature] add tag word cloud in dashboard by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1345>
* support custom prometheus endpoint path by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1346>
* bugfix tdengine query interval history metrics data with instance error by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1348>
* unlimit Alert.java content field length by @xiaoguolong in <https://github.com/apache/hertzbeat/pull/1351>
* add xiaoguolong as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1353>
* update monitor detail table ui layout by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1352>
* [doc]add star history by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1356>
* feature: app-mongodb.yml by @a-little-fool in <https://github.com/apache/hertzbeat/pull/1359>
* alarm threshold support prometheus task metrics by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1354>
* support victoriametrics as metrics data storage by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1361>
* Add time type to support query_time of mysql and mariadb by @Clownsw in <https://github.com/apache/hertzbeat/pull/1364>
* add Clownsw as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1365>
* Error occured when I followed running steps to start Front-web by @Calvin979 in <https://github.com/apache/hertzbeat/pull/1366>
* add Calvin979 as a contributor for doc by @allcontributors in <https://github.com/apache/hertzbeat/pull/1367>
* enriches the cncf landscape by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1368>
* Fix flaky test in CollectUtilTest by @bbelide2 in <https://github.com/apache/hertzbeat/pull/1371>
* add bbelide2 as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1372>
* Fix flaky test replaceSmilingPlaceholder by @bbelide2 in <https://github.com/apache/hertzbeat/pull/1373>
* add docker-compose script hertzbeat+mysql+victoria-metrics all in one by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1370>
* Feature: app-jvm.yml support for international name aliases by @Calvin979 in <https://github.com/apache/hertzbeat/pull/1376>
* add Calvin979 as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1377>
* feature: support monitoring spring gateway metrics by @a-little-fool in <https://github.com/apache/hertzbeat/pull/1374>
* update code comment and doc, bugfix concurrent exception by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1378>
* update windows define and accept snmp leaf by @jinyaoMa in <https://github.com/apache/hertzbeat/pull/1379>
* add jinyaoMa as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1380>
* fix exception when sending email has special chars by @Carpe-Wang in <https://github.com/apache/hertzbeat/pull/1383>
* test: add e2e testing for some basic APIs by @LinuxSuRen in <https://github.com/apache/hertzbeat/pull/1387>
* add LinuxSuRen as a contributor for code, and test by @allcontributors in <https://github.com/apache/hertzbeat/pull/1389>
* bugfix auto generate monitor name error when add monitor by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1384>
* bugfix CalculateAlarm execAlertExpression NPE by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1388>
* Feature: app-redis.yml support for international name aliases by @Calvin979 in <https://github.com/apache/hertzbeat/pull/1390>
* test: add more monitor related e2e testing case by @LinuxSuRen in <https://github.com/apache/hertzbeat/pull/1391>
* chore: update the pr template about the e2e testing by @LinuxSuRen in <https://github.com/apache/hertzbeat/pull/1392>
* add help header ui when update or add monitors by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1399>
* [hertzbeat] release hertzbeat version v1.4.3 by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1400>

## New Contributors

* @1036664317 made their first contribution in <https://github.com/apache/hertzbeat/pull/1337>
* @dependabot made their first contribution in <https://github.com/apache/hertzbeat/pull/1339>
* @xiaoguolong made their first contribution in <https://github.com/apache/hertzbeat/pull/1351>
* @Clownsw made their first contribution in <https://github.com/apache/hertzbeat/pull/1364>
* @Calvin979 made their first contribution in <https://github.com/apache/hertzbeat/pull/1366>
* @bbelide2 made their first contribution in <https://github.com/apache/hertzbeat/pull/1371>
* @jinyaoMa made their first contribution in <https://github.com/apache/hertzbeat/pull/1379>
* @LinuxSuRen made their first contribution in <https://github.com/apache/hertzbeat/pull/1387>

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
