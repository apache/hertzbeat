---
title: Announcement of Apache Hertzbeat 1.7.1 Release
author: tomsun28
author_title: tomsun28
author_url: https://github.com/zhangshenghang
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4
tags: [opensource, release]
keywords: [open source monitoring system, alerting system, Hertzbeat, release]
---

Dear Community Members,

We are thrilled to announce the official release of Apache Hertzbeat version 1.7.1!

## Downloads and Documentation

- **Apache Hertzbeat 1.7.1 Download Link**: <https://hertzbeat.apache.org/docs/download>
- **Apache Hertzbeat Documentation**: <https://hertzbeat.apache.org/docs/>

## Major Updates

### New Features and Enhancements

- Added support for Siemens PLC S7 protocol (#3194)
- Introduced support for Hikvision, Dahua, and Uniview devices (#3211, #3214)
- Support for Uptime Kuma and Zabbix alert sources (#3312, #3317)
- Service discovery enhancements: Eureka, Consul, and DNS SD (#3323, #3326, #3328)
- Alert grouping and inhibition support (#3206)
- System notification as a new alert method (#3275)
- Collector-side alerting capability (#2693)
- Initial logging module implemented (#3218)
- Integrated OpenTelemetry for logs and traces (#3319)
- Added PushGateway support for pushing metrics (#3204)
- Enhanced Monitor List and Detail UIs (#3199, #3200)
- Improved Grafana configuration priorities and exception handling (#3241)
- Optimized prompts, UI labels, and display titles (#3270, #3289)
- Introduced an AI bot for assistance (#3285)
- Added i18n support for AI bot (#3330)

### Bug Fixes

- Fixed whitespace issue in instance filtering for alert expressions (#3276)
- Corrected incorrect webhook alert template (#3265)
- Fixed incorrect pendingTimeouts calculation in HashedWheelTimer (#3174)
- Resolved historical data display issues in VictoriaMetrics charts (#3248, #3264, #3297)
- Fixed async job cancellation not removing cached jobs (#3240)
- Fixed UI issue with bulletin indicator selection (#3201)
- Fixed Prometheus metric response parsing errors (#3274)
- Resolved Collector OOM error (#3295)
- Fixed frontend title showing “Not page name” when filtered by monitor type (#3289)

### Refactoring and Optimization

- Unified usage of label instead of tag (#3278)
- Refactored alert datasource calculations (#3253)
- Optimized Kafka collection logic and increased test coverage (#3189)
- Improved DnsCollectTest status code logic (#3209)
- Refactored HTTP service discovery implementation (#3300)
- Defaulted to UTF-8 encoding (#3315)
- Removed potential CVE vulnerability action (#3303)

### Tests and Quality

- Added unit tests for:
- AlertInhibitController (#3183)
- XML response parsing (#3212)
- PeriodicAlertCalculator (#3304)
- Added E2E tests for:
- JDBC common collection (#3273)
- Redis collector (#3283)
- Kubernetes monitoring (#3280)

### Documentation Enhancements

- Help and usage docs:
- Alert Center, Alert Silence, Alarm Inhibition (#3181, #3229, #3206)
- Metrics collection workflow blog (#3195)
- Spring Boot 2.x/3.x monitoring config (#3231)
- Grafana dashboard setup (#3238)
- Upgrade guide (EN & CN) (#3302)
- Spring Boot auto practice use case (EN & CN) (#3293, #3298)
- Alert integration help documentation (#3308)
- Style and maintenance:
- Code style check documentation (#3232)
- Dead link checker improvements (#3302)
- Markdown formatting fixes and lint config updates (#3310)
- Internationalization:
- Japanese docs for README, ActiveMQ, Airflow, AlmaLinux (#3329, #3333, #3339, #3343)

## Acknowledgements

Special thanks to the following community members for their collaborative efforts:

> @LinuxSuRen @gagaradio @boyucjz @MasamiYui @tomsun28 @Aias00 @zhangshenghang @zqr10159 @LiuTianyou @a-little-fool @Calvin979  
> @LL-LIN @JuJinPark @xiaomizhou2 @leo-934 @Rancho-7 @pwallk @bigcyy @sarthakeash @KevinLLF @PengJingzhao @Cyanty @markguo123

## What's Changed

- fix: Ai is a typo by @LinuxSuRen in #3176
- [Doc]  Modify the error records in the document by @zhangshenghang in #3178
- [bug]bugfix:fix bug for package import error by @PengJingzhao in #3180
- [doc] add help documentation for Alarms Center by @bigcyy in #3181
- [docs] add collector user guide by @sarthakeash in #3187
- [bugfix] Modify inconsistent icons by @MasamiYui in #3190
- [doc] add blog bout How Does Metrics Collection Work by @JuJinPark in #3195
- [improve] update monitor detail ui by @tomsun28 in #3199
- [doc] update new hertzbeat ppmc by @tomsun28 in #3191
- [improve] update monitor list ui by @tomsun28 in #3200
- update download info by @Aias00 in #3203
- [bugfix] fix bulletin indicator selection status error by @bigcyy in #3201
- [improve] optimize kafka collection logic and expand test coverage by @Rancho-7 in #3189
- [improve] support the use of time expressions in HTTP payloads by @LiuTianyou in #3192
- [improve] i18n Portuguese by @LiuTianyou in #3193
- support plc s7 protocol for siemens by @boyucjz in #3194
- [doc] add doc for alarm grouping and alarm inhibit by @LiuTianyou in #3206
- [improve] optimize `DnsCollectTest` with status code. by @Rancho-7 in #3209
- [doc] archive version docs by @tomsun28 in #3207
- [feature]Implementation of Hikvision camera monitoring and http monitoring xml parsing function by @zqr10159 in #3211
- [test]add test for controller AlertInhibitController by @PengJingzhao in #3183
- [test] hertzbeat-collector: add unit test for XML response parsing by @zqr10159 in #3212
- add a Pushgateway to push module by @leo-934 in #3204
- [feature]add support for Dahua and Uniview devices by @zqr10159 in #3214
- [Doc] Fix dead link by @zhangshenghang in #3227
- [feature]A preliminary logging module implementation by @zqr10159 in #3218
- [Doc] Modify the YML configuration parameters for Spring Boot 2.0/3.0 monitoring by @Cyanty in #3231
- [Doc] Add Blog by @zhangshenghang in #3224
- [doc] add alerting silence doc. by @a-little-fool in #3229
- [doc] code style check by @a-little-fool in #3232
- [bugfix]: Fix the issue where pendingTimeouts may be incorrect in the HashedWheelTimer. by @gagaradio in #3174
- [doc] add code-style-check zh-ch. by @a-little-fool in #3236
- [doc]update Grafana dashboard setup instructions by @zqr10159 in #3238
- [bugfix] Added jobContentCache.remove(jobId) to cancelAsyncCollectJob by @bigcyy in #3240
- [doc] add new release 1.7.0 blog by @tomsun28 in #3237
- [improve] Adjust Grafana configuration priority hierarchy and optimize API request exception handling by @Cyanty in #3241
- switch to online parser & add query datasource by @leo-934 in #3215
- [feat] enable label-based filtering and selection for monitoring thresholds by @bigcyy in #3223
- [doc] add new contributors to wall by @tomsun28 in #3243
- fix UriComponentsBuilder in PromqlQueryExecutor by @leo-934 in #3244
- [Feature] Add log mcp for java by @zhangshenghang in #3254
- [bugfix] fix a remote command execution. by @a-little-fool in #3250
- [refactor] Alert datasource calculate by @MasamiYui in #3253
- [bugfix] Resolve incorrect display of detailed information in Prometheus task history monitoring charts under VictoriaMetrics. by @KevinLLF in #3248
- [doc] add new contributor in wall by @tomsun28 in #3259
- [bugfix] Set the prometheus monitoring time and correct historical data queries (#3264) by @Cyanty in #3264
- [bugfix]  Wrong webhook alert template by @MasamiYui in #3265
- [bugfix] correct instance filtering regex in RealTimeAlertCalculator by @bigcyy in #3269
- [feature] Support Collector Alarm by @pwallk in #2693
- [feature] add Maven Wrapper scripts  by @zhangshenghang in #3271
- [webapp] update header logo style by @tomsun28 in #3272
- [Improve] optimize prompt by @zhangshenghang in #3270
- [bugfix] fix the prometheus metric response data parsing is abnormal by @LiuTianyou in #3274
- [feature] new alert supports reminding through system notifications by @LiuTianyou in #3275
- [bugfix] support no-whitespace alert expressions in instance filtering by @bigcyy in #3276
- [refactor] refact tag to label code  by @tomsun28 in #3278
- [doc] update contributors wall  by @tomsun28 in #3281
- [improve] Add jdbc common collect e2e code (#3273) by @Cyanty in #3273
- [improve] Add E2E tests for Redis collector by @KevinLLF in #3283
- [Feature]Support AI bot by @zhangshenghang in #3285
- [bugfix]: page title show  "Not page name" when filter monitor list by type by @LiuTianyou in #3289
- [Task] Set local database as default file server provider by @MasamiYui in #3282
- [doc]  update doc, usecase blog and help doc by @tomsun28 in #3286
- [e2e] add e2e  test for k8s monitor by @LiuTianyou in #3280
- [webapp] try reduce memory growth and fix crash by @tomsun28 in #3292
- [Doc] Add springboot auto practice usecase by @Cyanty in #3293
- [bugfix] fix collector direct oom by @tomsun28 in #3295
- [Doc] Add English doc for springboot auto practice usecase by @Cyanty in #3298
- [bugfix] enables support for VictoriaMetrics in cluster mode within HertzBeat by @bigcyy in #3297
- [improve] Optimize the way of Dead Link Check by @Cyanty in #3302
- [docs] Add Chinese and English versions of the Hertzbeat upgrade guide by @markguo123 in #3294
- [refactor] Remove the possible CVE-2025-30066 security vulnerability action and ignore the 500 code for link check by @Cyanty in #3303
- [Improve] Add unit test for PeriodicAlertCalculator by @MasamiYui in #3304
- [docs] Correct Markdown formatting and update lint config to enable local checking by @bigcyy in #3310
- [docs] add help documentation for alert integration by @bigcyy in #3308
- [feature] Support Uptime Kuma alert source by @xiaomizhou2 in #3312
- [refactor] refactor auto discovery http sd by @tomsun28 in #3300
- [refactor] set default encoding charset utf8 by @tomsun28 in #3315
- [feature] Support Zabbix alert source by @xiaomizhou2 in #3317
- update the license file, to add the plc4j-driver-s7 license by @boyucjz in #3318
- [bugfix] fix the calculator expr exist not work by @tomsun28 in #3314
- [feature]: integrate OpenTelemetry for GreptimeDB logs and traces- Rename hertzbeat-log to hertzbeat-otel by @zqr10159 in #3319
- [doc] japanese readme by @Calvin979 in #3329
- [Improve] Add i18 for ai bot by @MasamiYui in #3330
- [feature] Support Eureka Service Discovery by @pwallk in #3323
- [doc] japanese activemq by @Calvin979 in #3333
- [feat] add deep wiki badge by @Aias00 in #3334
- [doc] japanese airflow by @Calvin979 in #3339
- [feature] Support Consul Service Discovery by @pwallk in #3326
- [feat] Enhance Label Management for Monitors by @bigcyy in #3327
- [doc] japanese almalinux by @Calvin979 in #3343
- [feature] Support DNS Service Discovery by @MasamiYui in #3328
- [build] Update .gitignore and add Maven wrapper properties by @zhangshenghang in #3346
- [bugfix] Fix frontend error when all monitor metrics are selected in new bulletin form  by @LL-LIN in #3345
- [release] update release version 1.7.1 by @zhangshenghang in #3347

## New Contributors

- @PengJingzhao made their first contribution in #3180
- @boyucjz made their first contribution in #3194
- @gagaradio made their first contribution in #3174
- @KevinLLF made their first contribution in #3248
- @markguo123 made their first contribution in #3294

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
