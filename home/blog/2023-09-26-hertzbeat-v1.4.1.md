---
title: HertzBeat v1.4.1 released, better experience! 
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system, Linux monitoring]
---

![HertzBeat](/img/home/0.png)

### What is HertzBeat?

[HertzBeat](https://github.com/apache/hertzbeat) is an open source, real-time monitoring system with custom monitoring, high performance cluster and agentless capabilities.

### Features

* Combines **monitoring, alarm, and notification** features into one platform, and supports monitoring for web service, program, database, cache, os, webserver, middleware, bigdata, cloud-native, network, custom and more.
* Easy to use and agentless, offering full web-based operations for monitoring and alerting with just a few clicks, all at zero learning cost.
* Makes protocols such as `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` configurable, allowing you to collect any metrics by simply configuring the template `YML` file online. Imagine being able to quickly adapt to a new monitoring type like K8s or Docker simply by configuring online with HertzBeat.
* High performance, supports horizontal expansion of multi-collector clusters, multi-isolated network monitoring and cloud-edge collaboration.
* Provides flexible alarm threshold rules and timely notifications delivered via  `Discord` `Slack` `Telegram` `Email` `DingDing` `WeChat` `FeiShu` `Webhook` `SMS`.

> HertzBeat's powerful customization, multi-type support, high performance, easy expansion, and low coupling, aims to help developers and teams quickly build their own monitoring system.

![HertzBeat](/img/docs/hertzbeat-arch.png)

**Github: <https://github.com/apache/hertzbeat>**

**Gitee: <https://gitee.com/hertzbeat/hertzbeat>**

### HertzBeat's 1.4.1 version is coming

* new login page

  <img width="1952" alt="image" src="https://github.com/apache/hertzbeat/assets/24788200/5bc5015a-9343-472d-9754-6b06b9138893"/>

  <img width="1950" alt="image" src="https://github.com/apache/hertzbeat/assets/24788200/71a29284-9cad-4ed2-983a-50430ddb1e2f"/>

* collector manage

<img width="1943" alt="image" src="https://github.com/apache/hertzbeat/assets/24788200/ba79f743-a450-4b01-adf0-5f15f3722c19"/>

<img width="1901" alt="image" src="https://github.com/apache/hertzbeat/assets/24788200/b090ec18-5aae-444e-9ef6-e62fd1d8d239"/>

* new help moudle

<img width="1942" alt="image" src="https://github.com/apache/hertzbeat/assets/24788200/c635fab6-504b-47de-9b7e-0c2df86f7e6a"/>

* monitor metrics dashboard name i18n

<img width="1802" alt="image" src="https://github.com/apache/hertzbeat/assets/24788200/d5c74647-6c18-4b12-b858-f29cf1c61661"/>

* refactor collector dispatcher and more

### Install quickly via docker

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

* bugfix npe when get undefined name monitor template yml by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1173>
* [bug fixed]When importing and exporting monitoring, support export collectors, configure collectors when importing by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1178>
* support alert threshold rule config system value row count by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1180>
* Update README.md by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1182>
* support config alert threshold tags bind by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1181>
* the back-end of help component has been built by @YutingNie in <https://github.com/apache/hertzbeat/pull/1160>
* support enable alert threshold auto resolved notice by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1185>
* Delete tag of the dashboard's homepage on the top four pages by @Ceilzcx in <https://github.com/apache/hertzbeat/pull/1189>
* replace obsolete `registry.npm.taobao.org` to`registry.npmmirror.com` by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1192>
* refactor MonitorServiceImpl by @Carpe-Wang in <https://github.com/apache/hertzbeat/pull/1190>
* config default system timezone and fix monitor status auto recover by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1187>
* update-doc-doris by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1193>
* [manager] support tidb database monitoring  by @luxx-lq in <https://github.com/apache/hertzbeat/pull/733>
* refactor fix potential npe by @Carpe-Wang in <https://github.com/apache/hertzbeat/pull/1197>
* [ospp] support ui help massage component  by @YutingNie in <https://github.com/apache/hertzbeat/pull/1199>
* support monitor metrics name i18n by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1198>
* support google analytics by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1202>
* refactor code and fix some npe  by @Carpe-Wang in <https://github.com/apache/hertzbeat/pull/1201>
* bugfix fix found 2 dataQueue bean when not config common.queue param by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1205>
* Help component update by @YutingNie in <https://github.com/apache/hertzbeat/pull/1207>
* bugfix enterprise wechat push display content is too cumbersome by @l646505418 in <https://github.com/apache/hertzbeat/pull/1149>
* bugfix WeChatAppAlertNotifyHandlerImpl by @LINGLUOJUN in <https://github.com/apache/hertzbeat/pull/1208>
* add LINGLUOJUN as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1209>
* fix jmx jndi inject vulnerability by @luelueking in <https://github.com/apache/hertzbeat/pull/1215>
* add luelueking as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1217>
* bugfix monitoring param number limit range by @qyaaaa in <https://github.com/apache/hertzbeat/pull/1216>
* add qyaaaa as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1218>
* add app-ping i18n by @qyaaaa in <https://github.com/apache/hertzbeat/pull/1220>
* some codes opt by @LINGLUOJUN in <https://github.com/apache/hertzbeat/pull/1214>
* support deploy hertzbeat by kubernetes helm charts by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1221>
* bugfix threshold setting template variables has repeated parameters by @qyaaaa in <https://github.com/apache/hertzbeat/pull/1223>
* support display metrics i18n label when threshold setting by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1225>
* bugfix user role display not correctly on webui by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1227>
* add hertzbeat about msg card by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1229>
* add app-api i18n by @novohit in <https://github.com/apache/hertzbeat/pull/1236>
* add novohit as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1238>
* [feature]Add `getAlertDefinesByName`. by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1237>
* thread pool executor support shutdown gracefully by @LINGLUOJUN in <https://github.com/apache/hertzbeat/pull/1240>
* fix: expression injection RCE by @mikezzb in <https://github.com/apache/hertzbeat/pull/1241>
* [bugfix]Replace schema "{key1:value1}" to "{\"key1\":\"value1\"}" by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1245>
* [Refactor] Use static methods instead of constructors for Message.java by @gcdd1993 in <https://github.com/apache/hertzbeat/pull/1247>
* bugfix snake yaml decode rce by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1239>
* bugfix jackson deserialize localDatetime error by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1249>
* netty as an independent module, add new feature about collector list by @Ceilzcx in <https://github.com/apache/hertzbeat/pull/1244>
* support show deploy collector script in web by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1251>
* bugfix mongodb collect extra metrics npe by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1257>
* bugfix fix collector run cyclic when connect auth failed by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1256>
* update webapp login ui by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1260>
* bugfix collector can not auto reconnect when channel idle by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1259>
* update alarm notice wework app send content ui by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1258>
* [hertzbeat] release hertzbeat version v1.4.1 by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1261>
* auto split webhook token when user input hook url by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1262>

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
