---
title: Announcement of Apache HertzBeat™ 1.7.3 Release
author: LiuTianyou
author_title: LiuTianyou
author_url: https://github.com/LiuTianyou
tags: [opensource, release]
keywords: [open source monitoring system, alerting system, Hertzbeat, release]
---

Dear Community Members,

We are thrilled to announce the official release of Apache HertzBeat™ 1.7.3. This also marks the first release since Apache HertzBeat™ graduated to become a Top-Level Project at Apache.

## Downloads and Documentation

- **Apache HertzBeat™ 1.7.3 Download Link**: [https://hertzbeat.apache.org/zh-cn/docs/download](https://hertzbeat.apache.org/zh-cn/docs/download)
- **Apache HertzBeat™ Documentation**: [https://hertzbeat.apache.org/zh-cn/docs/](https://hertzbeat.apache.org/zh-cn/docs/)

## Major Updates

### New Features and Enhancements

- **Monitoring Support Expansion**: Added monitoring support for Apache DolphinScheduler(#3656), TDengine(#3678), macOS systems(#3715), Synology NAS(#3721), and HertzBeat(#3641). Oracle monitoring now includes user password-related metrics(#3674).
- **Core Feature Enhancements**: Supports periodic threshold preview(#3505), export all monitoring configurations(#3509), monitoring templates support JSON nested parsing(#3645), HTTP collection supports parsing numeric data using JsonPath(#3612), and VictoriaMetrics metrics now support adding custom labels(#3622).
- **Internationalization (i18n)**: Supports internationalization for collector online notifications(#3585).
- **More New Features**

### Bug Fixes

- **Grafana Integration Issues**: Fixed visualization display issues in Grafana integration (#3666).
- **System Stability**: Fixed startup errors when VictoriaMetrics storage is not configured (#3552), resolved premature input stream closure in Prometheus parsing (#3567), and fixed missing offline notifications when collectors go offline (#3601).
- **Data Parsing Issues**: Fixed AES key decoding errors in collectors (#3652), resolved JDBC configuration parameter failures (#3625), and addressed multiple monitoring template parsing failures caused by Jexl keyword conflicts (#3629, #3632, #3685, #3686, #3687, #3693, #3705, #3707, #3708).
- **Other Bug Fixes**

### Refactoring and Optimization

- **Performance Optimization**: Optimized monitoring list page loading performance (#3719), improved scheduling logic for batch refresh tasks (#3660), enabled Gzip compression for VictoriaMetrics write requests (#3595).
- **Logic Refactoring & Improvements**: Refactored the processing logic of the Alarm Cache Manager (AlarmCacheManager) (#3525), redesigned Prometheus label parsing logic and PromQL generation logic (#3662, #3725), optimized comparators for alert judgment logic (#3574).
- **UI/UX Improvements**: Optimized status page layout and UI (#3680), enhanced status page event list (#3727), improved homepage navigation bar layout (#3616), refined interaction effects on the new monitoring page (#3726), updated UI theme (#3682), enhanced monitoring data chart components (#3668).
- **Other Optimizations**

### Tests and Quality

- **Unit Test Coverage**: Added unit tests for VictoriaMetrics data storage (#3595).
- **End-to-End Testing**: Improved Kafka end-to-end (e2e) test quality (#3520).
- **Testing Efficiency**: Implemented parallel CI to accelerate the build process (#3523).
- **Other Testing Improvements**

### Documentation Enhancements

- **Internationalized Documentation**: Led by @Calvin979, added extensive Japanese documentation (i18n) for numerous monitoring templates, covering dozens of templates including HPE Switch, Huawei Switch, Kafka, JVM, Linux, MySQL, Redis, SpringBoot, and more.
- **Content Corrections & Optimizations**: Fixed errors, broken links, and semantic issues in documentation (#3526, #3559, #3608, #3695).
- **Community & Ecosystem**: Added blog posts introducing new committers and PMC members (#3522, #3561, #3563, #3569), updated project graduation-related documentation and website content (#3584, #3692, #3701, #3729), updated contributor documentation (#3667).
- **More Documentation Updates**

## Acknowledgements

Special thanks to the following community members for their collaborative efforts:

> @pjfanning @chingjustwe @delei @rowankid @MasamiYui @tomsun28 @Aias00 @zhangshenghang @zqr10159 @LiuTianyou @yy549159265 @lx1229 @VampireAchao
> @cto-huhang @pwallk @bigcyy @sarthakeash @Carpe-Wang @YxYL6125 @tuzuy @lynx009 @Duansg @carlpinto25 @Calvin979 @Cyanty @Saramanda9988

## What's Changed

```markdown
* [release] release new version 1.7.2 by @tomsun28 in #3510
* [doc] japanese hpe switch by @Calvin979 in #3511
* [doc] japanese huawei switch by @Calvin979 in #3515
* [doc] japanese hive by @Calvin979 in #3506
* [doc] japanese hugeGraph by @Calvin979 in #3518
* [feature] Support for Periodic Threshold preview. by @Duansg in #3505
* [Improve] Improve kafka e2e by @zhangshenghang in #3520
* [doc] japanese iceberg by @Calvin979 in #3519
* [fix] Update the correct replacement of outdated functions and placeholders by @Cyanty in #3516
* [doc] japanese influxdb by @Calvin979 in #3521
* [doc] japanese hikvision by @Calvin979 in #3499
* [doc] Add new commiter blog by @MasamiYui in #3522
* [fix] fix i18n error and append two metrics about disk infos by @lx1229 in #3514
* [feat]parallel ci by @Aias00 in #3523
* [doc] japanese influxdb promql by @Calvin979 in #3527
* fix: fix something by @Aias00 in #3524
* [doc] japanese iotdb by @Calvin979 in #3530
* download version deal by @lynx009 in #3531
* [doc] update outdated links by @lynx009 in #3535
* [doc]update download page text by @zqr10159 in #3532
* [doc] japanese ipmi by @Calvin979 in #3537
* [doc] japanese jetty by @Calvin979 in #3539
* enable GitHub Dependabot to create PRs for security alerts but not for every dependency update by @pjfanning in #3543
* [doc] Fix some issues in the documentation by @Duansg in #3526
* [doc] recommend newer mysql connector jar by @pjfanning in #3541
* [doc] add hertzbeat maturity and fix doc by @tomsun28 in #3544
* [doc] update download page by @lynx009 in #3549
* [doc] japanese kafka by @Calvin979 in #3548
* [doc] japanese jvm by @Calvin979 in #3545
* [doc] japanese kafka client by @Calvin979 in #3550
* [feature] Support export all allmonitors by @YxYL6125 in #3509
* feat: Add LogUtil wrapper and optimize logging comments by @Carpe-Wang in #3489
* [refactor] AlarmCacheManager refactoring processing logic by @Duansg in #3525
* [improve] make jackson serialize all field visibility by @tomsun28 in #3551
* [bugfix] fix npe due the victoria insert not config when startup by @tomsun28 in #3552
* [doc] V1.7.2 version blog by @lynx009 in #3558
* [doc] japanese kafka promql by @Calvin979 in #3553
* [doc] Fix documentation error and adjust Chinese semantics by @Duansg in #3559
* [doc] add new pmc and committer by @tomsun28 in #3561
* [doc] japanese kingbase by @Calvin979 in #3562
* [doc] add new committer by @MasamiYui in #3563
* [feat] Add QueryExecutor does not support internationalization. by @Duansg in #3565
* [doc] japanese kubernetes by @Calvin979 in #3568
* [mqtt] refact the MQTT based on the Paho SDK and support both unidirectional and bidirectional MQTT over TLS connections. by @yy549159265 in #3474
* [docs] Add new committer blog by @bigcyy in #3569
* [bugfix] Fix MySQL WrongArgumentException by @pwallk in #3564
* [doc] japanese kvrocks by @Calvin979 in #3570
* [doc] japanese linux by @Calvin979 in #3571
* [fix]: Fix a problem where the inputstream was closed prematurely when parsing Prometheus by @zqr10159 in #3567
* [doc]: add FAQs about task limits by @zqr10159 in #3581
* [infra] upgrade openjdk image to fix Debian source failed by @tomsun28 in #3587
* [feature] Support i18n of collector online notification by @Duansg in #3585
* [doc] add japanese i18n in app-linux_script.yml by @Calvin979 in #3575
* [doc] add japanese i18n in app-mariadb.yml by @Calvin979 in #3577
* [doc] add japanese i18n in app-memcached.yml by @Calvin979 in #3578
* [doc] add japanese i18n in app-modbus.yml by @Calvin979 in #3580
* [feature] System time zone optimization. by @Duansg in #3588
* [doc] add japanese i18n in app-mongodb.yml by @Calvin979 in #3590
* [refactor] Refactor the comparison logic by @Duansg in #3574
* [fix] Fix collector online metadata filling by @Duansg in #3579
* [doc] add japanese i18n in app-mongodb_atlas.yml by @Calvin979 in #3593
* [doc] add japanese i18n in app-mysql.yml by @cto-huhang in #3594
* [doc] add japanese i18n in app-zookeeper.yml and app-zookeeper_sd.yml by @Cyanty in #3596
* [doc] add japanese i18n in app-nginx.yml by @Duansg in #3600
* [doc] add japanese i18n in app-rocketmq.yml and app-rabbitmq.yml by @Saramanda9988 in #3598
* [improve] VM write request sets up gzip compression and adds saveData unit tests by @Cyanty in #3595
* [feat] Auto-generate AES key if not configured by @bigcyy in #3604
* [doc] update japanese i18n in app-mqtt.yml and app-mysql.yml by @Calvin979 in #3597
* [fix] Fix collector offline without sending offline notification by @Duansg in #3601
* [doc] fix image reference issues in documents by @delei in #3608
* [doc] add japanese i18n in app-nacos.yml by @cto-huhang in #3599
* [doc] add japanese i18n in app-nvidia.yml, app-ping.yml, app-pop3.yml, app-port.yml and app-push.yml by @Calvin979 in #3611
* [doc] update japanese i18n in app-nacos_sd.yml, app-nebula_graph.yml, app-zookeeper.yml by @Calvin979 in #3602
* [doc] add japanese i18n in app-nebula_graph_cluster.yml and update japanese of client by @Calvin979 in #3603
* [bugfix] the tagValue may be null in the determineNewLabels method by @delei in #3606
* [doc] add japanese i18n in app-netease_mailbox.yml and app-ntp.yml by @Calvin979 in #3607
* [doc] add japanese i18n in app-oceanbase.yml by @VampireAchao in #3614
* [feat] Http collect supports jsonpath parsing of numeric type by @Duansg in #3612
* [doc] Optimize the home website navbar layout UI for medium-sized screens by @VampireAchao in #3616
* [doc] add japanese i18n in app-opensuse.yml by @Calvin979 in #3619
* [doc] add japanese i18n in app-oracle.yml by @Calvin979 in #3621
* [doc] add japanese i18n in app-postgresql.yml by @Calvin979 in #3624
* [doc] add linux operating system practice usecase by @delei in #3628
* [fix] Fixed springboot3abnormal use of the keyword jexl by @Duansg in #3629
* [Feature] add customized labels to VM metrics by @chingjustwe in #3622
* [fix] Fixed issue where jdbc url was replaced by @Duansg in #3625
* [fix] remove optional metrics by @Duansg in #3636
* [doc] add japanese i18n in app-openai.yml and app-opengauss.yml by @Calvin979 in #3617
* [doc] add japanese i18n in app-smtp.yml, app-ssl_cert.yml, app-storm.yml, app-udp_port.yml, app-uniview.yml, app-website.yml, app-websocket.yml by @Calvin979 in #3643
* [bugfix] fix potential StringIndexOutOfBoundsException by @delei in #3642
* [feat] Monitoring templates support JSON nested parsing. by @Duansg in #3645
* [doc] add English version of linux operating system practice usecase by @delei in #3631
* [bugfix] fixed jexl keyword issue in springboot2 monitoring template by @delei in #3632
* [doc] add japanese i18n in app-qq_mailbox.yml and app-redfish.yml by @Calvin979 in #3635
* [doc] add japanese i18n in app-prometheus.yml, app-pulsar.yml and app-registry.yml by @Calvin979 in #3639
* [doc] add japanese i18n in app-s7.yml, app-tplink_switch.yml, app-shenyu.yml by @Calvin979 in #3648
* [feature] Support HertzBeat self monitor by @zqr10159 in #3641
* [fix] Fixed an issue where template configuration was overwritten by @Duansg in #3649
* [bugfix] fix the collector aes decode with secret error by @tomsun28 in #3652
* [doc] add japanese i18n in app-tidb.yml, app-windows_script.yml by @Calvin979 in #3650
* [doc] add japanese i18n in app-springboot3.yml by @Duansg in #3658
* [doc] improve documentation formatting and readability by @delei in #3659
* [doc] add japanese i18n in app-prestodb.yml, app-spark.yml by @Calvin979 in #3651
* [doc] add japanese i18n in app-process.yml by @Calvin979 in #3654
* [doc] add japanese i18n in app-spring_gateway.yml, app-sqlserver.yml by @Calvin979 in #3661
* [doc] add japanese i18n in app-redhat.yml by @Calvin979 in #3655
* [doc] add japanese i18n and remove chinese in script folder by @Calvin979 in #3665
* [doc] update contribution doc by @tomsun28 in #3667
* [GSOC] MCP server setup, authorization, and basic tool support by @sarthakeash in #3610
* [doc] add japanese i18n in app-redis.yml by @Calvin979 in #3669
* [Feature] add Apache DolphinScheduler monitoring support by @delei in #3656
* [improve] Optimize the scheduling logic for batch flush tasks by @Cyanty in #3660
* [fix] Fixed Grafana visualization integration display issue by @Duansg in #3666
* [feature] add user password monitoring metrics in oracle monitor by @delei in #3674
* [doc] add japanese i18n in app-redis_cluster.yml by @Calvin979 in #3672
* [doc] add japanese i18n in app-dolphinscheduler.yml by @Calvin979 in #3677
* [improve] optimize status page layout and UI by @delei in #3680
* [doc] add japanese i18n in app-redis_sentinel.yml by @Calvin979 in #3681
* [doc] remove all (incubating) by @VampireAchao in #3584
* [bugfix] fixed jexl keyword issue in postgresql monitoring template by @delei in #3685
* [bugfix] fixed jexl keyword issue in hertzbeat monitoring template by @delei in #3686
* [bugfix] fixed jexl keyword issue in windows monitoring template by @delei in #3687
* [bugfix] fixed jexl keyword issue in spring_gateway monitoring template by @delei in #3693
* [doc] update doc while graduate by @tomsun28 in #3692
* [doc] Fixed menu path errors and MD document format anomalies. by @Duansg in #3695
* chore: update ui theme by @tomsun28 in #3682
* [doc] add japanese i18n in app-rockylinux.yml by @Calvin979 in #3688
* [doc] add japanese i18n in app-seatunnel.yml by @Calvin979 in #3691
* [doc] add japanese i18n in app-tomcat.yml by @Calvin979 in #3700
* [refactor] modify message column to TEXT type by @delei in #3698
* [doc] update website, doc while graduate by @tomsun28 in #3701
* [bugfix] resolve translation value fetching for uppercase app names by @rowankid in #3690
* [doc] add japanese i18n in app-vastbase.yml by @Calvin979 in #3704
* [bugfix] fixed jexl keyword issue in kingbase monitoring template by @delei in #3705
* [feat] Support TDengine monitoring by @Duansg in #3678
* [bugfix] fixed jexl keyword issue in greenplum monitoring template by @delei in #3707
* [bugfix] fixed jexl keyword issue in vastbase monitoring template by @delei in #3708
* refactor: Optimize the monitoring data chart component by @tuzuy in #3668
* [improve] Improve the parsing logic of prometheus label by @Duansg in #3662
* [doc] modify github link. by @lynx009 in #3714
* [doc] add japanese i18n in app-ubuntu.yml, app-windows.yml and app-yarn.yml by @Calvin979 in #3703
* [doc] add japanese i18n in app-valkey.yml by @Calvin979 in #3706
* [improve] Improve performance issues when loading large numbers of metric cards in Monitors by @Duansg in #3719
* [doc] add japanese i18n in app-tdengine.yml by @Calvin979 in #3717
* [feature] add macOS monitoring support by @delei in #3715
* [feature] add Synology NAS monitoring support by @delei in #3721
* [improve] Improve Prometheus label PromQL parsing logic by @Duansg in #3725
* [release] release new version 1.7.3 by @LiuTianyou in #3724
* [Improve] changed scroll of intervals in New Monitor page by @carlpinto25 in #3726
* [improve] optimize the incident list on the status page to support paginated queries by @delei in #3727
* docs: update doc and add graduation blog by @tomsun28 in #3729
```

## New Contributors

- @yy549159265 made their first contribution in [https://github.com/apache/hertzbeat/pull/3474](https://github.com/apache/hertzbeat/pull/3474)
- @cto-huhang made their first contribution in [https://github.com/apache/hertzbeat/pull/3594](https://github.com/apache/hertzbeat/pull/3594)
- @Saramanda9988 made their first contribution in [https://github.com/apache/hertzbeat/pull/3598](https://github.com/apache/hertzbeat/pull/3598)
- @delei made their first contribution in [https://github.com/apache/hertzbeat/pull/3608](https://github.com/apache/hertzbeat/pull/3608)
- @chingjustwe made their first contribution in [https://github.com/apache/hertzbeat/pull/3622](https://github.com/apache/hertzbeat/pull/3622)
- @rowankid made their first contribution in [https://github.com/apache/hertzbeat/pull/3690](https://github.com/apache/hertzbeat/pull/3690)
- @tuzuy made their first contribution in [https://github.com/apache/hertzbeat/pull/3668](https://github.com/apache/hertzbeat/pull/3668)
- @carlpinto25 made their first contribution in [https://github.com/apache/hertzbeat/pull/3726](https://github.com/apache/hertzbeat/pull/3726)

## Apache Hertzbeat

**Repository URL:**

[https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)

**Official Website:**

[https://hertzbeat.apache.org/](https://hertzbeat.apache.org/)

**Apache HertzBeat™ Download Link:**

[https://hertzbeat.apache.org/docs/download](https://hertzbeat.apache.org/docs/download)

**Apache HertzBeat™ Docker Images:**

Apache HertzBeat™ provides Docker images for each release, available on Docker Hub:

- HertzBeat: [https://hub.docker.com/r/apache/hertzbeat](https://hub.docker.com/r/apache/hertzbeat)
- HertzBeat Collector: [https://hub.docker.com/r/apache/hertzbeat-collector](https://hub.docker.com/r/apache/hertzbeat-collector)

**How to Contribute to the Apache HertzBeat™ Open Source Community?**

[https://hertzbeat.apache.org/docs/community/contribution](https://hertzbeat.apache.org/docs/community/contribution)
