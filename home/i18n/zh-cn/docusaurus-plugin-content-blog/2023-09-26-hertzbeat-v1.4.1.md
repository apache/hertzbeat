---
title: HertzBeat v1.4.1 发布, 更好的用户体验! 
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system, Linux monitoring]
---

![hertzBeat](/img/home/0.png)

### 什么是 HertzBeat?

[HertzBeat 赫兹跳动](https://github.com/dromara/hertzbeat) 是一个拥有强大自定义监控能力，高性能集群，无需 Agent 的开源实时监控告警系统。

### 特点

- 集 **监控+告警+通知** 为一体，支持对应用服务，数据库，操作系统，中间件，云原生，网络等监控阈值告警通知一步到位。
- 易用友好，无需 `Agent`，全 `WEB` 页面操作，鼠标点一点就能监控告警，零上手学习成本。
- 将 `Http,Jmx,Ssh,Snmp,Jdbc` 等协议规范可配置化，只需在浏览器配置监控模版 `YML` 就能使用这些协议去自定义采集想要的指标。您相信只需配置下就能立刻适配一款 `K8s` 或 `Docker` 等新的监控类型吗？
- 高性能，支持多采集器集群横向扩展，支持多隔离网络监控，云边协同。
- 自由的告警阈值规则，`邮件` `Discord` `Slack` `Telegram` `钉钉` `微信` `飞书` `短信` `Webhook` 等方式消息及时送达。


> `HertzBeat`的强大自定义，多类型支持，高性能，易扩展，低耦合，希望能帮助开发者和团队快速搭建自有监控系统。    
> 当然我们也提供了对应的 **[SAAS版本监控云服务](https://console.tancloud.cn)**，中小团队和个人无需再为监控自有资源而去部署一套监控系统，**[登录即可免费开始](https://console.tancloud.cn)**。

![hertzBeat](/img/docs/hertzbeat-arch.png)

**Github: https://github.com/dromara/hertzbeat**

**Gitee: https://gitee.com/dromara/hertzbeat**

### HertzBeat's 1.4.1 version is coming!

- 新的登陆页面UI

  <img width="1952" alt="image" src="https://github.com/dromara/hertzbeat/assets/24788200/5bc5015a-9343-472d-9754-6b06b9138893"/>

  <img width="1950" alt="image" src="https://github.com/dromara/hertzbeat/assets/24788200/71a29284-9cad-4ed2-983a-50430ddb1e2f"/>

- 支持采集器集群管理

<img width="1943" alt="image" src="https://github.com/dromara/hertzbeat/assets/24788200/ba79f743-a450-4b01-adf0-5f15f3722c19"/>

<img width="1901" alt="image" src="https://github.com/dromara/hertzbeat/assets/24788200/b090ec18-5aae-444e-9ef6-e62fd1d8d239"/>

- 友好的帮助文档头

<img width="1942" alt="image" src="https://github.com/dromara/hertzbeat/assets/24788200/c635fab6-504b-47de-9b7e-0c2df86f7e6a"/>

- 监控指标名称国际化

<img width="1802" alt="image" src="https://github.com/dromara/hertzbeat/assets/24788200/d5c74647-6c18-4b12-b858-f29cf1c61661"/>

- 重构采集器调度和更多特性，更强的稳定性

### 尝试部署集群版


1. `docker` 环境仅需一条命令即可开始

```docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat tancloud/hertzbeat```

```或者使用 quay.io (若 dockerhub 网络链接超时)```

```docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat quay.io/tancloud/hertzbeat```

2. 浏览器访问 `http://localhost:1157` 即可开始，默认账号密码 `admin/hertzbeat`

3. 部署采集器集群

```
docker run -d -e IDENTITY=custom-collector-name -e MANAGER_HOST=127.0.0.1 -e MANAGER_PORT=1158 --name hertzbeat-collector tancloud/hertzbeat-collector
```
- `-e IDENTITY=custom-collector-name` : 配置此采集器的唯一性标识符名称，多个采集器名称不能相同，建议自定义英文名称。
- `-e MANAGER_HOST=127.0.0.1` : 配置连接主HertaBeat服务的对外IP。
- `-e MANAGER_PORT=1158` : 配置连接主HertzBeat服务的对外端口，默认1158。

更多配置详细步骤参考 [通过Docker方式安装HertzBeat](https://hertzbeat.com/docs/start/docker-deploy)



----

### What's Changed

> 更多版本新功能更新欢迎探索，感谢社区小伙伴们的辛苦贡献，爱心💗!

* bugfix npe when get undefined name monitor template yml by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1173
* [bug fixed]When importing and exporting monitoring, support export collectors, configure collectors when importing by @zqr10159 in https://github.com/dromara/hertzbeat/pull/1178
* support alert threshold rule config system value row count by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1180
* Update README.md by @zqr10159 in https://github.com/dromara/hertzbeat/pull/1182
* support config alert threshold tags bind by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1181
* the back-end of help component has been built by @YutingNie in https://github.com/dromara/hertzbeat/pull/1160
* support enable alert threshold auto resolved notice by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1185
* Delete tag of the dashboard's homepage on the top four pages by @Ceilzcx in https://github.com/dromara/hertzbeat/pull/1189
* replace obsolete `registry.npm.taobao.org` to`registry.npmmirror.com` by @zqr10159 in https://github.com/dromara/hertzbeat/pull/1192
* refactor MonitorServiceImpl by @Carpe-Wang in https://github.com/dromara/hertzbeat/pull/1190
* config default system timezone and fix monitor status auto recover by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1187
* update-doc-doris by @zqr10159 in https://github.com/dromara/hertzbeat/pull/1193
* [manager] support tidb database monitoring  by @luxx-lq in https://github.com/dromara/hertzbeat/pull/733
* refactor fix potential npe by @Carpe-Wang in https://github.com/dromara/hertzbeat/pull/1197
* [ospp] support ui help massage component  by @YutingNie in https://github.com/dromara/hertzbeat/pull/1199
* support monitor metrics name i18n by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1198
* support google analytics by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1202
* refactor code and fix some npe  by @Carpe-Wang in https://github.com/dromara/hertzbeat/pull/1201
* bugfix fix found 2 dataQueue bean when not config common.queue param by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1205
* Help component update by @YutingNie in https://github.com/dromara/hertzbeat/pull/1207
* bugfix enterprise wechat push display content is too cumbersome by @l646505418 in https://github.com/dromara/hertzbeat/pull/1149
* bugfix WeChatAppAlertNotifyHandlerImpl by @LINGLUOJUN in https://github.com/dromara/hertzbeat/pull/1208
* add LINGLUOJUN as a contributor for code by @allcontributors in https://github.com/dromara/hertzbeat/pull/1209
* fix jmx jndi inject vulnerability by @luelueking in https://github.com/dromara/hertzbeat/pull/1215
* add luelueking as a contributor for code by @allcontributors in https://github.com/dromara/hertzbeat/pull/1217
* bugfix monitoring param number limit range by @qyaaaa in https://github.com/dromara/hertzbeat/pull/1216
* add qyaaaa as a contributor for code by @allcontributors in https://github.com/dromara/hertzbeat/pull/1218
* add app-ping i18n by @qyaaaa in https://github.com/dromara/hertzbeat/pull/1220
* some codes opt by @LINGLUOJUN in https://github.com/dromara/hertzbeat/pull/1214
* support deploy hertzbeat by kubernetes helm charts by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1221
* bugfix threshold setting template variables has repeated parameters by @qyaaaa in https://github.com/dromara/hertzbeat/pull/1223
* support display metrics i18n label when threshold setting by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1225
* bugfix user role display not correctly on webui by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1227
* add hertzbeat about msg card by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1229
* add app-api i18n by @novohit in https://github.com/dromara/hertzbeat/pull/1236
* add novohit as a contributor for code by @allcontributors in https://github.com/dromara/hertzbeat/pull/1238
* [feature]Add `getAlertDefinesByName`. by @zqr10159 in https://github.com/dromara/hertzbeat/pull/1237
* thread pool executor support shutdown gracefully by @LINGLUOJUN in https://github.com/dromara/hertzbeat/pull/1240
* fix: expression injection RCE by @mikezzb in https://github.com/dromara/hertzbeat/pull/1241
* [bugfix]Replace schema "{key1:value1}" to "{\"key1\":\"value1\"}" by @zqr10159 in https://github.com/dromara/hertzbeat/pull/1245
* [Refactor] Use static methods instead of constructors for Message.java by @gcdd1993 in https://github.com/dromara/hertzbeat/pull/1247
* bugfix snake yaml decode rce by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1239
* bugfix jackson deserialize localDatetime error by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1249
* netty as an independent module, add new feature about collector list by @Ceilzcx in https://github.com/dromara/hertzbeat/pull/1244
* support show deploy collector script in web by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1251
* bugfix mongodb collect extra metrics npe by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1257
* bugfix fix collector run cyclic when connect auth failed by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1256
* update webapp login ui by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1260
* bugfix collector can not auto reconnect when channel idle by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1259
* update alarm notice wework app send content ui by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1258
* [hertzbeat] release hertzbeat version v1.4.1 by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1261
* auto split webhook token when user input hook url by @tomsun28 in https://github.com/dromara/hertzbeat/pull/1262

----

## ⛄ 已支持

> 我们将监控采集类型(mysql,jvm,k8s)都定义为yml监控模版，用户可以导入这些模版来支持对应类型的监控!    
> 欢迎大家一起贡献你使用过程中自定义的通用监控类型监控模版。

- Site Monitor, Port Availability, Http Api, Ping Connectivity, Jvm, SiteMap Full Site, Ssl Certificate, SpringBoot, FTP Server
- Mysql, PostgreSQL, MariaDB, Redis, ElasticSearch, SqlServer, Oracle, MongoDB, Damon, OpenGauss, ClickHouse, IoTDB, Redis Cluster
- Linux, Ubuntu, CentOS, Windows
- Tomcat, Nacos, Zookeeper, RabbitMQ, Flink, Kafka, ShenYu, DynamicTp, Jetty, ActiveMQ
- Kubernetes, Docker
- Huawei Switch, HPE Switch, TP-LINK Switch, Cisco Switch
- and more for your custom monitoring.
- Notifications support `Discord` `Slack` `Telegram` `Mail` `Pinning` `WeChat` `FlyBook` `SMS` `Webhook`.
- 和更多自定义监控模版。
- 通知支持 `Discord` `Slack` `Telegram` `邮件` `钉钉` `微信` `飞书` `短信` `Webhook`。

----

**Github: https://github.com/dromara/hertzbeat**      
**Gitee: https://gitee.com/dromara/hertzbeat**  

