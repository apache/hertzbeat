---
title: HertzBeat v1.4.2 released, custom notice template! 
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system, Linux monitoring]
---

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

### HertzBeat's 1.4.2 version release

* support custom notice template
* support push metrics monitoring(beta)
* support using Huawei Cloud OBS to store monitoring templates yml
* support emqx monitoring and udp port monitoring
* more features , fix multiple bugs and so on

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

* bugfix counting wrong tasks num of collector by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1265>
* [ospp] add push style collector by @vinci-897 in <https://github.com/apache/hertzbeat/pull/1222>
* add 1.4.1 version doc by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1263>
* support using Huawei Cloud OBS to store custom define yml file by @gcdd1993 in <https://github.com/apache/hertzbeat/pull/1266>
* [doc] add more contact channel by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1272>
* bugfix app-tomcat memory_pool unit mb  by @rbsrcy in <https://github.com/apache/hertzbeat/pull/1268>
* add rbsrcy as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1271>
* [doc] update docker.md by @ruanliang-hualun in <https://github.com/apache/hertzbeat/pull/1270>
* add ruanliang-hualun as a contributor for doc by @allcontributors in <https://github.com/apache/hertzbeat/pull/1274>
* bugfix jmx memory_pool unit and time unit error by @rbsrcy in <https://github.com/apache/hertzbeat/pull/1273>
* bugfix old version monitor alert has no monitor name by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1278>
* support edit monitor in monitor detail page by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1282>
* reset alert converge reduce cache when restored alert trigger by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1281>
* [ospp] add push style collector doc by @vinci-897 in <https://github.com/apache/hertzbeat/pull/1267>
* bugfix threshold availability automatically carries threshold parameters by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1285>
* [ospp] support custom notice template by @Eden4701 in <https://github.com/apache/hertzbeat/pull/1233>
* add Eden4701 as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1287>
* bugfix AvailableAlertDefineInit - query did not return a unique result by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1288>
* upgrade to version angular 15 by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1291>
* support push style for multiple messages by @vinci-897 in <https://github.com/apache/hertzbeat/pull/1292>
* update hertzbeat upgrade help doc by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1294>
* feat alert converge, define, silence support search query by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1300>
* feature:support monitoring udp port availability by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1295>
* support emqx monitor by @vinci-897 in <https://github.com/apache/hertzbeat/pull/1302>
* add an explicit tag filter by @vinci-897 in <https://github.com/apache/hertzbeat/pull/1303>
* add hertzbeat icon by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1305>
* [doc] update kafka help doc by @XiaTian688 in <https://github.com/apache/hertzbeat/pull/1308>
* add XiaTian688 as a contributor for doc by @allcontributors in <https://github.com/apache/hertzbeat/pull/1309>
* support webhook custom template by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1306>
* set ssh param connect reused default false by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1310>
* upgrade greptimedb to v0.4 by @liyin in <https://github.com/apache/hertzbeat/pull/1311>
* add liyin as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1313>
* add some emqx monitoring metrics by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1312>
* feature: app-mysql.yml by @a-little-fool in <https://github.com/apache/hertzbeat/pull/1316>
* modify default IoTDB version config to V_1_0 by @Ceilzcx in <https://github.com/apache/hertzbeat/pull/1315>
* bugfix timestamp is null by @qyaaaa in <https://github.com/apache/hertzbeat/pull/1246>
* [hertzbeat] release hertzbeat version v1.4.2 by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1317>
* bugfix alarm time span match in silence and notice by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1318>
* update available alert threshold trigger times default 2 by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1324>
* bugfix rabbitmq contains duplicated metric by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1322>
* [alerter] optimize the encoding of how to add Extern Alarm Manage API(#1320) by @SurryChen in <https://github.com/apache/hertzbeat/pull/1325>
* bugfix webhook post body error and alarm recover exception by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1327>
* build hertzbeat package with jdk runtime by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1328>

## New Contributors

* @rbsrcy made their first contribution in <https://github.com/apache/hertzbeat/pull/1268>
* @XiaTian688 made their first contribution in <https://github.com/apache/hertzbeat/pull/1308>
* @liyin made their first contribution in <https://github.com/apache/hertzbeat/pull/1311>

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
