---
title: Announcement of Apache Hertzbeat 1.7.2 Release
author: tomsun28
author_title: tomsun28
author_url: https://github.com/zhangshenghang
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4
tags: [opensource, release]
keywords: [open source monitoring system, alerting system, Hertzbeat, release]
---

Dear Community Members,

We are thrilled to announce the official release of Apache Hertzbeat version 1.7.2!

## Downloads and Documentation

- **Apache Hertzbeat 1.7.2 Download Link**: <https://hertzbeat.apache.org/docs/download>
- **Apache Hertzbeat Documentation**: <https://hertzbeat.apache.org/docs/>

## Major Updates

### New Features and Enhancements

- **Cloud Alert Integration**: Supports Alibaba Cloud SLS Log Service alert sources (#3422), Huawei Cloud Monitor alert sources (#3443), and Volcano Engine alert sources (#3451).
- **Service Discovery Enhancements**: Added Zookeeper service discovery support (#3377), Nacos auto-discovery (#3324), and HTTP service discovery collector with authentication support (#3388).
- **AI & Data Source Expansion**: Integrated Ollama AI model (#3441), added OpenRouter AI provider support (#3439), and enabled GreptimeDB as a Grafana data source (#3403).
- **Expression & Data Processing**: Supports sql and promql expression syntax (#3410); added batch import metrics to VictoriaMetrics (#3337).
- **Platform Compatibility**: Added Darwin (macOS) platform support (#3431).
- **Monitoring Metric Enhancements**: New statusCode metric data (#3446).
- **Other new features**

### Bug Fixes

- **Alert Notification Issues**: Fixed Uptime Kuma/Zabbix/Tencent Cloud Webhook URL errors (#3351); corrected Feishu notification format (#3508).
- **Threshold Functionality**: Fixed real-time Prometheus threshold failure (#3434).
- **Monitoring Status Errors**: Resolved incorrect sub-monitor status display (#3340) and monitoring list pagination issues (#3467).
- **System Stability**: Fixed null pointer exception in custom monitoring dashboard (#3448); resolved Jacoco test report generation failure (#3455).
- **Data Parsing Issues**: Fixed ANTLR4 parsing logic (binary operators/vectors) (#3482, #3488); corrected alert expression parsing errors (#3497, #3504).
- **Data Storage Optimization**: Improved GreptimeDB storage and query logic (#3387).
- **Other bug fixes**

### Refactoring and Optimization

- **Security Validation Enhancements**: Strengthened URL validation (WeCom/Telegram/Slack/ServerChan) (#3361-3364); added JNDI security checks (#3358); verified plugin service paths (#3375).
- **Architecture & Storage Optimization**: Updated security model (#3450); optimized DB column types (commonAnnotations/alertFingerprints to TEXT) (#3463); adjusted JDBC logic (#3500).
- **Dev Toolchain**: Added Maven Wrapper (mvnw) (#3430); updated dependencies (#3359, #3498); supported mvnd and optimized backend builds (#3491).
- **Observability**: Disabled OpenTelemetry exporters by default to prevent connection errors (#3437, #3461).
- **Community Collaboration**: Updated Issue templates (#3421).
- **Other optimizations**

### Tests and Quality

- **Unit Test Coverage**: Added unit tests for HttpSdCollectImpl (#3386).

### Documentation Enhancements

- **Internationalization**: Added 30+ Japanese documentation components (API/CentOS/Cisco switches/ClickHouse, etc.) (#3352, #3376, #3389).
- **Alert Documentation**: Updated alert threshold configuration (#3399), notification templates (#3466), and Volcano Engine integration guide (#3460).
- **Deployment & Configuration**: Added Grafana anonymous auth configuration (#3407); Rainbond cloud one-click installation guide (#3440).
- **Content Refinement**: Fixed time template syntax errors (#3378); optimized Chinese terminology (#3380, #3383); updated Greptime-init docs (#3355).
- **Community**: Added contributor/committer profiles (#3357, #3391, #3395); release blogs (#3449).
- **More documentation updates**

## Acknowledgements

Special thanks to the following community members for their collaborative efforts:

> @pruidong @MasamiYui @tomsun28 @Aias00 @zhangshenghang @zqr10159 @LiuTianyou @LL-LIN @lx1229 @xiaomizhou2 @pwallk
> @bigcyy @yuluo-yx @TJxiaobao @RainBondsongyg @Duansg @Calvin979 @Cyanty

## What's Changed

```markdown
* [bugfix] Fix incorrect webhook URLs for Uptime Kuma, Zabbix, and Tencent Cloud by @bigcyy in https://github.com/apache/hertzbeat/pull/3351
* [doc] japanese api by @Calvin979 in https://github.com/apache/hertzbeat/pull/3352
* [doc] update OS monitor by @MasamiYui in https://github.com/apache/hertzbeat/pull/3353
* [doc](start): update greptime-init documentation by @zqr10159 in https://github.com/apache/hertzbeat/pull/3355
* [doc] new ppmc liutianyou and update qq num by @tomsun28 in https://github.com/apache/hertzbeat/pull/3357
* [bugfix] Incorrect SD sub-monitor status by @MasamiYui in https://github.com/apache/hertzbeat/pull/3340
* [improve] improve url validation for WeComRobotAlertNotifyHandlerImpl by @Aias00 in https://github.com/apache/hertzbeat/pull/3361
* [improve] improve url validation for TelegramBotAlertNotifyHandlerImpl by @Aias00 in https://github.com/apache/hertzbeat/pull/3362
* [improve] improve url validation for SlackAlertNotifyHandlerImpl by @Aias00 in https://github.com/apache/hertzbeat/pull/3363
* [improve] improve url validation for serverChan by @Aias00 in https://github.com/apache/hertzbeat/pull/3364
* [improve] improve jndi validation by @Aias00 in https://github.com/apache/hertzbeat/pull/3358
* update maven dep by @Aias00 in https://github.com/apache/hertzbeat/pull/3359
* [doc] japanese centos by @Calvin979 in https://github.com/apache/hertzbeat/pull/3376
* [doc] fix incorrect time template syntax usercase in doc by @LL-LIN in https://github.com/apache/hertzbeat/pull/3378
* [doc] Add blog by @LiuTianyou in https://github.com/apache/hertzbeat/pull/3379
* [improve] add path validation for pluginservice by @Aias00 in https://github.com/apache/hertzbeat/pull/3375
* [feat] Support Zookeeper Service Discovery  by @bigcyy in https://github.com/apache/hertzbeat/pull/3377
* [doc] modify chinese words by @Duansg in https://github.com/apache/hertzbeat/pull/3380
* [Task] Batch import metrics data in victoria-metrics by @MasamiYui in https://github.com/apache/hertzbeat/pull/3337
* [feature] support auto nacos service discovery by @xiaomizhou2 in https://github.com/apache/hertzbeat/pull/3324
* [doc] modify supplement related documentation by @Duansg in https://github.com/apache/hertzbeat/pull/3383
* [doc] japanese cisco switch by @Calvin979 in https://github.com/apache/hertzbeat/pull/3389
* [test] Add unit tests for HttpSdCollectImpl by @xiaomizhou2 in https://github.com/apache/hertzbeat/pull/3386
* [fix](warehouse): improve GreptimeDB data storage and querying by @zqr10159 in https://github.com/apache/hertzbeat/pull/3387
* [doc] japanese clickhouse by @Calvin979 in https://github.com/apache/hertzbeat/pull/3390
* [doc] new contributor and committer, update doc by @tomsun28 in https://github.com/apache/hertzbeat/pull/3391
* [doc] japanese consul sd by @Calvin979 in https://github.com/apache/hertzbeat/pull/3392
* [doc]add new committer blog by @pwallk in https://github.com/apache/hertzbeat/pull/3395
* [doc] japanese coreos by @Calvin979 in https://github.com/apache/hertzbeat/pull/3393
* [doc] japanese dahua by @Calvin979 in https://github.com/apache/hertzbeat/pull/3396
* [doc] japanese Debian by @Calvin979 in https://github.com/apache/hertzbeat/pull/3398
* [improve] http sd collector adds authentication by @Cyanty in https://github.com/apache/hertzbeat/pull/3388
* [doc] japanese deepseek & dm by @Calvin979 in https://github.com/apache/hertzbeat/pull/3400
* [docs] update alert threshold doc by @bigcyy in https://github.com/apache/hertzbeat/pull/3399
* [doc] japanese dns by @Calvin979 in https://github.com/apache/hertzbeat/pull/3404
* [doc] japanese dns sd by @Calvin979 in https://github.com/apache/hertzbeat/pull/3405
* [doc] japanese docker by @Calvin979 in https://github.com/apache/hertzbeat/pull/3408
* [doc] japanese doris_be by @Calvin979 in https://github.com/apache/hertzbeat/pull/3409
* [Doc] Update 1.7.1  by @zhangshenghang in https://github.com/apache/hertzbeat/pull/3411
* [doc] update home doc by @tomsun28 in https://github.com/apache/hertzbeat/pull/3418
* [doc] Update anonymous user auth configuration of the grafana dashboard document by @Cyanty in https://github.com/apache/hertzbeat/pull/3407
* [doc] japanese doris_fe by @Calvin979 in https://github.com/apache/hertzbeat/pull/3416
* [infra]: Update issue tmpl by @yuluo-yx in https://github.com/apache/hertzbeat/pull/3421
* [feature]Make GreptimeDB as a grafana data source  by @zqr10159 in https://github.com/apache/hertzbeat/pull/3403
* [feat] support sql("...") and promql("...") expressions including SQL condition parsing by @bigcyy in https://github.com/apache/hertzbeat/pull/3410
* [doc] japanese dynamic_tp by @Calvin979 in https://github.com/apache/hertzbeat/pull/3419
* [doc] japanese elasticsearch by @Calvin979 in https://github.com/apache/hertzbeat/pull/3423
* [feature]Support Alibaba Cloud 'Simple Log Service(SLS)' alert source by @Duansg in https://github.com/apache/hertzbeat/pull/3422
* [Improve] add mvnw by @zhangshenghang in https://github.com/apache/hertzbeat/pull/3430
* [doc] japanese emqx by @Calvin979 in https://github.com/apache/hertzbeat/pull/3433
* [improvement] disable default OpenTelemetry exporters to prevent connection errors by @bigcyy in https://github.com/apache/hertzbeat/pull/3437
* [bugfix] Fix the issue where Prometheus RealTime Threshold is not eff… by @Duansg in https://github.com/apache/hertzbeat/pull/3434
* [feat] add support for ollama and update docs by @bigcyy in https://github.com/apache/hertzbeat/pull/3441
* [release] add support for darwin by @lx1229 in https://github.com/apache/hertzbeat/pull/3431
* [feature] Support Huawei Cloud `Cloud Eye` alert source by @Duansg in https://github.com/apache/hertzbeat/pull/3443
* [doc] japanese euleros by @Calvin979 in https://github.com/apache/hertzbeat/pull/3442
* docs: Add one-click installation for Rainbond Cloud by @RainBondsongyg in https://github.com/apache/hertzbeat/pull/3440
* [feat] add support for OpenRouter AI provider by @bigcyy in https://github.com/apache/hertzbeat/pull/3439
* [doc] japanese flink by @Calvin979 in https://github.com/apache/hertzbeat/pull/3447
* [security] update hertzbeat security model by @tomsun28 in https://github.com/apache/hertzbeat/pull/3450
* [feature] support volcengine alert source by @LiuTianyou in https://github.com/apache/hertzbeat/pull/3451
* [doc] add publish version 1.7.1 blog by @tomsun28 in https://github.com/apache/hertzbeat/pull/3449
* [doc] japanese flink on yarn by @Calvin979 in https://github.com/apache/hertzbeat/pull/3452
* [doc] japanese freebsd by @Calvin979 in https://github.com/apache/hertzbeat/pull/3456
* [improvement] disable default OpenTelemetry exporters to prevent connection errors by @bigcyy in https://github.com/apache/hertzbeat/pull/3461
* [doc] add doc for integrate volcengine alerts by @LiuTianyou in https://github.com/apache/hertzbeat/pull/3460
* [Fix] fix custom monitoring bulletin `NullPointerException` by @Duansg in https://github.com/apache/hertzbeat/pull/3448
* [fix] fix jacoco can not generate test reports. by @Duansg in https://github.com/apache/hertzbeat/pull/3455
* [doc] Alert notification template by @MasamiYui in https://github.com/apache/hertzbeat/pull/3466
* [doc] japanese greenplum by @Calvin979 in https://github.com/apache/hertzbeat/pull/3468
* [improvement] change column definitions for commonAnnotations and alertFingerprints to TEXT type by @bigcyy in https://github.com/apache/hertzbeat/pull/3463
* [fix] Fix `Monitors` paging display. by @Duansg in https://github.com/apache/hertzbeat/pull/3467
* [doc] japanese greptime by @Calvin979 in https://github.com/apache/hertzbeat/pull/3469
* [doc] japanese h3c switch by @Calvin979 in https://github.com/apache/hertzbeat/pull/3471
* [feature] Add statusCode metrics data. by @Duansg in https://github.com/apache/hertzbeat/pull/3446
* [doc] japanese hadoop by @Calvin979 in https://github.com/apache/hertzbeat/pull/3476
* [docs](webhook): update Chinese documentation for alert integration by @zqr10159 in https://github.com/apache/hertzbeat/pull/3478
* [doc] japanese hbase master by @Calvin979 in https://github.com/apache/hertzbeat/pull/3477
* [doc] japanese hbase region server by @Calvin979 in https://github.com/apache/hertzbeat/pull/3479
* [doc] japanese hdfs datanode by @Calvin979 in https://github.com/apache/hertzbeat/pull/3487
* [fix] antlr4 `vectors and` parse semantic fixes and optimizations by @Duansg in https://github.com/apache/hertzbeat/pull/3482
* [ci]: add mvnd support and update backend build by @zqr10159 in https://github.com/apache/hertzbeat/pull/3491
* [doc] japanese hdfs namenode by @Calvin979 in https://github.com/apache/hertzbeat/pull/3490
* [doc] japanese hertzbeat by @Calvin979 in https://github.com/apache/hertzbeat/pull/3492
* [fix] Fix antlr4 parsing of `or` and `unless` logical and set binary operators by @Duansg in https://github.com/apache/hertzbeat/pull/3488
* [doc] japanese hertzbeat token by @Calvin979 in https://github.com/apache/hertzbeat/pull/3493
* [feat] update_mvnd_version by @Aias00 in https://github.com/apache/hertzbeat/pull/3498
* add:a small jdbc modified. by @TJxiaobao in https://github.com/apache/hertzbeat/pull/3500
* fixed:a minor issue change by @TJxiaobao in https://github.com/apache/hertzbeat/pull/3428
* [bugfix] Fix incorrect expression parsing in alert setting component by @bigcyy in https://github.com/apache/hertzbeat/pull/3497
* [bugfix] Correctly parse binary comparison expressions by @bigcyy in https://github.com/apache/hertzbeat/pull/3504
* [bugfix]Fixed an error in the format of the flying book notification by @pruidong in https://github.com/apache/hertzbeat/pull/3508
* [release] release new version 1.7.2 by @tomsun28 in https://github.com/apache/hertzbeat/pull/3510
```

## New Contributors

- @Duansg made their first contribution in <https://github.com/apache/hertzbeat/pull/3380>
- @lx1229 made their first contribution in <https://github.com/apache/hertzbeat/pull/3431>
- @RainBondsongyg made their first contribution in <https://github.com/apache/hertzbeat/pull/3440>

## Apache Hertzbeat

**Repository URL:**

<https://github.com/apache/hertzbeat>

**Official Website:**

<https://hertzbeat.apache.org/>

**Apache Hertzbeat Download Link:**

<https://hertzbeat.apache.org/docs/download>

**Apache Hertzbeat Docker Images:**

Apache Hertzbeat provides Docker images for each release, available on Docker Hub:

- HertzBeat: <https://hub.docker.com/r/apache/hertzbeat>
- HertzBeat Collector: <https://hub.docker.com/r/apache/hertzbeat-collector>

**How to Contribute to the Apache Hertzbeat Open Source Community?**

<https://hertzbeat.apache.org/docs/community/contribution>
