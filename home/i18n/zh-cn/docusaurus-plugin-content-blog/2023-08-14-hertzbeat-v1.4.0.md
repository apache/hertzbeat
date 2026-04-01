---
title: 重磅更新，HertzBeat 集群版发布，易用友好的开源实时监控系统! 
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system, Linux monitoring]
---

![hertzBeat](/img/home/0.png)

## 什么是 HertzBeat?

[HertzBeat 赫兹跳动](https://github.com/apache/hertzbeat) 是一个拥有强大自定义监控能力，高性能集群，无需 Agent 的开源实时监控告警系统。

### 特点

- 集 **监控+告警+通知** 为一体，支持对应用服务，应用程序，数据库，缓存，操作系统，大数据，中间件，Web服务器，云原生，网络，自定义等监控阈值告警通知一步到位。
- 易用友好，无需 `Agent`，全 `WEB` 页面操作，鼠标点一点就能监控告警，无需学习成本。
- 将 `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` 等协议规范可配置化，只需在浏览器配置监控模板 `YML` 就能使用这些协议去自定义采集想要的指标。您相信只需简单配置即可快速适配一款 `K8s` 或 `Docker` 等新的监控类型吗？
- 高性能，支持多采集器集群横向扩展，支持多隔离网络监控，云边协同。
- 灵活的告警阈值规则，`邮件` `Discord` `Slack` `Telegram` `钉钉` `微信` `飞书` `短信` `Webhook` 等方式消息及时送达。

> `HertzBeat`的强大自定义，多类型支持，高性能，易扩展，低耦合，希望能帮助开发者和团队快速搭建自有监控系统。

![hertzBeat](/img/docs/hertzbeat-arch.png)

**Github: [https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)**

**Gitee: [https://gitee.com/hertzbeat/hertzbeat](https://gitee.com/hertzbeat/hertzbeat)**

### 集群版来啦

我们之前的hertzbeat一直是单机版本，组件代码模块化但不支持采集器独立部署，所支持的监控数量上限受到了单节点的天然限制，且无法应对多个隔离网络的资源的统一纳管。
经过一个多月的迭代，我们重写了采集任务调度，采集器独立部署，设计单机版和集群版用同一套代码方便后续的维护升级，单机集群两种模式可相互切换无感知。最终很高兴，集群版如期与大家见面了。

集群版不仅仅给我们带来了更强大的监控性能，更有云边协同等功能让人充满想象。

#### 高性能集群

- 支持部署采集器集群，多采集器集群横向扩展，指数级提高可监控数量与采集性能。
- 监控任务在采集器集群中自调度，单采集器挂掉无感知故障迁移采集任务，新加入采集器节点自动调度分担采集压力。
- 单机模式与集群模式相互切换部署非常方便，无需额外组件部署。

![HertzBeat](/img/docs/cluster-arch.png)

#### 云边协同

> 支持部署边缘采集器集群，与主 HertzBeat 服务云边协同提升采集能力。

在多个网络不相通的隔离网络中，在以往的方案中我们需要在每个网络都部署一套监控系统，这导致数据不互通，管理部署维护都不方便。  
HertzBeat 提供云边协同能力，可以在多个隔离网络部署边缘采集器，添加监控时指定采集器，采集器在隔离网络内部进行监控任务采集，采集数据上报，由主 HertzBeat 服务统一调度管理展示。  
这多用于多个隔离数据中心或不同厂商云资源和云下资源的统一监控场景。

![HertzBeat](/img/docs/cluster-arch.png)

### 为什么要开源集群版?

往往一些做需要商业化的开源产品的策略会是单机版作为玩具给小玩家们的入门使用，然后集群版作为闭源产品给有需求的氪金玩家付费使用。这样的模式是可以说非常不错的且值得肯定的，即保证开源也得到了收益，也适用于很多开源项目的发展策略，可能会在商业路径上走得更通顺点。
网络上有些人会对这样的分单机和集群版的开源项目嗤之以鼻，觉得它们是伪开源，开源是噱头，他们觉得开源应该什么都开源免费出来，开源团队什么都应该无私奉献出来。。。。很无语这类人，有投入才有回报，当你免费使用着开源软件并得到价值的时候，是否应该想一想你付出给开源软件了什么而不是一味的索取。
那回到正题，我们又为什么要开源集群版？仅因为热爱开源？如果说我们还在少年可能这话你信，但一个快奔30还有家庭责任的人说出这话你信吗，我自己都不信😂。
首先我们来看看开源能带来什么，或者为什么要做开源。最开始全职开源的想法很简单，做自己喜欢的开源产品(已实现)，程序员的梦想能部署在成千上万的服务器上(看下载量已实现)，然后基于此开源产品挣钱(暂未哭)。

- 用户流量。开源项目免费提供给用户和开发者，吸引用户使用，宣传等方面都有优势。
- 用户信任。开源的产品天生容易获取用户的信任和使用耐心，或者说降低用户的信任门槛。
- 社区协作。开源的产品可以吸引到顶级贡献者一起贡献，接收用户的反馈issue，pr贡献等，在社区的驱动下使开源项目越来越好，正向反馈后也会有更多人参与和使用。社区协作我觉得这是开源的意义，而且这样不仅仅只是程序员之间的贡献代码协作，用户都是协作对象(比如我们这个项目有大量的运维朋友贡献代码和文档)，如果是仅仅代码开源而不社区协作，那还不如放个安装包给别人免费使用下载就好。
- 产品生态。这对一些需要生态的产品是需要的，比如hertzbeat，需要支持对接各种类型协议的监控类型，大量的监控模板。一个好的开源项目生态才能吸引到其它贡献者贡献和分享，在生态中互通有无，最终大家在生态中都受益。这在闭源程序中是很难做到的。

上面几点，重在社区协作和产品生态，这也是开源集群版的原因，只有卷开源产品卷自己到更强的产品力，比如集群这一技术特性天生会吸引到开发者(而且集群本身就是我们社区协作的产物)，会吸引到更多的用户和贡献者使用反馈大家一起迭代，社区驱动进而正向促进开源项目和满足用户功能体验。
而对于开源商业化，开源商业化的前提是得有个真正好的，受欢迎，被广泛使用的开源产品，然后在此基础上做商业化挣钱。

对了这里再说下开源不等同于免费，基于HertzBeat二次开发需保留logo，名称，页面脚注，版权等。
免费使用不是白嫖，这种破坏开源协议的才是，目前发现大量白嫖怪，小心点哈你们。我每年正月初七都会祝你们用这些钱吃的安心，住的放心，玩的开心哈。(仅个人言论不代表社区)

### 尝试部署集群版

1. `docker` 环境仅需一条命令即可开始

    ```docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat```

    ```或者使用 quay.io (若 dockerhub 网络链接超时)```

    ```docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat quay.io/tancloud/hertzbeat```

2. 浏览器访问 `http://localhost:1157` 即可开始，默认账号密码 `admin/hertzbeat`

3. 部署采集器集群

    ```shell
    docker run -d -e IDENTITY=custom-collector-name -e MANAGER_HOST=127.0.0.1 -e MANAGER_IP=1158 --name hertzbeat-collector apache/hertzbeat-collector
    ```

   - `-e IDENTITY=custom-collector-name` : 配置此采集器的唯一性标识符名称，多个采集器名称不能相同，建议自定义英文名称。
   - `-e MANAGER_IP=127.0.0.1` : 配置连接主HertzBeat服务的对外IP。
   - `-e MANAGER_PORT=1158` : 配置连接主HertzBeat服务的对外端口，默认1158。

更多配置详细步骤参考 [通过Docker方式安装HertzBeat](https://hertzbeat.apache.org/docs/start/docker-deploy)

---

### 更多的 v1.4.0 版本更新

> 更多版本新功能更新欢迎探索，感谢社区小伙伴们的辛苦贡献，爱心💗!

- [doc] add v1.3.2 publish doc by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1075](https://github.com/apache/hertzbeat/pull/1075)
- remove elasticsearch unused param index by @Ceilzcx in [https://github.com/apache/hertzbeat/pull/1080](https://github.com/apache/hertzbeat/pull/1080)
- feature support monitoring apache airflow by @luoxuanzao in [https://github.com/apache/hertzbeat/pull/1081](https://github.com/apache/hertzbeat/pull/1081)
- add luoxuanzao as a contributor for code by @allcontributors in [https://github.com/apache/hertzbeat/pull/1083](https://github.com/apache/hertzbeat/pull/1083)
- [collector] bugfix sshd cannot use private key to connect by @gcdd1993 in [https://github.com/apache/hertzbeat/pull/1084](https://github.com/apache/hertzbeat/pull/1084)
- bugfix update dashboard alerts cards height not consist by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1087](https://github.com/apache/hertzbeat/pull/1087)
- Feature#serverchan by @zqr10159 in [https://github.com/apache/hertzbeat/pull/1092](https://github.com/apache/hertzbeat/pull/1092)
- bugfix dm database monitoring connect error  by @lisongning in [https://github.com/apache/hertzbeat/pull/1094](https://github.com/apache/hertzbeat/pull/1094)
- add lisongning as a contributor for code by @allcontributors in [https://github.com/apache/hertzbeat/pull/1096](https://github.com/apache/hertzbeat/pull/1096)
- update alert rule operator display display from "&lt;=" to ">=" by @Ceilzcx in [https://github.com/apache/hertzbeat/pull/1097](https://github.com/apache/hertzbeat/pull/1097)
- [doc]  add custom monitoring relate document by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1098](https://github.com/apache/hertzbeat/pull/1098)
- add YutingNie as a contributor for code by @allcontributors in [https://github.com/apache/hertzbeat/pull/1103](https://github.com/apache/hertzbeat/pull/1103)
- Remove unreachable status by @YutingNie in [https://github.com/apache/hertzbeat/pull/1102](https://github.com/apache/hertzbeat/pull/1102)
- 139 auto update alert status by @l646505418 in [https://github.com/apache/hertzbeat/pull/1104](https://github.com/apache/hertzbeat/pull/1104)
- feat: aviator fn for str contains, exists & matches by @mikezzb in [https://github.com/apache/hertzbeat/pull/1106](https://github.com/apache/hertzbeat/pull/1106)
- add mikezzb as a contributor for code by @allcontributors in [https://github.com/apache/hertzbeat/pull/1107](https://github.com/apache/hertzbeat/pull/1107)
- bugfix common alarm do not need monitorId tag existed by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1108](https://github.com/apache/hertzbeat/pull/1108)
- bugfix extern alert do not have labels mapping inner monitor by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1111](https://github.com/apache/hertzbeat/pull/1111)
- feature: support apache spark metrics monitoring by @a-little-fool in [https://github.com/apache/hertzbeat/pull/1114](https://github.com/apache/hertzbeat/pull/1114)
- add a-little-fool as a contributor for code by @allcontributors in [https://github.com/apache/hertzbeat/pull/1116](https://github.com/apache/hertzbeat/pull/1116)
- [Feature]Add third report of TenCloud by @zqr10159 in [https://github.com/apache/hertzbeat/pull/1113](https://github.com/apache/hertzbeat/pull/1113)
- [Feature]Add third report of TenCloud (#1113) by @zqr10159 in [https://github.com/apache/hertzbeat/pull/1119](https://github.com/apache/hertzbeat/pull/1119)
- [manager] fix: can query by tags when tagValue is null by @l646505418 in [https://github.com/apache/hertzbeat/pull/1118](https://github.com/apache/hertzbeat/pull/1118)
- bugfix the notification template environment variable display error by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1120](https://github.com/apache/hertzbeat/pull/1120)
- add littlezhongzer as a contributor for code by @allcontributors in [https://github.com/apache/hertzbeat/pull/1127](https://github.com/apache/hertzbeat/pull/1127)
- feature:monitor brearer token api, ignore letter case to comparison by @littlezhongzer in [https://github.com/apache/hertzbeat/pull/1122](https://github.com/apache/hertzbeat/pull/1122)
- docs: enhance README by @mikezzb in [https://github.com/apache/hertzbeat/pull/1128](https://github.com/apache/hertzbeat/pull/1128)
- Update app-oracle.yml by @ChenXiangxxxxx in [https://github.com/apache/hertzbeat/pull/1129](https://github.com/apache/hertzbeat/pull/1129)
- add ChenXiangxxxxx as a contributor for code by @allcontributors in [https://github.com/apache/hertzbeat/pull/1130](https://github.com/apache/hertzbeat/pull/1130)
- fix alarm silence strategy setting failed by @Ceilzcx in [https://github.com/apache/hertzbeat/pull/1131](https://github.com/apache/hertzbeat/pull/1131)
- support run sql script file in jdbc protocol config by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1117](https://github.com/apache/hertzbeat/pull/1117)
- bugfix return old cache json file when upgrade version by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1137](https://github.com/apache/hertzbeat/pull/1137)
- support ssh protocol config choose if reuse connection by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1136](https://github.com/apache/hertzbeat/pull/1136)
- feat(web): alert threshold UI support matches & contains by @mikezzb in [https://github.com/apache/hertzbeat/pull/1138](https://github.com/apache/hertzbeat/pull/1138)
- support hertzbeat metrics collector cluster by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1101](https://github.com/apache/hertzbeat/pull/1101)
- add collector card in dashboard by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1147](https://github.com/apache/hertzbeat/pull/1147)
- bugfix: linux collect warning: bad syntax, perhaps a bogus '-' by @Mr-zhou315 in [https://github.com/apache/hertzbeat/pull/1151](https://github.com/apache/hertzbeat/pull/1151)
- add Mr-zhou315 as a contributor for code by @allcontributors in [https://github.com/apache/hertzbeat/pull/1157](https://github.com/apache/hertzbeat/pull/1157)
- support config timezone locale language region on web ui by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1154](https://github.com/apache/hertzbeat/pull/1154)
- bugfix monitoring template app name already exists by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1152](https://github.com/apache/hertzbeat/pull/1152)
- bugfix can not startup when error monitoring template yml file by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1153](https://github.com/apache/hertzbeat/pull/1153)
- tags also deleted when the monitor is deleted by @Ceilzcx in [https://github.com/apache/hertzbeat/pull/1159](https://github.com/apache/hertzbeat/pull/1159)
- monitoring param host with http head will not be error reported by @littlezhongzer in [https://github.com/apache/hertzbeat/pull/1155](https://github.com/apache/hertzbeat/pull/1155)
- [script] feature update build.sh and Dockerfile: detect app version a… by @XimfengYao in [https://github.com/apache/hertzbeat/pull/1162](https://github.com/apache/hertzbeat/pull/1162)
- add XimfengYao as a contributor for code by @allcontributors in [https://github.com/apache/hertzbeat/pull/1163](https://github.com/apache/hertzbeat/pull/1163)
- [doc] add collector clusters document by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1161](https://github.com/apache/hertzbeat/pull/1161)
- [hertzbeat] release hertzbeat version v1.4.0 by @tomsun28 in [https://github.com/apache/hertzbeat/pull/1168](https://github.com/apache/hertzbeat/pull/1168)

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
- 通知支持 `Discord` `Slack` `Telegram` `邮件` `钉钉` `微信` `飞书` `短信` `Webhook`。

---

欢迎star一波来支持我们哦。

**Github: [https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)**
**Gitee: [https://gitee.com/hertzbeat/hertzbeat](https://gitee.com/hertzbeat/hertzbeat)**
